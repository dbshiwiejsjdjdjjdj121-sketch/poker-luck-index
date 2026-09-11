import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, DestinationCard, ExternalLink, FestivalGrid, SourceList } from "@/components/guide-ui";
import { destinations } from "@/lib/guide-data";
import { formatDate, serializeJsonLd } from "@/lib/guide-utils";
import { pageMeta, SITE_URL } from "@/lib/site";
import { tourFamily } from "@/lib/tour-catalog";
import { tourGuideFor, tourGuides } from "@/lib/tour-guide-data";
import { tourGuideFestivals, tourGuideModified } from "@/lib/tour-guides";
import "./tour-guide.css";

type Props = { params: Promise<{ slug: string }> };
export const revalidate = 3600;
export async function generateMetadata({ params }: Props) {
  const guide = tourGuideFor((await params).slug);
  return guide ? pageMeta(guide.title, guide.description, `/tours/${guide.tourId}`) : {};
}

export default async function TourGuidePage({ params }: Props) {
  const guide = tourGuideFor((await params).slug);
  if (!guide) notFound();
  const family = tourFamily(guide.tourId)!;
  const upcoming = tourGuideFestivals(family.id);
  const destinationIds = [...new Set(upcoming.map(f => f.destinationId))];
  const places = destinationIds.slice(0, 4).flatMap(id => destinations.filter(d => d.id === id));
  const calendar = `/tournaments?brand=${family.id}`;
  const modified = tourGuideModified(guide);
  return <main id="main" className="container page tour-guide">
    <Breadcrumbs items={[{ label: "Tournaments", href: "/tournaments" }, { label: `${family.label} guide` }]} />
    <header className="tour-guide-heading">
      <div><p className="eyebrow">{family.fullName}</p><h1>{guide.title}</h1><p className="tour-guide-intro">{guide.intro}</p></div>
      <aside className="tour-guide-summary"><span>IN THIS GUIDE</span><strong>{upcoming.length}</strong><p>upcoming & ongoing {upcoming.length === 1 ? "festival" : "festivals"}<br />across {destinationIds.length} {destinationIds.length === 1 ? "destination" : "destinations"}</p><Link className="button" href={calendar}>Filter {family.label} festivals ↗</Link></aside>
    </header>
    <nav className="anchor-nav" aria-label="On this tour guide"><a href="#upcoming">Upcoming festivals</a><a href="#formats">Tour formats</a><a href="#travel">Plan your trip</a><a href="#official">Official calendar</a></nav>
    <section id="upcoming" className="section compact">
      <div className="section-heading"><div><p className="eyebrow">CHOOSE YOUR NEXT STOP</p><h2>Upcoming {family.label} tournaments</h2></div><Link className="text-link" href={calendar}>Filter by date, place & buy-in ↗</Link></div>
      <p className="tour-guide-note">Our published coverage, ordered by festival start date. Ongoing festivals remain listed until they end; check the overview for the entry days still available. Dates use venue local time.</p>
      {upcoming.length ? <FestivalGrid items={upcoming.slice(0, 6)} /> : <div className="empty-state"><h2>No upcoming editions listed yet</h2><p>This guide does not cover the organizer’s entire calendar. Check the official calendar below for further announcements.</p><a className="button" href="#official">Open official links</a></div>}
      {upcoming.length > 6 && <Link className="button button-outline tour-guide-more" href={calendar}>See all {upcoming.length} listed {family.label} festivals ↗</Link>}
      <p className="tour-guide-note"><Link href={`${calendar}&status=ended`}>View past editions</Link>. Ended festivals stay available for reference and in your saved list.</p>
    </section>
    <section id="formats" className="section compact"><p className="eyebrow">UNDERSTAND THE CALENDAR</p><h2>Which {family.label} event fits your plans?</h2>
      <div className="tour-guide-formats">{guide.formats.map(format => <article key={format.title}><h3>{format.title}</h3><p>{format.description}</p>{format.series && <Link className="text-link" href={`${calendar}&tour=${encodeURIComponent(format.series)}`}>Browse {format.title} ↗</Link>}</article>)}</div>
    </section>
    <section id="travel" className="section compact"><p className="eyebrow">BEFORE YOU BOOK</p><h2>Plan the tournament and the trip.</h2>
      <div className="tour-guide-planning">{guide.planning.map((item, index) => <article key={item.title}><span aria-hidden="true">0{index + 1}</span><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div>
      {places.length > 0 && <><h3 className="tour-guide-places-title">Destinations with upcoming listed festivals</h3><div className="destination-grid">{places.map(destination => <DestinationCard key={destination.id} destination={destination} count={upcoming.filter(f => f.destinationId === destination.id).length} />)}</div></>}
    </section>
    <section id="official" className="official-section"><div><p className="eyebrow">CONFIRM WITH THE ORGANIZER</p><h2>The complete {family.label} calendar.</h2><p>Find the full schedule, eligibility rules and available registration options on the official website. This guide is independent of {family.fullName}.</p></div><div className="official-links"><ExternalLink className="button" href={family.officialUrl}>Official {family.label} calendar</ExternalLink><Link className="text-link" href={calendar}>Return to our {family.label} directory ↗</Link></div></section>
    <section className="section compact source-section"><div><h3>Sources for this tour introduction</h3><SourceList ids={guide.sourceIds} /><p>Introduction checked {formatDate(guide.checkedAt.slice(0, 10), true)}. Each festival and destination has its own sources and verification dates.</p></div><div><h3>Explore another tour</h3><div className="tour-guide-related">{tourGuides.filter(g => g.tourId !== guide.tourId).map(g => <Link key={g.tourId} href={`/tours/${g.tourId}`}>{tourFamily(g.tourId)!.fullName} ↗</Link>)}</div></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@type": "CollectionPage", name: guide.title, description: guide.description, url: SITE_URL + `/tours/${guide.tourId}`, inLanguage: "en", dateModified: modified, mainEntity: { "@type": "ItemList", itemListElement: upcoming.slice(0, 6).map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.name, url: SITE_URL + `/tournaments/${f.slug}` })) } }) }} />
  </main>;
}
