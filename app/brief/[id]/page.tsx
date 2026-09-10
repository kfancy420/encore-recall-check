import { readFileSync } from "node:fs";
import path from "node:path";
import type { BriefDraft, BriefAnswer } from "@/lib/bangerBrief";

export const dynamic = "force-dynamic";

type SavedBrief = { briefId: string; client: string; topic?: string; audience?: string; createdAt: string; refinedBy: string; answers: BriefAnswer[]; brief: BriefDraft };

/** A saved brief, laid out the way it goes to the writer. */
export default async function BriefDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const safe = id.replace(/[^a-z0-9_]/gi, "");
  const rec = JSON.parse(readFileSync(path.join(process.cwd(), "data", "briefs", `${safe}.json`), "utf8")) as SavedBrief;
  const b = rec.brief;
  const list = (a: string[]) => (a.length ? <ul style={{ margin: 0, paddingLeft: 20 }}>{a.map((x, i) => <li key={i}>{x}</li>)}</ul> : "—");
  const plain = [
    `SONG BRIEF — ${rec.client}`,
    `Objective: ${b.objective}`,
    `Audience: ${b.audience}`,
    `Behavior change: ${b.behaviorChange}`,
    `Required messages:\n${b.requiredMessages.map((m) => `  - ${m}`).join("\n")}`,
    b.stories.length ? `Stories:\n${b.stories.map((m) => `  - ${m}`).join("\n")}` : "",
    b.mustSay.length ? `Must say: ${b.mustSay.join("; ")}` : "",
    b.banned.length ? `Avoid: ${b.banned.join(", ")}` : "",
    Object.keys(b.pronunciations).length ? `Pronunciations: ${Object.entries(b.pronunciations).map(([k, v]) => `${k} → ${v}`).join("; ")}` : "",
    `Tone: ${b.tone}`,
    b.references.length ? `References: ${b.references.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  return (
    <main className="page">
      <div className="eyebrow">Song brief · {rec.client}</div>
      <h1 style={{ fontSize: 44 }}>{b.objective || rec.topic || "Brief"}</h1>
      <p className="lede">Captured {new Date(rec.createdAt).toLocaleString()} · refined by {rec.refinedBy} · <a href="/brief" style={{ color: "var(--blue)", fontWeight: 700 }}>← all briefs</a></p>
      <div className="split" style={{ marginTop: 32 }}>
        <section className="card stack">
          <dl className="kv">
            <dt>Objective</dt><dd>{b.objective || "—"}</dd>
            <dt>Audience</dt><dd>{b.audience || "—"}</dd>
            <dt>Behavior change</dt><dd>{b.behaviorChange || "—"}</dd>
            <dt>Required messages</dt><dd>{list(b.requiredMessages)}</dd>
            <dt>Stories</dt><dd>{list(b.stories)}</dd>
            <dt>Must say</dt><dd>{list(b.mustSay)}</dd>
            <dt>Avoid</dt><dd>{list(b.banned)}</dd>
            <dt>Pronunciations</dt><dd>{Object.keys(b.pronunciations).length ? Object.entries(b.pronunciations).map(([k, v]) => <div key={k}><b>{k}</b> → {v}</div>) : "—"}</dd>
            <dt>Tone</dt><dd>{b.tone || "—"}</dd>
            <dt>References</dt><dd>{list(b.references)}</dd>
          </dl>
          <div className="divider" />
          <h3>What the client said</h3>
          {rec.answers.map((a) => <div key={a.id} className="callout callout-violet" style={{ fontSize: 16 }}><b style={{ textTransform: "capitalize" }}>{a.id}:</b> {a.transcript}{a.followUpTranscript ? <><br /><b>Follow-up:</b> {a.followUpTranscript}</> : null}</div>)}
        </section>
        <aside className="card card-sand stack">
          <h2>Send to the writer</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>Plain text, ready to paste.</p>
          <pre className="json" style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{plain}</pre>
          <details><summary>JSON</summary><pre className="json">{JSON.stringify(b, null, 2)}</pre></details>
        </aside>
      </div>
    </main>
  );
}
