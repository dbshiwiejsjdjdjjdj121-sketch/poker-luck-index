# October 8 production release receipt

Completed at 2026-10-08T05:35:07.729Z through the normal release script, without product/initial flags or force push.

- Initial content commit: 0bc0421204b907877b9a736dd914f1d75a427438.
- Final content correction: 46a57a2cd5b34e16f7ff66172ebca42561b32510.
- Live deployment: https://poker-luck-index-2f20i1v4w-yiwangyuai-7161s-projects.vercel.app.
- Prior checked deployment: https://poker-luck-index-1tznt5x69-yiwangyuai-7161s-projects.vercel.app.
- Public site: https://www.allinpokerai.com.

Both normal releases passed npm run validate (54 tests, lint, TypeScript and production build), staged smoke and live smoke. Each smoke covered 195 public pages/routes plus filters, canonical/metadata, Article/breadcrumb data, guide images, sitemap, robots and invalid authentication input. Promotion completed; no rollback was needed. The report-only receipt does not require another deployment.

Delivered 1 new festival guide (APT Jeju Classic 2027), 0 new independent freeroll guides, 2 substantively updated existing freeroll guides (Straight Flush Minnesota and Not Quite Vegas Florida), and 1 updated shared destination (Jeju). Unchanged successful verification timestamps published alongside these substantive changes do not count as new content. Discovery scope, held candidates and failed sources are detailed in 2026-10-08-1321.md.

Chrome desktop verified the Minnesota guide, qualification explanation and bottom official calendar link. Chrome's 400-pixel responsive viewport verified the new Jeju overview, readable title/summary, dates, KRW buy-in and official-entry control without horizontal clipping. Final browser accessibility check confirmed the misleading Source discrepancy label was removed; official links remain present. Closed only the inspection tab and restored the user's original Chrome tab.

The 270-URL reachability sweep flagged 26 unavailable or manual-review links; this does not mean cancellation. All six changed Minnesota/Florida/APT official links returned HTTP 200, with their factual content read separately. Blocked and empty sources retain prior values and verification dates. The known Venetian shared-calendar uniqueness blocker remains held, and no product code was changed. Public correction request list was empty. No private search metrics or credentials are included.
