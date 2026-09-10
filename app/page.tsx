/** Suite landing: three voice agents, one loop. Encore is the primary concept. */
const apps = [
  {
    href: "/brief",
    step: "LISTEN",
    name: "Banger Brief",
    friction: "F1 · F6 · cost",
    blurb: "A voice interview that replaces the intake form: probes vague answers, captures must-say phrases and pronunciations, and emits a structured song brief the writer can use.",
    badge: "badge-violet",
  },
  {
    href: "/revision",
    step: "CREATE",
    name: "Revision Room",
    friction: "F2 · cost",
    blurb: "The client listens and talks over the track. Every remark is timestamped to the song, tagged by section and element, and turned into prioritized production notes.",
    badge: "badge-accent",
  },
  {
    href: "/encore",
    step: "LISTEN AGAIN",
    name: "Encore",
    friction: "F5 · F6 · revenue",
    blurb: "Two weeks after release, a 60-second voice check proves the message landed — per message, per department — and seeds the next banger from what didn't.",
    badge: "badge-live",
  },
];

export default function Home() {
  return (
    <main className="page">
      <div className="eyebrow">Business Bangerz · voice agent prototypes</div>
      <h1>Three voice agents around the Banger Loop.</h1>
      <p className="lede">
        Listen → Create → Release → Listen Again. Business Bangerz is strong at the middle two. These
        prototypes put a voice agent at the two ends — intake and proof — plus the revision step in between.
        Zero paid APIs: browser speech in and out, a local model for reasoning.
      </p>
      <div className="grid grid-3" style={{ marginTop: 32 }}>
        {apps.map((a) => (
          <a key={a.href} href={a.href} className="card card-link stack">
            <div className="row spread">
              <span className={`badge ${a.badge}`}>{a.step}</span>
              <span className="badge">{a.friction}</span>
            </div>
            <h2 style={{ fontSize: 24 }}>{a.name}</h2>
            <p style={{ color: "var(--muted)", margin: 0 }}>{a.blurb}</p>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>Open →</span>
          </a>
        ))}
      </div>
      <p style={{ color: "var(--faint)", marginTop: 28, fontSize: 13 }}>
        Primary concept: Encore. Fictional client, synthetic data throughout. Chrome recommended for voice.
      </p>
    </main>
  );
}
