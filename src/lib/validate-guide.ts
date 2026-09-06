import type { GuideData, Money } from "./guide-types";
export function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function validateGuide(input: unknown, now = new Date()): string[] {
  const errors: string[] = [];
  const check=(condition:unknown,message:string)=>{if(!condition)errors.push(message)};
  const url=(value:string)=>{try{return new URL(value).protocol==="https:"}catch{return false}};
  const timestamp=(value:string)=>typeof value==="string"&&/^\d{4}-/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=now.getTime()+300000;
  const unique=(values:string[],name:string)=>check(new Set(values).size===values.length,name+" contains duplicate IDs");
  try {
    const d=input as GuideData;
    if(!d || !Array.isArray(d.festivals)||!Array.isArray(d.destinations)||!Array.isArray(d.sources))return ["Expected festivals, destinations and sources arrays"];
    unique(d.festivals.map(f=>f.id),"Festivals");unique(d.festivals.map(f=>f.slug),"Festival URLs");unique(d.destinations.map(f=>f.id),"Destinations");unique(d.sources.map(f=>f.id),"Sources");
    unique(d.festivals.map(f=>f.tour+"|"+f.destinationId+"|"+f.scheduleUrl),"Official event identities");
    const sourceMap=new Map(d.sources.map(s=>[s.id,s])), destIds=new Set(d.destinations.map(d=>d.id));
    const refs=(ids:string[],label:string)=>{check(Array.isArray(ids)&&ids.length>0,label+" needs a source");for(const id of ids)check(sourceMap.has(id),label+": unknown source "+id)};
    for(const s of d.sources){check(s.id&&s.title&&url(s.url),"Invalid source "+s.id);check(timestamp(s.checkedAt),"Invalid check timestamp "+s.id);check(["schedule","travel","tax","organizer"].includes(s.kind),"Invalid source kind "+s.id)}
    for(const p of d.destinations){
      check(p.id===p.countrySlug+"/"+p.slug,"Invalid destination path "+p.id);
      check(p.city&&p.country&&/^[A-Z]{2}$/.test(p.countryCode)&&p.intro,"Incomplete destination "+p.id);
      check(timestamp(p.updatedAt),"Invalid destination update "+p.id);
      for(const item of [p.airport,...p.transport,...p.hotels,...p.dining]){check(item.title&&item.detail&&url(item.url),"Invalid travel item "+p.id);refs([item.sourceId],p.id)}
      for(const id of p.tax.sourceIds)check(sourceMap.get(id)?.kind==="tax","Invalid tax source "+p.id);
    }
    const checkMoney=(m:Money|null,label:string)=>{if(m!==null)check(typeof m.amount==="number"&&Number.isFinite(m.amount)&&m.amount>=0&&/^[A-Z]{3}$/.test(m.currency),label+": invalid money")};
    for(const f of d.festivals){
      const label=f.id;
      check(/^[a-z0-9-]+$/.test(f.slug)&&/20\d{2}/.test(f.slug),"Festival needs year-specific slug "+label);
      check(f.name&&f.tour&&f.description&&f.venue.name&&destIds.has(f.destinationId),"Incomplete festival "+label);
      check(validDate(f.startDate)&&validDate(f.endDate)&&f.startDate<=f.endDate,"Invalid festival date range "+label);
      try{new Intl.DateTimeFormat("en",{timeZone:f.timezone}).format(now)}catch{errors.push("Invalid timezone "+label)}
      check(["scheduled","postponed","cancelled"].includes(f.status),"Invalid status "+label);
      check(url(f.scheduleUrl)&&url(f.registrationUrl)&&(!f.venue.url||url(f.venue.url)),"Invalid official link "+label);
      refs(f.sourceIds,label);
      check(timestamp(f.checkedAt)&&timestamp(f.updatedAt),"Invalid timestamp "+label);
      check(f.sourceIds.some(id=>Date.parse(sourceMap.get(id)?.checkedAt || "")>=Date.parse(f.checkedAt)),"Check date must match a successfully read festival source "+label);
      check(Array.isArray(f.changes)&&f.changes.every(c=>c.text&&timestamp(c.date)),"Invalid change log "+label);
      unique(f.tournaments.map(t=>t.id),label+" highlights");unique(f.tournaments.map(t=>t.slug),label+" highlight slugs");
      check(f.tournaments.filter(t=>t.category==="main").length<=1,"Multiple main events "+label);
      for(const t of f.tournaments){
        check(t.id&&t.name&&t.game&&["main","side","satellite"].includes(t.category),"Invalid highlight "+label);
        refs(t.sourceIds,label+"/"+t.id);
        checkMoney(t.buyIn,label);checkMoney(t.fee,label);checkMoney(t.guarantee,label);
        if(t.fee&&t.buyIn)check(t.fee.currency===t.buyIn.currency&&t.fee.amount<=t.buyIn.amount,"Fee exceeds total or uses another currency "+label);
        unique(t.sessions.map(s=>s.id),label+"/"+t.id+" sessions");
        for(const s of t.sessions){
          check(validDate(s.date),"Invalid session date "+label);
          check(s.time===null||/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time),"Invalid local time "+label);
          check(["entry","continuation"].includes(s.kind),"Invalid session kind "+label);
          check((s.date>=f.startDate&&s.date<=f.endDate)||!!f.reviewNote,"Session outside festival without discrepancy note "+label);
        }
        if(t.endDate)check(validDate(t.endDate)&&t.sessions.every(s=>s.date<=t.endDate!),"Invalid tournament end date "+label);
      }
    }
  } catch (e) { errors.push("Malformed data structure: "+(e instanceof Error?e.message:"unknown error")); }
  return errors;
}
