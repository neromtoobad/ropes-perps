"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CragClimber } from "./api/state/route";

export type { CragClimber };

export interface MarketRow {
  base: string;
  pool: `0x${string}`;
  baseDec: number;
  tick: string;
  lot: string;
  min: string;
  imfBps: number;
  mmBps: number | null;
  mark: number | null;
  longs: number;
  shorts: number;
  oi: number;
}

export interface FeedRow {
  id: string;
  at: number;
  kind: "fell" | "clipped" | "topped" | "bailed";
  account: string;
  base: string;
  side: "UP" | "DOWN";
  notional: number;
  pnl?: number;
  ropes?: string;
}

export interface CragState {
  status: string;
  ready: boolean;
  events: number;
  markets: MarketRow[];
  climbers: CragClimber[];
  total: number;
  shown: number;
  feed: FeedRow[];
  falls24: number;
  watchingSince: number;
}

/** localStorage that never throws (blocked-cookie browsers throw on access). */
export const safeLocal = {
  get(k: string): string | null {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* forgets, still plays */
    }
  },
  remove(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 ? 1 : 0)}%`;
export const usd = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `$${(n / 1e3).toFixed(1)}k` : `$${n.toFixed(n >= 100 ? 0 : 2)}`;
export const px = (p: number) =>
  p >= 1000 ? p.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p >= 1 ? p.toFixed(3) : p.toPrecision(4);
export const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};

/** Poll an endpoint, keeping the last GOOD frame — one 500 must never blank the page. */
export function usePoll<T>(url: string | null, ms: number, valid: (x: any) => boolean) {
  const [data, setData] = useState<T | null>(null);
  const ok = useRef(valid);
  ok.current = valid;
  useEffect(() => {
    if (!url) return;
    let live = true;
    let t: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (live && ok.current(j)) setData(j);
        }
      } catch {
        /* keep the last frame */
      }
      if (live) t = setTimeout(run, document.hidden ? ms * 4 : ms);
    };
    run();
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [url, ms]);
  return data;
}

export function Header() {
  const path = usePathname();
  const tab = (href: string, label: string) => {
    const on = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link
        href={href}
        className="gametab px-2 py-1.5 text-[10px] font-black tracking-[0.2em] sm:px-3 sm:text-[11px] sm:tracking-[0.25em]"
        style={{ color: on ? "var(--gold)" : "var(--dim)", borderBottom: on ? "2px solid var(--gold)" : "2px solid transparent" }}
      >
        {label}
      </Link>
    );
  };
  return (
    <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/mark.webp" alt="" width={34} height={34} className="h-8 w-8" priority unoptimized />
        <span className="display hidden text-xl tracking-[0.12em] sm:inline">ROPES</span>
        <span className="rounded-sm px-1.5 py-[2px] text-[9px] font-black tracking-[0.25em]" style={{ background: "var(--gold)", color: "#000" }}>
          PERPS
        </span>
      </Link>
      <nav className="flex items-center">
        {tab("/", "CRAG")}
        {tab("/climb", "CLIMB")}
        {tab("/leaders", "LEADERS")}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-10 w-full max-w-[1400px] px-4 pb-8 text-[10px] font-bold leading-relaxed tracking-[0.15em] text-[var(--dim)]">
      EVERY CLIMBER IS A REAL OPEN POSITION ON DREAMDEX PERPS (SOMNIA HIDEKI TESTNET, CHAIN 50383), READ FROM THE MARGINBANK AND KEPT LIVE BY
      SOMNIA REACTIVITY. HEIGHT = RETURN ON THE MARGIN THE MARKET ASKS FOR THE POSITION. PAPER USDSO. NOT FINANCIAL ADVICE.
    </footer>
  );
}
