/**
 * Every app opens with the same three things, in room-sized type:
 * what it is, what it does for Business Bangerz, and the business impact in numbers.
 */
export function AppHero({ eyebrow, title, what, impact }: {
  eyebrow: string;
  title: string;
  what: string;
  impact: { value: string; label: string; tone?: "red" | "blue" | "ink" }[];
}) {
  return (
    <section className="hero">
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
