import { markets, j } from "./_conn.ts";
import { parseUnits } from "viem";
const c = markets.client;
const perps = await c.listPerpMarkets();
const btc = perps.find((m) => m.baseSymbol === "BTC")!;
const shorts = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: false });
const holder = shorts.holders[0];
const fresh = "0x000000000000000000000000000000000000bEEF";
const st = await c.getPerpState(btc.poolAddress);
console.log("BTC mark", st.markPrice);
for (const acct of [fresh, holder]) {
  for (const isBid of [true, false]) {
    const price = isBid ? parseUnits("100000", btc.quoteDecimals) : parseUnits("70000", btc.quoteDecimals);
    try { const m = await c.getMaxPerpOrderSize({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct as any, isBid, price }); console.log("max", acct.slice(0, 8), isBid ? "bid" : "ask", j(m)); } catch (e: any) { console.log("max ERR", e.constructor.name, e.message.slice(0, 400)); }
  }
  try { const p = await c.previewPerpLiquidationPrice({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct as any, isBid: true, quantity: parseUnits("0.001", btc.baseDecimals), price: st.markPrice }); console.log("liqPreview", acct.slice(0, 8), j(p)); } catch (e: any) { console.log("liqPreview ERR", e.constructor.name, e.message.slice(0, 400)); }
  try { const p = await c.getLiquidationPrice?.({ marginBank: btc.marginBank, account: acct as any, pool: btc.poolAddress }); console.log("getLiquidationPrice", j(p)); } catch (e: any) { console.log("getLiq ERR", e.constructor.name, e.message.slice(0, 300)); }
  try { const p = await c.previewPerpOrderMargin({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct as any, isBid: true, quantity: parseUnits("0.001", btc.baseDecimals), price: st.markPrice } as any); console.log("orderMargin", j(p)); } catch (e: any) { console.log("orderMargin ERR", e.constructor.name, e.message.slice(0, 300)); }
  try { const p = await c.getPerpMaxLeverage({ marginBank: btc.marginBank, account: acct as any, pool: btc.poolAddress }); console.log("maxLev", p); } catch (e: any) { console.log("maxLev ERR", e.constructor.name, e.message.slice(0, 300)); }
  try { const p = await c.getPerpLeverage({ marginBank: btc.marginBank, account: acct as any, pool: btc.poolAddress } as any); console.log("lev", j(p)); } catch (e: any) { console.log("lev ERR", e.constructor.name, e.message.slice(0, 300)); }
}
process.exit(0);
