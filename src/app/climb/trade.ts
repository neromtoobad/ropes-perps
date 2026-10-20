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
  http,
  parseAbi,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { MARGIN_BANK, ORDER_TYPE, RPC, SEL, bankAbi, hideki, poolAbi } from "@/lib/chain";
import { BUILDER, builderOn } from "@/lib/network";
import { decodeFill, priceOnTick, qtyOnLot, type Fill } from "@/lib/fills";
import { safeLocal, type MarketRow } from "../ui";

export const pub = createPublicClient({ chain: hideki, transport: http(RPC, { batch: { wait: 8 } }) });

const KEY = "ropes.key";
export function climbingKey() {
  let pk = safeLocal.get(KEY) as Hex | null;
  if (!pk || !/^0x[0-9a-f]{64}$/i.test(pk)) {
    pk = generatePrivateKey();
    safeLocal.set(KEY, pk);
    safeLocal.set(KEY + "At", String(Math.floor(Date.now() / 1000)));
  }
  return privateKeyToAccount(pk);
}
/** When this browser made its key (unix seconds), so the link search starts there. */
export const keyMadeAt = () => Number(safeLocal.get(KEY + "At")) || undefined;
export function exportKey() {
  return safeLocal.get(KEY);
}

/**
 * Gas: the network's price plus 20%, never the SDK's 10× default. A generous gas LIMIT is
 * only free if the balance covers limit × maxFee, so the fee cap is kept tight.
 */
let feeCache: { at: number; fees: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } } | null = null;
async function fees() {
  if (feeCache && Date.now() - feeCache.at < 60_000) return feeCache.fees;
  const p = await pub.getGasPrice().catch(() => 6_000_000_000n);
  feeCache = { at: Date.now(), fees: { maxFeePerGas: (p * 12n) / 10n, maxPriorityFeePerGas: 0n } };
  return feeCache.fees;
}

/**
 * The builder (routing) fee is ROPES's revenue. dreamDEX only lets a frontend charge it
 * where the account owner approved that builder on the pool, so it is attached only when
 * the on-chain approval covers it; otherwise the order goes without it.
 */
const approvals = new Map<string, { at: number; ok: boolean }>();
async function builderFor(owner: `0x${string}`, pool: `0x${string}`) {
  const none = { builder: "0x0000000000000000000000000000000000000000" as `0x${string}`, fee: 0n };
  if (!builderOn()) return none;
  const k = `${owner}:${pool}`;
  let hit = approvals.get(k);
  if (!hit || Date.now() - hit.at > 300_000) {
    const allowed = await pub
      .readContract({ address: pool, abi: poolAbi, functionName: "getEffectiveBuilderApproval", args: [owner, BUILDER.address] })
      .catch(() => 0n);
    hit = { at: Date.now(), ok: (allowed as bigint) >= BUILDER.feeBpsTimes1k };
    approvals.set(k, hit);
  }
  return hit.ok ? { builder: BUILDER.address, fee: BUILDER.feeBpsTimes1k } : none;
}
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

export const priceRaw = (p: number, m: MarketRow, roundUp: boolean) => priceOnTick(p, BigInt(m.tick), roundUp);
export const qtyRaw = (q: number, m: MarketRow) => qtyOnLot(q, m.baseDec, BigInt(m.lot));
export const minQty = (m: MarketRow) => Number(BigInt(m.min)) / 10 ** m.baseDec;

const errAbi = parseAbi([
  "error ImmediateOrCancelNoFill()",
  "error InsufficientCollateral()",
  "error MaxPositionSizeExceeded()",
  "error IsolatedMarketBlocked()",
  "error InvalidPrice(uint256 price, uint256 tickSize)",
  "error InvalidQuantity(uint256 quantity, uint256 lotSize)",
  "error QuantityBelowMinimum(uint256 quantity, uint256 minQuantity)",
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

export type { Fill } from "@/lib/fills";

/** One IOC through the book for the owner, decoded from its own receipt. */
export async function sendIoc(o: { owner: `0x${string}`; m: MarketRow; isBid: boolean; qty: bigint; limit: number }): Promise<Fill> {
  const acct = climbingKey();
  const wallet = createWalletClient({ account: acct, chain: hideki, transport: http(RPC) });
  const price = priceRaw(o.limit, o.m, o.isBid);
  const expire = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;
  const b = await builderFor(o.owner, o.m.pool);
  const args = [o.owner, o.isBid, 0n, price, o.qty, expire, ORDER_TYPE.IOC, 0, b.builder, b.fee] as const;
  // Simulate first so a revert is named, not paid for.
  let gas = 8_000_000n;
  try {
    const est = await pub.estimateContractGas({ address: o.m.pool, abi: poolAbi, functionName: "placeOrderFor", args, account: acct });
    gas = (est * 13n) / 10n;
  } catch (e) {
    throw new Error(nameError(e));
  }
  const hash = await wallet.writeContract({ address: o.m.pool, abi: poolAbi, functionName: "placeOrderFor", args, gas, ...(await fees()) });
  const r = await pub.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (r.status !== "success") throw new Error(`order reverted (tx ${hash.slice(0, 10)}…)`);
  return decodeFillFor(r, o.owner, o.m);
}


export function decodeFillFor(r: TransactionReceipt, owner: string, m: MarketRow): Fill {
  return decodeFill(r, owner, m.pool, m.baseDec);
}

/** Sign a message with the climbing key — how the server knows a climb record is really from this key. */
export async function sign(message: string) {
  return climbingKey().signMessage({ message });
}
