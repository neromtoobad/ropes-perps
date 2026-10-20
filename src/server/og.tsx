import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Fonts and sprites for share images, loaded once per process. */
const g = globalThis as unknown as { __ogFonts?: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> };

async function gfont(family: string, weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.24 (KHTML, like Gecko)" }, // ask for TTF, which satori reads
  }).then((r) => r.text());
  const url = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error(`no font url for ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

export function ogFonts() {
  return (g.__ogFonts ??= Promise.all([
    gfont("Russo One", 400).then((data) => ({ name: "Russo One", data, weight: 400 as const })),
    gfont("Chakra Petch", 700).then((data) => ({ name: "Chakra Petch", data, weight: 700 as const })),
  ]).catch((e) => {
    g.__ogFonts = undefined;
    throw e;
  }));
}

export function ogPng(name: string) {
  const buf = readFileSync(join(process.cwd(), "public", "og", `${name}.png`));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export const OG_SIZE = { width: 1200, height: 630 };
