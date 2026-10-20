// Check the docs' hourly funding formula against consecutive on-chain settlements:
//   docs (trading/perps-testnet/funding): hourly payment = size × index price × funding rate / 8
// Δ cumulativeFundingPerUnit between two settlements is the per-unit charge actually booked.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
for (const sym of (process.argv[2] ?? "BTC,ETH,LIT").split(",")) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  const rows = await c.listFundingRateHistory(m.poolAddress, { limit: 4 });
  console.log(sym, "rows", j(rows.slice(0, 2)).slice(0, 900));
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i + 1], b = rows[i];
    const dCum = BigInt(b.cumulativeFundingPerUnit) - BigInt(a.cumulativeFundingPerUnit);
    const rate = BigInt(b.fundingRate);
    const idx = BigInt(b.indexPrice ?? 0), mark = BigInt(b.markPrice ?? 0);
    const n = BigInt(b.fundingWindowSec / b.fundingIntervalSec);
    console.log(`${sym} ${a.timestamp}->${b.timestamp} dCum=${dCum} rate=${rate} rate*index/n=${(rate * idx) / n} rate*mark/n=${mark ? (rate * mark) / n : "-"} intervalsAccrued=${b.intervalsAccrued ?? "?"}`);
  }
}
process.exit(0);
