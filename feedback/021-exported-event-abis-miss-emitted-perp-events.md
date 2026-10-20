# The SDK's exported event ABIs can't decode events the perp contracts emit: OrderRejected, VoucherGranted, the MarginBank credit event, operator grants
Severity: normal
Area: SDK

## Steps to reproduce
1. Collect every event ABI exported from `@somnia-chain/markets-sdk` (31 `*Abi` exports, including `perpPoolEventsAbi`, `orderBookEventsAbi`, `marginBankEventsAbi`, `liquidationEngineEventsAbi`, `spotStopRegistryEventsAbi`) and compute their topic0s.
2. `eth_getLogs` the last 3,000 blocks (~5 min) for MarginBank, LiquidationEngine, InsuranceFund, VoucherDistributor, OperatorPermissionsRegistry, the BTC and ETH PerpPools and the BTC PerpStopOrderRegistry. Tally topic0 per contract.

Script: `spike/feedback-repro/p37-event-abi-coverage.ts` (read-only, plain HTTP).

## Expected
PERPS.md › "Watch from chain (event ABIs)": "To see a perp event as it lands, decode the log yourself. The SDK publishes the event ABIs so your decoder uses the same signatures the SDK and the indexer use … Use the published ABI rather than a copy." The Reactivity guide points the same way. Each event these contracts emit in normal operation should decode with a published ABI.

## Actual
Four live topic0s decode with nothing the package exports:
```
exported ABIs: 31; distinct event selectors they cover: 81
window: blocks 28574538..28577538 (~5 min at 100 ms/block)
MarginBank 0x478769E1177C0773c43A593DCCc4Ad15F15F1394: 33786 logs
  0xbb4e4e24c267479b5516cddb733818a304e89c317fcc3bf1af08ff3d470ca577 x54  <-- NOT IN ANY EXPORTED ABI  e.g. tx 0x9771b5f19b3de7949bce9273772ef45778c89c2ee26c4f9a85631b7cb9b2ae35 topics 3 data 32 bytes
VoucherDistributor 0x2ACD9EFdA721450906bfE1bef3edE269636E42C4: 54 logs
  0x3158bdc173381687bb80644acbef84c1d636ce9483e75989afc728dbe0ff8dd8 x54  <-- NOT IN ANY EXPORTED ABI  e.g. tx 0x9771b5f1… topics 3 data 32 bytes
OperatorPermissionsRegistry 0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a: 10 logs
  0x864aeacea3f88f107e4cf7af3c1ed2cd5b36980bf45a469c6b90f888a6368952 x10  <-- NOT IN ANY EXPORTED ABI  e.g. tx 0xe55b5f478b6860e6a6cf357807dd2fd7e60c9742c0863a5dd5823d412a0d0ce4 topics 4 data 32 bytes
ETH PerpPool 0xd6cb1dd58580b84d76068ac21594219ce03aeddf: 9445 logs
  0xa8d29afa5f94c3b7716775d4d634f8b829870b24615782f87b7796a33f7c3057 x4  <-- NOT IN ANY EXPORTED ABI  e.g. tx 0xa9d8d32736eaa4b243afb5904991ebdef502152161796118262c1ec8349377ca topics 3 data 32 bytes
emitted topic0s no exported ABI decodes: 4
keccak("OrderRejected(address,uint8,uint256)") = 0xa8d29afa5f94c3b7716775d4d634f8b829870b24615782f87b7796a33f7c3057
keccak("VoucherGranted(address,address,uint256)") = 0x3158bdc173381687bb80644acbef84c1d636ce9483e75989afc728dbe0ff8dd8
perpStopRegistryEventsAbi exported from the package root: false
```
- **`OrderRejected(address indexed owner, OrderRejectionReason indexed reason, uint256 requestIndex)`** is the PerpPool's batch-rejection log. The developer page tells bots to read it ("its OrderRejected log carries reason 5"), the docs Events page lists it with this topic0, and the SDK indexes it (`listPerpOrderRejections`). It isn't in `perpPoolEventsAbi` or `orderBookEventsAbi`, so a bot watching its own batches live can't decode why an entry was refused.
- **`VoucherGranted(address,address,uint256)`** (VoucherDistributor) and **MarginBank `0xbb4e4e24…`** fire together on every paper-USDso grant. The MarginBank log carries (account, granter = VoucherDistributor, 1,000 USDso). Neither `marginBankEventsAbi` nor any other export has them, though they change an account's collateral.
- **OperatorPermissionsRegistry `0x864aeace…`** is the operator approval change behind Link a Bot and every perp TP/SL grant. The package exports `operatorRegistryWriteAbi` with no events.
- **`perpStopRegistryEventsAbi`** (`PendingOrderCreated`, `PendingOrdersLinked`) exists in `src/tradeAbi.ts`, and `decodePerpStopOrderIds` uses it internally, but it isn't exported. Only `spotStopRegistryEventsAbi` is. The trigger and cancel events (`PendingOrderTriggered`, `PendingOrderCancelled`, `LinkedOrderCancelled` …) appear only in the internal `accountView/stopEvents.ts`, so perp TP/SL activity can't be decoded with published ABIs.

## Evidence
Captured output of `p37-event-abi-coverage.ts` above (the signature lines are computed with viem `toEventSelector`, and `OrderRejected`'s matches the docs Events page entry). Example receipts: `0xa9d8d327…` (an ETH batch in which three requests rested and the request at index 3 was refused, reason topic `3` = PostOnlyWouldCross), `0x9771b5f1…` (voucher grants).

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383) via `https://api.hideki2.infra.testnet.somnia.network`, read-only, 2026-10-20.

Suggested fix: add `OrderRejected` to `perpPoolEventsAbi` (or `orderBookEventsAbi`), the credit/grant events to `marginBankEventsAbi` plus a `voucherDistributorEventsAbi`, export `perpStopRegistryEventsAbi` and an `operatorRegistryEventsAbi`, and extend the topic0 pin test to cover them.
