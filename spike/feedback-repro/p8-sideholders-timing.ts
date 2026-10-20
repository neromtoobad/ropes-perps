// Time getPerpSideHolders (default pageSize 1000, then 250) per market/side, several runs.
import { markets } from "./_conn.ts";
const c = markets.client;
const perps = await c.listPerpMarkets();
const syms = (process.argv[2] ?? "ETH,BTC").split(",");
for (const sym of syms) {
  const m = perps.find((x) => x.baseSymbol === sym)!;
  for (const isLong of [true, false]) {
    for (const pageSize of [undefined, 250]) {
      for (let i = 0; i < 3; i++) {
        const t = Date.now();
        try {
          const r = await c.getPerpSideHolders({ marginBank: m.marginBank, pool: m.poolAddress, isLong }, pageSize ? { pageSize } : undefined);
          console.log(`${sym} ${isLong ? "long " : "short"} pageSize=${pageSize ?? "default(1000)"} run ${i}: ok holders=${r.holders.length} ${Date.now() - t} ms`);
        } catch (e: any) {
          console.log(`${sym} ${isLong ? "long " : "short"} pageSize=${pageSize ?? "default(1000)"} run ${i}: ${e.constructor.name}: ${e.message.split("\n")[0]} (${Date.now() - t} ms)`);
        }
      }
    }
  }
}
process.exit(0);
