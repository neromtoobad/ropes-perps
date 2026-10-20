import { createPublicClient, http, parseAbi, pad } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const OWNER = "0x48F3bF1d065B7be54c4CC4181809920eC85dd47D";
const BTC = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0";
const abi = parseAbi(["function isOperatorAuthorized(address,address,bytes4) view returns (bool)"]);
for (const k of ["0x341497d8ecA28ea89c77d2D0C317E041C833b7df", "0xEB91561015115C0184f214907617343C3fCEA756"]) {
  console.log(k, await c.readContract({ address: BTC, abi, functionName: "isOperatorAuthorized", args: [OWNER, k as any, "0x80054449"] }));
}
// any registry/pool logs mentioning the new key in the last ~2h
const head = await c.getBlockNumber();
const key = pad("0xEB91561015115C0184f214907617343C3fCEA756".toLowerCase() as any);
for (let from = head - 72000n; from < head; from += 5000n) {
  for (const pos of [1, 2, 3]) {
    const topics: any[] = [null, null, null, null].slice(0, pos + 1); topics[pos] = key;
    try {
      const logs: any[] = await c.request({ method: "eth_getLogs", params: [{ fromBlock: "0x" + from.toString(16), toBlock: "0x" + (from + 4999n).toString(16), topics }] } as any);
      for (const l of logs) console.log("log", l.address, l.topics[0].slice(0, 10), "block", parseInt(l.blockNumber), "tx", l.transactionHash);
    } catch (e: any) { console.log("getLogs err", (e.shortMessage ?? e.message).slice(0, 80)); break; }
  }
}
