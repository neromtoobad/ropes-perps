import { createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const T = "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72";
const H = "0x099e5fa390eCD369dd5dBD462589300c41C07afA";
const abi = parseAbi(["function mint(address,uint256)", "function mint(uint256)", "function faucet()", "function drip()", "function claim()", "function name() view returns (string)"]);
console.log(await c.readContract({ address: T, abi, functionName: "name" }).catch(e => "name err"));
for (const [fn, args] of [["mint", [H, 10n ** 21n]], ["mint", [10n ** 21n]], ["faucet", []], ["drip", []]] as const) {
  try { await c.call({ to: T, account: H, data: encodeFunctionData({ abi, functionName: fn as any, args: args as any }) }); console.log(fn, args.length, "OK"); }
  catch (e: any) { console.log(fn, args.length, "revert", e.cause?.data ?? e.shortMessage?.slice(0, 60)); }
}
const impl = await c.getStorageAt({ address: T, slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" });
console.log("impl", impl);
