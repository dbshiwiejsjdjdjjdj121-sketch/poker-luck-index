"use client";
import Link from "next/link";
import { useSaved } from "./saved-provider";
import { usePathname } from "next/navigation";
export function Navigation() {
  const path = usePathname();
  const { user,entries,ready } = useSaved();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="ALL IN Poker Guide home"><span className="brand-icon">♠</span><span>ALL IN<small>POKER GUIDE</small></span></Link>
    <nav aria-label="Main navigation">{[["/tournaments","Tournaments"],["/destinations","Destinations"],["/saved","Saved"],["/about","About"]].map(([href,label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}{href==="/saved" && user && ready && entries.length>0 && <span className="saved-count">{entries.length}</span>}</Link>)}</nav>
    <Link className="account-link" href="/account">Account <span aria-hidden="true">↗</span></Link>
  </div></header>;
}
