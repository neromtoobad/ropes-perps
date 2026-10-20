// hidekiTestnet (SDK 0.32.1) says blocks land every 10 ms and that Hideki has no public explorer.
// Measure the block cadence on the live chain and check the explorer the dreamDEX docs link.
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { rpc } from "./_conn.ts";
console.log("hidekiTestnet.blockTime =", (hidekiTestnet as any).blockTime, "| blockExplorers =", JSON.stringify((hidekiTestnet as any).blockExplorers));
const head = BigInt((await rpc("eth_blockNumber", [])).result);
for (const span of [1000n, 100000n]) {
  const a = (await rpc("eth_getBlockByNumber", ["0x" + (head - span).toString(16), false])).result;
  const b = (await rpc("eth_getBlockByNumber", ["0x" + head.toString(16), false])).result;
  const dt = Number(BigInt(b.timestamp) - BigInt(a.timestamp));
  console.log(`blocks ${head - span}..${head}: ${span} blocks in ${dt} s => ${((dt * 1000) / Number(span)).toFixed(1)} ms/block`);
}
const ex = await fetch("https://explorer.testnet.somnia.network/tokyo/address/0x478769E1177C0773c43A593DCCc4Ad15F15F1394");
const title = (await ex.text()).match(/<title>([^<]*)/)?.[1];
console.log(`GET https://explorer.testnet.somnia.network/tokyo/address/<MarginBank> -> ${ex.status} "${title}"`);
