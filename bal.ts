import { createPublicClient, http, formatEther } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const c = createPublicClient({ chain: hidekiTestnet, transport: http("https://api.hideki2.infra.testnet.somnia.network") });
for (const a of process.argv.slice(2)) console.log(a, formatEther(await c.getBalance({ address: a as any })), "STT");
