# Festival guide structured data — 2026-09-16

User-authorized product/SEO maintenance, not a daily content run. Prepared from production origin/main `08551f2` in an isolated `codex/event-schema-20260916` worktree. Existing user files, content verification timestamps and paused SEO tasks are unchanged.

## Finding and decision

Search Console Events report, last updated 2026-09-14, shows **1 valid item, 0 invalid items**. The example for the missing `image` recommendation is `/tournaments/triton-jeju-september-2026`, last crawled September 14. The report also lists missing `offers` and `performer`, each affecting one item. These are recommendations, not critical errors or a manual penalty.

The current product publishes an editorial overview of an entire festival, with separately entered main/side events, selected buy-ins, travel information and outbound official links. It no longer publishes individual tournament pages. Represent these overviews as **Article**, with the site's visible editorial attribution and a **BreadcrumbList**, instead of automatically treating every overview as a single bookable Event. This is a semantic correction to the shared template, not a claim that every festival is forbidden from having Event markup. These overview pages cease targeting Google's Event experience; their canonical URLs, indexability, sitemap membership and ordinary search eligibility remain intact. If individually bookable event pages are introduced later, assess Event markup for those pages.

The affected Triton overview also already explains referral/approval requirements, so we should not fabricate a publicly available ticket offer. No performer, fee, ticket availability, original publication date or official endorsement is invented.

## Implementation

- Article headline/description match visible content; author/publisher is ALL IN Poker Guide, with a visible link to About. The organizer is not misrepresented as our author.
- `dateModified` follows the latest substantive festival/destination update shown on the page. Source checks do not change it. No unsupported `datePublished` is assigned.
- Breadcrumb markup follows the visible Home → Tournaments → optional tour guide → festival trail.
- Every festival has its own 1200×630 PNG editorial title card at `/tournaments/[slug]/guide-image`, used in Article, Open Graph and Twitter metadata. Cards use the actual title, city/country and dates, are labeled independent guides, and do not copy organizer logos or claim to be official posters. Unknown slugs return 404.
- Tests and release smoke checks now require Article/breadcrumb data and prohibit reintroducing Event/ticket claims on overview pages. Smoke checks also verify representative image responses and dimensions.

## Validation before release

- `npm run validate` passed: data validation, 46 tests, ESLint, production build and TypeScript.
- Local production smoke passed: 142 pages/routes plus filter, metadata, canonical, schema, image, sitemap, robots and invalid-input authentication checks.
- Viewed Triton and the longest current title's PNGs: readable, no clipping.
- Browser inspection: Triton at a 390px viewport (375px content area), Thunder Valley at a 1280px viewport (1265px content area), no horizontal overflow. Mobile official-entry anchor resolves to the organizer link. Temporary viewport override reset.
- Final release uses the existing `release.mjs --product` gate, which reruns validation, checks candidate production output before promotion, and checks the live domain with automatic rollback on failure. Release outcome is recorded in ignored `.vercel/guide-release.json`.

## Search Console follow-up

After production verification, run Google's live rich-results test and request re-evaluation of the affected report if available. Until Google recrawls, the old Event warning may remain. A declining Events count is expected when guide pages stop declaring Event; it does not mean the page has been deleted or deindexed. Do not claim the report is cleared before Google confirms it.

Primary documentation read for this change:

- [Google Event guidelines](https://developers.google.com/search/docs/appearance/structured-data/event): single-event focus; public booking eligibility; recommended offers/image/performer.
- [Google Article documentation](https://developers.google.com/search/docs/appearance/structured-data/article): applicable article fields and organization authors.
- [Google Breadcrumb documentation](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).
- [Google rich-result reports](https://support.google.com/webmasters/answer/7552505): critical versus non-critical issues and report interpretation.
- [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response).
