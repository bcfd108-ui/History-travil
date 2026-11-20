import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AccountProvider } from "@/lib/account";
import AccountBar from "@/components/AccountBar";

export const metadata: Metadata = {
  title: "History Travel",
  description:
    "A historical road trip reference built from primary sources — researched deep, honest about its gaps, with a scavenger hunt layered on the record.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AccountProvider>
          <header className="site-header">
            <div className="wrap">
              <Link className="wordmark" href="/">History Travel</Link>
              <nav className="site-nav">
                <Link href="/catalog">Catalog</Link>
                <Link href="/desk">Research Desk</Link>
                <Link href="/hunts">Hunts</Link>
                <Link href="/tours">Tours</Link>
                <Link href="/near">Near Here</Link>
              </nav>
              <AccountBar />
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="wrap">
              <strong>History Travel</strong>
              <p>
                A research app with a game. Every entry is published research — the record, with its
                gaps printed. Blank locator fields are blank in the source record; nothing here is
                invented to fill them.
              </p>
            </div>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}
