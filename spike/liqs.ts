import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const rows = await m.client.listLiquidations({ limit: 8 } as any);
console.log(rows.length, JSON.stringify(rows.slice(0, 3), (_, v) => (typeof v === "bigint" ? v.toString() : v), 1).slice(0, 1800));
const now = Date.now() / 1000;
console.log(rows.map((r: any) => Math.round((now - Number(r.timestamp ?? r.blockTimestamp ?? 0)) / 60) + "m").join(" "));
process.exit(0);
