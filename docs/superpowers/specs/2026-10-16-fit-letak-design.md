# Fit nákupní leták – design

Datum: 2026-10-16 · Rozsah: osobní použití · Platforma: PWA (telefon + PC)

## Cíl
Interaktivní leták z aktuálních akcí Lidl, Albert, Billa, Kaufland, Penny a Tesco:
- vyhledávání volným textem, filtry slev, kategorií a obchodů,
- Fit režim: snadné hledání produktů s vysokými bílkovinami a nízkým tukem,
- generátor fit jídelníčků s cenami podle aktuálních nabídek,
- z jídla jedním klikem nákupní seznam.

## Mimo rozsah (YAGNI)
Účty, sdílení, serverový backend, historie cen, nativní appka, LLM generování receptů (možné později).

## Architektura
`zdroje letáků → scraper → normalizace → nutriční párování → public/data/offers.json → PWA`

Dva balíčky v jednom repu: `scraper/` (Node + TS + Cheerio) a `app/` (Vite + React + TS, PWA).
Jejich jediným rozhraním je soubor `offers.json` (+ `recipes.json`, `overrides.json`).

### scraper/
- Adaptér na zdroj: `fetchOffers(): Promise<RawOffer[]>`. První adaptér agregátor Kupi.cz, další dle potřeby.
- Normalizace: parser jednotek a balení ("500 g", "6×0,5 l", "kg"), výpočet `pricePerKg`, `discountPct`, mapování kategorií.
- Běh 1× denně v GitHub Actions; při selhání zůstává poslední úspěšný `offers.json`.
- Testy proti uloženým HTML fixture, ne proti živému webu.

### Nutriční párování
1. EAN / název v Open Food Facts.
2. Slovník klíčových slov (např. "kuřecí prsa" → známé hodnoty na 100 g).
3. Ruční `overrides.json`.
Každý záznam nese `source` a `confidence`; UI je zobrazuje.

### Datový model
- **Offer**: id, store, name, price, originalPrice, discountPct, unit, packageSize, pricePerKg, validFrom, validTo, category, imageUrl, sourceUrl, nutrition?
- **Nutrition** (na 100 g): kcal, protein, fat, carbs, source, confidence. Odvozeno: proteinPer100kcal, cena za 30 g bílkovin.
- **Recipe**: id, name, steps, ingredients[{ generic, grams }], tags. Makra a cena se dopočítají.

### app/
Záložky:
1. **Leták** – MiniSearch (diakritika, překlepy); filtry obchod / jen slevy od X % / kategorie / cena; Fit režim (bílkoviny ≥ X, tuk ≤ Y na 100 g), řazení podle ceny za 30 g bílkovin; karta produktu s cenou, slevou, makry, zdrojem dat a tlačítkem "do seznamu".
2. **Jídelníček** – vstup: kcal, bílkoviny, max tuk, počet jídel, vyloučené suroviny, rozpočet; výstup: plán na den/týden s cenou jídel; tlačítko "naklikat do seznamu".
3. **Nákupní seznam** – seskupení po obchodech, nejlevnější obchod pro každou surovinu, celková cena, odškrtávání offline (IndexedDB).
4. **Nastavení** – cíle makroživin, oblíbené obchody, ruční opravy nutričních dat.

PWA: service worker, offline cache dat, instalace na plochu.

### Generátor jídelníčků (deterministický)
1. Surovina receptu → nejlevnější aktuální produkt odpovídající obecné surovině (cena za kg).
2. Cena a makra receptu = součet přes suroviny.
3. Výběr kombinace receptů splňující kcal ±5 %, bílkoviny ≥ cíl, tuk ≤ limit, s minimální cenou; střídání receptů.
4. Chybějící surovina v akci → poslední známá cena, označeno jako odhad.
Start: ~30–40 fit receptů v `recipes.json`.

## Chybové stavy
- Scraper selže → zachována stará data, UI ukáže stáří dat.
- Nabídka po `validTo` se skryje.
- Nespárovaná nutrice → produkt se v Fit režimu neukáže, v běžném ano s označením "bez maker".
- Suroviny bez nabídky v generátoru → odhad ceny s označením.

## Testování
Vitest: parser jednotek/balení, pricePerKg, výpočet maker, generátor (splnění cílů, minimalizace ceny). Scraper na fixture. Ruční průchod v mobilním viewportu včetně offline režimu.

## Fáze implementace
1. Scaffold, typy, testy parseru.
2. Scraper + normalizace + cron.
3. Nutriční párování a odvozené metriky.
4. UI Leták (hledání, filtry, Fit režim).
5. Nákupní seznam.
6. Recepty + generátor.
7. Další adaptéry, Nastavení, PWA offline.

## Rizika
- Změna HTML zdroje → izolované adaptéry, fixture testy, záložní data.
- Špatné párování nutrice → zobrazení zdroje a jistoty, overrides.
- Právní stránka scrapingu → jen osobní použití, zdroj vyměnitelný.
