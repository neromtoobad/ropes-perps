// Docs (trading/perps-testnet/funding): "Perp above the index (positive funding): longs pay shorts.
// Perp below the index (negative funding): shorts pay longs." Check the last 24 hourly settlements of
// every market (listFundingRateHistory: fundingRate, markPrice, indexPrice per settlement), plus the live
// chain state (getPerpState + getPerpFundingPremium). Read-only.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const BASE = 100000000000000n; // 0.0001 (0.01%) at 1e18
let rows = 0, below = 0, belowPositive = 0, exactBase = 0;
const perMarket: string[] = [];
for (const m of perps) {
  const hist = await c.listFundingRateHistory(m.poolAddress, { limit: 24 });
  let b = 0, bp = 0, eb = 0;
  for (const h of hist) {
    rows++;
    const r = BigInt(h.fundingRate), mk = BigInt(h.markPrice), ix = BigInt(h.indexPrice);
    if (r === BASE) { exactBase++; eb++; }
    if (mk < ix) { below++; b++; if (r > 0n) { belowPositive++; bp++; } }
  }
  perMarket.push(`${m.baseSymbol.padEnd(9)} settlements ${hist.length}  rate == +0.0100% exactly: ${eb}  mark<index: ${b}, of which rate > 0 (longs pay): ${bp}`);
}
for (const l of perMarket) console.log(l);
console.log(`TOTAL ${rows} settlements: rate exactly +0.0100%/8h in ${exactBase}; mark below index in ${below}, and longs still paid in ${belowPositive} of those`);
console.log("\nlive chain state (getPerpState + getPerpFundingPremium) for markets whose time-weighted premium is negative:");
for (const m of perps) {
  const [s, p] = await Promise.all([c.getPerpState(m.poolAddress), c.getPerpFundingPremium(m.poolAddress)]);
  if (p.timeWeightedPremium < 0n) console.log(`  ${m.baseSymbol.padEnd(9)} mark ${s.markPrice} index ${s.indexPrice} (mark ${s.markPrice < s.indexPrice ? "<" : ">="} index)  timeWeightedPremium ${(Number(p.timeWeightedPremium) / 1e16).toFixed(4)}%  fundingRate ${(Number(s.fundingRate) / 1e16).toFixed(4)}%`);
}
process.exit(0);
