// Edge inputs to perp reads: what errors come back?
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
const eth = perps.find((m: any) => m.baseSymbol === "ETH")!;
const spot = (await c.listMarkets?.({ marketType: "SPOT" }).catch(() => []))?.[0] ?? (await c.getMarkets?.().catch(() => []))?.find?.((m: any) => m.marketType === "SPOT");
const acct = "0x000000000000000000000000000000000000bEEF";
const run = async (name: string, f: () => Promise<unknown>) => {
  try { const r = await f(); const s = j(r); console.log(`${name} ->`, s && s.length > 500 ? s.slice(0, 500) + "…" : s); }
  catch (e: any) { console.log(`${name} THREW ${e.constructor.name}: ${e.message.split("\n").slice(0, 2).join(" | ").slice(0, 400)}`); }
};
console.log("spot pool used:", spot?.poolAddress, spot?.baseSymbol);
await run("getMaxPerpOrderSize price=0", () => c.getMaxPerpOrderSize({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, price: 0n }));
await run("getMaxPerpOrderSize price off-tick (81234.56)", () => c.getMaxPerpOrderSize({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, price: 81234560000000000000000n }));
await run("previewPerpLiquidationPrice quantity=0", () => c.previewPerpLiquidationPrice({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, quantity: 0n, price: 81000n * 10n ** 18n }));
await run("previewPerpLiquidationPrice quantity off-lot (1)", () => c.previewPerpLiquidationPrice({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, quantity: 1n, price: 81000n * 10n ** 18n }));
await run("previewPerpOrderMargin quantity off-lot (1)", () => c.previewPerpOrderMargin({ pool: btc.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, quantity: 1n, price: 81000n * 10n ** 18n }));
if (spot) {
  await run("getPerpState(spot pool)", () => c.getPerpState(spot.poolAddress));
  await run("getPerpHealthSnapshot(spot pool)", () => c.getPerpHealthSnapshot(spot.poolAddress));
  await run("getMaxPerpOrderSize(spot pool)", () => c.getMaxPerpOrderSize({ pool: spot.poolAddress, marginBank: btc.marginBank, account: acct, isBid: true, price: 10n ** 17n }));
}
await run("getPerpState(EOA)", () => c.getPerpState(acct));
await run("getPerpMaxLeverage(pool address as any)", () => c.getPerpMaxLeverage(btc.poolAddress));
await run("getPerpPosition(swapped pool/bank)", () => c.getPerpPosition({ marginBank: btc.poolAddress, account: acct, pool: btc.marginBank }));
await run('listPerpMarkets({ baseSymbol: "btc" })', async () => (await c.listPerpMarkets({ baseSymbol: "btc" })).length);
await run("getPerpSideHolders(ETH pool, BTC bank)", async () => (await c.getPerpSideHolders({ marginBank: btc.marginBank, pool: eth.poolAddress, isLong: true })).holders.length);
process.exit(0);
