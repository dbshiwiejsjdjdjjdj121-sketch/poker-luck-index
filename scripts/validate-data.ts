import { readFileSync } from "node:fs";
import { validateGuide, validateTourCatalog, validateTourGuides } from "../src/lib/validate-guide";
const data=Object.fromEntries(["festivals","destinations","sources"].map(k=>[k,JSON.parse(readFileSync("data/"+k+".json","utf8"))]));
const catalog=JSON.parse(readFileSync("data/tours.json","utf8"));
const errors=[...validateGuide(data),...validateTourCatalog(catalog),...validateTourGuides(JSON.parse(readFileSync("data/tour-guides.json","utf8")),catalog,data.sources)];
if(errors.length){console.error(errors.join("\n"));process.exitCode=1}else console.log("Guide data valid: "+data.festivals.length+" festival overviews.");
