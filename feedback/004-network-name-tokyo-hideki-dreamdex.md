# One testnet goes by four names: "Somnia Tokyo", "Hideki", "dreamDEX region" and /tokyo
Severity: normal
Area: docs

## Steps to reproduce
1. Read the Perps Builder Bounty page: "dreamDEX perps on Somnia Tokyo testnet", "MVP places real perps orders on Somnia Tokyo testnet".
2. Read app.testnet.dreamdex.io/docs/developers/perps-testnet: "Testnet perps run on the Hideki testnet chain, which the app shows as the DreamDEX region". The SDK exports `hidekiTestnet` and `SOMNIA_HIDEKI_TESTNET_ADDRESSES`.
3. The explorer link on the same page is explorer.testnet.somnia.network/tokyo. The app's wallet errors say STT "cannot be withdrawn from Tokyo".

## Expected
One name for the perps testnet, or one sentence on the developer page tying them together, for example "Hideki (chain 50383) = Somnia Tokyo testnet = the DreamDEX region in the app".

## Actual
Nothing states that Tokyo and Hideki are the same chain. The SDK also exports the Shannon `SOMNIA_TESTNET_ADDRESSES`, and older bot-kit code used them for perps, so a newcomer can't tell which chain "Somnia Tokyo testnet" means. Shannon (50312) is also a Somnia testnet and runs its own, separate perp deployment (see 015), so picking the wrong chain still "works" against a different MarginBank.

## Evidence
The quotes above, from the bounty page and the developer docs, 2026-10-20.

## Environment
Docs as served on 2026-10-20, @somnia-chain/markets-sdk 0.32.1.
