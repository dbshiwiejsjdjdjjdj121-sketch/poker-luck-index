# Freeroll keyword decision — 16 September 2026

## Decision before implementation
Build a small, source-backed freeroll discovery pilot, with Freerolls first on the homepage and Live Tournaments second. Keep existing festival URLs and saved festivals. Primary intent: **poker freerolls / free poker tournaments**. Brand guides support this intent. Do not position the site as a playable free-poker game, a bankroll giveaway, an exhaustive password feed, or a complete US online schedule.

## Evidence and limits
Google Trends Explore, Web Search, all categories, search terms, past 12 months, read 2026-09-16. Weekly public UI data transcribed to the accompanying JSON. Exclude the incomplete week starting September 13. Compare 26 complete weeks starting 2025-09-14 with 26 starting 2026-03-15. These are sampled, normalized interest indices, **not monthly searches**, unique users, or forecasts. Zero/isolated spikes can reflect low volume and statistical noise. No trustworthy absolute monthly keyword volume was obtained from accessible public sources; no paid service was purchased.

| Global term, same comparison request | First 26 weeks, mean | Last 26 weeks, mean | Relative change | Decision |
|---|---:|---:|---:|---|
| poker freerolls | 20.00 | 54.69 | +173.5% | Primary directory intent |
| free poker tournaments | 18.04 | 51.88 | +187.6% | Plain-English homepage wording |
| freeroll passwords | 35.38 | 29.88 | -15.5% | Supporting eligibility explanation, not primary promise |

[Global comparison](https://trends.google.com/trends/explore?date=today%2012-m&q=poker%20freerolls,freeroll%20passwords,free%20poker%20tournaments,pokerstars%20freerolls,freerolls%20today&hl=en). The two omitted series (pokerstars freerolls, freerolls today) were largely zero, insufficient for a defensible year-long trend.

[US comparison](https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=poker%20freerolls,freeroll%20passwords,free%20poker%20tournaments,freerolls,poker%20tournaments%20near%20me&hl=en): displayed averages 0, 1, 4, 3, 54 respectively; most freeroll observations sparse. Relative strength of nearby live-tournament searches supports preserving the live directory. Do not translate the global growth into US growth.

[UK comparison](https://trends.google.com/trends/explore?date=today%2012-m&geo=GB&q=poker%20freerolls,freeroll%20passwords,free%20poker%20tournaments,freerolls,poker%20tournaments%20near%20me&hl=en): averages 1, 6, 0, 3, 0 with many zero weeks and isolated spikes. No reliable half-year growth claim. Related-query panels suggest “pokerstars freerolls” and “best poker freerolls”, but their small base makes reported breakout/growth unsuitable for market sizing.

A preliminary US comparison including **free poker** put that broad term at 80 while the narrower terms rounded to 0. Its related queries included unrelated free games and promotions. High relative interest does not equal suitable directory intent.

[Google methodology](https://support.google.com/trends/answer/4365533?hl=en): sampled normalized interest, low-volume suppression/noise, not absolute volume. Search Console's existing “free poker bankroll” impressions are exposure for this site, not total market demand; they also reflect the retired product.

## Keyword-to-page plan

| Keyword group | Intent | Page / treatment | Confidence |
|---|---|---|---|
| poker freerolls; free poker tournaments | Find events and understand entry | Homepage + /freerolls, distinct copy | Global trend observed; US/UK size unproven |
| online poker freerolls; free online poker tournaments | Online events | Online filter with truthful available coverage | Relevant intent; absolute volume unknown |
| pokerstars freerolls | Brand-specific access | PokerStars guide, distinguish .fr program from other markets | Official material available; trend sparse |
| 888poker freerolls; partypoker freerolls | Brand-specific programs | Individual verified program guides | Content fit, no volume claim |
| no deposit poker freerolls | No prior spend | Explicit eligibility filter, never infer from $0 buy-in | High utility; volume unverified |
| freeroll passwords; poker freeroll passwords | Find access conditions | Explain official password/ticket routes; no copied private passwords | Stable observed global series, modest decline |
| freerolls today; freerolls this week | Time-sensitive discovery | Only confirmed dated listings, separate recurring programs | Data sparse; do not make unsupported schedule claims |
| free poker tournaments near me | Local free events | Clearly labelled live listings with actual location | Relevant US adjacent intent; avoid thin city pages |
| poker tournaments near me; live poker tournaments | Find live events/travel | Preserve /tournaments and destination guides | Stronger US relative signal than narrow freeroll terms |
| free poker; poker online free | Play instantly | Not a target landing-page promise | Intent mismatch |
| free poker bankroll; no deposit poker bonus | Bonus/money offer | Not primary target | Intent mismatch and own-site impressions insufficient |

Do not mass-produce near-identical keyword pages or publish unsupported “best” rankings. Start with substantive guides and indexable directory pages; filter combinations are noindex.

## Supply audit / publishing decisions
- [PokerStars .fr Stars Freerolls](https://www.pokerstars.fr/en/poker/free/freerolls/): official no-deposit statement, free daily qualifier, ticketed Wednesday/Sunday finals. This is the .fr program, not US/UK/global availability. Source labels times CET; do not silently convert to summer local time or invent dated instances.
- [PokerStars help](https://www.pokerstars.com/is/help/articles/finding-freerolls-fr/10918/?ooac=1): source explains lobby filters, passwords and tickets; no result means no available freeroll. An explanatory page is not a registration URL or proof of a scheduled event.
- [888 program](https://www.888poker.com/poker-promotions/24-7-freerolls-festival/) and [terms](https://www.888poker.com/terms/24-7-freerolls-festival/): funded players, account eligibility, Northern Ireland excluded, no exact daily times. Weekly promotional total must not become an individual event prize pool. Old/contradictory start dates omitted.
- [PartyPoker current terms](https://www.partypoker.com/en/poker/offers/round-the-clock-freerolls) vs [general free-poker explanation](https://www.partypoker.com/en/poker/how-to-play/software/free-poker): hourly, Party Dollars/tickets, deposit condition explained by general page; do not claim no-deposit. Current offer says $500/day; old 2023 blog $2,500/day not reused.
- [Freeroll Atlanta schedule](https://www.freerollatlanta.com/schedule-2/), [rules](https://www.freerollatlanta.com/rules/), [welcome](https://www.freerollatlanta.com/welcome-to-freeroll-atlanta-poker/): free entry but $10 venue tab required for points/gift certificates; optional purchases provide chips. Late-entry rules conflict, so exact late registration remains unconfirmed. Treat as one live league guide with dated highlights, not many near-identical SEO pages.
- Rejected as current inventory: PokerStars UK 2018 giveaway, 888 expired Global League, unverified third-party BetMGM “Daily C-Note freeroll” claim (official C-Note article describes paid normal event and a historical launch freeroll), BetRivers details without a successfully read primary promotion.

## Measurement
Use existing public page-view analytics and Search Console first. Vercel custom outbound events require Pro or above; they are not enabled or claimed as measured in this pilot, and no analytics plan is upgraded. Outbound-rate measurement remains a follow-up after confirming an available measurement method. Compare relevant non-brand Google Search clicks/impressions and useful outbound rate after 4–8 weeks of crawl time. Record the launch date and coverage; do not promise a traffic increase. Keep updating verified useful records, not generic SEO articles. Existing daily maintenance remains the single task; old SEO jobs stay paused.
