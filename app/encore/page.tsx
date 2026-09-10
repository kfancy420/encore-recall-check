"use client";

import Link from "next/link";

import { useEffect, useRef, useState } from "react";
import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { recordVoiceConsent, VOICE_CONSENT_DISCLOSURE } from "@/lib/consent";
import type { RecallRecord, VoiceConsent } from "@/lib/recallRecord";
import { speak, listenOnce, speechSupported } from "@/lib/browserSpeech";
import { AppHero } from "../AppHero";

/**
 * Encore — the employee-facing voice recall check. Designed to finish in about a minute.
 *
 * Conversation design:
 *  - consent first, in plain language, with a typed alternative (OR-7)
 *  - the agent speaks each question with synthesized speech (OR-2, MR-1)
 *  - the employee answers by voice (transcribed in-browser, OR-1, MR-2) OR taps an answer —
 *    the choices are always on screen, so a failed microphone never stalls the check
 *  - silence gets one gentle retry (OR-4); a vague or wrong answer gets ONE follow-up (OR-3)
 *  - answers go to the primary workflow, which returns the structured RecallRecord (MR-3)
 */

type Phase = "consent" | "interview" | "done";
type Line = { who: "agent" | "you" | "system"; text: string };
type AnswerDraft = { messageId: string; transcript: string; followUpTranscript?: string; inputMode: "voice" | "tap" | "typed" };

const brief = EXPENSE_POLICY_BRIEF;

export default function EncorePage() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [alias, setAlias] = useState("");
  const [department, setDepartment] = useState("Warehouse");
  const [voiceMode, setVoiceMode] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [record, setRecord] = useState<RecallRecord | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const consentRef = useRef<VoiceConsent | null>(null);
  const tapResolver = useRef<((t: string, mode: AnswerDraft["inputMode"]) => void) | null>(null);
  const cancelListen = useRef<(() => void) | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (phase !== "interview") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  const say = (who: Line["who"], text: string) => setLines((l) => [...l, { who, text }]);
  const agentSays = async (text: string) => { say("agent", text); if (voiceMode) await speak(text); };

  /** Wait for an answer from whichever channel wins: microphone, tapped choice, or typed text. */
  const getAnswer = (options: string[]): Promise<{ text: string; mode: AnswerDraft["inputMode"] }> =>
    new Promise((resolve) => {
      let done = false;
      const finish = (text: string, mode: AnswerDraft["inputMode"]) => {
        if (done) return;
        done = true;
        cancelListen.current?.();
        setListening(false); setChoices([]); setStatus("");
        tapResolver.current = null;
        if (text) say("you", text); else say("system", "no answer caught — moving on");
        resolve({ text, mode });
      };
      setChoices(options);
      tapResolver.current = finish;
      if (!voiceMode || !speechSupported()) { setStatus("Tap an answer or type below"); return; }
      setListening(true); setStatus("Listening — or tap an answer");
      const attempt = (retry: boolean) => {
        const h = listenOnce(7000);
        cancelListen.current = h.cancel;
        h.result.then(async (t) => {
          if (done) return;
          if (t.trim()) return finish(t, "voice");
          if (retry) { say("agent", "No rush — say it again, or tap an answer."); setListening(true); attempt(false); }
          else finish("", "voice");
        });
      };
      attempt(true);
    });

  const startInterview = async (granted: boolean) => {
    consentRef.current = recordVoiceConsent(granted);
    setVoiceMode(granted);
    setPhase("interview");
    startedAt.current = Date.now();
    say("agent", `Hi ${alias || "there"} — three quick questions about "${brief.bangerTitle}". About a minute.`);
    if (granted) await speak(`Hi ${alias || "there"}. Three quick questions about ${brief.bangerTitle}.`);
    const answers: AnswerDraft[] = [];
    for (const m of brief.requiredMessages) {
      await agentSays(m.question);
      const first = await getAnswer(m.choices);
      const draft: AnswerDraft = { messageId: m.id, transcript: first.text, inputMode: first.mode };
      setStatus("Scoring against the brief…");
      const res = await fetch("/api/score", { method: "POST", body: JSON.stringify({ messageId: m.id, transcript: first.text, employeeAlias: alias }) });
      const scored = (await res.json()) as { needsFollowUp: boolean; followUp: string; evidence: string; scorer: string };
      say("system", `${scored.scorer}: ${scored.evidence}`);
      if (scored.needsFollowUp && first.mode !== "tap") {
        await agentSays(scored.followUp);
        draft.followUpTranscript = (await getAnswer(m.choices)).text;
      }
      answers.push(draft);
    }
    await agentSays("That's it — thanks. This tells your team whether the song did its job.");
    setStatus("Building your recall record…");
    const out = await fetch("/api/recall-check", {
      method: "POST",
      body: JSON.stringify({ employeeAlias: alias || "Anonymous", department, consent: consentRef.current, answers }),
    });
    setRecord((await out.json()) as RecallRecord);
    setStatus("");
    setPhase("done");
  };

  const submitTyped = () => {
    const t = typed.trim();
    if (!t || !tapResolver.current) return;
    setTyped("");
    tapResolver.current(t, "typed");
  };

  return (
    <main className="page">
      <AppHero
        outcome={{ kind: "Revenue", friction: "F5 · no proof of impact", claim: "A billable “Proof of Banger” check after every song — and evidence that defends premium pricing and wins the repeat order.", because: "Today repeat purchase is a matter of taste. A recall scorecard turns it into a result, sold as a line item, at $0 per check to run, with no extra staff." }}
        eyebrow="Step 3 · Listen again · fixes F5 no proof of impact"
        title="Encore"
        what={`Two weeks after "${brief.bangerTitle}" shipped to ${brief.client}, every employee gets a 60-second voice check. It proves the message landed — and tells Business Bangerz what to remix when it didn't.`}
        impact={[
          { value: "60s", label: "per employee", tone: "blue" },
          { value: "+1", label: "billable line item per banger", tone: "red" },
          { value: "$0", label: "per check to run" },
        ]}
      />

      {phase === "consent" && (
        <section className="card stack" style={{ marginTop: 36, maxWidth: 900 }}>
          <h2>Before we start</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>{VOICE_CONSENT_DISCLOSURE}</p>
          <div className="row">
            <label className="field"><span className="label">Your name or alias</span><input className="input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Dana" /></label>
            <label className="field"><span className="label">Department</span>
              <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option>Warehouse</option><option>Dispatch</option><option>Drivers</option>
              </select>
            </label>
          </div>
          <div className="row">
            <button className="btn btn-primary btn-lg" onClick={() => startInterview(true)}>I consent — use my voice</button>
            <button className="btn btn-lg" onClick={() => startInterview(false)}>Decline — I&apos;ll tap or type</button>
          </div>
        </section>
      )}

      {phase !== "consent" && (
        <section className="card stack" style={{ marginTop: 36, maxWidth: 900 }}>
          <div className="row spread">
            <span className={`badge ${voiceMode ? "badge-live" : "badge-violet"}`}>{voiceMode ? "voice + tap" : "tap / type"}</span>
            <span className="badge">{elapsed}s</span>
          </div>
          <div className="chat">
            {lines.map((l, i) => <div key={i} className={`bubble bubble-${l.who}`}>{l.text}</div>)}
          </div>
          {status && <div className="status">{listening && <span className="pulse" />}{status}</div>}
          {choices.length > 0 && (
            <div className="choices">{choices.map((c) => <button key={c} className="choice" onClick={() => tapResolver.current?.(c, "tap")}>{c}</button>)}</div>
          )}
          {phase === "interview" && choices.length > 0 && (
            <div className="row">
              <input className="input" style={{ flex: 1 }} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitTyped()} placeholder="…or type your answer" />
              <button className="btn" onClick={submitTyped}>Send</button>
            </div>
          )}
          {phase === "done" && record && (
            <div className="stack">
              <div className="divider" />
              <div className="grid grid-3">
                <div className="stat"><div className="stat-label">Messages recalled</div><div className="stat-value">{Math.round(record.messageRecallRate * 100)}%</div></div>
                <div className="stat"><div className="stat-label">Full behavior</div><div className="stat-value">{record.behaviorRecalled ? "Yes" : "No"}</div></div>
                <div className="stat"><div className="stat-label">Session cost</div><div className="stat-value">${record.sessionCostUsd.toFixed(2)}</div><div className="stat-sub">scored by {record.scorer}</div></div>
              </div>
              <div className="row"><Link className="btn btn-primary" href="/scorecard">See the team scorecard →</Link><button className="btn btn-ghost" onClick={() => window.location.reload()}>Run again</button></div>
              <details><summary>Structured RecallRecord (JSON)</summary><pre className="json">{JSON.stringify(record, null, 2)}</pre></details>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
