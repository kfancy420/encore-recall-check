import { NextResponse } from "next/server";
import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { isAnswerVague, scoreRecallAgainstBrief } from "@/lib/scoreRecall";
import { logRecallEvent } from "@/lib/recallEventLog";

/**
 * POST /api/score — scores one spoken answer mid-conversation so the voice agent
 * can decide whether to ask a follow-up (OR-3) before moving on.
 */
export async function POST(req: Request) {
  const { messageId, transcript, employeeAlias } = (await req.json()) as {
    messageId: string;
    transcript: string;
    employeeAlias?: string;
  };
  const message = EXPENSE_POLICY_BRIEF.requiredMessages.find((m) => m.id === messageId);
  if (!message) return NextResponse.json({ error: "unknown message" }, { status: 400 });

  const vague = isAnswerVague(transcript);
  const scored = vague
    ? null
    : await scoreRecallAgainstBrief(EXPENSE_POLICY_BRIEF, message, transcript);
  const needsFollowUp = vague || (scored ? !scored.answer.recalled : false);
  if (needsFollowUp) {
    logRecallEvent("follow_up_asked", EXPENSE_POLICY_BRIEF.bangerId, { employeeAlias, messageId, vague });
  }
  return NextResponse.json({
    needsFollowUp,
    followUp: message.followUp,
    recalled: scored?.answer.recalled ?? false,
    evidence: scored?.answer.evidence ?? (vague ? "answer too vague to score" : ""),
    scorer: scored?.scorer ?? "none",
  });
}
