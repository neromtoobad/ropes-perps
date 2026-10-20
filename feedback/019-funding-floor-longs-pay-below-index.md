# Funding has an undocumented +0.01%/8h floor: longs paid in 423 of 456 settlements where the perp traded below the index
Severity: normal
Area: docs

## Steps to reproduce
1. Read Perps (Testnet) › Funding (app.testnet.dreamdex.io/docs/trading/perps-testnet/funding): "Perp above the index (positive funding): longs pay shorts. Perp below the index (negative funding): shorts pay longs." The formula given is `position size × index price × funding rate / 8`. Nothing else feeds the rate.
2. For every market, read the last 24 hourly settlements with `client.listFundingRateHistory(pool, { limit: 24 })`. Each row carries the settled `fundingRate`, `markPrice` and `indexPrice`. Also read the live `getPerpState` and `getPerpFundingPremium`.

Script: `spike/feedback-repro/p34-funding-sign-vs-docs.ts` (read-only).

## Expected
When the perp is below the index, funding is negative and shorts pay longs.

## Actual
The settled rate is exactly **+0.0100% per 8 h** in 430 of 504 settlements. It stays there when the perp is below the index and when the time-weighted book premium is negative. LIT is the only market whose rate went negative in the window. This looks like a base interest-rate term added to the premium and clamped around it, the way Hyperliquid/Binance do it. No dreamDEX page and no SDK doc mentions one.
```
ZRO       settlements 24  rate == +0.0100% exactly: 24  mark<index: 11, of which rate > 0 (longs pay): 11
LIT       settlements 24  rate == +0.0100% exactly: 1  mark<index: 24, of which rate > 0 (longs pay): 2
PUMP      settlements 24  rate == +0.0100% exactly: 24  mark<index: 24, of which rate > 0 (longs pay): 24
TAO       settlements 24  rate == +0.0100% exactly: 24  mark<index: 24, of which rate > 0 (longs pay): 24
ETH       settlements 24  rate == +0.0100% exactly: 24  mark<index: 24, of which rate > 0 (longs pay): 24
BTC       settlements 24  rate == +0.0100% exactly: 0  mark<index: 24, of which rate > 0 (longs pay): 24
… (all 21 markets in the script output)
TOTAL 504 settlements: rate exactly +0.0100%/8h in 430; mark below index in 456, and longs still paid in 423 of those

live chain state (getPerpState + getPerpFundingPremium) for markets whose time-weighted premium is negative:
  LIT       mark 3246090561863000000 index 3249558493084000000 (mark < index)  timeWeightedPremium -0.0840%  fundingRate -0.0194%
  VVV       mark 25791191819330000000 index 25801931697003000000 (mark < index)  timeWeightedPremium -0.0023%  fundingRate 0.0100%
  WLD       mark 563385802593000000 index 564185650392000000 (mark < index)  timeWeightedPremium -0.0078%  fundingRate 0.0100%
  LINK      mark 12120193339115000000 index 12129077666311000000 (mark < index)  timeWeightedPremium -0.0076%  fundingRate 0.0100%
  DOGE      mark 80017490665000000 index 80072464908000000 (mark < index)  timeWeightedPremium -0.0061%  fundingRate 0.0100%
  NEAR      mark 4860555105709000000 index 4861596903243500000 (mark < index)  timeWeightedPremium -0.0102%  fundingRate 0.0027%
```
So on testnet a long pays about 0.03% a day by default, and a short collects it, whichever side of the index the perp trades. A trader or bot following the docs expects to be paid for a long when the perp sits below the index. Instead the long pays on almost every market, almost every hour. Any carry, basis or "farm negative funding" strategy built on the documented rule gets the sign wrong. The docs also give no way to predict the rate from the premium: `getPerpFundingPremium().timeWeightedPremium` (documented as "the value to build a predicted funding rate from") is negative on these markets while the charged rate is +0.01%.

## Evidence
Captured output of `p34-funding-sign-vs-docs.ts` above, run 2026-10-20 ~15:15 UTC. Every rate is the raw `fundingRate` (1e18 = 100%) from the indexer's `FundingRateUpdate` rows and from `PerpPool` state.

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, 2026-10-20.

Suggested fix: document the full rate formula on the Funding page: the interest/base component (0.01% per 8 h), how it combines with the premium (clamp bounds), and that the sign rule applies to the premium, not to the rate.
