# foodfinder

Osobní PWA: akční ceny z letáků Lidl, Albert, Billa, Kaufland, Penny a Tesco, Fit režim
(vysoké bílkoviny, nízký tuk), generátor fit jídelníčků a nákupní seznam.

```
npm install
npm test                         # Vitest (shared, scraper, app)
npm run scrape                   # stáhne letáky -> app/public/data/offers.json (jen lokálně)
npm run refresh                  # scrape + commit + push dat; nasazení se spustí samo
npm run dev -w @foodfinder/app   # vývojový server na http://localhost:5173
npm run build -w @foodfinder/app # produkční build s PWA do app/dist
node data-src/build-recipes.mjs  # přegeneruje app/public/data/recipes.json
```

Struktura: `shared/` (typy a čistá logika), `scraper/` (CLI), `app/` (Vite + React PWA).
Nasazení na GitHub Pages: `.github/workflows/deploy.yml` (po každém pushi do `main`).
Kupi.cz blokuje servery GitHubu (HTTP 403), proto se letáky stahují lokálně příkazem `npm run refresh`.

Denní spuštění ve Windows (Plánovač úkolů, jednou v PowerShellu):

```
$a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c cd /d C:projectsoodfinder && npm run refresh' 
$t = New-ScheduledTaskTrigger -Daily -At 7:00
Register-ScheduledTask -TaskName 'FitLetakRefresh' -Action $a -Trigger $t
```
Návrh a plán: `docs/superpowers/`.
