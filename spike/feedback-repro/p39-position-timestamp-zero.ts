// MarginBank.getPosition(...).lastUpdatedTimestampNs (client.getPerpPosition) across real holders, next to
// the indexer's last update for the same position. SDK type doc: "Last position update (nanoseconds)". Read-only.
import { markets, j } from "./_conn.ts";
const c = markets.client as any;
const perps = await c.listPerpMarkets();
let n = 0, zero = 0;
for (const sym of (process.argv[2] ?? "BTC,ETH,SOL,XRP,DOGE").split(",")) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  for (const isLong of [true, false]) {
    const h = await c.getPerpSideHolders({ marginBank: m.marginBank, pool: m.poolAddress, isLong }, { pageSize: 250 });
    for (const acct of h.holders.slice(0, 5)) {
      const ref = { marginBank: m.marginBank, account: acct, pool: m.poolAddress };
      const [pos, idx] = await Promise.all([c.getPerpPosition(ref), c.listPerpPositions(acct, { pool: m.poolAddress })]);
      if (pos.size === 0n) continue;
      n++; if (pos.lastUpdatedTimestampNs === 0n) zero++;
      const row = idx[0];
      console.log(`${sym.padEnd(5)} ${acct} size ${pos.size} lastUpdatedTimestampNs ${pos.lastUpdatedTimestampNs} | indexer updatedAt ${row?.updatedAt} (${row ? new Date(Number(row.updatedAt) * 1000).toISOString() : "-"}) block ${row?.updatedAtBlock}`);
    }
  }
}
console.log(`open positions read: ${n}; lastUpdatedTimestampNs == 0 on ${zero}`);
// Same field through the bank's paginated holder-state view
import { createPublicClient, http, parseAbi } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { RPC } from "./_conn.ts";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC, { timeout: 60000 }) });
const abi = parseAbi(["function getSideHolderStatesPaginated(address pool, bool isLong, uint256 start, uint256 count) view returns ((address account, bool priceable, uint8 status, int256 equity, uint256 imReq, uint256 mmReq, uint256 cmReq, (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs) position, int256 unlockedCollateralBalance, uint256 lockedCollateral)[] states, uint256 listLength, bool poolPriceable, (uint256 oneBase, uint256 markPrice, int256 projectedCumulativeFunding, uint256 effectiveIMFBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 staticIMFBps) poolSnapshot)"]);
const eth = perps.find((x: any) => x.baseSymbol === "ETH")!;
const [states, len] = await pc.readContract({ address: eth.marginBank, abi, functionName: "getSideHolderStatesPaginated", args: [eth.poolAddress, true, 0n, 50n] }) as any;
console.log(`MarginBank.getSideHolderStatesPaginated(ETH, long, 0, 50): ${states.length} of ${len} states, lastUpdatedTimestampNs non-zero on ${states.filter((s: any) => s.position.lastUpdatedTimestampNs !== 0n).length}`);
process.exit(0);
