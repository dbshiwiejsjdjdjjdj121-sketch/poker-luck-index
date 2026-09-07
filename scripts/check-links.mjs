import {fetch} from "./network.mjs";
import {readFileSync,writeFileSync} from "node:fs";
const sources=JSON.parse(readFileSync("data/sources.json","utf8"));
const festivals=JSON.parse(readFileSync("data/festivals.json","utf8"));
const tours=JSON.parse(readFileSync("data/tours.json","utf8"));
const urls=[...new Set([...tours.map(t=>t.officialUrl),...sources.map(s=>s.url),...festivals.flatMap(f=>[f.registrationUrl,f.scheduleUrl,f.venue.url].filter(Boolean))])];
const results=[];let index=0;
await Promise.all(Array.from({length:4},async()=>{while(index<urls.length){const url=urls[index++];try{
 const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{"User-Agent":"ALL-IN-Poker-Guide-Link-Check/1.0"}});
 const body=await r.text();
 const blocked=[401,403,429].includes(r.status)||/just a moment|verify you are human|access denied|captcha/i.test(body.slice(0,3000));
 results.push({url,status:r.status,result:blocked?"manual-review":r.ok?"reachable":"unavailable"});
}catch{results.push({url,status:null,result:"unavailable"})}}}));
const report={ranAt:new Date().toISOString(),note:"Reachability only. This check does not verify facts or modify checkedAt.",results};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({checked:results.length,manualReview:results.filter(r=>r.result!=="reachable")},null,2));
