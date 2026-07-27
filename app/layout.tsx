import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ticketverse Brownlow Draft",
  description: "The Ticketverse crew's AFL Brownlow Medal draft competition.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-tv-bg text-tv-text font-body min-h-screen bg-field-lines">
        <header className="border-b border-tv-border bg-tv-surface/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-display text-2xl tracking-wide">
              <span className="text-tv-gold">TICKETVERSE</span>{" "}
              <span className="text-tv-purpleLight">BROWNLOW</span>
            </Link>
            <nav className="flex gap-6 text-sm font-semibold uppercase tracking-wider">
              <Link href="/" className="hover:text-tv-gold transition-colors">Draft Board</Link>
              <Link href="/draft" className="hover:text-tv-gold transition-colors">Make a Pick</Link>
              <Link href="/ladder" className="hover:text-tv-gold transition-colors">Live Ladder</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
