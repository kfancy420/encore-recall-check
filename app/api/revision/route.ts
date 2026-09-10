import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { classifyFeedback, type ProductionNote } from "@/lib/revisionNotes";

/**
 * POST /api/revision
 *  { transcript, atSeconds }  → classifies one remark into a production note
 *  { save: true, notes[] }    → saves the finished revision session as JSON for the producer
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { transcript?: string; atSeconds?: number; save?: boolean; notes?: ProductionNote[]; track?: string };
  if (body.save) {
    const session = { sessionId: `rev_${Date.now().toString(36)}`, track: body.track ?? "demo-bed", createdAt: new Date().toISOString(), notes: body.notes ?? [] };
    const dir = path.join(process.cwd(), "data", "revisions");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${session.sessionId}.json`), JSON.stringify(session, null, 2));
    return NextResponse.json(session);
  }
  const note = await classifyFeedback(body.transcript ?? "", Number(body.atSeconds ?? 0));
  return NextResponse.json({ noteId: `n_${Date.now().toString(36)}`, ...note });
}
