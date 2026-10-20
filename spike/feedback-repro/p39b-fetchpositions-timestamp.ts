// exchange.fetchPositions() for an account with open positions (address-only `account`, no key). Read-only.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { INDEXER } from "./_conn.ts";
const account = (process.argv[2] ?? "0xfbE713c07c83701E47DB37E459F483a9cF0BFb03") as `0x${string}`;
const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, account } as any);
await ex.loadMarkets();
const ps = await ex.fetchPositions();
for (const p of ps as any[]) console.log(`${p.symbol} ${p.side} ${p.contracts} entry ${p.entryPrice} timestamp ${p.timestamp} datetime ${p.datetime} info.position.lastUpdatedTimestampNs ${p.info?.position?.lastUpdatedTimestampNs ?? p.info?.lastUpdatedTimestampNs}`);
process.exit(0);
