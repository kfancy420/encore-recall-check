/**
 * Browser speech — the audio layer for every app in the suite (MR-1), with no paid APIs:
 *  - speak():      agent voice via the browser's speechSynthesis (OR-2)
 *  - listenOnce(): one utterance transcribed by the browser's SpeechRecognition (OR-1);
 *                  resolves "" on silence so callers can retry or fall back (OR-4)
 *  - listenContinuous(): streaming final transcripts, used by Revision Room while a track plays
 */

type RecognitionResultEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = () => recognitionCtor() !== null;

export function speak(text: string, rate = 1.06): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => /en[-_]US/i.test(v.lang) && /Samantha|Google US English|Aria|Ava/i.test(v.name)) ?? voices.find((v) => /en[-_]US/i.test(v.lang));
    if (voice) u.voice = voice;
    u.rate = rate;
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    u.onend = done; u.onerror = done;
    window.speechSynthesis.speak(u);
    setTimeout(done, Math.max(4000, text.length * 90)); // safety: never hang the conversation
  });
}

export function stopSpeaking() { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }

export function listenOnce(timeoutMs = 7000): { result: Promise<string>; cancel: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.resolve(""), cancel: () => {} };
  const rec = new Ctor();
  rec.lang = "en-US"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
  let finished = false;
  let resolveFn: (t: string) => void = () => {};
  const result = new Promise<string>((resolve) => { resolveFn = resolve; });
  const finish = (t: string) => { if (!finished) { finished = true; resolveFn(t); } };
  rec.onresult = (e) => finish(e.results[0][0].transcript);
  rec.onerror = () => finish("");
  rec.onend = () => finish("");
  try { rec.start(); } catch { finish(""); }
  const timer = setTimeout(() => { try { rec.stop(); } catch {} }, timeoutMs);
  return { result, cancel: () => { clearTimeout(timer); try { rec.abort(); } catch {} finish(""); } };
}

/** Keep listening and hand back each final phrase as it lands. Returns a stop function. */
export function listenContinuous(onPhrase: (text: string) => void): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) return () => {};
  const rec = new Ctor();
  rec.lang = "en-US"; rec.interimResults = false; rec.continuous = true; rec.maxAlternatives = 1;
  let stopped = false;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal && r[0].transcript.trim()) onPhrase(r[0].transcript.trim());
    }
  };
  rec.onerror = () => {};
  rec.onend = () => { if (!stopped) { try { rec.start(); } catch {} } }; // Chrome ends sessions periodically; keep going
  try { rec.start(); } catch {}
  return () => { stopped = true; try { rec.stop(); } catch {} };
}
