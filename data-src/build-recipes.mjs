// Generates app/public/data/recipes.json from the ingredient catalog and recipe list below.
// Run: node data-src/build-recipes.mjs
// Nutrition is per 100 g of the ingredient as listed (dry weight for rice, pasta, lentils, oats, chickpeas).
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// generic: [keywords, kcal, protein, fat, carbs, fallback Kč/kg]
const CATALOG = {
  'kuřecí prsa': [['kuřecí prsa', 'kuřecí prsní', 'kuřecí řízky'], 110, 23, 1.2, 0, 160],
  'kuřecí stehna': [['kuřecí stehna', 'kuřecí stehno'], 125, 20, 5, 0, 100],
  'krůtí prsa': [['krůtí prsa', 'krůtí prsní'], 105, 24, 1, 0, 200],
  'mleté hovězí': [['mleté hovězí', 'hovězí mleté'], 190, 20, 12, 0, 220],
  'vepřová panenka': [['vepřová panenka'], 120, 21, 3.5, 0, 230],
  'tuňák': [['tuňák'], 110, 25, 1, 0, 400],
  'losos': [['losos'], 200, 20, 13, 0, 400],
  'tvaroh': [['tvaroh'], 70, 13, 0.5, 3.5, 80],
  'skyr': [['skyr'], 63, 11, 0.2, 4, 70],
  'řecký jogurt': [['řecký jogurt'], 130, 5.5, 10, 4, 100],
  'bílý jogurt': [['bílý jogurt', 'jogurt bílý'], 60, 4, 3, 5, 50],
  'cottage': [['cottage'], 98, 11, 4.3, 3.4, 130],
  'vejce': [['vejce'], 143, 12.5, 10, 0.7, 70],
  'mozzarella light': [['mozzarella light', 'mozzarella'], 160, 20, 8, 1, 250],
  'tvrdý sýr': [['eidam', 'gouda', 'tvrdý sýr'], 330, 25, 25, 1, 200],
  'ovesné vločky': [['ovesné vločky'], 370, 13, 7, 60, 40],
  'rýže': [['rýže'], 350, 7, 0.8, 78, 50],
  'těstoviny': [['těstoviny', 'špagety'], 350, 12, 1.5, 72, 50],
  'bulgur': [['bulgur'], 340, 12, 1.5, 68, 60],
  'brambory': [['brambory'], 77, 2, 0.1, 17, 25],
  'celozrnný chléb': [['chléb'], 240, 9, 2.5, 45, 50],
  'čočka': [['čočka'], 350, 25, 1.5, 50, 80],
  'cizrna': [['cizrna'], 360, 20, 6, 50, 90],
  'fazole': [['fazole'], 90, 6, 0.5, 14, 60],
  'kukuřice': [['kukuřice'], 80, 3, 1, 15, 70],
  'tofu': [['tofu'], 120, 13, 7, 2, 150],
  'brokolice': [['brokolice'], 34, 2.8, 0.4, 4, 60],
  'špenát': [['špenát'], 23, 2.9, 0.4, 1, 100],
  'paprika': [['paprika'], 31, 1, 0.3, 6, 80],
  'rajčata': [['rajčata', 'rajče'], 18, 0.9, 0.2, 3.9, 70],
  'okurka': [['okurka'], 15, 0.7, 0.1, 3, 50],
  'mrkev': [['mrkev'], 41, 0.9, 0.2, 9, 30],
  'cibule': [['cibule'], 40, 1.1, 0.1, 9, 25],
  'banán': [['banán'], 90, 1.1, 0.3, 21, 40],
  'jablko': [['jablka', 'jablko'], 52, 0.3, 0.2, 14, 40],
  'olivový olej': [['olivový olej'], 880, 0, 100, 0, 200],
  'arašídové máslo': [['arašídové máslo'], 600, 25, 50, 10, 250],
  'mléko': [['mléko'], 45, 3.4, 1.5, 4.8, 25],
  'mandle': [['mandle'], 580, 21, 50, 10, 400],
  'kuřecí šunka': [['kuřecí šunka', 'krůtí šunka'], 110, 18, 3, 1, 260],
  'treska': [['treska'], 80, 18, 0.7, 0, 250],
  'kuskus': [['kuskus'], 360, 13, 1.5, 72, 70],
  'hrášek': [['hrášek'], 80, 5, 0.4, 14, 70],
};

const S = 'snidane', O = 'obed', V = 'vecere', C = 'svacina';

// [id, name, tags, [[generic, grams], ...], steps]
const RECIPES = [
  ['ovesna-kase-tvaroh-banan', 'Ovesná kaše s tvarohem a banánem', [S], [['ovesné vločky', 80], ['tvaroh', 200], ['banán', 100]],
    ['Vločky zalij horkou vodou a nech 5 minut nabobtnat.', 'Vmíchej tvaroh a přidej nakrájený banán.']],
  ['skyr-vlocky-jablko', 'Skyr s ovesnými vločkami a jablkem', [S, C], [['skyr', 300], ['ovesné vločky', 60], ['jablko', 120]],
    ['Skyr promíchej s vločkami.', 'Přidej nastrouhané nebo nakrájené jablko.']],
  ['michana-vejce-paprika-chleb', 'Míchaná vejce s paprikou a chlebem', [S], [['vejce', 180], ['paprika', 80], ['celozrnný chléb', 100], ['olivový olej', 5]],
    ['Na oleji krátce osmahni papriku.', 'Přidej rozklepnutá vejce a míchej do zpracování.', 'Podávej s chlebem.']],
  ['tvaroh-banan-arasidy', 'Tvaroh s banánem a arašídovým máslem', [S, C], [['tvaroh', 250], ['banán', 100], ['arašídové máslo', 20]],
    ['Tvaroh rozmíchej s lžící arašídového másla.', 'Přidej na kolečka nakrájený banán.']],
  ['omeleta-mozzarella-rajcata', 'Omeleta s mozzarellou a rajčaty', [S], [['vejce', 200], ['mozzarella light', 60], ['rajčata', 100], ['celozrnný chléb', 60]],
    ['Vejce rozšlehej a vylij na pánev.', 'Přidej mozzarellu a rajčata, přehni a dopeč.']],
  ['cottage-chleb-okurka', 'Cottage s okurkou na chlebu', [S, C], [['cottage', 200], ['celozrnný chléb', 100], ['okurka', 100], ['rajčata', 50]],
    ['Chléb potři cottage.', 'Přidej plátky okurky a rajčat.']],
  ['proteinove-palacinky', 'Proteinové palačinky z vloček', [S], [['ovesné vločky', 70], ['vejce', 120], ['banán', 100], ['tvaroh', 120]],
    ['Vločky, vejce a banán rozmixuj na těsto.', 'Peč malé palačinky na suché pánvi.', 'Podávej s tvarohem.']],
  ['recky-jogurt-vlocky', 'Bílý jogurt s vločkami a jablkem', [S, C], [['bílý jogurt', 250], ['ovesné vločky', 60], ['jablko', 120], ['tvaroh', 100]],
    ['Jogurt smíchej s tvarohem.', 'Přisyp vločky a nakrájené jablko.']],

  ['kure-ryze-brokolice', 'Kuřecí prsa s rýží a brokolicí', [O, V], [['kuřecí prsa', 200], ['rýže', 90], ['brokolice', 200], ['olivový olej', 8]],
    ['Rýži uvař podle návodu.', 'Kuřecí maso nakrájej a osmahni na oleji.', 'Brokolici krátce povař a podávej společně.']],
  ['kure-brambory-spenat', 'Kuřecí prsa s bramborami a špenátem', [O, V], [['kuřecí prsa', 200], ['brambory', 300], ['špenát', 150], ['olivový olej', 8]],
    ['Brambory uvař ve slupce.', 'Kuře osmahni a špenát krátce restuj na pánvi.']],
  ['kruti-testoviny-rajcata', 'Krůtí prsa s těstovinami a rajčaty', [O, V], [['krůtí prsa', 180], ['těstoviny', 90], ['rajčata', 200], ['cibule', 40]],
    ['Těstoviny uvař.', 'Krůtí maso s cibulí osmahni, přidej rajčata a podus.', 'Smíchej s těstovinami.']],
  ['bolognese-fit', 'Fit boloňské těstoviny', [O, V], [['mleté hovězí', 150], ['těstoviny', 100], ['rajčata', 250], ['cibule', 50]],
    ['Cibuli a mleté maso osmahni.', 'Přidej rajčata a duš 15 minut.', 'Podávej s uvařenými těstovinami.']],
  ['panenka-brambory-mrkev', 'Vepřová panenka s bramborami a mrkví', [O, V], [['vepřová panenka', 180], ['brambory', 300], ['mrkev', 150], ['olivový olej', 8]],
    ['Panenku nakrájej na medailonky a osmaž.', 'Brambory a mrkev uvař nebo upeč.']],
  ['losos-ryze-brokolice', 'Losos s rýží a brokolicí', [O, V], [['losos', 150], ['rýže', 80], ['brokolice', 200]],
    ['Losos peč 15 minut při 190 °C.', 'Rýži uvař, brokolici povař a podávej.']],
  ['tunak-testoviny-salat', 'Tuňákový těstovinový salát', [O, V], [['tuňák', 140], ['těstoviny', 80], ['kukuřice', 60], ['paprika', 80], ['okurka', 80]],
    ['Těstoviny uvař a nech vychladnout.', 'Smíchej s tuňákem, kukuřicí a nakrájenou zeleninou.']],
  ['cocka-vejce-cibule', 'Čočka s vejcem a cibulí', [O, V], [['čočka', 100], ['vejce', 120], ['cibule', 50], ['olivový olej', 5]],
    ['Čočku uvař doměkka.', 'Cibuli osmahni a vmíchej do čočky.', 'Podávej s uvařeným vejcem.']],
  ['cizrna-kari-ryze', 'Cizrnové kari s rýží', [O, V], [['cizrna', 80], ['rýže', 60], ['rajčata', 150], ['špenát', 100], ['olivový olej', 10]],
    ['Cizrnu předem namoč a uvař.', 'Na oleji osmahni rajčata a špenát, přidej cizrnu a kari koření.', 'Podávej s rýží.']],
  ['tofu-stir-fry', 'Tofu stir-fry s rýží', [O, V], [['tofu', 200], ['rýže', 80], ['paprika', 100], ['brokolice', 150], ['olivový olej', 10]],
    ['Tofu nakrájej a opeč do zlatova.', 'Přidej zeleninu a krátce orestuj.', 'Podávej s rýží.']],
  ['stehna-ryze-paprika', 'Kuřecí stehna s rýží a paprikou', [O, V], [['kuřecí stehna', 250], ['rýže', 80], ['paprika', 150]],
    ['Stehna ochuť a peč 35 minut při 200 °C.', 'Rýži uvař a papriku opeč s masem.']],
  ['kure-syr-brambory', 'Kuřecí prsa zapečená se sýrem', [O, V], [['kuřecí prsa', 200], ['tvrdý sýr', 30], ['brambory', 250], ['rajčata', 100]],
    ['Kuřecí řízky posyp sýrem a rajčaty.', 'Peč 25 minut při 190 °C, podávej s vařenými bramborami.']],
  ['bulgur-kure-zelenina', 'Bulgur s kuřecím a zeleninou', [O, V], [['kuřecí prsa', 180], ['bulgur', 90], ['paprika', 100], ['cibule', 40]],
    ['Bulgur zalij horkou vodou a nech nabobtnat.', 'Kuře se zeleninou osmahni a smíchej s bulgurem.']],
  ['chilli-fazole-hovezi', 'Fazolové chilli s hovězím', [O, V], [['mleté hovězí', 120], ['fazole', 150], ['rajčata', 150], ['cibule', 50], ['kukuřice', 50]],
    ['Cibuli s masem osmahni.', 'Přidej rajčata, fazole a kukuřici a duš 20 minut.']],
  ['testovinovy-salat-kure', 'Těstovinový salát s kuřecím', [O, V], [['kuřecí prsa', 160], ['těstoviny', 80], ['okurka', 100], ['rajčata', 100], ['bílý jogurt', 60]],
    ['Uvař těstoviny a kuře, nech vychladnout.', 'Smíchej se zeleninou a jogurtovou zálivkou.']],
  ['kruti-burger-brambory', 'Krůtí karbanátky s bramborami', [O, V], [['krůtí prsa', 200], ['brambory', 300], ['okurka', 100], ['vejce', 50]],
    ['Krůtí maso umelte, přidej vejce a vytvaruj karbanátky.', 'Opeč a podávej s vařenými bramborami a okurkou.']],
  ['losos-brambory-spenat', 'Losos s bramborami a špenátem', [O, V], [['losos', 150], ['brambory', 250], ['špenát', 150]],
    ['Losos peč 15 minut při 190 °C.', 'Brambory uvař, špenát krátce restuj.']],
  ['cockova-polevka', 'Čočková polévka s vejcem', [O, V], [['čočka', 80], ['mrkev', 100], ['cibule', 50], ['brambory', 100], ['vejce', 60]],
    ['Zeleninu a čočku uvař v litru vody.', 'Rozmixuj nahrubo a podávej s vejcem natvrdo.']],
  ['ryzovy-salat-tunak', 'Rýžový salát s tuňákem', [O, V], [['tuňák', 140], ['rýže', 80], ['kukuřice', 60], ['okurka', 100], ['rajčata', 100]],
    ['Rýži uvař a nech vychladnout.', 'Smíchej s tuňákem a zeleninou.']],
  ['kure-zelenina-pankev', 'Kuřecí prsa se zeleninou na pánvi', [O, V], [['kuřecí prsa', 220], ['paprika', 150], ['brokolice', 200], ['olivový olej', 10], ['brambory', 150]],
    ['Kuře nakrájej a osmahni.', 'Přidej zeleninu a duš 10 minut.']],
  ['kure-rizoto', 'Kuřecí rizoto', [O, V], [['kuřecí prsa', 150], ['rýže', 90], ['paprika', 100], ['tvrdý sýr', 20]],
    ['Maso a papriku osmahni.', 'Přidej rýži, zalij vývarem a duš do změknutí.', 'Posyp sýrem.']],
  ['hovezi-pankev-brambory', 'Hovězí a zeleninová pánev', [O, V], [['mleté hovězí', 150], ['brambory', 300], ['paprika', 100], ['cibule', 40]],
    ['Brambory předvař.', 'Maso s cibulí a paprikou osmahni, přidej brambory a dopeč.']],

  ['tunak-chleb-okurka', 'Tuňák na chlebu s okurkou', [C, V], [['tuňák', 120], ['celozrnný chléb', 80], ['okurka', 80]],
    ['Tuňáka rozmáčkni vidličkou.', 'Namaž na chléb a přidej plátky okurky.']],
  ['skyr-banan', 'Skyr s banánem', [C], [['skyr', 250], ['banán', 120]],
    ['Skyr dej do misky a přidej nakrájený banán.']],
  ['tvaroh-jablko', 'Tvaroh s jablkem a skořicí', [C], [['tvaroh', 250], ['jablko', 150]],
    ['Tvaroh promíchej se strouhaným jablkem a skořicí.']],
  ['vejce-chleb-okurka', 'Vejce natvrdo s chlebem a okurkou', [C, S], [['vejce', 150], ['celozrnný chléb', 80], ['okurka', 100]],
    ['Vejce uvař natvrdo.', 'Podávej s chlebem a okurkou.']],
  ['cottage-paprika', 'Cottage s paprikou', [C], [['cottage', 250], ['paprika', 100], ['celozrnný chléb', 50]],
    ['Cottage ochuť solí a pepřem.', 'Podávej s plátky papriky a chlebem.']],

  // ---- more breakfasts ----
  ['ovesna-kase-arasidy-banan', 'Ovesná kaše s mlékem, banánem a arašídovým máslem', [S], [['ovesné vločky', 70], ['mléko', 200], ['banán', 100], ['arašídové máslo', 15]],
    ['Vločky uvař v mléce do zhoustnutí.', 'Přidej banán a lžičku arašídového másla.']],
  ['tvarohove-livance', 'Tvarohové lívance s jablkem', [S], [['tvaroh', 200], ['vejce', 100], ['ovesné vločky', 50], ['jablko', 100]],
    ['Tvaroh, vejce a rozmixované vločky promíchej na těsto.', 'Peč malé lívance na suché pánvi a podávej s jablkem.']],
  ['toast-vejce-mozzarella', 'Toast s vejcem a mozzarellou', [S], [['celozrnný chléb', 100], ['vejce', 120], ['mozzarella light', 40], ['rajčata', 80]],
    ['Chléb opeč, na pánvi udělej volské oko.', 'Přidej mozzarellu a plátky rajčat.']],
  ['skyr-mandle-banan', 'Skyr s mandlemi, banánem a vločkami', [S], [['skyr', 250], ['mandle', 15], ['banán', 100], ['ovesné vločky', 40]],
    ['Skyr dej do misky, přisyp vločky a nasekané mandle.', 'Přidej na kolečka nakrájený banán.']],
  ['omeleta-sunka-paprika', 'Omeleta se šunkou a paprikou', [S], [['vejce', 180], ['kuřecí šunka', 60], ['paprika', 80], ['celozrnný chléb', 60]],
    ['Vejce rozšlehej, vylij na pánev a přidej šunku s paprikou.', 'Podávej s chlebem.']],

  // ---- more snacks ----
  ['recky-jogurt-mandle-jablko', 'Řecký jogurt s jablkem a mandlemi', [C], [['řecký jogurt', 150], ['jablko', 100], ['mandle', 15]],
    ['Jogurt přelij nastrouhaným jablkem a posyp mandlemi.']],
  ['tvaroh-arasidove-maslo-chleb', 'Chléb s tvarohem a arašídovým máslem', [C], [['tvaroh', 150], ['arašídové máslo', 15], ['celozrnný chléb', 50]],
    ['Chléb potři tvarohem a arašídovým máslem.']],
  ['sendvic-sunka-okurka', 'Sendvič se šunkou a okurkou', [C], [['celozrnný chléb', 80], ['kuřecí šunka', 60], ['okurka', 80]],
    ['Chléb obloz šunkou a plátky okurky.']],
  ['cottage-rajcata', 'Cottage s rajčaty na chlebu', [C], [['cottage', 200], ['rajčata', 100], ['celozrnný chléb', 40]],
    ['Cottage nandej na chléb a přidej rajčata.']],
  ['skyr-jablko-arasidy', 'Skyr s jablkem a arašídovým máslem', [C], [['skyr', 150], ['jablko', 150], ['arašídové máslo', 10]],
    ['Skyr promíchej s arašídovým máslem a podávej s jablkem.']],
  ['tunak-kukurice-chleb', 'Tuňák s kukuřicí na chlebu', [C], [['tuňák', 100], ['kukuřice', 60], ['celozrnný chléb', 50]],
    ['Tuňáka smíchej s kukuřicí a namaž na chléb.']],
  ['vejce-rajcata-mozzarella', 'Vejce s rajčaty a mozzarellou', [C], [['vejce', 100], ['mozzarella light', 50], ['rajčata', 100]],
    ['Vejce uvař natvrdo, nakrájej a podávej s mozzarellou a rajčaty.']],

  // ---- more main courses ----
  ['treska-brambory-hrasek', 'Pečená treska s bramborami a hráškem', [O, V], [['treska', 180], ['brambory', 300], ['hrášek', 100], ['olivový olej', 8]],
    ['Tresku peč 15 minut při 190 °C.', 'Brambory uvař a hrášek krátce povař.']],
  ['kruti-kari-ryze', 'Krůtí kari s rýží', [O, V], [['krůtí prsa', 180], ['rýže', 80], ['rajčata', 150], ['cibule', 40]],
    ['Krůtí maso nakrájej a osmahni s cibulí.', 'Přidej rajčata a kari koření, duš 15 minut a podávej s rýží.']],
  ['kuskus-kure-zelenina', 'Kuřecí prsa s kuskusem a zeleninou', [O, V], [['kuřecí prsa', 180], ['kuskus', 80], ['paprika', 100], ['rajčata', 100]],
    ['Kuskus zalij horkou vodou a nech nabobtnat.', 'Kuře s paprikou osmahni a smíchej s kuskusem.']],
  ['tofu-testoviny-spenat', 'Těstoviny s tofu a špenátem', [O, V], [['tofu', 180], ['těstoviny', 90], ['špenát', 150], ['olivový olej', 8]],
    ['Těstoviny uvař.', 'Tofu opeč, přidej špenát a smíchej s těstovinami.']],
  ['losos-bulgur-brokolice', 'Losos s bulgurem a brokolicí', [O, V], [['losos', 140], ['bulgur', 80], ['brokolice', 200]],
    ['Losos peč 15 minut při 190 °C.', 'Bulgur zalij horkou vodou a brokolici povař.']],
  ['hovezi-ryze-paprika', 'Hovězí s rýží a paprikou', [O, V], [['mleté hovězí', 130], ['rýže', 80], ['paprika', 150], ['cibule', 40]],
    ['Maso s cibulí osmahni, přidej papriku a duš do měkka.', 'Podávej s uvařenou rýží.']],
  ['kure-cocka-zelenina', 'Kuře s čočkou a mrkví', [O, V], [['kuřecí prsa', 180], ['čočka', 70], ['mrkev', 100], ['cibule', 40]],
    ['Čočku uvař doměkka.', 'Kuře s cibulí a mrkví osmahni a smíchej s čočkou.']],
  ['fazolove-chilli-kruti', 'Fazolové chilli s krůtím masem', [O, V], [['krůtí prsa', 150], ['fazole', 150], ['rajčata', 150], ['kukuřice', 50]],
    ['Krůtí maso osmahni.', 'Přidej rajčata, fazole a kukuřici a duš 20 minut.']],
];

const catalog = (generic) => {
  const c = CATALOG[generic];
  if (!c) throw new Error(`Unknown ingredient: ${generic}`);
  return c;
};

const recipes = RECIPES.map(([id, name, tags, items, steps]) => ({
  id,
  name,
  steps,
  tags,
  ingredients: items.map(([generic, grams]) => {
    const [keywords, kcal, protein, fat, carbs, fallbackPricePerKg] = catalog(generic);
    return { generic, keywords, grams, per100g: { kcal, protein, fat, carbs }, fallbackPricePerKg };
  }),
}));

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../app/public/data/recipes.json');
writeFileSync(out, JSON.stringify(recipes, null, 1));
console.log(`${recipes.length} recipes -> ${out}`);
