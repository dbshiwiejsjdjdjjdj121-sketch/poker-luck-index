import { festivals, destinations } from "@/lib/guide-data";
import { filterFestivals } from "@/lib/guide-utils";
import { pageMeta } from "@/lib/site";
import { FilterForm } from "@/components/filters";
import { FestivalGrid } from "@/components/guide-ui";
import type { Filters } from "@/lib/guide-types";
type Props = { searchParams: Promise<Record<string,string|string[]|undefined>> };
export const revalidate = 3600;
export async function generateMetadata({searchParams}:Props) { const p=await searchParams; return pageMeta("Poker tournament calendar","Find live poker festivals by date, country, tour and buy-in. Browse official schedules and plan your next tournament trip.","/tournaments",Object.values(p).some(Boolean)); }
export default async function Tournaments({searchParams}:Props) {
  const raw=await searchParams, filters:Filters={};
  for(const key of ["q","from","to","country","city","tour","game","currency","min","max","status"] as const) { const v=raw[key]; if(typeof v==="string") filters[key]=v; }
  const result=filterFestivals(festivals,filters,Object.fromEntries(destinations.map(d=>[d.id,`${d.city} ${d.country}`])));
  const countries=[...new Map(destinations.map(d=>[d.countrySlug,d.country])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  const allEvents=festivals.flatMap(f=>f.tournaments);
  return <main id="main" className="container page"><div className="page-heading"><p className="eyebrow">THE GLOBAL LIVE POKER CALENDAR</p><h1>Find your next seat.</h1><p>Major festivals. Original currencies. Details straight from the source.</p></div>
  <FilterForm key={JSON.stringify(filters)} filters={filters} countries={countries} cities={destinations.map(d=>[d.id,d.city] as [string,string]).sort((a,b)=>a[1].localeCompare(b[1]))} tours={[...new Set(festivals.map(f=>f.tour))].sort()} games={[...new Set(allEvents.map(t=>t.game))].sort()} currencies={[...new Set(allEvents.flatMap(t=>t.buyIn?[t.buyIn.currency]:[]))].sort()}/>
  {filters.from && filters.to && filters.from>filters.to && <p className="notice">The end date is before the start date. Choose a wider date range.</p>}
  {filters.status==="ended"&&<p className="notice archive-notice">Past editions are kept for reference. Their buy-ins, entry rules and festival-specific offers are historical; follow the organizer for current events.</p>}
  <div className="results-heading"><p><strong>{result.length}</strong> festival{result.length===1?"":"s"} found</p><span>{filters.status==="ended"?"Most recent first":"By start date"} · venue local time</span></div><FestivalGrid items={result}/></main>;
}
