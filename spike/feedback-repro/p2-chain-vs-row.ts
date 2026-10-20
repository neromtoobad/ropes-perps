import { markets, j } from "./_conn.ts";
import { getAddress } from "viem";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const now = Math.floor(Date.now() / 1000);
console.log("now", now, new Date().toISOString());
const sys = await c.getPerpSystemConfig(perps[0].marginBank);
console.log("systemConfig", j(sys));
for (const m of perps.slice(0, 21)) {
  const out: any = { sym: m.baseSymbol };
  try {
    const p = await c.publicClient?.readContract?.({ address: m.poolAddress, abi: [{ type: "function", name: "getOrderBookParameters", stateMutability: "view", inputs: [], outputs: [{ type: "tuple", components: [{ name: "tickSize", type: "uint256" }, { name: "minQuantity", type: "uint256" }, { name: "lotSize", type: "uint256" }] }] }], functionName: "getOrderBookParameters" });
    if (p) out.obp = p;
  } catch (e: any) { out.obpErr = e.message.slice(0, 100); }
  try { const s = await c.getPerpState(m.poolAddress); out.state = { mark: s.markPrice, ok: s.markPriceOk, index: s.indexPrice, idxAt: s.indexUpdatedAt, oi: s.openInterest, fr: s.fundingRate, lastF: s.lastFundingUpdateAt, nextF: s.nextFundingAt }; } catch (e: any) { out.stateErr = e.message.slice(0, 200); }
  try { const h = await c.getPerpHealthSnapshot(m.poolAddress); out.health = h; } catch (e: any) { out.healthErr = e.message.slice(0, 200); }
  try { const r = await c.getPerpRiskParams(m.poolAddress); out.risk = r; } catch (e: any) { out.riskErr = e.message.slice(0, 200); }
  out.row = { tick: m.tickSize, lot: m.lotSize, minQ: m.minQuantity, imf: m.initialMarginBps, mark: m.markPrice, markAt: m.markPriceUpdatedAt, oi: m.openInterest, oiAt: m.openInterestUpdatedAt, fr: m.fundingRate, fAt: m.fundingUpdatedAt };
  console.log(j(out));
}
process.exit(0);
