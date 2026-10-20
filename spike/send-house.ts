import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
const rpc = http("https://api.hideki2.infra.testnet.somnia.network");
const w = createWalletClient({ account: privateKeyToAccount(process.env.HOUSE_PRIVATE_KEY as any), chain: hidekiTestnet, transport: rpc });
const p = createPublicClient({ chain: hidekiTestnet, transport: rpc });
const hash = await w.sendTransaction({ to: process.argv[2] as any, value: parseEther(process.argv[3]) });
console.log(hash, (await p.waitForTransactionReceipt({ hash })).status);
