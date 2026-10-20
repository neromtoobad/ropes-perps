# SDK reports VoucherDistributor reverts as "for an unknown reason"
Severity: major
Area: SDK

## Steps to reproduce
1. Call `markets.trader.claimPerpVoucher({ marginBank })` from any address while the VoucherDistributor `claim()` reverts (see 001).

## Expected
The SDK decodes reverts by name everywhere else: `contractErrorsAbi` covers pool and MarginBank errors, and the docs list them on the Errors page. A failed voucher claim should throw a `ContractRevertError` with `errorName` set, so the caller can say why it failed (already claimed, campaign closed, and so on).

## Actual
```
ContractRevertError: @somnia-chain/markets-sdk: claim reverted: for an unknown reason.
  errorName: undefined,
  args: undefined,
  reason: 'for an unknown reason.',
  data: '0x3e31dcc2',
  address: '0x2ACD9EFdA721450906bfE1bef3edE269636E42C4',
  functionName: 'claim',
```
Selector `0x3e31dcc2` is in no ABI shipped in `node_modules/@somnia-chain/markets-sdk` (grep finds nothing), and it isn't in the 4byte or Sourcify signature databases either. The distributor implementation `0x9657f0fd53efc01cd108d93c835bb4b517732b43` is not verified on the explorer. A bot has no way to tell which of the `PerpVoucherIneligibleReason` cases, or which other case, applies.

## Evidence
The error output above. `grep -rl 3e31dcc2 node_modules/@somnia-chain/` returns nothing.

## Environment
@somnia-chain/markets-sdk 0.32.1, Hideki testnet (chain 50383), caller `0xea2CbF1444b0FFcC8DF2ce4275e3F6A7232Bb889`, 2026-10-20.
