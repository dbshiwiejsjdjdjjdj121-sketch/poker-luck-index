import {fetch} from "./network.mjs";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
export const PROJECT="prj_4RY5RDNbeFUAeEV10kBPckbZeJzR",TEAM="team_8ufG83uOS6mmizyqiGqR6JB0";
export function run(command,args,{capture=false,env=process.env}={}){
 const r=spawnSync(command,args,{encoding:"utf8",stdio:capture?["ignore","pipe","inherit"]:"inherit",env,maxBuffer:12*1024*1024});
 if(r.error||r.status!==0)throw new Error(command+" failed"+(r.status===null?"":" (exit "+r.status+")"));
 return (r.stdout||"").trim();
}
export function checkProject(){
 const link=JSON.parse(readFileSync(".vercel/project.json","utf8"));
 if(link.projectId!==PROJECT||link.orgId!==TEAM)throw new Error("Refusing to deploy to an unexpected Vercel project.");
 if(!process.env.VERCEL_TOKEN)throw new Error("VERCEL_TOKEN is required.");
}
export async function api(path,init={}){
 const r=await fetch("https://api.vercel.com"+path+(path.includes("?")?"&":"?")+"teamId="+TEAM,{...init,headers:{Authorization:"Bearer "+process.env.VERCEL_TOKEN,"Content-Type":"application/json"},signal:AbortSignal.timeout(60000)});
 if(!r.ok)throw new Error("Vercel API request failed ("+r.status+")");return r.json();
}
export async function project(){return api("/v9/projects/"+PROJECT);}
export async function bypass(){
 if(process.env.VERCEL_AUTOMATION_BYPASS_SECRET)return process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
 let p=await project();
 let secret=Object.keys(p.protectionBypass||{})[0];
 if(!secret){p=await api("/v1/projects/"+PROJECT+"/protection-bypass",{method:"PATCH",body:JSON.stringify({generate:{note:"ALL IN guide automated release checks"}})});secret=Object.keys(p.protectionBypass||{})[0];}
 if(!secret)throw new Error("Automation bypass unavailable; protected deployment cannot be checked.");return secret;
}
export function vercel(args,capture=false){return run(process.env.VERCEL_CLI||"vercel",[...args,"--token",process.env.VERCEL_TOKEN,"--scope",TEAM],{capture,env:{...process.env,VERCEL_PROJECT_ID:PROJECT,VERCEL_ORG_ID:TEAM}});}
export function smoke(url,secret,preview=false){run(process.execPath,["scripts/smoke.mjs",url,...(preview?["--preview"]:[])],{env:{...process.env,VERCEL_AUTOMATION_BYPASS_SECRET:secret}});}
export function deploymentUrl(output){const urls=output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g);if(!urls?.length)throw new Error("Deployment URL missing from CLI output.");return urls.at(-1);}
