# First content-maintenance rehearsal — 2026-09-07

Started from a clean temporary worktree of production `origin/main` at `8653390`. Only data and this report are changed.

Read the WSOP calendar, WPT calendar, PokerStars Live homepage, APT series index and APT Jeju information page. Triton's index was reachable but its event details timed out and its list required client-side rendering; no Triton facts or source-check timestamps were invented. Additional calendar entries beyond the first 20 are candidates for the next discovery cycle, including further WSOP Circuit stops and WPT Cambodia 2027. An older WPT World Championship PDF was not mislabelled as a confirmed 2026 schedule.

Successfully read:
- https://www.theasianpokertour.com/series/apt-jeju-south-korea-2026/info
- https://www.theasianpokertour.com/download
- https://www.lesajeju.com/pc/en/ylccy

The APT Jeju overview now clarifies the organizer's accepted identity documents and links the official app source. Its reused destination guide includes specific casino/resort dining and the limits of the stated 24-hour catering service. The guide is now substantive enough for city-page indexing. No prices, hotel offers or airport timetables were guessed. The organizer-linked hotel site returned a gateway failure; the last confirmed official information link was preserved.

Staging merged stable IDs with zero quarantined proposals. Automated tests exercise duplicate-source rejection, invalid-candidate quarantine, empty discovery and failed-source preservation. The normal data-only release command validates, builds, smoke-checks a staged production deployment and promotes it only after those checks. A separate live rollback to the initial guide release, followed by re-promotion of the updated guide, is recorded in the deployment verification report after the operation.
