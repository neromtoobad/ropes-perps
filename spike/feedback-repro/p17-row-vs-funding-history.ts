// listPerpMarkets row funding fields vs the newest listFundingRateHistory row, per market.
import { markets } from "./_conn.ts";
const c = markets.client as any;
const now = Math.floor(Date.now() / 1000);
const perps = await c.listPerpMarkets();
let bad = 0;
for (const m of perps) {
  const [h] = await c.listFundingRateHistory(m.poolAddress, { limit: 1 });
  const same = m.fundingRate === h.fundingRate && m.fundingUpdatedAt === h.timestamp && m.markPrice === h.markPrice && m.cumulativeFundingPerUnit === h.cumulativeFundingPerUnit && m.indexPrice === h.indexPrice;
  if (!same) bad++;
  console.log(`${m.baseSymbol.padEnd(9)} row: fundingUpdatedAt=${m.fundingUpdatedAt} markPriceUpdatedAt=${m.markPriceUpdatedAt} rate=${m.fundingRate} | newest history: ts=${h.timestamp} rate=${h.fundingRate} block=${h.blockNumber} ${same ? "same" : "DIFFERENT (row " + (now - Number(m.fundingUpdatedAt)) + "s old)"}`);
}
console.log("now", now, "markets whose row != newest settlement:", bad, "/", perps.length);
process.exit(0);
