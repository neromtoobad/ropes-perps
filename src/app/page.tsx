"use client";

import Link from "next/link";
import { useState } from "react";
import { Crag } from "./Crag";
import { Footer, Header, ago, pct, px, short, usd, usePoll, type CragClimber, type CragState } from "./ui";

export default function CragPage() {
  const [base, setBase] = useState("ALL");
  const [sel, setSel] = useState<CragClimber | null>(null);
  const s = usePoll<CragState>(`/api/state?base=${base}&n=44`, 2000, (j) => Array.isArray(j?.lanes) && Array.isArray(j?.markets));
  const selLive = sel ? (s?.lanes.flatMap((l) => l.climbers).find((c) => c.id === sel.id) ?? sel) : null;

  return (
    <main className="min-h-dvh">
      <Header />
      <section className="mx-auto w-full max-w-[1400px] px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="display text-3xl leading-tight sm:text-5xl">
              THE CRAG
              <span className="ml-3 align-middle text-[11px] font-black tracking-[0.3em] text-[var(--up)]">● LIVE</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--dim)]">
              Every open perp on dreamDEX is a climber. Height is return on margin, the floor is the liquidation. Tap one to see the route, and{" "}
              <b className="text-[var(--text)]">tie in</b> to climb the same line with your own rope.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6">
            <Stat label="ON THE WALL" value={s ? s.total.toLocaleString() : "…"} />
            <Stat label="LIQUIDATED · 24H" value={s ? String(s.falls24) : "…"} tone="down" />
            <Stat label="REACTIVITY EVENTS" value={s ? s.events.toLocaleString() : "…"} tone="gold" />
          </div>
        </div>

        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {["ALL", ...(s?.markets ?? []).sort((a, b) => b.oi - a.oi).map((m) => m.base)].map((b) => {
            const m = s?.markets.find((x) => x.base === b);
            const on = b === base;
            return (
              <button
                key={b}
                onClick={() => {
                  setBase(b);
                  setSel(null);
                }}
                className="chamfer-sm shrink-0 border px-2.5 py-1.5 text-left"
                style={{ borderColor: on ? "var(--gold)" : "var(--edge)", background: on ? "#ffc94d14" : "var(--panel)" }}
              >
                <p className="text-[11px] font-black tracking-[0.15em]" style={{ color: on ? "var(--gold)" : "var(--text)" }}>
                  {b}
                </p>
                <p className="tabular text-[9px] font-bold text-[var(--dim)]">{m ? `${px(m.mark ?? 0)} · ${m.longs + m.shorts}` : `${s?.total ?? 0}`}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative min-w-0">
            <Crag lanes={s?.lanes ?? []} markets={s?.markets} feed={s?.feed ?? []} selected={selLive?.id ?? null} onSelect={setSel} />
            {selLive && <ClimberCard c={selLive} onClose={() => setSel(null)} />}
            <p className="mt-2 text-[10px] font-bold tracking-[0.15em] text-[var(--dim)]">
              {base === "ALL" ? "ONE ROPE PER MARKET" : "LONGS AND SHORTS"} · {s ? s.lanes.reduce((a, l) => a + l.climbers.length, 0) : 0} OF {(s?.shown ?? 0).toLocaleString()} CLIMBERS SHOWN — EACH LANE&apos;S HIGHEST, THE ONE NEAREST THE FLOOR, AND THE HEAVIEST ROPES. TAP ONE TO TIE IN.
            </p>
          </div>
          <aside className="min-w-0">
            <div className="chamfer border p-3" style={{ borderColor: "var(--edge)", background: "var(--panel)" }}>
              <p className="mb-2 text-[10px] font-black tracking-[0.3em] text-[var(--dim)]">ON THE ROCK · LIVE</p>
              <ul className="space-y-1.5">
                {(s?.feed ?? []).slice(0, 16).map((f) => (
                  <li key={f.id} className="feed-in flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate">
                      <b style={{ color: f.kind === "fell" ? "var(--down)" : f.kind === "clipped" ? "var(--text)" : "var(--gold)" }}>
                        {f.kind === "fell" ? "FELL" : f.kind === "clipped" ? "ROPED UP" : "BAILED"}
                      </b>{" "}
                      <span className="text-[var(--dim)]">{f.ropes ?? short(f.account)}</span> {f.base}
                      {f.side === "UP" ? "▲" : "▼"}
                    </span>
                    <span className="tabular shrink-0 text-[var(--dim)]">
                      {f.kind === "bailed" && f.pnl !== undefined ? (
                        <b style={{ color: f.pnl >= 0 ? "var(--up)" : "var(--down)" }}>
                          {f.pnl >= 0 ? "+" : "−"}
                          {usd(Math.abs(f.pnl))}
                        </b>
                      ) : (
                        usd(f.notional)
                      )}{" "}
                      · {ago(f.at)}
                    </span>
                  </li>
                ))}
                {!s?.feed.length && <li className="text-[11px] text-[var(--dim)]">Listening to the MarginBank over Somnia Reactivity…</li>}
              </ul>
            </div>
            <Link
              href="/climb"
              className="chamfer mt-3 block border px-4 py-4 text-center"
              style={{ borderColor: "var(--gold)", background: "linear-gradient(180deg, #ffc94d22, #ffc94d08)" }}
            >
              <p className="display text-2xl text-[var(--gold)]">ROPE UP →</p>
              <p className="mt-1 text-[11px] text-[var(--dim)]">Climb a real perp with your dreamDEX account. Every BAIL counts toward your Perps Arena trades.</p>
            </Link>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "down" | "gold" }) {
  return (
    <div className="chamfer-sm border px-3 py-2" style={{ borderColor: "var(--edge)", background: "var(--panel)" }}>
      <p className="text-[9px] font-black tracking-[0.25em] text-[var(--dim)]">{label}</p>
      <p className="display tabular text-xl" style={{ color: tone === "down" ? "var(--down)" : tone === "gold" ? "var(--gold)" : "var(--text)" }}>
        {value}
      </p>
      {sub && <p className="text-[9px] font-bold text-[var(--dim)]">{sub}</p>}
    </div>
  );
}

function ClimberCard({ c, onClose }: { c: CragClimber; onClose: () => void }) {
  const up = c.side === "UP";
  return (
    <div
      className="chamfer absolute bottom-10 left-1/2 z-50 w-[min(92%,360px)] -translate-x-1/2 border p-4 sm:left-auto sm:right-4 sm:translate-x-0"
      style={{ borderColor: "var(--gold)", background: "#0d0a1cf2", boxShadow: "0 12px 48px #000" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black tracking-[0.3em] text-[var(--dim)]">{c.ropes ? `ROPES · ${c.ropes.name.toUpperCase()}` : short(c.account)}</p>
          <p className="display text-2xl">
            {c.base} <span style={{ color: up ? "var(--up)" : "var(--down)" }}>{up ? "▲ LONG" : "▼ SHORT"}</span>
          </p>
        </div>
        <button onClick={onClose} className="text-[var(--dim)]" aria-label="close">
          ✕
        </button>
      </div>
      <p className="display tabular mt-1 text-4xl" style={{ color: c.roe >= 0 ? "var(--up)" : "var(--down)" }}>
        {pct(c.roe)}
      </p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <Cell k="SIZE" v={`${Math.abs(c.size).toPrecision(4)}`} />
        <Cell k="ENTRY" v={px(c.entry)} />
        <Cell k="NOTIONAL" v={usd(c.notional)} />
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/climb?base=${c.base}&side=${c.side}&tie=${c.account}`}
          className="chamfer-sm py-2 text-center text-[12px] font-black tracking-[0.2em]"
          style={{ background: "var(--gold)", color: "#000" }}
        >
          TIE IN
        </Link>
        <Link href={`/c/${c.account}`} className="chamfer-sm border py-2 text-center text-[12px] font-black tracking-[0.2em]" style={{ borderColor: "var(--edge)" }}>
          WATCH
        </Link>
      </div>
      <p className="mt-2 text-[9px] text-[var(--dim)]">Tie in = open the same market and side on your own account, with your own stake and rope.</p>
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-black tracking-[0.2em] text-[var(--dim)]">{k}</dt>
      <dd className="tabular font-bold">{v}</dd>
    </div>
  );
}
