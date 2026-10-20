# Hideki indexer's OperatorApproval table is empty, so no linked bot or TP/SL grant can be listed
Severity: normal
Area: indexer

## Steps to reproduce
1. On the Hideki indexer, query `{ OperatorApproval(limit: 1000) { id user operator pool selector allowed } }`. Also filter it by `user` = a wallet that has linked a bot, and by `operator` = that bot.
2. Check the same grants on chain: `OperatorPermissionsRegistry.isApprovedForPool(pool, owner, bot, placeOrderFor)` for a Link-a-Bot pair, and `isGloballyApproved(owner, stopRegistry, placeOrderFor)` for owners with pending perp TP/SL.
3. Control: run the same query on the Shannon indexer.

Script: `spike/feedback-repro/p40-operator-approval-index.ts` (read-only).

## Expected
The indexer schema exposes an `OperatorApproval` entity (user, operator, pool, selector, allowed, isDenial), and the Shannon indexer fills it. On Hideki it should hold the perps grants too, because there's no other practical way to answer questions Link a Bot raises:
- "Which bots can trade this wallet?" Link a Bot says the app's Bots tab "lists every bot that can trade this wallet".
- "Which wallet is this bot key linked to?" A bot running with OWNER_ADDRESS unset has to find out.

The registry has no enumeration view. `isApprovedForPool`/`isGloballyApproved` only answer yes/no for a known (owner, operator) pair.

## Actual
The Hideki table has zero rows, while grants exist and keep being written on chain:
```
indexer OperatorApproval rows (limit 1000): 0
chain: isApprovedForPool(pool, 0x48F3bF1d065B7be54c4CC4181809920eC85dd47D, 0xEB91561015115C0184f214907617343C3fCEA756, placeOrderFor) true on 21 of 21 perp pools
indexer OperatorApproval where user = 0x48F3bF1d065B7be54c4CC4181809920eC85dd47D: 0 rows
indexer OperatorApproval where operator = 0xEB91561015115C0184f214907617343C3fCEA756: 0 rows
chain: isGloballyApproved(owner, stopRegistry, placeOrderFor) true for 20 of 20 owners with a pending perp stop
indexer OperatorApproval where user = 0xefc48ce5a801a4a0f6bd749ea38dce28eaca0cd6: 0 rows
chain: OperatorPermissionsRegistry emitted 10 logs in the last 3000 blocks (~5 min), topic0 0x864aeacea3f88f107e4cf7af3c1ed2cd5b36980bf45a469c6b90f888a6368952
control: Shannon indexer (dev.smk.somnia.host) OperatorApproval rows (limit 1000): 1000 e.g. 0x7554ee28c15e61d9b3cebcc9f5cace7742830b05_0x0aa7c584074d2ea5b623772f97928bad23915ba8_global_0x80054449
```
The Hideki indexer doesn't seem to subscribe to the OperatorPermissionsRegistry `0x6B2F…8D3a` at all. That fits the SDK's `SOMNIA_HIDEKI_TESTNET_ADDRESSES` also lacking the address (see 017). As a result, a builder can't list a wallet's linked bots, can't find which wallet a bot key serves, and can't audit which stop registries hold global `placeOrderFor` on an account, without scanning `eth_getLogs` from genesis. Neither the docs nor the SDK says so: the entity is in the schema, and querying it just returns `[]`, which reads as "no grants".

## Evidence
Captured output of `p40-operator-approval-index.ts` above. The Link-a-Bot pair is the one used for the `placeOrderFor` transactions in feedback 016.

## Environment
Hideki indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, Shannon indexer `https://dev.smk.somnia.host/v1/graphql` (control), OperatorPermissionsRegistry `0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a` on Hideki (chain 50383), read-only, 2026-10-20.

Suggested fix: index the Hideki OperatorPermissionsRegistry the way Shannon's is indexed, and add an SDK read (for example `listOperatorApprovals({ user?, operator? })`) so Link a Bot has a documented discovery path.
