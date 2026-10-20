import { createPublicClient, http, formatEther } from "viem";
import { hideki, MARGIN_BANK, bankAbi, RPC } from "../src/lib/chain";
const c = createPublicClient({ chain: hideki, transport: http(RPC) });
const tx = await c.getTransaction({ hash: "0xaa91e75611dae175d7d481f67e58f83962dd27e73610a3dc558166bb70e9e2f3" });
const r = await c.getTransactionReceipt({ hash: tx.hash });
console.log("from", tx.from, "to", tx.to, "status", r.status, "fee", formatEther(r.gasUsed * r.effectiveGasPrice), "STT");
const p = await c.readContract({ address: MARGIN_BANK, abi: bankAbi, functionName: "getPosition", args: ["0x48F3bF1d065B7be54c4CC4181809920eC85dd47D", tx.to!] }) as any;
console.log("AVAX position now", String(p.size));
process.exit(0);
