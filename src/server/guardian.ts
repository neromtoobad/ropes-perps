/**
 * The 24/7 guardian. A ROPES key a player can link as a second bot (Link a bot, Perps
 * ticked). It keeps the anchor and the summit working when the climb's tab is closed:
 * every second it marks each open climb to the engine's live mark, and when one crosses
 * its anchor (−90% of stake) or its summit it closes exactly that climb's size, at market,
 * for the player's account. Like the climbing key, it can place and cancel orders and
 * nothing else; every fill lands in the player's account.
 */
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { MARGIN_BANK, ORDER_TYPE, RPC, SEL, bankAbi, hideki, poolAbi } from "@/lib/chain";
import { db } from "@/lib/db";
import { decodeFill, priceOnTick, qtyOnLot } from "@/lib/fills";
import { engine } from "./engine";
import { chainClient } from "./verify";

export const ANCHOR = -0.9;
const ZERO = "0x0000000000000000000000000000000000000000" as const;

const g = globalThis as unknown as { __guardian?: Guardian };

class Guardian {
  account = privateKeyToAccount(process.env.GUARDIAN_PRIVATE_KEY as `0x${string}`);
  wallet = createWalletClient({ account: this.account, chain: hideki, transport: http(RPC) });
  armed = new Map<string, { at: number; ok: boolean }>(); // owner:pool
  busy = new Set<string>(); // climb ids being closed
  climbs: Awaited<ReturnType<typeof db.climb.findMany>> = [];
  loadedAt = 0;
  last = "";

  start() {
    const tick = async () => {
      try {
        await this.tick();
      } catch (e: any) {
        console.error("[guardian]", e?.shortMessage ?? e?.message);
      }
      setTimeout(tick, 1000);
    };
    tick();
    console.log(`[guardian] watching as ${this.account.address}`);
  }

  async isArmed(owner: string, pool: `0x${string}`) {
    const k = `${owner}:${pool}`;
    const hit = this.armed.get(k);
    if (hit && Date.now() - hit.at < 60_000) return hit.ok;
    const ok = (await chainClient
      .readContract({ address: pool, abi: poolAbi, functionName: "isOperatorAuthorized", args: [owner as `0x${string}`, this.account.address, SEL.place] })
      .catch(() => false)) as boolean;
    this.armed.set(k, { at: Date.now(), ok });
    return ok;
  }

  private async tick() {
    if (Date.now() - this.loadedAt > 4000) {
      this.climbs = await db.climb.findMany({ where: { status: "open" } });
      this.loadedAt = Date.now();
    }
    const e = engine();
    for (const c of this.climbs) {
      if (this.busy.has(c.id)) continue;
      const m = e.markets.find((x) => x.base === c.base);
      const mk = m && e.marks.get(m.base);
      if (!m || !mk) continue;
      const dir = c.side === "UP" ? 1 : -1;
      const roe = ((mk.price - c.entryPx) * c.qty * dir) / c.stake;
      const peak = Math.max(c.peak ?? 1, 1 + roe);
      if (peak > (c.peak ?? 1) + 0.01) {
        c.peak = peak;
        db.climb.update({ where: { id: c.id }, data: { peak } }).catch(() => {});
      }
      const why = roe <= ANCHOR ? "ground" : c.summit != null && roe >= c.summit ? "summit" : null;
      if (!why) continue;
      if (!(await this.isArmed(c.owner, m.pool))) continue;
      this.busy.add(c.id);
      this.close(c, m, why, mk.price).finally(() => this.busy.delete(c.id));
    }
  }

  private async close(c: (typeof this.climbs)[number], m: ReturnType<typeof engine>["markets"][number], why: "ground" | "summit", mark: number) {
    const owner = c.owner as `0x${string}`;
    const dir = c.side === "UP" ? 1 : -1;
    const pos = (await chainClient.readContract({ address: MARGIN_BANK, abi: bankAbi, functionName: "getPosition", args: [owner, m.pool] })) as { size: bigint };
    const size = Number(pos.size) / 10 ** m.baseDec;
    const mine = Math.sign(size) === dir ? Math.min(Math.abs(size), c.qty) : 0;
    if (mine <= 0) {
      await db.climb.update({ where: { id: c.id }, data: { status: "gone", closedAt: new Date(), closedBy: "guardian" } });
      this.loadedAt = 0;
      return;
    }
    const isBid = dir < 0;
    const qty = qtyOnLot(mine, m.baseDec, BigInt(m.lot));
    const gasPrice = await chainClient.getGasPrice();
    for (const slip of [0.015, 0.04]) {
      const price = priceOnTick(mark * (isBid ? 1 + slip : 1 - slip), BigInt(m.tick), isBid);
      const expire = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;
      const args = [owner, isBid, 0n, price, qty, expire, ORDER_TYPE.IOC, 0, ZERO, 0n] as const;
      try {
        const est = await chainClient.estimateContractGas({ address: m.pool, abi: poolAbi, functionName: "placeOrderFor", args, account: this.account });
        const hash = await this.wallet.writeContract({
          address: m.pool,
          abi: poolAbi,
          functionName: "placeOrderFor",
          args,
          gas: (est * 13n) / 10n,
          maxFeePerGas: (gasPrice * 12n) / 10n,
          maxPriorityFeePerGas: 0n,
        });
        const r = await chainClient.waitForTransactionReceipt({ hash, pollingInterval: 250 });
        if (r.status !== "success") throw new Error("reverted");
        const f = decodeFill(r, owner, m.pool, m.baseDec);
        if (!f.qty) continue;
        const roe = ((f.avgPx - c.entryPx) * f.qty * dir - f.fee) / c.stake;
        await db.climb.update({
          where: { id: c.id },
          data: { status: why, exitTx: hash, exitPx: f.avgPx, multiple: 1 + roe, closedAt: new Date(), closedBy: "guardian" },
        });
        this.loadedAt = 0;
        console.log(`[guardian] ${why} ${c.base} ${c.side} for ${c.owner.slice(0, 8)} at ${f.avgPx} (${(roe * 100).toFixed(1)}%) tx ${hash}`);
        return;
      } catch (e: any) {
        if (!/ImmediateOrCancelNoFill|0xd48c4403/.test(String(e?.message ?? e))) {
          console.error(`[guardian] close ${c.id} failed:`, e?.shortMessage ?? e?.message);
          return;
        }
      }
    }
  }
}

export function guardian(): Guardian | null {
  if (!process.env.GUARDIAN_PRIVATE_KEY) return null;
  if (!g.__guardian) {
    g.__guardian = new Guardian();
    g.__guardian.start();
  }
  return g.__guardian;
}
