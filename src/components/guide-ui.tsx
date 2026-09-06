import Link from "next/link";
import type { ReactNode } from "react";
import type { Festival, Destination, TravelItem } from "@/lib/guide-types";
import { sourcesFor, destinationById } from "@/lib/guide-data";
import { buyInRange, dateRange, formatDate, isStale, mainEvent, money, statusOf } from "@/lib/guide-utils";

export function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;
}
export function SectionTitle({ number, eyebrow, title, children }: { number: string; eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="section-heading"><div><p className="eyebrow"><span>{number}</span> {eyebrow}</p><h2>{title}</h2></div>{children}</div>;
}
export function Status({ festival }: { festival: Festival }) {
  const state = statusOf(festival);
  return <span className={`status ${state}`}><i />{state === "ongoing" ? "Happening now" : state === "upcoming" ? "Upcoming" : state[0].toUpperCase() + state.slice(1)}</span>;
}
export function FestivalCard({ festival: f }: { festival: Festival }) {
  const d = destinationById(f.destinationId), main = mainEvent(f);
  return <article className="festival-card">
    <div className="card-top"><span className="tour">{f.tour}</span><Status festival={f} /></div>
    <p className="card-location">{d.city}<span> / {d.country}</span></p>
    <h3><Link href={`/tournaments/${f.slug}`}>{f.name}</Link></h3>
    <p className="card-date">{dateRange(f.startDate, f.endDate)}</p>
    <p className="card-venue">{f.venue.name}</p>
    <div className="card-values"><div><span>MAIN EVENT</span><strong>{main ? money(main.buyIn) : "To be confirmed"}</strong></div><div><span>HIGHLIGHTS</span><strong>{f.tournaments.length || "Pending"}</strong></div></div>
    <div className="card-bottom"><span>{buyInRange(f)}<small>Highlighted buy-ins · satellites excluded</small></span><Link aria-label={`View ${f.name}`} href={`/tournaments/${f.slug}`}>↗</Link></div>
    {(f.reviewNote || isStale(f)) && <p className="card-warning">{f.reviewNote ? "Source discrepancy noted" : "Recheck due · see sources"}</p>}
  </article>;
}
export function FestivalGrid({ items }: { items: Festival[] }) {
  return items.length ? <div className="festival-grid">{items.map(f => <FestivalCard key={f.id} festival={f} />)}</div> : <div className="empty-state"><span>♧</span><h2>No matching festivals</h2><p>Try a wider date range, another currency or a different destination.</p><Link className="button" href="/tournaments">Clear filters</Link></div>;
}
export function DestinationCard({ destination: d, count }: { destination: Destination; count: number }) {
  return <Link className="destination-card" href={`/destinations/${d.id}`}><span className="destination-code">{d.countryCode}</span><span className="eyebrow">{d.region}</span><h3>{d.city}</h3><p>{d.country}</p><div><span>{count} listed festival{count === 1 ? "" : "s"}</span><span>Explore ↗</span></div></Link>;
}
export function SourceList({ ids }: { ids: string[] }) {
  return <ul className="source-list">{sourcesFor(ids).map(s => <li key={s.id}><ExternalLink href={s.url}>{s.title}</ExternalLink><small>Checked {formatDate(s.checkedAt.slice(0,10), true)}</small></li>)}</ul>;
}
export function TravelList({ title, items }: { title: string; items: TravelItem[] }) {
  return <section className="travel-block"><h3>{title}</h3>{items.length ? items.map((i,n) => <div className="travel-item" key={n}><ExternalLink href={i.url}>{i.title}</ExternalLink><p>{i.detail}</p><small>{sourcesFor([i.sourceId]).map(s => `Source checked ${formatDate(s.checkedAt.slice(0,10), true)}`)}</small></div>) : <p className="muted">Specific recommendations are still being verified. Check the venue’s official visitor information before booking.</p>}</section>;
}
export function TravelGuide({ destination: d }: { destination: Destination }) {
  return <div className="travel-grid"><TravelList title="Getting there" items={[d.airport,...d.transport]} /><TravelList title="Where to stay" items={d.hotels} /><TravelList title="Food between sessions" items={d.dining} /><section className="travel-block"><h3>Winnings & tax</h3><p>{d.tax.text}</p><SourceList ids={d.tax.sourceIds} /><p className="fine-print">General information, not a personal tax calculation. Confirm your position with a qualified adviser and the organizer.</p></section></div>;
}
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="breadcrumbs"><Link href="/">Home</Link>{items.map((i,n) => <span key={n}><span aria-hidden="true"> / </span>{i.href ? <Link href={i.href}>{i.label}</Link> : i.label}</span>)}</nav>;
}
