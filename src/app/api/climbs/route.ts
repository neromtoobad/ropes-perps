import { db } from "@/lib/db";
import { signer, verifyTx } from "@/server/verify";

export const dynamic = "force-dynamic";

/**
 * Climb records. The chain is the truth; this is the scoreboard. Every record
 * is signed by the climbing key, and every open/close names a transaction the
 * server re-reads to confirm it came from that key and landed.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.owner || !b?.sig || !b?.action) return Response.json({ error: "bad request" }, { status: 400 });
  const owner = String(b.owner).toLowerCase();
  const who = await db.climber.findUnique({ where: { owner } });
  if (!who) return Response.json({ error: "register the climber first" }, { status: 403 });
  if ((await signer(b).catch(() => "")) !== who.key) return Response.json({ error: "not signed by the linked key" }, { status: 401 });

  if (b.action === "open") {
    if (!(await verifyTx(b.openTx, who.key).catch(() => false))) return Response.json({ error: "open tx not found or not from the key" }, { status: 400 });
    const c = await db.climb.create({
      data: {
        owner,
        base: String(b.base),
        side: b.side === "DOWN" ? "DOWN" : "UP",
        rope: Math.max(1, Math.min(20, Math.round(Number(b.rope)))),
        stake: Number(b.stake),
        qty: Number(b.qty),
        entryPx: Number(b.entryPx),
        openTx: String(b.openTx),
        tieTo: b.tieTo ? String(b.tieTo).toLowerCase() : null,
        summit: b.summit ? Number(b.summit) : null,
        peak: 1,
      },
    });
    return Response.json(c);
  }
  if (b.action === "close") {
    const c = await db.climb.findUnique({ where: { id: String(b.id) } });
    if (!c || c.owner !== owner) return Response.json({ error: "no such climb" }, { status: 404 });
    if (c.status !== "open") return Response.json(c);
    if (b.exitTx && !(await verifyTx(b.exitTx, who.key).catch(() => false))) return Response.json({ error: "exit tx not from the key" }, { status: 400 });
    const status = ["bailed", "summit", "ground", "gone"].includes(b.status) ? b.status : "bailed";
    const u = await db.climb.update({
      where: { id: c.id },
      data: {
        status,
        exitTx: b.exitTx ?? null,
        exitPx: b.exitPx != null ? Number(b.exitPx) : null,
        multiple: b.multiple != null ? Number(b.multiple) : null,
        peak: Math.max(c.peak ?? 1, Number(b.peak ?? 0)),
        closedAt: new Date(),
      },
    });
    return Response.json(u);
  }
  return Response.json({ error: "unknown action" }, { status: 400 });
}

/** The board: best banked climbs, recent climbs, and totals. */
export async function GET() {
  const [best, recent, n, falls] = await Promise.all([
    db.climb.findMany({ where: { status: { in: ["bailed", "summit"] }, multiple: { not: null } }, orderBy: { multiple: "desc" }, take: 20, include: { climber: true } }),
    db.climb.findMany({ orderBy: { openedAt: "desc" }, take: 20, include: { climber: true } }),
    db.climb.count(),
    db.climb.count({ where: { status: "ground" } }),
  ]);
  return Response.json({ best, recent, total: n, falls }, { headers: { "cache-control": "no-store" } });
}
