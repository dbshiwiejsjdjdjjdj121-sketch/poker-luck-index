import type { MetadataRoute } from "next";
import { SITE_URL, IS_PREVIEW } from "@/lib/site";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:IS_PREVIEW?undefined:"/",disallow:IS_PREVIEW?"/":["/api/","/account"]},...(!IS_PREVIEW?{sitemap:SITE_URL+"/sitemap.xml"}:{})};}
