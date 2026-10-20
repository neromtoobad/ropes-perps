# Position lastUpdatedTimestampNs is always 0, so exchange.fetchPositions dates every position 1970-01-01
Severity: normal
Area: contracts

## Steps to reproduce
1. Take open positions on BTC, ETH, SOL, XRP and DOGE (five holders per side from `getPerpSideHolders`). Read each with `client.getPerpPosition({ marginBank, account, pool })`, which is MarginBank `getPosition(account, pool)`. Compare `lastUpdatedTimestampNs` with the indexer's `updatedAt` for the same position (`listPerpPositions`).
2. Call the CCXT-style `exchange.fetchPositions()` for one of those accounts. The script builds a read-only `SomniaMarkets` with an address-only `account`.

Scripts: `spike/feedback-repro/p39-position-timestamp-zero.ts` and `spike/feedback-repro/p39b-fetchpositions-timestamp.ts` (read-only).

## Expected
The SDK documents the field as `PerpPosition.lastUpdatedTimestampNs`: "Last position update (nanoseconds)". `fetchPositions` turns it into the CCXT `timestamp`/`datetime` of each position.

## Actual
It's `0` on every position read, including positions changed today:
```
ETH   0xfbE713c07c83701E47DB37E459F483a9cF0BFb03 size 8464400000000000000 lastUpdatedTimestampNs 0 | indexer updatedAt 1792498481 (2026-10-20T12:14:41.000Z) block 28465950
SOL   0x0DA52C5b985912D18E00FFfA88b7199C9c4085b1 size 1140000000 lastUpdatedTimestampNs 0 | indexer updatedAt 1792480568 (2026-10-20T07:16:08.000Z) block 28286952
XRP   0x95734434D923173687f66C07DbE50eb650A791Ea size -10300000 lastUpdatedTimestampNs 0 | indexer updatedAt 1791274240 (2026-10-06T08:10:40.000Z) block 16246849
DOGE  0x0213Aa0affCbe22CDF78596BE3c911aaD0EA7982 size -314000000000 lastUpdatedTimestampNs 0 | indexer updatedAt 1790677791 (2026-09-29T10:29:51.000Z) block 10285204
…
open positions read: 50; lastUpdatedTimestampNs == 0 on 50
```
```
exchange.fetchPositions() for 0xfbE713c07c83701E47DB37E459F483a9cF0BFb03:
ETH/USDso:USDso long 8.4644 entry 2382.019359907377 timestamp 0 datetime 1970-01-01T00:00:00.000Z info.position.lastUpdatedTimestampNs 0
```
The MarginBank never seems to write the field. The bank's own holder-state view shows the same zero (`p39` run with `ETH`: `MarginBank.getSideHolderStatesPaginated(ETH, long, 0, 50): 50 of 330 states, lastUpdatedTimestampNs non-zero on 0`). Anything that relies on it gets an epoch timestamp or a "stale for 56 years" answer: position age, a "since" column, a keeper skipping recently touched accounts, or a CCXT consumer sorting or deduping positions by `timestamp`. Nothing errors.

## Evidence
Captured output of both scripts above, from holder snapshots around block 28,580,000. `fetchPositions` sets `timestamp = Number(pos.lastUpdatedTimestampNs / 1_000_000n)` in `node_modules/@somnia-chain/markets-sdk/src/unified/exchange.ts`.

## Environment
Hideki testnet (chain 50383), MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, @somnia-chain/markets-sdk 0.32.1, viem 2.57.7, third-party accounts, read-only, 2026-10-20.

Suggested fix: set `lastUpdatedTimestampNs` in `MarginBank.settleTrade` (and the liquidation/ADL/transfer paths). Until then, have the SDK return `undefined` for the CCXT `timestamp`/`datetime` instead of the epoch, and say in the `PerpPosition` doc that the field is unset.
