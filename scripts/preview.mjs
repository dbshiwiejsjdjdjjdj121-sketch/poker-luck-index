import {checkProject,bypass,vercel,smoke,deploymentUrl} from "./vercel-client.mjs";
checkProject();const secret=await bypass();
const url=deploymentUrl(vercel(["deploy","--yes"],true));smoke(url,secret,true);console.log("Checked preview: "+url);
