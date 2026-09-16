# Search-intent and copy improvements — 16 September 2026

The existing homepage used an indirect freeroll headline, while the tournament and destination directories used promotional headings that did not identify their content. Improve these existing pages around the saved keyword queue without creating keyword variants or expanding the advertised inventory.

## Changes

- Homepage: “Free poker tournaments. Find your next freeroll.” The summary identifies online and local live formats, eligibility, deposits/tickets, rewards and official sources. Keep live tournaments as the second entry.
- Freeroll directory: make filtering and official entry rules explicit; add six short visible questions covering the definition, no-deposit eligibility, cash versus other rewards, dated starts, regional access, and official passwords/registration. Supporting links go to the relevant guides or official PokerStars help.
- Freeroll detail template: descriptive questions organize the existing facts; readable ticket/password labels replace raw enum text. Add anchors to conditions, regions, prizes, starts and official links, including on phones. Existing source dates and rewards are preserved.
- Live calendar and destination templates: use descriptive headings such as “Live poker tournament calendar” and “Poker tournaments in Las Vegas.” Preserve the distinction between selected major festivals and routine daily casino games.
- WSOP guide: focus its title and introduction on Circuit schedules and selected festival overviews while directing the full-schedule request to WSOP. The official calendar was read successfully before updating that introduction's source-check and content-change dates. No individual festival dates, buy-ins or source timestamps were changed.
- About page: identify the independent directory, AI-assisted compilation, official sources and public correction process. Do not imply an organizer wrote the guides or invent an individual expert author.
- Metadata follows visible content. No new Event/FAQPage markup, special AI file, paid service or automated article workflow was introduced. Existing filter noindex and canonical behavior are preserved.

Relevant queue groups: `free-tournament-entry`, `freeroll-directory`, `online-freeroll-discovery`, `no-deposit-comparison`, `cash-prize-freerolls`, `freerolls-today`, `official-password-access`, `wsop-circuit`, `las-vegas-destination`, `local-live-discovery`. Conditional intents remain conditional; headings do not establish regional eligibility or cash prizes.

## Evidence read

- [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features): ordinary indexing, useful visible text, internal links and consistent structured data apply; special AI markup is not required and inclusion is not guaranteed.
- [Google people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): use clear scope, reliable sourcing and an explanation of how content is prepared.
- [PokerStars freeroll help](https://www.pokerstars.com/is/help/articles/finding-freerolls-fr/10918/?ooac=1): entry definition, tickets/passwords and official lobby instructions.
- [PokerStars.fr program](https://www.pokerstars.fr/en/poker/free/freerolls/): cash versus tournament-money finals and no-deposit account conditions, specific to this regional program.
- [PartyPoker free-poker explanation](https://www.partypoker.com/en/poker/how-to-play/software/free-poker): free buy-in can coexist with a previous-deposit condition.
- [WSOP official calendar](https://www.wsop.com/schedule/): Circuit, Super Circuit and bracelet categories; basis for the revised introduction, not a fresh verification of every linked festival.

## Verification

Local lint and data validation passed. Browser checks covered the homepage and question layout on desktop, plus the homepage, freeroll filter-to-guide-to-official-link flow, live calendar and Las Vegas guide at 390px width. No horizontal overflow was observed; all five new detail anchors resolve. The no-deposit filter returned the existing eligible guide and remained noindex.

Server-rendered HTML checks passed for nine representative routes: unique H1, description, production canonical, filter noindex, valid JSON-LD and visible question text without client interaction. Release uses the existing product release gate: full `npm run validate`, staged-deployment smoke check, main/production concurrency checks, promotion and live smoke check with recovery on failure. No traffic or ranking gain is claimed before measurement.
