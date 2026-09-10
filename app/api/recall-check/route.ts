import { NextResponse } from "next/server";
import { runRecallCheckWorkflow, type RecallCheckInput } from "@/lib/runRecallCheck";
import { logRecallEvent } from "@/lib/recallEventLog";
import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";

/**
 * POST /api/recall-check — runs the primary workflow (MR-4) on the answers the
 * voice agent collected in the browser and returns the structured RecallRecord (MR-3).
 */
export async function POST(req: Request) {
  const input = (await req.json()) as RecallCheckInput;
  if (!input.consent?.granted) {
    logRecallEvent("consent_declined", EXPENSE_POLICY_BRIEF.bangerId, { employeeAlias: input.employeeAlias });
  }
  const record = await runRecallCheckWorkflow(input);
  return NextResponse.json(record);
}
