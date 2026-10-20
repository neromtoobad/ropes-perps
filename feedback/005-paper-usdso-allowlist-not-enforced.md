# Paper USDso can open positions in the six markets the docs say it can't
Severity: major
Area: contracts

## Steps to reproduce
1. Read the market table on app.testnet.dreamdex.io/docs/trading/perps-testnet. Its "Paper USDso" column says **No** for 1000PEPE, LIT, PUMP, VVV, ZEC and ZRO. Margin & Liquidations › Paper USDso adds: "You can open or increase positions only in the markets marked Yes … The six newest markets are not on that list." The developer page also says an increase outside the allowlist "reverts, and getMaxPerpOrderSize reports it as limitedBy: \"voucherBlocked\"".
2. For every pool, call `MarginBank.isVoucherMarketAllowed(pool)` on `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`.
3. Take a flat account that holds a 1,000 USDso voucher (credit floor 1,000, credited by the VoucherDistributor). Call `getMaxPerpOrderSize`, then simulate a minimum-size resting bid with `eth_call` `placeOrder` on ZRO, ZEC and LIT.

Scripts: `spike/feedback-repro/p7-voucher-allowlist.ts` (step 2) and `spike/feedback-repro/p7b-voucher-order-sim.ts` (step 3). Both are read-only.

## Expected
`isVoucherMarketAllowed` returns false for the six "No" markets. For a voucher account, `getMaxPerpOrderSize` returns `limitedBy: "voucherBlocked"` and `placeOrder` reverts `VoucherMarketNotAllowed`.

## Actual
The MarginBank allowlists all 21 markets. A voucher-only account can open positions in every "No" market: `getMaxPerpOrderSize` says `placeable=true`, and the pool accepts the order. Either the voucher's market restriction isn't in force on chain, or both docs pages describe a rule that doesn't exist. Traders following the docs avoid six markets for no reason. If the restriction was meant to apply, paper credit is reaching the newest, thinnest markets that it was meant to stay out of.

## Evidence
`p7-voucher-allowlist.ts` at block 28538051:
```
ZRO       0x2a1822b02039ddf0e293f3f7243673fc03eaf16c docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
LIT       0xdcb0ad226727b2ce92857f0af5751389d42b2a3f docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
VVV       0x352636ab146039851ef06d6367a106d5fb4e6409 docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
1000PEPE  0xfa9b9e50cc1745113d57893991af200a74c86b6f docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
PUMP      0x76c981a52530cdf9497559140aafcd8cd16836e7 docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
ZEC       0x2a73129f26917124bd2a47a9b355c395c537f050 docs=No MarginBank.isVoucherMarketAllowed=true   <-- differs
TAO       0xd9b6a347a3ae9fd6ba21179d3343f2c8a922f697 docs=Yes MarginBank.isVoucherMarketAllowed=true
… (the other 14 "Yes" markets: true)
```
`p7b-voucher-order-sim.ts`:
```
voucher account 0xcd34a7e6e830ec532d6349431e6801d2b4da7db7 creditFloor=1000 USDso, flat, credited in tx 0x66eb0be73f4a0ae6c1bb940b72dc35d7cdcb62428548484c4419accc2e038f6b
ZRO  getMaxPerpOrderSize: placeable=true limitedBy=collateral | eth_call placeOrder bid 5.1 @ 1.8728 at block 28530825: succeeds (returns 0x…0001…)
ZEC  getMaxPerpOrderSize: placeable=true limitedBy=collateral | eth_call placeOrder bid 0.009 @ 1170.771 at block 28530825: succeeds (returns 0x…0001…)
LIT  getMaxPerpOrderSize: placeable=true limitedBy=collateral | eth_call placeOrder bid 2.8 @ 3.1724 at block 28530825: succeeds (returns 0x…0001…)
BTC  getMaxPerpOrderSize: placeable=true limitedBy=collateral | eth_call placeOrder bid 0.00013 @ 79839.8 at block 28530825: succeeds (returns 0x…0001…)
```
The return value `0x…01` is `success = true`. The leading word of `(bool success, uint128 orderId)` is 1.

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383, "Somnia Tokyo"), MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, voucher account `0xcd34a7e6e830ec532d6349431e6801d2b4da7db7` (read-only eth_call, no transaction sent), 2026-10-20.
