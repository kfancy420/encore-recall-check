import { askLocalModelJson } from "./localModel";

/**
 * Revision Room — client feedback captured while the track plays, timestamped to
 * the song, and turned into prioritized production notes (F2; cost).
 *
 * The hard problem inside revision friction is not transcription — it is that
 * "verse two feels corny" arrives with no position, no priority and no target.
 * Here every remark is anchored to the playhead, mapped to a song section, tagged
 * with the element it is about (vocals, lyrics, drums, mix, tempo…), and given a
 * keep/change verdict and an action the producer can execute.
 */

export type SongSection = { name: string; start: number; end: number };

/** Section map for the demo track (a 60-second synthetic bed generated in the browser). */
export const DEMO_SECTIONS: SongSection[] = [
  { name: "Intro", start: 0, end: 8 },
  { name: "Verse 1", start: 8, end: 20 },
  { name: "Chorus", start: 20, end: 32 },
  { name: "Verse 2", start: 32, end: 44 },
  { name: "Chorus 2", start: 44, end: 56 },
  { name: "Outro", start: 56, end: 60 },
];

export const sectionAt = (t: number) => DEMO_SECTIONS.find((s) => t >= s.start && t < s.end)?.name ?? "Outro";

export type FeedbackElement = "vocals" | "lyrics" | "drums" | "bass" | "melody" | "mix" | "tempo" | "energy" | "overall";
export type ProductionNote = {
  noteId: string;
  atSeconds: number;
  section: string;
  transcript: string;
  element: FeedbackElement;
  verdict: "keep" | "change" | "question";
  priority: "high" | "medium" | "low";
  /** What the producer should do — one imperative sentence. */
  action: string;
  classifiedBy: "ollama-local" | "rules";
};

const ELEMENT_WORDS: [FeedbackElement, RegExp][] = [
  ["vocals", /vocal|singer|voice|sing/i],
  ["lyrics", /lyric|word|line|chorus says|verse says|corny|cheesy|say/i],
  ["drums", /drum|beat|kick|snare|hi-?hat|percussion/i],
  ["bass", /bass|low end|sub/i],
  ["melody", /melody|hook|tune|catchy/i],
  ["mix", /mix|loud|quiet|volume|muddy|bright|eq/i],
  ["tempo", /tempo|fast|slow|speed|bpm/i],
  ["energy", /energy|hype|flat|boring|exciting|vibe/i],
];

/** Deterministic classifier — always available, no model needed. */
export function classifyFeedbackByRules(transcript: string, atSeconds: number): Omit<ProductionNote, "noteId"> {
  const t = transcript.toLowerCase();
  const element = ELEMENT_WORDS.find(([, re]) => re.test(t))?.[0] ?? "overall";
  const positive = /love|great|works|keep|perfect|nice|good|like (this|that|it)/.test(t);
  const negative = /corny|cheesy|hate|don't like|not working|too |weak|boring|flat|muddy|cut|remove|change|less|more/.test(t);
  const question = /\?|maybe|could we|what if|not sure/.test(t);
  const verdict: ProductionNote["verdict"] = negative ? "change" : positive ? "keep" : question ? "question" : "change";
  const priority: ProductionNote["priority"] = /hate|not working|can't|cut|remove|wrong/.test(t) ? "high" : verdict === "keep" ? "low" : "medium";
  const action = verdict === "keep" ? `Keep the ${element} in ${sectionAt(atSeconds)} as is.` : `Revisit the ${element} in ${sectionAt(atSeconds)}: "${transcript}"`;
  return { atSeconds, section: sectionAt(atSeconds), transcript, element, verdict, priority, action, classifiedBy: "rules" };
}

/** Local-model classifier with the rules result as fallback. */
export async function classifyFeedback(transcript: string, atSeconds: number): Promise<Omit<ProductionNote, "noteId">> {
  const rules = classifyFeedbackByRules(transcript, atSeconds);
  const prompt = `A client is listening to a song draft and just said, at ${atSeconds}s (${rules.section}): "${transcript}".
Classify it for the music producer. Return JSON: {"element": one of vocals|lyrics|drums|bass|melody|mix|tempo|energy|overall, "verdict": keep|change|question, "priority": high|medium|low, "action": "one imperative sentence for the producer"}`;
  const m = await askLocalModelJson<Partial<ProductionNote>>(prompt, 12000);
  if (!m || !m.element || !m.verdict || !m.action) return rules;
  // The rules win on verdict when the client used an explicit keep/change word; the model wins on element and action.
  const explicit = /love|great|keep|perfect|corny|cheesy|hate|not working|cut|remove|change/i.test(transcript);
  const action = String(m.action).length > 140 ? rules.action : String(m.action);
  return { ...rules, element: m.element, verdict: explicit ? rules.verdict : m.verdict, priority: m.priority ?? rules.priority, action, classifiedBy: "ollama-local" };
}

/** A pre-baked session for the demo (OR-13). */
export const EXAMPLE_NOTES: ProductionNote[] = [
  { noteId: "ex1", atSeconds: 5, section: "Intro", transcript: "Love the intro, keep the drums exactly like this", element: "drums", verdict: "keep", priority: "low", action: "Keep the intro drums as is.", classifiedBy: "rules" },
  { noteId: "ex2", atSeconds: 14, section: "Verse 1", transcript: "The vocals feel buried under the bass here", element: "mix", verdict: "change", priority: "medium", action: "Bring the lead vocal up and carve the bass in Verse 1.", classifiedBy: "rules" },
  { noteId: "ex3", atSeconds: 26, section: "Chorus", transcript: "This chorus is the banger, that hook is perfect", element: "melody", verdict: "keep", priority: "low", action: "Keep the chorus hook untouched.", classifiedBy: "rules" },
  { noteId: "ex4", atSeconds: 37, section: "Verse 2", transcript: "Verse two is corny, the Spendly line sounds like an ad", element: "lyrics", verdict: "change", priority: "high", action: "Rewrite the Verse 2 Spendly line so it lands as a story, not a slogan.", classifiedBy: "rules" },
  { noteId: "ex5", atSeconds: 58, section: "Outro", transcript: "Could we end on the chorus instead of fading out?", element: "overall", verdict: "question", priority: "medium", action: "Try an alternate ending that stops on the final chorus.", classifiedBy: "rules" },
];
