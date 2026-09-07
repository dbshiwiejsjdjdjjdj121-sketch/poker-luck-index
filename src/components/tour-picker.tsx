import Link from "next/link";
import type { Filters } from "@/lib/guide-types";
import { tourFamilies, tourFamily, tourFilterHref } from "@/lib/tour-catalog";
export function TourPicker({filters,counts}:{filters:Filters;counts:Record<string,number>}) {
  const selected=tourFamily(filters.brand);
  function choice(id:string,label:string){return <Link key={id} className="tour-choice" aria-current={filters.brand===id?"true":undefined} href={tourFilterHref(filters,id)}><strong>{label}</strong><span>{counts[id]||0} listed</span></Link>;}
  return <section className="tour-picker" aria-label="Browse major poker tours"><div className="tour-picker-heading"><div><p className="eyebrow">START WITH A TOUR</p><p>Pick the name you follow.</p></div><Link href={tourFilterHref(filters)} aria-current={!filters.brand?"true":undefined}>All tours ↗</Link></div>
    <div className="tour-choices">{tourFamilies.filter(t=>t.featured).map(t=>choice(t.id,t.label))}</div>
    <details className="more-tours" open={selected&&!selected.featured?true:undefined}><summary>More tours & series <span>{tourFamilies.filter(t=>!t.featured).map(t=>t.label).join(" · ")}</span></summary><div className="tour-choices">{tourFamilies.filter(t=>!t.featured).map(t=>choice(t.id,t.label))}</div></details>
    <p className="tour-count-note">Counts show festivals listed in this guide matching your other filters, not the organizer’s entire calendar.</p>
    {selected&&<div className="selected-tour"><div><strong>{selected.fullName}</strong><p>{selected.description}</p></div><a href={selected.officialUrl} target="_blank" rel="noopener noreferrer">Official calendar ↗</a></div>}
  </section>;
}
