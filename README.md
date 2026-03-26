# Poker Luck Index

A mobile-first poker web product built with Next.js, TypeScript, and TailwindCSS.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS v4
- OpenAI API for premium voice / screenshot parsing and hand analysis
- Firebase Admin for Firestore + Storage persistence
- Firebase Web Auth for Google sign-in
- Custom email-link auth for magic-link sign-in
- Creem for Pro subscription checkout and webhook-based access sync
- Deterministic fortune output from URL inputs

## Routes

- `/` home page with the poker fortune form
- `/result` result page rendered from query parameters
- `/hand-review` hand upload studio for manual, voice, and screenshot intake
- `/bankroll` free bankroll tracker
- `/history` saved hand history

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

Required for the new hand upload flow:

- `OPENAI_API_KEY`
- `OPENAI_HAND_UPLOAD_MODEL`
- `OPENAI_HAND_ANALYSIS_MODEL`
  Default: `gpt-5.3-chat-latest`
- `OPENAI_TRANSCRIPTION_MODEL`
- `PREMIUM_UIDS`
- `CREEM_API_KEY`
- `CREEM_API_BASE_URL`
- `CREEM_WEBHOOK_SECRET`
- `CREEM_PRODUCT_PRO_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `APP_URL`
- `EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `NEXT_PUBLIC_GA_ID`
  Optional: enables Google Analytics 4 page views and funnel events
- `GA4_PROPERTY_ID`
  Required for the SEO reporting script. Use the GA4 property ID, not the stream ID. In the Analytics admin URL it appears as the number after `p`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
  Required for the SEO reporting script
- `GOOGLE_SERVICE_ACCOUNT_JSON`
  Optional alternative for CI or GitHub Actions
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
  Optional alternative for CI or GitHub Actions
- `GSC_SITE_URL`
  Required for the SEO reporting script. Use your exact Search Console property, such as `https://www.allinpokerai.com/` for a URL-prefix property or `sc-domain:allinpokerai.com` for a domain property
- `VERCEL_TOKEN`
  Optional for the SEO reporting script
- `VERCEL_PROJECT_ID`
  Optional for the SEO reporting script
- `VERCEL_TEAM_ID`
  Optional for the SEO reporting script when the project belongs to a team

Notes:

- The Firebase project defaults are set up for your existing All In project: `all-in-bd5a2`
- Google sign-in and email-link sign-in on web can use the provided default public Firebase config, but you can override it with the `NEXT_PUBLIC_FIREBASE_*` vars
- `FIREBASE_PRIVATE_KEY` must keep the `\n` line breaks in the env string
- Without the Firebase Admin env vars, hand uploads, history, and bankroll cloud sync will stay disabled
- `PREMIUM_UIDS` is still available as an emergency override allowlist
- Email-link login uses your own verified email setup instead of Firebase's default email template
- Recommended production setup: `EMAIL_PROVIDER=resend` with a verified sender like `login@allinpokerai.com`
- SMTP still works as a fallback, but domain email delivery through Resend is the better path for deliverability
- Creem monthly Pro access is granted through the webhook and stored in Firestore at `user_access/{uid}`
- In Firebase Authentication, make sure Google sign-in is enabled and your web domains are added to Authorized domains:
  - `localhost`
  - `www.allinpokerai.com`
  - `allinpokerai.com`
- If you want email-link login too, enable `Email link (passwordless sign-in)` in Firebase Authentication
- In Creem, point the webhook to `/api/billing/creem/webhook`

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run seo:report
npm run seo:plan
```

`npm run seo:report` writes the latest markdown and JSON summaries into `reports/seo/`.
`npm run seo:plan` turns the latest report into an action plan and issue body.

For GitHub Actions, add these repository secrets:

- `GA4_PROPERTY_ID`
- `GSC_SITE_URL`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID`

The scheduled workflow also creates a GitHub issue with the latest SEO action plan.

## Deployment

This project is ready for deployment on [Vercel](https://vercel.com/).

## Product Notes

- Fortune output is deterministic: the same input values always produce the same result.
- Fortune inputs: `table_number`, `seat_number`, `birth_date`, `today_date`
- Hand Upload Studio is the web adaptation of your All In intake flow
- Supported hand upload methods:
  - free manual hand save
  - premium voice upload
  - premium screenshot upload
- Premium AI hand analysis can be run later on any saved hand
- Google sign-in and custom email-link sign-in are used for cross-device sync and subscription entitlements
- Bankroll tracking remains free
- Voice and screenshot uploads are stored in Firebase Storage
- Parsed hand records are stored in Firestore under `hand_uploads/{viewerId}/entries/{entryId}`
- Bankroll records are stored under `users/{uid}/bankrollRecords`
- User access is stored under `user_access/{uid}`
- Free features: luck reading, bankroll tracking, manual hand uploads
- Pro features: voice upload, screenshot upload, AI hand analysis
