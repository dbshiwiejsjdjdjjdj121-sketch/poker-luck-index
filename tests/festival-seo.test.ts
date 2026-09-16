import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/guide.json";
import type { Destination, Festival } from "../src/lib/guide-types";
import { festivalArticle, festivalBreadcrumbs } from "../src/lib/festival-seo";
import { serializeJsonLd } from "../src/lib/guide-utils";

const festival = fixture.festivals[0] as Festival;
const destination = fixture.destinations.find(d => d.id === festival.destinationId)! as Destination;

test("a multi-event guide never presents selected buy-ins as bookable festival tickets", () => {
  for (const status of ["scheduled", "postponed", "cancelled"] as const) {
    const article = festivalArticle({ ...festival, status }, destination);
    assert.equal(article["@type"], "Article");
    for (const field of ["offers", "performer", "startDate", "endDate", "eventStatus", "datePublished"]) {
      assert.equal(field in article, false, field);
    }
    assert.equal(article.author.name, "ALL IN Poker Guide");
    assert.notEqual(article.author.name, festival.tour);
    assert.equal(article.mainEntityOfPage["@id"], article.url);
    assert.equal(article.image.url, `${article.url}/guide-image`);
  }
});

test("article modification follows visible substantive content, not checks or event dates", () => {
  const f = { ...festival, updatedAt: "2026-09-01T10:00:00Z", checkedAt: "2026-09-16T10:00:00Z" };
  const d = { ...destination, updatedAt: "2026-09-08T10:00:00Z" };
  assert.equal(festivalArticle(f, d).dateModified, d.updatedAt);
  assert.deepEqual(festivalArticle(f, d), festivalArticle({ ...f, checkedAt: "2026-09-17T10:00:00Z" }, d));
  assert.equal(festivalArticle({ ...f, updatedAt: "2026-09-12T10:00:00Z" }, d).dateModified, "2026-09-12T10:00:00Z");
});

test("breadcrumb markup reflects visible optional tour links without invented pages", () => {
  const current = { label: festival.name };
  for (const items of [
    [{ label: "Tournaments", href: "/tournaments" }, current],
    [{ label: "Tournaments", href: "/tournaments" }, { label: "WSOP guide", href: "/tours/wsop" }, current],
  ]) {
    const result = festivalBreadcrumbs(items);
    assert.deepEqual(result.itemListElement.map(i => i.position), [1, ...items.map((_, i) => i + 2)]);
    assert.deepEqual(result.itemListElement.map(i => i.name), ["Home", ...items.map(i => i.label)]);
    assert.equal("item" in result.itemListElement.at(-1)!, false);
    assert.equal(result.itemListElement[0].item, "https://www.allinpokerai.com/");
    assert.equal(result.itemListElement[1].item, "https://www.allinpokerai.com/tournaments");
  }
});

test("guide schema safely serializes source text containing HTML closing tags", () => {
  const article = festivalArticle({ ...festival, name: '</script><script>alert("test")</script>' }, destination);
  const serialized = serializeJsonLd(article);
  assert.equal(serialized.includes("</script>"), false);
  assert.equal(JSON.parse(serialized).headline, article.headline);
});
