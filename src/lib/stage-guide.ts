import type { GuideData } from "./guide-types";
import { validateGuide } from "./validate-guide";
export type Candidate = Partial<GuideData> & { successfulSourceIds: string[] };
/** Merge verified proposals by stable ID. Failed proposals never erase the last good record. */
export function stageGuide(base: GuideData, candidate: Candidate, now = new Date()) {
  if (validateGuide(base, now).length) throw new Error("Published baseline is invalid; repair it before staging updates.");
  if (!Array.isArray(candidate.successfulSourceIds)) throw new Error("Candidate must identify successfully read sources.");
  let data = structuredClone(base);
  const quarantined: { kind: string; id: string; errors: string[] }[] = [];
  const verified = new Set(candidate.successfulSourceIds);
  for (const kind of ["sources", "destinations", "festivals"] as const) {
    const records = candidate[kind] ?? [];
    if (!Array.isArray(records)) throw new Error("Candidate " + kind + " must be an array.");
    for (const record of records) {
      const id = record?.id;
      const ids = kind === "sources" ? [id] : kind === "festivals" ? (record as GuideData["festivals"][number]).sourceIds : [];
      if (kind !== "destinations" && (!Array.isArray(ids) || !ids.some(source => verified.has(source)))) {
        quarantined.push({kind,id,errors:["No successfully read source for this proposal"]}); continue;
      }
      const trial = structuredClone(data);
      const index = trial[kind].findIndex(item => item.id === id);
      // Each kind has the same keyed merge operation; validation enforces its runtime shape.
      const target = trial[kind] as {id:string}[];
      if (index < 0) target.push(structuredClone(record)); else target[index] = structuredClone(record);
      const errors = validateGuide(trial, now);
      if (errors.length) quarantined.push({kind,id,errors}); else data = trial;
    }
  }
  return { data, quarantined };
}
