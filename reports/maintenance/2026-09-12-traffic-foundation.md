# Public analytics and poker tour guides

This product release adds useful entry pages for players researching WSOP, WPT and EPT, with upcoming and ongoing festivals, tour formats, travel planning and the organizer's official calendar. Counts describe this guide's coverage. The pages reuse existing festival and destination records; no festival dates, buy-ins or source facts were changed.

The three introductions were checked against the organizers' live calendars on 11 September 2026 UTC. Their source records and substantive modification dates are stored with the content. Homepage tour links, festival breadcrumbs and the tour picker connect the new pages to the existing directory. Each guide has a canonical URL, CollectionPage/ItemList markup and a sitemap entry. Filter combinations remain outside the indexable sitemap. Saved-festival sign-in preserves the new guide return URL.

Vercel Web Analytics is restored for known public routes on the production domain. Account, saved-festival, API and unknown paths are excluded. Query strings and fragments are removed, and Do Not Track or Global Privacy Control suppress collection. The privacy page describes the collection. This uses the existing enabled Vercel service; no advertising tracker or paid add-on was enabled.

Pre-release checks: data validation, 42 unit tests, lint, production build and type checking passed. Desktop WSOP and mobile EPT/WPT checks confirmed readable layouts, no horizontal overflow at a 390-pixel viewport, correct Prime filtering, official calendar links and sign-in navigation from a save button. No verification email was sent during testing. The release gate validates again and checks all 140 representative public, filtered, missing and API routes before promotion and on production.

Search Console's live test confirmed that the homepage can be crawled and indexed. The updated sitemap is to be submitted after this release. Indexing requests and analytics collection are verified separately against the live services; deployment itself does not imply Google has indexed a page. Existing SEO automations remain paused.
