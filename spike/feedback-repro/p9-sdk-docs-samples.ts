// Runs the read-only samples from node_modules/@somnia-chain/markets-sdk/docs/PERPS.md
// ("Quick start" and "One-shot reads") against Hideki, verbatim where possible.
import { markets, j } from "./_conn.ts";
const client = markets.client;
const exchange = markets as any;

// --- One-shot reads (PERPS.md "One-shot reads (no watch)")
const perps = await client.listPerpMarkets({ baseSymbol: "WBTC", limit: 20 });
console.log('listPerpMarkets({ baseSymbol: "WBTC", limit: 20 }) ->', perps.length, "rows");
try {
  const one = await client.getPerpMarket(perps[0].id);
  console.log("getPerpMarket ->", one?.baseSymbol);
} catch (e: any) { console.log("getPerpMarket(perps[0].id) threw:", e.constructor.name, e.message); }
const btcRows = await client.listPerpMarkets({ baseSymbol: "BTC" });
console.log('listPerpMarkets({ baseSymbol: "BTC" }) ->', btcRows.length, "row(s), baseSymbol =", btcRows[0]?.baseSymbol);

// --- Quick start (PERPS.md "Quick start"): the symbol it uses
await exchange.loadMarkets();
const perpSyms = Object.keys(exchange.markets).filter((s: string) => s.endsWith(":USDso"));
console.log("after loadMarkets():", perpSyms.length, "perp symbols, e.g.", j(perpSyms.filter((s: string) => /^(BTC|ETH)\//.test(s))));
for (const sym of ["BTC/USDSO:USDSO", "BTC/USDso:USDso"]) {
  try {
    const fr = await exchange.fetchFundingRate(sym);
    console.log(`fetchFundingRate("${sym}") -> ok, fundingRate=${fr.fundingRate} markPrice=${fr.markPrice}`);
  } catch (e: any) { console.log(`fetchFundingRate("${sym}") threw:`, e.constructor.name, e.message.split("\n")[0]); }
}
process.exit(0);
