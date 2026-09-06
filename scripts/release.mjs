import {writeFileSync} from "node:fs";
import {checkProject,run,project,bypass,vercel,smoke,deploymentUrl} from "./vercel-client.mjs";
const initial=process.argv.includes("--initial");
const product=process.argv.includes("--product");
const productRelease=initial||product;
checkProject();
const git=(...args)=>run("git",args,{capture:true});
if(git("status","--porcelain"))throw new Error("Commit the intended change first; release requires a clean worktree.");
if(!git("remote","get-url","origin").includes("dbshiwiejsjdjdjjdj121-sketch/poker-luck-index"))throw new Error("Unexpected production Git remote.");
git("fetch","origin","main");
const expectedMain=git("rev-parse","origin/main"),head=git("rev-parse","HEAD");
git("merge-base","--is-ancestor",expectedMain,head);
const changed=git("diff","--name-only",expectedMain,head).split("\n").filter(Boolean);
if(!productRelease&&changed.some(f=>!f.startsWith("data/")&&!f.startsWith("reports/maintenance/")))throw new Error("Daily release may only change content data and maintenance reports.");
if(!productRelease&&!changed.some(f=>f.startsWith("data/"))){console.log("No data changes; no deployment.");process.exit(0);}
run("npm",["run","validate"]);
const before=await project(),previous=before.targets?.production?.url;
if(!previous)throw new Error("Could not identify the last production deployment.");
const state={startedAt:new Date().toISOString(),commit:head,previous:"https://"+previous,stage:"validated"};
const save=()=>writeFileSync(".vercel/guide-release.json",JSON.stringify(state,null,2)+"\n",{mode:0o600});save();
const secret=await bypass();
const candidate=deploymentUrl(vercel(["deploy","--prod","--skip-domain","--yes","--meta","guideCommit="+head],true));
state.candidate=candidate;state.stage="staged";save();
smoke(candidate,secret);state.stage="candidate-verified";save();
// Recheck both Git and the live production target before touching main or aliases.
git("fetch","origin","main");
if(git("rev-parse","origin/main")!==expectedMain)throw new Error("Main advanced during validation. Keep candidate unpromoted and rebuild from latest main.");
if((await project()).targets?.production?.url!==previous)throw new Error("Production changed during validation. Keep candidate unpromoted for review.");
git("push","origin","HEAD:main");state.stage="pushed";save();
try{
 vercel(["promote",candidate,"--yes"]);state.stage="promoted";save();
 smoke("https://www.allinpokerai.com",secret);
 if((await project()).targets?.production?.url!==new URL(candidate).hostname)throw new Error("Production target does not match the checked deployment.");
 state.stage="complete";state.completedAt=new Date().toISOString();save();console.log(JSON.stringify(state,null,2));
}catch(error){
 state.stage="promotion-failed";save();
 vercel(["rollback",state.previous,"--yes"]);
 const restored=await project();
 if(restored.targets?.production?.url!==previous)throw new Error("Rollback target could not be verified; inspect Vercel immediately.");
 state.stage="rolled-back";save();throw error;
}
