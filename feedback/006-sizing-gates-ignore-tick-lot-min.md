# getMaxPerpOrderSize and previewPerpOrderMargin approve orders the pool rejects for tick, lot or minimum size
Severity: major
Area: SDK

## Steps to reproduce
1. Take a BTC-PERP account with free collateral. We used `0x89Ab64Da1806727042D48B0436ef0276c8075647`, which has about 37 USDso. The BTC pool `0x4181…94c0` has `tickSize` 1e17, `lotSize` 1000 and `minQuantity` 13000.
2. Call `client.getMaxPerpOrderSize({ pool, marginBank, account, isBid: false, price })` with a price that isn't a multiple of `tickSize`.
3. Call `client.previewPerpOrderMargin({ …, quantity })` with an on-tick price and a quantity of 13001 (not a lot multiple), then 1000 (below `minQuantity`).
4. Simulate each order with `eth_call` `placeOrder` from the same account at the same block.

Script: `spike/feedback-repro/p15-offgrid-sizing.ts` (read-only).

## Expected
The SDK docs present these as the submit gate:
- `previewPerpOrderMargin`: "What a perp order will lock and whether the pool will accept it". `sufficient` means "Every gate. The order should be accepted."
- `getMaxPerpOrderSize`: "The largest quantity that passes every placement gate". The developer page says to check it "before sending rather than reading a revert afterwards".

An off-tick price or an off-grid or below-minimum quantity should give `placeable: false` / `sufficient: false` (or an `InvalidInputError`), because the pool always reverts these orders.

## Actual
Both reads say yes, and the pool reverts each order:
```
[OFF-TICK price, qty 13000]
  getMaxPerpOrderSize    -> placeable=true maxQuantity=752000 limitedBy=initialMargin
  previewPerpOrderMargin -> sufficient=true lockAmount=532623650080246913
  eth_call pool.placeOrder (from 0x89Ab64…, block 28527806) -> reverts InvalidPrice(81942100012345678901234, 100000000000000000) 0xaf608abb

[on-grid  price, qty 13001 (off lot)]
  getMaxPerpOrderSize    -> placeable=true maxQuantity=752000 limitedBy=initialMargin
  previewPerpOrderMargin -> sufficient=true lockAmount=532664621050000000
  eth_call pool.placeOrder (from 0x89Ab64…, block 28527806) -> reverts InvalidQuantity(13001, 1000) 0x4f174b29

[on-grid  price, qty 1000 (< minQuantity)]
  getMaxPerpOrderSize    -> placeable=true maxQuantity=753000 limitedBy=initialMargin
  previewPerpOrderMargin -> sufficient=true lockAmount=40971050000000000
  eth_call pool.placeOrder (from 0x89Ab64…, block 28527806) -> reverts QuantityBelowMinimum(1000, 13000) 0xeaa68ceb
```
Control: an on-grid price with quantity 13000 gives `placeable=true`, `sufficient=true`, and `placeOrder` succeeds.

`getMaxPerpOrderSize` already reads `lotSize` and `minQuantity` (they are in its result) and aligns `maxQuantity` down to the lot. It still never checks the price it was given against `tickSize`. `previewPerpOrderMargin` checks neither the price nor the quantity grid. A UI or bot that gates on these fields sends transactions that revert and pay gas. With per-market decimals from 6 to 24, these mistakes are easy to make.

## Evidence
Captured output of `p15-offgrid-sizing.ts` above. Header line: `block 28527806 account 0x89Ab64Da1806727042D48B0436ef0276c8075647 pool 0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0 tickSize 100000000000000000 lotSize 1000 minQuantity 13000`. Reverts are decoded with the SDK's own `contractErrorsAbi`.

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383), account `0x89Ab64Da1806727042D48B0436ef0276c8075647` (third-party; read-only eth_call only), 2026-10-20.

Suggested fix: add `priceOnTick` / `quantityOnGrid` / `meetsMinQuantity` gates to `previewPerpOrderMargin` and fold them into `sufficient`. In `getMaxPerpOrderSize`, either reject an off-tick price with `InvalidInputError` or return `placeable: false` with a new `limitedBy: "tickSize"`.
