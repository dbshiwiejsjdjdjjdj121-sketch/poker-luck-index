# Festival lifecycle and coverage window — 2026-09-07

User-authorized product update: retain ended editions as history and prioritize upcoming coverage within 180 days, with the richest planning context within 90 days.

- Archive pages show a prominent historical notice before the overview, historical registration/source labels and no routine recheck warning. Unknown historical details do not promise future completion. Travel guidance is clearly maintained separately; old edition offers are not current booking offers.
- Ended festivals leave homepage recommendations/recent changes and default search. The archive filter remains shareable and lists recent editions first. End dates use the whole listed festival in venue local time, not just its main event.
- Optional previousEditionId provides verified links between separate edition records. Validation rejects unknown/self/nonchronological references and multiple direct successors. The same organizer URL can be reused for a different starting year; duplicate same-year records remain rejected. Staging protects existing year-specific URLs during reschedules.
- New automatic additions beyond 180 venue-local calendar days are quarantined for editorial review. Existing records can still be corrected after a postponement beyond that horizon. The maintenance runbook spells out 0–30, 31–90 and 91–180 day priorities and stops routine checks of ended/cancelled editions.
- Added an explicit --product release mode for user-authorized product work; daily automation remains forbidden from using product/initial overrides. All validation and staged-production/promotion/recovery gates still apply.

Validation: six added lifecycle tests cover history retention/sort order, whole-series completion, local dates/DST and maintenance cadence, 180-day staging boundaries, linked annual editions with reused URLs, and historical UI/source links. The full suite contains 22 tests. Desktop 1280px and phone 390px archive layouts were inspected; phone content width was 390px with no overflow. New/old edition navigation and archive filtering with browser back/forward worked.

Archive UI was exercised using a clearly labeled synthetic record in an isolated local directory. It is not in production data or this commit. No source facts or verification timestamps were changed by this product update. Production build and online route checks are enforced by the release script, with outcome stored in the ignored .vercel/guide-release.json.
