import {test} from "node:test";
import assert from "node:assert/strict";
import {festivals as liveFestivals,destinations as liveDestinations,sources as liveSources} from "../src/lib/guide-data";
import fixture from "./fixtures/guide.json";
import type {GuideData} from "../src/lib/guide-types";
import {filterFestivals,statusOf,localToday,matchesTournament,isStale,money,serializeJsonLd} from "../src/lib/guide-utils";
import {stageGuide} from "../src/lib/stage-guide";
import {validEmail,publicEmailError} from "../src/lib/email-api";
import {validateGuide} from "../src/lib/validate-guide";
import {advanceCodeAttempt,checkResend,type EmailCodeRecord} from "../src/lib/email-code-policy";
const data=fixture as GuideData;
const {festivals}=data;
const now=new Date("2026-09-07T12:00:00Z");
const sample=structuredClone(festivals.find(f=>f.id==="virginia-2026")!);
test("seed contains at least 20 distinct validated overviews",()=>{assert.ok(liveFestivals.length>=20);assert.deepEqual(validateGuide({festivals:liveFestivals,destinations:liveDestinations,sources:liveSources}),[])});
test("festival overlap includes already-started series",()=>{assert.equal(filterFestivals([sample],{from:"2026-09-10",to:"2026-09-15"},{},now).length,1)});
test("local status respects venue time and DST",()=>{const f={...sample,startDate:"2026-11-01",endDate:"2026-11-01",timezone:"America/Los_Angeles"};assert.equal(statusOf(f,new Date("2026-11-02T07:30:00Z")),"ongoing");assert.equal(statusOf(f,new Date("2026-11-02T08:30:00Z")),"ended");assert.equal(localToday("Asia/Seoul",new Date("2026-09-06T16:00:00Z")),"2026-09-07")});
test("cancelled and postponed are excluded by default",()=>{for(const status of ["cancelled","postponed"] as const)assert.equal(filterFestivals([{...sample,status}],{},{},now).length,0)});
test("currency and budget apply to the same highlighted event",()=>{const f=structuredClone(sample);f.tournaments[0].buyIn={amount:200,currency:"EUR"};assert.equal(filterFestivals([f],{currency:"USD",max:"250"},{},now).length,0);assert.equal(filterFestivals([f],{currency:"EUR",max:"250"},{},now).length,1)});
test("unknown price is not treated as zero",()=>{const t={...sample.tournaments[0],buyIn:null};assert.equal(matchesTournament(t,{currency:"USD",min:"0"}),false);assert.equal(money(null),"Not confirmed")});
test("staging preserves IDs on content changes, quarantines invalid proposals and keeps valid ones",()=>{
 const changed=structuredClone(sample);changed.description+=" Official overview revised.";
 const invalid=structuredClone(festivals[1]);invalid.endDate="2020-01-01";
 const result=stageGuide(data,{festivals:[invalid,changed],successfulSourceIds:[...invalid.sourceIds,...changed.sourceIds]});
 assert.equal(result.quarantined.length,1);assert.equal(result.data.festivals.length,data.festivals.length);
 assert.equal(result.data.festivals.find(f=>f.id===changed.id)?.description,changed.description);
 assert.deepEqual(result.data.festivals.find(f=>f.id===invalid.id),festivals[1]);
});
test("stale status uses successful verification",()=>{assert.equal(isStale({...sample,checkedAt:"2026-09-01T00:00:00Z"},now),true)});
test("reject duplicate festivals, invalid money, unknown sources and bad dates",()=>{const bad=structuredClone(data);bad.festivals.push(structuredClone(bad.festivals[0]));bad.festivals[0].tournaments[0].buyIn!.amount=-100;bad.festivals[0].sourceIds=["missing"];bad.festivals[1].startDate="2026-02-30";const e=validateGuide(bad);for(const text of ["duplicate","money","unknown source","date range"])assert.ok(e.some(s=>s.includes(text)),text)});
test("failed sources and empty discovery do not erase the baseline",()=>{
 const changed={...sample,status:"cancelled" as const};
 const result=stageGuide(data,{festivals:[changed],successfulSourceIds:[]});
 assert.equal(result.quarantined.length,1);assert.deepEqual(result.data,data);
 assert.deepEqual(stageGuide(data,{festivals:[],successfulSourceIds:[]}).data,data);
});
test("same official source cannot create a duplicate festival with a new ID",()=>{
 const duplicate={...sample,id:"duplicate",slug:"duplicate-2026"};
 const result=stageGuide(data,{festivals:[duplicate],successfulSourceIds:sample.sourceIds});
 assert.equal(result.quarantined.length,1);assert.deepEqual(result.data,data);
});
test("JSON-LD cannot close its script element",()=>assert.ok(!serializeJsonLd({name:"</script>"}).includes("<")));
const record:EmailCodeRecord={codeHash:"correct",email:"test@example.invalid",createdAt:"2026-09-07T12:00:00Z",expiresAt:"2026-09-07T12:10:00Z",failedAttempts:0,resendAvailableAt:"2026-09-07T12:00:45Z"};
test("email code expiry, wrong attempts, single use and cooldown",()=>{
 assert.ok(checkResend(record,now.getTime()));assert.equal(checkResend(record,now.getTime()+45000),null);
 assert.match(advanceCodeAttempt(record,"correct",now.getTime()+600000).error!,/expired/);
 let r:Partial<EmailCodeRecord>|null=record;
 for(let i=0;i<5;i++)r=advanceCodeAttempt(r,"wrong",now.getTime()).next;
 assert.equal(r,null);
 const accepted=advanceCodeAttempt(record,"correct",now.getTime());assert.equal(accepted.error,null);assert.equal(accepted.next,null);
 assert.ok(advanceCodeAttempt(accepted.next,"correct",now.getTime()).error);
});
test("malformed JSON structures fail closed",()=>{assert.ok(validateGuide(null).length);assert.ok(validateGuide({festivals:[{}],sources:[],destinations:[]}).length)});


test("public auth errors hide provider details and reject markup in email",()=>{
 assert.equal(validEmail('<b>x</b>@example.com'),false);assert.equal(validEmail('player+test@example.com'),true);
 assert.equal(publicEmailError(new Error('Resend secret provider failure')).status,503);
 assert.doesNotMatch(publicEmailError(new Error('Resend secret provider failure')).error,/Resend|secret/);
});

test("reversed date interval has no matches",()=>assert.equal(filterFestivals([sample],{from:"2026-09-10",to:"2026-09-05"},{},now).length,0));
