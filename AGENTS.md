# AGENTS.md

## Project Focus
- Build and maintain `Poker Luck Index` as a two-page web product with `Next.js`, `TypeScript`, and `TailwindCSS`.
- Keep the product mobile-first, dark-theme, deterministic, and deployable on Vercel without a backend or database.
- Preserve the casino-oracle visual language: deep blue/purple backgrounds, gold accents, clean layouts, and card-style panels.

## Implementation Rules
- Use the App Router under [`/Users/wangbin/Documents/Poker Fortune/src/app`](/Users/wangbin/Documents/Poker Fortune/src/app).
- Keep fortune generation deterministic and centralized in [`/Users/wangbin/Documents/Poker Fortune/src/lib/fortune.ts`](/Users/wangbin/Documents/Poker Fortune/src/lib/fortune.ts).
- Do not add randomness, persistent storage, auth, or server-only dependencies unless the user explicitly asks for them.
- Prefer shareable URL-driven state for result pages so the same inputs reproduce the same output.
- Keep dependencies lean; add libraries only when they remove meaningful implementation risk.

## Skill Policy
- Default active workflow: regular coding without extra skills.
- Use `skill-creator` only when changing project-level instructions, creating a new repo skill, or refining how Codex should work in this repository.
- Use `figma` or `figma-implement-design` only if the user provides a Figma URL or asks for 1:1 design implementation.
- Keep these skills effectively off for this repo unless the request changes scope: `develop-web-game`, `phaser-mini-game-spec`, `speech`, `skill-installer`.
- If the project later becomes a playable poker game, re-enable `develop-web-game` for the testing loop.
