# fetchOHLCV and fetchTrades ignore `since` as a start point: you always get the newest rows
Severity: major
Area: SDK

## Steps to reproduce
1. `await exchange.loadMarkets()`.
2. `exchange.fetchOHLCV("BTC/USDso:USDso", "1m", since)` with `since` = 24 h ago, with no limit and then with `limit = 100`.
3. `exchange.fetchOHLCV(…, "1m", now − 7 d, 60)`.
4. `exchange.fetchTrades("BTC/USDso:USDso", now − 6 h, 20)`.

Script: `spike/feedback-repro/p24-fetchohlcv-since.ts`.

## Expected
These are the SDK's CCXT-style verbs (`docs/EXCHANGE.md`: `fetchOHLCV(symbol, "5m", since?, limit?)`). In CCXT, `since` is where the page starts: `fetchOHLCV(sym, tf, since, limit)` returns up to `limit` candles beginning at `since`. That is how every CCXT backtest and back-fill loop pages through history (`since = lastRow[0] + tf`).

## Actual
The SDK fetches the newest `limit` buckets (default 500) and only then drops rows older than `since`. `since` never selects the window:
```
now   2026-10-20T14:13:53.526Z
since 2026-10-19T14:13:00.000Z

fetchOHLCV("BTC/USDso:USDso", "1m", since)        -> 500 rows, first 2026-10-20T05:49:00.000Z, last 2026-10-20T14:13:00.000Z
fetchOHLCV("BTC/USDso:USDso", "1m", since, 100)   -> 100 rows, first 2026-10-20T12:34:00.000Z, last 2026-10-20T14:13:00.000Z
fetchOHLCV("BTC/USDso:USDso", "1m", now-7d, 60)   -> 60 rows, first 2026-10-20T13:14:00.000Z

client.getCandles(pool, 60, { from: since, limit: 100 }) -> 100 rows, first 2026-10-20T12:34:00.000Z, last 2026-10-20T14:13:00.000Z
client.getCandles(pool, 60, { from: since, to: since + 99 min, limit: 100 }) -> 100 rows, first 2026-10-19T14:13:00.000Z, last 2026-10-19T15:52:00.000Z

fetchTrades("BTC/USDso:USDso", now-6h, 20) -> 20 rows, oldest 2026-10-20T14:13:41.000Z, newest 2026-10-20T14:13:56.000Z
```
Asking for "24 h of 1m candles from yesterday 14:13" silently returns the last 8 h 24 min. Asking for "60 candles from a week ago" returns the last hour. A CCXT-style pager that advances `since` gets the same newest page every time. Nothing errors, so a backtest or funding/PnL report quietly runs on the wrong window.

The cause is in `dist/unified/exchange.js` `fetchOHLCV`: it calls `getCandles(pool, interval, { limit, market })` without `from`, then `.filter(row => row[0] >= since)`. `fetchTrades` does the same. `client.getCandles` has the same newest-first behaviour when given only `from`. Only `from` together with `to` returns the requested window, as the last `getCandles` line shows.

## Evidence
Captured output of `p24-fetchohlcv-since.ts` above.

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, read-only client, 2026-10-20.

Suggested fix: when `since` is given, pass `from: since/1000` plus `to: from + limit × interval` (or an ascending order) to the indexer query. Do the same for trades.
