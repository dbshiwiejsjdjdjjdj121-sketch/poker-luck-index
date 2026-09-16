import type { MetadataRoute } from "next";
import { festivals,destinations,destinationById } from "@/lib/guide-data";
import { SITE_URL } from "@/lib/site";
import { freerolls } from "@/lib/freeroll-data";
import { tourGuides } from "@/lib/tour-guide-data";
import { tourGuideModified } from "@/lib/tour-guides";
export default function sitemap():MetadataRoute.Sitemap {
 const countries=[...new Set(destinations.map(d=>d.countrySlug))];
 return [
 ...["","/freerolls","/tournaments","/destinations","/about","/privacy","/terms"].map(path=>({url:SITE_URL+path})),
 ...freerolls.map(f=>({url:SITE_URL+"/freerolls/"+f.slug,lastModified:f.updatedAt})),
 ...festivals.map(f=>({url:SITE_URL+"/tournaments/"+f.slug,lastModified:[f.updatedAt,destinationById(f.destinationId).updatedAt].sort().at(-1)})),
 ...tourGuides.map(g=>({url:SITE_URL+"/tours/"+g.tourId,lastModified:tourGuideModified(g)})),
 ...destinations.filter(d=>d.indexable).map(d=>({url:SITE_URL+"/destinations/"+d.id,lastModified:d.updatedAt})),
 ...countries.map(c=>({url:SITE_URL+"/destinations/"+c,lastModified:destinations.filter(d=>d.countrySlug===c).map(d=>d.updatedAt).sort().at(-1)}))
 ];
}
