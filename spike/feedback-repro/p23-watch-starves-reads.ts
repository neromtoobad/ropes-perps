// Does a live watch (client.watchMarket) on a busy perp pool starve ordinary chain reads that share the
// SDK's WebSocket? Baseline getPerpState latency first, then the same reads while BTC-PERP is watched.
import { markets } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const n = Number(process.argv[2] ?? 1);
const watched = ["BTC", "ETH", "SOL"].slice(0, n).map((s) => perps.find((m: any) => m.baseSymbol === s)!);
const target = perps.find((m: any) => m.baseSymbol === "BTC")!;
async function sample(label: string, k: number) {
  let ok = 0, fail = 0; const lat: number[] = [];
  for (let i = 0; i < k; i++) {
    const t = Date.now();
    try { await c.getPerpState(target.poolAddress); ok++; lat.push(Date.now() - t); }
    catch (e: any) { fail++; console.log(`  ${label} read ${i}: ${e.constructor.name}: ${e.message.split("\n")[0]} after ${Date.now() - t} ms`); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  lat.sort((a, b) => a - b);
  console.log(`${label}: ${ok} ok / ${fail} failed, latency median ${lat[Math.floor(lat.length / 2)] ?? "-"} ms, max ${lat[lat.length - 1] ?? "-"} ms`);
}
await sample("baseline (no watch)", 8);
const t0 = Date.now();
for (const m of watched) await c.watchMarket(m.poolAddress);
console.log(`watchMarket(${watched.map((m: any) => m.baseSymbol).join(",")}) resolved after ${Date.now() - t0} ms; status ${watched.map((m: any) => c.getWatchStatus(m.poolAddress)).join(",")}`);
await sample("while watching", 12);
process.exit(0);
