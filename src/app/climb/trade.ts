"use client";

/**
 * The player's climbing key and every write it makes. The key lives in this
 * browser only. The player links it to their dreamDEX account with the app's
 * own "Link a bot", which lets it place and cancel perp orders for that account
 * and nothing else: it can never withdraw, and every fill lands in the
 * player's account. The key pays its own gas in STT.
 */
import {
  createPublicClient,
  createWalletClient,
  decodeErrorResult,
  decodeEventLog,
  http,
  parseAbi,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { MARGIN_BANK, ORDER_TYPE, RPC, SEL, bankAbi, hideki, poolAbi } from "@/lib/chain";
import { safeLocal, type MarketRow } from "../ui";

export const pub = createPublicClient({ chain: hideki, transport: http(RPC, { batch: { wait: 8 } }) });

const KEY = "ropes.key";
export function climbingKey() {
  let pk = safeLocal.get(KEY) as Hex | null;
  if (!pk || !/^0x[0-9a-f]{64}$/i.test(pk)) {
    pk = generatePrivateKey();
    safeLocal.set(KEY, pk);
  }
  return privateKeyToAccount(pk);
}
export function exportKey() {
  return safeLocal.get(KEY);
}

/** Gas: 6 gwei base on Hideki. A generous limit is only free if the balance covers limit × maxFee. */
const FEES = { maxFeePerGas: 7_000_000_000n, maxPriorityFeePerGas: 0n } as const;
export const MIN_GAS_STT = 0.08;

export async function linkStatus(owner: `0x${string}`, key: `0x${string}`, pool: `0x${string}`) {
  const [place, gas, equity] = await Promise.all([
    pub.readContract({ address: pool, abi: poolAbi, functionName: "isOperatorAuthorized", args: [owner, key, SEL.place] }).catch(() => false),
    pub.getBalance({ address: key }),
    pub.readContract({ address: MARGIN_BANK, abi: bankAbi, functionName: "getAccountEquity", args: [owner] }).catch(() => 0n),
  ]);
  return { linked: place as boolean, gas: Number(gas) / 1e18, equity: Number(equity) / 1e18 };
}

export async function markOf(pool: `0x${string}`) {
  const [ok, s] = (await pub.readContract({ address: pool, abi: poolAbi, functionName: "tryGetHealthSnapshot" })) as readonly [
    boolean,
    { markPrice: bigint; effectiveIMFBps: bigint },
  ];
  return ok ? Number(s.markPrice) / 1e18 : null;
}

export async function positionOf(owner: `0x${string}`, m: MarketRow) {
  const p = (await pub.readContract({ address: MARGIN_BANK, abi: bankAbi, functionName: "getPosition", args: [owner, m.pool] })) as {
    size: bigint;
    avgEntryPrice: bigint;
  };
  return { size: Number(p.size) / 10 ** m.baseDec, raw: p.size, entry: Number(p.avgEntryPrice) / 1e18 };
}

export const priceRaw = (p: number, m: MarketRow, roundUp: boolean) => {
  const tick = BigInt(m.tick);
  const raw = BigInt(Math.round(p * 1e9)) * 1_000_000_000n;
  const down = (raw / tick) * tick;
  return roundUp && down < raw ? down + tick : down;
};
export function qtyRaw(q: number, m: MarketRow) {
  const d = m.baseDec;
  const raw = BigInt(Math.floor(q * 10 ** Math.min(d, 12))) * 10n ** BigInt(Math.max(0, d - 12));
  const lot = BigInt(m.lot);
  const aligned = (raw / lot) * lot;
  return aligned;
}
export const minQty = (m: MarketRow) => Number(BigInt(m.min)) / 10 ** m.baseDec;

const errAbi = parseAbi([
  "error ImmediateOrCancelNoFill()",
  "error InsufficientCollateral()",
  "error MaxPositionSizeExceeded()",
  "error IsolatedMarketBlocked()",
  "error InvalidPrice()",
  "error InvalidQuantity()",
  "error MarketRestricted()",
  "error OperatorNotAuthorized()",
  "error NotAuthorized()",
]);
export function nameError(e: any): string {
  const data = e?.cause?.data ?? e?.data ?? e?.cause?.cause?.data;
  if (typeof data === "string" && data.startsWith("0x")) {
    try {
      return decodeErrorResult({ abi: errAbi, data: data as Hex }).errorName;
    } catch {
      return `revert ${data.slice(0, 10)}`;
    }
  }
  const msg = String(e?.shortMessage ?? e?.message ?? e);
  if (/insufficient (funds|balance)/i.test(msg)) return "the climbing key is out of STT for gas";
  return msg.split("\n")[0]!.slice(0, 140);
}

export interface Fill {
  hash: Hex;
  qty: number; // whole base
  avgPx: number;
  fee: number; // USDso
  newSize: number | null; // account position after, whole base
}

/** One IOC through the book for the owner, decoded from its own receipt. */
export async function sendIoc(o: { owner: `0x${string}`; m: MarketRow; isBid: boolean; qty: bigint; limit: number }): Promise<Fill> {
  const acct = climbingKey();
  const wallet = createWalletClient({ account: acct, chain: hideki, transport: http(RPC) });
  const price = priceRaw(o.limit, o.m, o.isBid);
  const expire = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;
  const args = [o.owner, o.isBid, 0n, price, o.qty, expire, ORDER_TYPE.IOC, 0, "0x0000000000000000000000000000000000000000", 0n] as const;
  // Simulate first so a revert is named, not paid for.
  let gas = 8_000_000n;
  try {
    const est = await pub.estimateContractGas({ address: o.m.pool, abi: poolAbi, functionName: "placeOrderFor", args, account: acct });
    gas = (est * 13n) / 10n;
  } catch (e) {
    throw new Error(nameError(e));
  }
  const hash = await wallet.writeContract({ address: o.m.pool, abi: poolAbi, functionName: "placeOrderFor", args, gas, ...FEES });
  const r = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (r.status !== "success") throw new Error(`order reverted (tx ${hash.slice(0, 10)}…)`);
  return decodeFill(r, o.owner, o.m);
}

export function decodeFill(r: TransactionReceipt, owner: string, m: MarketRow): Fill {
  let q = 0;
  let notional = 0;
  let fee = 0;
  let newSize: number | null = null;
  for (const l of r.logs) {
    const a = l.address.toLowerCase();
    try {
      if (a === m.pool.toLowerCase()) {
        const ev = decodeEventLog({ abi: poolAbi, topics: l.topics, data: l.data }) as any;
        if (ev.eventName === "OrderFilled") {
          const qty = Number(ev.args.quantityFilled) / 10 ** m.baseDec;
          q += qty;
          notional += qty * (Number(ev.args.fillPrice) / 1e18);
        }
      } else if (a === MARGIN_BANK.toLowerCase()) {
        const ev = decodeEventLog({ abi: bankAbi, topics: l.topics, data: l.data }) as any;
        if (String(ev.args.account).toLowerCase() !== owner.toLowerCase()) continue;
        if (ev.eventName === "FeeCharged") fee += Number(ev.args.amount) / 1e18;
        if (ev.eventName === "PositionUpdated" && String(ev.args.perpPool).toLowerCase() === m.pool.toLowerCase())
          newSize = Number(ev.args.newSize) / 10 ** m.baseDec;
      }
    } catch {
      /* not ours */
    }
  }
  return { hash: r.transactionHash, qty: q, avgPx: q ? notional / q : 0, fee, newSize };
}

/** Sign a message with the climbing key — how the server knows a climb record is really from this key. */
export async function sign(message: string) {
  return climbingKey().signMessage({ message });
}
