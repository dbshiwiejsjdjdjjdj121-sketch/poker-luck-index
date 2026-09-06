# Deployment and automation verification — 2026-09-07

Public website: https://www.allinpokerai.com

- Initial rebuild commit: `86533900d706ff7c0f829e1c7f5a5f38e29b1d01`.
- Initial production deployment: `dpl_AZdYpMo6QoHuTNynAQUZgpDewB3i`.
- First data-only update commit: `539870dced8e75f1e45c04e8d2be854cbd7b3565`.
- Current production deployment: `dpl_9iHKn8vojUsz8KhjVcYPxLdomowD`.
- Update was prepared in a clean worktree from latest origin/main, merged through `data:stage`, committed, validated and published using the normal release script without the initial-rebuild override.
- Both staged production releases and their public custom-domain versions passed all 67 route/metadata/filter/sitemap/auth-input smoke checks.
- Live rollback rehearsal completed at 2026-09-06 18:31 UTC: rolled back to the initial guide, verified the original APT Jeju content on the custom domain, re-promoted the updated guide, verified its new entry-document content. The site currently serves the updated guide.

The only new recurring task is `ALL IN Poker Guide 每日赛事维护` (`all-in-poker-guide`), a heartbeat attached to the current task at 13:00 local Asia/Shanghai time daily. The computer must be on, Codex running and the network available. The first scheduled invocation is later on September 7; the complete maintenance/release pipeline was exercised manually during implementation. Do not describe that rehearsal as a timer-triggered run.

The four earlier Codex SEO tasks remain PAUSED. The origin repository no longer has an SEO workflow file; the webpoker remote's legacy SEO Report remains disabled_manually. The saved stash and backup tag `codex/pre-guide-20260907` preserve the previous work/product.

Tests use fixed fixtures for behavioural scenarios so legitimate future schedule/buy-in changes do not break assertions; the live JSON is validated separately. The final test/report-only commit does not change shipped application code or content, so it requires no extra deployment. Future content runs start from the latest main including these fixtures.

Known verification limits: real Resend inbox delivery was not exercised; the complete browser login flow used a local SMTP receiver with the real Firebase project and an isolated temporary account, which was removed after sign-out. Public correction requests currently use GitHub because a separate public support email was not supplied. Travel and tax sections explicitly mark unconfirmed details.
