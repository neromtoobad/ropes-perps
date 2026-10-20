// Broad read-only sweep of perp reads for one active BTC short holder.
import { markets, j } from "./_conn.ts";
import { formatEther } from "viem";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
const shorts = await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: btc.poolAddress, isLong: false });
const acct = process.argv[2] ?? shorts.holders[0];
console.log("account", acct);
const run = async (name: string, f: () => Promise<unknown>) => {
  const t = Date.now();
  try { const r = await f(); const s = j(r); console.log(`${name} (${Date.now() - t}ms):`, s.length > 700 ? s.slice(0, 700) + "…" : s); }
  catch (e: any) { console.log(`${name} THREW (${Date.now() - t}ms): ${e.constructor.name}: ${e.message.split("\n")[0].slice(0, 300)}`); }
};
await run("getPerpStopOrderSomiPayment", async () => { const w = await c.getPerpStopOrderSomiPayment(btc.stopRegistry); return `${w} wei = ${formatEther(w)} STT`; });
await run("getPerpFeedStatus", () => c.getPerpFeedStatus(btc.poolAddress));
await run("getPerpFundingPremium", () => c.getPerpFundingPremium(btc.poolAddress));
await run("getPerpPortfolio", () => c.getPerpPortfolio(acct));
await run("listPerpOrderHistory", () => c.listPerpOrderHistory(acct, { limit: 3 }));
await run("listPerpOrderRejections", () => c.listPerpOrderRejections({ limit: 3 }));
await run("listPerpFees", () => c.listPerpFees({ limit: 3 }));
await run("listPerpInsuranceFundEvents", () => c.listPerpInsuranceFundEvents({ limit: 3 }));
await run("listPerpPositionChanges", () => c.listPerpPositionChanges({ account: acct, limit: 3 }));
await run("listPerpStopOrders", () => c.listPerpStopOrders({ limit: 3 }));
await run("getPerpPositionAnalytics", () => c.getPerpPositionAnalytics({ marginBank: btc.marginBank, account: acct, pool: btc.poolAddress }));
await run("listPerpPositionAnalytics", () => c.listPerpPositionAnalytics({ marginBank: btc.marginBank, account: acct }));
await run("getAccountEquity", () => c.getAccountEquity(acct, { scope: "perps", marginBank: btc.marginBank }));
await run("getMarginAccount", () => c.getMarginAccount(btc.marginBank, acct));
await run("previewPerpClosePnl", () => c.previewPerpClosePnl({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct }));
await run("getPerpVoucher", () => c.getPerpVoucher(btc.marginBank, acct));
await run("getPerpCollateralBasis", () => c.getPerpCollateralBasis(btc.marginBank, acct));
await run("getCandles 60s", async () => { const k = await c.getCandles(btc.poolAddress, 60); return { n: k.length, first: k[0], last: k[k.length - 1] }; });
await run("getCandles 3600s", async () => { const k = await c.getCandles(btc.poolAddress, 3600); return { n: k.length, last: k[k.length - 1] }; });
await run("getOrderBook", async () => { const b = await c.getOrderBook?.(btc.poolAddress); return b; });
process.exit(0);
