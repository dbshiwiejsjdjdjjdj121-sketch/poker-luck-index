import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "./fixtures/guide.json";
import type { Festival, GuideData } from "../src/lib/guide-types";
import { daysToStart, filterFestivals, isStale, maintenanceCadence, nextEditionOf, statusOf } from "../src/lib/guide-utils";
import { validateGuide } from "../src/lib/validate-guide";
import { stageGuide } from "../src/lib/stage-guide";
import { FestivalLifecycleNotice, FestivalOfficialLinks } from "../src/components/festival-lifecycle";

const data = fixture as GuideData;
const sample = data.festivals.find(f => f.id === "virginia-2026")!;
const now = new Date("2026-09-07T12:00:00Z");
function edition(id: string, startDate: string, endDate = startDate): Festival {
  return { ...structuredClone(sample), id, slug: id, startDate, endDate, tournaments: [], scheduleUrl: `https://example.com/${id}` };
}

test("past festivals remain searchable newest first and stop routine freshness warnings", () => {
  const old = edition("old-2025", "2025-09-01");
  const recent = edition("recent-2026", "2026-09-01");
  const list = [old, sample, recent];
  assert.deepEqual(filterFestivals(list, {}, {}, now).map(f => f.id), [sample.id]);
  assert.deepEqual(filterFestivals(list, {status: "ended"}, {}, now).map(f => f.id), [recent.id, old.id]);
  assert.equal(maintenanceCadence(old, now), "archive");
  assert.equal(isStale(old, now), false);
});

test("main-event completion does not archive a series with remaining side events", () => {
  const f = { ...sample, startDate: "2026-09-01", endDate: "2026-09-10", tournaments: [{...sample.tournaments[0], endDate: "2026-09-06"}] };
  assert.equal(statusOf(f, now), "ongoing");
  assert.equal(maintenanceCadence(f, now), "daily");
});

test("30-day verification boundary uses the venue calendar, including DST", () => {
  const f = {...edition("november-2026", "2026-11-01"), timezone: "America/Los_Angeles"};
  assert.equal(daysToStart(f, new Date("2026-10-02T06:30:00Z")), 31);
  assert.equal(maintenanceCadence(f, new Date("2026-10-02T06:30:00Z")), "weekly");
  assert.equal(maintenanceCadence(f, new Date("2026-10-02T07:30:00Z")), "daily");
  assert.equal(maintenanceCadence({...f, status: "cancelled"}, now), "archive");
  assert.equal(maintenanceCadence({...f, status: "postponed", startDate: "2026-01-01"}, now), "weekly");
});

test("180-day discovery boundary quarantines distant additions without blocking corrections", () => {
  const dateAfter = (days: number) => new Date(Date.parse("2026-09-07") + days * 86400000).toISOString().slice(0,10);
  const accepted = edition("boundary-2027", dateAfter(180));
  const distant = edition("distant-2027", dateAfter(181));
  const candidate = {festivals: [accepted, distant], successfulSourceIds: sample.sourceIds};
  const result = stageGuide(data, candidate, now);
  assert.ok(result.data.festivals.some(f => f.id === accepted.id));
  assert.equal(result.quarantined.length, 1);
  assert.match(result.quarantined[0].errors.join(" "), /180-day/);
  const correction = {...sample, startDate: dateAfter(181), endDate: dateAfter(182), tournaments: []};
  assert.equal(stageGuide(data, {festivals: [correction], successfulSourceIds: sample.sourceIds}, now).quarantined.length, 0);
});

test("a new year's edition may reuse an official URL and links to the preserved past edition", () => {
  const next = {...edition("virginia-2027", "2027-09-01"), previousEditionId: sample.id, scheduleUrl: sample.scheduleUrl};
  const trial = {...data, festivals: [...data.festivals, next]};
  assert.deepEqual(validateGuide(trial, now), []);
  assert.equal(nextEditionOf(sample, trial.festivals)?.id, next.id);
  for (const previousEditionId of ["missing", next.id]) {
    const invalid = {...trial, festivals: [...data.festivals, {...next, previousEditionId}]};
    assert.ok(validateGuide(invalid, now).some(e => e.includes("previous edition")));
  }
  const changedUrl = {...sample, slug: "virginia-2027"};
  const staged = stageGuide(data, {festivals: [changedUrl], successfulSourceIds: sample.sourceIds}, now);
  assert.equal(staged.quarantined.length, 1);
  assert.deepEqual(staged.data, data);
});

test("archived overview presents historical terms and organizer sources, with no current entry CTA", () => {
  const next = {...edition("virginia-2027", "2027-09-01"), name: "Virginia 2027", previousEditionId: sample.id};
  const notice = renderToStaticMarkup(createElement(FestivalLifecycleNotice, {festival: sample, archived: true, next}));
  assert.match(notice, /This edition has ended/);
  assert.match(notice, /not current booking or registration offers/);
  assert.match(notice, /href="\/tournaments\/virginia-2027"/);
  const links = renderToStaticMarkup(createElement(FestivalOfficialLinks, {festival: sample, archived: true}));
  assert.match(links, /Organizer event page/);
  assert.doesNotMatch(links, /Official event &amp; registration/);
  const upcoming = renderToStaticMarkup(createElement(FestivalOfficialLinks, {festival: next, archived: false}));
  assert.match(upcoming, /Official event &amp; registration/);
  const withoutSuccessor = renderToStaticMarkup(createElement(FestivalLifecycleNotice, {festival: sample, archived: true}));
  assert.match(withoutSuccessor, /href="\/tournaments"/);
});
