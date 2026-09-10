import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { loadRecallRecords } from "@/lib/recallStore";
import { aggregateRecallScorecard } from "@/lib/aggregateScorecard";
import { logRecallEvent } from "@/lib/recallEventLog";

export const dynamic = "force-dynamic";

/**
 * The Recall Scorecard — what the client's leadership sees two weeks after release.
 * This page is the product Business Bangerz can charge for: proof the message landed,
 * where it did not, and the seed for the next banger.
 */
export default function ScorecardPage() {
  const brief = EXPENSE_POLICY_BRIEF;
  const records = loadRecallRecords(brief.bangerId);
  const card = aggregateRecallScorecard(brief, records);
  logRecallEvent("scorecard_viewed", brief.bangerId, { employeesChecked: card.employeesChecked });
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <p style={{ color: "#666", margin: 0 }}>Recall Scorecard · {card.client}</p>
      <h1 style={{ marginTop: 4 }}>&ldquo;{card.bangerTitle}&rdquo; — did it land?</h1>
      <p style={{ color: "#666" }}>
        {card.employeesChecked} employees checked, 14 days after release · {card.liveSessions} live session{card.liveSessions === 1 ? "" : "s"} + {card.employeesChecked - card.liveSessions} fixtures
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Messages recalled" value={pct(card.overallMessageRecall)} />
        <Stat label="Can state the full behavior" value={pct(card.behaviorRecallRate)} />
        <Stat label="Cost per check" value={`$${card.costPerSessionUsd.toFixed(2)}`} sub={`hosted alternative ≈ $${card.hostedCostPerSessionUsd}`} />
      </div>

      <h2>By required message</h2>
      {card.byMessage.map((m) => (
        <div key={m.messageId} style={{ margin: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span><b>{m.messageId}</b> {m.message}</span><b>{pct(m.recallRate)}</b>
          </div>
          <div style={{ background: "#eee", borderRadius: 6, height: 12 }}>
            <div style={{ width: pct(m.recallRate), height: 12, borderRadius: 6, background: m.recallRate < 0.6 ? "#dc2626" : "#16a34a" }} />
          </div>
        </div>
      ))}

      <h2>By department</h2>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {card.byDepartment.map((d) => (
            <tr key={d.department} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 6 }}>{d.department}</td><td style={{ padding: 6 }}>{d.count} checked</td><td style={{ padding: 6, textAlign: "right" }}><b>{pct(d.recallRate)}</b></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Next banger seed</h2>
      {card.nextBangerSeed.length === 0 ? (
        <p>Every message cleared 60% — nothing to remix. Sell the sequel.</p>
      ) : (
        card.nextBangerSeed.map((s) => (
          <p key={s.messageId} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12 }}>
            <b>{s.messageId}</b> — {s.suggestion}
          </p>
        ))
      )}

      <h2>Latest individual checks</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
        <thead><tr style={{ textAlign: "left" }}><th>Employee</th><th>Dept</th><th>M1</th><th>M2</th><th>M3</th><th>Scorer</th></tr></thead>
        <tbody>
          {[...records].reverse().slice(0, 12).map((r) => (
            <tr key={r.recordId} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 6 }}>{r.employeeAlias}{r.source === "live" ? " ●" : ""}</td>
              <td>{r.department}</td>
              {["M1", "M2", "M3"].map((id) => <td key={id}>{r.answers.find((a) => a.messageId === id)?.recalled ? "✓" : "✗"}</td>)}
              <td><code>{r.scorer}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: "#888", fontSize: 13 }}>● live session from this machine. Fixtures are synthetic employees of a fictional client.</p>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
      <div style={{ color: "#666", fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: "#888", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}
