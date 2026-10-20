"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Crag } from "../../Crag";
import { Footer, Header, pct, px, short, usd, usePoll, type CragClimber, type CragState } from "../../ui";

/** Watch one account: every rope it has on dreamDEX right now, live. The page a climber shares. */
export default function Watch({ params }: { params: Promise<{ owner: string }> }) {
  const { owner } = use(params);
  const acct = owner.toLowerCase();
  const s = usePoll<CragState>(`/api/state?watch=${acct}&n=12`, 2000, (j) => Array.isArray(j?.climbers));
  const who = usePoll<{ climber: { name: string } | null; climbs: any[] }>(`/api/climber?owner=${acct}`, 10000, (j) => j !== undefined);
  const mine = (s?.climbers ?? []).filter((c) => c.account === acct);
  const [sel, setSel] = useState<CragClimber | null>(null);
  const name = who?.climber?.name ?? short(acct);
  return (
    <main className="min-h-dvh">
      <Header />
      <section className="mx-auto w-full max-w-[1100px] px-4">
        <p className="text-[10px] font-black tracking-[0.3em] text-[var(--dim)]">WATCHING</p>
        <h1 className="display text-3xl sm:text-5xl">{name.toUpperCase()}</h1>
        <p className="tabular text-[11px] text-[var(--dim)]">{acct}</p>
        <div className="mt-4">
          <Crag climbers={mine} feed={[]} selected={sel?.id ?? null} onSelect={setSel} height="clamp(360px, 55vh, 600px)" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {mine.map((c) => (
            <div key={c.id} className="chamfer flex items-center justify-between border p-3" style={{ borderColor: "var(--edge)", background: "var(--panel)" }}>
              <div>
                <p className="display text-xl">
                  {c.base} <span style={{ color: c.side === "UP" ? "var(--up)" : "var(--down)" }}>{c.side === "UP" ? "▲" : "▼"}</span>{" "}
                  <span style={{ color: c.roe >= 0 ? "var(--up)" : "var(--down)" }}>{pct(c.roe)}</span>
                </p>
                <p className="tabular text-[11px] text-[var(--dim)]">
                  {usd(c.notional)} · entry {px(c.entry)}
                </p>
              </div>
              <Link
                href={`/climb?base=${c.base}&side=${c.side}&tie=${acct}`}
                className="chamfer-sm px-4 py-2 text-[12px] font-black tracking-[0.2em]"
                style={{ background: "var(--gold)", color: "#000" }}
              >
                TIE IN
              </Link>
            </div>
          ))}
          {s && !mine.length && <p className="text-sm text-[var(--dim)]">Off the wall right now — no open perp positions.</p>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
