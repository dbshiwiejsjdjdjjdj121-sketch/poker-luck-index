import Link from "next/link";
export default function NotFound(){return <main id="main" className="container page empty-state"><p className="eyebrow">404 / PAGE NOT FOUND</p><h1>A different table awaits.</h1><p>This page is no longer available. Explore the new tournament guide.</p><Link href="/tournaments" className="button">Find a tournament ↗</Link></main>;}
