import {fetch} from "./network.mjs";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const base=process.argv[2] || "http://127.0.0.1:3000";
const preview=process.argv.includes("--preview");
const festivals=JSON.parse(readFileSync("data/festivals.json","utf8"));
const places=JSON.parse(readFileSync("data/destinations.json","utf8"));
const tourGuides=JSON.parse(readFileSync("data/tour-guides.json","utf8"));
const paths=["/","/tournaments","/destinations","/about","/privacy","/terms","/account","/saved",...tourGuides.map(g=>"/tours/"+g.tourId),...festivals.map(f=>"/tournaments/"+f.slug),...places.map(d=>"/destinations/"+d.id),...new Set(places.map(d=>"/destinations/"+d.countrySlug))];
const headers={"User-Agent":"Googlebot"};
if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)headers["x-vercel-protection-bypass"]=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
async function get(path){const r=await fetch(base+path,{headers,signal:AbortSignal.timeout(60000)});return {r,html:await r.text()};}
let checked=0;
for(const path of paths){
 const {r,html}=await get(path);assert.equal(r.status,200,path);
 assert.match(html,/<html[^>]*lang="en"/,path);assert.match(html,/<title>[^<]+<\/title>/,path);
 assert.match(html,/<meta name="description" content="[^"]+"/,path);
 assert.ok(html.includes(`rel="canonical" href="https://www.allinpokerai.com${path==="/"?"":path}"`)||html.includes(`rel="canonical" href="https://www.allinpokerai.com${path}"`),"canonical "+path);
 if(preview||path==="/account"||path==="/saved")assert.match(html,/<meta name="robots" content="noindex/,path);
 if(path.startsWith("/tours/")){
  const objects=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const collection=objects.find(o=>o["@type"]==="CollectionPage");
  assert.ok(collection,path);assert.equal(objects.filter(o=>o["@type"]==="Event").length,0,path);
  assert.equal(collection.url,"https://www.allinpokerai.com"+path);assert.ok(html.includes('id="official"'),path);
  for(const item of collection.mainEntity.itemListElement)assert.ok(html.includes(item.url.replace("https://www.allinpokerai.com","")),path);
  if(!preview)assert.match(html,/<meta name="robots" content="index, follow"/,path);
 }
 if(path.startsWith("/tournaments/")){
  const objects=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  const articles=objects.filter(o=>o["@type"]==="Article");
  assert.equal(articles.length,1,path);
  assert.equal(objects.filter(o=>o["@type"]==="Event").length,0,path);
  const article=articles[0],festival=festivals.find(f=>"/tournaments/"+f.slug===path),destination=places.find(d=>d.id===festival.destinationId);
  assert.equal(article.headline,festival.name,path);assert.equal(article.description,festival.description,path);
  assert.equal(article.url,"https://www.allinpokerai.com"+path);assert.equal(article.mainEntityOfPage["@id"],article.url);
  assert.equal(article.dateModified,[festival.updatedAt,destination.updatedAt].sort().at(-1));
  assert.ok(!article.offers&&!article.performer&&!article.datePublished,path);
  assert.equal(article.image.url,article.url+"/guide-image");
  assert.equal(article.author.name,"ALL IN Poker Guide");
  assert.ok(html.includes('property="og:image" content="'+article.image.url+'"'),path);
  assert.ok(html.includes('name="twitter:image" content="'+article.image.url+'"'),path);
  assert.equal(objects.filter(o=>o["@type"]==="BreadcrumbList").length,1,path);
  assert.match(html,/Independent festival guide by/,path);
  assert.ok(html.includes('id="official"')&&html.includes('target="_blank"'),path);
 }
 checked++;
}
for(const path of ["/result","/hand-review","/bankroll","/history","/not-a-page","/tournaments/missing-2026","/tournaments/missing-2026/guide-image","/tours/missing","/tours/triton"]){assert.equal((await get(path)).r.status,404,path);checked++;}
const imageExamples=[festivals[0],festivals.find(f=>f.slug==="triton-jeju-september-2026"),[...festivals].sort((a,b)=>b.name.length-a.name.length)[0]].filter(Boolean);
for(const festival of imageExamples){
 const path="/tournaments/"+festival.slug+"/guide-image";
 const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(60000)});
 assert.equal(response.status,200,path);assert.match(response.headers.get("content-type"),/^image\/png/,path);
 const png=Buffer.from(await response.arrayBuffer());assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a",path);
 assert.equal(png.readUInt32BE(16),1200,path);assert.equal(png.readUInt32BE(20),630,path);
}
for(const path of ["/api/subscription-status","/api/bankroll-records","/api/hand-uploads"]){assert.equal((await get(path)).r.status,404,path);checked++;}
const filtered=await get("/tournaments?q=NO-SUCH-FESTIVAL-TEST&currency=EUR&max=1");
assert.match(filtered.html,/No matching festivals/);assert.match(filtered.html,/<meta name="robots" content="noindex/);
assert.ok(filtered.html.includes('href="/tournaments"'));
const tour=await get("/tournaments?brand=wsop");
assert.match(tour.html,/World Series of Poker/);assert.match(tour.html,/WSOP Circuit/);assert.match(tour.html,/WSOP Super Circuit/);assert.match(tour.html,/<meta name="robots" content="noindex/);
const triton=await get("/tournaments?brand=triton");assert.match(triton.html,/Triton/);assert.match(triton.html,/Official calendar/);
for(const [path,method] of [["/api/saved","GET"],["/api/saved/virginia-2026","PUT"],["/api/saved/virginia-2026","DELETE"]]){
 const response=await fetch(base+path,{method,headers});assert.equal(response.status,401);assert.match(response.headers.get("cache-control"),/no-store/);assert.ok((await response.json()).error);
}
const archive=await get("/tournaments?status=ended");
assert.equal(archive.r.status,200);
assert.match(archive.html,/Past editions are kept for reference/);
assert.match(archive.html,/Most recent first/);
assert.match(archive.html,/<meta name="robots" content="noindex/);
const sitemap=(await get("/sitemap.xml")).html;
assert.ok(!sitemap.includes("/account")&&!sitemap.includes("/saved")&&!sitemap.includes("/tournaments?"));
for(const f of festivals)assert.ok(sitemap.includes("/tournaments/"+f.slug));
for(const guide of tourGuides){assert.ok(sitemap.includes("/tours/"+guide.tourId));assert.ok((await get("/")).html.includes('href="/tours/'+guide.tourId+'"'));}
for(const d of places)assert.equal(sitemap.includes("/destinations/"+d.id+"<"),Boolean(d.indexable));
const robots=(await get("/robots.txt")).html;assert.ok(robots.includes(preview?"Disallow: /\n":"Sitemap: https://www.allinpokerai.com/sitemap.xml"));
for(const [path,body] of [["request",{email:"invalid"}],["verify",{email:"player@example.invalid",code:"12"}]]){
 const r=await fetch(base+"/api/auth/email-code/"+path,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(body)});assert.equal(r.status,400);assert.ok((await r.json()).error);
}
console.log(`Smoke passed: ${checked} pages/routes, filters, canonical, metadata, Article/breadcrumb data, guide images, sitemap, robots and invalid auth input. ${preview?"Preview noindex verified.":"Production indexing policy verified."}`);
