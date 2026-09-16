import type { Freeroll, Source } from "./guide-types";
import { validateFreerolls } from "./validate-guide";
export function stageFreerolls(base: Freeroll[], proposals: unknown, sources: Source[], successfulSourceIds: string[], now = new Date()) {
 if (validateFreerolls(base,sources,now).length) throw new Error("Published freeroll baseline is invalid");
 if (!Array.isArray(proposals) || !Array.isArray(successfulSourceIds)) throw new Error("Expected freeroll proposals and successfully read sources");
 let data=structuredClone(base); const quarantined:{kind:string;id:string;errors:string[]}[]=[];
 for(const candidate of proposals as Freeroll[]){
  const id=candidate?.id; const trial=structuredClone(data); const index=trial.findIndex(f=>f.id===id);
  const verified=Array.isArray(candidate?.sourceIds) && candidate.sourceIds.length>0 && candidate.sourceIds.every(s=>successfulSourceIds.includes(s));
  if(!verified){quarantined.push({kind:"freerolls",id,errors:["Every referenced source must be successfully read for a freeroll update"]});continue;}
  if(index<0)trial.push(candidate);else trial[index]=candidate;
  const errors=validateFreerolls(trial,sources,now);
  if(index>=0 && candidate.slug!==data[index].slug)errors.push("Existing freeroll URLs must be preserved");
  if(errors.length)quarantined.push({kind:"freerolls",id,errors});else data=trial;
 }
 return {data,quarantined};
}
