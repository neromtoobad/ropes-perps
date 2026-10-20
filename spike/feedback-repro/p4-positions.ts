import { markets, j } from "./_conn.ts";
const c = markets.client;
const perps = await c.listPerpMarkets();
const btc = perps.find((m) => m.baseSymbol === "BTC")!;
const shorts = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: false });
const longs = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: true }, { blockNumber: shorts.asOfBlock });
console.log("BTC longs", longs.holders.length, "shorts", shorts.holders.length, "asOf", shorts.asOfBlock);
const sample = [...longs.holders.slice(0, 6), ...shorts.holders.slice(0, 6)];
for (const h of sample) {
  const chain = await c.getPerpPosition({ marginBank: btc.marginBank, account: h, pool: btc.poolAddress });
  const idx = await c.listPerpPositions(h, { pool: btc.poolAddress });
  console.log(h, "chain", chain.size, chain.avgEntryPrice, "| indexer", j(idx.map((r: any) => [r.size, r.avgEntryPrice, r.updatedAtBlock ?? r.updatedAt])));
}
process.exit(0);
