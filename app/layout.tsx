import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banger Loop — voice agents for Business Bangerz",
  description: "Banger Brief · Revision Room · Encore. Three voice agents around the Banger Loop.",
};

/** Shared shell: one nav across the three apps in the suite. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <div className="nav-inner">
            <a href="/" className="brand"><span className="brand-dot" />Banger Loop</a>
            <nav className="nav-links">
              <a href="/brief">Banger Brief</a>
              <a href="/revision">Revision Room</a>
              <a href="/encore">Encore</a>
              <a href="/scorecard">Scorecard</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
