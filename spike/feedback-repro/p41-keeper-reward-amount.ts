// listLiquidations KeeperReward rows vs the LiquidationKeeperRewardPaid log they were indexed from. Read-only.
import { liquidationEngineEventsAbi } from "@somnia-chain/markets-sdk";
import { decodeEventLog, formatUnits } from "viem";
import { markets, j, rpc } from "./_conn.ts";
const c = markets.client as any;
const rows = (await c.listLiquidations({ kind: "KeeperReward", limit: 8 })) as any[];
console.log("row fields:", Object.keys(rows[0]).join(","));
let sum = 0n;
for (const r of rows) {
  const logIndex = Number(r.id.split("_")[1]);
  const rec = (await rpc("eth_getTransactionReceipt", [r.txHash])).result;
  const log = rec.logs.find((l: any) => parseInt(l.logIndex) === logIndex);
  const ev: any = decodeEventLog({ abi: liquidationEngineEventsAbi, topics: log.topics, data: log.data });
  sum += ev.args.amount;
  const amountish = ["size", "price", "penalty", "badDebt", "insuranceCovered", "deficit", "coverageDeclined", "collateralAmount", "equity"].map((k) => `${k}=${r[k]}`).join(" ");
  console.log(`${r.id} counterparty(keeper) ${r.counterparty} | row: ${amountish} | chain ${ev.eventName} amount ${formatUnits(ev.args.amount, 18)} USDso`);
}
console.log(`rewards paid in these ${rows.length} rows: ${formatUnits(sum, 18)} USDso; recoverable from the indexed rows: none`);
process.exit(0);
