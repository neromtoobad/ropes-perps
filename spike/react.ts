import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const perps = await m.client.listPerpMarkets();
const bank = perps[0].marginBank;
const pools = perps.map((p: any) => p.poolAddress);
const r = createReactivity(m.client);
const counts: Record<string, number> = {};
const t0 = Date.now();
const w = unwrap(await r.watch({
  eventContractSources: [bank, ...pools],
  ethCalls: [],
  onData: (n: any) => { const k = `${n.result.address.slice(0, 8)}:${n.result.topics[0].slice(0, 10)}`; counts[k] = (counts[k] ?? 0) + 1; },
} as any));
setTimeout(async () => { console.log("20s of events", JSON.stringify(counts, null, 0)); console.log("bank", bank.slice(0,8)); await (w as any).unsubscribe?.(); process.exit(0); }, 20000);
