# The docs' open-interest caps are 2–4x below the chain, and the per-account cap is "a tenth" on only 1 of 21 markets
Severity: normal
Area: docs

## Steps to reproduce
1. Read the market table on app.testnet.dreamdex.io/docs/trading/perps-testnet ("Open interest cap", described as "read from the live markets"). Below it: "A single account is capped at a tenth of it on most markets." The developer page (/docs/developers/perps-testnet, Common pitfalls) repeats this: "Each account has a position cap per market, a tenth of the market's open interest cap on most markets."
2. For every market, read `client.getPerpRiskParams(pool)` (`maxOpenInterest`, `maxPositionSize`) and scale by the row's `baseDecimals`.

Script: `spike/feedback-repro/p20-oi-and-position-caps.ts`.

## Expected
The table's caps match the chain, and the per-account cap is about a tenth of the OI cap on most markets.

## Actual
Every cap except TAO's is 2x (BTC, ETH, HYPE, SOL) or 4x (all others) higher on chain than in the docs. The per-account cap is a tenth of the OI cap only on TAO. It is 1/40 on the 5x markets, 1/20 on most 10x and 20x markets, about 1/5 on BTC and 1/4 on ZEC. The docs' figures look like a snapshot from before the OI caps were raised: at the docs' values, ZRO's `maxPositionSize` is exactly a tenth. A bot that sizes from "a tenth of the OI cap" over-sizes by 2–4x and hits `MaxPositionSizeExceeded()`.

## Evidence
```
market    docsOICap      chain maxOpenInterest  chain/docs  chain maxPositionSize  posCap/OICap
ZRO       250599.5       1002398                4.00        25059.9                1/40.0
LIT       138896.6       555586.4               4.00        13889.6                1/40.0
VVV       21786.14       87144.56               4.00        2178.61                1/40.0
1000PEPE  130285600      521142400              4.00        13028500               1/40.0
PUMP      87993700       351974800              4.00        8799300                1/40.0
ZEC       420            1680                   4.00        420                    1/4.0
TAO       2185.491       2185.491               1.00        218.549                1/10.0
WLD       1264000        5056000                4.00        126400                 1/40.0
NEAR      250410         1001640                4.00        50000                  1/20.0
XLM       2677780        10711120               4.00        535556                 1/20.0
AVAX      66672.2        266688.8               4.00        13334.4                1/20.0
LINK      42643.6        170574.4               4.00        8528.6                 1/20.0
SUI       635009         2540036                4.00        127000                 1/20.0
ADA       2254678        9018712                4.00        450934                 1/20.0
BNB       693.975        2775.9                 4.00        140                    1/19.8
DOGE      5613590        22454360               4.00        1122700                1/20.0
XRP       344632         1378528                4.00        68926.4                1/20.0
HYPE      23812.72       47625.44               2.00        2381.27                1/20.0
SOL       47654.44       95308.88               2.00        4765.44                1/20.0
ETH       3995.6125      7991.225               2.00        399.5612               1/20.0
BTC       246.81545      493.6309               2.00        100                    1/4.9
markets where the per-account cap is a tenth of the OI cap: 1 of 21
```

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), docs as served 2026-10-20.

Suggested fix: generate the table from the chain at build time, as the page implies. Replace "a tenth" with "read `maxPositionSize` from `getPerpRiskParams` or `getMaxPerpOrderSize`".
