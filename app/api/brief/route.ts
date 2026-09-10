import { NextResponse } from "next/server";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { refineBriefWithLocalModel, type BriefAnswer, type BriefContext } from "@/lib/bangerBrief";

/**
 * POST /api/brief — the Banger Brief workflow: interview answers in, structured song brief out,
 * saved as JSON for the writer.
 */
export async function POST(req: Request) {
  const { client, topic, audience, answers } = (await req.json()) as BriefContext & { answers: BriefAnswer[] };
  const ctx: BriefContext = { client, topic, audience };
  const { brief, refinedBy } = await refineBriefWithLocalModel(answers, ctx);
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

/** GET /api/brief — the brief history, newest first. */
export async function GET() {
  const dir = path.join(process.cwd(), "data", "briefs");
  let items: unknown[] = [];
  try {
    items = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
      .sort((a: { createdAt: string }, b: { createdAt: string }) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch { items = []; }
  return NextResponse.json(items);
}
