# Weekly SEO Runbook

This runbook defines the safe weekly SEO editing loop for this repository.

## Goal

Turn the weekly SEO report into one focused batch of code changes that improves search visibility, activation, or conversion without creating noisy churn.

## Source Inputs

Start from these sources in order:

1. The latest SEO action issue in GitHub labeled `seo`
2. `reports/seo/action-plan.md` if it exists locally
3. `reports/seo/latest.md` if it exists locally
4. The current site structure and gaps in the main SEO surfaces

## Priority Order

Pick the highest-value change from this order:

1. Fix blocking metadata, indexing, canonical, or internal-link issues
2. Improve the highest-impression page with weak CTR
3. Improve the highest-traffic tool page with weak activation
4. Add one tightly scoped FAQ or guide section for a rising query
5. Strengthen homepage routing into `bankroll` and `hand-review`
6. If the report has no strong signal yet, ship one foundational SEO improvement from the backlog

## Foundational Backlog

Use these only when the weekly report has no strong non-ops recommendation:

- Add FAQ content that answers live-poker bankroll or hand-review questions
- Improve internal links between the homepage, `bankroll`, `hand-review`, and `history`
- Tighten title tags and meta descriptions on the main tool pages
- Add comparison copy such as manual replay vs AI analysis
- Add GEO-friendly answer blocks with definitions, steps, and use cases

## Scope Guardrails

- Ship one focused batch per run, not a whole-site rewrite
- Prefer editing existing SEO surfaces before creating brand new pages
- Do not change pricing, billing logic, auth, or core product behavior unless the SEO report specifically points to a conversion issue and the change is low risk
- Do not remove existing user-facing features just to simplify SEO copy
- Keep the product positioning tools-first: bankroll and replay lead, luck index supports discovery

## Validation

After edits, always run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Branching

Default branch pattern for the weekly SEO task:

- `codex/seo-weekly-YYYYMMDD`

## Closeout

At the end of each weekly run:

- Summarize what changed
- Note which report signal or backlog item justified the change
- Mention validation results
- If no safe SEO code change is warranted, say so clearly instead of forcing a weak edit
