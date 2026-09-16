import type { GuideData, Money, Source, TourFamily, TourGuide } from "./guide-types";
export function validateTourGuides(input: unknown, catalog: TourFamily[], sources: Source[], now = new Date()): string[] {
  if (!Array.isArray(input)) return ["Expected tour guides array"];
  const errors: string[] = [], seen = new Set<string>();
  const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now.getTime() + 300000;
  for (const guide of input as TourGuide[]) {
    try {
      const family = catalog.find(t => t.id === guide.tourId);
      if (!family || seen.has(guide.tourId)) errors.push("Unknown or duplicate guide tour " + guide.tourId);
      seen.add(guide.tourId);
      if (![guide.title, guide.description, guide.intro].every(s => typeof s === "string" && s.trim())) errors.push("Incomplete tour guide " + guide.tourId);
      for (const section of [guide.formats, guide.planning]) {
        if (!Array.isArray(section) || !section.length || !section.every(item => typeof item.title === "string" && item.title.trim() && typeof item.description === "string" && item.description.trim())) errors.push("Incomplete tour guide sections " + guide.tourId);
      }
      if (!guide.formats.every(f => f.series === null || family?.series.includes(f.series))) errors.push("Unknown guide series " + guide.tourId);
      if (!timestamp(guide.checkedAt) || !timestamp(guide.updatedAt)) errors.push("Invalid tour guide dates " + guide.tourId);
      if (!Array.isArray(guide.sourceIds) || !guide.sourceIds.length || new Set(guide.sourceIds).size !== guide.sourceIds.length || !guide.sourceIds.every(id => sources.some(s => s.id === id))) errors.push("Invalid tour guide sources " + guide.tourId);
      if (!guide.sourceIds.some(id => sources.some(s => s.id === id && Date.parse(s.checkedAt) >= Date.parse(guide.checkedAt)))) errors.push("Tour introduction needs a verified source " + guide.tourId);
    } catch { errors.push("Malformed tour guide"); }
  }
  return errors;
}
export function validateTourCatalog(input: unknown, now = new Date()): string[] {
  if (!Array.isArray(input) || !input.length) return ["Expected a non-empty tour catalog"];
  const errors: string[] = [], ids = new Set<string>(), series = new Set<string>();
  for (const row of input as TourFamily[]) {
    try {
      if (typeof row.id !== "string" || !/^[a-z0-9-]+$/.test(row.id) || ids.has(row.id)) errors.push("Invalid or duplicate tour ID");
      ids.add(row.id);
      if (![row.label, row.fullName, row.description].every(s => typeof s === "string" && s.trim()) || typeof row.featured !== "boolean") errors.push("Incomplete tour " + row.id);
      if (new URL(row.officialUrl).protocol !== "https:") errors.push("Invalid tour URL " + row.id);
      if (!Array.isArray(row.series) || !row.series.length || !row.series.every(s => typeof s === "string" && s.trim()) || new Set(row.series).size !== row.series.length) errors.push("Invalid tour series " + row.id);
      if (Array.isArray(row.series)) for (const name of row.series) { if (series.has(name)) errors.push("Ambiguous tour series " + name); series.add(name); }
      if (!Array.isArray(row.keywords) || !row.keywords.every(s => typeof s === "string")) errors.push("Invalid tour aliases " + row.id);
      if (typeof row.checkedAt !== "string" || !Number.isFinite(Date.parse(row.checkedAt)) || Date.parse(row.checkedAt) > now.getTime() + 300000) errors.push("Invalid tour verification " + row.id);
    } catch { errors.push("Malformed tour catalog record"); }
  }
  return errors;
}
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
    unique(d.festivals.map(f=>f.tour+"|"+f.destinationId+"|"+f.startDate.slice(0,4)+"|"+f.scheduleUrl),"Official event identities");
    unique(d.festivals.flatMap(f=>f.previousEditionId?[f.previousEditionId]:[]),"Edition successors");
    const festivalMap=new Map(d.festivals.map(f=>[f.id,f]));
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
      if(f.previousEditionId!==undefined){
        const previous=festivalMap.get(f.previousEditionId);
        check(previous&&previous.id!==f.id&&previous.endDate<f.startDate&&previous.tour===f.tour,"Invalid previous edition "+label);
      }
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

export function validateFreerolls(input: unknown, sources: Source[], now = new Date()): string[] {
  if (!Array.isArray(input)) return ["Expected freerolls array"];
  const errors: string[] = [], ids = new Set<string>(), slugs = new Set<string>(), identities = new Set<string>();
  const check = (ok: unknown, message: string) => { if (!ok) errors.push(message); };
  const text = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const timestamp = (v: unknown) => typeof v === "string" && /T.*Z$/.test(v) && Number.isFinite(Date.parse(v)) && Date.parse(v) <= now.getTime() + 300000;
  for (const f of input as import("./guide-types").Freeroll[]) {
    try {
      check(/^[a-z0-9-]+$/.test(f.id) && !ids.has(f.id), "Invalid or duplicate freeroll ID " + f.id); ids.add(f.id);
      check(/^[a-z0-9-]+$/.test(f.slug) && !slugs.has(f.slug), "Invalid or duplicate freeroll slug " + f.id); slugs.add(f.slug);
      check([f.title,f.brand,f.description,f.market.label,f.market.note,f.entry.costNote,f.reward.label,f.reward.details,f.schedule.text].every(text), "Incomplete freeroll " + f.id);
      check(["online","live"].includes(f.mode) && ["published","paused","ended"].includes(f.status), "Invalid freeroll status/mode " + f.id);
      check(f.market.countries.every(c => /^[A-Z]{2}$/.test(c)) && f.market.usStates.every(s => /^[A-Z]{2}$/.test(s)), "Invalid freeroll market " + f.id);
      check(!f.market.usStates.length || f.market.countries.includes("US"), "US states without US market " + f.id);
      check(!f.market.countries.includes("US") || f.market.usStates.length > 0, "US coverage requires verified states " + f.id);
      check(f.entry.buyIn === 0 && ["not-required","required","unknown"].includes(f.entry.deposit) && ["required","varies","not-required"].includes(f.entry.ticket) && ["required","varies","not-required","unknown"].includes(f.entry.password), "Invalid freeroll entry conditions " + f.id);
      check(f.entry.requirements.length > 0 && f.entry.requirements.every(text), "Missing freeroll eligibility " + f.id);
      check(timestamp(f.checkedAt) && timestamp(f.updatedAt), "Invalid freeroll timestamps " + f.id);
      check(f.sourceIds.length > 0 && new Set(f.sourceIds).size === f.sourceIds.length && f.sourceIds.every(id => sources.some(s => s.id === id && Date.parse(s.checkedAt) >= Date.parse(f.checkedAt))), "Freeroll check exceeds a source check or has unknown sources " + f.id);
      check(f.reviewNote === null || text(f.reviewNote), "Invalid freeroll review note " + f.id);
      check(f.schedule.endDate === null || (validDate(f.schedule.endDate) && text(f.schedule.timezone)), "Invalid freeroll end date/timezone " + f.id);
      if (f.schedule.timezone !== null) new Intl.DateTimeFormat("en", {timeZone:f.schedule.timezone}).format(now);
      check(f.sections.length > 0 && f.sections.every(s => text(s.title) && text(s.text)), "Missing freeroll overview " + f.id);
      check(f.officialLinks.length > 0, "Missing freeroll official links " + f.id);
      for (const link of f.officialLinks) {
        check(text(link.label) && new URL(link.url).protocol === "https:" && ["rules","schedule","explanation"].includes(link.kind), "Invalid freeroll official link " + f.id);
        check(f.sourceIds.includes(link.sourceId) && sources.some(s => s.id === link.sourceId && s.url === link.url), "Unverified freeroll link " + f.id);
      }
      const identity = f.brand + "|" + f.officialLinks[0]?.url;
      check(!identities.has(identity), "Duplicate freeroll program source " + f.id); identities.add(identity);
      const slotIds = new Set<string>();
      for (const s of f.schedule.slots) {
        check(text(s.id) && !slotIds.has(s.id) && text(s.label), "Invalid or duplicate freeroll slot " + f.id);slotIds.add(s.id);
        check(validDate(s.date) && (s.time === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)), "Invalid freeroll slot date/time " + f.id);
        check(f.schedule.endDate === null || s.date <= f.schedule.endDate, "Freeroll slot after end date " + f.id);
        new Intl.DateTimeFormat("en", {timeZone:s.timezone}).format(now);
        check(f.sourceIds.includes(s.sourceId), "Unknown freeroll slot source " + f.id);
      }
    } catch { errors.push("Malformed freeroll " + (f?.id || "record")); }
  }
  return errors;
}
