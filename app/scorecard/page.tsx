import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";
import { loadRecallRecords } from "@/lib/recallStore";
import { aggregateRecallScorecard } from "@/lib/aggregateScorecard";
import { logRecallEvent } from "@/lib/recallEventLog";

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
      <div className="eyebrow">Recall Scorecard · {card.client}</div>
      <h1>&ldquo;{card.bangerTitle}&rdquo; — did it land?</h1>
      <p className="lede">
        {card.employeesChecked} employees checked, 14 days after release · <span className="badge badge-live">{card.liveSessions} live</span>{" "}
        <span className="badge badge-fixture">{card.employeesChecked - card.liveSessions} fixtures</span>
      </p>

      <div className="grid grid-3" style={{ marginTop: 28 }}>
        <div className="stat"><div className="stat-label">Messages recalled</div><div className="stat-value">{pct(card.overallMessageRecall)}</div><div className="stat-sub">average across all required messages</div></div>
        <div className="stat"><div className="stat-label">Can state the full behavior</div><div className="stat-value">{pct(card.behaviorRecallRate)}</div><div className="stat-sub">where + when + what to attach</div></div>
        <div className="stat"><div className="stat-label">Cost per check</div><div className="stat-value">${card.costPerSessionUsd.toFixed(2)}</div><div className="stat-sub">hosted pipeline would be ≈ ${card.hostedCostPerSessionUsd}</div></div>
      </div>

      <div className="split" style={{ marginTop: 20 }}>
        <section className="card stack">
          <h3>By required message</h3>
          {card.byMessage.map((m) => (
            <div key={m.messageId} className="stack" style={{ gap: 6 }}>
              <div className="row spread"><span><b>{m.messageId}</b> &nbsp;{m.message}</span><b className={m.recallRate < 0.6 ? "bad" : "ok"}>{pct(m.recallRate)}</b></div>
              <div className={`bar ${m.recallRate < 0.6 ? "bar-bad" : ""}`}><div style={{ width: pct(m.recallRate) }} /></div>
            </div>
          ))}
          <div className="divider" />
          <h3>Next banger seed</h3>
          {card.nextBangerSeed.length === 0 ? (
            <p style={{ margin: 0 }}>Every message cleared 60% — nothing to remix. Sell the sequel.</p>
          ) : (
            card.nextBangerSeed.map((s) => <div key={s.messageId} className="callout"><b>{s.messageId}</b> — {s.suggestion}</div>)
          )}
        </section>

        <section className="card stack">
          <h3>By department</h3>
          <table className="table"><tbody>
            {card.byDepartment.map((d) => (
              <tr key={d.department}><td>{d.department}</td><td style={{ color: "var(--muted)" }}>{d.count} checked</td><td style={{ textAlign: "right" }}><b>{pct(d.recallRate)}</b></td></tr>
            ))}
          </tbody></table>
          <div className="divider" />
          <h3>Latest checks</h3>
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
      <p style={{ color: "var(--faint)", fontSize: 13, marginTop: 20 }}>Fixtures are synthetic employees of a fictional client. Live rows come from sessions on this machine.</p>
    </main>
  );
}
