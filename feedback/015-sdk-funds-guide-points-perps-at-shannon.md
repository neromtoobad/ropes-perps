# The SDK's "get testnet funds" guide sets perps up on Shannon, a separate perp deployment from dreamDEX's
Severity: normal
Area: docs

## Steps to reproduce
1. Follow `docs/how-to/get-testnet-funds.md` in the 0.32.1 package. It funds "an account on the Shannon testnet for … spot and perp collateral". It mints USDso at the Shannon address `0x9c32…b171`, then under "Perps" runs `exchange.depositMargin("BTC/USDso:USDso", 100)`.
2. Connect the SDK to Shannon with its own preset (`somniaShannon`, `SOMNIA_TESTNET_ADDRESSES`, indexer `https://dev.smk.somnia.host/v1/graphql`) and list perps.
3. Compare with the dreamDEX perps developer page: perps run on Hideki (50383), with MarginBank `0x4787…1394`. `docs/reference/networks-and-endpoints.md` adds that "USDso on Hideki cannot be minted".

Script: `spike/feedback-repro/p18-shannon-perps.ts`.

## Expected
The SDK's funding guide for perps points at the venue the dreamDEX app and docs use (Hideki: paper USDso voucher or bridge), or at least says that Shannon's perps are a separate deployment.

## Actual
Shannon runs its own perp venue: a different factory and MarginBank, 24 markets, several of them test-only (`SWBTC`, `SWBTCA`…`SWBTCD`, `SWETH`…). The SDK resolves the same symbol `BTC/USDso:USDso` there without complaint:
```
Shannon perpPoolFactory 0x516d2cb6de41bE98444e887793946E65989Ba07b marginBank 0xdd4A14A2763FDa39b9759D2D4150DB0e0f085C4E
Shannon listPerpMarkets(): 24 rows ["SWSOL","SWBNB","SWDOGE","SWETH","LINK","TAO","WLD","NEAR","XLM","AVAX","SUI","DOGE","HYPE","SWBTCD","SWBTCC","SWBTCB","SWBTCA","SWBTC","BNB","XRP","ADA","SOL","ETH","BTC"]
Shannon fetchFundingRate("BTC/USDso:USDso") ok 0.0001
```
A builder who follows the SDK guide mints Shannon USDso, deposits margin, and trades `BTC/USDso:USDso`. Everything works, but on a venue that isn't dreamDEX's (Hideki MarginBank `0x478769E1…1394`, 21 markets). Nothing they do appears in the dreamDEX app, Perps Arena or the bounty's "places real perps orders on Somnia Tokyo testnet" check. The guide never mentions Hideki, and the perps developer page never mentions that Shannon has a perp venue too.

## Evidence
Captured output of `p18-shannon-perps.ts` above. Guide text: `node_modules/@somnia-chain/markets-sdk/docs/how-to/get-testnet-funds.md`, opening paragraph and "## Perps".

## Environment
@somnia-chain/markets-sdk 0.32.1, Shannon testnet (50312) read via the SDK preset, Hideki testnet (50383), read-only, 2026-10-20.
