"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE_NOTES, type ProductionNote } from "@/lib/revisionNotes";
import { performBanger, TRACK_SECONDS, TRACK_TITLE } from "@/lib/demoTrack";
import { SONG_SECTIONS, isLyricEcho, type LyricLine } from "@/lib/bangerSong";
import { listenContinuous, speechSupported } from "@/lib/browserSpeech";
import { AppHero } from "../AppHero";

/**
 * Revision Room — press play, talk over the banger. Every remark is timestamped to the
 * playhead, mapped to a section, classified, and turned into a production note.
 * The song's own vocal is heard by the microphone too, so lyric echoes are filtered out.
 */
export default function RevisionPage() {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [line, setLine] = useState<LyricLine | null>(null);
  const [notes, setNotes] = useState<ProductionNote[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const perfRef = useRef<{ stop: () => void; startedAt: number } | null>(null);
  const stopListen = useRef<(() => void) | null>(null);
  const posRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const ctx = ctxRef.current, p = perfRef.current;
      if (!ctx || !p) return;
      const t = Math.min(TRACK_SECONDS, ctx.currentTime - p.startedAt);
      posRef.current = t; setPos(t);
    }, 100);
    return () => clearInterval(id);
  }, [playing]);

  const addRemark = async (text: string) => {
    if (isLyricEcho(text)) return; // that was the song, not the client
    const at = Math.round(posRef.current);
    setPending((p) => [...p, text]);
    const res = await fetch("/api/revision", { method: "POST", body: JSON.stringify({ transcript: text, atSeconds: at }) });
    const note = (await res.json()) as ProductionNote;
    setPending((p) => p.filter((x) => x !== text));
    setNotes((n) => [...n, note].sort((a, b) => a.atSeconds - b.atSeconds));
  };

  const play = (from = posRef.current >= TRACK_SECONDS - 1 ? 0 : posRef.current) => {
    perfRef.current?.stop();
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx; ctx.resume();
    perfRef.current = performBanger(ctx, { from, onLine: setLine, onEnd: stop });
    setSaved(null); setPlaying(true);
    if (!stopListen.current && speechSupported()) { stopListen.current = listenContinuous(addRemark); setMicOn(true); }
  };

  const stop = () => {
    perfRef.current?.stop(); perfRef.current = null;
    stopListen.current?.(); stopListen.current = null;
    setMicOn(false); setPlaying(false); setLine(null);
  };

  const seek = (t: number) => { posRef.current = t; setPos(t); if (playing) play(t); };

  const save = async () => {
    const res = await fetch("/api/revision", { method: "POST", body: JSON.stringify({ save: true, notes, track: TRACK_TITLE }) });
    const s = await res.json(); setSaved(s.sessionId);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const color = (v: ProductionNote["verdict"]) => (v === "keep" ? "var(--green)" : v === "change" ? "var(--accent)" : "var(--amber)");
  const bySection = SONG_SECTIONS.map((s) => ({ s, ns: notes.filter((n) => n.section === s.name) })).filter((x) => x.ns.length);

  return (
    <main className="page">
      <AppHero
        eyebrow="Step 2 · Create · fixes F2 revision friction"
        title="Revision Room"
        what={`The client presses play and talks over the draft. "Verse two feels corny" becomes a note pinned to the second it was said, tagged lyrics, marked change, with an action the producer can execute.`}
        impact={[
          { value: "0", label: "emails to decode", tone: "blue" },
          { value: "−2", label: "revision rounds per banger", tone: "red" },
          { value: "1 list", label: "sorted by song position" },
        ]}
      />

      <section className="card stack" style={{ marginTop: 36 }}>
        <div className="row spread">
          <div><div className="label">Now reviewing</div><div style={{ fontSize: 26, fontWeight: 800 }}>{TRACK_TITLE}</div></div>
          <div className="row">
            <button className="btn btn-sm btn-ghost" onClick={() => setNotes(EXAMPLE_NOTES)}>Load last session</button>
            <button className="btn btn-sm btn-primary" disabled={!notes.length} onClick={save}>Send notes to the producer</button>
            {saved && <span className="badge badge-live">sent · {saved}</span>}
          </div>
        </div>
        <div className="row">
          {!playing ? <button className="btn btn-primary btn-lg" onClick={() => play()}>▶ Play and talk</button> : <button className="btn btn-lg" onClick={stop}>■ Stop</button>}
          <button className="btn btn-ghost" onClick={() => seek(0)}>⟲ Start</button>
          <button className="btn btn-ghost" onClick={() => seek(SONG_SECTIONS[2].start)}>Chorus</button>
          <button className="btn btn-ghost" onClick={() => seek(SONG_SECTIONS[3].start)}>Verse 2</button>
          <span className="badge">{fmt(pos)} / {fmt(TRACK_SECONDS)}</span>
          {micOn && <span className="status"><span className="pulse" />listening while it plays</span>}
        </div>
        <div className="timeline" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * TRACK_SECONDS); }}>
          {SONG_SECTIONS.map((s) => <div key={s.name} className="section" style={{ left: `${(s.start / TRACK_SECONDS) * 100}%`, width: `${((s.end - s.start) / TRACK_SECONDS) * 100}%` }}>{s.name}</div>)}
          {notes.map((n) => <div key={n.noteId} className="marker" style={{ left: `${(n.atSeconds / TRACK_SECONDS) * 100}%`, background: color(n.verdict) }} title={n.transcript} />)}
          <div className="playhead" style={{ left: `${(pos / TRACK_SECONDS) * 100}%` }} />
        </div>
        <div className="card card-sand" style={{ padding: "18px 22px", minHeight: 76 }}>
          <div className="label">Lyric</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{line ? line.text : playing ? "…" : "Press play to hear the draft."}</div>
        </div>
        <div className="row">
          <input className="input" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) { addRemark(typed.trim()); setTyped(""); } }} placeholder="…or type a remark at the current position" />
          <button className="btn" onClick={() => { if (typed.trim()) { addRemark(typed.trim()); setTyped(""); } }}>Add note</button>
        </div>
        {pending.map((p) => <div key={p} className="status"><span className="pulse" />classifying “{p}”…</div>)}
      </section>

      <div className="split" style={{ marginTop: 22 }}>
        <section className="card stack">
          <h2>Production notes · {notes.length}</h2>
          {notes.length === 0 && <p className="big" style={{ color: "var(--muted)", margin: 0 }}>Press play and say what you think. Every remark lands here, pinned to the second you said it.</p>}
          {bySection.map(({ s, ns }) => (
            <div key={s.name}>
              <div className="row spread" style={{ marginBottom: 4 }}><b style={{ fontSize: 18 }}>{s.name}</b><span className="badge">{fmt(s.start)}–{fmt(s.end)}</span></div>
              {ns.map((n) => (
                <div key={n.noteId} className="note">
                  <time>{fmt(n.atSeconds)}</time>
                  <div>
                    <div className="row" style={{ gap: 8 }}><span className="badge" style={{ color: color(n.verdict), borderColor: color(n.verdict) }}>{n.verdict}</span><span className="badge">{n.element}</span><span className="badge">{n.priority}</span></div>
                    <div className="action">{n.action}</div>
                    <div style={{ color: "var(--faint)", fontSize: 14, marginTop: 2 }}>“{n.transcript}” · {n.classifiedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
        <aside className="card card-sand stack">
          <h2>What the producer gets</h2>
          <p style={{ color: "var(--muted)", margin: 0, fontSize: 17 }}>One list instead of an email: sorted by song position, each item with a section, element, keep/change verdict, priority and action.</p>
          <pre className="json" style={{ maxHeight: 420 }}>{JSON.stringify(notes, null, 2)}</pre>
        </aside>
      </div>
    </main>
  );
}
