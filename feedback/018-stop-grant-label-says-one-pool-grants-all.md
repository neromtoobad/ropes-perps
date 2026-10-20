# buildPlacePerpStopOrder labels a global operator grant as "to place orders on pool X"
Severity: normal
Area: SDK

## Steps to reproduce
1. Build a perp TP/SL without sending it: `trader.buildPlacePerpStopOrder({ registry: btc.stopRegistry, pool: btc.poolAddress, isBid: false, quantity: 13000n, triggerPrice: 70000e18, triggerOperator: 1, stopOrderType: 1, operatorRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a" })`. `operatorRegistry` is passed explicitly because of 017.
2. Compare the returned `operatorApproval.description` with what `operatorApproval.data` decodes to.

Script: `spike/feedback-repro/p31-perp-stop-operator-registry.ts`, last three lines of output. It only builds the call and sends nothing.

## Expected
`UnsignedCall.description` is documented as "What this call does, for a UI to label a confirmation with". For a permission grant, the label should state the grant's real scope. Operators & Session Keys says `setOperatorApprovalGlobal` "covers every pool registered … including pools registered in the future".

## Actual
The label names one pool. The calldata grants the stop registry `placeOrderFor` on every registered pool, now and in the future:
```
operatorApproval.description = "Approve perp stop registry 0x52e2ccebaec9332672c247e9a90aa3d61fb615ef to place orders on pool 0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0"
operatorApproval decodes to  = setOperatorApprovalGlobal(["0x52E2ccebAeC9332672C247e9A90AA3d61FB615ef",["0x80054449"],true])
stopOrder.value = 0.15 STT, description = "Place a reduce-only stop on perp registry 0x52e2ccebaec9332672c247e9a90aa3d61fb615ef"
```
The registry is per market (21 registries for 21 markets), so a trader who sets TP/SL on BTC is told they're approving the BTC registry for the BTC pool. In fact they approve it on every pool. A wallet or Safe UI that shows `description`, which is what it's for, understates a permission grant. The grant also persists after the stop is gone and has to be revoked separately.

## Evidence
Captured output above. The label and call are built in `node_modules/@somnia-chain/markets-sdk/src/perp/stops.ts`: `buildPlacePerpStopOrder` ("to place orders on pool ${p.pool}") wraps `operatorGrantCall`, which encodes `setOperatorApprovalGlobal`.

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383), build-only (no transaction), 2026-10-20.

Suggested fix: either label it truthfully ("Approve perp stop registry … to place orders on your behalf on every registered pool") or grant per pool with `setOperatorApprovalForPool(pool, registry, [placeOrderFor], true)`. Each registry belongs to one market (it's that market row's `stopRegistry`), so the narrower grant looks sufficient.
