/**
 * The band. Performs "Expense It, Don't Stress It" in the browser with the Web Audio API:
 * drums, bass, chord pad in the choruses, a lead line, and the lyric vocal delivered by the
 * speech engine, timed to the bars. Original by construction — no recordings of anyone,
 * no copyrighted audio.
 *
 * The performance is re-renderable: Sonic DNA swaps the drum hits for sounds recorded at the
 * client's workplace; Company Choir drops consented employee voices onto the chorus tags.
 */
import { BAR, BEAT, SONG_SECONDS, SONG_SECTIONS, ALL_LINES, sectionKindAt, type LyricLine } from "./bangerSong";
import { speak, stopSpeaking } from "./browserSpeech";
import { scheduleLine, vocalChain, type VocalSet } from "./vocalPerformer";

export const TRACK_SECONDS = SONG_SECONDS;
export const TRACK_TITLE = "Expense It, Don't Stress It — Draft 2";

export type DrumSamples = { kick?: AudioBuffer; snare?: AudioBuffer; hat?: AudioBuffer };
export type Cameo = { buffer: AudioBuffer; at: number; label: string };
export type PerformanceOptions = {
  vocal?: boolean;
  /** Pre-rendered vocal lines (loadVocals). Without them the speech engine speaks the lines live. */
  vocals?: VocalSet | null;
  drumSamples?: DrumSamples;
  cameos?: Cameo[];
  onLine?: (line: LyricLine) => void;
  onEnd?: () => void;
  /** Start from this many seconds in (skips what came before). */
  from?: number;
};

export function performBanger(ctx: AudioContext, opts: PerformanceOptions = {}): { stop: () => void; startedAt: number; offset: number } {
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const offset = opts.from ?? 0;
  const t0 = ctx.currentTime + 0.08 - offset; // song-time 0 in context time
  const chorusRoot = [110, 130.81, 164.81, 146.83]; // A C E D
  const verseRoot = [110, 110, 98, 98];
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (let i = 0; i * BEAT < SONG_SECONDS; i++) {
    const rel = i * BEAT;
    if (rel < offset - 0.01) continue;
    const t = t0 + rel;
    const kind = sectionKindAt(rel);
    const bar = Math.floor(i / 4);
    const big = kind === "chorus" || kind === "bridge";
    hit(ctx, master, t, opts.drumSamples?.kick, () => kick(ctx, master, t), 0.9);
    if (kind !== "intro" && i % 2 === 1) hit(ctx, master, t, opts.drumSamples?.snare, () => snare(ctx, master, t, big ? 0.5 : 0.3), 0.7);
    if (big) { hit(ctx, master, t, opts.drumSamples?.hat, () => hat(ctx, master, t), 0.25); hit(ctx, master, t + BEAT / 2, opts.drumSamples?.hat, () => hat(ctx, master, t + BEAT / 2), 0.2); }
    if (kind !== "intro") {
      const roots = big ? chorusRoot : verseRoot;
      bass(ctx, master, t, roots[bar % 4], BEAT * 0.9);
      if (big && i % 4 === 0) pad(ctx, master, t, roots[bar % 4] * 2, BAR);
      const hook = big ? [4, 4, 7, 9, 7, 4, 2, 0] : [0, -1, 0, -1, 2, -1, 0, -1];
      const step = hook[i % 8];
      if (step >= 0 && !(opts.vocal !== false && kind !== "outro")) lead(ctx, master, t, roots[bar % 4] * 4 * Math.pow(2, step / 12), BEAT * (big ? 0.9 : 0.5), big ? 0.16 : 0.1);
    }
  }

  // Vocal. Rendered lines are rapped/sung on the downbeat through the vocal chain;
  // otherwise the speech engine speaks each line live (staggered a little ahead of the beat).
  if (opts.vocal !== false) {
    const chain = opts.vocals ? vocalChain(ctx, master) : null;
    for (const line of ALL_LINES) {
      if (line.at < offset - 0.01) continue;
      if (opts.vocals && chain) {
        scheduleLine(ctx, chain, opts.vocals, line, t0 + line.at);
        timers.push(setTimeout(() => opts.onLine?.(line), Math.max(0, (line.at - offset) * 1000)));
      } else {
        timers.push(setTimeout(() => { opts.onLine?.(line); speak(line.text, 1.15); }, Math.max(0, (line.at - offset) * 1000 - 120)));
      }
    }
  }

  // Cameos: consented employee voices dropped onto the timeline (Company Choir).
  for (const c of opts.cameos ?? []) {
    if (c.at < offset) continue;
    const s = ctx.createBufferSource(); s.buffer = c.buffer; const g = ctx.createGain(); g.gain.value = 1.0;
    s.connect(g).connect(master); s.start(t0 + c.at);
  }

  master.gain.setValueAtTime(0.55, t0 + SONG_SECONDS - 3);
  master.gain.linearRampToValueAtTime(0.0001, t0 + SONG_SECONDS);
  timers.push(setTimeout(() => opts.onEnd?.(), (SONG_SECONDS - offset) * 1000 + 100));
  return {
    startedAt: t0, offset,
    stop: () => { timers.forEach(clearTimeout); stopSpeaking(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => master.disconnect(), 300); },
  };
}

/** Play a recorded sample if one was provided, otherwise the synthesized hit. */
function hit(ctx: AudioContext, out: AudioNode, t: number, sample: AudioBuffer | undefined, synth: () => void, level: number) {
  if (!sample) return synth();
  const s = ctx.createBufferSource(); s.buffer = sample; const g = ctx.createGain(); g.gain.value = level;
  s.connect(g).connect(out); s.start(t);
}

function kick(ctx: AudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
}
function noise(ctx: AudioContext, seconds: number, decay: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, decay);
  return buf;
}
function snare(ctx: AudioContext, out: AudioNode, t: number, level: number) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx, 0.2, 2); const g = ctx.createGain(); g.gain.value = level;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800;
  s.connect(f).connect(g).connect(out); s.start(t);
}
function hat(ctx: AudioContext, out: AudioNode, t: number) {
  const s = ctx.createBufferSource(); s.buffer = noise(ctx, 0.05, 1); const g = ctx.createGain(); g.gain.value = 0.12;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
  s.connect(f).connect(g).connect(out); s.start(t);
}
function bass(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number) {
  const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq / 2;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(120, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur);
}
function pad(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number) {
  for (const mult of [1, 1.25, 1.5]) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = freq * mult;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur);
  }
}
function lead(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number, level: number) {
  const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = freq;
  const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2200;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
}

export { SONG_SECTIONS };
