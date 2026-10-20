# MarginBank.getBankruptcyPrice returns the entry price for every position in profit, whatever its collateral
Severity: major
Area: contracts

## Steps to reproduce
1. For BTC, ETH, SOL and XRP, take holders on both sides with `client.getPerpSideHolders({ marginBank, pool, isLong }, { pageSize: 250 })`.
2. For each holder, read `client.getBankruptcyPrice(ref, { blockNumber: asOfBlock })`, which is MarginBank `getBankruptcyPrice(account, pool)`. Also read `client.getPerpPosition(ref)` (entry), `getPerpState(pool)` (mark) and `getMarginAccount` (collateral).

Script: `spike/feedback-repro/p36-bankruptcy-equals-entry.ts` (read-only). `p35-liq-vs-bankruptcy.ts` puts the same positions next to `getLiquidationPrice`.

## Expected
The SDK defines the figure as "the contract's figure for the mark at which this position's allocated equity reaches zero (where there is nothing left)". It says to use it "for anything that settles or bids on a bankrupt position — a liquidation keeper deciding what a position is worth pays against THIS figure". For a long it should sit below the entry by the collateral backing the position. For a short it should sit above the entry by the same amount. It should also lie beyond the liquidation price.

## Actual
For every position in profit, the bankruptcy price is exactly the average entry price, to the wei. The collateral doesn't matter, and neither does how many markets the account holds. For positions in loss it's computed normally:
```
BTC  short 0x89Ab64Da1806727042D48B0436ef0276c8075647 entry 85587200000000000000000 mark 82507863938269088500000 -> IN PROFIT bankruptcy 85587200000000000000000  == entry  collateral 36925290700499086713 pools 4
ETH  long  0xfbE713c07c83701E47DB37E459F483a9cF0BFb03 entry 2382019359907376778034 mark 2439902181466856500000 -> IN PROFIT bankruptcy 2382019359907376778034  == entry  collateral 1188699435580456756784 pools 1
ETH  short 0xa92fdd8d60d92464A5378741D4Cf50b2F5844eAd entry 2711550000000000000000 mark 2437393264403400500000 -> IN PROFIT bankruptcy 2711550000000000000000  == entry  collateral 10453317277527495000 pools 1
SOL  long  0x0DA52C5b985912D18E00FFfA88b7199C9c4085b1 entry 104370000000000000000 mark 105618781680231500000 -> IN PROFIT bankruptcy 104370000000000000000  == entry  collateral 1977832501284596961771 pools 5
XRP  short 0xc7A7eeEC0d8A140f88Dc8A7E2b83CCb7AD6e1203 entry 1498100000000000000 mark 1317673915946500000 -> IN PROFIT bankruptcy 1498100000000000000  == entry  collateral 68626515030736313512 pools 9
BTC  long  0x27871F6eCBCc6eb3B5aE6C4cE6541dbA120aFFb9 entry 83730399820466786355475 mark 82498004875732879500000 -> in loss   bankruptcy 51044829531079133182076  collateral 1092351759071335369055 pools 1
…
{"inProfit":34,"inProfitBkEqEntry":34,"inLoss":30,"inLossBkEqEntry":0}
```
Take the single-market accounts. ETH long `0xfbE7…b03` holds 1,188 USDso against 8.46 ETH, so its equity runs out near 2,241 (entry − collateral/size). The contract says 2,382.02, its entry, which is *above* its liquidation price of 2,299.15 (`p35`). ETH short `0xa92f…eAd` has 10.45 USDso behind 0.07 ETH and goes bankrupt near 2,860. The contract says 2,711.55, its entry. For the in-loss single-market long `0x2787…Fb9`, the figure is exactly entry − collateral/size (83,730.40 − 1,092.35/0.03342 = 51,044.83). So the formula works on one branch and collapses to the entry on the other.

This gives the "nothing left" price inside the "liquidation starts" price for every profitable position. In `p35`, every in-profit BTC and ETH short has a bankruptcy price (its entry, ~85.6k BTC / ~2.71k ETH) far closer to the mark than its liquidation price (118k–256k BTC, 2.8k–2.86M ETH). A keeper or backstop bidder pricing a takeover, ADL or a cross-margin account against this read, as the SDK advises, values every profitable leg as if its collateral were zero.

## Evidence
Captured output of `p36-bankruptcy-equals-entry.ts` above (holder snapshots around block 28575000). All 34 of 34 in-profit positions return `bankruptcy == avgEntryPrice`, and 0 of 30 in-loss positions do. `p35-liq-vs-bankruptcy.ts`, same accounts: `ETH long 0xfbE713… liq 2299.1535 … bankruptcy 2382.0194`.

## Environment
Hideki testnet (chain 50383), MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, @somnia-chain/markets-sdk 0.32.1 (`client.getBankruptcyPrice` is a verbatim `readContract` of the bank's view), third-party accounts, read-only, 2026-10-20.

If this is intentional (for example, only loss-making positions get "allocated" collateral for ADL), then the SDK and docs description ("where there is nothing left", "what a keeper pays against") is wrong and needs the rule spelled out. Otherwise the in-profit branch of `getBankruptcyPrice` drops the collateral term.
