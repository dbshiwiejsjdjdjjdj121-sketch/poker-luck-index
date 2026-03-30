# Weekly SEO Runbook

This runbook defines the safe weekly SEO editing loop for this repository.

Reference inputs:

- [docs/seo-policy.md](/Users/wangbin/Documents/Poker%20Fortune/docs/seo-policy.md)
- [seo/competitors.json](/Users/wangbin/Documents/Poker%20Fortune/seo/competitors.json)
- [seo/competitor-snapshot.json](/Users/wangbin/Documents/Poker%20Fortune/seo/competitor-snapshot.json)
- [seo/keyword-map.json](/Users/wangbin/Documents/Poker%20Fortune/seo/keyword-map.json)
- [seo/content-types.json](/Users/wangbin/Documents/Poker%20Fortune/seo/content-types.json)
- [seo/strategy-state.json](/Users/wangbin/Documents/Poker%20Fortune/seo/strategy-state.json)

## Goal

Turn the weekly SEO report into one focused batch of code changes that improves search visibility, activation, or conversion without creating noisy churn.

## Source Inputs

Start from these sources in order:

1. The rolling SEO action issue in GitHub labeled `seo`
2. `reports/seo/action-plan.md` if it exists locally
3. `reports/seo/latest.md` if it exists locally
4. The policy and fixed-input SEO files
5. `seo/strategy-state.json` for the currently active weekly decision and queue inheritance
6. The current site structure and gaps in the main SEO surfaces

## Signal Modes

Use the current report to decide which mode applies:

- `foundation`: traffic and query signals are still sparse, so use the fixed competitor snapshot and keyword map to improve one existing core SEO page
- `discovery`: early impressions are appearing, so use weekly Search Console signals to refine titles, FAQ, internal links, or query support
- `conversion`: enough landing and activation data exists to improve CTA hierarchy, onboarding copy, and monetization messaging

The competitor set is not a daily crawler target. Treat `seo/competitors.json` plus `seo/competitor-snapshot.json` as the stable research baseline and only refresh them on a longer cycle.
Treat the keyword queue in `seo/keyword-map.json` as the publishing sequence, and use `shape_group` to avoid same-day page-shape collisions.

## Priority Order

Pick the highest-value change from this order:

1. Fix blocking metadata, indexing, canonical, or internal-link issues
2. Improve the highest-impression page with weak CTR
3. Improve the highest-traffic tool page with weak activation
4. Add one tightly scoped FAQ or guide section for a rising query
5. Strengthen homepage routing into `bankroll` and `hand-review`
6. Add one people-first content page only if it fits the fixed keyword map and content-type rules
7. If the report has no strong signal yet, ship one foundational SEO improvement from the backlog

## Foundational Backlog

Use these only when the weekly report has no strong non-ops recommendation:

- Add FAQ content that answers live-poker bankroll or hand-review questions
- Improve internal links between the homepage, `bankroll`, `hand-review`, and `history`
- Tighten title tags and meta descriptions on the main tool pages
- Add comparison copy such as manual replay vs AI analysis
- Add GEO-friendly answer blocks with definitions, steps, and use cases
- Add one high-value guide, FAQ, or analysis page that matches the fixed keyword and competitor system

## Scope Guardrails

- Ship one focused batch per run, not a whole-site rewrite
- Prefer editing existing SEO surfaces before creating brand new pages
- Use the fixed competitor keyword baseline first, then let weekly first-party data decide what to refine next
- Do not fetch or re-scrape competitor sites during the weekly automation run
- Do not schedule or publish more than one item from the same `shape_group` on the same day
- Do not change pricing, billing logic, auth, or core product behavior unless the SEO report specifically points to a conversion issue and the change is low risk
- Do not remove existing user-facing features just to simplify SEO copy
- Keep the product positioning tools-first: bankroll and replay lead, luck index supports discovery
- Never force daily publishing just to fill a quota
- New content must satisfy the people-first and quality-gate rules in `docs/seo-policy.md`

## Validation

After edits, always run:

```bash
npm run seo:validate
```

This wrapper runs `lint`, `build`, then `typecheck`. The order is intentional because Next route types inside `.next/types` can lag behind route changes and cause a false `typecheck` failure if you run `tsc --noEmit` before a fresh build.

## Branching

Default branch pattern for the weekly SEO task:

- `codex/seo-weekly-YYYYMMDD`

## Closeout

At the end of each weekly run:

- Summarize what changed
- Note which report signal or backlog item justified the change
- Mention validation results
- Run `npm run seo:strategy` so the weekly conclusion is persisted into `seo/strategy-state.json`
- Inspect the full automation chain once: report freshness, rolling `seo` issue freshness, queue `shape_group` collisions, and any low-risk workflow friction worth fixing
- If no safe SEO code change is warranted, say so clearly instead of forcing a weak edit
