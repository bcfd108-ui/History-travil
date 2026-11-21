import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AccountProvider } from "@/lib/account";
import AccountBar from "@/components/AccountBar";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, siteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
        <AccountProvider>
          <header className="site-header">
            <div className="wrap">
              <Link className="wordmark" href="/">On Old Ground</Link>
              <nav className="site-nav">
                <Link href="/catalog">Catalog</Link>
                <Link href="/desk">Research Desk</Link>
                <Link href="/hunts">Hunts</Link>
                <Link href="/tours">Routes</Link>
                <Link href="/maps">Maps</Link>
                <Link href="/near">Near Here</Link>
              </nav>
              <AccountBar />
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="wrap">
              <strong>On Old Ground</strong>
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
