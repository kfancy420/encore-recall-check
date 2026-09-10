/**
 * The vocalist. Lyric lines are pre-rendered by the macOS speech engine
 * (scripts/render-vocals.py — free, local, no downloads) and performed here in Web Audio:
 *  - verse and bridge lines are RAPPED: dropped exactly on the downbeat of their two bars
 *  - chorus and outro lines are SUNG: sliced into syllable-sized grains and pitch-shifted onto
 *    the hook melody with a granular shifter, so the words keep their timing but take the tune
 * Everything runs through a compressor and a slap delay so it sits in the mix like a vocal.
 */
import { ALL_LINES, SONG_SECTIONS, type LyricLine } from "./bangerSong";

export type VocalSet = { buffers: Map<number, AudioBuffer>; voice: string };

/** Hook melody per chorus line, in semitones relative to the spoken pitch. Eight notes per line. */
const CHORUS_MELODY = [
  [0, 3, 5, 3, 0, 3, 5, 7],
  [7, 5, 3, 5, 3, 0, -2, 0],
  [0, 3, 5, 3, 0, 3, 5, 7],
  [7, 5, 3, 0, -2, 0, 0, 0],
];
const OUTRO_MELODY = [0, 3, 5, 3, 0, 0];

export async function loadVocals(ctx: AudioContext): Promise<VocalSet | null> {
  try {
    const manifest = (await (await fetch("/vocals/manifest.json")).json()) as { voice: string; lines: { index: number; file: string }[] };
    const buffers = new Map<number, AudioBuffer>();
    const byFile = new Map<string, Promise<AudioBuffer>>();
    for (const l of manifest.lines) {
      if (!byFile.has(l.file)) byFile.set(l.file, fetch(l.file).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)));
      buffers.set(l.index, await byFile.get(l.file)!);
    }
    return { buffers, voice: manifest.voice };
  } catch {
    return null;
  }
}

/** Which line index in ALL_LINES a lyric is, and whether it is sung or rapped. */
export function lineStyle(line: LyricLine): { index: number; sung: boolean; melody: number[] | null } {
  const index = ALL_LINES.indexOf(line);
  const section = SONG_SECTIONS.find((s) => line.at >= s.start && line.at < s.end)!;
  if (section.kind === "chorus") return { index, sung: true, melody: CHORUS_MELODY[section.lines.indexOf(line) % 4] };
  if (section.kind === "outro") return { index, sung: true, melody: OUTRO_MELODY };
  return { index, sung: false, melody: null };
}

/** Granular pitch shift that keeps duration: resample each Hann-windowed grain, overlap-add. */
function pitchShift(input: Float32Array, semitones: number): Float32Array {
  const f = Math.pow(2, semitones / 12);
  const grain = 1024, hop = grain / 4;
  const out = new Float32Array(input.length);
  const win = new Float32Array(grain);
  for (let i = 0; i < grain; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / grain);
  for (let pos = 0; pos < input.length; pos += hop) {
    for (let i = 0; i < grain && pos + i < input.length; i++) {
      const src = pos + i * f;
      const j = Math.floor(src), frac = src - j;
      const a = input[j] ?? 0, b = input[j + 1] ?? 0;
      out[pos + i] += win[i] * (a + (b - a) * frac);
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= 1.5; // Hann at 75% overlap sums to 1.5
  return out;
}

/** Sing a spoken line: split the voiced part into as many slices as melody notes, shift each onto its note. */
export function renderSungLine(ctx: AudioContext, spoken: AudioBuffer, melody: number[]): AudioBuffer {
  const src = spoken.getChannelData(0);
  const sr = spoken.sampleRate;
  // Trim trailing silence so slices cover the words, not the tail.
  let end = src.length - 1; while (end > 0 && Math.abs(src[end]) < 0.01) end--;
  const len = end + 1;
  const out = ctx.createBuffer(1, spoken.length, sr);
  const o = out.getChannelData(0);
  const slice = Math.floor(len / melody.length);
  const xf = Math.floor(sr * 0.012);
  for (let n = 0; n < melody.length; n++) {
    const s = n * slice, e = n === melody.length - 1 ? len : (n + 1) * slice + xf;
    const shifted = pitchShift(src.subarray(s, Math.min(e, len)), melody[n]);
    for (let i = 0; i < shifted.length; i++) {
      const fadeIn = n === 0 ? 1 : Math.min(1, i / xf);
      const fadeOut = Math.min(1, (shifted.length - i) / xf);
      o[s + i] += shifted[i] * fadeIn * fadeOut;
    }
  }
  return out;
}

/** Build the vocal chain once per performance: compressor → dry + slap delay → destination gain. */
export function vocalChain(ctx: AudioContext, out: AudioNode): AudioNode {
  const input = ctx.createGain(); input.gain.value = 1.0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -22; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
  const dry = ctx.createGain(); dry.gain.value = 1.15;
  const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.3;
  const fb = ctx.createGain(); fb.gain.value = 0.22;
  const wet = ctx.createGain(); wet.gain.value = 0.16;
  const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 3200;
  input.connect(comp); comp.connect(dry).connect(out);
  comp.connect(delay); delay.connect(fb).connect(delay); delay.connect(tone).connect(wet).connect(out);
  return input;
}

export function scheduleLine(ctx: AudioContext, chain: AudioNode, vocals: VocalSet, line: LyricLine, when: number) {
  const { index, sung, melody } = lineStyle(line);
  const spoken = vocals.buffers.get(index);
  if (!spoken) return;
  const buffer = sung && melody ? renderSungLine(ctx, spoken, melody) : spoken;
  const s = ctx.createBufferSource(); s.buffer = buffer; s.connect(chain); s.start(when);
}
