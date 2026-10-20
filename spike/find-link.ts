import { createPublicClient, http, pad } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const REG = "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a";
const KEY = pad("0xEB91561015115C0184f214907617343C3fCEA756".toLowerCase() as any).toLowerCase();
const head = await c.getBlock();
const target = Date.parse("2026-10-20T14:12:30Z") / 1000;
const bps = 9.99;
let center = Number(head.number) - Math.round((Number(head.timestamp) - target) * bps);
for (let off = 0; off < 30000; off += 1000) {
  for (const from of [center - off - 1000, center + off]) {
    const logs: any[] = await c.request({ method: "eth_getLogs", params: [{ address: REG, fromBlock: "0x" + from.toString(16), toBlock: "0x" + (from + 999).toString(16) }] } as any).catch((e: any) => { console.log("err", e.shortMessage); return []; });
    const hit = logs.filter((l) => l.topics.some((t: string) => t.toLowerCase() === KEY) || l.data.toLowerCase().includes(KEY.slice(26)));
    if (hit.length) { for (const l of hit.slice(0, 4)) console.log(parseInt(l.blockNumber), l.transactionHash, JSON.stringify(l.topics), l.data.slice(0, 200)); console.log("all topic0 in window:", [...new Set(logs.map((l) => l.topics[0]))]); process.exit(0); }
  }
}
console.log("not found");
