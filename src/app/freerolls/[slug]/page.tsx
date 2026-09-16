import Link from "next/link";
import { notFound } from "next/navigation";
import { freerolls,freerollBySlug } from "@/lib/freeroll-data";
import { availableSlots,entryLabel,freerollEnded,freerollStale } from "@/lib/freerolls";
import { pageMeta,SITE_URL } from "@/lib/site";
import { formatDate,serializeJsonLd } from "@/lib/guide-utils";
import { festivalBreadcrumbs } from "@/lib/festival-seo";
import { Breadcrumbs,ExternalLink,SourceList } from "@/components/guide-ui";
export const revalidate=900;
export function generateStaticParams(){return freerolls.map(f=>({slug:f.slug}));}
type Props={params:Promise<{slug:string}>};
const conditionLabels: Record<string,string> = {required:"Required", "not-required":"Not required", varies:"Varies by tournament", unknown:"Not confirmed; check the organizer"};
export async function generateMetadata({params}:Props){const f=freerollBySlug((await params).slug);return f?pageMeta(f.title,f.description,"/freerolls/"+f.slug):{};}
export default async function FreerollGuide({params}:Props){
 const f=freerollBySlug((await params).slug);if(!f)notFound();
 const stale=freerollStale(f),ended=freerollEnded(f),slots=availableSlots(f);const crumbs=[{label:"Freerolls",href:"/freerolls"},{label:f.title}];
 return <main id="main" className="container page fr-detail"><Breadcrumbs items={crumbs}/><header className="fr-heading"><p className="eyebrow">{f.mode === "online" ? "ONLINE PROGRAM" : "LIVE / LOCAL LEAGUE"} · {f.brand}</p><h1>{f.title}</h1><p className="lead">{f.description}</p><p className="muted">Independent guide by <Link href="/about">ALL IN Poker Guide</Link> · Information updated {formatDate(f.updatedAt.slice(0,10),true)}</p></header>
 {(ended||f.status!=="published"||stale)&&<p className="notice" role="status">{ended?"This program has ended. Details below are historical.":f.status!=="published"?"This listing is paused while availability is reviewed.":"Recheck due: the last successful source check is more than 48 hours old. Confirm current availability with the organizer; dated starts are withheld until rechecked."}</p>}
 <nav className="anchor-nav fr-detail-nav" aria-label="On this freeroll guide"><a href="#entry">Entry conditions</a><a href="#eligibility">Eligible regions</a><a href="#rewards">Prizes</a><a href="#schedule">Starts</a><a href="#official">Official links</a></nav>
 <div className="fr-detail-grid"><div><section id="entry" className="fr-block"><p className="eyebrow">ENTRY AT A GLANCE</p><h2>Is entry free, and what is required?</h2><p className="fr-label">{entryLabel(f)}</p><p className="fr-cost">{f.entry.costNote}</p><ul>{f.entry.requirements.map(s=><li key={s}>{s}</li>)}</ul><dl className="fr-facts"><div><dt>Tournament buy-in</dt><dd>Free entry</dd></div><div><dt>Ticket</dt><dd>{conditionLabels[f.entry.ticket]}</dd></div><div><dt>Password</dt><dd>{conditionLabels[f.entry.password]}</dd></div></dl></section>
 <section id="eligibility" className="fr-block"><p className="eyebrow">REGIONAL AVAILABILITY</p><h2>Where is this program available?</h2><p className="fr-label">{f.market.label}</p><p>{f.market.note}</p></section>
 <section id="rewards" className="fr-block"><p className="eyebrow">REWARDS</p><h2>What can you win?</h2><p className="fr-label">{f.reward.label}</p><p>{f.reward.details}</p></section>
 <section id="schedule" className="fr-block"><p className="eyebrow">WHEN IT RUNS</p><h2>When does the freeroll run?</h2><p>{f.schedule.text}</p>{slots.length>0?<><p className="fine-print">Selected starts in the next seven local calendar days. Times are at the venue; a listed start does not guarantee seats remain available.</p><ul className="fr-slots">{slots.map(s=><li key={s.id}><time>{formatDate(s.date,true)} · {s.time || "Time not published"}</time><strong>{s.label}</strong><small>{s.timezone}</small></li>)}</ul></>:<p className="fine-print">No current dated starts are shown here. For recurring programs, use the official lobby or calendar to confirm an individual occurrence.</p>}</section>
 {f.reviewNote&&<p className="notice">Source discrepancy: {f.reviewNote}</p>}
 {f.sections.map(s=><section className="fr-block" key={s.title}><h2>{s.title}</h2><p>{s.text}</p></section>)}</div>
 <aside className="fr-side"><p className="eyebrow">SOURCE CHECK</p><strong>{formatDate(f.checkedAt.slice(0,10),true)}</strong><p>{stale?"Recheck due":"Successfully read official information"}</p><p>This guide summarizes an organizer’s program. Read the linked conditions for your account and location.</p><a href="#official" className="button button-outline">Official information ↓</a><Link className="text-link" href="/freerolls">Compare freeroll guides ↗</Link><Link className="text-link" href="/tournaments">Explore live festivals ↗</Link></aside></div>
 <section id="official" className="fr-official"><p className="eyebrow">CONTINUE WITH THE ORGANIZER</p><h2>Official rules & how to enter</h2><p>Use the organizer’s official rules, explanation or calendar below to confirm eligibility and the next available game. Follow its instructions to enter through the official website, app or venue; ALL IN Poker Guide does not take registrations.</p><div className="fr-official-links">{f.officialLinks.map(l=><ExternalLink key={l.url} href={l.url} className="button button-outline">{l.label}</ExternalLink>)}</div><SourceList ids={f.sourceIds}/></section>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd({"@context":"https://schema.org","@type":"WebPage",name:f.title,description:f.description,url:SITE_URL+"/freerolls/"+f.slug,dateModified:f.updatedAt,inLanguage:"en",about:{"@type":"Thing",name:f.brand},author:{"@type":"Organization",name:"ALL IN Poker Guide",url:SITE_URL+"/about"}})}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(festivalBreadcrumbs(crumbs))}}/>
 </main>;
}
