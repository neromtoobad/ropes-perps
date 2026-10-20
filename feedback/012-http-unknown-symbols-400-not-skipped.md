# HTTP API answers 400 for an unknown symbol, though the docs say unknown symbols are silently skipped
Severity: normal
Area: docs

## Steps to reproduce
1. Read HTTP API › Market Data: "Unknown or malformed symbols are silently skipped rather than erroring, so a serialization mismatch shows up as an empty [] rather than a 4xx." The comma-joined form "matches no market and is silently skipped, so the response is []". `/v0/tickers` and, on the Trading page, `/v0/orders` say the same ("unknown symbols are silently skipped").
2. Call `/v0/orderbooks` and `/v0/tickers` with a comma-joined list, and with one valid and one unknown symbol, on testnet and mainnet.

Script: `spike/feedback-repro/p25-http-unknown-symbols.ts`.

## Expected
Per the docs: HTTP 200 with `[]`, or with only the valid symbol's data.

## Actual
Both environments return **400 `invalid_param`**, and one unknown symbol fails the whole request, valid symbols included. The response also carries a `context.invalid_symbols` field that the Error Handling page's error format doesn't document. Client code written to the docs (treat `[]` as "no such market") never sees an empty list. It gets an error, and a multi-symbol poll drops every market because of one bad symbol.
```
GET https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["SOMI:USDso,WETH:USDso"]},"description":"unknown market symbols: SOMI:USDso,WETH:USDso","name":"invalid_param","status":400}
GET https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso&symbols=NOPE:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["NOPE:USDso"]},"description":"unknown market symbols: NOPE:USDso","name":"invalid_param","status":400}
GET https://stg.api.dreamdex.io/v0/tickers?symbols=SOMI:USDso&symbols=NOPE:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["NOPE:USDso"]},"description":"unknown market symbols: NOPE:USDso","name":"invalid_param","status":400}
GET https://api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["SOMI:USDso,WETH:USDso"]},…}
GET https://api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso&symbols=NOPE:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["NOPE:USDso"]},…}
GET https://api.dreamdex.io/v0/tickers?symbols=SOMI:USDso&symbols=NOPE:USDso
  -> 400 Error-Name=invalid_param {"context":{"invalid_symbols":["NOPE:USDso"]},…}
```
Control: `?symbols=SOMI:USDso` alone returns 200 with the book on both hosts.

The 400 is arguably the better behaviour. The docs, which tell integrators to expect `[]`, are what's wrong.

## Evidence
Captured output of `p25-http-unknown-symbols.ts` above.

## Environment
`https://stg.api.dreamdex.io/v0` and `https://api.dreamdex.io/v0`, public endpoints, no auth, 2026-10-20.
