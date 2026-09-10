import { EXPENSE_POLICY_BRIEF } from "@/lib/songBrief";

/** Landing: the two halves of Encore — the employee's voice check and the client's scorecard. */
export default function Home() {
  const b = EXPENSE_POLICY_BRIEF;
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Encore</h1>
      <p style={{ fontSize: 18 }}>
        Two weeks after a banger ships, Encore calls the room: a 60-second voice check that proves the
        message landed — and tells Business Bangerz what to remix when it didn&apos;t.
      </p>
      <p style={{ color: "#666" }}>
        Demo banger: <b>{b.bangerTitle}</b> for {b.client} ({b.useCase}). Fictional client, synthetic data.
      </p>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/encore" style={a}>1 · Take the voice recall check →</a>
        <a href="/scorecard" style={a}>2 · See the client scorecard →</a>
      </p>
    </main>
  );
}

const a: React.CSSProperties = { padding: "12px 18px", background: "#111", color: "#fff", borderRadius: 10, textDecoration: "none", fontWeight: 600 };
