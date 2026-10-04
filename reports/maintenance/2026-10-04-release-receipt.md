# October 4 release receipt

Content commit: e0d5053ac6cc3119717c41918d291b270110081f.
Normal release completed at 2026-10-04T06:25:35.396Z (14:25 Beijing).

- Data validation, tests, lint, production build and typecheck passed through the normal release script.
- Staged deployment and custom-domain production smoke checks each passed 193 pages/routes, filters, canonical/metadata, Article and breadcrumb markup, guide images, sitemap/robots and invalid authentication inputs.
- Checked content was pushed to origin/main and promoted to the existing Vercel project. No rollback was necessary.
- Browser checked the published Manchester festival overview, cost/entry restrictions and bottom official links on desktop and approximately 574 CSS-pixel narrow Safari window. Minnesota's published dates, state/age/no-purchase restrictions, cancellation discrepancy and official links were confirmed. This was a narrow-window check, not a physical-phone test. The in-app browser timed out; Safari was used for verification instead.
- Reachability check: 267 URLs, 241 reachable, 24 requiring manual review, two unavailable (Prague airport references). No failed reference was used to advance verification timestamps.

Production pages:
- https://www.allinpokerai.com/tournaments/apat-poker-squads-manchester-2026
- https://www.allinpokerai.com/tournaments/wsop-circuit-thunder-valley-casino-resort-2026
- https://www.allinpokerai.com/freerolls/straight-flush-minnesota

The site now has 74 festival overviews and 13 freeroll guides. New free-guide candidates remain held as documented in the maintenance report. A successful smoke check verifies technical indexing policy, not that Google has indexed these pages. This receipt changes no public content and requires no additional deployment.
