# SEO Policy

This policy defines how SEO work should happen for this repository without drifting into low-quality, traffic-chasing changes.

## Core Principle

SEO changes must be people-first.

- Content must exist to help a real poker player complete a task, answer a question, or understand a decision
- Do not publish pages whose only purpose is to capture impressions
- Do not mass-produce thin pages, spun pages, or lightly rewritten competitor pages
- Prefer a smaller number of clear, useful pages over a large number of weak pages

## Product Positioning

The product should be positioned as a poker tools workspace.

- `bankroll` is the main free utility
- `hand-review` is the main free replay utility
- luck index supports discovery and return visits
- premium AI features are secondary to the usefulness of the free workflow

## Fixed Competitor Set

Use the fixed competitor set in `seo/competitors.json` and the frozen SEO snapshot in `seo/competitor-snapshot.json`.

- Keep the same set for at least 8 weeks
- Build the competitor snapshot once, then treat it as a stable baseline instead of re-extracting competitor language every day
- Refresh the competitor set only on a longer review cycle or when the market meaningfully changes
- Weekly SEO automation must read the local snapshot instead of fetching competitor pages again
- Use competitor research for language, page structure, topic coverage, and internal-link ideas
- Do not copy feature claims or invent parity where it does not exist

## Fixed Keyword System

Use the keyword system in `seo/keyword-map.json`.

- Keep focus on a small number of core intent clusters
- Only add a new cluster when the current ones have meaningful coverage
- Prefer direct language such as `free poker bankroll tracker` over clever wording
- Treat the keyword queue `shape_group` field as a hard same-day diversity rule
- Do not publish two candidate pages with the same `shape_group` on the same day unless you explicitly override the queue for a good reason

## Strategy State

Persist the current weekly SEO conclusion in `seo/strategy-state.json`.

- Treat it as the inherited strategy layer between weekly reviews and any future daily publishing flow
- Update it after each complete weekly SEO cycle so later runs inherit the latest focus page, focus cluster, queue rules, and supervision findings
- Read it before planning new content so the system follows the current weekly direction instead of relying only on prompt memory

## Allowed SEO Changes

Automatic SEO work may change:

- page titles and meta descriptions
- H1, H2, body copy, FAQ, use-case sections, and comparison copy
- internal links and anchor text
- schema, sitemap, robots, and canonical signals
- new guide, FAQ, comparison, news-analysis, or scenario pages
- safe marketing components that do not change core product behavior

Automatic SEO work may not change:

- API logic
- auth
- billing and checkout logic
- bankroll calculations
- hand replay logic
- pricing model
- premium gating rules
- core route structure without explicit approval

## Content Types

Use the definitions in `seo/content-types.json`.

Preferred mix:

- evergreen guides
- FAQ or comparison pages
- scenario pages
- news with analysis

Avoid:

- generic news rewrites
- unoriginal roundups
- pages that do not clearly connect to bankroll, replay, history, or live-poker decision making

## Publishing Rules

- Do not force daily publishing
- Default target is 3 to 5 high-quality content pieces per week
- If there is not enough useful material, publish fewer pages instead of weaker pages
- Every new page must have a clear target intent, useful body content, internal links, and a path back to a product page
- Respect the `max_same_shape_group_per_day` rule from `seo/content-types.json`

## Evidence Hierarchy

When traffic is sparse, rank decisions by this order:

1. indexing and canonical health
2. fixed competitor coverage gaps
3. keyword cluster coverage gaps
4. people-first content quality
5. early Search Console impressions
6. GA4 activation data

When traffic becomes meaningful, increase the weight of:

- Search Console impressions, CTR, and page/query pairs
- GA4 landing page and activation data

## Safe Execution Rules

- Ship one focused SEO batch per run
- Change at most one core page plus one or two support pages in the same run
- Prefer improving existing pages before adding new ones
- Stop if the best available change would require altering core product logic
- Do not auto-merge or auto-deploy SEO edits

## Quality Gates

Each SEO page should pass these gates:

- clear intent
- helpful original explanation
- direct, concrete language
- internal links to the product surface it supports
- no exaggerated claims
- no obvious template spam

## Indexing Workflow

- Add new pages to the sitemap when appropriate
- Submit sitemap updates through Search Console API when available
- Use Search Console URL inspection data to monitor indexing state
- Manual index requests should be reserved for the highest-value pages

## Weekly Review

Every weekly review should answer:

- what changed in indexing or impressions
- which competitor gap is most important now
- which keyword cluster needs the next improvement
- whether the planned change is people-first and product-relevant
- whether first-party traffic data is strong enough to override the default competitor-and-keyword baseline for the next change
- whether the current keyword queue would create a same-day `shape_group` collision that should be deferred
