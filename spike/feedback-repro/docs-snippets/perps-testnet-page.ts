// Verbatim code samples from https://app.testnet.dreamdex.io/docs/developers/perps-testnet (2026-10-20),
// concatenated in page order. Only change: the imports are hoisted to the top.
import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { parseUnits } from "viem"

const markets = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  privateKey: process.env.PRIVATE_KEY as `0x${string}`, // leave out for read-only
})

const perps = await markets.client.listPerpMarkets()
const btc = perps.find((m) => m.baseSymbol === "BTC")!

const account = markets.walletAddress!
const eligibility = await markets.client.getPerpVoucherEligibility(btc.marginBank, account)
if (eligibility.eligible) {
  await markets.trader.claimPerpVoucher({ marginBank: btc.marginBank })
}

const price = parseUnits("100000", btc.quoteDecimals)

const max = await markets.client.getMaxPerpOrderSize({
  pool: btc.poolAddress,
  marginBank: btc.marginBank,
  account,
  isBid: true,
  price,
})

const quantity = parseUnits("0.001", btc.baseDecimals)

if (!max.priceable) throw new Error("No live mark price to size against")
if (!max.placeable || quantity > max.maxQuantity) {
  throw new Error(`Order too large for this account: limited by ${max.limitedBy}`)
}

await markets.trader.placePerpOrder({ pool: btc.poolAddress, isBid: true, price, quantity })
