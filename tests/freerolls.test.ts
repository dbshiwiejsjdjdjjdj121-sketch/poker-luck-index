import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Freeroll,Source } from "../src/lib/guide-types";
import { validateFreerolls } from "../src/lib/validate-guide";
import { filterFreerolls,availableSlots,freerollStale,freerollEnded } from "../src/lib/freerolls";
import { stageFreerolls } from "../src/lib/stage-freerolls";
const items=JSON.parse(readFileSync("data/freerolls.json","utf8")) as Freeroll[];
const sources=JSON.parse(readFileSync("data/sources.json","utf8")) as Source[];
const now=new Date("2026-09-16T10:00:00Z");
const fixture=()=>({...structuredClone(items[0]),checkedAt:"2026-09-16T03:00:00Z"});
test("source-backed freeroll catalog is valid; paid and unknown eligibility never match no-deposit",()=>{
 assert.deepEqual(validateFreerolls(items,sources,new Date()),[]);
 const free=fixture(),paid={...fixture(),id:"paid",entry:{...fixture().entry,deposit:"required" as const}},unknown={...fixture(),id:"unknown",entry:{...fixture().entry,deposit:"unknown" as const}};
 assert.deepEqual(filterFreerolls([free,paid,unknown],{entry:"no-deposit"},now).map(f=>f.id),[free.id]);
 assert.equal(filterFreerolls(items,{country:"US",mode:"online"},now).length,0);
 assert.equal(filterFreerolls(items,{country:"US",state:"GA",mode:"live"},now).length,1);
 assert.equal(filterFreerolls(items,{state:"CA"},now).length,0);
});
test("local date windows cross months and daylight saving; unknown time remains date-only",()=>{
 const f=fixture();f.checkedAt="2026-10-31T10:00:00Z";
 f.schedule.slots=[{id:"dst",label:"Future start",date:"2026-11-01",time:"03:00",timezone:"America/New_York",sourceId:f.sourceIds[0]},{id:"unknown",label:"Date only",date:"2026-10-31",time:null,timezone:"America/New_York",sourceId:f.sourceIds[0]}];
 assert.equal(availableSlots(f,"week",new Date("2026-11-01T03:30:00Z")).length,2); // Still Oct 31 at venue.
 assert.deepEqual(availableSlots(f,"today",new Date("2026-11-01T03:30:00Z")).map(s=>s.id),["unknown"]);
 assert.equal(availableSlots(f,"today",new Date("2026-11-01T07:30:00Z"))[0]?.id,"dst");
 assert.equal(availableSlots(f,"today",new Date("2026-11-01T08:01:00Z")).length,0);
});
test("stale, paused and ended programs cannot claim dated availability; unannounced times are not generated",()=>{
 const f=fixture();f.schedule.slots=[{id:"start",label:"start",date:"2026-09-16",time:"20:00",timezone:"Etc/UTC",sourceId:f.sourceIds[0]}];
 assert.equal(availableSlots(f,"today",now).length,1);
 const old={...f,checkedAt:"2026-09-13T00:00:00Z"};assert.ok(freerollStale(old,now));assert.equal(availableSlots(old,"today",now).length,0);
 assert.equal(availableSlots({...f,status:"paused"},"today",now).length,0);
 assert.ok(freerollEnded({...f,schedule:{...f.schedule,endDate:"2026-09-15",timezone:"Etc/UTC"}},now));
 assert.equal(filterFreerolls([{...f,status:"ended"}],{},now).length,0);
 assert.equal(availableSlots(fixture(),"today",now).length,0);
});
test("invalid dates, duplicated identities, guessed fees and unverified official links are rejected",()=>{
 const f=fixture();assert.equal(validateFreerolls([f,{...f,id:"duplicate",slug:"duplicate"}],sources,now).length>0,true);
 const bad=fixture();bad.entry.buyIn=1 as 0;bad.officialLinks[0].url="https://example.invalid";bad.schedule.slots=[{id:"bad",label:"bad",date:"2026-02-30",time:"25:01",timezone:"INVALID",sourceId:"missing"}];
 assert.ok(validateFreerolls([bad],sources,now).length>=3);
 const wrongMarket=fixture();wrongMarket.market.countries=["US"];assert.ok(validateFreerolls([wrongMarket],sources,now).length);
 const future=fixture();future.checkedAt="2027-01-01T00:00:00Z";assert.ok(validateFreerolls([future],sources,now).length);
});
test("source failure retains the last confirmed guide; bad proposals are isolated; stable URLs survive updates",()=>{
 const f=fixture(),good={...fixture(),description:"A substantively revised source-backed overview."};
 assert.deepEqual(stageFreerolls([f],[good],sources,[],now).data,[f]);
 const bad={...fixture(),slug:"moved-url"};const result=stageFreerolls([f],[bad,good],sources,f.sourceIds,now);
 assert.equal(result.quarantined.length,1);assert.equal(result.data[0].description,good.description);assert.equal(result.data.length,1);
 const duplicate={...good,id:"new-id",slug:"new-id"};assert.equal(stageFreerolls([f],[duplicate],sources,f.sourceIds,now).quarantined.length,1);
});
test("source timestamps cannot regress through the shared staging pipeline",async()=>{
 const {stageGuide}=await import("../src/lib/stage-guide");
 const data={sources,festivals:JSON.parse(readFileSync("data/festivals.json","utf8")),destinations:JSON.parse(readFileSync("data/destinations.json","utf8"))};
 const original=sources.find(s=>s.id===items[0].sourceIds[0])!;
 const staged=stageGuide(data,{successfulSourceIds:[original.id],sources:[{...original,checkedAt:"2026-01-01T00:00:00Z"}]},new Date());
 assert.equal(staged.quarantined.length,1);assert.deepEqual(staged.data.sources.find(s=>s.id===original.id),original);
});

test("a promotion remains active through its final venue-local date",()=>{
 const f=fixture();f.schedule.endDate="2026-09-16";f.schedule.timezone="America/Los_Angeles";
 assert.equal(freerollEnded(f,new Date("2026-09-17T03:00:00Z")),false);
 assert.equal(freerollEnded(f,new Date("2026-09-17T07:00:00Z")),true);
});
