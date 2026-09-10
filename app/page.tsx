/** The hub. Big portals into each app, in demo order. Encore is the primary concept. */
const portals = [
  { href: "/encore", step: "Listen again", name: "Encore", line: "Prove the banger landed.", impact: "60-second voice check, two weeks after release. New billable line item.", tone: "red", big: true },
  { href: "/revision", step: "Create", name: "Revision Room", line: "Talk over the track. Get a to-do list.", impact: "Timestamped, prioritized production notes instead of email paragraphs.", tone: "ink", big: true },
  { href: "/sonic-dna", step: "Create", name: "Sonic DNA", line: "Their workplace becomes the drum kit.", impact: "A sonic signature no other company can have. Premium tier.", tone: "blue", big: false },
  { href: "/choir", step: "Create", name: "Company Choir", line: "Their people sing the hook.", impact: "Consented employee voices on the chorus, captured in the room.", tone: "blue", big: false },
  { href: "/scorecard", step: "Listen again", name: "Recall Scorecard", line: "What the client's CEO sees.", impact: "Recall by message and department; the seed for the next banger.", tone: "ink", big: false },
  { href: "/brief", step: "Listen", name: "Banger Brief", line: "The intake form, as a conversation.", impact: "A structured brief for the writer, with pronunciations.", tone: "ink", big: false },
];

export default function Home() {
  return (
    <main className="page">
      <div className="eyebrow">Business Bangerz × Cadre AI · voice agents</div>
      <h1 style={{ fontSize: "clamp(48px, 7vw, 92px)" }}>The Banger Loop.</h1>
      <p className="lede" style={{ fontSize: 26, maxWidth: "48ch" }}>
        Listen → Create → Release → Listen again. Business Bangerz already wins the middle. These voice agents
        close the loop — and every one runs for $0 per use.
      </p>
      <div className="hub">
        {portals.map((p) => (
          <a key={p.href} href={p.href} className={`portal portal-${p.tone} ${p.big ? "portal-big" : ""}`}>
            <span className="portal-step">{p.step}</span>
            <span className="portal-name">{p.name}</span>
            <span className="portal-line">{p.line}</span>
            <span className="portal-impact">{p.impact}</span>
            <span className="portal-go">Open →</span>
          </a>
        ))}
      </div>
    </main>
  );
}
