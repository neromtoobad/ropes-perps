# The HTTP and WebSocket APIs serve no perp markets, and the developer docs never say so
Severity: normal
Area: API

## Steps to reproduce
1. On the docs Developers overview, HTTP API and WebSocket API sit next to "Perps (Testnet)". The overview says to use REST to "discover markets" and WebSocket for "live order book / trades / candles". The HTTP API page lists only Mainnet (5031) and Shannon (50312) base URLs. The `/v0/markets` response has a `kind` field.
2. Ask the testnet API for perp markets over REST and WebSocket.

Script: `spike/feedback-repro/p11-http-ws-perps.ts`.

## Expected
Either the APIs list the 21 Hideki perp markets, or the perps developer page and the HTTP and WebSocket pages say plainly that perps are SDK and indexer only, with no REST or WS feed and no Hideki base URL.

## Actual
`kind` is always `"spot"`. The three spot pairs are the only markets, and no perp symbol form is accepted. Nothing on the perps developer page, HTTP API or WebSocket API says perps are out of scope. A bot builder who starts from the API docs, as the Developers overview suggests, finds out by trial and error.
```
GET /markets -> 200 {"markets":[{"base":"0x28f3…","kind":"spot",…,"symbol":"SOMI:USDso",…}…
kinds: ["spot"] symbols: ["SOMI:USDso","WBTC:USDso","WETH:USDso"]
GET /orderbooks?symbols=BTC/USDso:USDso -> 400 {"context":{"invalid_symbols":["BTC/USDso:USDso"]},"description":"unknown market symbols: BTC/USDso:USDso","name":"invalid_param","status":400}
GET /orderbooks?symbols=BTC:USDso -> 400 {"context":{"invalid_symbols":["BTC:USDso"]},"description":"unknown market symbols: BTC:USDso","name":"invalid_param","status":400}
GET /markets/BTC:USDso/candles?interval=1m -> 404 {"description":"market not found: BTC:USDso","name":"market_not_found","status":404}
WS <- {"type":"error","errorName":"subscription_failed","message":"subscription failed to channel: orderbook"}
WS <- {"type":"error","errorName":"subscription_failed","message":"subscription failed to channel: orderbook"}
```
(base `https://stg.api.dreamdex.io/v0`, WS `wss://stg.api.dreamdex.io/v0/ws/public`)

## Evidence
Captured output of `p11-http-ws-perps.ts` above.

## Environment
dreamDEX HTTP API `https://stg.api.dreamdex.io/v0` and WebSocket `wss://stg.api.dreamdex.io/v0/ws/public`, docs as served 2026-10-20. No authentication was used.
