import type { RecallRecord } from "./recallRecord";
import type { SongBrief } from "./songBrief";
import { estimateSessionCost } from "./sessionCost";

/**
 * Aggregate many employees' recall checks into one client-facing scorecard (OR-9).
 *
 * This is the thing Business Bangerz sells: proof, two weeks after release,
 * that the message landed — per required message, per department — and a
 * "next banger seed" built from the messages that did NOT land, so the next
 * song (or a remix) starts from evidence instead of from zero (F6).
 */

export type MessageRecallStat = {
  messageId: string;
  message: string;
  recallRate: number;
  recalledCount: number;
  total: number;
};

export type RecallScorecard = {
  bangerTitle: string;
  client: string;
  employeesChecked: number;
  liveSessions: number;
  overallMessageRecall: number;
  behaviorRecallRate: number;
  byMessage: MessageRecallStat[];
  byDepartment: { department: string; recallRate: number; count: number }[];
  /** Messages under the threshold become the brief for the next banger or remix. */
  nextBangerSeed: { messageId: string; message: string; recallRate: number; suggestion: string }[];
  costPerSessionUsd: number;
  hostedCostPerSessionUsd: number;
};

const WEAK_MESSAGE_THRESHOLD = 0.6;

export function aggregateRecallScorecard(brief: SongBrief, records: RecallRecord[]): RecallScorecard {
  const total = records.length;
  const byMessage = brief.requiredMessages.map((m) => {
    const recalledCount = records.filter((r) => r.answers.find((a) => a.messageId === m.id)?.recalled).length;
    return { messageId: m.id, message: m.message, recalledCount, total, recallRate: total ? recalledCount / total : 0 };
  });

  const departments = Array.from(new Set(records.map((r) => r.department)));
  const byDepartment = departments.map((department) => {
    const rs = records.filter((r) => r.department === department);
    const rate = rs.reduce((s, r) => s + r.messageRecallRate, 0) / (rs.length || 1);
    return { department, recallRate: rate, count: rs.length };
  });

  const nextBangerSeed = byMessage
    .filter((m) => m.recallRate < WEAK_MESSAGE_THRESHOLD)
    .map((m) => ({
      messageId: m.messageId,
      message: m.message,
      recallRate: m.recallRate,
      suggestion: `Only ${Math.round(m.recallRate * 100)}% recalled "${m.message}" — make it the hook of the remix, or its own 30-second follow-up banger.`,
    }));

  const cost = estimateSessionCost(brief.requiredMessages.length);
  return {
    bangerTitle: brief.bangerTitle,
    client: brief.client,
    employeesChecked: total,
    liveSessions: records.filter((r) => r.source === "live").length,
    overallMessageRecall: total ? records.reduce((s, r) => s + r.messageRecallRate, 0) / total : 0,
    behaviorRecallRate: total ? records.filter((r) => r.behaviorRecalled).length / total : 0,
    byMessage,
    byDepartment,
    nextBangerSeed,
    costPerSessionUsd: cost.localPipelineUsd,
    hostedCostPerSessionUsd: cost.hostedPipelineUsd,
  };
}
