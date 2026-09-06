import { readFileSync } from "node:fs";
import { validateGuide } from "../src/lib/validate-guide";
const data=Object.fromEntries(["festivals","destinations","sources"].map(k=>[k,JSON.parse(readFileSync("data/"+k+".json","utf8"))]));
const errors=validateGuide(data);
if(errors.length){console.error(errors.join("\n"));process.exitCode=1}else console.log("Guide data valid: "+data.festivals.length+" festival overviews.");
