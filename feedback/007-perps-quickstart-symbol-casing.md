# PERPS.md quick start fails on "BTC/USDSO:USDSO", and the error says to call loadMarkets() after it was called
Severity: major
Area: SDK

## Steps to reproduce
1. Follow `docs/PERPS.md` (shipped in the 0.32.1 package), "Quick start":
   ```ts
   await exchange.loadMarkets();
   await exchange.depositMargin("BTC/USDSO:USDSO", 1_000);
   await exchange.createOrder("BTC/USDSO:USDSO", "limit", "buy", 0.001, 62_000);
   const { fundingRate, markPrice } = await exchange.fetchFundingRate("BTC/USDSO:USDSO");
   ```
   The same page opens with "Perps are live on testnet: `BTC/USDSO:USDSO` and `ETH/USDSO:USDSO`". The `UnifiedFundingRate.symbol` doc comment also gives "e.g. \"BTC/USDSO:USDSO\"".
2. Run the read-only part against Hideki: `loadMarkets()`, then `fetchFundingRate("BTC/USDSO:USDSO")`.

Script: `spike/feedback-repro/p9-sdk-docs-samples.ts`.

## Expected
The symbol in the quick start resolves. If a symbol is unknown, the error names the real cause, for example "unknown symbol BTC/USDSO:USDSO; did you mean BTC/USDso:USDso?"

## Actual
Symbols are case-sensitive, and the loaded symbol is `BTC/USDso:USDso` (as `docs/reference/symbols.md` shows), so every quick-start call fails. The error tells the developer to do what they have just done:
```
after loadMarkets(): 21 perp symbols, e.g. ["ETH/USDso:USDso","BTC/USDso:USDso"]
fetchFundingRate("BTC/USDSO:USDSO") threw: InvalidInputError @somnia-chain/markets-sdk: unknown symbol BTC/USDSO:USDSO — call loadMarkets() first
fetchFundingRate("BTC/USDso:USDso") -> ok, fundingRate=0.001421335369622621 markPrice=81713.31618768301
```
A first-time user reads that as a loading or race problem and starts adding `await`s or retries. The real cause is the casing of `USDso`. The write calls (`depositMargin`, `createOrder`) use the same symbol, so they fail the same way.

## Evidence
Captured output of `p9-sdk-docs-samples.ts` above. The quick-start text is in `node_modules/@somnia-chain/markets-sdk/docs/PERPS.md` (lines 1–3 and the "Quick start" section). The doc comment is in `src/unified/structs.ts` (`UnifiedFundingRate.symbol`).

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), read-only `SomniaMarkets` (no key), 2026-10-20.

Suggested fix: use `BTC/USDso:USDso` in PERPS.md and the type docs. Make the symbol lookup case-insensitive, or say "did you mean" when a case-insensitive match exists. Only suggest `loadMarkets()` when no markets are loaded.
