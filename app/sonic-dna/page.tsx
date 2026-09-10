"use client";

import { useRef, useState } from "react";
import { recordClip, playClip, clipToWavBase64, type Clip } from "@/lib/micRecorder";
import { performBanger, TRACK_TITLE, type DrumSamples } from "@/lib/demoTrack";
import { SONG_SECTIONS } from "@/lib/bangerSong";
import { AppHero } from "../AppHero";
import { loadVocals, type VocalSet } from "@/lib/vocalPerformer";

/**
 * Sonic DNA (F4; revenue) — the sounds of the client's workplace become the drum kit of their
 * banger. Record three hits (a forklift beep, a box drop, a keyboard), and the same song is
 * re-performed with them. A sonic signature that could only belong to that company, and a
 * premium tier Business Bangerz can charge for.
 */
type Slot = { role: keyof DrumSamples; title: string; hint: string; seconds: number };
const SLOTS: Slot[] = [
  { role: "kick", title: "Kick", hint: "Thump the desk, drop a box, stomp", seconds: 1.2 },
  { role: "snare", title: "Snare", hint: "Clap, slam a drawer, tap a mug", seconds: 1.2 },
  { role: "hat", title: "Hat", hint: "Keys, a stapler, a pen click", seconds: 1.0 },
];

export default function SonicDnaPage() {
  const [client, setClient] = useState("Acme Logistics");
  const [clips, setClips] = useState<Partial<Record<keyof DrumSamples, Clip & { label: string }>>>({});
  const [labels, setLabels] = useState<Record<string, string>>({ kick: "Box drop on the dock", snare: "Pallet jack clack", hat: "Scanner beep" });
  const [recording, setRecording] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const perfRef = useRef<{ stop: () => void } | null>(null);
  const vocalsRef = useRef<VocalSet | null>(null);
  const ctx = () => (ctxRef.current ??= new AudioContext());

  const record = async (slot: Slot) => {
    ctx().resume();
    setRecording(slot.role); setCountdown(3);
    for (let i = 3; i > 0; i--) { setCountdown(i); await new Promise((r) => setTimeout(r, 500)); }
    setCountdown(0);
    const clip = await recordClip(ctx(), slot.seconds, setLevel);
    setClips((c) => ({ ...c, [slot.role]: { ...clip, label: labels[slot.role] } }));
    setRecording(null); setLevel(0);
    playClip(ctx(), clip);
  };

  const play = async (from = 0, withOurs = true) => {
    perfRef.current?.stop();
    if (!vocalsRef.current) vocalsRef.current = await loadVocals(ctx());
    const samples: DrumSamples = withOurs ? { kick: clips.kick?.buffer, snare: clips.snare?.buffer, hat: clips.hat?.buffer } : {};
    perfRef.current = performBanger(ctx(), { from, drumSamples: samples, vocals: vocalsRef.current, onEnd: () => setPlaying(false) });
    setPlaying(true);
  };
  const stop = () => { perfRef.current?.stop(); perfRef.current = null; setPlaying(false); };

  const save = async () => {
    const recorded = SLOTS.filter((s) => clips[s.role]);
    const res = await fetch("/api/sounds", { method: "POST", body: JSON.stringify({
      kind: "sonic-signature", client,
      record: { song: TRACK_TITLE, samples: recorded.map((s) => ({ role: s.role, label: labels[s.role], durationMs: clips[s.role]!.durationMs, peak: clips[s.role]!.peak, recordedAt: clips[s.role]!.recordedAt, source: "recorded on this device by the person in the room" })) },
      clips: recorded.map((s) => ({ name: s.role, wavBase64: clipToWavBase64(clips[s.role]!) })),
    }) });
    setSaved((await res.json()).id);
  };

  const ready = Boolean(clips.kick || clips.snare || clips.hat);

  return (
    <main className="page">
      <AppHero
        eyebrow="Create · fixes F4 participation logistics"
        title="Sonic DNA"
        what="The sounds of the client's workplace become the drum kit of their banger. Three hits recorded in the room, and the same song plays back with a signature no other company could have."
        impact={[
          { value: "3", label: "sounds, 30 seconds to capture", tone: "blue" },
          { value: "+$", label: "premium 'signature' tier", tone: "red" },
          { value: "0", label: "studio hours" },
        ]}
      />

      <section className="card stack" style={{ marginTop: 36 }}>
        <div className="row spread">
          <label className="field" style={{ maxWidth: 360 }}><span className="label">Client</span><input className="input" value={client} onChange={(e) => setClient(e.target.value)} /></label>
          <div className="row">
            <button className="btn btn-sm btn-primary" disabled={!ready || !!saved} onClick={save}>Save sonic signature</button>
            {saved && <span className="badge badge-live">saved · {saved}</span>}
          </div>
        </div>
        <div className="grid grid-3">
          {SLOTS.map((s) => {
            const c = clips[s.role]; const isRec = recording === s.role;
            return (
              <div key={s.role} className="card card-sand stack" style={{ padding: 20 }}>
                <div className="row spread"><h2>{s.title}</h2>{c ? <span className="badge badge-live">{c.durationMs} ms</span> : <span className="badge">empty</span>}</div>
                <input className="input" value={labels[s.role]} onChange={(e) => setLabels({ ...labels, [s.role]: e.target.value })} placeholder="What is this sound?" />
                <p style={{ margin: 0, color: "var(--muted)" }}>{s.hint}</p>
                <div className="bar"><div style={{ width: `${Math.min(100, (isRec ? level : 0) * 140)}%`, background: "var(--accent)" }} /></div>
                <div className="row">
                  <button className="btn btn-primary" disabled={!!recording} onClick={() => record(s)}>{isRec ? (countdown ? `Recording in ${countdown}…` : "● Recording") : c ? "Re-record" : "● Record"}</button>
                  {c && <button className="btn btn-ghost" onClick={() => playClip(ctx(), c)}>▶ Hear it</button>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <div className="row">
          {!playing ? (
            <>
              <button className="btn btn-primary btn-lg" disabled={!ready} onClick={() => play(SONG_SECTIONS[2].start, true)}>▶ Play the chorus with {client}&apos;s sounds</button>
              <button className="btn btn-lg" onClick={() => play(SONG_SECTIONS[2].start, false)}>▶ Original chorus</button>
            </>
          ) : <button className="btn btn-lg" onClick={stop}>■ Stop</button>}
          <span className="badge">{TRACK_TITLE}</span>
        </div>
      </section>

      <section className="card stack" style={{ marginTop: 22 }}>
        <h2>What gets saved</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 17 }}>A sonic signature record: which workplace sound plays which drum, with duration, level, provenance and the song it was rendered into — reusable on every future banger for this client.</p>
        <pre className="json">{JSON.stringify({ client, song: TRACK_TITLE, samples: SLOTS.filter((s) => clips[s.role]).map((s) => ({ role: s.role, label: labels[s.role], durationMs: clips[s.role]!.durationMs, peak: clips[s.role]!.peak })) }, null, 2)}</pre>
      </section>
    </main>
  );
}
