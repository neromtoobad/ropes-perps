# PERPS.md "one-shot reads" sample filters on baseSymbol "WBTC", gets zero rows and crashes with a TypeError
Severity: normal
Area: docs

## Steps to reproduce
1. Run the "One-shot reads (no watch)" sample from `docs/PERPS.md` in the 0.32.1 package:
   ```ts
   const perps = await client.listPerpMarkets({ baseSymbol: "WBTC", limit: 20 });
   const one = await client.getPerpMarket(perps[0].id); // null if not a perp
   ```
2. Compare it with the `PerpMarket.baseSymbol` doc comment ("Synthetic-base symbol (e.g. \"WBTC\")") and with the PERPS.md intro ("Perps are live on testnet: BTC… and ETH…").

Script: `spike/feedback-repro/p9-sdk-docs-samples.ts`.

## Expected
The sample returns the BTC perp. The type docs give a real `baseSymbol` value. The intro lists the markets that exist.

## Actual
Perp rows use the plain ticker (`"BTC"`), so the filter matches nothing and the next line throws:
```
listPerpMarkets({ baseSymbol: "WBTC", limit: 20 }) -> 0 rows
getPerpMarket(perps[0].id) threw: TypeError Cannot read properties of undefined (reading 'id')
listPerpMarkets({ baseSymbol: "BTC" }) -> 1 row(s), baseSymbol = BTC
```
The filter is also case-sensitive: `listPerpMarkets({ baseSymbol: "btc" })` returns 0 rows (`spike/feedback-repro/p14-edge-inputs.ts`). Hideki runs 21 perp markets, not the two the intro names (`spike/feedback-repro/p1-markets.ts`, `count 21`).

## Evidence
Captured output above. The sample is at PERPS.md "One-shot reads (no watch)". The type comment is in `src/markets.ts`, `PerpMarket.baseSymbol`.

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), read-only client, 2026-10-20.
