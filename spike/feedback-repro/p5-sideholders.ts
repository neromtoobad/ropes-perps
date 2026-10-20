import { markets, j } from "./_conn.ts";
const c = markets.client;
const perps = await c.listPerpMarkets();
const btc = perps.find((m) => m.baseSymbol === "BTC")!;
const t0 = Date.now();
const to = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error(`no answer after ${ms} ms`)), ms));
for (const pageSize of [undefined, 50]) {
  const t = Date.now();
  try {
    const r: any = await Promise.race([c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: true }, pageSize ? { pageSize } : undefined), to(60000)]);
    console.log("pageSize", pageSize, "holders", r.holders.length, "asOf", r.asOfBlock, Date.now() - t, "ms");
  } catch (e: any) { console.log("pageSize", pageSize, "ERR", e.constructor?.name, e.message.slice(0, 600), Date.now() - t, "ms"); }
}
process.exit(0);
