/** Suite landing: three voice agents, one loop. Encore is the primary concept. */
const apps = [
  {
    href: "/brief", step: "1 · Listen", name: "Banger Brief",
    does: "Interviews the client by voice and hands the writer a structured brief.",
    impact: "Cuts a bad-brief rewrite — the most expensive mistake in the pipeline.",
    stat: "−1 rewrite", statLabel: "per project", tone: "blue",
  },
  {
    href: "/revision", step: "2 · Create", name: "Revision Room",
    does: "The client talks over the track; every remark becomes a timestamped production note.",
    impact: "Replaces email paragraphs with a to-do list sorted by song position.",
    stat: "−2 rounds", statLabel: "of revision", tone: "ink",
  },
  {
    href: "/encore", step: "3 · Listen again", name: "Encore",
    does: "A 60-second voice check, two weeks after release, proves the message landed.",
    impact: "Turns a one-off song into a measured, repeatable, premium-priced product.",
    stat: "+1 line item", statLabel: "per banger sold", tone: "red",
  },
];

export default function Home() {
  return (
    <main className="page">
      <div className="eyebrow">Business Bangerz × voice agents</div>
      <h1>Three voice agents.<br />One Banger Loop.</h1>
      <p className="lede">
        Business Bangerz is strong at writing and releasing. The money leaks at the two ends — the brief going in and the
        proof coming out. These three agents close the loop, with zero paid APIs.
      </p>
      <div className="grid grid-3" style={{ marginTop: 40 }}>
        {apps.map((a) => (
          <a key={a.href} href={a.href} className="card card-link stack">
            <span className="badge badge-accent" style={{ alignSelf: "flex-start" }}>{a.step}</span>
            <h2 style={{ fontSize: 34 }}>{a.name}</h2>
            <p className="big" style={{ margin: 0, fontWeight: 600 }}>{a.does}</p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 18 }}>{a.impact}</p>
            <div className="impact" style={{ gridTemplateColumns: "1fr" }}><div className={a.tone}><b>{a.stat}</b><span>{a.statLabel}</span></div></div>
            <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: 18 }}>Open {a.name} →</span>
          </a>
        ))}
      </div>
    </main>
  );
}
