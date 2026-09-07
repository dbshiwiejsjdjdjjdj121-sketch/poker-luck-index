"use client";
import Link from "next/link";
import { useState } from "react";
import type { Destination, Festival } from "@/lib/guide-types";
import { dateRange } from "@/lib/guide-utils";
import { datesChanged, savedIsPast } from "@/lib/saved-policy";
import { useSaved } from "./saved-provider";
import { FestivalCardView } from "./festival-card";
export function SavedList({festivals,destinations}:{festivals:Festival[];destinations:Destination[]}) {
  const {user,authLoading,ready,entries,error,refresh,busyId,setSaved}=useSaved();
  const [tab,setTab]=useState("upcoming"),[query,setQuery]=useState("");
  if(authLoading)return <p role="status" className="saved-loading">Checking your session…</p>;
  if(!user)return <div className="empty-state saved-signin"><span aria-hidden="true">♧</span><h2>A shortlist for your next trip.</h2><p>Save interesting festivals, compare your options and pick up where you left off on any signed-in device.</p><Link className="button" href="/account">Sign in with email ↗</Link><Link className="text-link" href="/tournaments">Explore tournaments</Link></div>;
  if(!ready)return <div className="saved-loading" role="status">{error?<><p>{error}</p><button className="button account-action" onClick={refresh}>Try again</button></>:"Loading your saved festivals…"}</div>;
  const known=entries.flatMap(entry=>{const festival=festivals.find(f=>f.id===entry.festivalId);return festival?[{entry,festival}]:[];});
  const unavailable=entries.filter(entry=>!festivals.some(f=>f.id===entry.festivalId));
  const counts={upcoming:known.filter(({festival})=>!savedIsPast(festival)).length,past:known.filter(({festival})=>savedIsPast(festival)).length,all:entries.length};
  const result=known.filter(({festival:f})=>(tab==="all"||(tab==="past"?savedIsPast(f):!savedIsPast(f)))&&`${f.name} ${f.tour} ${destinations.find(d=>d.id===f.destinationId)?.city}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>tab==="past"?b.festival.startDate.localeCompare(a.festival.startDate):Number(savedIsPast(a.festival))-Number(savedIsPast(b.festival))||a.festival.startDate.localeCompare(b.festival.startDate));
  return <><div className="saved-toolbar"><div className="saved-tabs" role="group" aria-label="Saved festival status">{([['upcoming','Upcoming'],['past','Past'],['all','All']] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}<span>{counts[id]}</span></button>)}</div><label className="saved-search"><span className="sr-only">Search saved festivals</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your saved festivals"/></label><button className="text-button" disabled={!!busyId} onClick={refresh}>Refresh</button></div>
    <p className="saved-note">Private to your account. Dates and details follow the latest published guide. Ended editions stay in Past.</p>
    {error&&<p className="notice" role="status">{error} Your last loaded list is still shown.</p>}
    {tab==="past"&&<p className="notice archive-notice">These editions have ended. Saving an edition does not register you or automatically save the following year’s event.</p>}
    {result.length?<div className="festival-grid saved-grid">{result.map(({entry,festival:f})=><div key={f.id} className="saved-item">
      {datesChanged(entry,f)&&<p className="saved-change">Dates changed since you saved: {dateRange(entry.datesWhenSaved.startDate,entry.datesWhenSaved.endDate)} → {dateRange(f.startDate,f.endDate)}.</p>}
      {f.status!=="scheduled"&&<p className="saved-change">{f.status==="cancelled"?"Cancelled":"Postponed"} — check the organizer before making travel plans.</p>}
      <FestivalCardView festival={f} destination={destinations.find(d=>d.id===f.destinationId)!}/></div>)}</div>:<div className="empty-state"><h2>{entries.length?"No saved festivals in this view":"Your shortlist starts here."}</h2><p>{entries.length?"Try another tab or clear your search.":"Use the bookmark on a festival card or its overview to save it here."}</p>{entries.length?<button className="button" onClick={()=>{setTab("all");setQuery("");}}>Show all saved festivals</button>:<Link className="button" href="/tournaments">Find a festival ↗</Link>}</div>}
    {unavailable.length>0&&<section className="saved-unavailable"><h2>Unavailable overviews</h2><p>These saved references have been retained, but their pages are not currently available.</p>{unavailable.map(entry=><div key={entry.festivalId}><span>{entry.festivalId}</span><button className="text-button" disabled={!!busyId} onClick={()=>void setSaved(entry.festivalId,false)}>Remove</button></div>)}</section>}
  </>;
}
