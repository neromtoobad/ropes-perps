import { createPublicClient, http, parseAbi } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const abi = parseAbi(["function isOperatorAuthorized(address,address,bytes4) view returns (bool)"]);
const AVAX = "0x" as any;
for (let i = 0; i < 480; i++) {
  const ok = await c.readContract({ address: "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0", abi, functionName: "isOperatorAuthorized", args: ["0x48F3bF1d065B7be54c4CC4181809920eC85dd47D", "0xEB91561015115C0184f214907617343C3fCEA756", "0x80054449"] }).catch(() => false);
  if (ok) { console.log("LINKED at", new Date().toISOString()); process.exit(0); }
  await new Promise((r) => setTimeout(r, 15000));
}
console.log("still not linked after 2h"); void AVAX;
