"use client";

import { useRef, useState } from "react";
import { recordClip, playClip, clipToWavBase64, type Clip } from "@/lib/micRecorder";
import { performBanger, TRACK_TITLE, type Cameo } from "@/lib/demoTrack";
import { SONG_SECTIONS } from "@/lib/bangerSong";
import { loadVocals, type VocalSet } from "@/lib/vocalPerformer";
import { TRANSCRIPT_RETENTION_DAYS } from "@/lib/consent";
import { AppHero } from "../AppHero";

/**
 * Company Choir (F4; revenue) — employees in the room shout the hook, one at a time, and the
 * banger plays back with all of them stacked on the chorus. The consent flow is built, not
 * mentioned: each person sees what is recorded, how it is used, how long it is kept, and how
 * to withdraw, before the microphone opens. Their voice is used as recorded — never cloned.
 */
const HOOK = "Expense it, don't stress it!";
const AUDIO_RETENTION_DAYS = 90;
const CONSENT_TEXT = `You will record yourself saying "${HOOK}" (about 2 seconds). The recording is placed on the chorus of your company's song and may appear in the finished banger. It is kept for ${AUDIO_RETENTION_DAYS} days after delivery, is never used to clone your voice or to make you say anything else, and you can withdraw before delivery by telling the Business Bangerz producer — your line is removed.`;

type Member = { name: string; clip: Clip; consentAt: string };

export default function ChoirPage() {
  const [client, setClient] = useState("Acme Logistics");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState({ recorded: false, used: false, retention: false });
  const [members, setMembers] = useState<Member[]>([]);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [level, setLevel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const perfRef = useRef<{ stop: () => void } | null>(null);
  const vocalsRef = useRef<VocalSet | null>(null);
  const ctx = () => (ctxRef.current ??= new AudioContext());
  const consented = agree.recorded && agree.used && agree.retention && name.trim().length > 0;

  const record = async () => {
    ctx().resume(); setRecording(true);
    for (let i = 3; i > 0; i--) { setCountdown(i); await new Promise((r) => setTimeout(r, 600)); }
    setCountdown(0);
    const clip = await recordClip(ctx(), 2.2, setLevel);
    setMembers((m) => [...m, { name: name.trim(), clip, consentAt: new Date().toISOString() }]);
    setRecording(false); setLevel(0); setName(""); setAgree({ recorded: false, used: false, retention: false });
    playClip(ctx(), clip);
  };

  /** Everyone lands together on the first beat of each chorus — a choir, not a queue. */
  const cameos = (): Cameo[] => SONG_SECTIONS.filter((s) => s.kind === "chorus").flatMap((s) => members.map((m) => ({ buffer: m.clip.buffer, at: s.start - 0.05, label: m.name })));

  const play = async () => {
    perfRef.current?.stop();
    if (!vocalsRef.current) vocalsRef.current = await loadVocals(ctx());
    perfRef.current = performBanger(ctx(), { from: SONG_SECTIONS[2].start - 2.4, vocals: vocalsRef.current, cameos: cameos(), onEnd: () => setPlaying(false) });
    setPlaying(true);
  };
  const stop = () => { perfRef.current?.stop(); perfRef.current = null; setPlaying(false); };

  const save = async () => {
    const res = await fetch("/api/sounds", { method: "POST", body: JSON.stringify({
      kind: "company-choir", client,
      record: { song: TRACK_TITLE, hook: HOOK, placement: "first beat of every chorus", members: members.map((m) => ({ name: m.name, durationMs: m.clip.durationMs, consent: { granted: true, grantedAt: m.consentAt, disclosure: CONSENT_TEXT, audioRetentionDays: AUDIO_RETENTION_DAYS, transcriptRetentionDays: TRANSCRIPT_RETENTION_DAYS, cloningAllowed: false, withdrawal: "Tell the producer before delivery; the line is removed." } })) },
      clips: members.map((m, i) => ({ name: `${i + 1}-${m.name}`, wavBase64: clipToWavBase64(m.clip) })),
    }) });
    setSaved((await res.json()).id);
  };

  return (
    <main className="page">
      <AppHero
        eyebrow="Create · fixes F4 participation logistics"
        title="Company Choir"
        what={`Pass the mic around the room. Each person says the hook once — "${HOOK}" — and the banger plays back with all of them on the chorus. Their voices, as recorded, with consent built in.`}
        impact={[
          { value: "10s", label: "per employee, no scheduling", tone: "blue" },
          { value: "+$", label: "'their people on it' upsell", tone: "red" },
          { value: "0", label: "voices cloned" },
        ]}
      />

      <div className="split" style={{ marginTop: 36 }}>
        <section className="card stack">
          <div className="row spread"><h2>Add your voice</h2><label className="field" style={{ maxWidth: 260 }}><span className="label">Client</span><input className="input" value={client} onChange={(e) => setClient(e.target.value)} /></label></div>
          <div className="callout callout-violet" style={{ fontSize: 17 }}>{CONSENT_TEXT}</div>
          <label className="field"><span className="label">Your name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dana" /></label>
          <label className="row" style={{ fontSize: 17 }}><input type="checkbox" checked={agree.recorded} onChange={(e) => setAgree({ ...agree, recorded: e.target.checked })} style={{ width: 22, height: 22 }} /> I agree to be recorded saying the hook.</label>
          <label className="row" style={{ fontSize: 17 }}><input type="checkbox" checked={agree.used} onChange={(e) => setAgree({ ...agree, used: e.target.checked })} style={{ width: 22, height: 22 }} /> My recording may be used in the finished song, as recorded — never cloned.</label>
          <label className="row" style={{ fontSize: 17 }}><input type="checkbox" checked={agree.retention} onChange={(e) => setAgree({ ...agree, retention: e.target.checked })} style={{ width: 22, height: 22 }} /> I understand it is kept {AUDIO_RETENTION_DAYS} days after delivery and I can withdraw before then.</label>
          <div className="bar"><div style={{ width: `${Math.min(100, (recording ? level : 0) * 140)}%`, background: "var(--accent)" }} /></div>
          <div className="row">
            <button className="btn btn-primary btn-lg" disabled={!consented || recording} onClick={record}>{recording ? (countdown ? `Say it in ${countdown}…` : "● Say it now!") : `● Record "${HOOK}"`}</button>
            {!consented && <span style={{ color: "var(--muted)" }}>Name + all three boxes unlock the microphone.</span>}
          </div>
        </section>

        <aside className="card card-sand stack">
          <div className="row spread"><h2>The choir · {members.length}</h2>{saved && <span className="badge badge-live">saved · {saved}</span>}</div>
          {members.length === 0 && <p style={{ margin: 0, color: "var(--muted)", fontSize: 17 }}>Nobody yet. First voice in the room goes here.</p>}
          {members.map((m, i) => (
            <div key={i} className="row spread" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{m.name}</span>
              <span className="row"><span className="badge badge-live">consented</span><span className="badge">{m.clip.durationMs} ms</span><button className="btn btn-sm btn-ghost" onClick={() => playClip(ctx(), m.clip)}>▶</button><button className="btn btn-sm btn-ghost" onClick={() => setMembers(members.filter((_, j) => j !== i))}>withdraw</button></span>
            </div>
          ))}
          <div className="divider" />
          <div className="row">
            {!playing ? <button className="btn btn-primary btn-lg" disabled={!members.length} onClick={play}>▶ Play the chorus with the choir</button> : <button className="btn btn-lg" onClick={stop}>■ Stop</button>}
            <button className="btn" disabled={!members.length || !!saved} onClick={save}>Save choir + consent records</button>
          </div>
          <p style={{ margin: 0, color: "var(--muted)" }}>Everyone lands on the first beat of every chorus, on top of the lead vocal.</p>
        </aside>
      </div>
    </main>
  );
}
