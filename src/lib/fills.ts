import { decodeEventLog, type TransactionReceipt } from "viem";
import { MARGIN_BANK, bankAbi, poolAbi } from "./chain";

export interface Fill {
  hash: `0x${string}`;
  qty: number; // whole base
  avgPx: number;
  fee: number; // USDso
  newSize: number | null; // account position after, whole base
}

/** What one order did, from its own receipt: the pool's fills, the bank's fee and new size for `owner`. */
export function decodeFill(r: TransactionReceipt, owner: string, pool: string, baseDec: number): Fill {
  let q = 0;
  let notional = 0;
  let fee = 0;
  let newSize: number | null = null;
  for (const l of r.logs) {
    const a = l.address.toLowerCase();
    try {
      if (a === pool.toLowerCase()) {
        const ev = decodeEventLog({ abi: poolAbi, topics: l.topics, data: l.data }) as any;
        if (ev.eventName === "OrderFilled") {
          const qty = Number(ev.args.quantityFilled) / 10 ** baseDec;
          q += qty;
          notional += qty * (Number(ev.args.fillPrice) / 1e18);
        }
      } else if (a === MARGIN_BANK.toLowerCase()) {
        const ev = decodeEventLog({ abi: bankAbi, topics: l.topics, data: l.data }) as any;
        if (String(ev.args.account).toLowerCase() !== owner.toLowerCase()) continue;
        if (ev.eventName === "FeeCharged") fee += Number(ev.args.amount) / 1e18;
        if (ev.eventName === "PositionUpdated" && String(ev.args.perpPool).toLowerCase() === pool.toLowerCase())
          newSize = Number(ev.args.newSize) / 10 ** baseDec;
      }
    } catch {
      /* not ours */
    }
  }
  return { hash: r.transactionHash, qty: q, avgPx: q ? notional / q : 0, fee, newSize };
}

/** A price on the pool's tick grid, rounded toward the side that still crosses. */
export function priceOnTick(p: number, tick: bigint, roundUp: boolean) {
  const raw = BigInt(Math.round(p * 1e9)) * 1_000_000_000n;
  const down = (raw / tick) * tick;
  return roundUp && down < raw ? down + tick : down;
}

/** A quantity on the pool's lot grid. */
export function qtyOnLot(q: number, baseDec: number, lot: bigint) {
  const raw = BigInt(Math.floor(q * 10 ** Math.min(baseDec, 12))) * 10n ** BigInt(Math.max(0, baseDec - 12));
  return (raw / lot) * lot;
}
