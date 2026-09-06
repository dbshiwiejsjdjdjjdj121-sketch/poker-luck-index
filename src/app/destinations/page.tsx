import Link from "next/link";
import { destinations, festivals } from "@/lib/guide-data";
import { DestinationCard } from "@/components/guide-ui";
import { pageMeta } from "@/lib/site";
export const revalidate=3600;
export const metadata=pageMeta("Poker destinations","Explore live poker destinations with local tournament overviews, accommodation and travel planning links.","/destinations");
export default function Destinations(){const countries=[...new Map(destinations.map(d=>[d.countrySlug,d.country])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));return <main id="main" className="container page"><div className="page-heading"><p className="eyebrow">PLAN THE JOURNEY</p><h1>Where will poker take you?</h1><p>Start with a destination. Find a festival. Make the travel work for you.</p></div><div className="country-links">{countries.map(([slug,name])=><Link key={slug} href={`/destinations/${slug}`}>{name} ↗</Link>)}</div><div className="destination-grid">{destinations.slice().sort((a,b)=>a.city.localeCompare(b.city)).map(d=><DestinationCard key={d.id} destination={d} count={festivals.filter(f=>f.destinationId===d.id).length}/>)}</div></main>;}
