# hidekiTestnet says blocks land every 10 ms and that there's no explorer; blocks land every 100 ms and the docs link an explorer
Severity: normal
Area: SDK

## Steps to reproduce
1. Inspect `hidekiTestnet` from `@somnia-chain/markets-sdk/chains`. Its doc comment: "blocks land every **10 ms** (~100 blocks/s) instead of Shannon's 100 ms … a `blockTime` of 10 is what viem uses to size its own polling/waiting heuristics" and "No public block explorer is known for Hideki, so that field stays unset." `docs/reference/networks-and-endpoints.md` repeats both (Block time `10 ms`; "Elwood, Hideki, and local carry no explorer").
2. Measure the block cadence on chain from `eth_getBlockByNumber` timestamps.
3. Open the explorer that the dreamDEX perps developer page lists for this chain: `explorer.testnet.somnia.network/tokyo`.

Script: `spike/feedback-repro/p26-hideki-chain-def.ts`.

## Expected
`blockTime` matches the chain (viem reads it in ms). `blockExplorers` is set, so viem- and wagmi-based apps and wallets can build transaction links.

## Actual
```
hidekiTestnet.blockTime = 10 | blockExplorers = undefined
blocks 28536774..28537774: 1000 blocks in 100 s => 100.0 ms/block
blocks 28437774..28537774: 100000 blocks in 10007 s => 100.1 ms/block
GET https://explorer.testnet.somnia.network/tokyo/address/<MarginBank> -> 200 "Address 0x478769…1394 · Somnia Explorer"
```
Hideki produces about 10 blocks/s, the same as Shannon, not 100. A raw `newHeads` subscription confirms it: 170 heads in about 20 s. The explorer works for Hideki: transaction `0xcb698e8a…fe28` (BTC-PERP, block 16563340) renders there. Anyone who converts time to blocks from the SDK's constant (lookback windows, "blocks until funding", confirmation waits) is off by 10x. Apps built on the exported chain object get no explorer links.

## Evidence
Captured output of `p26-hideki-chain-def.ts` above. The source comment is in `node_modules/@somnia-chain/markets-sdk/src/chains/definitions/hidekiTestnet.ts`.

## Environment
@somnia-chain/markets-sdk 0.32.1, viem 2.57.7, Hideki testnet (chain 50383) via `https://api.hideki2.infra.testnet.somnia.network`, 2026-10-20.

Suggested fix: `blockTime: 100`, and `blockExplorers: { default: { name: "Somnia Explorer", url: "https://explorer.testnet.somnia.network/tokyo" } }`. Update networks-and-endpoints.md to match.
