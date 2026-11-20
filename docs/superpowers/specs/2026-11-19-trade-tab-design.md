# Tab "Trade" (merci commerciali) — design

Data: 2026-11-19 · Stato: **bozza da approvare** · Si appoggia a `2026-11-18-archeage-farm-tracker-design.md` (il tracker esistente).

## 1. Intento e perché
Il giocatore sceglie un oggetto da craftare e il tracker gli dice già quali materiali farmare. In ArcheAge Chronicles molti materiali lavorati (Standard/Fine/Superior Ingot, Additive, Textile, Lumber, Leather, Archeum, Stone) si possono anche **ottenere con i trade goods**: si crafta una cassa in un avamposto commerciale, la si consegna a un altro avamposto e si ricevono materiali. Con la tab **Trade** l'utente vede, per l'oggetto scelto, *cosa conviene prendere con il commercio, dove consegnare, quante casse, quanti viaggi e quanti giorni*, invece di farmare tutto a mano. Chi lo usa: l'autore e i suoi amici, che giocano e hanno già il tracker aperto.

Successo = per il Gyldenlord's Cleaver la tab dice "Standard Ingot ×810 → Water Drift: N casse, M viaggi, D giorni, G gold di crafting, K materiali da mettere nelle casse", e dopo qualche consegna registrata i numeri riflettono i rapporti reali dell'utente.

## 2. Obiettivi, non obiettivi, anti-obiettivi
**Obiettivi**
- Per ogni materiale necessario che si può ottenere col commercio: avamposto di destinazione, casse, viaggi, giorni, gold di crafting delle casse, materiali di partenza.
- Elenco separato dei materiali **non commerciabili** (ossa, in pratica) con la scritta "da farmare".
- **Registro consegne**: l'utente annota casse consegnate, materiali messi, materiali ricevuti; il tool ricava da solo il rapporto reale di quella rotta e lo usa nei calcoli.
- Funziona anche nel file unico offline, come il resto.

**Non obiettivi (per ora)**
- Ottimizzatore che sceglie cosa convertire in base alle scorte dell'utente (serve un inventario).
- Rischio PvP, tempi di percorso, prezzi di mercato, profitto in gold.
- Le ~280 combinazioni merce/avamposto del gioco: si parte dalle famiglie di materiali.
- Le merci speciali (semi come l'anguria, pietre di tempra, oro): ci si può tornare dopo, con una seconda tabella di "ricompense speciali" per avamposto.

**Anti-obiettivo**: mostrare numeri che sembrano precisi ma sono ipotesi. Ogni rapporto va etichettato "stima" oppure "dal tuo registro (n consegne)".

## 3. Regole del gioco (fonte: 3 video + schermate di Watcher's, 2026-11-19)
Confermate:
- 6 avamposti, ognuno con una famiglia di materiali **e un seme speciale** (dati dell'utente, in gioco, 2026-11-19):

  | Avamposto | Materiali | Seme / merce speciale |
  |---|---|---|
  | Seaglass Harbor | lumber | anguria (watermelon) |
  | Watcher's Trading Post | additive | zucca (pumpkin) |
  | Jubilant Village | leather | corn seedling |
  | Water Drift | ingot | cabbage |
  | Stargazer Village | textile | wheat seedling |
  | Shadow Path Temple | **archeum e stone** (due famiglie) | melon seedling |

  La **pietra** si ottiene solo a Shadow Path e rende **meno di 1:1** (video: 30 → circa 25–27, cioè circa 0,83–0,9×). Per questo il rapporto si calcola per **famiglia + livello**, non per avamposto.
- **Ogni avamposto accetta qualsiasi materiale e restituisce solo la propria famiglia.** Il **livello** (standard/fine/superior) della ricompensa è quello della cassa. (Verificato: Fine Lumber → Fine Additive e Standard Archeum → Standard Additive a Watcher's.)
- Una cassa richiede materiali dello stesso livello + 1 `blank-trade-certificate` + gold. Osservato a Watcher's: Standard **9** materiali / **80** gold; Fine **3** / **200**; Superior **1** / **1.000** (bloccata dal grado "Agente anziano"). Il certificato ha 1 giorno di tempo per la consegna.
- **7 casse per viaggio** al massimo. **Tetto di 10 casse craftate** insieme (contano anche quelle ancora nell'avamposto).
- **6 viaggi al giorno**: 3 in pace (PvE) + 3 in conflitto (PvP). Reset alle 5:00. Un viaggio va a una sola destinazione.
- Il rapporto ricevuti/messi **non è 1:1 e dipende dal livello** (e dalla rotta e dal mercato). Osservazioni: Standard 9→11 (circa 1,22×) e 63→80 (circa 1,27×); Fine 21→23 (circa 1,10×).
- Le ossa non si ottengono col commercio.
- Oltre alle casse di materiali ci sono **merci speciali** (casse di erbe, sacchi, botti, pietre di tempra, ecc.) che danno altro: oro, semi, pietre. Esempi: Seaglass Harbor dà **legno** (la sua famiglia) e **anguria** (semi, dalle merci speciali; segnalazione dell'utente, 2026-11-19); una guida riporta "Diamond Shores Herb Box → Watermelon Seedling". Sono **fuori ambito** nella prima versione (vedi non obiettivi): la tab calcola solo le casse di materiali.

## 4. Approcci considerati
1. **Dove**: (A) nuova tab in `index.html` ← **scelta dall'utente**; (B) pagina separata — scartata: va a copiare il calcolo e rompe il file unico offline.
2. **Profondità**: (Semplice) per materiale necessario calcola casse/viaggi/giorni/gold ← **mia scelta** (l'utente ha risposto "A"; correggibile); (Ottimizzatore) sceglie cosa convertire in base alle scorte — rimandato, richiede inventario e molto più lavoro.
3. **Rapporti**: tabella fissa vs **registro consegne** ← **scelto dall'utente**: i rapporti partono da stime e si aggiornano con le consegne reali.

## 5. Come funziona
**Dati** — nuovo file `data/trade.json`, scritto a mano (non viene da MetaForge), scaricato come `overrides.json` (404 = valori di default nel codice; in cache per l'offline; incorporato nel file offline):
```json
{
  "posts": { "watchers": { "name": "Watcher's Trading Post", "families": ["additive"], "seed": "pumpkin" }, "...": {} },
  "packs": { "standard": { "input": 9, "gold": 80 }, "fine": { "input": 3, "gold": 200 }, "superior": { "input": 1, "gold": 1000 } },
  "ratios": { "default": { "standard": 1.22, "fine": 1.1, "superior": null }, "byFamily": { "stone": { "standard": 0.9 } } },
  "limits": { "perTrip": 7, "craftedCap": 10, "tripsPerDay": { "peace": 3, "conflict": 3 } }
}
```
Ogni avamposto ha `families` (un elenco: Shadow Path Temple ne ha due, `archeum` e `stone`).

Gli id degli oggetti seguono le regole dei dati: `<livello>-<famiglia>` con livello `standard|fine|superior` e famiglia commerciabile `additive|archeum|ingot|leather|lumber|stone|textile` (`*-bonecraft` esiste ma **non è commerciabile**); il certificato è `blank-trade-certificate`. Il collegamento id→(avamposto, livello) si ricava da questa regola, non da una tabella a mano.

**Calcolo** (funzioni pure nel blocco `core`, testate in Node):
- `effectiveRatio(trade, deliveries, family, tier)`: media ponderata `ricevuti/messi` delle ultime 5 consegne di quella coppia famiglia+livello (l'avamposto è dedotto dalla famiglia); senza consegne usa `trade.ratios.byFamily[family][tier]` se esiste, altrimenti `trade.ratios.default[tier]`; restituisce anche `{source: 'estimate'|'log', n}`.
- `tradePlan(trade, steps, deliveries, opts)` (non serve `items`: basta l'id del passo): per ogni passo di `computeNeeds` il cui id è commerciabile e con `times > 0`: unità mancanti `U = need − covered`; casse `P = ceil(U / (ratio × input))`; materiali da mettere `P × input`; gold `P × gold`; viaggi `ceil(P / 7)` **per destinazione**; giorni `ceil(viaggi / tripsPerDay)` con `tripsPerDay` = 3 (solo pace) o 6 (pace + conflict), scelto dall'utente. Se il livello è superior e la cassa richiede un grado, avviso informativo. Passi non commerciabili → elenco "da farmare".
- Se `ratio` è `null` (superior senza dati) il passo mostra "dato mancante: registra una consegna" invece di un numero.

**Progressi** — il registro vive nell'oggetto progress, come campo opzionale `deliveries: [{family, tier, packs, input, received, at}]`; `parseProgress`/`reconcile`/export/import lo conservano (default `[]`, voci non valide scartate, numeri interi ≥ 0). Così Esporta/Importa resta uno solo.

## 6. Schermata (bozza)
```
[ Crafting | Trade ]                      Viaggi al giorno: (3) (6)

Water Drift — lingotti
  Standard Ingot ×810   71 casse · 11 viaggi · 2 giorni · 5.680 gold · 639 materiali standard   [stima 1,22×]
Watcher's — additivi
  Standard Additive ×2.106 ...                                                         [dal tuo registro, 3 consegne]
Non commerciabili (da farmare): Standard Bonecraft ×729

Registro consegne
  Materiale ricevuto [Additive v]  Livello [Fine v]  Casse [7]  Messi [21]  Ricevuti [23]  [Aggiungi]
  Additive (Watcher's) · Fine: 21 → 23 (1,10×)   ✕
```
La tab usa gli stessi obiettivi della colonna di sinistra. Testi in EN/IT con test di parità; nomi degli avamposti in inglese come gli oggetti.

## 7. Vincoli
Un solo `index.html`, JS senza build; logica pura nel blocco `core` con test `node:test`; il repo pubblico resta "solo codice" (`trade.json` contiene solo osservazioni dell'autore, nessun dato MetaForge); autore dei commit noreply; push solo su richiesta; interfaccia in inglese di base, italiano selezionabile; layout che regge a 380 px.

## 8. Lasciato al costruttore / dati da verificare
- ~~Famiglia di Shadow Path Temple~~: risolto, sono `archeum` **e** `stone` (l'utente, in gioco). Il rapporto della pietra (circa 0,9×) è una stima dal video, da correggere col registro.
- `input`/`gold` per Seaglass, Jubilant, Water Drift, Stargazer, Shadow Path: assunti uguali a Watcher's (confermati solo per standard 9 a Seaglass e Shadow Path nei video).
- Rapporto superior: nessun dato, parte `null`.
- Come incorporare `trade.json` nel file offline (`scraper/offline.mjs` incorpora già dati e override).
- Dove mettere il selettore delle tab (colonna centrale) e il layout esatto.
