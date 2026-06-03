# Principles — Learn Design

A minimal Progressive Web App for learning design principles as flashcards.

**Live:** [`julialuksa.github.io/principles-app`](https://julialuksa.github.io/principles-app/)

Mobile-installable. Works offline. No accounts, no tracking, no servers.
Progress stored locally in your browser (`localStorage`).

---

## What's inside

| | |
|---|---|
| **152** | firms, authors, and named methodologies |
| **988** | individual design principles |
| **15** | cross-firm themes (User-focus, Inclusion, Craft, AI Ethics, …) |
| **88%** | of principles quoted **verbatim** from original publishers |
| **12%** | short **editorial summaries** (marked `~`) — added only where principles.design lists a title without a description |

### Featured publishers

NHS · GOV.UK · Apple · Google · Microsoft · Meta · Adobe · IBM · Stripe · Mercedes-Benz · Audi · BBC · Atlassian · Spotify · Shopify · Slack · Airbnb · Pinterest · Etsy · GitLab · Trello · Material · Dieter Rams · Jakob Nielsen · Ben Shneiderman · Don Norman · John Maeda · Bruce Tognazzini · Code for America · Eric Ries (Lean Startup) · *and ~120 more*

---

## Features

- **Home** — random principle library access (Mix) + suggested themes
- **Explore** — browse by theme (cross-firm) or by firm (alphabetical, with letter dividers)
- **Quiz** — multiple choice over the entire library
  - Mode: by **Company** ("Who published this?"), by **Theme** ("Which theme does this fit?"), or **Mix**
  - Themed quiz — practice principles from a single theme
  - Last & best score persisted locally
- **Flashcards** — two ratings: **Hard** (re-inserts the card mid-session) and **Easy** (next card)
- **PL / EN** UI — interface in Polish or English; principle text stays in the original publisher's language
- **Light / Dark / Auto** theme with iOS-style toggle in the header

---

## Attribution

All principle content comes from [**principles.design**](https://principles.design/) — a curated library of real-world design principles aggregated by [**Ben Holliday**](https://github.com/benholliday) and contributors.

**Verbatim principles** are quoted directly from the original publisher pages that principles.design links to (NHS Service Manual, vitsoe.com for Rams, nngroup.com for Nielsen, primer.style for GitHub, etc.). Each principle in this app links back to both the original publisher (`sourceUrl`) and to principles.design (`viaUrl`).

**Editorial summaries** (~12% of entries, marked with `~`) — written by this app's maintainer **only when principles.design lists a principle title without a description**, to make the content usable as a flashcard. Titles themselves always remain verbatim from the source. The `descriptionSource: "editorial"` field in [`data.json`](data.json) flags every such entry.

This app is an **educational and non-commercial** tool. Use of brief quoted excerpts with full attribution is intended to fall under fair-use / fair-dealing for educational purposes.

**Please support the originals** — visit [principles.design](https://principles.design/) and the original publisher pages linked in the app for full context, history, and updates.

**If you're an author of any principle set listed here** and you'd like attribution adjusted or content removed, please [open an issue](https://github.com/JuliaLuksa/principles-app/issues) and it will be acted on immediately.

---

## Install on your phone

**iOS (Safari):** open the live URL → Share → "Add to Home Screen"
**Android (Chrome):** open the live URL → Menu → "Install app"

Once installed it runs full-screen and offline.

---

## Tech

- Vanilla HTML + CSS + ES modules — no build step, no framework, no dependencies
- PWA manifest + service worker for offline + install
- LocalStorage for theme, language, and quiz history
- Font: [Geist](https://vercel.com/font) (Vercel)
- ~2300 lines total: app.js (989) · styles.css (1082) · i18n.js (211) · srs.js (54)

---

## Run locally

```bash
python3 server.py
# then open http://localhost:8765
```

The included `server.py` is a tiny no-cache Python server for dev; in production GitHub Pages serves the static files directly.

---

## Add more principle sets

Edit [`data.json`](data.json). Each collection follows this shape:

```json
{
  "id": "unique-id",
  "company": "Display Name",
  "tagline": { "en": "Industry · Country", "pl": "Branża · Kraj" },
  "description": { "en": "Short intro.", "pl": "Krótkie intro." },
  "sourceUrl": "https://original-publisher.com/principles",
  "viaUrl": "https://principles.design/examples/their-slug",
  "principles": [
    {
      "id": "unique-id-1",
      "themes": ["user-focus", "simplicity"],
      "title": "Verbatim title from publisher",
      "description": "Verbatim description from publisher."
    }
  ]
}
```

Then add a 2–3 character monogram entry in `COMPANY_MONOGRAMS` in `app.js`.

---

## License

- **App code (`*.js`, `*.css`, `*.html`):** [MIT](LICENSE) — feel free to fork and adapt.
- **Principle text:** quoted from original publishers under fair-use / educational attribution. Discovery and curation credit: [principles.design](https://principles.design/) by Ben Holliday.
- **Editorial summaries:** the small portion of descriptions written for this app (where principles.design only listed a title) are released under the MIT license alongside the code.

---

## Credits

- **Designed & built by** [Julia Luksa](https://github.com/JuliaLuksa) — UX/UI designer
- **Content source:** [principles.design](https://principles.design/) curated by [Ben Holliday](https://github.com/benholliday)
- **Original publishers** of each principle set (linked individually in the app via "source" on every card)

---

*Version 3.0 · Last updated June 2026*
