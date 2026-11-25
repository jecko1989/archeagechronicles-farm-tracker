# ArcheAge Chronicles Farm Tracker

[English](README.md) · **Italiano**

Scegli gli oggetti che vuoi craftare in **ArcheAge Chronicles** e scopri quali materiali devi farmare. Il tool scende lungo l'albero delle ricette fino ai materiali grezzi, li raggruppa, ti dice in che ordine craftare ogni passo (con professione, livello e stazione) e calcola il costo totale in gold. Tu segni quanti materiali hai già e vedi cosa manca.

> **Dati:** i dati degli oggetti (`data/items.json`) vengono da [MetaForge](https://metaforge.app/archeage-chronicles/database) e sono pubblicati qui con il via libera del loro team (hanno detto di essere contenti che vengano usati per far partire il tool e hanno chiesto un credito, che c'è qui e nel piè di pagina della pagina). Stanno valutando delle API per gli sviluppatori; se chiederanno di togliere o cambiare i dati, lo si farà. L'aggiornamento automatico è disattivato per ora: i dati si aggiornano lanciando lo scraper a mano (vedi sotto).

## Come si usa
1. **Scegli cosa craftare.** Sfoglia le sezioni (Armi, Armature, Accessori, …) e i tipi, oppure scrivi per filtrare la lista. La lista è ordinata per rarità, dalla più scarsa alla più forte (Common → Uncommon → Rare → Epic → Legendary), e in ordine alfabetico dentro ogni rarità. Clicca un oggetto per aggiungerlo, oppure premi Invio per aggiungere il primo della lista.
   **Passa il mouse su un oggetto della lista o della tua selezione, o sull'icona di un materiale o di un passo di crafting,** (o selezionalo con la tastiera, o toccalo su uno schermo touch) per vederne i dettagli come su MetaForge: livello, slot, set, peso, durabilità, prezzo di vendita, statistiche, opzioni casuali, descrizione e ricetta di crafting. Per i materiali grezzi il tooltip dice anche **dove si trova** (chi lo droppa, mercanti, bauli), quando MetaForge ha l'informazione.
2. **Leggi i materiali** da farmare. Subito sotto il titolo c'è l'elenco di cosa serve direttamente all'oggetto (per esempio *5 × Superior Ingot, 5 × Superior Archeum, 10 × Void Heart…*); sotto, l'elenco completo dei materiali grezzi: *Servono / Hai / Mancano*. Con i pulsanti −/+ segni quanti ne hai già. Clicca su un materiale (o su un passo di crafting) per aprire la sua pagina su MetaForge in una nuova scheda, per esempio per vedere dove si trova. Scrivi un prezzo nella colonna **Gold cad.** per aggiungere al totale quanto spenderesti per comprare i materiali che mancano (vuoto = li farmi tu, 0 gold); i prezzi si salvano insieme ai progressi.
3. **Segui i passi di crafting** dall'alto in basso: sono numerati e divisi in fasi, dagli oggetti più basilari (solo materiali grezzi) fino all'oggetto che vuoi craftare. **Hai già alcuni oggetti lavorati** (per esempio Standard o Superior Archeum, Ingot, Additive)? Scrivi quanti a destra di ogni passo (o usa −/+): servono meno craft, i materiali grezzi qui sopra e il costo totale in gold scendono di conseguenza, e un passo completamente coperto mostra ✓. Oppure spunta la casella a sinistra di un passo per segnarlo come fatto (equivale ad averlo tutto; togli la spunta per annullare): sopra ai passi c'è il conteggio di quanti sono fatti. Possedere un oggetto copre anche tutto ciò che sta sotto: i passi che servivano solo a quello non richiedono più materiali grezzi.
4. **Tab Commercio** (accanto a Crafting): per i materiali che si possono ottenere anche con i trade goods (Ingot, Additive, Textile, Leather, Lumber, Archeum, Stone, nei livelli Standard / Fine / Superior) dice dove consegnare, quante casse, quanti viaggi e giorni servono e il gold di crafting. Ogni rapporto è etichettato *stima* finché non annoti consegne vere nel **registro consegne** (casse, materiali messi, materiali ricevuti): da lì il rapporto viene dalle tue ultime 5 consegne. In cima c'è il **Piano consigliato**: per ogni materiale commerciabile dice se conviene **craftarlo** o **prenderlo col commercio**, con un interruttore sull'obiettivo: **Farmare meno** (meno grezzi) o **Gold spesi** (meno gold di craft e di casse, più il prezzo dei materiali che devi ancora comprare, se ne hai impostati in Crafting; senza prezzi funziona come prima). Guarda l'intero albero delle ricette, quindi un materiale che serve solo a farne un altro non viene contato due volte, e non consiglia mai un piano peggiore del solo craft (mostra i due risultati affiancati). Il materiale da mettere nelle casse lo sceglie il tool: il più economico di una famiglia diversa. Le decisioni usano i rapporti *stima* finché non registri consegne vere. Le ossa non si commerciano e restano nell'elenco "da farmare".
   **Condividere una selezione:** la barra dell'indirizzo mostra sempre cosa hai scelto e la tab aperta, per esempio `…/index.html#craft/cultist-hood:2,cultist-robe` (`#trade/…` apre la tab Commercio). Copiala, oppure incollane una nella barra: sostituisce la selezione attuale (progressi e prezzi non vengono toccati). Gli oggetti sconosciuti si ignorano.
5. L'interfaccia è in inglese di base; il pulsante **IT** in alto a destra la passa in italiano (la scelta resta salvata). I nomi degli oggetti sono sempre quelli inglesi di MetaForge.
6. **Piani salvati** (in fondo alla pagina): scrivi un nome e premi *Salva questo* per conservare oggetti, quantità possedute e prezzi come piano; *Carica* lo riporta (sostituisce quello che hai ora, il registro consegne è condiviso da tutti i piani) e salvare con un nome già usato sostituisce quel piano.
7. I progressi (registro consegne compreso) restano nel tuo browser. **Esporta/Importa** per spostarli su un altro dispositivo.

Funziona anche da file locale: scarica `index.html` e aprilo. I dati vengono sempre letti da questa repo (`data/`), quindi restano aggiornati senza riscaricare nulla. Dopo il primo caricamento l'ultima versione resta in cache e la pagina funziona anche offline.

### File unico offline
`node scraper/build-offline.mjs` crea `dist/farm-tracker-offline.html`: un unico file con i dati incorporati, che funziona con un doppio clic (senza server e senza internet; solo le icone degli oggetti hanno bisogno di connessione). Servono `data/items.json` e `data/meta.json` sul tuo computer, e `dist/` è escluso da git. Il file contiene dati di MetaForge: non ripubblicarlo senza il loro permesso.

## Come restano aggiornati i dati
Uno scraper (`scraper/`, Node 20 + Playwright) legge il database di [MetaForge](https://metaforge.app/archeage-chronicles/database) e rigenera `data/items.json` e `data/meta.json`. Copre armi, armature, accessori, borse, glider, consumabili, materiali, strumenti e Housing; di Housing prende solo case, annessi e postazioni (gli oggetti che si craftano con Ingegneria), non gli arredi. Una GitHub Action (`.github/workflows/scrape.yml`) lo esegue a richiesta dal tab *Actions* e committa solo se qualcosa è cambiato; la pianificazione settimanale (ogni lunedì) è pronta ma **disattivata** per ora (MetaForge sta valutando delle API per gli sviluppatori). Se le guardie di controllo falliscono (troppi oggetti in meno, ingredienti sconosciuti, ricette vuote) non scrive nulla e l'Action risulta in errore.

Per rigenerare i dati a mano:
```
npm --prefix scraper ci
npx --prefix scraper playwright install chromium   # oppure PW_CHANNEL=msedge per usare Edge
node scraper/run.mjs
```

### Correzioni manuali: `data/overrides.json`
Se una patch cambia le ricette prima che MetaForge aggiorni il database, si possono correggere a mano senza rifare lo scraping. La pagina scarica `overrides.json` a ogni apertura e lo applica sopra i dati (i passi corretti hanno il segnalino **patch**). Si può modificare direttamente dal sito di GitHub.
```json
{
  "standard-bonecraft": {
    "note": "Patch notes 2026-11-25",
    "ingredients": [{ "id": "bone-chip", "qty": 6 }]
  }
}
```
Campi ammessi (tutti riferiti alla prima ricetta): `ingredients` (sostituisce la lista), `gold`, `yield`, `note`. Una correzione non valida viene ignorata. Quando MetaForge si aggiorna, la voce va tolta.

Il file attuale contiene 2 ricette cambiate dalle patch notes di oggetti/trade di novembre 2026: Standard Leather (Raw Pelt 15 → 6) e Standard Bonecraft (Bone Chip 15 → 6). Vengono dalle patch notes e **non sono ancora verificate in gioco**; vanno tolte quando MetaForge si aggiorna. Le 15 ricette di materiali lavorati della patch del 17 novembre 2026 (tolti Sweetgrass Powder e loot dei mostri, confermate in gioco) sono state tolte da questo file il 25 novembre 2026, perché i dati di MetaForge le riportano già.

### Dati del commercio: `data/trade.json`
Scritto a mano (non viene da MetaForge): i sei avamposti con ciò che danno (`families`, più un `seed` speciale), la ricetta delle casse per livello (materiali e gold per cassa), i rapporti stimati ricevuti/messi e i limiti (7 casse per viaggio, 3 viaggi in pace + 3 in conflitto al giorno). La pagina lo scarica a ogni apertura; se manca o è rotto, la tab Commercio mostra "Dati del commercio non disponibili" e il resto funziona. Per correggere un valore basta modificare il file su GitHub. Un rapporto `null` significa "nessun dato".
```json
{
  "posts": { "watchers": { "name": "Watcher's Trading Post", "families": ["additive"], "seed": "pumpkin" } },
  "packs": { "standard": { "input": 9, "gold": 80 }, "fine": { "input": 3, "gold": 200 }, "superior": { "input": 1, "gold": 1000 } },
  "ratios": { "default": { "standard": 1.22, "fine": 1.1, "superior": null }, "byFamily": { "stone": { "standard": 0.9 } } },
  "limits": { "perTrip": 7, "craftedCap": 10, "tripsPerDay": { "peace": 3, "conflict": 3 } }
}
```

### Formato di `data/items.json`
```json
{
  "cultist-hood": {
    "name": "Cultist Hood", "category": "armor", "rarity": "Uncommon", "type": "Cloth", "icon": "UI_Item_….webp",
    "info": {
      "rows": [["Item Level", "10"], ["Slot", "Helmet"], ["Weight", "3.045"], ["Sell Price", "50 Gold"]],
      "stats": [["Physical DEF", "12"], ["Magic DEF", "23"]],
      "random": [["SP Regen", "5-6"]],
      "description": "A hood crafted using techniques…"
    },
    "crafts": [{
      "profession": "Tailoring", "level": 1, "stations": ["Armor Workbench", "Light Armor Workbench"], "gold": 3000,
      "ingredients": [{ "id": "standard-textile", "qty": 2 }, { "id": "rag-scrap", "qty": 20 }]
    }]
  }
}
```
`info` (dati del tooltip, con i valori "Untempered") c'è per gli oggetti craftabili ed è facoltativo; i materiali grezzi possono avere `info.where`, la frase "Where to Get" di MetaForge (assente se la pagina non la riporta, per esempio i materiali raccolti). `crafts` vuoto = materiale grezzo. `yield` (opzionale, default 1) indica quanti pezzi produce un craft.

## Sviluppo
```
node --test 'tests/*.test.js' 'scraper/tests/*.test.mjs'
```
I test del parser usano pagine di esempio di MetaForge che **non sono incluse** nella repo (sono copie delle loro pagine): `PW_CHANNEL=msedge node scraper/capture-fixtures.mjs` le scarica; senza, quei test vengono saltati.

`index.html` è l'intera app (nessun build). La logica pura sta nel blocco `<script id="core">`, testato in Node. Checklist manuale dell'interfaccia: `tests/ui-checklist.md`. Design e piano (in italiano): `docs/superpowers/`.

## Crediti e note
- Dati raccolti da [MetaForge](https://metaforge.app/archeage-chronicles/database): ringraziamenti ai loro curatori. Le immagini **non sono copiate in questa repo**: `items.json` contiene solo il nome del file di ogni icona e la pagina la carica direttamente da `static.metaforge.app` (se non si carica, viene nascosta).
- ArcheAge Chronicles e i suoi contenuti appartengono ai rispettivi proprietari. Progetto amatoriale, **non affiliato** agli sviluppatori del gioco né a MetaForge.
- Il codice è sotto licenza MIT (vedi `LICENSE`). I dati restano di proprietà dei rispettivi titolari.
