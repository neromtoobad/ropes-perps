// A voucher-holding account (credited 1,000 paper USDso by the VoucherDistributor) simulating a resting
// bid with eth_call on markets the docs mark "Paper USDso: No" and one marked "Yes". Read-only.
import { markets, j, RPC, gql } from "./_conn.ts";
import { createPublicClient, http, parseAbi, encodeFunctionData, decodeErrorResult, formatUnits } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { contractErrorsAbi } from "@somnia-chain/markets-sdk";
const pc = createPublicClient({ chain: hidekiTestnet, transport: http(RPC) });
const c = markets.client as any;
const perps = await c.listPerpMarkets();
const bankAbi = parseAbi(["function getCreditFloor(address) view returns (uint256)", "function getActivePerpPools(address) view returns (address[])"]);
// newest voucher credits (MarginEvent kind Credited, granter = VoucherDistributor)
const ev = await gql(`{ MarginEvent(where: {kind: {_eq: "Credited"}}, order_by: {timestamp: desc}, limit: 40) { account timestamp txHash } }`);
let acct: `0x${string}` | undefined;
for (const e of ev.data.MarginEvent) {
  const floor = await pc.readContract({ address: perps[0].marginBank, abi: bankAbi, functionName: "getCreditFloor", args: [e.account] });
  const pools = await pc.readContract({ address: perps[0].marginBank, abi: bankAbi, functionName: "getActivePerpPools", args: [e.account] });
  if (floor > 0n && pools.length === 0) { acct = e.account; console.log(`voucher account ${e.account} creditFloor=${formatUnits(floor, 18)} USDso, flat, credited in tx ${e.txHash}`); break; }
}
if (!acct) throw new Error("no flat voucher account found");
const block = await pc.getBlockNumber();
const poolAbi = parseAbi(["function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)"]);
const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600) * 1_000_000_000n;
for (const sym of ["ZRO", "ZEC", "LIT", "BTC"]) {
  const m = perps.find((x: any) => x.baseSymbol === sym)!;
  const tick = BigInt(m.tickSize);
  const st = await c.getPerpState(m.poolAddress);
  const price = (st.markPrice * 97n / 100n / tick) * tick; // resting bid 3% under mark, on tick
  const qty = BigInt(m.minQuantity);
  const max = await c.getMaxPerpOrderSize({ pool: m.poolAddress, marginBank: m.marginBank, account: acct, isBid: true, price });
  let sim: string;
  try {
    const data = encodeFunctionData({ abi: poolAbi, functionName: "placeOrder", args: [true, 0n, price, qty, expiry, 0, 0, "0x0000000000000000000000000000000000000000", 0n] });
    const r = await pc.call({ account: acct, to: m.poolAddress, data, gas: 10_000_000n, blockNumber: block });
    sim = `succeeds (returns ${r.data?.slice(0, 74)}…)`;
  } catch (e: any) {
    let raw: any; e.walk?.((x: any) => { if (typeof x?.data === "string") raw = x.data; return false; });
    try { const d = decodeErrorResult({ abi: contractErrorsAbi as any, data: raw }); sim = `reverts ${d.errorName} ${raw.slice(0, 10)}`; } catch { sim = `reverts ${raw}`; }
  }
  console.log(`${sym.padEnd(4)} getMaxPerpOrderSize: placeable=${max.placeable} limitedBy=${max.limitedBy} | eth_call placeOrder bid ${formatUnits(qty, m.baseDecimals)} @ ${formatUnits(price, 18)} at block ${block}: ${sim}`);
}
process.exit(0);
