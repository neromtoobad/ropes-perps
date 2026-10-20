import { createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { RPC, hideki } from "@/lib/chain";
import { db } from "@/lib/db";
import { knownOwner } from "@/server/links";
import { chainClient, isLinked } from "@/server/verify";

export const dynamic = "force-dynamic";

const DRIP = "0.2"; // ~10 orders at 0.02 STT, about five climbs
const FEES = { maxFeePerGas: 7_000_000_000n, maxPriorityFeePerGas: 0n } as const;

/**
 * First gas for a climbing key, from the ROPES house wallet. One drip per key,
 * only to a key a dreamDEX account has actually linked, only while it is
 * nearly empty. The player never has to find STT to start climbing.
 */
export async function POST(req: Request) {
  const pk = process.env.HOUSE_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) return Response.json({ error: "drip not configured" }, { status: 503 });
  const b = await req.json().catch(() => null);
  const key = String(b?.key ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(key)) return Response.json({ error: "bad key" }, { status: 400 });

  const owner = await knownOwner(key);
  if (!owner || !(await isLinked(owner, key))) return Response.json({ error: "link the key in dreamDEX first" }, { status: 403 });
  const already = await db.drip.findUnique({ where: { key } });
  if (already) return Response.json({ ok: true, tx: already.tx, already: true });
  const bal = await chainClient.getBalance({ address: key as `0x${string}` });
  if (bal >= parseEther("0.08")) return Response.json({ ok: true, skipped: "already has gas", balance: formatEther(bal) });

  const house = privateKeyToAccount(pk);
  if ((await chainClient.getBalance({ address: house.address })) < parseEther("0.5"))
    return Response.json({ error: "the house gas tank is low; use Send it … for gas in the app" }, { status: 503 });
  // claim the slot first so two tabs can't both drip
  try {
    await db.drip.create({ data: { key, owner, amount: Number(DRIP), tx: "pending" } });
  } catch {
    return Response.json({ ok: true, already: true });
  }
  try {
    const w = createWalletClient({ account: house, chain: hideki, transport: http(RPC) });
    const tx = await w.sendTransaction({ to: key as `0x${string}`, value: parseEther(DRIP), gas: 21_000n, ...FEES });
    await chainClient.waitForTransactionReceipt({ hash: tx, pollingInterval: 250 });
    await db.drip.update({ where: { key }, data: { tx } });
    return Response.json({ ok: true, tx, amount: DRIP });
  } catch (e: any) {
    await db.drip.delete({ where: { key } }).catch(() => {});
    return Response.json({ error: e?.shortMessage ?? "drip failed" }, { status: 500 });
  }
}
