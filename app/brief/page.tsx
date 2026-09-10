"use client";

import { useState, useRef } from "react";
import { BRIEF_INTERVIEW, assembleBriefFromAnswers, isBriefAnswerVague, type BriefAnswer, type BriefDraft } from "@/lib/bangerBrief";
import { speak, listenOnce, speechSupported } from "@/lib/browserSpeech";

/**
 * Banger Brief — the intake interview as a conversation, with the brief filling in live.
 * Voice in (browser STT), voice out (browser TTS), typed fallback always available.
 * One follow-up when an answer is vague; then the local model tidies the brief at the end.
 */

type Line = { who: "agent" | "you" | "system"; text: string };

export default function BriefPage() {
  const [client, setClient] = useState("");
  const [phase, setPhase] = useState<"start" | "interview" | "done">("start");
  const [lines, setLines] = useState<Line[]>([]);
  const [answers, setAnswers] = useState<BriefAnswer[]>([]);
  const [draft, setDraft] = useState<BriefDraft>(assembleBriefFromAnswers([]));
  const [status, setStatus] = useState("");
  const [typed, setTyped] = useState("");
  const [voice, setVoice] = useState(true);
  const [result, setResult] = useState<{ briefId: string; refinedBy: string; brief: BriefDraft } | null>(null);
  const resolver = useRef<((t: string) => void) | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  const say = (who: Line["who"], text: string) => setLines((l) => [...l, { who, text }]);

  const ask = (text: string) => { say("agent", text); return voice ? speak(text) : Promise.resolve(); };

  const answer = (): Promise<string> =>
    new Promise((resolve) => {
      let done = false;
      const finish = (t: string) => { if (done) return; done = true; cancel.current?.(); resolver.current = null; setStatus(""); if (t) say("you", t); resolve(t); };
      resolver.current = finish;
      if (!voice || !speechSupported()) { setStatus("Type your answer"); return; }
      setStatus("Listening — or type below");
      const h = listenOnce(9000); cancel.current = h.cancel;
      h.result.then((t) => { if (!done && t.trim()) finish(t); else if (!done) setStatus("Didn't catch that — say it again or type below"); });
      // second chance on silence
      h.result.then((t) => { if (!t.trim() && !done) { const h2 = listenOnce(9000); cancel.current = h2.cancel; h2.result.then((t2) => finish(t2)); } });
    });

  const run = async (useVoice: boolean) => {
    setVoice(useVoice); setPhase("interview");
    const collected: BriefAnswer[] = [];
    await ask(`Hi — I'm the Banger Brief. Five quick questions and your writer gets a real brief${client ? ` for ${client}` : ""}.`);
    for (const q of BRIEF_INTERVIEW) {
      await ask(q.question);
      const first = await answer();
      const a: BriefAnswer = { id: q.id, transcript: first };
      if (isBriefAnswerVague(first)) { say("system", "vague — asking a follow-up"); await ask(q.followUp); a.followUpTranscript = await answer(); }
      collected.push(a); setAnswers([...collected]); setDraft(assembleBriefFromAnswers(collected));
    }
    await ask("That's the brief. Sending it to the writer now.");
    setStatus("Tidying the brief with the local model…");
    const res = await fetch("/api/brief", { method: "POST", body: JSON.stringify({ client, answers: collected }) });
    const rec = await res.json();
    setResult(rec); setDraft(rec.brief); setStatus(""); setPhase("done");
  };

  const send = () => { const t = typed.trim(); if (t && resolver.current) { setTyped(""); resolver.current(t); } };

  return (
    <main className="page">
      <div className="eyebrow">Listen · F1 intake quality · F6 reusable memory</div>
      <h1>Banger Brief</h1>
      <p className="lede">An interview instead of a form. It probes for the behavior change behind the request, captures must-say phrases and pronunciations, and hands the writer a brief they can use.</p>

      {phase === "start" && (
        <section className="card stack" style={{ marginTop: 28, maxWidth: 720 }}>
          <label className="field"><span className="label">Client (fictional)</span><input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Acme Logistics" /></label>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => run(true)}>Start by voice</button>
            <button className="btn btn-lg" onClick={() => run(false)}>Start by typing</button>
          </div>
          <p style={{ color: "var(--faint)", fontSize: 13, margin: 0 }}>About a minute. Audio is transcribed in your browser and never stored.</p>
        </section>
      )}

      {phase !== "start" && (
        <div className="split" style={{ marginTop: 28 }}>
          <section className="card stack">
            <div className="chat">{lines.map((l, i) => <div key={i} className={`bubble bubble-${l.who}`}>{l.text}</div>)}</div>
            {status && <div className="status"><span className="pulse" />{status}</div>}
            {phase === "interview" && (
              <div className="row"><input className="input" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="…or type your answer" /><button className="btn" onClick={send}>Send</button></div>
            )}
            {phase === "done" && result && (
              <div className="row"><span className="badge badge-live">saved {result.briefId}</span><span className="badge">refined by {result.refinedBy}</span><a className="btn btn-ghost btn-sm" href="/brief">New interview</a></div>
            )}
          </section>
          <BriefPanel d={draft} answered={answers.length} />
        </div>
      )}
    </main>
  );
}

function BriefPanel({ d, answered }: { d: BriefDraft; answered: number }) {
  const list = (a: string[]) => (a.length ? a.map((x, i) => <li key={i}>{x}</li>) : <li style={{ color: "var(--faint)" }}>—</li>);
  return (
    <aside className="card stack">
      <div className="row spread"><h3>Song brief</h3><span className="badge">{answered}/{BRIEF_INTERVIEW.length} answered</span></div>
      <dl className="kv">
        <dt>Objective</dt><dd>{d.objective || <span style={{ color: "var(--faint)" }}>—</span>}</dd>
        <dt>Behavior change</dt><dd>{d.behaviorChange || <span style={{ color: "var(--faint)" }}>—</span>}</dd>
        <dt>Required messages</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{list(d.requiredMessages)}</ul></dd>
        <dt>Stories</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{list(d.stories)}</ul></dd>
        <dt>Audience</dt><dd>{d.audience || <span style={{ color: "var(--faint)" }}>—</span>}</dd>
        <dt>Must say</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{list(d.mustSay)}</ul></dd>
        <dt>Avoid</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{list(d.banned)}</ul></dd>
        <dt>Pronunciations</dt><dd>{Object.keys(d.pronunciations).length ? Object.entries(d.pronunciations).map(([k, v]) => <div key={k}><b>{k}</b> → {v}</div>) : <span style={{ color: "var(--faint)" }}>—</span>}</dd>
        <dt>Tone</dt><dd>{d.tone || <span style={{ color: "var(--faint)" }}>—</span>}</dd>
        <dt>References</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{list(d.references)}</ul></dd>
      </dl>
      <details><summary>JSON</summary><pre className="json">{JSON.stringify(d, null, 2)}</pre></details>
    </aside>
  );
}
