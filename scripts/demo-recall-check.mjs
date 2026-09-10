/**
 * Offline demonstration mode (OR-13): runs the primary workflow end to end on a
 * recorded transcript — no browser, no microphone, no API keys. If a local Ollama
 * model is running it scores semantically; otherwise the phrase matcher does.
 *
 *   npm run dev      (in one terminal)
 *   npm run demo     (in another)
 */
const base = process.env.ENCORE_URL ?? "http://localhost:3000";

const res = await fetch(`${base}/api/recall-check`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    employeeAlias: "Demo Employee",
    department: "Dispatch",
    consent: {
      granted: true,
      grantedAt: new Date().toISOString(),
      disclosure: "Offline fixture — consent text lives in lib/consent.ts",
      transcriptRetentionDays: 30,
      audioRetained: false,
      withdrawalInstructions: "Reply WITHDRAW to the Encore link.",
    },
    answers: [
      { messageId: "M1", transcript: "It goes in Spendly now, on the phone. No more emailing my manager." },
      { messageId: "M2", transcript: "Um, not sure", followUpTranscript: "Like a week? Seven days I think." },
      { messageId: "M3", transcript: "You have to attach a photo of the receipt." },
    ],
  }),
});

const record = await res.json();
console.log(JSON.stringify(record, null, 2));
console.log(`\nScored by: ${record.scorer} · messages recalled: ${Math.round(record.messageRecallRate * 100)}% · behavior recalled: ${record.behaviorRecalled}`);
console.log(`Scorecard: ${base}/scorecard`);
