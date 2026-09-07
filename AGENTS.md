# ALL IN Poker Guide

## Product
English, mobile-first directory of major live poker festivals and travel information. Next.js App Router, TypeScript, Tailwind, Vercel. Domain: https://www.allinpokerai.com.
Public content requires no login. Only email-code authentication remains. No bankroll, analysis, luck, subscription, Google login or App promotion.

## Data integrity
- Content lives in data/*.json; types and validation are centralized in src/lib/guide-types.ts and src/lib/validate-guide.ts.
- Publish one concise, multidimensional festival overview with official entry points at the bottom. Tournament/session types represent selected highlights only; do not reproduce full schedules or create individual event pages. Preserve stable IDs and year-specific URLs through reschedules.
- Never infer missing buy-ins, end dates, times, guarantees, tax rates or hotel prices. Preserve nulls.
- Attribute facts to successfully read primary sources. checkedAt records verification; updatedAt records substantive changes.
- Do not delete remote Firebase records or accounts. Firebase serves email-code authentication and private saved-festival records. The email service is used only for sign-in codes.
- Do not introduce paid APIs, data providers or a new database without an explicit request.

## Saved festivals and tour discovery
- Saved festivals require email sign-in, are private to the verified user, and sync through server-only `guideSavedFestivals` documents in the existing Firestore database. Never accept a user ID from a request. Preserve ended saves and stable festival IDs.
- Tour families and official calendar links live in `data/tours.json`. Keep major tour choices visible even with zero listed festivals; directory counts describe our coverage, not all events worldwide. Preserve legacy exact-series URLs alongside `brand` filters.

## Maintenance
Read docs/daily-maintenance.md before daily content work. Daily runs may change data/ and reports/maintenance/ only.
Production Git remote is origin (poker-luck-index), branch main. Do not deploy the webpoker remote.
Run npm run validate before publishing. Test representative desktop/mobile pages and production smoke checks. Old SEO automations stay paused.
Existing user changes are preserved in stash entry "Preserve user SEO changes before ALL IN Poker Guide rebuild" and /tmp/poker-guide-pre-rebuild.patch.

## Skills
Regular coding is the default. Use skill-creator for project instruction changes, vercel-deploy for deployment, and Figma only when a Figma reference is supplied. Source facts must be checked with browsing.
