import Link from "next/link";
import { tourFamilies } from "@/lib/tour-catalog";
import { tourGuideHref } from "@/lib/tour-guide-data";
import { destinations, festivals, destinationById } from "@/lib/guide-data";
import { pageMeta } from "@/lib/site";
import { dateRange, mainEvent, money, statusOf } from "@/lib/guide-utils";
import { FestivalGrid, SectionTitle, DestinationCard } from "@/components/guide-ui";
export const revalidate = 3600;
export const metadata = pageMeta("Live poker tournaments & travel", "Find your next poker tournament. Explore upcoming global festivals, compare buy-ins and plan your trip with official sources.", "/");
export default function Home() {
  const upcoming = festivals.filter(f => ["upcoming","ongoing"].includes(statusOf(f))).sort((a,b) => a.startDate.localeCompare(b.startDate));
  const featured = upcoming.find(f => f.tour === "EPT") || upcoming[0];
  const places = ["czechia/prague","united-states/las-vegas","south-korea/jeju","bahamas/nassau"].map(id => destinations.find(d => d.id === id)).filter(d => !!d);
  const countries = new Set(upcoming.map(f => destinationById(f.destinationId).country)).size;
  const changes = upcoming.flatMap(f => f.changes.map(c => ({...c,festival:f}))).sort((a,b) => b.date.localeCompare(a.date)).slice(0,3);
  return <main id="main"><section className="hero container"><div className="hero-copy"><p className="eyebrow"><span className="live-dot" /> THE LIVE POKER TRAVEL GUIDE</p><h1>Find your next<br />poker tournament.<br /><em>Plan the trip.</em></h1><p className="hero-description">From the first flight to the final table. Discover major festivals, compare the schedule, and get the details that make the journey easier.</p>
    <form className="hero-search" action="/tournaments"><label><span>WHERE TO?</span><input name="q" aria-label="City, country or tournament" placeholder="City, country or tournament" /></label><label><span>FROM</span><input name="from" type="date" aria-label="Earliest travel date" /></label><button className="button" type="submit">Find a tournament <span>↗</span></button></form>
    <div className="hero-stats"><div><strong>{upcoming.length}</strong><span>upcoming & ongoing</span></div><div><strong>{countries}</strong><span>countries to explore</span></div><div><strong>Official</strong><span>sources, linked throughout</span></div></div>
  </div>
  {featured && <Link href={`/tournaments/${featured.slug}`} className="hero-feature"><div className="orb" aria-hidden="true"><div className="orbit o1" /><div className="orbit o2" /><div className="orbit o3" /><span className="map-label ml1">LAS VEGAS</span><span className="map-label ml2">PRAGUE</span><span className="map-label ml3">JEJU</span><span className="map-dot md1"/><span className="map-dot md2"/><span className="map-dot md3"/></div><div className="feature-overlay"><p className="eyebrow">ON THE RADAR <span>↗</span></p><h2>{featured.name}</h2><p>{destinationById(featured.destinationId).city} · {dateRange(featured.startDate,featured.endDate)}</p><div><span>MAIN EVENT</span><strong>{money(mainEvent(featured)?.buyIn)}</strong></div></div></Link>}
  </section>
  <div className="tour-strip"><div className="container"><span>EXPLORE THE TOURS</span>{tourFamilies.filter(t=>t.featured).map(t=><Link key={t.id} href={tourGuideHref(t.id)||`/tournaments?brand=${t.id}`}>{t.label}<span aria-hidden="true"> ↗</span></Link>)}<Link className="tour-strip-more" href="/tournaments">All tours</Link></div></div>
  <section className="container section"><SectionTitle number="01" eyebrow="THE TOURNAMENT CALENDAR" title="Next on the schedule"><Link className="text-link" href="/tournaments">All tournaments ↗</Link></SectionTitle><FestivalGrid items={upcoming.slice(0,6)} /></section>
  <section className="destination-section"><div className="container section"><SectionTitle number="02" eyebrow="BEYOND THE FELT" title="Make a destination of it"><Link className="text-link" href="/destinations">Explore destinations ↗</Link></SectionTitle><div className="destination-grid">{places.map(d => <DestinationCard key={d.id} destination={d} count={upcoming.filter(f => f.destinationId===d.id).length} />)}</div></div></section>
  <section className="container section editorial-grid"><div><p className="eyebrow">03 / INFORMATION YOU CAN TRACE</p><h2>Less searching.<br />More certainty.</h2><p className="muted">Schedules change. Every festival links to its source and tells you when it was checked. Missing details stay clearly marked.</p><Link className="text-link" href="/about">How we keep the guide current ↗</Link></div><div className="updates"><h3>Latest additions & changes</h3>{changes.map((c,i) => <Link key={i} href={`/tournaments/${c.festival.slug}`}><time>{c.date.slice(5,10).replace("-"," / ")}</time><div><strong>{c.festival.name}</strong><p>{c.text}</p></div><span>↗</span></Link>)}</div></section>
  </main>;
}
