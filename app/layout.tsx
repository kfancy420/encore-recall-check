import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";
import { BangerPlayer } from "./BangerPlayer";

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
            <Link href="/" className="brand"><span className="brand-dot" />Banger Loop</Link>
            <BangerPlayer />
            <nav className="nav-links">
              <Link href="/encore">Encore</Link>
              <Link href="/scorecard">Scorecard</Link>
              <Link href="/revision">Revision Room</Link>
              <Link href="/sonic-dna">Sonic DNA</Link>
              <Link href="/choir">Company Choir</Link>
              <Link href="/brief">Banger Brief</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
