# Regional discovery product release

- Published product commit: af6bac31fa801f7ecee4327ec89478c27c118a57 (includes implementation 2de1a7f).
- Completed: 2026-10-04T07:40:28.224Z.
- Production: https://www.allinpokerai.com.
- Full validation passed: content validation, 54 tests, lint, production build and typecheck.
- Staged and custom-domain smoke checks each passed for 193 pages/routes, filters, canonical metadata, Article/breadcrumb data, guide images, sitemap, robots and invalid authentication input. These checks establish technical indexing policy, not actual Google inclusion.
- Safari confirmed the promoted homepage US/UK panels and the Minnesota filter with two matching guides. Desktop and narrow layouts were reviewed before release; no physical device was used.
- The first candidate was not promoted because an overly broad UK assertion counted a France explanatory FAQ link as a result. The assertion now checks actual guide cards; the complete release gate was rerun successfully. No production rollback was needed.
- This receipt adds documentation only and does not trigger a separate deployment. No source facts or verification timestamps changed during this product release. Existing daily content maintenance and paused legacy SEO tasks remain unchanged.
