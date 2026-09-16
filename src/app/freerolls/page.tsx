import Link from "next/link";
import { freerolls } from "@/lib/freeroll-data";
import { filterFreerolls } from "@/lib/freerolls";
import type { FreerollFilters } from "@/lib/guide-types";
import { pageMeta, SITE_URL } from "@/lib/site";
import { serializeJsonLd } from "@/lib/guide-utils";
import { FreerollCard } from "@/components/freeroll-card";
import { FreerollQuestions } from "@/components/freeroll-questions";
import { Breadcrumbs } from "@/components/guide-ui";
export const revalidate=900;
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
export async function generateMetadata({searchParams}:Props){const q=await searchParams;return pageMeta("Poker freerolls & entry requirements","Compare online poker freerolls and live free-entry games by country, deposit requirements and published starts. Read prize details and official entry rules.","/freerolls",Object.keys(q).length>0);}
export default async function Freerolls({searchParams}:Props){
 const raw=await searchParams;const filters:FreerollFilters=Object.fromEntries(Object.entries(raw).filter(([,v])=>typeof v==="string"));
 const items=filterFreerolls(freerolls,filters);
 return <main id="main" className="container page"><Breadcrumbs items={[{label:"Freerolls"}]}/><div className="fr-heading"><p className="eyebrow">FREE ENTRY. CLEAR CONDITIONS.</p><h1>Poker freerolls.<br/><em>Know before you enter.</em></h1><p className="lead">Compare online poker freerolls and selected live free-entry games. Filter by country, deposit requirements and confirmed starts, then open a guide for prizes, entry rules and official links.</p></div>
 <form className="fr-filters" action="/freerolls" key={JSON.stringify(filters)}><label>Search<input name="q" defaultValue={filters.q} placeholder="Brand, program or city"/></label><label>Format<select name="mode" defaultValue={filters.mode||""}><option value="">All formats</option><option value="online">Online</option><option value="live">Live / local</option></select></label><label>Eligible country<select name="country" defaultValue={filters.country||""}><option value="">All listed markets</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="FR">France</option></select></label><label>US state<select name="state" defaultValue={filters.state||""}><option value="">All listed states</option><option value="GA">Georgia · live only</option></select></label><label>Entry<select name="entry" defaultValue={filters.entry||""}><option value="">All conditions</option><option value="no-deposit">No deposit confirmed</option></select></label><label>Published starts<select name="when" defaultValue={filters.when||""}><option value="">Programs & dated starts</option><option value="today">Today, venue local time</option><option value="week">Next 7 local calendar days</option></select></label><button className="button" type="submit">Apply filters</button><Link className="text-link" href="/freerolls">Clear filters</Link></form>
 <p className="fr-coverage">{items.length} matching guide{items.length===1?"":"s"} in our initial coverage. Country labels describe the specific sourced program, not universal availability. “Today” and “Next 7 days” include only dated starts we have checked within 48 hours; recurring lobby-only programs are excluded.</p>
 {items.length?<div className="fr-grid">{items.map(f=><FreerollCard key={f.id} item={f}/>)}</div>:<div className="empty-state"><h2>No verified matches for these filters</h2><p>That does not mean no freerolls exist. Our coverage is limited to the official information we can verify.</p><Link className="button" href="/freerolls">Clear filters</Link></div>}
 <FreerollQuestions />
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({"@context":"https://schema.org","@type":"CollectionPage",name:"Poker freerolls & entry requirements",url:SITE_URL+"/freerolls",mainEntity:{"@type":"ItemList",itemListElement:items.map((f,i)=>({"@type":"ListItem",position:i+1,name:f.title,url:SITE_URL+"/freerolls/"+f.slug}))}})}}/>
 </main>;
}
