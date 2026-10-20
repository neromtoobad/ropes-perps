import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, webSocket, defineChain } from "viem";
const chain = defineChain({ id: 50383, name: "hideki", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }, rpcUrls: { default: { http: ["https://api.hideki2.infra.testnet.somnia.network"], webSocket: ["wss://api.hideki2.infra.testnet.somnia.network/ws"] } } });
const pub = createPublicClient({ chain, transport: webSocket() });
console.log("block", await pub.getBlockNumber());
const sdk = new SDK({ public: pub } as any);
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394";
const BTC = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0";
const counts: Record<string, number> = {};
let first = 0;
const t0 = Date.now();
const res = await sdk.watch({
  eventContractSources: [BANK, BTC],
  ethCalls: [],
  onData: (n: any) => { if (!first) { first = Date.now() - t0; console.log("first event", first, "ms", JSON.stringify(n).slice(0, 400)); } const r = n.result ?? n.params?.result; const k = `${r.address.slice(0, 8)}:${r.topics[0].slice(0, 10)}`; counts[k] = (counts[k] ?? 0) + 1; },
  onError: (e: any) => console.log("err", e?.message ?? e),
} as any);
console.log("subscribed", res instanceof Error ? res.message : "ok", Date.now() - t0, "ms");
setTimeout(() => { console.log("25s", JSON.stringify(counts)); process.exit(0); }, 25000);
