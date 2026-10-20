// Which topic0s do the perp contracts actually emit, and does any ABI the SDK exports decode them?
// eth_getLogs over the last N blocks (HTTP), tallied per contract and topic0. Read-only.
import * as sdk from "@somnia-chain/markets-sdk";
import { createPublicClient, http, toEventSelector, type AbiEvent } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { markets, RPC } from "./_conn.ts";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC, { timeout: 60_000, retryCount: 5 }) });
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const btc = perps.find((m: any) => m.baseSymbol === "BTC")!;
const eth = perps.find((m: any) => m.baseSymbol === "ETH")!;
const targets: Record<string, string> = {
  MarginBank: "0x478769E1177C0773c43A593DCCc4Ad15F15F1394",
  LiquidationEngine: "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D",
  InsuranceFund: "0x50826894D47C6D4f3BeA38BFDC7Dc5c5be171b80",
  VoucherDistributor: "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4",
  OperatorPermissionsRegistry: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a",
  "BTC PerpPool": btc.poolAddress, "ETH PerpPool": eth.poolAddress,
  "BTC PerpStopOrderRegistry": btc.stopRegistry,
};
// Every event ABI exported from the package root:
const exported = Object.entries(sdk).filter(([k, v]) => /Abi$/.test(k) && Array.isArray(v));
const known = new Map<string, string>();
for (const [name, abi] of exported) for (const it of abi as any[]) if (it?.type === "event") known.set(toEventSelector(it as AbiEvent), `${it.name} (${name})`);
console.log(`exported ABIs: ${exported.length}; distinct event selectors they cover: ${known.size}`);
const span = BigInt(process.argv[2] ?? 6000);
const head = await pc.getBlockNumber();
console.log(`window: blocks ${head - span}..${head} (~${Number(span) / 10 / 60} min at 100 ms/block)`);
let unknown = 0;
for (const [label, address] of Object.entries(targets)) {
  const logs: any[] = [];
  for (let from = head - span; from <= head; from += 250n) {
    const to = from + 249n > head ? head : from + 249n;
    logs.push(...(await pc.request({ method: "eth_getLogs", params: [{ address, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }] } as any) as any[]));
  }
  const t: Record<string, number> = {};
  for (const l of logs) t[l.topics[0]] = (t[l.topics[0]] ?? 0) + 1;
  console.log(`\n${label} ${address}: ${logs.length} logs`);
  for (const [topic, n] of Object.entries(t).sort((a, b) => b[1] - a[1])) {
    const k = known.get(topic);
    if (!k) unknown++;
    const ex = logs.find((l) => l.topics[0] === topic);
    console.log(`  ${topic} x${n}  ${k ?? "<-- NOT IN ANY EXPORTED ABI  e.g. tx " + ex.transactionHash + " topics " + ex.topics.length + " data " + (ex.data.length - 2) / 2 + " bytes"}`);
  }
}
console.log(`\nemitted topic0s no exported ABI decodes: ${unknown}`);
for (const sig of ["OrderRejected(address,uint8,uint256)", "VoucherGranted(address,address,uint256)"]) console.log(`keccak("${sig}") = ${toEventSelector(sig)}`);
console.log("perpStopRegistryEventsAbi exported from the package root:", "perpStopRegistryEventsAbi" in sdk);
process.exit(0);
