# Scraper

`npm run scrape` stáhne akce a zapíše `app/public/data/offers.json`.
Pokud nic nestáhne nebo je výsledek pod 50 % předchozího počtu, soubor se nepřepíše a příkaz skončí chybou.

## Zdroje

- **Kupi.cz** (`src/adapters/kupi.ts`) – výpisy `/slevy/<kategorie>/<obchod>` pro potravinové kategorie.
  Pokrývá všech šest obchodů (ověřeno živým během: Lidl, Albert, Billa, Kaufland, Penny, Tesco).
  `robots.txt` tyto cesty nezakazuje; dotazy mají odstup ≥ 1 s a jen pro osobní použití.

Nový zdroj: implementuj `Adapter` z `src/adapters/types.ts`, přidej do `src/adapters/index.ts`
a do `SUBJECTS` v `src/adapters/contract.test.ts` s uloženou fixture.

## Nutriční data

Pořadí: ruční `overrides.json` → Open Food Facts podle EAN → slovník (`dictionary.json`) → Open Food Facts podle názvu.
Odpovědi OFF se cachují v `scraper/cache/` (git-ignorováno); při výpadku OFF se po 3 chybách za sebou přestane dotazovat.
