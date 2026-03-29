# SEO Automation

This project can now collect analytics in three layers:

- Google Analytics 4 for funnel and on-site behavior
- Search Console for search queries, impressions, CTR, and ranking
- Vercel Web Analytics and Speed Insights for dashboard-level traffic and performance observation

## Required Environment Variables

- `NEXT_PUBLIC_GA_ID`
- `GA4_PROPERTY_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
- `GSC_SITE_URL`

Notes:

- `GA4_PROPERTY_ID` must be the GA4 property ID, not the web stream ID
- `GSC_SITE_URL` must match the exact Search Console property type. For a domain property use `sc-domain:allinpokerai.com`

CI-friendly alternatives:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`

Optional Vercel verification:

- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`

## Report Command

```bash
npm run seo:report
npm run seo:plan
npm run seo:weekly
```

The command reads Google Analytics 4 and Search Console data, then writes:

- `reports/seo/latest.md`
- `reports/seo/latest.json`
- `reports/seo/action-plan.md`
- `reports/seo/action-plan.json`
- `reports/seo/issue-body.md`

`npm run seo:weekly` is the local fallback that regenerates the report and action plan together.

## What The Report Looks For

- Pages with impressions but weak CTR
- Queries ranking near page one that deserve tighter content support
- Landing pages with traffic but weak tool engagement
- Funnel leakage between free actions and paid checkout

## Recommended Weekly Workflow

1. Run `npm run seo:report`
2. Review the recommendations in `reports/seo/latest.md`
3. Ship one focused batch of SEO changes
4. Wait at least 1-2 weeks before judging the result

## Automation Direction

The safe long-term flow is:

1. Auto-pull GA4 and Search Console data
2. Auto-generate a ranked SEO todo list
3. Auto-open a Codex task or branch with the suggested edits
4. Ship one focused SEO change batch against the weekly runbook

The weekly execution rules live in [docs/seo-weekly-runbook.md](/Users/wangbin/Documents/Poker%20Fortune/docs/seo-weekly-runbook.md).
The fixed SEO policy and machine-readable inputs live in:

- [docs/seo-policy.md](/Users/wangbin/Documents/Poker%20Fortune/docs/seo-policy.md)
- [seo/competitors.json](/Users/wangbin/Documents/Poker%20Fortune/seo/competitors.json)
- [seo/keyword-map.json](/Users/wangbin/Documents/Poker%20Fortune/seo/keyword-map.json)
- [seo/content-types.json](/Users/wangbin/Documents/Poker%20Fortune/seo/content-types.json)

Avoid fully automatic content rewrites on short-term traffic swings.

## GitHub Actions Setup

The repository includes `.github/workflows/seo-report.yml`.

Add these GitHub repository secrets:

- `GA4_PROPERTY_ID`
- `GSC_SITE_URL`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`

The workflow runs weekly and also supports manual runs from the Actions tab.
After the report finishes, it also creates a GitHub issue with the latest SEO action plan.
