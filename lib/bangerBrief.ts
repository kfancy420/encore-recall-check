import { askLocalModelJson } from "./localModel";

/**
 * Banger Brief — a conversational creative director that interviews the client
 * instead of handing them a form, and emits a structured song brief (F1, F6; cost).
 *
 * The hard problem inside intake: clients answer in deck language. The interview is
 * built to pull out the BEHAVIOR CHANGE behind the request ("what should people do
 * differently on Monday?") and the details that are expensive to miss later —
 * must-say phrases, banned wording, and how to pronounce internal jargon (OR-5).
 */

export type BriefQuestion = {
  id: "topic" | "behavior" | "audience" | "language" | "tone";
  question: string;
  followUp: string;
  /** Which brief fields this answer feeds. */
  feeds: (keyof BriefDraft)[];
};

export const BRIEF_INTERVIEW: BriefQuestion[] = [
  { id: "behavior", question: "What do people get wrong today, and what should they do differently on Monday?", followUp: "Give me one real example of someone getting it wrong.", feeds: ["requiredMessages", "stories", "objective"] },
  { id: "language", question: "Any must-say phrases, words to avoid, or names and acronyms? Say them the way your team says them.", followUp: "Any internal name that outsiders get wrong?", feeds: ["mustSay", "banned", "pronunciations"] },
  { id: "tone", question: "Last one — what should it sound like?", followUp: "Fun and loud, or warm and calm?", feeds: ["tone", "references"] },
];

/** The structured brief a writer can actually use (OR-6 fields). */
export type BriefDraft = {
  objective: string;
  audience: string;
  requiredMessages: string[];
  stories: string[];
  tone: string;
  references: string[];
  mustSay: string[];
  banned: string[];
  pronunciations: Record<string, string>;
  behaviorChange: string;
};

export type BriefAnswer = { id: BriefQuestion["id"]; transcript: string; followUpTranscript?: string };
export type BriefContext = { client: string; topic: string; audience: string };

const splitList = (t: string) => t.split(/,| and |;/).map((s) => s.trim()).filter((s) => s.length > 2);

/** Deterministic assembly — every answer lands in a field immediately, no model needed. */
export function assembleBriefFromAnswers(answers: BriefAnswer[], ctx: BriefContext = { client: "", topic: "", audience: "" }): BriefDraft {
  const get = (id: BriefQuestion["id"]) => answers.find((a) => a.id === id);
  const join = (a?: BriefAnswer) => [a?.transcript, a?.followUpTranscript].filter(Boolean).join(" ");
  const language = join(get("language"));
  const avoid = language.match(/(?:avoid|don't say|do not say|never say|no)\s+([^.,;]+)/i)?.[1];
  const pron: Record<string, string> = {};
  for (const m of language.matchAll(/([A-Z][\w-]+)\s*(?:,|—|-|is|goes|like|say it|pronounced)\s*([A-Za-z-]+(?:\s[A-Za-z-]+)?)/g)) pron[m[1]] = m[2];
  return {
    objective: ctx.topic || join(get("topic")),
    behaviorChange: join(get("behavior")),
    requiredMessages: splitList(get("behavior")?.transcript ?? ""),
    stories: get("behavior")?.followUpTranscript ? [get("behavior")!.followUpTranscript!] : [],
    audience: ctx.audience || join(get("audience")),
    tone: get("tone")?.transcript ?? "",
    references: splitList(get("tone")?.followUpTranscript ?? ""),
    mustSay: splitList(language).filter((s) => !/avoid|don't|never/i.test(s)),
    banned: avoid ? [avoid.trim()] : [],
    pronunciations: pron,
  };
}

/** Local-model refinement: turns messy transcripts into clean brief fields. Falls back to the deterministic draft. */
export async function refineBriefWithLocalModel(answers: BriefAnswer[], ctx: BriefContext): Promise<{ brief: BriefDraft; refinedBy: "ollama-local" | "deterministic" }> {
  const draft = assembleBriefFromAnswers(answers, ctx);
  const transcript = answers.map((a) => `Q(${a.id}): ${BRIEF_INTERVIEW.find((q) => q.id === a.id)?.question}\nA: ${a.transcript}${a.followUpTranscript ? `\nA (follow-up): ${a.followUpTranscript}` : ""}`).join("\n\n");
  const prompt = `You are the creative director at a company that writes songs for businesses. Turn this intake interview into a song brief.
Client: ${ctx.client}. What is coming up: ${ctx.topic}. Audience: ${ctx.audience}.
Interview:\n${transcript}\n
Return JSON with exactly these keys: objective (one sentence, the business goal), behaviorChange (what people should do differently, one sentence), requiredMessages (array of 2-4 short messages the song must carry), stories (array of concrete anecdotes mentioned, may be empty), audience (one sentence), tone (short phrase), references (array of artists/songs mentioned), mustSay (array of exact phrases that must appear), banned (array of words to avoid), pronunciations (object mapping a name/acronym to how it is said). Use only what the client said.`;
  const refined = await askLocalModelJson<Partial<BriefDraft>>(prompt, 30000);
  if (!refined || typeof refined !== "object" || !refined.objective) return { brief: draft, refinedBy: "deterministic" };
  const arr = (v: unknown, fb: string[]) => (Array.isArray(v) ? v.map(String).filter(Boolean) : fb);
  return {
    refinedBy: "ollama-local",
    brief: {
      objective: String(refined.objective ?? draft.objective),
      behaviorChange: String(refined.behaviorChange ?? draft.behaviorChange),
      requiredMessages: arr(refined.requiredMessages, draft.requiredMessages),
      stories: arr(refined.stories, draft.stories),
      audience: String(refined.audience ?? draft.audience),
      tone: String(refined.tone ?? draft.tone),
      references: arr(refined.references, draft.references),
      mustSay: arr(refined.mustSay, draft.mustSay),
      banned: arr(refined.banned, draft.banned),
      pronunciations: refined.pronunciations && typeof refined.pronunciations === "object" ? (refined.pronunciations as Record<string, string>) : draft.pronunciations,
    },
  };
}

/** Vague-answer test for the intake interview: short, hedged, or deck-speak with no verb of action. */
export function isBriefAnswerVague(t: string): boolean {
  const s = t.trim().toLowerCase();
  const words = s.split(/\s+/).filter(Boolean);
  return words.length < 5 || /not sure|don't know|no idea|something like that/.test(s);
}
