# Product change: saved festivals and major tour discovery

Prepared 2026-09-08 (Asia/Shanghai). This is the user's authorized product change, not a scheduled content run.

## Behavior

- Festival cards and overviews offer a bookmark. Guests sign in using the existing email-code flow, then the intended festival is saved and their original page/filters restored.
- `/saved` is a private, noindex shortlist with search, Upcoming/Past/All views, remove/Undo, date-change notices, cancellation/postponement notices and retained historical editions. Saves do not register players or subscribe them to email.
- Existing Firestore stores only a festival ID, save time and original date snapshot per saved entry. Verified Firebase ID tokens determine every UID; clients cannot directly access the new collection. No existing Firestore rules or historical records were changed.
- Home and calendar now provide tour choices. Ten catalog families: WSOP, WPT, EPT, APT, Triton, APPT, PokerStars Open, BSOP, Irish Poker Open and Belgian Poker Challenge.
- WSOP groups Circuit, Super Circuit and bracelet festivals. WPT groups Main Tour, Prime and special events; Prime filtering also includes combined festivals with verified Prime highlights. Existing `tour` links continue to work; `brand` selects a family.
- Zero-listing brands remain visible with official calendar links. Counts mean published guide coverage under current filters, not the tour's entire calendar.

## Source and maintenance scope

Official calendars in `data/tours.json` were successfully read before their `checkedAt` timestamps were recorded. Triton ONE and Super High Roller Series names were additionally checked against the official article `https://www.tritonpokerseries.com/en-US/news/full-schedule-details-for-triton-one-and-super-high-roller-series-in-jeju-in-march`.

No festival dates or buy-ins were added by this product release. All 42 published festival overviews remain unchanged. Triton, BSOP and Irish Poker Open currently have no published overview in this repository. The Triton current schedule link timed out; its brand identity and official entry point do not establish event dates. GUKPT was considered but its official page could not be read, so it was not added to the verified catalog.

Daily maintenance now reads the additional official calendars in the catalog on a rotating seven-day schedule, prioritizes uncovered brands, and remains limited to public data and maintenance reports. It must not access private saved lists. Existing SEO automations remain unchanged and paused.

## Verification before release

- `npm run validate`: passed, including 36 tests, catalog/content validation, ESLint, production build and TypeScript.
- Local production smoke: passed 117 pages/routes plus brand filters, canonical/metadata, Event markup, sitemap, robots, noindex Saved/account/filter pages, anonymous saved API rejection and invalid email-code input.
- Browser checks at desktop width and 390 × 844: tour selection, WPT Prime combined festivals, URL refresh/back restoration, zero-result calendar links, guest save redirect, email code errors/cooldown, successful code login followed by automatic save and return, filled bookmarks, remove and Undo, saved-list search/reset, logout and session restoration. No horizontal overflow.
- Isolated Firebase Auth/Firestore demo emulators and a loopback SMTP receiver: verified server persistence, idempotent writes, concurrent saves, second-client reads and account isolation. Direct Firestore client access was denied. No test email was sent externally and no remote test account was created.
- Temporary local fixtures verified past editions and cancellation/date-change notices. Fixture changes were restored byte-for-byte before the production build; `data/festivals.json` has no release diff.
- Browser testing caught and fixed a proxy-origin mismatch and a card link overlay that intercepted bookmark clicks. The proxy case has a regression test; the card button was retested by pointer interaction.

Publishing uses `scripts/release.mjs --product` with staged and live smoke gates. Final deployment state is recorded in the ignored `.vercel/guide-release.json`.
