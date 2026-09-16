# Search demand and content decisions

Use `data/keyword-opportunities.json` as the durable editorial queue before every content addition or substantive update. It is agent reference data, not a public website feature. The initial market evidence is `reports/research/2026-09-16-semrush-keywords.json`; the earlier worldwide trend series is `reports/research/2026-09-16-freeroll-trends.json`. Keep the freeroll-first homepage and live-festival second entry. Search demand helps prioritize useful verified information; it does not authorize a broader product promise.

## Evidence and priorities

Keep three measurements separate:

- **Semrush:** estimated national monthly search demand and keyword difficulty. Country matters. Snapshot date is not necessarily the provider's data-refresh date. Do not add spelling variants as unique potential visitors or interpret difficulty as a ranking guarantee.
- **Google Trends:** relative normalized interest, with query, geography, period and complete-week comparison preserved. The observed worldwide six-month changes are not US/UK growth or monthly search counts. Sparse national samples do not establish a trend.
- **Search Console:** actual impressions and clicks for this property, with exact dates and filters. This is the outcome measure; Semrush is not the website's traffic report. Search queries can be withheld, and a top-ten view is not a complete export.

Priority 1: strengthen free-entry discovery, clear conditions, official program links, WSOP Circuit coverage, Las Vegas travel and the verified Wynn/Venetian editions. Priority 2: build eligible US/UK supply and useful comparisons when sources justify them. Lower-priority password queries, ambiguous year searches and uncovered venues need source or seasonality review before publication. Exclude unrelated games, instant-play promises and retired bankroll/analysis tools.

The initial queue has 18 intent groups, backed by 60 Semrush table observations covering 56 distinct country/keyword pairs. Exact brand phrases and some long-tail suggestions remain unmeasured; an empty metrics array means unknown volume, not zero.

## Before each content publication

1. Read the queue and recent maintenance reports. Recheck urgent dates, source failures and entry conditions before discretionary keyword work. Demand never overrides the official-source rules in `docs/daily-maintenance.md`.
2. Choose the existing intent group and its page. Closely related spellings belong on one useful page; a new word order, year filter or country filter is not sufficient reason for another indexable URL. Keep the homepage introduction and the freeroll comparison directory useful in their respective roles. Review overlapping rankings before making further landing pages.
3. Match the promise to the actual record: date/edition, location or eligible market, entry conditions, buy-in or zero buy-in, reward type, selected highlights and official bottom links. Clearly label recurring programs, dated starts, incomplete coverage and historical editions. Never infer missing facts to satisfy a keyword.
4. Use a primary phrase naturally where it describes the existing title/summary and visible content. Answer the real entry or travel question first; do not impose keyword density or add unrelated phrases. Existing templates generate metadata and internal links from data. If a useful title, heading, canonical, schema or navigation repair requires code, report it for separate product work; daily maintenance cannot change code.
5. Check the visible text, generated metadata, canonical, internal links and official entry points for changed pages as part of the existing validation/smoke workflow. Filter combinations remain noindex; only substantial destination guides should be indexable. Structured data must match the visible page, not invent individual events for a collection.
6. In the maintenance report record the intent-group ID, affected URL, factual improvement, remaining supply gap and validation. Keep account analytics private. No keyword-only timestamp refresh, generic filler article, artificial new edition or deployment just to appear fresh.

Every claim of no deposit, real-money rewards, public password access, a current start time or US-state eligibility requires its own official evidence. A low keyword difficulty does not relax that standard. Do not call a comparison "best" without sufficient eligible options and explicit selection criteria.

## Reviews inside the existing daily task

Use the same daily 13:00 Asia/Shanghai maintenance task. Do not create another SEO scheduler or restart the four old SEO automations.

**Weekly actual-search review:** on the first successful run at least seven days after the last successful review, read Search Console using existing authorized access. Compare the latest complete available 28 days with the preceding non-overlapping 28 days, using matching filters. Record the actual available end date and reporting lag. Also separate `/freerolls` and its children, current festival/tour/destination pages, and the homepage from retired routes. The freeroll pilot launched on 2026-09-16; earlier homepage traffic cannot demonstrate its results. Save actual totals, query/page coverage limits and exact filters, not a reconstructed complete query dataset.

Prefer relevant non-brand clicks, impressions and evidence that new content is being indexed. Treat average rank and CTR cautiously with small samples. Zero-to-positive results are new observed counts, not infinite percentage growth. If impressions grow without clicks, inspect query/page fit before changing titles. If a useful page receives no impressions, inspect indexing, canonical and internal-link evidence before writing more pages. Outbound conversions and AI citations are not measured by this process unless an actual reporting source is available; do not invent them or purchase analytics upgrades.

**Monthly market review:** on the first successful run at least thirty days after the last successful market review, recheck a focused sample of the queue in Semrush and Google Trends. Start with US and UK separately. Use at most five focused Semrush reports per run and fewer if the available allowance is lower; spread the queue over later reviews. The current free account limits visible rows, refreshes and exports. Do not start a trial, upgrade, buy credits, add paid APIs or alter account security. Numeric history is required for a numeric trend claim; a current volume snapshot alone is insufficient. Save successfully observed market data in a dated `reports/maintenance/*-keywords.json` and reference it from the queue when it is committed. Preserve old evidence.

If access is unavailable or a quota is exhausted, retain the old dated evidence and continue official content maintenance. Record the access issue without pretending a check succeeded; notify only when action is required or there is a meaningful decision. Keep attempts and successful-review dates separate so missed reviews can be retried without repeatedly consuming a quota on the same day.

Review the pilot after 4–8 weeks of meaningful crawl exposure, using these actual outcome measures and eligible content supply. More pages, a large market-volume number or one volatile week are not proof of success. Maintain major live guides while testing the freeroll entry point; change emphasis only when relevant search results and user usefulness support it.

## Durable storage and privacy

This Git repository is public. The keyword queue and market research can be committed. Do not commit account emails, credentials, screenshots of account settings, private Search Console exports, own-site performance totals or raw analytics responses.

Keep private search snapshots and review state under `$CODEX_HOME/automations/all-in-poker-guide/private-search/` (default `/Users/wangbin/.codex/automations/all-in-poker-guide/private-search/`), with directory mode 700 and file mode 600. This narrowly scoped local cache is permitted; it does not grant access to saved-festival user records. `review-state.json` holds successful dates, attempt dates and the latest snapshot filenames. Update a successful date only after reading the relevant report successfully.

Repository changes in daily runs remain restricted to `data/` and `reports/maintenance/`. For a research-only run, save the dated snapshot and pending editorial decisions in the private cache without a website deployment. Carry still-valid decisions into the next substantive content release and its public-safe report; recheck them before applying. Do not force a deployment solely for keyword research or an analytics report. Public reports can describe the decision without disclosing private traffic numbers. This task's initial library/runbook setup is an authorized instruction change, outside the narrower scope of later daily content runs.

## SEO and AI-search presentation

Use concise factual English, specific dates and regions, useful tables/conditions, internal links and reliable official citations. These improve the information itself. Google's guidance does not require a special AI file or a separate schema for its AI search features; ordinary indexing and content practices still apply. No promise of Google or AI citations is made. Prioritize accurate, distinct guides over mass-produced keyword variants.

References: [Semrush Keyword Overview](https://www.semrush.com/kb/257-keyword-overview), [Keyword Magic Tool limits](https://www.semrush.com/kb/262-keyword-magic-tool), [Google Trends methodology](https://support.google.com/trends/answer/4365533?hl=en), [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features), [Google people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
