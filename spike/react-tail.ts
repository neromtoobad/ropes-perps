// Prints the decoded Reactivity stream the Crag runs on, for a few seconds.
import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, webSocket, decodeEventLog } from "viem";
import { hideki, MARGIN_BANK, LIQUIDATION_ENGINE, bankAbi, liqAbi } from "../src/lib/chain";
const pools: Record<string, string> = await fetch("https://ropesperps.nerom.site/api/state?n=1").then((r) => r.json()).then((j) => Object.fromEntries(j.markets.map((m: any) => [m.pool, m.base])));
const sdk = new SDK({ public: createPublicClient({ chain: hideki, transport: webSocket() }) } as any);
let n = 0; const t0 = Date.now();
await sdk.watch({ eventContractSources: [MARGIN_BANK, LIQUIDATION_ENGINE], ethCalls: [], onData: (x: any) => {
  const r = x.result; n++;
  try {
    const abi = r.address.toLowerCase() === MARGIN_BANK.toLowerCase() ? bankAbi : liqAbi;
    const ev: any = decodeEventLog({ abi, topics: r.topics, data: r.data, strict: false });
    if (ev.eventName === "PositionUpdated" || ev.eventName === "PositionLiquidated") {
      const a = ev.args, base = pools[String(a.perpPool).toLowerCase()] ?? "?";
      const size = Number(a.newSize ?? a.sizeDelta);
      console.log(`+${((Date.now() - t0) / 1000).toFixed(2)}s ${ev.eventName.padEnd(18)} ${String(a.account).slice(0, 8)}… ${base.padEnd(5)} ${size === 0 ? "flat" : size > 0 ? "▲ long" : "▼ short"}`);
    }
  } catch {}
} } as any);
setTimeout(() => { console.log(`# ${n} events in ${((Date.now() - t0) / 1000).toFixed(1)}s`); process.exit(0); }, 8000);
