# Fit leták

Osobní PWA: akční ceny z letáků Lidl, Albert, Billa, Kaufland, Penny a Tesco, Fit režim
(vysoké bílkoviny, nízký tuk), generátor fit jídelníčků a nákupní seznam.

```
npm install
npm test                         # Vitest (shared, scraper, app)
npm run scrape                   # stáhne letáky -> app/public/data/offers.json
npm run dev -w @foodfinder/app   # vývojový server na http://localhost:5173
npm run build -w @foodfinder/app # produkční build s PWA do app/dist
node data-src/build-recipes.mjs  # přegeneruje app/public/data/recipes.json
```

Struktura: `shared/` (typy a čistá logika), `scraper/` (CLI), `app/` (Vite + React PWA).
Denní scrape a nasazení na GitHub Pages: `.github/workflows/scrape-deploy.yml`.
Návrh a plán: `docs/superpowers/`.
