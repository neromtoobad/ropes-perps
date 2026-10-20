import { createPublicClient, http, pad } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const REG = "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a";
const head = await c.getBlock();
const old = await c.getBlock({ blockNumber: head.number - 100000n });
const bps = 100000 / Number(head.timestamp - old.timestamp);
console.log("blocks/sec", bps.toFixed(2), "gasPrice", await c.getGasPrice(), "baseFee", head.baseFeePerGas);
const op = pad("0x341497d8ecA28ea89c77d2D0C317E041C833b7df".toLowerCase() as any);
const target = Number(head.number) - Math.round((Number(head.timestamp) - Date.parse("2026-10-12T14:40:00Z") / 1000) * bps);
for (let from = target; from < target + Math.round(3600 * bps); from += 20000) {
  for (const pos of [1, 2, 3]) {
    const topics: any[] = [null, null, null, null].slice(0, pos + 1); topics[pos] = op;
    try {
      const logs = await c.request({ method: "eth_getLogs", params: [{ address: REG, fromBlock: "0x" + from.toString(16), toBlock: "0x" + (from + 19999).toString(16), topics }] } as any) as any[];
      if (logs.length) { console.log("pos", pos, "from", from, logs.length, JSON.stringify(logs[0]).slice(0, 600)); process.exit(0); }
    } catch (e: any) { console.log("err", e.shortMessage ?? e.message); process.exit(1); }
  }
}
console.log("none found");
