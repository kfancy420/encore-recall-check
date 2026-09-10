import type { RequiredMessage, SongBrief } from "./songBrief";
import type { RecallAnswer } from "./recallRecord";

/**
 * Recall scoring: turn a spoken answer into evidence that a required message
 * from the song brief was (or was not) remembered.
 *
 * Two scorers, no paid APIs anywhere:
 *  1. scoreRecallWithLocalModel — a local Ollama model (qwen2.5:1.5b) reads the
 *     answer against the brief's message and judges recall semantically.
 *  2. scoreRecallByKeyPhrase — deterministic phrase matcher against the brief's
 *     keyPhrases. Always available; used as the fallback when Ollama is not running.
 *
 * Cost per session is therefore $0.00 — see estimateSessionCost().
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b";

/** Vague or incomplete answers trigger one follow-up question from the agent (OR-3). */
export function isAnswerVague(transcript: string): boolean {
  const t = transcript.trim().toLowerCase();
  if (t.length === 0) return true;
  const words = t.split(/\s+/).filter(Boolean);
  const hedges = ["i don't know", "not sure", "no idea", "dunno", "i forget", "can't remember", "um", "uh"];
  const onlyHedge = hedges.some((h) => t === h || t === h + ".");
  return words.length < 4 || onlyHedge || hedges.some((h) => t.includes(h) && words.length < 8);
}

export function scoreRecallByKeyPhrase(message: RequiredMessage, transcript: string): RecallAnswer {
  const t = transcript.toLowerCase();
  const hit = message.keyPhrases.find((p) => t.includes(p.toLowerCase()));
  return {
    messageId: message.id,
    transcript,
    recalled: Boolean(hit),
    confidence: hit ? 0.7 : 0.6,
    evidence: hit ? `said "${hit}"` : "no key phrase from the brief in the answer",
  };
}

export async function scoreRecallWithLocalModel(
  brief: SongBrief,
  message: RequiredMessage,
  transcript: string,
): Promise<RecallAnswer | null> {
  const prompt = `You grade whether an employee remembered a message from a company song.
Message they were supposed to remember: "${message.message}"
Context (the behavior leadership wants): "${brief.targetBehavior}"
The employee was asked: "${message.question}"
The employee said: "${transcript}"
Did the employee's answer show they remember the message? Answer with JSON only:
{"recalled": true or false, "confidence": 0.0 to 1.0, "evidence": "short quote or reason"}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: "json", options: { temperature: 0 } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    const parsed = JSON.parse(data.response ?? "{}") as { recalled?: boolean; confidence?: number; evidence?: string };
    if (typeof parsed.recalled !== "boolean") return null;
    return {
      messageId: message.id,
      transcript,
      recalled: parsed.recalled,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
      evidence: String(parsed.evidence ?? "").slice(0, 200),
    };
  } catch {
    return null; // Ollama not running or too slow — fall back to the phrase matcher
  }
}

/** Score one answer: local model first, deterministic phrase matcher as fallback. */
export async function scoreRecallAgainstBrief(
  brief: SongBrief,
  message: RequiredMessage,
  transcript: string,
): Promise<{ answer: RecallAnswer; scorer: "ollama-local" | "key-phrase" }> {
  const modelAnswer = await scoreRecallWithLocalModel(brief, message, transcript);
  if (modelAnswer) return { answer: modelAnswer, scorer: "ollama-local" };
  return { answer: scoreRecallByKeyPhrase(message, transcript), scorer: "key-phrase" };
}
