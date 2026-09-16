# Freeroll discovery product release — 2026-09-16

User-authorized product change, following keyword research before implementation. Decision/evidence: `reports/research/2026-09-16-freeroll-keywords.md` and the accompanying Google Trends weekly snapshot. Relative global interest grew in the two core terms; US/UK data is sparse and absolute monthly volume remains unknown. This is a small pilot, not a proven traffic forecast.

## Product and content
- Freerolls becomes the first homepage/navigation entry; the live festival calendar, 52 existing festival guides, tour discovery, destinations, accounts and saved festivals remain.
- Four source-backed program guides: PokerStars.fr Stars Freerolls (plus general lobby help), PartyPoker Round-the-Clock, 888poker 24/7 Festival, and Freeroll Atlanta. Twelve selected official dated Atlanta starts are stored, not twelve separate program pages. No verified US online offer is claimed.
- Entry conditions distinguish deposits, qualification tickets, passwords/unknowns, venue spending and optional extra chips. Rewards identify cash versus playing credit/tickets/venue prizes. Official program/rules/calendar links are at the bottom and accurately labelled.
- Recurring program text never fabricates dated occurrences. Dated starts use venue time; unknown time remains null. Stale sources (48 hours), ended programs and paused programs leave date filters. Promotion end dates use the confirmed program timezone.
- Shareable GET filters, empty-state reset, canonical/indexing rules, sitemap, WebPage/Breadcrumb schema and existing privacy-filtered public page views. No event-ticket markup is added to program summaries. No additional database, paid API or analytics plan. Custom outbound event measurement is not enabled because plan support has not been established.
- Staging supports verified freeroll proposals, isolates invalid records, retains good data on source failure and preserves stable URLs. Source check timestamps cannot regress. Maintenance instructions add freerolls to the existing daily workflow; old SEO jobs remain paused.

## Sources and caveats
All new source links were read successfully in this task and recorded under the `freeroll-` source prefix. Unknown final dates and timezone ambiguity are preserved. PartyPoker's current offer differs from its old 2023 article; the current offer is used. 888's older/inconsistent promotion start dates are not asserted. Atlanta's late-registration rules conflict; the discrepancy is visible and no exact deadline is asserted.

## Checks before release
- `npm run validate` passed in preview mode: data validation, 52 tests at that point, lint, production build and TypeScript.
- A later venue-local promotion-end regression case brings the suite to 53 passing tests; data validation and lint passed again. Release runs full validation for the final committed state.
- Local smoke passed 148 pages/routes in both production-style and preview mode, including noindex, filters, metadata, sitemap, retained festival Article/images, 404s and invalid/anonymous auth inputs.
- Browser checks at desktop 1280 and mobile 390: homepage hierarchy, no horizontal overflow, no-deposit filter, detail official link targets, back navigation, US/online empty state, shareable filter URL, refresh restoration, US/live/week route and dated schedule. Existing login code/Firebase records were not modified.
- End-to-end candidate deployment, promotion, production smoke and production target verification are performed by `scripts/release.mjs --product`. See the ignored `.vercel/guide-release.json` for actual outcome and rollback target; this pre-release report does not claim deployment success in advance.
