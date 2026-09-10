/**
 * RecallRecord — the structured, machine-readable artifact Encore produces
 * from one employee's spoken recall check (MR-3).
 *
 * A downstream production step consumes it in two ways:
 *  - aggregateRecallScorecard() rolls many records into the client-facing scorecard
 *  - the "next banger seed" in the scorecard turns the weakest messages into the
 *    starting brief for the next banger or remix (closes the LISTEN AGAIN loop)
 */

export type RecallAnswer = {
  messageId: string;
  /** What the employee actually said, transcribed. */
  transcript: string;
  /** Present when the first answer was vague and the agent asked a follow-up. */
  followUpTranscript?: string;
  recalled: boolean;
  /** 0–1 confidence from the scorer. */
  confidence: number;
  /** Phrase or reasoning that counted as evidence of recall. */
  evidence: string;
  /** How the employee answered: spoken, tapped a choice, or typed. */
  inputMode?: "voice" | "tap" | "typed";
};

export type VoiceConsent = {
  granted: boolean;
  grantedAt: string;
  /** What the employee was told before their voice was captured. */
  disclosure: string;
  /** Transcript retention window in days; raw audio is never stored. */
  transcriptRetentionDays: number;
  audioRetained: false;
  withdrawalInstructions: string;
};

export type RecallRecord = {
  recordId: string;
  bangerId: string;
  employeeAlias: string;
  department: string;
  checkedAt: string;
  /** Days between banger release and this recall check. */
  daysSinceRelease: number;
  consent: VoiceConsent;
  answers: RecallAnswer[];
  /** Share of required messages recalled, 0–1. */
  messageRecallRate: number;
  /** Did the employee describe the target behavior, not just the hook? */
  behaviorRecalled: boolean;
  /** Which scorer produced this record: local model, phrase matcher, or fixture. */
  scorer: "ollama-local" | "key-phrase" | "fixture";
  /** Estimated cost of this session in USD (OR-10). */
  sessionCostUsd: number;
  /** Whether this record came from a live session or an offline fixture (OR-13). */
  source: "live" | "fixture";
};
