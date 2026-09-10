import { EXPENSE_POLICY_BRIEF, type SongBrief } from "./songBrief";
import type { RecallAnswer, RecallRecord, VoiceConsent } from "./recallRecord";
import { scoreRecallAgainstBrief } from "./scoreRecall";
import { estimateSessionCost } from "./sessionCost";
import { logRecallEvent } from "./recallEventLog";
import { saveRecallRecord } from "./recallStore";

/**
 * The primary workflow, end to end (MR-4):
 *
 *   employee's spoken (or typed) answers  →  scored against the song brief
 *   →  one structured RecallRecord  →  saved for the scorecard  →  events logged
 *
 * The /encore page collects the answers with the voice agent and POSTs them here
 * (via /api/recall-check). `npm run demo` runs the same function on a fixture
 * transcript with no browser and no keys (OR-13).
 */

export type RecallCheckInput = {
  employeeAlias: string;
  department: string;
  consent: VoiceConsent;
  answers: { messageId: string; transcript: string; followUpTranscript?: string; inputMode?: "voice" | "tap" | "typed" }[];
  brief?: SongBrief;
};

export async function runRecallCheckWorkflow(input: RecallCheckInput): Promise<RecallRecord> {
  const brief = input.brief ?? EXPENSE_POLICY_BRIEF;
  logRecallEvent("recall_check_started", brief.bangerId, { employeeAlias: input.employeeAlias });

  let scorer: RecallRecord["scorer"] = "key-phrase";
  const answers: RecallAnswer[] = [];
  for (const message of brief.requiredMessages) {
    const given = input.answers.find((a) => a.messageId === message.id);
    // The follow-up answer is the employee's best attempt, so it is what gets scored.
    const transcript = [given?.transcript ?? "", given?.followUpTranscript ?? ""].filter(Boolean).join(" ");
    const scored = await scoreRecallAgainstBrief(brief, message, transcript);
    if (scored.scorer === "ollama-local") scorer = "ollama-local";
    answers.push({ ...scored.answer, followUpTranscript: given?.followUpTranscript, inputMode: given?.inputMode ?? "typed" });
    logRecallEvent("recall_scored", brief.bangerId, {
      employeeAlias: input.employeeAlias,
      messageId: message.id,
      recalled: scored.answer.recalled,
      scorer: scored.scorer,
    });
  }

  const recalledCount = answers.filter((a) => a.recalled).length;
  const releasedOn = new Date(brief.releasedOn).getTime();
  const record: RecallRecord = {
    recordId: `rec_${Date.now().toString(36)}`,
    bangerId: brief.bangerId,
    employeeAlias: input.employeeAlias,
    department: input.department,
    checkedAt: new Date().toISOString(),
    daysSinceRelease: Math.max(0, Math.round((Date.now() - releasedOn) / 86_400_000)),
    consent: input.consent,
    answers,
    messageRecallRate: answers.length ? recalledCount / answers.length : 0,
    // Behavior = the whole chain (where + when + what to attach), not just the hook.
    behaviorRecalled: recalledCount === answers.length,
    scorer,
    sessionCostUsd: estimateSessionCost(answers.length).localPipelineUsd,
    source: "live",
  };

  saveRecallRecord(record);
  logRecallEvent("recall_check_completed", brief.bangerId, {
    employeeAlias: input.employeeAlias,
    messageRecallRate: record.messageRecallRate,
    behaviorRecalled: record.behaviorRecalled,
  });
  return record;
}
