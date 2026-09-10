import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * POST /api/sounds — saves a Sonic Signature (workplace sounds that became the drum kit) or a
 * Company Choir session (consented employee voices on the chorus). Structured JSON record plus
 * the WAV clips it references, under data/sounds/<id>/.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { kind: "sonic-signature" | "company-choir"; client: string; record: Record<string, unknown>; clips: { name: string; wavBase64: string }[] };
  if (!["sonic-signature", "company-choir"].includes(body.kind)) return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  if ((body.clips ?? []).some((c) => c.wavBase64.length > 8_000_000)) return NextResponse.json({ error: "clip too large" }, { status: 413 });
  const id = `${body.kind}_${Date.now().toString(36)}`;
  const dir = path.join(process.cwd(), "data", "sounds", id);
  mkdirSync(dir, { recursive: true });
  for (const c of body.clips ?? []) writeFileSync(path.join(dir, `${c.name.replace(/[^a-z0-9_-]/gi, "_")}.wav`), Buffer.from(c.wavBase64, "base64"));
  const record = { id, kind: body.kind, client: body.client, createdAt: new Date().toISOString(), ...body.record, clips: (body.clips ?? []).map((c) => `${c.name}.wav`) };
  writeFileSync(path.join(dir, "record.json"), JSON.stringify(record, null, 2));
  return NextResponse.json(record);
}
