"use client";

import Link from "next/link";

import { useState, useRef, useEffect } from "react";
import { BRIEF_INTERVIEW, assembleBriefFromAnswers, isBriefAnswerVague, type BriefAnswer, type BriefDraft, type BriefContext } from "@/lib/bangerBrief";
import { speak, listenOnce, speechSupported } from "@/lib/browserSpeech";
import { AppHero } from "../AppHero";

/**
 * Banger Brief — the intake interview as a 60-second conversation, with the brief filling in live.
 * The client types the two things they already know (what's coming up, who it's for) and the
 * agent spends its three questions on what a form never gets: the behavior change, the exact
 * language, and the sound. One follow-up when an answer is vague; the local model tidies the brief.
 */

type Line = { who: "agent" | "you" | "system"; text: string };

export default function BriefPage() {
  const [ctx, setCtx] = useState<BriefContext>({ client: "Acme Logistics", topic: "New expense process (Spendly) rolling out in Q4", audience: "340 warehouse staff and drivers, on their phones" });
  const [phase, setPhase] = useState<"start" | "interview" | "done">("start");
  const [lines, setLines] = useState<Line[]>([]);
  const [answers, setAnswers] = useState<BriefAnswer[]>([]);
  const [draft, setDraft] = useState<BriefDraft>(assembleBriefFromAnswers([], ctx));
  const [status, setStatus] = useState("");
  const [typed, setTyped] = useState("");
  const [voice, setVoice] = useState(true);
  const [result, setResult] = useState<{ briefId: string; refinedBy: string; brief: BriefDraft } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const resolver = useRef<((t: string) => void) | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  const [history, setHistory] = useState<{ briefId: string; client: string; createdAt: string; brief: BriefDraft }[]>([]);
  useEffect(() => { fetch("/api/brief").then((r) => r.json()).then(setHistory).catch(() => {}); }, [phase]);

  const say = (who: Line["who"], text: string) => setLines((l) => [...l, { who, text }]);
  const ask = (text: string) => { say("agent", text); return voice ? speak(text) : Promise.resolve(); };

  const answer = (): Promise<string> =>
    new Promise((resolve) => {
      let done = false;
      const finish = (t: string) => { if (done) return; done = true; cancel.current?.(); resolver.current = null; setStatus(""); if (t) say("you", t); resolve(t); };
      resolver.current = finish;
      if (!voice || !speechSupported()) { setStatus("Type your answer"); return; }
      setStatus("Listening — or type below");
      const h = listenOnce(8000); cancel.current = h.cancel;
      h.result.then((t) => {
        if (done) return;
        if (t.trim()) return finish(t);
        setStatus("Didn't catch that — once more, or type below");
        const h2 = listenOnce(8000); cancel.current = h2.cancel;
        h2.result.then((t2) => finish(t2));
      });
    });

  const run = async (useVoice: boolean) => {
    setVoice(useVoice); setPhase("interview");
    const t0 = Date.now(); const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    const collected: BriefAnswer[] = [];
    await ask(`Hi. Three questions about the ${ctx.topic.split("(")[0].trim().toLowerCase()} and your writer has a brief.`);
    for (const q of BRIEF_INTERVIEW) {
      await ask(q.question);
      const first = await answer();
      const a: BriefAnswer = { id: q.id, transcript: first };
      if (isBriefAnswerVague(first)) { say("system", "vague — one follow-up"); await ask(q.followUp); a.followUpTranscript = await answer(); }
      collected.push(a); setAnswers([...collected]); setDraft(assembleBriefFromAnswers(collected, ctx));
    }
    await ask("That's the brief. Sending it to the writer.");
    setStatus("Tidying the brief with the local model…");
    const res = await fetch("/api/brief", { method: "POST", body: JSON.stringify({ ...ctx, answers: collected }) });
    const rec = await res.json();
    clearInterval(timer);
    setResult(rec); setDraft(rec.brief); setStatus(""); setPhase("done");
  };

  const send = () => { const t = typed.trim(); if (t && resolver.current) { setTyped(""); resolver.current(t); } };

  return (
    <main className="page">
      <AppHero
        outcome={{ kind: "Cost", friction: "F1 · intake quality", claim: "Prevents the most expensive mistake in the pipeline: a banger written from a bad brief.", because: "A rewrite costs more than the whole intake. Sixty seconds of the right questions, captured in a structured brief, removes it." }}
        eyebrow="Step 1 · Listen · fixes F1 intake quality + F6 reusable memory"
        title="Banger Brief"
        what="A voice interview instead of an intake form. It digs out the behavior change behind the request, the exact words to use and avoid, and how to say the company's own jargon — then hands the writer a structured brief."
        impact={[
          { value: "60s", label: "client interview", tone: "blue" },
          { value: "−1", label: "rewrite from a bad brief", tone: "red" },
          { value: "$0", label: "per interview to run" },
        ]}
      />

      {phase === "start" && (
        <section className="card stack" style={{ marginTop: 36 }}>
          <div className="row">
            <label className="field"><span className="label">Client</span><input className="input" value={ctx.client} onChange={(e) => setCtx({ ...ctx, client: e.target.value })} /></label>
            <label className="field" style={{ flex: 2 }}><span className="label">What's coming up</span><input className="input" value={ctx.topic} onChange={(e) => setCtx({ ...ctx, topic: e.target.value })} /></label>
            <label className="field" style={{ flex: 2 }}><span className="label">Who it's for</span><input className="input" value={ctx.audience} onChange={(e) => setCtx({ ...ctx, audience: e.target.value })} /></label>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => run(true)}>Start the interview by voice</button>
            <button className="btn btn-lg" onClick={() => run(false)}>Type instead</button>
          </div>
        </section>
      )}

      {phase === "start" && history.length > 0 && (
        <section className="card card-sand stack" style={{ marginTop: 22 }}>
          <h2>Brief history</h2>
          <table className="table">
            <thead><tr><th>Client</th><th>Objective</th><th>Captured</th><th></th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.briefId}>
                  <td><b>{h.client}</b></td>
                  <td>{h.brief.objective?.slice(0, 90) || "—"}</td>
                  <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{new Date(h.createdAt).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}><Link className="btn btn-sm" href={`/brief/${h.briefId}`}>Open brief →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {phase !== "start" && (
        <div className="split" style={{ marginTop: 36 }}>
          <section className="card stack">
            <div className="row spread"><span className="badge badge-violet">{ctx.client}</span><span className="badge">{elapsed}s</span></div>
            <div className="chat">{lines.map((l, i) => <div key={i} className={`bubble bubble-${l.who}`}>{l.text}</div>)}</div>
            {status && <div className="status"><span className="pulse" />{status}</div>}
            {phase === "interview" && (
              <div className="row"><input className="input" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="…or type your answer" /><button className="btn" onClick={send}>Send</button></div>
            )}
            {phase === "done" && result && (
              <div className="row"><span className="badge badge-live">Brief sent to the writer</span><Link className="btn btn-primary btn-sm" href={`/brief/${result.briefId}`}>Open the brief →</Link><Link className="btn btn-ghost btn-sm" href="/brief">New interview</Link></div>
            )}
          </section>
          <BriefPanel d={draft} answered={answers.length} />
        </div>
      )}
    </main>
  );
}

function BriefPanel({ d, answered }: { d: BriefDraft; answered: number }) {
  const dash = <span style={{ color: "var(--faint)" }}>—</span>;
  const list = (a: string[]) => (a.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{a.map((x, i) => <li key={i}>{x}</li>)}</ul> : dash);
  return (
    <aside className="card card-sand stack">
      <div className="row spread"><h2>Song brief</h2><span className="badge">{answered}/{BRIEF_INTERVIEW.length} answered</span></div>
      <dl className="kv">
        <dt>Objective</dt><dd>{d.objective || dash}</dd>
        <dt>Audience</dt><dd>{d.audience || dash}</dd>
        <dt>Behavior change</dt><dd>{d.behaviorChange || dash}</dd>
        <dt>Required messages</dt><dd>{list(d.requiredMessages)}</dd>
        <dt>Stories</dt><dd>{list(d.stories)}</dd>
        <dt>Must say</dt><dd>{list(d.mustSay)}</dd>
        <dt>Avoid</dt><dd>{list(d.banned)}</dd>
        <dt>Pronunciations</dt><dd>{Object.keys(d.pronunciations).length ? Object.entries(d.pronunciations).map(([k, v]) => <div key={k}><b>{k}</b> → {v}</div>) : dash}</dd>
        <dt>Tone</dt><dd>{d.tone || dash}</dd>
        <dt>References</dt><dd>{list(d.references)}</dd>
      </dl>
      <details><summary>Structured brief (JSON)</summary><pre className="json">{JSON.stringify(d, null, 2)}</pre></details>
    </aside>
  );
}
