# ALL IN Poker Guide

An English directory of major live poker festivals at https://www.allinpokerai.com.

**Find your next poker tournament. Plan the trip.**

Each festival has one concise overview: dates, representative buy-ins, venue, registration essentials, accommodation, transport, dining and general tax context. Official entry points at the bottom lead to full schedules, rules, apps and registration. We deliberately do not reproduce every tournament or offer individual event pages. All information is free and public. The optional account uses email verification codes only.

## Develop

Node 20.9+ (Vercel uses Node 24), npm, Next.js App Router, TypeScript and Tailwind.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Public content works without server credentials. Email sign-in needs the existing Firebase Admin and email-provider configuration. Never copy real secrets into this repository.

## Content

- `data/festivals.json`: stable, year-specific festival overviews and selected event highlights.
- `data/destinations.json`: reusable city travel information; only editorially complete guides set `indexable: true`.
- `data/sources.json`: primary URLs and the time their content was successfully read.
- `src/lib/guide-types.ts`, `validate-guide.ts`, `stage-guide.ts`: schema, validation and proposals merged by stable ID.

Amounts remain in original currencies; fees are included in the displayed total when a verified fee is available. Highlights are not a complete series buy-in range. Unknown values stay null. Date filters use festival interval overlap. Venue time zones determine ongoing/past status. Filters are shareable GET URLs and are noindex; their canonical points to the unfiltered calendar.

```sh
npm run validate
npm run data:links -- /tmp/guide-links.json
npm run smoke -- http://127.0.0.1:3000
npm run data:stage -- /tmp/guide-candidate.json
```

## Publish and maintain

See [daily maintenance](docs/daily-maintenance.md) and [release procedure](docs/release.md). Daily Codex maintenance may edit content and reports only. No paid data/AI service was added. The old daily/weekly SEO automations remain paused; the old scheduled GitHub workflow was removed.

The production repository is `dbshiwiejsjdjdjjdj121-sketch/poker-luck-index`, production branch `main`. Git-triggered Vercel deployments are disabled in `vercel.json`; the checked release script stages a production build, verifies it, then changes the domain assignment. The Vercel project and custom domain are unchanged.

The prior product is preserved in Git history. Pre-existing uncommitted SEO edits were stored in a named stash before the rebuild. Remote Firebase historical records and existing accounts were not erased.
