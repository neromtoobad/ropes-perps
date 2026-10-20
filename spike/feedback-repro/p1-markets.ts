import { markets, j, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "./_conn.ts";
const perps = await markets.client.listPerpMarkets();
console.log("count", perps.length);
console.log(j(perps[0]));
for (const m of perps) console.log([m.baseSymbol, m.quoteSymbol, m.baseDecimals, m.quoteDecimals, m.tickSize, m.lotSize, m.minQuantity, m.initialMarginBps, m.markPrice, m.markPriceUpdatedAt, m.indexPrice, m.fundingUpdatedAt, m.openInterest, m.openInterestUpdatedAt, m.fundingWindowSec, m.fundingIntervalSec, m.marginBank, m.stopRegistry].join(" | "));
console.log("ADDR", j(SOMNIA_HIDEKI_TESTNET_ADDRESSES));
process.exit(0);
