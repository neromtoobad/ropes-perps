# Perp orders cost 0.017–0.023 STT each, not the 0.0003–0.003 STT the developer page quotes
Severity: normal
Area: docs

## Steps to reproduce
1. Read "Perps on Testnet for Developers" › Get test funds: "Gas is billed on what a transaction uses, not on its gas limit: transactions to perp pools measured on testnet cost between 0.0003 and 0.003 STT each."
2. Place ordinary perp orders through `placeOrderFor` on Hideki: a 10× AVAX long, its market close, and a 5× LINK short and its close. These are ~$250-notional IOC orders from a linked bot key.
3. Read the receipts: `npx tsx spike/feedback-repro/p27-perp-gas-cost.ts <tx…>`.

## Expected
Each order costs 0.0003–0.003 STT, as the docs say. Bot builders size their gas top-ups from this ("Send it … for gas", Link a bot).

## Actual
Every order used 2.8–3.8M gas at 6 gwei, so **0.017–0.023 STT each**, 6–75× the quoted range. A bot funded for "hundreds of orders" from the docs' numbers runs dry after a handful. The upfront balance check (see 003) makes it worse.

## Evidence
```
0x5fc08695b6d05bc54d4b334a7fb016d24dae1bf213859bbe86398b9448dc3f8c block 28537173 gasUsed 3428736 @ 6 gwei = 0.020572416 STT  (AVAX long, IOC)
0x9fdbab3cb577a61fc97c232b3836904bc754571296b3fd755105e2afeaf57446 block 28540875 gasUsed 3053940 @ 6 gwei = 0.01832364 STT   (AVAX long, IOC)
0x2a09d993be65ca13dde8d30c203c1e7e2f25f7841b116c8563fa97b9bf30af3b block 28541511 gasUsed 2839118 @ 6 gwei = 0.017034708 STT  (AVAX close, IOC)
0x04241886cfd71340cfa9f3bb4eb5eebf3dd6aabaf2c9dc13004c81286684f443 block 28541970 gasUsed 3838503 @ 6 gwei = 0.023031018 STT  (LINK short, IOC)
0x9526b6e3a636231d45f5b0dcbcc4b3a594ae6ec7af245b1c15c1c54a5589fbf0 block 28542269 gasUsed 2865989 @ 6 gwei = 0.017195934 STT  (LINK close, IOC)
```
The explorer agrees, for example the second tx: "Transaction fee 0.018323 STT · Gas used 3,053,940".

## Environment
Hideki testnet (chain 50383, "Somnia Tokyo"), bot key `0xEB91561015115C0184f214907617343C3fCEA756` acting for `0x48F3bF1d065B7be54c4CC4181809920eC85dd47D` via Link a bot, viem 2.57.7, 2026-10-20.
