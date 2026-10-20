// Repro for feedback/001 + 002: eligibility says yes, claim() reverts for everyone.
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import { createPublicClient, http } from "viem";
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const btc = (await m.client.listPerpMarkets()).find((x: any) => x.baseSymbol === "BTC")!;
const block = await c.getBlockNumber();
for (const a of ["0xea2CbF1444b0FFcC8DF2ce4275e3F6A7232Bb889", "0x099e5fa390eCD369dd5dBD462589300c41C07afA"]) {
  const el = await m.client.getPerpVoucherEligibility(btc.marginBank, a);
  let claim = "ok";
  try { await c.call({ to: "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4", data: "0x4e71d92d", account: a as any, blockNumber: block }); }
  catch (e: any) { claim = "revert " + (e.cause?.cause?.data ?? e.cause?.data ?? e.details); }
  console.log(`block ${block} ${a} eligibility=${JSON.stringify(el, (_, v) => typeof v === "bigint" ? v.toString() : v)} claim()=${claim}`);
}
process.exit(0);
