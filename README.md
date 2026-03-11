# Poker Luck Index

A mobile-first poker fortune web tool built with Next.js, TypeScript, and TailwindCSS.

## Stack

- Next.js App Router
- TypeScript
- TailwindCSS v4
- No backend
- No database
- Deterministic output from URL inputs

## Routes

- `/` home page with the poker fortune form
- `/result` result page rendered from query parameters

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
- Current fortune inputs:
  - `table_number`
  - `seat_number`
  - `birth_date`
  - `today_date`
- Donation CTA points to: [https://paypal.me/luck290214](https://paypal.me/luck290214)
