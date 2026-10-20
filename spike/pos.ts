import { createPublicClient, http, parseAbi, decodeEventLog } from "viem";
const c = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") });
const BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394";
const abi = parseAbi(["function getPosition(address,address) view returns ((int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs))", "event PositionUpdated(address indexed account, address indexed perpPool, int128 newSize, uint128 avgEntryPrice, int256 realizedPnl, int256 entryFundingIndex)"]);
const AVAX = process.argv[2] as any;
const p = await c.readContract({ address: BANK, abi, functionName: "getPosition", args: ["0x48F3bF1d065B7be54c4CC4181809920eC85dd47D", AVAX] });
console.log("now", p);
const head = await c.getBlockNumber();
const logs = await c.getLogs({ address: BANK, event: abi[1], args: { account: "0x48F3bF1d065B7be54c4CC4181809920eC85dd47D" }, fromBlock: head - 900n, toBlock: head });
for (const l of logs) { const tx = await c.getTransaction({ hash: l.transactionHash! }); console.log(l.blockNumber, l.args.perpPool, l.args.newSize, "from", tx.from, l.transactionHash); }
