"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_SECTIONS, EXAMPLE_NOTES, type ProductionNote } from "@/lib/revisionNotes";
import { startDemoTrack, TRACK_SECONDS } from "@/lib/demoTrack";
import { listenContinuous, speechSupported } from "@/lib/browserSpeech";

/**
 * Revision Room — press play, talk over the track. Every remark is timestamped to
 * the playhead, mapped to a section, classified, and turned into a production note.
 * A typed box is always available so the session never depends on the microphone.
 */
export default function RevisionPage() {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [notes, setNotes] = useState<ProductionNote[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const trackRef = useRef<{ stop: () => void; startedAt: number } | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const posRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const ctx = ctxRef.current, tr = trackRef.current;
      if (!ctx || !tr) return;
      const p = Math.min(TRACK_SECONDS, ctx.currentTime - tr.startedAt);
      posRef.current = p; setPos(p);
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  const addRemark = async (text: string) => {
    const at = Math.round(posRef.current);
    setPending((p) => [...p, text]);
    const res = await fetch("/api/revision", { method: "POST", body: JSON.stringify({ transcript: text, atSeconds: at }) });
    const note = (await res.json()) as ProductionNote;
    setPending((p) => p.filter((x) => x !== text));
    setNotes((n) => [...n, note].sort((a, b) => a.atSeconds - b.atSeconds));
  };

  const play = () => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    ctx.resume();
    trackRef.current = startDemoTrack(ctx, stop);
    setSaved(null); setPlaying(true);
    if (speechSupported()) { stopListen.current = listenContinuous(addRemark); setMicOn(true); }
  };

  const stop = () => {
    trackRef.current?.stop(); trackRef.current = null;
    stopListen.current?.(); stopListen.current = null;
    setMicOn(false); setPlaying(false);
  };

  const save = async () => {
    const res = await fetch("/api/revision", { method: "POST", body: JSON.stringify({ save: true, notes, track: "demo-bed-60s" }) });
    const s = await res.json(); setSaved(s.sessionId);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const color = (v: ProductionNote["verdict"]) => (v === "keep" ? "var(--green)" : v === "change" ? "var(--accent)" : "var(--amber)");
  const bySection = DEMO_SECTIONS.map((s) => ({ s, ns: notes.filter((n) => n.section === s.name) })).filter((x) => x.ns.length);

  return (
    <main className="page">
      <div className="eyebrow">Create · F2 revision friction</div>
      <h1>Revision Room</h1>
      <p className="lede">Press play and talk. &ldquo;Verse two feels corny&rdquo; becomes a timestamped, prioritized production note — no email paragraphs to translate.</p>

      <section className="card stack" style={{ marginTop: 28 }}>
        <div className="row spread">
          <div className="row">
            {!playing ? <button className="btn btn-primary btn-lg" onClick={play}>▶ Play the draft</button> : <button className="btn btn-lg" onClick={stop}>■ Stop</button>}
            <span className="badge">{fmt(pos)} / {fmt(TRACK_SECONDS)}</span>
            {micOn && <span className="status"><span className="pulse" />listening while it plays</span>}
          </div>
          <div className="row">
            <button className="btn btn-sm btn-ghost" onClick={() => setNotes(EXAMPLE_NOTES)}>Load example session</button>
            <button className="btn btn-sm" disabled={!notes.length} onClick={save}>Save production notes</button>
            {saved && <span className="badge badge-live">saved {saved}</span>}
          </div>
        </div>
        <div className="timeline" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); posRef.current = ((e.clientX - r.left) / r.width) * TRACK_SECONDS; setPos(posRef.current); }}>
          {DEMO_SECTIONS.map((s) => <div key={s.name} className="section" style={{ left: `${(s.start / TRACK_SECONDS) * 100}%`, width: `${((s.end - s.start) / TRACK_SECONDS) * 100}%` }}>{s.name}</div>)}
          {notes.map((n) => <div key={n.noteId} className="marker" style={{ left: `${(n.atSeconds / TRACK_SECONDS) * 100}%`, background: color(n.verdict) }} title={n.transcript} />)}
          <div className="playhead" style={{ left: `${(pos / TRACK_SECONDS) * 100}%` }} />
        </div>
        <div className="row">
          <input className="input" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) { addRemark(typed.trim()); setTyped(""); } }} placeholder="…or type a remark at the current position (click the timeline to set it)" />
          <button className="btn" onClick={() => { if (typed.trim()) { addRemark(typed.trim()); setTyped(""); } }}>Add note</button>
        </div>
        {pending.map((p) => <div key={p} className="status"><span className="pulse" />classifying “{p}”…</div>)}
        <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>The draft is a synthetic 60-second bed generated in your browser — original audio, no recordings. In production this is the client&apos;s actual banger.</p>
      </section>

      <div className="split" style={{ marginTop: 20 }}>
        <section className="card stack">
          <h3>Production notes · {notes.length}</h3>
          {notes.length === 0 && <p style={{ color: "var(--faint)", margin: 0 }}>Nothing yet. Play and talk, type a remark, or load the example session.</p>}
          {bySection.map(({ s, ns }) => (
            <div key={s.name}>
              <div className="row spread" style={{ marginBottom: 4 }}><b>{s.name}</b><span className="badge">{fmt(s.start)}–{fmt(s.end)}</span></div>
              {ns.map((n) => (
                <div key={n.noteId} className="note">
                  <time>{fmt(n.atSeconds)}</time>
                  <div>
                    <div className="row" style={{ gap: 8 }}><span className="badge" style={{ color: color(n.verdict), borderColor: color(n.verdict) }}>{n.verdict}</span><span className="badge">{n.element}</span><span className="badge">{n.priority}</span></div>
                    <div style={{ marginTop: 6 }}>{n.action}</div>
                    <div style={{ color: "var(--faint)", fontSize: 13, marginTop: 2 }}>“{n.transcript}” · {n.classifiedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
        <aside className="card stack">
          <h3>Structured output</h3>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>What the producer receives instead of an email: one JSON list, sorted by song position, each item with a section, element, verdict, priority and action.</p>
          <pre className="json" style={{ maxHeight: 420 }}>{JSON.stringify(notes, null, 2)}</pre>
        </aside>
      </div>
    </main>
  );
}
