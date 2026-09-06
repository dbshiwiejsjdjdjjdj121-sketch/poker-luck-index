# ALL IN Poker Guide

## Product
English, mobile-first directory of major live poker festivals and travel information. Next.js App Router, TypeScript, Tailwind, Vercel. Domain: https://www.allinpokerai.com.
Public content requires no login. Only email-code authentication remains. No bankroll, analysis, luck, subscription, Google login or App promotion.

## Data integrity
- Content lives in data/*.json; types and validation are centralized in src/lib/guide-types.ts and src/lib/validate-guide.ts.
- Publish one concise, multidimensional festival overview with official entry points at the bottom. Tournament/session types represent selected highlights only; do not reproduce full schedules or create individual event pages. Preserve stable IDs and year-specific URLs through reschedules.
- Never infer missing buy-ins, end dates, times, guarantees, tax rates or hotel prices. Preserve nulls.
- Attribute facts to successfully read primary sources. checkedAt records verification; updatedAt records substantive changes.
- Do not delete remote Firebase records or accounts. Firebase and the existing email service serve email-code authentication only.
- Do not introduce paid APIs, data providers or a new database without an explicit request.

## Maintenance
Read docs/daily-maintenance.md before daily content work. Daily runs may change data/ and reports/maintenance/ only.
Production Git remote is origin (poker-luck-index), branch main. Do not deploy the webpoker remote.
Run npm run validate before publishing. Test representative desktop/mobile pages and production smoke checks. Old SEO automations stay paused.
Existing user changes are preserved in stash entry "Preserve user SEO changes before ALL IN Poker Guide rebuild" and /tmp/poker-guide-pre-rebuild.patch.

## Skills
Regular coding is the default. Use skill-creator for project instruction changes, vercel-deploy for deployment, and Figma only when a Figma reference is supplied. Source facts must be checked with browsing.
