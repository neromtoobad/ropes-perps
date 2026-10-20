// Perp stop-order SOMI/STT payment: docs say "Stop orders carry 0.15 STT each" (developers/perps-testnet,
// Common pitfalls) and "Each pending TP or SL holds 0.15 STT" (trading/perps-testnet/orders).
// Read the registry's somiPaymentPerOrder for every market row, plus the SDK's own getter. Read-only.
import { markets, j } from "./_conn.ts";
import { formatEther } from "viem";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const regs = new Map<string, string[]>();
for (const m of perps) { const r = (m.stopRegistry ?? "").toLowerCase(); regs.set(r, [...(regs.get(r) ?? []), m.baseSymbol]); }
console.log("distinct stopRegistry values on", perps.length, "market rows:", regs.size);
for (const [reg, syms] of regs) {
  const pay: bigint = await c.getPerpStopOrderSomiPayment(reg);
  console.log(`registry ${reg} (${syms.length} markets) somiPaymentPerOrder = ${pay} wei = ${formatEther(pay)} STT  | docs say 0.15 STT -> ${pay === 150000000000000000n ? "matches" : "DIFFERS"}`);
  console.log(`  linked TP+SL pair (x2) = ${formatEther(pay * 2n)} STT`);
}
process.exit(0);
