"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Navigation() {
  const path = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="ALL IN Poker Guide home"><span className="brand-icon">♠</span><span>ALL IN<small>POKER GUIDE</small></span></Link>
    <nav aria-label="Main navigation">{[["/tournaments","Tournaments"],["/destinations","Destinations"],["/about","About"]].map(([href,label]) => <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>
    <Link className="account-link" href="/account">Account <span aria-hidden="true">↗</span></Link>
  </div></header>;
}
