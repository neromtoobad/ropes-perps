// PERPS.md: "Funding (FundingUpdated) and open interest (OpenInterestUpdated) stream into the perp
// market row live." Watch BTC/ETH, then compare the live row's openInterest with the chain every 10 s.
import { markets } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const pools = ["BTC", "ETH", "SOL"].map((s) => perps.find((m: any) => m.baseSymbol === s)!);
for (const m of pools) await c.watchMarket(m.poolAddress);
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 10_000));
  for (const m of pools) {
    const live = c.getLiveMarketByPool(m.poolAddress);
    const st = await c.getPerpState(m.poolAddress).catch((e: any) => ({ openInterest: "read failed: " + e.message.split("\n")[0] }));
    console.log(`t+${(i + 1) * 10}s ${m.baseSymbol} status=${c.getWatchStatus(m.poolAddress)} live.openInterest=${live?.openInterest} (updatedAt ${live?.openInterestUpdatedAt}) chain=${st.openInterest} ${String(live?.openInterest) === String(st.openInterest) ? "same" : "DIFF"}`);
  }
}
process.exit(0);
