// Unified (CCXT-style) reads on perps with different base decimals: are prices/amounts scaled right?
import { markets, j } from "./_conn.ts";
import { formatUnits } from "viem";
const ex = markets as any;
const c = markets.client as any;
await ex.loadMarkets();
for (const base of ["BTC", "NEAR", "PUMP", "XLM", "ETH"]) {
  const sym = `${base}/USDso:USDso`;
  const m = ex.markets[sym];
  const row = m.info;
  const st = await c.getPerpState(row.poolAddress);
  const out: any = { sym, baseDecimals: row.baseDecimals, markHuman: Number(formatUnits(st.markPrice, 18)), oiHuman: Number(formatUnits(st.openInterest, row.baseDecimals)) };
  try { const ob = await ex.fetchOrderBook(sym, 3); out.bid0 = ob.bids[0]; out.ask0 = ob.asks[0]; } catch (e: any) { out.obErr = e.message.split("\n")[0]; }
  try { const t = await ex.fetchTicker(sym); out.ticker = { last: t.last, bid: t.bid, ask: t.ask, baseVolume: t.baseVolume, quoteVolume: t.quoteVolume, vwap: t.vwap }; } catch (e: any) { out.tErr = e.message.split("\n")[0]; }
  try { const k = await ex.fetchOHLCV(sym, "1h", undefined, 2); out.ohlcvLast = k[k.length - 1]; } catch (e: any) { out.kErr = e.message.split("\n")[0]; }
  try { const b = await c.getSpotOrderBook(row.poolAddress, { depth: 1 }); out.rawBook = j({ bid: b.bids?.[0], ask: b.asks?.[0] }).slice(0, 300); } catch (e: any) { out.rawErr = e.constructor.name + ": " + e.message.split("\n")[0]; }
  console.log(j(out));
}
process.exit(0);
