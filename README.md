# Poker Luck Index

A mobile-first poker web product built with Next.js, TypeScript, and TailwindCSS.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS v4
- OpenAI API for premium voice / screenshot parsing and hand analysis
- Firebase Admin for Firestore + Storage persistence
- Firebase Web Auth for Google sign-in
- Custom SMTP email-link auth for magic-link sign-in
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
- `OPENAI_TRANSCRIPTION_MODEL`
- `PREMIUM_UIDS`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`

Notes:

- The Firebase project defaults are set up for your existing All In project: `all-in-bd5a2`
- Google sign-in and email-link sign-in on web can use the provided default public Firebase config, but you can override it with the `NEXT_PUBLIC_FIREBASE_*` vars
- `FIREBASE_PRIVATE_KEY` must keep the `\n` line breaks in the env string
- Without the Firebase Admin env vars, hand uploads, history, and bankroll cloud sync will stay disabled
- `PREMIUM_UIDS` is a simple comma-separated allowlist you can use before Creem is wired in
- Email-link login uses your own SMTP setup instead of Firebase's default email template
- In Firebase Authentication, make sure Google sign-in is enabled and your web domains are added to Authorized domains:
  - `localhost`
  - `www.allinpokerai.com`
  - `allinpokerai.com`
- If you want email-link login too, enable `Email link (passwordless sign-in)` in Firebase Authentication

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

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
- Google sign-in and custom SMTP email-link sign-in are used for cross-device sync and future subscription entitlements
- Bankroll tracking remains free
- Voice and screenshot uploads are stored in Firebase Storage
- Parsed hand records are stored in Firestore under `hand_uploads/{viewerId}/entries/{entryId}`
- Bankroll records are stored under `users/{uid}/bankrollRecords`
- Donation CTA points to: [https://paypal.me/luck290214](https://paypal.me/luck290214)
