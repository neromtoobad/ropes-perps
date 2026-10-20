# listLiquidations KeeperReward rows carry no amount: the reward the event pays is lost from indexed history
Severity: normal
Area: indexer

## Steps to reproduce
1. `client.listLiquidations({ kind: "KeeperReward", limit: 8 })`.
2. For each row, fetch its transaction receipt, take the log at the row's log index (`id = txHash_logIndex`), and decode it with the SDK's `liquidationEngineEventsAbi`.
3. Look for the reward anywhere else in the index: `client.getMarginEvents(keeper)`.

Script: `spike/feedback-repro/p41-keeper-reward-amount.ts` (read-only).

## Expected
`LiquidationEvent.kind`'s doc says "KeeperReward: paid to the keeper that ran it (counterparty = keeper)". The row is the indexed mirror of `LiquidationKeeperRewardPaid(account, keeper, amount)`, so it should say how much was paid. Every other money-moving kind has a field for its amount (`insuranceCovered`, `badDebt`, `deficit`, `collateralAmount` …).

## Actual
The row keeps the keeper and drops the amount. Every numeric field is null:
```
row fields: id,account,pool,kind,size,price,counterparty,penalty,badDebt,insuranceCovered,deficit,coverageDeclined,collateralAmount,equity,positionsProcessed,stageReached,marginStatusBefore,marginStatusAfter,timestamp,blockNumber,txHash,chainId
0x0c5bbf4cf6c3eef2ee10b9b192279e988c08e2f1561c90ff4712fcae62d765f5_116 counterparty(keeper) 0x03ca1f61c5a475951f69f51bd16523075fdfb1cc | row: size=null price=null penalty=null badDebt=null insuranceCovered=null deficit=null coverageDeclined=null collateralAmount=null equity=null | chain LiquidationKeeperRewardPaid amount 0.07 USDso
0x3d6e0f856bb6c27d646f6fc7bbf55cfb1595cf4b08475b5de379c31b6148c676_21 counterparty(keeper) 0x03ca1f61c5a475951f69f51bd16523075fdfb1cc | row: size=null price=null … equity=null | chain LiquidationKeeperRewardPaid amount 0.07 USDso
… (8 rows, all the same)
rewards paid in these 8 rows: 0.56 USDso; recoverable from the indexed rows: none
```
The keeper `0x03ca…b1cc` has no margin events either (`getMarginEvents` → `[]`), so the reward reaches no indexed table. KeeperReward is the second most common liquidation kind (304 of the last 1,000 rows; see 022). It's how a liquidated trader sees what the liquidation cost them beyond the price, and how a keeper operator measures income. Both have to go back to `eth_getLogs`, which the indexed history is meant to replace. The `penalty` column is documented as "reserved — not carried by current events", so the only place a liquidation's fee could live is empty too.

## Evidence
Captured output of `p41-keeper-reward-amount.ts` above. Each amount is decoded from the actual `LiquidationKeeperRewardPaid` log with the SDK's own ABI.

## Environment
Hideki indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, LiquidationEngine `0xA66d3C24Ad4a389d863846905D8173e1017e9F4D`, @somnia-chain/markets-sdk 0.32.1, read-only, 2026-10-20.

Suggested fix: store `amount` on KeeperReward rows (reusing `penalty`, or a new `reward` column), and document it in the `kind` table.
