// exchange.fetchOHLCV(symbol, timeframe, since, limit) on a perp: does `since` select the window?
import { markets } from "./_conn.ts";
const ex = markets as any;
await ex.loadMarkets();
const sym = "BTC/USDso:USDso";
const iso = (ms: number) => new Date(ms).toISOString();
const since = Math.floor((Date.now() - 24 * 3600_000) / 60_000) * 60_000; // 24 h ago, minute-aligned
console.log("now  ", iso(Date.now()));
console.log("since", iso(since), "\n");
const a = await ex.fetchOHLCV(sym, "1m", since);
console.log(`fetchOHLCV("${sym}", "1m", since)        -> ${a.length} rows, first ${iso(a[0][0])}, last ${iso(a[a.length - 1][0])}`);
const b = await ex.fetchOHLCV(sym, "1m", since, 100);
console.log(`fetchOHLCV("${sym}", "1m", since, 100)   -> ${b.length} rows, first ${iso(b[0][0])}, last ${iso(b[b.length - 1][0])}`);
const old = Date.now() - 7 * 24 * 3600_000;
const c2 = await ex.fetchOHLCV(sym, "1m", old, 60);
console.log(`fetchOHLCV("${sym}", "1m", now-7d, 60)   -> ${c2.length} rows, first ${c2[0] ? iso(c2[0][0]) : "-"}`);
const pool = ex.markets[sym].id;
const ref = await markets.client.getCandles(pool, 60, { from: since / 1000, limit: 100 });
console.log(`\nclient.getCandles(pool, 60, { from: since, limit: 100 }) -> ${ref.length} rows, first ${iso(Number(ref[0].bucketStart) * 1000)}, last ${iso(Number(ref[ref.length - 1].bucketStart) * 1000)}`);
const w = await markets.client.getCandles(pool, 60, { from: since / 1000, to: since / 1000 + 99 * 60, limit: 100 });
console.log(`client.getCandles(pool, 60, { from: since, to: since + 99 min, limit: 100 }) -> ${w.length} rows, first ${iso(Number(w[0].bucketStart) * 1000)}, last ${iso(Number(w[w.length - 1].bucketStart) * 1000)}\n`);
const t = await ex.fetchTrades(sym, Date.now() - 6 * 3600_000, 20);
console.log(`fetchTrades("${sym}", now-6h, 20) -> ${t.length} rows, oldest ${t.length ? t[t.length - 1].datetime : "-"}, newest ${t.length ? t[0].datetime : "-"}`);
process.exit(0);
