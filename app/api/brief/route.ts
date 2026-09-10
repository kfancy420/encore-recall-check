import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { refineBriefWithLocalModel, type BriefAnswer } from "@/lib/bangerBrief";

/**
 * POST /api/brief — the Banger Brief workflow: interview answers in, structured song brief out,
 * saved as JSON for the writer.
 */
export async function POST(req: Request) {
  const { client, answers } = (await req.json()) as { client: string; answers: BriefAnswer[] };
  const { brief, refinedBy } = await refineBriefWithLocalModel(answers);
  const record = {
    briefId: `brief_${Date.now().toString(36)}`,
    client: client || "Unnamed client (fictional)",
    createdAt: new Date().toISOString(),
    refinedBy,
    answers,
    brief,
  };
  const dir = path.join(process.cwd(), "data", "briefs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${record.briefId}.json`), JSON.stringify(record, null, 2));
  return NextResponse.json(record);
}
