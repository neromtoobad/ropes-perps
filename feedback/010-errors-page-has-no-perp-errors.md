# The Errors page has no PerpPool or MarginBank errors, though the perps developer page sends you there
Severity: normal
Area: docs

## Steps to reproduce
1. On app.testnet.dreamdex.io/docs/developers/perps-testnet, the IOC section ends with "The full list of order errors is on the Errors page" and links to /docs/developers/contracts/errors#order-rejection. The same page names perp-only reverts: `InsufficientCollateral()` (0x3a23d825), `MaxPositionSizeExceeded()` (0x714b36d6) and `IsolatedMarketBlocked`.
2. Search that Errors page for these, and for anything perps or MarginBank.

Script: `spike/feedback-repro/p10-error-selectors.ts`. It fetches the page, strips the sidebar, and checks it against the SDK's `contractErrorsAbi`.

## Expected
A perps section (PerpPool, MarginBank, LiquidationEngine, VoucherDistributor) with selectors, like the SpotPool and SpotStopOrderRegistry tables. Bots placing raw `placeOrderFor` need it to decode reverts.

## Actual
The page covers SpotPool and SpotStopOrderRegistry only. The article body never mentions perps or the MarginBank. Of the three perp errors the developer page names, only the shared `ImmediateOrCancelNoFill` is listed. The SDK ships 546 contract errors. 484 of them, including every margin, voucher and liquidation error, appear nowhere on the page.
```
InsufficientCollateral()     docs=0x3a23d825 keccak=0x3a23d825 sdkAbi=["InsufficientCollateral()"] onErrorsPage=false
ImmediateOrCancelNoFill()    docs=0xd48c4403 keccak=0xd48c4403 sdkAbi=["ImmediateOrCancelNoFill()"] onErrorsPage=true
MaxPositionSizeExceeded()    docs=0x714b36d6 keccak=0x714b36d6 sdkAbi=["MaxPositionSizeExceeded()"] onErrorsPage=false
IsolatedMarketBlocked()      docs=- keccak=0xaa4fc774 sdkAbi=["IsolatedMarketBlocked()"] onErrorsPage=false
SDK contractErrorsAbi: 546 errors; 484 of them not on the Errors page, e.g. BatchLiquidationDisabled, BidderCannotBeIsolated, CircuitBandExceedsInitialMargin, CloseOutMarginExceedsBalance, CollateralMismatch, CollateralNotWNative, CollateralTokenMismatch, CreditRecipientInDebt, FundingCapExceedsMarginBand, FundingRecipientInDebt, InsufficientCollateral, InsufficientCredit, InsufficientMargin, InsufficientMarginAfterWithdrawal, InsufficientMarginAtCreation, InsufficientMarginForOrder, InsuranceFundCandidateHasPositions, InvalidCreditCapBps, InvalidCreditGranterContract, InvalidFundingCapDivergenceMargin, InvalidFundingParameters, InvalidFundingPayer, InvalidLeverage, InvalidLiquidationEngineContract, InvalidLiquidationFeeRecipient
Errors page body (sidebar excluded) mentions perp/MarginBank: false
```
The selectors the developer page quotes are correct (they match keccak). They are just the only perp selectors documented anywhere.

## Evidence
Captured output of `p10-error-selectors.ts` above.

## Environment
Docs as served 2026-10-20, @somnia-chain/markets-sdk 0.32.1 (`contractErrorsAbi`).
