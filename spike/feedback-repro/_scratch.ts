import { markets, j } from "./_conn.ts";
const ex = markets as any;
await ex.loadMarkets();
const fr = await ex.fetchFundingRate("BTC/USDso:USDso");
console.log(j(fr));
const m = ex.markets["BTC/USDso:USDso"];
console.log(j(m).slice(0, 3000));
process.exit(0);
