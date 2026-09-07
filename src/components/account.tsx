"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailCodeToken, signOutFirebaseUser } from "@/lib/firebase-client";
import { useSaved } from "./saved-provider";

export function Account({ saveId, saveName, returnTo = "/saved" }: { saveId?: string; saveName?: string; returnTo?: string }) {
  const { user, authLoading: restoring, entries, setSaved } = useSaved();
  const router = useRouter(), attempted = useRef(false);
  const [email,setEmail]=useState(""),[code,setCode]=useState(""),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[cooldown,setCooldown]=useState(0);
  const finishSave = useCallback(async () => {
    if (!saveId) return;
    setBusy(true); setMessage("Saving your festival…");
    if (await setSaved(saveId, true)) router.replace(returnTo);
    else { setMessage("Your sign-in is complete, but the festival could not be saved. Please try again."); setBusy(false); }
  }, [saveId, setSaved, router, returnTo]);
  useEffect(() => { if (user && saveId && !attempted.current) { attempted.current = true; void finishSave(); } }, [user, saveId, finishSave]);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(c=>Math.max(0,c-1)),1000);return()=>clearTimeout(timer)},[cooldown]);
  async function send(){setBusy(true);setMessage("");try{const r=await fetch("/api/auth/email-code/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not send a code. Try again.");setSent(true);setCode("");setCooldown(d.resendInSeconds||45);setMessage("A six-digit code is on its way. It expires in 10 minutes.");}catch(e){setMessage(e instanceof Error?e.message:"Please try again.")}finally{setBusy(false)}}
  async function verify(){let signedIn=false;setBusy(true);setMessage("");try{const r=await fetch("/api/auth/email-code/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code})});const d=await r.json();if(!r.ok)throw Error(d.error||"Could not verify the code.");if(!d.customToken)throw Error("Sign-in could not be completed. Request a new code.");await signInWithEmailCodeToken(d.customToken);signedIn=true;}catch(e){setMessage(e instanceof Error?e.message:"Please try again.")}finally{if(!signedIn||!saveId)setBusy(false)}}
  return <div className="account-wrap"><div className="account-panel"><p className="eyebrow">YOUR ALL IN ACCOUNT</p><h1>{user?"Welcome back.":saveId?"Save your next stop.":"Sign in with email."}</h1>
    {saveName && <p className="save-intent">{saveName}</p>}
    {restoring?<p role="status">Checking your session…</p>:user?<><p>You are signed in as</p><p className="account-email">{user.email}</p>
      {saveId ? <><p>Your saved festivals are private and available across your signed-in devices.</p>{!busy && <button className="button account-action" onClick={()=>void finishSave()}>Try saving again</button>}</> : <><p>Keep a shortlist of festivals and return to the latest dates, buy-ins and official entry points.</p><Link className="button account-action" href="/saved">Your saved festivals{entries.length ? ` (${entries.length})` : ""} ↗</Link></>}
      <button className="button button-outline account-action" disabled={busy} onClick={async()=>{setBusy(true);try{await signOutFirebaseUser();setSent(false);setCode("");setMessage("");attempted.current=false;}catch{setMessage("Could not sign out. Please try again.")}finally{setBusy(false)}}}>Sign out</button></>:<>
      <p>{saveId?"Sign in once to save this festival and keep your shortlist across devices.":"No password needed. We will send a verification code to your email."}</p>
      <form className="account-form" onSubmit={e=>{e.preventDefault();void(sent?verify():send())}}>{!sent?<label>Email address<input type="email" name="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={busy}/></label>:<><p>Enter the code sent to <strong>{email}</strong>.</p><label>Verification code<input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000" disabled={busy}/></label></>}<button className="button" type="submit" disabled={busy||(sent&&code.length!==6)}>{busy?"Please wait…":sent?"Verify & sign in":"Send verification code"}</button></form>
      {sent&&<div className="account-links"><button disabled={busy} onClick={()=>{setSent(false);setCode("");setMessage("")}}>Use a different email</button><button disabled={busy||cooldown>0} onClick={()=>void send()}>{cooldown>0?`Resend in ${cooldown}s`:"Resend code"}</button></div>}</>}
    {message&&<p className="account-feedback" role="status">{message}</p>}</div><p className="account-note">No sign-in required to <Link href="/tournaments">browse tournaments ↗</Link><br/><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p></div>;
}
