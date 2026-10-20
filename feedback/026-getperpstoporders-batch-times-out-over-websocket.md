# getPerpStopOrders reports most stops "failed" once a batch passes ~200 refs; the same reads over HTTP all succeed
Severity: normal
Area: SDK

## Steps to reproduce
1. List every pending perp TP/SL from the indexer: `client.listPerpStopOrders({ status: ["PENDING"], limit: 200, offset })`, paged. That gave 764 on Hideki.
2. Enrich them as PERPS.md says ("Fetch ids there, then enrich here"): `client.getPerpStopOrders(refs)` with the first 50, 100, 200 and 400 refs, then all 764.
3. Send the same 764 `getPendingOrder` calls as one viem `multicall` over plain HTTP to the same RPC.

Script: `spike/feedback-repro/p33-getperpstoporders-batch-size.ts` (read-only).

## Expected
`getPerpStopOrders` is documented as "Read known perp stops in one ordered batch … a batched Multicall3 read … Both paths pin one head". A market-wide or account-wide set of a few hundred stops is what a TP/SL monitor or keeper reads. It should come back `present`/`absent` per stop. `failed` should mean a real per-member problem.

## Actual
Up to 100 refs works. Past that, most members come back `failed` with a timeout, and the SDK's shared WebSocket then stays clogged long enough that the next plain read (`getBlockNumber`) times out too. The identical calls over HTTP succeed in under 4 s:
```
pending perp stops listed by the indexer: 764
getPerpStopOrders(50 refs) -> {"present":50} in 3664 ms
getPerpStopOrders(100 refs) -> {"present":100} in 2772 ms
getPerpStopOrders(200 refs) -> {"present":172,"failed":28} in 4929 ms  first failure: RpcError: @somnia-chain/markets-sdk: rpc getPerpStopOrder failed: The request took too long to respond.
getPerpStopOrders(400 refs) -> {"present":139,"absent":1,"failed":260} in 5624 ms  first failure: RpcError: … The request took too long to respond.
getPerpStopOrders(764 refs) -> {"present":167,"absent":1,"failed":596} in 7498 ms  first failure: RpcError: … The request took too long to respond.
viem http multicall, same 764 getPendingOrder calls -> {"live":763,"notLive":1} in 3785 ms
RpcError: @somnia-chain/markets-sdk: rpc getBlockNumber failed: The request took too long to respond.
```
An earlier run gave the same pattern (`200 refs -> present 84, failed 116`; `764 refs -> present 168, failed 596`; `400 refs` threw at `getBlockNumber`). The SDK's partial-failure design keeps callers from mistaking these for cancelled stops, which is good. But a monitor that enriches a whole market's pending book gets 60–80% "unknown" every cycle and has to invent its own chunking and back-off. Neither the method's docs nor PERPS.md mentions a practical batch limit.

## Evidence
Captured output of `p33-getperpstoporders-batch-size.ts` above (Hideki, 2026-10-20 ~15:30 UTC). The HTTP comparison uses the SDK's own `getPendingOrder` ABI against the same `refs`.

## Environment
@somnia-chain/markets-sdk 0.32.1 (chain reads over `wss://api.hideki2.infra.testnet.somnia.network/ws`, `hidekiTestnet.contracts.multicall3` set), viem 2.57.7, HTTP RPC `https://api.hideki2.infra.testnet.somnia.network`, read-only, 2026-10-20.

Suggested fix: chunk the multicall (for example 50–100 calls per request, sent one after another) inside `getPerpStopOrders`, or document a maximum batch size. Consider a dedicated HTTP transport for large read batches so they don't starve the shared socket.
