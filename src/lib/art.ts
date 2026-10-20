/** Stable 0..1 from a string. */
export function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** The eight ROPES characters; a crowd climber takes one by account so a trader always looks the same. */
export const ART = ["green", "red", "gold", "blue", "violet", "orange", "teal", "pink"] as const;
export const artFor = (account: string) => ART[Math.floor(hash01(account + "art") * ART.length)]!;
