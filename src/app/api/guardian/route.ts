import { engine } from "@/server/engine";
import { guardian } from "@/server/guardian";

export const dynamic = "force-dynamic";

/** The guardian's address, and whether this account has linked it for a market (BTC by default). */
export async function GET(req: Request) {
  const g = guardian();
  if (!g) return Response.json({ address: null, armed: false });
  const u = new URL(req.url).searchParams;
  const owner = u.get("owner")?.toLowerCase();
  const m = engine().markets.find((x) => x.base === (u.get("base") ?? "BTC").toUpperCase()) ?? engine().markets.find((x) => x.base === "BTC");
  const armed = owner && /^0x[0-9a-f]{40}$/.test(owner) && m ? await g.isArmed(owner, m.pool) : false;
  return Response.json({ address: g.account.address, armed }, { headers: { "cache-control": "no-store" } });
}
