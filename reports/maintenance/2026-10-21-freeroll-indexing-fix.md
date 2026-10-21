# Freeroll directory indexing audit and repair

User-requested manual product repair, separate from daily data-only maintenance. Based on origin/main b849949. No content verification dates changed.

## Observed public behavior

- Canonical /freerolls returns HTTP 200 with index, follow and self canonical; robots permits access. Homepage raw HTML contains five /freerolls links and ten detail links. Content and links are server rendered.
- Empty form /freerolls?q= returns the full catalog but noindex. Tracking-only /freerolls?utm_source=test also returns noindex and incorrectly hides both market guide sections.
- Directory sitemap entry has no lastmod despite substantive catalog additions.
- No evidence from these tests establishes why Google has not scheduled its first ordinary crawl. Private Search Console findings remain exclusively in the protected local search cache. Live eligibility does not mean indexing.

## Repairs

- Parse only recognized, nonempty directory filters. Share that result between metadata and page rendering, so empty form and tracking-only variants keep full content and indexability with the clean canonical. Actual filters remain noindex.
- Set directory sitemap lastmod from actual catalog updatedAt values, never deployment or verification time.
- Add regression coverage for empty forms, tracking values and real filters, and production smoke assertions for metadata and market sections.

## Validation / release

Unit tests passed (55). Full validation, staged deployment and production smoke pending; release receipt to follow. Existing authenticated/private routes and crawl restrictions remain unchanged.

## References and limitations

- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/webmasters/answer/7440203

These repairs address reproduced issues; they are not proof of the cause of clean-URL non-crawling and do not guarantee index inclusion. Avoid duplicate landing pages, fake freshness and repeated indexing requests.
