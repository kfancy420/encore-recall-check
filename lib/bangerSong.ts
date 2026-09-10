/**
 * "Expense It, Don't Stress It" — the demo banger, written from the song brief:
 * required messages (Spendly app · within 7 days · photo of the receipt), the must-say hook,
 * no blame for the old process, and the word "audit" never appears.
 *
 * The song is data: sections, lyric lines, and timing. The browser performs it —
 * Web Audio for the band, the speech engine for the vocal — so it is original, royalty-free,
 * and can be re-rendered with an employee's own sounds (Sonic DNA) or voices (Company Choir).
 */

export const BPM = 100;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
/** Every lyric line gets two bars. */
export const LINE_SECONDS = BAR * 2;

export type SongSectionKind = "intro" | "verse" | "chorus" | "bridge" | "outro";
export type LyricLine = { text: string; at: number };
export type SongSection = { name: string; kind: SongSectionKind; start: number; end: number; lines: LyricLine[] };

const CHORUS = [
  "Expense it, don't stress it, drop it in the app",
  "Seven days, snap the receipt, that's a wrap",
  "Spendly's got you covered, no more inbox chase",
  "Expense it, don't stress it, put it in its place",
];

const RAW: { name: string; kind: SongSectionKind; lines: string[]; barsIfEmpty?: number }[] = [
  { name: "Intro", kind: "intro", lines: [], barsIfEmpty: 2 },
  { name: "Verse 1", kind: "verse", lines: [
    "Friday on the dock and the coffee's on me",
    "Fuel at the pump, got a crew of three",
    "Used to hold the paper till the end of the month",
    "Now I open Spendly and I'm done with the hunt",
  ] },
  { name: "Chorus", kind: "chorus", lines: CHORUS },
  { name: "Verse 2", kind: "verse", lines: [
    "Dispatch on the line, Dana's got a plan",
    "Photo of the receipt right there in her hand",
    "One week window so the money comes back",
    "Warehouse to the road, everybody on track",
  ] },
  { name: "Chorus 2", kind: "chorus", lines: CHORUS },
  { name: "Bridge", kind: "bridge", lines: [
    "No more digging through the truck for the slip",
    "Tap, snap, submit, that's the whole trip",
  ] },
  { name: "Chorus 3", kind: "chorus", lines: CHORUS },
  { name: "Outro", kind: "outro", lines: ["Expense it, don't stress it"], barsIfEmpty: 2 },
];

/** Lay the sections out on the timeline. */
export const SONG_SECTIONS: SongSection[] = (() => {
  let t = 0;
  return RAW.map((s) => {
    const length = s.lines.length ? s.lines.length * LINE_SECONDS : (s.barsIfEmpty ?? 2) * BAR;
    const section: SongSection = { name: s.name, kind: s.kind, start: t, end: t + length, lines: s.lines.map((text, i) => ({ text, at: t + i * LINE_SECONDS })) };
    t += length;
    return section;
  });
})();

export const SONG_SECONDS = SONG_SECTIONS[SONG_SECTIONS.length - 1].end;
export const SONG_TITLE = "Expense It, Don't Stress It";
export const ALL_LINES = SONG_SECTIONS.flatMap((s) => s.lines);
export const sectionAt = (t: number) => SONG_SECTIONS.find((s) => t >= s.start && t < s.end)?.name ?? "Outro";
export const sectionKindAt = (t: number) => SONG_SECTIONS.find((s) => t >= s.start && t < s.end)?.kind ?? "outro";

/** Revision Room listens while the song plays; the microphone hears the vocal too. Drop remarks that are really lyrics. */
export function isLyricEcho(text: string): boolean {
  const words = new Set(text.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter((w) => w.length > 2));
  if (words.size === 0) return true;
  return ALL_LINES.some((l) => {
    const lw = l.text.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter((w) => w.length > 2);
    const hits = lw.filter((w) => words.has(w)).length;
    return hits / Math.max(3, Math.min(lw.length, words.size)) >= 0.5;
  });
}
