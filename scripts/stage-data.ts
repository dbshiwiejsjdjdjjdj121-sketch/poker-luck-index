import { readFileSync, writeFileSync } from "node:fs";
import { festivals,destinations,sources } from "../src/lib/guide-data";
import { stageGuide } from "../src/lib/stage-guide";
const file = process.argv[2];
if (!file) throw new Error("Usage: npm run data:stage -- /absolute/path/candidate.json");
const result = stageGuide({festivals,destinations,sources}, JSON.parse(readFileSync(file,"utf8")));
for (const kind of ["sources","destinations","festivals"] as const) writeFileSync(`data/${kind}.json`,JSON.stringify(result.data[kind],null,2)+"\n");
console.log(JSON.stringify({quarantined:result.quarantined,festivals:result.data.festivals.length},null,2));
