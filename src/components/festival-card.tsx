import Link from "next/link";
import type { Destination, Festival } from "@/lib/guide-types";
import { buyInRange, dateRange, isStale, mainEvent, money, statusOf } from "@/lib/guide-utils";
import { SaveButton } from "./save-button";
export function FestivalStatus({ festival }: { festival: Festival }) {
  const state=statusOf(festival);
  return <span className={`status ${state}`}><i/>{state==="ongoing"?"Happening now":state==="upcoming"?"Upcoming":state[0].toUpperCase()+state.slice(1)}</span>;
}
export function FestivalCardView({festival:f,destination:d}:{festival:Festival;destination:Destination}) {
  const main=mainEvent(f),archived=statusOf(f)==="ended";
  return <article className="festival-card">
    <div className="card-top"><span className="tour">{f.tour}</span><SaveButton festivalId={f.id} name={f.name} compact/></div>
    <FestivalStatus festival={f}/><p className="card-location">{d.city}<span> / {d.country}</span></p>
    <h3><Link href={`/tournaments/${f.slug}`}>{f.name}</Link></h3><p className="card-date">{dateRange(f.startDate,f.endDate)}</p><p className="card-venue">{f.venue.name}</p>
    <div className="card-values"><div><span>MAIN EVENT</span><strong>{main?money(main.buyIn):archived?"Not confirmed":"To be confirmed"}</strong></div><div><span>HIGHLIGHTS</span><strong>{f.tournaments.length||(archived?"None recorded":"Pending")}</strong></div></div>
    <div className="card-bottom"><span>{archived&&!f.tournaments.some(t=>t.category!=="satellite"&&t.buyIn)?"No confirmed buy-ins":buyInRange(f)}<small>Highlighted buy-ins · satellites excluded</small></span><Link aria-label={`View ${f.name}`} href={`/tournaments/${f.slug}`}>↗</Link></div>
    {(f.reviewNote||isStale(f))&&<p className="card-warning">{f.reviewNote?"Source discrepancy noted":"Recheck due · see sources"}</p>}
  </article>;
}
