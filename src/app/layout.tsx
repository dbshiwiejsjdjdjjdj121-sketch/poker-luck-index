import type { Metadata } from "next";
import Link from "next/link";
import { SavedProvider } from "@/components/saved-provider";
import { Navigation } from "@/components/navigation";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, IS_PREVIEW } from "@/lib/site";
import { serializeJsonLd } from "@/lib/guide-utils";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` }, description: SITE_DESCRIPTION,
  applicationName: SITE_NAME, robots: { index: !IS_PREVIEW, follow: true },
  openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SavedProvider><a className="skip-link" href="#main">Skip to content</a><Navigation />
    {children}
    <footer className="site-footer"><div className="container footer-grid"><div><Link className="footer-brand" href="/">♠ ALL IN <span>POKER GUIDE</span></Link><p>Your next tournament. Your next destination.<br />Independent information for live poker players.</p></div><div className="footer-links"><Link href="/about">About & sources</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/saved">Saved</Link><Link href="/account">Account</Link></div></div><div className="container footer-bottom"><span>© {new Date().getUTCFullYear()} ALL IN Poker Guide</span><span>Independent of the tours listed. Confirm details with the organizer.</span></div></footer>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "en", description: SITE_DESCRIPTION }) }} />
  </SavedProvider></body></html>;
}
