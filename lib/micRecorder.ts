/**
 * Microphone capture for Sonic DNA and Company Choir: record a short clip, decode it to an
 * AudioBuffer, trim the silence before the first hit, and normalize. Audio stays in the browser
 * unless the person explicitly saves it (and the consent record says so).
 */
export type Clip = { buffer: AudioBuffer; durationMs: number; peak: number; recordedAt: string };

export async function recordClip(ctx: AudioContext, seconds: number, onLevel?: (level: number) => void): Promise<Clip> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  // Level meter so the person can see the mic is live.
  const src = ctx.createMediaStreamSource(stream); const an = ctx.createAnalyser(); an.fftSize = 512; src.connect(an);
  const data = new Uint8Array(an.fftSize);
  const meter = setInterval(() => { an.getByteTimeDomainData(data); let m = 0; for (const v of data) m = Math.max(m, Math.abs(v - 128) / 128); onLevel?.(m); }, 60);
  rec.start();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  rec.stop(); await stopped;
  clearInterval(meter); stream.getTracks().forEach((t) => t.stop()); src.disconnect();
  const raw = await ctx.decodeAudioData(await new Blob(chunks, { type: rec.mimeType }).arrayBuffer());
  return trimAndNormalize(ctx, raw);
}

function trimAndNormalize(ctx: AudioContext, raw: AudioBuffer): Clip {
  const ch = raw.getChannelData(0);
  let peak = 0; for (let i = 0; i < ch.length; i++) peak = Math.max(peak, Math.abs(ch[i]));
  const threshold = Math.max(0.02, peak * 0.15);
  let start = 0; while (start < ch.length && Math.abs(ch[start]) < threshold) start++;
  start = Math.max(0, start - Math.floor(raw.sampleRate * 0.005));
  let end = ch.length - 1; while (end > start && Math.abs(ch[end]) < threshold * 0.5) end--;
  end = Math.min(ch.length, end + Math.floor(raw.sampleRate * 0.15));
  const len = Math.max(1, end - start);
  const out = ctx.createBuffer(1, len, raw.sampleRate);
  const o = out.getChannelData(0);
  const gain = peak > 0 ? 0.95 / peak : 1;
  for (let i = 0; i < len; i++) o[i] = ch[start + i] * gain;
  return { buffer: out, durationMs: Math.round((len / raw.sampleRate) * 1000), peak: Number(peak.toFixed(3)), recordedAt: new Date().toISOString() };
}

export function playClip(ctx: AudioContext, clip: Clip) {
  const s = ctx.createBufferSource(); s.buffer = clip.buffer; s.connect(ctx.destination); s.start();
}

/** 16-bit mono WAV, base64 — small enough to save beside the structured record. */
export function clipToWavBase64(clip: Clip): string {
  const ch = clip.buffer.getChannelData(0); const sr = clip.buffer.sampleRate;
  const buf = new ArrayBuffer(44 + ch.length * 2); const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + ch.length * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, ch.length * 2, true);
  for (let i = 0; i < ch.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, ch[i])) * 32767, true);
  let bin = ""; const bytes = new Uint8Array(buf); for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
