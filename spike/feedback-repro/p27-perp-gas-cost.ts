// Real gas paid by placeOrderFor IOC orders on Hideki perp pools (ROPES climbs), vs the docs' "0.0003–0.003 STT each".
import { createPublicClient, http, formatEther } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const txs = process.argv.slice(2);
for (const h of txs) {
  const r = await c.getTransactionReceipt({ hash: h as any });
  const fee = r.gasUsed * r.effectiveGasPrice;
  console.log(`${h} block ${r.blockNumber} gasUsed ${r.gasUsed} @ ${Number(r.effectiveGasPrice) / 1e9} gwei = ${formatEther(fee)} STT`);
}
