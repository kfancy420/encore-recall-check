"use client";

import { useRef, useState } from "react";
import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { recordVoiceConsent, VOICE_CONSENT_DISCLOSURE } from "@/lib/consent";
import type { RecallRecord, VoiceConsent } from "@/lib/recallRecord";

/**
 * The Encore voice agent — the employee-facing recall check.
 *
 * Conversation design:
 *  - consent first, in plain language, with a typed alternative (OR-7)
 *  - the agent speaks each question with synthesized speech (OR-2, MR-1)
 *  - the employee answers by voice; speech is transcribed in the browser (OR-1, MR-2)
 *  - silence or an unintelligible answer gets a gentle retry (OR-4)
 *  - a vague or wrong answer gets ONE follow-up, then the agent moves on (OR-3)
 *  - all answers are posted to the primary workflow, which returns the RecallRecord (MR-3)
 *
 * Audio runs entirely on the browser's Web Speech API: no paid voice APIs.
 */

type Phase = "consent" | "interview" | "done";
type Line = { who: "agent" | "you" | "system"; text: string };
type AnswerDraft = { messageId: string; transcript: string; followUpTranscript?: string };

const brief = EXPENSE_POLICY_BRIEF;

export default function EncorePage() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [alias, setAlias] = useState("");
  const [department, setDepartment] = useState("Warehouse");
  const [voiceMode, setVoiceMode] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState("");
  const [typed, setTyped] = useState("");
  const [record, setRecord] = useState<RecallRecord | null>(null);
  const consentRef = useRef<VoiceConsent | null>(null);
  const typedResolver = useRef<((t: string) => void) | null>(null);

  const say = (who: Line["who"], text: string) => setLines((l) => [...l, { who, text }]);

  /** Agent voice: browser speech synthesis. Resolves when the sentence finishes. */
  const speak = (text: string) =>
    new Promise<void>((resolve) => {
      say("agent", text);
      if (!voiceMode || typeof window === "undefined" || !window.speechSynthesis) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voice = window.speechSynthesis.getVoices().find((v) => /en[-_]US/i.test(v.lang) && /Samantha|Google US|Aria|Zira/i.test(v.name));
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  /** Employee voice: browser speech recognition. Empty string means silence / nothing caught. */
  const listenOnce = () =>
    new Promise<string>((resolve) => {
      const w = window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike; SpeechRecognition?: new () => SpeechRecognitionLike };
      const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!Ctor) return resolve("");
      const rec = new Ctor();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let finished = false;
      const finish = (t: string) => { if (!finished) { finished = true; resolve(t); } };
      rec.onresult = (e) => finish(e.results[0][0].transcript);
      rec.onerror = () => finish("");
      rec.onend = () => finish("");
      setStatus("Listening…");
      rec.start();
      setTimeout(() => { try { rec.stop(); } catch {} }, 12000);
    });

  const listenTyped = () =>
    new Promise<string>((resolve) => {
      setStatus("Type your answer and press Send");
      typedResolver.current = resolve;
    });

  /** One answer, with the OR-4 retry on silence. */
  const getAnswer = async (): Promise<string> => {
    if (!voiceMode) return listenTyped();
    let t = await listenOnce();
    if (!t.trim()) {
      await speak("No rush — I didn't catch that. Whenever you're ready.");
      t = await listenOnce();
    }
    setStatus("");
    if (t.trim()) say("you", t);
    else say("system", "(silence — moving on)");
    return t;
  };

  const startInterview = async (granted: boolean) => {
    consentRef.current = recordVoiceConsent(granted);
    setVoiceMode(granted);
    setPhase("interview");
    await speak(`Hi ${alias || "there"}. This is Encore, checking in on "${brief.bangerTitle}". Three quick questions, about a minute, and you're done.`);
    const answers: AnswerDraft[] = [];
    for (const m of brief.requiredMessages) {
      await speak(m.question);
      const transcript = await getAnswer();
      const draft: AnswerDraft = { messageId: m.id, transcript };
      setStatus("Scoring against the brief…");
      const res = await fetch("/api/score", { method: "POST", body: JSON.stringify({ messageId: m.id, transcript, employeeAlias: alias }) });
      const scored = (await res.json()) as { needsFollowUp: boolean; followUp: string; evidence: string; scorer: string };
      say("system", `scored by ${scored.scorer}: ${scored.evidence}`);
      if (scored.needsFollowUp) {
        await speak(scored.followUp);
        draft.followUpTranscript = await getAnswer();
      }
      answers.push(draft);
    }
    await speak("That's all of it. Thanks — this helps your team know whether the song did its job.");
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
    if (!t || !typedResolver.current) return;
    say("you", t);
    setTyped("");
    setStatus("");
    typedResolver.current(t);
    typedResolver.current = null;
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Encore</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        60-second voice recall check for <b>{brief.bangerTitle}</b> · {brief.client} · released {brief.releasedOn}
      </p>

      {phase === "consent" && (
        <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
          <h2 style={{ marginTop: 0 }}>Before we start</h2>
          <p>{VOICE_CONSENT_DISCLOSURE}</p>
          <label>Your name (or an alias) <input value={alias} onChange={(e) => setAlias(e.target.value)} style={inp} /></label>
          <label style={{ marginLeft: 12 }}>Department{" "}
            <select value={department} onChange={(e) => setDepartment(e.target.value)} style={inp}>
              <option>Warehouse</option><option>Dispatch</option><option>Drivers</option>
            </select>
          </label>
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => startInterview(true)} style={btnPrimary}>I consent — use my voice</button>
            <button onClick={() => startInterview(false)} style={btn}>Decline — I&apos;ll type instead</button>
          </div>
        </section>
      )}

      {phase !== "consent" && (
        <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20 }}>
          {lines.map((l, i) => (
            <p key={i} style={{ margin: "6px 0", color: l.who === "system" ? "#888" : "#111", fontSize: l.who === "system" ? 13 : 16 }}>
              <b>{l.who === "agent" ? "Encore" : l.who === "you" ? "You" : ""}</b>{l.who !== "system" ? ": " : ""}{l.text}
            </p>
          ))}
          {status && <p style={{ color: "#c2410c", fontWeight: 600 }}>{status}</p>}
          {!voiceMode && phase === "interview" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitTyped()} style={{ ...inp, flex: 1 }} placeholder="Your answer" />
              <button onClick={submitTyped} style={btnPrimary}>Send</button>
            </div>
          )}
          {phase === "done" && record && (
            <div>
              <h3>Your recall record</h3>
              <p>
                Messages recalled: <b>{Math.round(record.messageRecallRate * 100)}%</b> · behavior recalled: <b>{record.behaviorRecalled ? "yes" : "not fully"}</b> · scored by <code>{record.scorer}</code> · session cost <b>${record.sessionCostUsd.toFixed(2)}</b>
              </p>
              <a href="/scorecard" style={btnPrimary}>See the team scorecard →</a>
              <details style={{ marginTop: 12 }}><summary>Structured record (JSON)</summary><pre style={{ fontSize: 12, overflowX: "auto" }}>{JSON.stringify(record, null, 2)}</pre></details>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: unknown) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};

const inp: React.CSSProperties = { padding: 8, border: "1px solid #ccc", borderRadius: 8, fontSize: 15 };
const btn: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid #999", background: "#fff", fontSize: 15, cursor: "pointer", textDecoration: "none", color: "#111" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#111", color: "#fff", border: "1px solid #111" };
