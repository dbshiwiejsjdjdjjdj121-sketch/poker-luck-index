import Link from "next/link";
import { freerolls } from "@/lib/freeroll-data";
import { filterFreerolls, featuredFreerolls, listedStates } from "@/lib/freerolls";
import { FreerollCard } from "./freeroll-card";

export function FreerollMarketGuide({country, cards=false}:{country:"US"|"GB";cards?:boolean}) {
 const items=filterFreerolls(freerolls,{country});
 const featured=featuredFreerolls(freerolls,country);
 const us=country==="US";
 const online=items.filter(f=>f.mode==="online").length;
 return <section id={us?"united-states":"united-kingdom"} className="fr-market">
  <div className="fr-market-heading"><div><p className="eyebrow">{us?"UNITED STATES":"UNITED KINGDOM"}</p><h2>{us?"Find free live poker by state":"Compare UK poker freeroll conditions"}</h2></div><Link className="text-link" href={`/freerolls?country=${country}`}>Compare {items.length} {us?"US":"UK"} guides ↗</Link></div>
  <p>{us?"Start with a participating venue in your state. Local league entry, championship qualification and prize rules can differ; listed coverage does not mean a game is available everywhere in the state.":"Check the operator’s country rules, funded-account or ticket requirements and the actual reward before choosing a program. Some offers exclude Northern Ireland; pub-member leagues have their own membership conditions."}</p>
  {us && online===0 && <p className="fine-print">Our current US guides cover live games. We have no verified US online freeroll program in this directory; that is a coverage gap, not a claim that none exist.</p>}
  <div className="fr-quick-links" aria-label={us?"Listed US states":"UK entry options"}>{us?listedStates(freerolls).map(s=><Link key={s.code} href={`/freerolls?country=US&state=${s.code}`}>{s.name} ↗</Link>):<><Link href="/freerolls?country=GB&entry=no-deposit">Compare no-deposit entry routes ↗</Link><Link href="/freerolls?country=GB&mode=online">Online programs ↗</Link></>}</div>
  {cards?<div className="fr-grid">{featured.map(f=><FreerollCard key={f.id} item={f}/>)}</div>:<ul className="fr-market-comparison">{featured.map(f=><li key={f.id}><Link href={`/freerolls/${f.slug}`}>{f.title} ↗</Link><p>{f.entry.costNote}</p><small>Reward: {f.reward.label}</small></li>)}</ul>}
 </section>;
}
