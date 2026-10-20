# listLiquidations serves kind "TakeoverBandClamped", which the SDK doesn't know; its event isn't in liquidationEngineEventsAbi
Severity: normal
Area: SDK

## Steps to reproduce
1. `client.listLiquidations({ limit: 1000 })` on Hideki. Tally `kind`, and check each against the SDK's `LIQUIDATION_KIND` with `isLiquidationKind`.
2. Take a `TakeoverBandClamped` row, fetch its transaction receipt, and match the LiquidationEngine logs against `liquidationEngineEventsAbi`.
3. Filter on it: `client.listLiquidations({ kind: "TakeoverBandClamped" })`.

Script: `spike/feedback-repro/p38-liquidation-kinds.ts` (read-only).

## Expected
`LiquidationEvent.kind`'s doc lists 17 waterfall stages, and `LIQUIDATION_KIND` is "the vocabulary `kind` and `kinds` filter on". PERPS.md says `liquidationEngineEventsAbi` carries "the liquidation waterfall stages and their costs" and to "use the published ABI rather than a copy". So a kind the live indexer writes should be in the enum, and the event behind it should be in the ABI.

## Actual
3% of recent liquidation rows have a kind that appears in no SDK type, doc or ABI:
```
listLiquidations({ limit: 1000 }) -> 1000 rows, 1792095666..1792508253
  AccountLiquidated      x333  in LIQUIDATION_KIND: true
  KeeperReward           x304  in LIQUIDATION_KIND: true
  PositionLiquidated     x324  in LIQUIDATION_KIND: true
  TakeoverBandClamped    x30  in LIQUIDATION_KIND: false
  CloseOutMarginSettled  x3  in LIQUIDATION_KIND: true
  PositionTakenOver      x3  in LIQUIDATION_KIND: true
  PositionTransferred    x3  in LIQUIDATION_KIND: true
example row: {"id":"0x3d6e0f856bb6c27d646f6fc7bbf55cfb1595cf4b08475b5de379c31b6148c676_20","account":"0x327861124ea6d7e4ee3c61d18b7b978e53b16dc8","pool":"0x7058579f3248559963f79adb937c6de9f953e060","kind":"TakeoverBandClamped","size":null,"price":"1343727274446500000",…}
listLiquidations({ kind: "TakeoverBandClamped" }) -> 3 rows
  LiquidationEngine log #17 topic0 0x93081d01… decodes with liquidationEngineEventsAbi
  LiquidationEngine log #19 topic0 0x7f65cfb1… decodes with liquidationEngineEventsAbi
  LiquidationEngine log #20 topic0 0x83fa34f737ba91bba5f20c6d7d882303fbb32367c0ecdc6969758826c490d3be <-- not in liquidationEngineEventsAbi
  LiquidationEngine log #21 topic0 0x0e0d416a… decodes with liquidationEngineEventsAbi
  LiquidationEngine log #22 topic0 0x1d68b7d3e7dc3becd79d240b343718f2c6dcb5efca01640951f2951368b3b2e2 <-- not in liquidationEngineEventsAbi
  LiquidationEngine log #23 topic0 0x1624f8f3… decodes with liquidationEngineEventsAbi
```
- `TakeoverBandClamped` (log #20 = the row's `_20` id) is a real stage that the indexer records on 1 in 11 liquidations. A TypeScript caller can't filter on it (`kind?: LiquidationKind` rejects the string; it only works with a cast, as above). An exhaustive `switch` over `LIQUIDATION_KIND` drops it to the "unknown" branch, and nothing says what it means. Judging by the name and its three data words, it's the backstop takeover price being clamped to a band.
- Log #22 (`0x1d68b7d3…`, account-indexed, one word) is a second LiquidationEngine event in the same liquidation. It's in no exported ABI and isn't indexed at all: the indexer has rows for #17, #20, #21 and #23 of this tx, none for #22.
- A raw watcher following PERPS.md's "Watch from chain" recipe with `liquidationEngineEventsAbi` can't decode either log.

## Evidence
Captured output of `p38-liquidation-kinds.ts` above. Indexer rows for the example tx (`LiquidationEvent(where: {txHash: …})`): `_17 PositionLiquidated`, `_20 TakeoverBandClamped`, `_21 KeeperReward`, `_23 AccountLiquidated`.

## Environment
@somnia-chain/markets-sdk 0.32.1 (`LIQUIDATION_KIND`, `liquidationEngineEventsAbi`), Hideki testnet (chain 50383), LiquidationEngine `0xA66d3C24Ad4a389d863846905D8173e1017e9F4D`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, read-only, 2026-10-20.

Suggested fix: add `TakeoverBandClamped` (and the `0x1d68b7d3` event) to `liquidationEngineEventsAbi`, `LIQUIDATION_KIND` and the `kind` doc table, and extend the topic0 pin test to every event the deployed LiquidationEngine can emit.
