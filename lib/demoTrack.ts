/**
 * A 60-second synthetic backing track generated in the browser with the Web Audio API.
 * Original, royalty-free by construction — no copyrighted recordings anywhere in the suite.
 * Sections change texture so feedback like "the chorus is louder" makes sense:
 * intro (kick only) → verse (kick + bass) → chorus (adds snare, hats, pad) → outro (fade).
 */
import { DEMO_SECTIONS } from "./revisionNotes";

export const TRACK_SECONDS = 60;
const BPM = 100;

export function startDemoTrack(ctx: AudioContext, onEnd: () => void): { stop: () => void; startedAt: number } {
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;
  const beat = 60 / BPM;
  const chorusRoot = [110, 130.81, 164.81, 146.83]; // A C E D
  const verseRoot = [110, 110, 98, 98];

  const isChorus = (t: number) => DEMO_SECTIONS.some((s) => /Chorus/.test(s.name) && t >= s.start && t < s.end);
  const isIntro = (t: number) => t < 8;

  for (let i = 0; i * beat < TRACK_SECONDS; i++) {
    const t = t0 + i * beat;
    const rel = i * beat;
    const bar = Math.floor(i / 4);
    kick(ctx, master, t);
    if (!isIntro(rel) && i % 2 === 1) snare(ctx, master, t, isChorus(rel) ? 0.5 : 0.28);
    if (isChorus(rel)) { hat(ctx, master, t); hat(ctx, master, t + beat / 2); }
    if (!isIntro(rel)) {
      const roots = isChorus(rel) ? chorusRoot : verseRoot;
      bass(ctx, master, t, roots[bar % 4], beat * 0.9);
      if (isChorus(rel) && i % 4 === 0) pad(ctx, master, t, roots[bar % 4] * 2, beat * 4);
    }
  }
  master.gain.setValueAtTime(0.6, t0 + 56);
  master.gain.linearRampToValueAtTime(0.0001, t0 + TRACK_SECONDS);
  const timer = setTimeout(onEnd, TRACK_SECONDS * 1000 + 100);
  return { startedAt: t0, stop: () => { clearTimeout(timer); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); setTimeout(() => master.disconnect(), 300); } };
}

function kick(ctx: AudioContext, out: AudioNode, t: number) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.32);
}
function snare(ctx: AudioContext, out: AudioNode, t: number, level: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = level;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 1800;
  s.connect(f).connect(g).connect(out); s.start(t);
}
function hat(ctx: AudioContext, out: AudioNode, t: number) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = 0.12;
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
