"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CragClimber, FeedRow } from "./ui";
import { pct, short, usd } from "./ui";

/**
 * The Crag: every open perp position on dreamDEX drawn as a climber on one
 * wall. Height is the position's return on the margin the market asks for it,
 * on a log scale, so a double and a halving are the same distance of rock.
 * The floor is where the margin is gone. Liquidations stream in over Somnia
 * Reactivity and fall off the wall as they happen.
 */

/** Ledges, as return on margin. */
const LEDGES = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 1, 2, 5];
/**
 * Height is asinh of the return: near break-even it is linear, so a +5% and a
 * −5% climber visibly part ways, and far out it is logarithmic, so +500% still
 * fits on the rock. The floor is −100%: the margin the market asked for is gone.
 */
const K = 3;
const LO = Math.asinh(-K);
const HI = Math.asinh(5 * K);
export const heightPct = (roe: number) => 6 + ((Math.asinh(K * Math.max(-1, Math.min(5, roe))) - LO) / (HI - LO)) * 84;

/** Stable 0..1 from a string, so a climber keeps its line on the rock between polls. */
export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** The eight ROPES characters; crowd climbers take one by account so a trader always looks the same. */
export const ART = ["green", "red", "gold", "blue", "violet", "orange", "teal", "pink"] as const;
export const artFor = (account: string) => ART[Math.floor(hash01(account + "art") * ART.length)]!;

interface Faller {
  id: string;
  x: number;
  label: string;
  art: string;
  at: number;
}

export function Crag({
  climbers,
  feed,
  selected,
  onSelect,
  height = "clamp(460px, 68vh, 760px)",
}: {
  climbers: CragClimber[];
  feed: FeedRow[];
  selected: string | null;
  onSelect: (c: CragClimber | null) => void;
  height?: string;
}) {
  // Liquidations that arrived since the last frame drop off the wall.
  const seen = useRef<Set<string> | null>(null);
  const [fallers, setFallers] = useState<Faller[]>([]);
  useEffect(() => {
    const falls = feed.filter((f) => f.kind === "fell");
    if (!seen.current) {
      seen.current = new Set(falls.map((f) => f.id));
      return;
    }
    const fresh = falls.filter((f) => !seen.current!.has(f.id)).slice(0, 4);
    fresh.forEach((f) => seen.current!.add(f.id));
    if (!fresh.length) return;
    setFallers((xs) => [
      ...xs.filter((x) => Date.now() - x.at < 2600),
      ...fresh.map((f) => ({
        id: f.id,
        x: 8 + hash01(f.account) * 84,
        label: `${f.ropes ?? short(f.account)} · ${f.base} ${f.side === "UP" ? "▲" : "▼"} · ${usd(f.notional)}`,
        art: artFor(f.account),
        at: Date.now(),
      })),
    ]);
  }, [feed]);
  useEffect(() => {
    if (!fallers.length) return;
    const t = setTimeout(() => setFallers((xs) => xs.filter((x) => Date.now() - x.at < 2600)), 2700);
    return () => clearTimeout(t);
  }, [fallers]);

  // Spread climbers across the rock: a stable lane per id, nudged apart where two collide.
  const placed = useMemo(() => {
    const rows = climbers.map((c) => ({ c, x: 6 + hash01(c.id) * 88, y: heightPct(c.roe) }));
    rows.sort((a, b) => a.x - b.x);
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!;
      const b = rows[i]!;
      if (b.x - a.x < 2.6 && Math.abs(b.y - a.y) < 9) b.x = Math.min(95, a.x + 2.6);
    }
    return rows;
  }, [climbers]);

  return (
    <div
      className="ticks relative w-full overflow-hidden rounded-2xl border"
      style={{
        height,
        borderColor: "var(--edge)",
        background: "linear-gradient(180deg, #1c1738 0%, #131028 45%, #0b0917 100%)",
        boxShadow: "inset 0 2px 24px #000000cc",
      }}
      onClick={() => onSelect(null)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="stars-far absolute inset-0 opacity-70" />
        <div className="stars-near absolute inset-0 opacity-70" />
        <div className="nebula absolute inset-0 opacity-80" />
      </div>

      {/* the ground: where the margin is gone */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6%]" style={{ background: "linear-gradient(0deg, #ff2f5240, transparent)" }}>
        <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "var(--down)", boxShadow: "0 0 18px var(--down)" }} />
        <span className="absolute left-3 top-1.5 text-[9px] font-black tracking-[0.3em] text-[var(--down)]">−100% · MARGIN GONE · HANGING ON COLLATERAL</span>
      </div>

      {LEDGES.map((m) => (
        <div key={m} className="pointer-events-none absolute inset-x-0" style={{ bottom: `${heightPct(m)}%` }}>
          <div
            className="h-[2px] w-full"
            style={{
              background:
                m === 0
                  ? "repeating-linear-gradient(90deg, var(--gold) 0 10px, transparent 10px 20px)"
                  : "repeating-linear-gradient(90deg, #ffffff 0 6px, transparent 6px 16px)",
              opacity: m === 0 ? 0.6 : 0.12,
            }}
          />
          <span className={`tabular absolute right-3 -top-4 text-[9px] font-black tracking-[0.2em] ${m === 0 ? "glow-gold" : "text-[var(--dim)]"}`}>
            {m === 0 ? "BREAK EVEN" : `${m > 0 ? "+" : "−"}${Math.round(Math.abs(m) * 100)}%`}
          </span>
        </div>
      ))}

      {placed.map(({ c, x, y }) => {
        const mine = !!c.ropes;
        const on = selected === c.id;
        const up = c.side === "UP";
        const art = c.ropes?.art ?? artFor(c.account);
        const pose = c.roe > 1.5 ? "cheer" : c.roe < -0.6 ? "slip" : "climb";
        const h = mine ? 74 : on ? 66 : 48;
        return (
          <div key={c.id}>
            <div
              className="pointer-events-none absolute top-0 w-px"
              style={{
                left: `${x}%`,
                bottom: `${y}%`,
                background: up ? "linear-gradient(180deg, transparent, #00e58a66)" : "linear-gradient(180deg, transparent, #ff2f5266)",
                transition: "bottom 1.2s cubic-bezier(0.25,0.8,0.25,1)",
                opacity: on || mine ? 1 : 0.5,
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(on ? null : c);
              }}
              className="absolute flex -translate-x-1/2 flex-col items-center focus:outline-none"
              style={{
                left: `${x}%`,
                bottom: `calc(${y}% - ${Math.round(h * 0.55)}px)`,
                transition: "bottom 1.2s cubic-bezier(0.25,0.8,0.25,1)",
                zIndex: on ? 40 : mine ? 30 : Math.round(y),
              }}
              aria-label={`${c.base} ${c.side} ${pct(c.roe)}`}
            >
              <span
                className="tabular mb-0.5 whitespace-nowrap rounded px-1 py-[1px] text-[9px] font-black leading-none"
                style={
                  mine
                    ? { background: "var(--gold)", color: "#000" }
                    : { background: "#000000aa", color: c.roe >= 0 ? "var(--up)" : "var(--down)", border: on ? "1px solid var(--gold)" : "1px solid transparent" }
                }
              >
                {mine ? `${c.ropes!.name} ` : ""}
                {c.base}
                {up ? "▲" : "▼"} {pct(c.roe)}
              </span>
              <img
                src={`/climbers/${art}/${pose}.webp`}
                alt=""
                className={c.roe < -0.6 ? "hanging" : "dangling"}
                style={{
                  height: h,
                  width: "auto",
                  filter: on || mine ? "drop-shadow(0 0 12px var(--gold-glow))" : up ? "drop-shadow(0 0 6px #00e58a44)" : "drop-shadow(0 0 6px #ff2f5244)",
                  transform: up ? undefined : "scaleX(-1)",
                }}
              />
            </button>
          </div>
        );
      })}

      {fallers.map((f) => (
        <div key={f.id} className="crag-fall pointer-events-none absolute flex -translate-x-1/2 flex-col items-center" style={{ left: `${f.x}%`, zIndex: 50 }}>
          <span className="whitespace-nowrap rounded px-1.5 py-[1px] text-[9px] font-black" style={{ background: "var(--down)", color: "#000" }}>
            LIQUIDATED · {f.label}
          </span>
          <img src={`/climbers/${f.art}/fall.webp`} alt="" style={{ height: 60, width: "auto" }} />
        </div>
      ))}

      {!climbers.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black tracking-[0.3em] text-[var(--dim)]">ROPING UP THE WALL — READING EVERY POSITION FROM CHAIN…</span>
        </div>
      )}
    </div>
  );
}
