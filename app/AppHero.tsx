/**
 * Every app opens with the same three things, in room-sized type:
 * what it is, what it does for Business Bangerz, and the business impact in numbers.
 */
export function AppHero({ eyebrow, title, what, impact, outcome }: {
  eyebrow: string;
  title: string;
  what: string;
  impact: { value: string; label: string; tone?: "red" | "blue" | "ink" }[];
  /** The business outcome, stated first and plainly: which needle moves, and why that is defensible. */
  outcome?: { kind: "Revenue" | "Cost"; friction: string; claim: string; because: string };
}) {
  return (
    <section className="hero">
      {outcome && (
        <div className="outcome">
          <span className={`outcome-kind ${outcome.kind === "Revenue" ? "red" : "blue"}`}>{outcome.kind}</span>
          <span className="outcome-friction">{outcome.friction}</span>
          <span className="outcome-claim">{outcome.claim}</span>
          <span className="outcome-because">{outcome.because}</span>
        </div>
      )}
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="lede">{what}</p>
      </div>
      <div className="impact">
        {impact.map((i) => (
          <div key={i.label} className={i.tone ?? "ink"}><b>{i.value}</b><span>{i.label}</span></div>
        ))}
      </div>
    </section>
  );
}
