# Paper USDso voucher claim() reverts for every address while getPerpVoucherEligibility says eligible
Severity: critical
Area: contracts

## Steps to reproduce
1. Take any fresh address with no perp positions or orders (we used a new EOA `0xea2CbF1444b0FFcC8DF2ce4275e3F6A7232Bb889`, funded with 0.15 STT, and `0x099e5fa390eCD369dd5dBD462589300c41C07afA`).
2. `await markets.client.getPerpVoucherEligibility(btc.marginBank, address)`.
3. `await markets.trader.claimPerpVoucher({ marginBank: btc.marginBank })`, or the raw call `claim()` (`0x4e71d92d`) on the VoucherDistributor `0x2ACD9EFdA721450906bfE1bef3edE269636E42C4`.

## Expected
The docs ("Perps on Testnet for Developers", Get test funds) say any address with no perp positions or orders can claim the 1,000 USDso credit once. When eligibility says `eligible: true`, the claim should go through.

## Actual
Eligibility answers `{ eligible: true, grantAmount: 1000000000000000000000 }`, but `claim()` reverts with the custom error `0x3e31dcc2` for every caller we tried: two fresh EOAs, `0x…dEaD`, and a dreamDEX app smart wallet. The revert happens in the implementation `0x9657f0fd53efc01cd108d93c835bb4b517732b43` after 871 gas, before any storage-heavy work. So the claim is blocked by an early guard that `getPerpVoucherEligibility` doesn't model.

The campaign itself is open: `getPerpVoucherCampaign` reports `startsAt 1790553600`, `endsAt 1798477478`, `claimsRemaining 431806`, `leverageCapX 20`.

As a result, a developer following the docs can't get test collateral for a fresh bot key at all.

The distributor itself is not dead. On the same day it emitted 54 `VoucherGranted` events in 5 minutes through a batch entry point (selector `0x0677d0a3`), presumably the app's relayer. So vouchers are being handed out, but only through that path. The self-serve `claim()` that the docs and the SDK (`claimPerpVoucher`) describe reverts for everyone.

## Evidence
Same block, same addresses (script: `spike/evidence-claim.ts` in this repo):
```
block 28514670 0xea2C…b889 eligibility={"eligible":true,"grantAmount":"1000000000000000000000"} claim()=revert 0x3e31dcc2
block 28514670 0x099e…7afA eligibility={"eligible":true,"grantAmount":"1000000000000000000000"} claim()=revert 0x3e31dcc2
```
`debug_traceCall` (callTracer):
```
CALL 0x099e… -> 0x2acd9efd… input 0x4e71d92d output 0x3e31dcc2 EXECUTION_REVERTED
  DELEGATECALL -> 0x9657f0fd… gasUsed 0x367 output 0x3e31dcc2
```

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383, the "Somnia Tokyo" / dreamDEX region), wallets above, 2026-10-20.
