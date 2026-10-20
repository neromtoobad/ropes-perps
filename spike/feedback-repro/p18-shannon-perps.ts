// docs/how-to/get-testnet-funds.md (SDK 0.32.1) funds perps on SHANNON (mint USDso there, then
// exchange.depositMargin("BTC/USDso:USDso", 100)). Which perp markets does Shannon actually have?
import { SOMNIA_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { j } from "./_conn.ts";
const shannon = new SomniaMarkets({ chain: somniaShannon, indexerUrl: "https://dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_TESTNET_ADDRESSES });
console.log("Shannon perpPoolFactory", (SOMNIA_TESTNET_ADDRESSES as any).perpPoolFactory, "marginBank", (SOMNIA_TESTNET_ADDRESSES as any).marginBank);
const rows = await shannon.client.listPerpMarkets().catch((e: any) => `threw ${e.constructor.name}: ${e.message.split("\n")[0]}`);
console.log("Shannon listPerpMarkets():", typeof rows === "string" ? rows : `${rows.length} rows ${j(rows.map((r: any) => r.baseSymbol))}`);
await (shannon as any).loadMarkets();
const perpSyms = Object.keys((shannon as any).markets).filter((s) => s.includes(":"));
console.log("Shannon loadMarkets() perp symbols:", j(perpSyms));
try {
  const fr = await (shannon as any).fetchFundingRate("BTC/USDso:USDso");
  console.log('Shannon fetchFundingRate("BTC/USDso:USDso") ok', fr.fundingRate);
} catch (e: any) { console.log('Shannon fetchFundingRate("BTC/USDso:USDso") threw', e.constructor.name + ":", e.message.split("\n")[0]); }
process.exit(0);
