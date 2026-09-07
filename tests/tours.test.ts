import test from "node:test";
import assert from "node:assert/strict";
import { festivals } from "../src/lib/guide-data";
import { filterFestivals } from "../src/lib/guide-utils";
import { tourFamilies, tourFilterHref } from "../src/lib/tour-catalog";
import { validateTourCatalog } from "../src/lib/validate-guide";
const now=new Date("2026-09-08T00:00:00Z");
test("a WSOP brand selection includes Circuit, Super Circuit and Paradise without unrelated tours",()=>{
  const result=filterFestivals(festivals,{brand:"wsop",status:"all"},{},now);
  assert.ok(result.some(f=>f.tour==="WSOP Circuit"));assert.ok(result.some(f=>f.tour==="WSOP Super Circuit"));assert.ok(result.some(f=>/Paradise/.test(f.name)));
  assert.ok(result.every(f=>f.tour.startsWith("WSOP")));
});
test("WPT Prime includes combined festivals and legacy series URLs keep working",()=>{
  const result=filterFestivals(festivals,{brand:"wpt",tour:"WPT Prime",status:"all"},{},now);
  assert.ok(result.some(f=>f.id==="sydney-2026"));assert.ok(result.some(f=>f.tour==="WPT Prime"));
  assert.deepEqual(filterFestivals(festivals,{tour:"WPT Prime",status:"all"},{},now),result);
});
test("zero-listing tour choices remain available and unknown IDs do not match unrelated events",()=>{
  assert.ok(tourFamilies.some(t=>t.id==="triton"));assert.ok(tourFamilies.some(t=>t.id==="bsop"));
  assert.equal(filterFestivals(festivals,{brand:"unrecognized"},{},now).length,0);
  assert.deepEqual(validateTourCatalog(tourFamilies),[]);
  assert.ok(validateTourCatalog([...tourFamilies,tourFamilies[0]]).length);
});
test("tour switching preserves dates and budgets while clearing incompatible series",()=>{
  const href=tourFilterHref({country:"united-states",tour:"WSOP Circuit",brand:"wsop",currency:"USD",max:"1000",from:"2026-09-01"},"wpt");
  const query=new URL(href,"https://example.com").searchParams;
  assert.equal(query.get("brand"),"wpt");assert.equal(query.get("tour"),null);assert.equal(query.get("max"),"1000");assert.equal(query.get("from"),"2026-09-01");assert.equal(query.get("country"),"united-states");
});
test("catalog validation rejects missing IDs, unverified dates and ambiguous series ownership",()=>{
  assert.ok(validateTourCatalog([{...tourFamilies[0],id:undefined}]).length);
  assert.ok(validateTourCatalog([{...tourFamilies[0],checkedAt:"not-verified"}]).length);
  assert.ok(validateTourCatalog([tourFamilies[0],{...tourFamilies[1],series:["WSOP"]}]).some(e=>e.includes("Ambiguous")));
});
test("full tour names are searchable and currency restrictions still apply to one matching entry",()=>{
  assert.ok(filterFestivals(festivals,{q:"World Series of Poker"},{},now).length>0);
  const result=filterFestivals(festivals,{brand:"wsop",currency:"EUR",max:"500",status:"all"},{},now);
  assert.ok(result.length>0);assert.ok(result.every(f=>f.tournaments.some(t=>t.buyIn?.currency==="EUR"&&t.buyIn.amount<=500)));
});
