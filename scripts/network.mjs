import {fetch as proxyFetch, EnvHttpProxyAgent} from "undici";
const dispatcher=new EnvHttpProxyAgent({noProxy:[process.env.NO_PROXY||process.env.no_proxy||"","localhost","127.0.0.1","::1"].join(",")});
export const fetch=(url,options={})=>proxyFetch(url,{...options,dispatcher});
