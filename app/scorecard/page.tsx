import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { loadRecallRecords } from "@/lib/recallStore";
import { aggregateRecallScorecard } from "@/lib/aggregateScorecard";
import { logRecallEvent } from "@/lib/recallEventLog";
import { AppHero } from "../AppHero";

export const dynamic = "force-dynamic";

/**
 * The Recall Scorecard — what the client's leadership sees two weeks after release.
 * This is the product Business Bangerz can charge for: proof the message landed,
 * where it did not, and the seed for the next banger.
 */
export default function ScorecardPage() {
  const brief = EXPENSE_POLICY_BRIEF;
  const records = loadRecallRecords(brief.bangerId);
  const card = aggregateRecallScorecard(brief, records);
  logRecallEvent("scorecard_viewed", brief.bangerId, { employeesChecked: card.employeesChecked });
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <main className="page">
      <AppHero
        outcome={{ kind: "Revenue", friction: "F5 · no proof of impact", claim: "This page is the product: proof the message landed, and the evidence-backed remix to sell next.", because: "Weak messages become the seed for the next banger, so every delivery creates the next order instead of ending the relationship." }}
        eyebrow={`Recall Scorecard · ${card.client}`}
        title={`Did "${card.bangerTitle}" land?`}
        what={`${card.employeesChecked} employees checked by Encore, 14 days after release. This is the page Business Bangerz sells: proof, per message and per department, plus the seed for the next banger.`}
        impact={[
          { value: pct(card.overallMessageRecall), label: "messages recalled", tone: "blue" },
          { value: pct(card.behaviorRecallRate), label: "can state the full behavior", tone: "red" },
          { value: `${card.nextBangerSeed.length}`, label: "message(s) to remix" },
        ]}
      />
      <p className="row badge-row"><span className="badge badge-live">{card.liveSessions} live session{card.liveSessions === 1 ? "" : "s"} on this machine</span><span className="badge badge-fixture">{card.employeesChecked - card.liveSessions} synthetic employees</span></p>


      <div className="split" style={{ marginTop: 20 }}>
        <section className="card stack">
          <h2>By required message</h2>
          {card.byMessage.map((m) => (
            <div key={m.messageId} className="stack" style={{ gap: 6 }}>
              <div className="row spread"><span><b>{m.messageId}</b> &nbsp;{m.message}</span><b className={m.recallRate < 0.6 ? "bad" : "ok"}>{pct(m.recallRate)}</b></div>
              <div className={`bar ${m.recallRate < 0.6 ? "bar-bad" : ""}`}><div style={{ width: pct(m.recallRate) }} /></div>
            </div>
          ))}
          <div className="divider" />
          <h2>Next banger seed</h2>
          {card.nextBangerSeed.length === 0 ? (
            <p style={{ margin: 0 }}>Every message cleared 60% — nothing to remix. Sell the sequel.</p>
          ) : (
            card.nextBangerSeed.map((s) => <div key={s.messageId} className="callout"><b>{s.messageId}</b> — {s.suggestion}</div>)
          )}
        </section>

        <section className="card stack">
          <h2>By department</h2>
          <table className="table"><tbody>
            {card.byDepartment.map((d) => (
              <tr key={d.department}><td>{d.department}</td><td style={{ color: "var(--muted)" }}>{d.count} checked</td><td style={{ textAlign: "right" }}><b>{pct(d.recallRate)}</b></td></tr>
            ))}
          </tbody></table>
          <div className="divider" />
          <h2>Latest checks</h2>
          <table className="table">
            <thead><tr><th>Employee</th><th>M1</th><th>M2</th><th>M3</th><th>Scorer</th></tr></thead>
            <tbody>
              {[...records].reverse().slice(0, 12).map((r) => (
                <tr key={r.recordId}>
                  <td>{r.employeeAlias} {r.source === "live" && <span className="badge badge-live" style={{ marginLeft: 6 }}>live</span>}</td>
                  {["M1", "M2", "M3"].map((id) => { const ok = r.answers.find((a) => a.messageId === id)?.recalled; return <td key={id} className={ok ? "ok" : "bad"}>{ok ? "✓" : "✗"}</td>; })}
                  <td><code style={{ fontSize: 12, color: "var(--muted)" }}>{r.scorer}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 20 }}>Cost per check: ${card.costPerSessionUsd.toFixed(2)} on the local pipeline (a hosted pipeline would be ≈ ${card.hostedCostPerSessionUsd}). Synthetic employees belong to a fictional client; live rows come from sessions on this machine.</p>
    </main>
  );
}
