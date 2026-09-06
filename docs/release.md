# Release and recovery

Production project: `poker-luck-index` (`prj_4RY5RDNbeFUAeEV10kBPckbZeJzR`), team `team_8ufG83uOS6mmizyqiGqR6JB0`, domain `www.allinpokerai.com`, Git branch `origin/main`.

The release script must run from a clean committed worktree. Normal releases allow only data and maintenance-report changes versus origin/main. `--product` permits an explicitly user-authorized product change, with the same validation, staged deployment and recovery checks. `--initial` remains for the initial rebuild only. Daily automations must never use either option. Git auto-deploy is disabled so an unverified main push cannot bypass the smoke check and promotion gate.

```sh
node --env-file=.env.local scripts/release.mjs
```

The script uses Vercel CLI via the existing local installation (or `VERCEL_CLI` override), the token in the ignored environment file, and the existing linked project. It runs validation/build, deploys with production environment and `--skip-domain`, checks all public routes and representative SEO/auth failures, checks main has not advanced, pushes the checked commit, and promotes the staged deployment. This avoids promoting a preview build whose HTML contains noindex.

The last production deployment is captured before release. State is written into ignored `.vercel/guide-release.json`, including deployment URLs and stages. If the live smoke check fails, the script rolls back to the prior deployment and verifies its domain assignment. It leaves the new main commit in place and reports failure; investigate before publishing again. Git and production can temporarily differ after a rollback. To restore Git as well, revert only the faulty content commit in a clean worktree and run a new validated release; never reset or force-push main.

For a manual recovery, use the saved previous URL with `vercel rollback <url> --yes --token ...`, without exposing the token in messages. Verify the custom domain returns the intended version. Later use `vercel promote <good-deployment-url> --yes` to resume from a checked production build. Do not promote a preview build without rebuilding for production.

Preview builds are separate (`vercel deploy --yes`); verify noindex/robots with `npm run smoke -- <preview-url> --preview`. Vercel authentication protects deployment URLs. The automation bypass token is used only in an HTTP header for checks; never publish it in URLs or reports. The release script can obtain a project-specific automation bypass token using Vercel's API when none exists; ordinary visitors cannot access protected previews.

Primary references:
- https://vercel.com/docs/cli/deploy
- https://vercel.com/docs/cli/promote
- https://vercel.com/docs/deployments/rollback-production-deployment
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
