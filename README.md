# Principles — Learn Design

A small Progressive Web App for learning design principles with spaced repetition. One principle a day, with full context. Installable on iOS and Android home screens. Works offline. No accounts, no tracking, no servers.

**Live:** `https://julialuksa.github.io/principles-app/` *(enable GitHub Pages from the repo settings to activate)*

## What it does

- **Daily** — one new principle + scheduled reviews, ~5–10 min per day
- **Explore** — read full principle sets by company, pick what you want to learn
- **Quiz** — multiple-choice "which company published this principle?"
- **PL / EN** — interface in Polish or English; principle text stays in original English

Progress is stored locally in your browser (`localStorage`) — never sent anywhere.

## Why

Reading 1,661 design principles end-to-end doesn't make you remember them. Spaced repetition does. This app builds a 7-minute daily ritual around principles you actually want to internalize.

## Attribution

All principles are quoted from publicly available sources, discovered via [**principles.design**](https://principles.design/) — a curated library of real-world design principles by Ben Holliday and contributors. This app is an educational tool with full attribution; please support the original aggregator and the original publishers:

- [NHS Design Principles](https://service-manual.nhs.uk/design-system/design-principles) — via [principles.design](https://principles.design/examples/nhs-design-principles)
- [GOV.UK Design Principles](https://www.gov.uk/guidance/government-design-principles) — via [principles.design](https://principles.design/examples/gov-uk-design-principles)
- [Monzo Product Principles](https://principles.design/examples/monzo-product-principles) — via [principles.design](https://principles.design/examples/monzo-product-principles)

If you're an author of any of these principle sets and you'd like attribution adjusted or content removed, open an issue and I'll act on it immediately.

## Install on your phone

**iOS (Safari):**
1. Open the live URL in Safari
2. Tap Share → "Add to Home Screen"

**Android (Chrome):**
1. Open the live URL in Chrome
2. Menu → "Install app" (or "Add to Home Screen")

Once installed it runs full-screen and offline.

## Tech

- Vanilla HTML + CSS + JS (no build step, no framework)
- ES modules, no dependencies
- PWA manifest + service worker for offline + installability
- Simplified SM-2 spaced repetition (Anki-style: Again / Good / Easy)
- LocalStorage for progress; no backend

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Add more principle sets

Edit [`data.json`](data.json) — each collection follows the same shape. Pull from [principles.design](https://principles.design/) examples and keep the `viaUrl` + `sourceUrl` for attribution.

## License

- **Code:** MIT
- **Principle text:** quoted from original publishers (NHS, GOV.UK, Monzo) under fair-use / public-info attribution. Discovery credit: [principles.design](https://principles.design/).
