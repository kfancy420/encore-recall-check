import { runRecallCheckWorkflow } from "../lib/runRecallCheck.ts";
import { recordVoiceConsent } from "../lib/consent.ts";
import { loadRecallRecords } from "../lib/recallStore.ts";
import { aggregateRecallScorecard } from "../lib/aggregateScorecard.ts";
import { EXPENSE_POLICY_BRIEF } from "../lib/songBrief.ts";

/**
 * Offline demonstration mode (OR-13): runs the primary workflow end to end on a
 * recorded transcript — no browser, no microphone, no API keys. If a local Ollama
 * model is running it scores semantically; otherwise the phrase matcher does.
 *
 *   npm run demo
 */
const record = await runRecallCheckWorkflow({
  employeeAlias: "Demo Employee",
  department: "Dispatch",
  consent: recordVoiceConsent(true),
  answers: [
    { messageId: "M1", transcript: "It goes in Spendly now, on the phone. No more emailing my manager." },
    { messageId: "M2", transcript: "Um, not sure", followUpTranscript: "Like a week? Seven days I think." },
    { messageId: "M3", transcript: "You have to attach a photo of the receipt." },
  ],
});

console.log("RecallRecord:", JSON.stringify(record, null, 2));
const card = aggregateRecallScorecard(EXPENSE_POLICY_BRIEF, loadRecallRecords(EXPENSE_POLICY_BRIEF.bangerId));
console.log("\nScorecard:", JSON.stringify({ ...card, byDepartment: undefined }, null, 2));
