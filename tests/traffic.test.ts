import test from "node:test";
import assert from "node:assert/strict";
import { publicAnalyticsUrl } from "../src/lib/analytics-policy";
import { sources } from "../src/lib/guide-data";
import { tourFamilies } from "../src/lib/tour-catalog";
import { tourGuides, tourGuideHref } from "../src/lib/tour-guide-data";
import { tourGuideFestivals, tourGuideModified } from "../src/lib/tour-guides";
import { validateTourGuides } from "../src/lib/validate-guide";

const publicPaths = ["/", "/tournaments", "/tours/wsop", "/tournaments/ept-prague-2026"];
test("analytics removes query values and fragments before public page-view collection", () => {
  assert.equal(publicAnalyticsUrl("https://www.allinpokerai.com/tournaments?q=player%40example.com&token=secret#personal", publicPaths), "https://www.allinpokerai.com/tournaments");
  assert.equal(publicAnalyticsUrl("https://www.allinpokerai.com/", publicPaths), "https://www.allinpokerai.com/");
});
test("analytics excludes private, unknown and non-production URLs", () => {
  for (const url of ["https://www.allinpokerai.com/account?save=festival", "https://www.allinpokerai.com/saved", "https://www.allinpokerai.com/api/saved", "https://www.allinpokerai.com/player-name", "https://preview.vercel.app/tournaments", "https://www.allinpokerai.com.evil.test/tournaments", "http://localhost:3012/tournaments", "not a URL"]) assert.equal(publicAnalyticsUrl(url, publicPaths), null, url);
});
test("only authored, verified tour guides receive landing-page links", () => {
  assert.deepEqual(tourGuides.map(g => g.tourId).sort(), ["ept", "wpt", "wsop"]);
  assert.equal(tourGuideHref("wsop"), "/tours/wsop");
  assert.equal(tourGuideHref("triton"), undefined);
  assert.equal(tourGuideHref("unknown"), undefined);
  assert.deepEqual(validateTourGuides(tourGuides, tourFamilies, sources), []);
});
test("guide validation rejects unresolved sources, future checks, duplicate and unrelated tours", () => {
  assert.ok(validateTourGuides([{ ...tourGuides[0], sourceIds: ["missing"] }], tourFamilies, sources).length);
  assert.ok(validateTourGuides([{ ...tourGuides[0], checkedAt: "2099-01-01T00:00:00Z" }], tourFamilies, sources).length);
  assert.ok(validateTourGuides([tourGuides[0], tourGuides[0]], tourFamilies, sources).length);
  assert.ok(validateTourGuides([{ ...tourGuides[0], formats: [{ title: "Other", description: "Other", series: "WPT" }] }], tourFamilies, sources).length);
});
test("tour guides roll ongoing editions into upcoming coverage and remove ended editions", () => {
  const today = new Date("2026-09-12T00:00:00Z");
  const wsop = tourGuideFestivals("wsop", today);
  assert.ok(wsop.some(f => f.id === "virginia-2026"));
  assert.ok(!wsop.some(f => /tulsa/i.test(f.id)));
  assert.ok(wsop.every(f => f.tour.startsWith("WSOP")));
  assert.equal(tourGuideFestivals("wsop", new Date("2100-01-01T00:00:00Z")).length, 0);
});
test("routine source checks alone do not change a tour guide's SEO modification date", () => {
  const guide = tourGuides[0];
  assert.equal(tourGuideModified(guide), tourGuideModified({ ...guide, checkedAt: "2099-01-01T00:00:00Z" }));
});
