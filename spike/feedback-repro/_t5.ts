import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
for (const [sym, acct] of [["BTC", "0x89Ab64Da1806727042D48B0436ef0276c8075647"], ["ETH", "0xfbE713c07c83701E47DB37E459F483a9cF0BFb03"], ["ETH", "0xa92fdd8d60d92464A5378741D4Cf50b2F5844eAd"], ["BTC", "0x27871F6eCBCc6eb3B5aE6C4cE6541dbA120aFFb9"]]) {
  const m = perps.find((x: any) => x.baseSymbol === sym);
  const ref = { marginBank: m.marginBank, account: acct, pool: m.poolAddress };
  const [ma, pos, h, lev, bk, liq] = await Promise.all([c.getMarginAccount(m.marginBank, acct), c.getPerpPosition(ref), c.getAccountHealth(m.marginBank, acct), c.getPerpLeverage(ref).catch((e: any) => e.message), c.getBankruptcyPrice(ref), c.getLiquidationPrice(ref)]);
  console.log(sym, acct, "\n ma", j(ma).slice(0, 400), "\n pos", j(pos), "\n health", j(h).slice(0, 400), "\n lev", j(lev).slice(0, 400), "\n bk", bk, "liq", liq);
}
process.exit(0);
