# ArcheAge Chronicles Farm Tracker — Design

Data: 2026-11-18 · Stato: **approvato dall'utente** (2026-11-18) · Repo: `jecko1989/archeagechronicles-farm-tracker`

## Intento
Un giocatore sceglie cosa vuole craftare (armi, armature, accessori, borse, glider, consumabili). Il tool calcola quali **materiali grezzi** deve farmare, divisi per professione, e gli fa segnare quanti ne ha già raccolti. Obiettivo: sapere sempre "cosa mi manca" senza rifare i conti a mano.

Il gioco riceve patch che cambiano oggetti e ricette. Per questo la pagina è fissa e i **dati vivono in una repo GitHub personale dell'utente**, aggiornati da uno scraper. Chiunque usi il tool vede sempre i dati aggiornati senza scaricare nulla di nuovo.

## Goals
- Pagina HTML unica, senza build e senza dipendenze, apribile anche da file locale.
- Dati caricati da `data/*.json` della repo, con cache locale per l'uso offline.
- Scraper rieseguibile (a mano o con GitHub Actions) che rigenera i dati da MetaForge.
- Calcolo corretto dell'albero ricette fino ai materiali grezzi.
- Progressi dell'utente salvati nel browser, con export/import.

## Non-goals
- Eseguibile (.exe), Tauri o Electron. Si può impacchettare in futuro.
- Account, sync tra dispositivi, backend.
- Prezzi, mappe, dove droppano i materiali, tempering, lunastone.
- Traduzioni: nomi in inglese come su MetaForge.

## Anti-goals (fallimento anche se "funziona")
- Totali sbagliati in silenzio dopo un cambio di layout di MetaForge: lo scraper deve **fallire rumorosamente** e non committare dati corrotti.
- Dati vecchi mostrati senza dirlo: la pagina mostra sempre la data dell'ultimo aggiornamento dei dati.

## Approcci considerati
- **A. GitHub Pages + Action settimanale (scelto dall'utente).** Pagina e dati nella stessa repo; l'Action rigenera `data/` e committa.
- B. Solo `index.html` + dati su raw.githubusercontent.com, scraper a mano. Sottoinsieme di A.
- C. Eseguibile. Scartato: la pagina legge già i dati dalla repo, un exe aggiunge solo peso.

## Struttura della repo (scelta mia)
```
index.html              # tutta l'app (HTML+CSS+JS)
data/items.json         # oggetti e materiali
data/meta.json          # updatedAt, numero oggetti, versione schema
scraper/                # Node 20 + Playwright
.github/workflows/scrape.yml
README.md               # link alla pagina, crediti a MetaForge
```

## Dati
`items.json`: mappa `slug -> oggetto`. Lo slug è quello dell'URL MetaForge (es. `cultist-hood`).
```json
{
  "cultist-hood": {
    "name": "Cultist Hood", "category": "armor", "rarity": "Uncommon",
    "crafts": [{
      "profession": "Tailoring", "level": 1,
      "stations": ["Armor Workbench", "Light Armor Workbench"],
      "gold": 3000,
      "ingredients": [{"id":"standard-textile","qty":2},{"id":"rag-scrap","qty":20}]
    }]
  },
  "rag-scrap": { "name": "Rag Scrap", "category": "materials", "rarity": "Common", "crafts": [] }
}
```
- Un materiale con `crafts` vuoto è **grezzo**. Con `crafts` pieno è un **intermedio** (es. Standard Textile, Atelier, Cloth 1).
- `crafts` è una lista: la pagina oggetto può avere più modi di crearlo (da verificare sulle pagine reali; vedi Aperto).
- Ogni `id` negli ingredienti deve esistere in `items.json`; lo scraper lo verifica.

## Scraper (scelte mie)
- Parte dalle pagine di elenco per categoria (`/database/<categoria>/page/N`; weapons, armor, accessories, bags, gliders, consumables, materials, tools). Non esiste una sitemap per ArcheAge (verificato: 404).
- Apre ogni pagina oggetto e legge la sezione "How to Craft": professione + livello, stazioni, costo in gold, ingredienti. Le pagine `/recipes/...` sono solo le pergamene che insegnano la ricetta e vanno ignorate.
- Segue gli ingredienti non ancora noti finché non restano id sconosciuti.
- `robots.txt` di MetaForge consente il crawl (`Allow: /`). Rate limit ~1 richiesta/secondo, User-Agent identificabile.
- Output ordinato e deterministico, così i diff in git mostrano solo i cambiamenti veri.
- **Guardie prima di scrivere:** numero oggetti non inferiore all'80% del precedente, nessun ingrediente con id sconosciuto, nessuna ricetta senza ingredienti. Se una guardia fallisce, l'Action termina in errore e non committa.
- Action: cron settimanale (lunedì) più avvio manuale; commit solo se `data/` è cambiata.

## Pagina
- JS vanilla in un solo file, nessun framework. Costante `DATA_BASE_URL` in cima al file, default `https://raw.githubusercontent.com/<utente>/<repo>/main/data/`. Quando la pagina è servita da Pages usa il percorso relativo.
- All'avvio: scarica `meta.json`; se `updatedAt` è più recente della cache, scarica `items.json`. Cache in `localStorage`/IndexedDB. Offline usa la cache e lo dice.
- **Obiettivi:** cerca un oggetto per nome, aggiungilo con quantità.
- **Calcolo:** espande ricorsivamente ogni obiettivo fino ai materiali grezzi, con rilevamento dei cicli. Interruttore "Intermedi": come cosa da craftare (default) oppure come materiale da farmare.
- **Lista materiali** raggruppata per professione/tipo: necessari, posseduti (contatore +/−/campo), mancanti. Barra di avanzamento e riga "tutto raccolto".
- **Passi di crafting** (professione, livello richiesto, stazione) per gli intermedi e gli obiettivi.
- **Costo in gold totale** dei craft.
- **Progressi:** `localStorage`, con pulsanti Esporta/Importa JSON.
- Solo tema scuro, nello stile del database di MetaForge (aggiornato su richiesta dell'utente il 2026-11-18; prima era scuro e chiaro). Layout a due colonne, utilizzabile anche su schermo stretto (secondo monitor o telefono mentre si gioca).
- **Icone** (aggiunto su richiesta dell'utente il 2026-11-18, cambia l'anti-goal "non copiare le immagini"): `items.json` ha `icon` (solo nome file, preso dalle pagine di elenco); la pagina carica l'immagine da `ICON_BASE = https://static.metaforge.app/archeage-chronicles/icons/` con `loading="lazy"` e la nasconde se non si carica. Nessuna immagine nella repo. Va detto a MetaForge nella mail di richiesta permesso.
- **Selettore oggetti** (aggiunto su richiesta dell'utente il 2026-11-18): chip per sezione (Armi, Armature, …) con conteggi, chip per tipo dentro la sezione, campo di filtro che restringe la lista mentre si scrive, Invio aggiunge il primo candidato.
- Footer con crediti e link a MetaForge e data dell'ultimo aggiornamento.

## Verifica (minima)
- Uno script di test del calcolo ricorsivo su un piccolo `items.json` di esempio (intermedio annidato, materiale condiviso tra due obiettivi, ciclo).
- Uno snapshot di una pagina MetaForge salvata per testare il parser dello scraper senza rete.

## Aperto / lasciato al builder
- **Da confermare sulle pagine reali:** se esistono oggetti con più ricette alternative (la pagina di Standard Textile ripete "Atelier" quattro volte, probabile solo icone). Il default è usare la prima ricetta; se ne esistono di vere, aggiungere un selettore.
- **Deciso dall'utente:** repo `jecko1989/archeagechronicles-farm-tracker` (utente = quello salvato in `gh`). Fonte dati: scraper di MetaForge (altre fonti valutate e scartate).
- **Ancora aperto (dell'utente):** repo pubblica (serve per Pages gratuito e raw); licenza e testo dei crediti. Non ho verificato i termini d'uso di MetaForge sul ripubblicare i dati estratti: consiglio crediti e link ben visibili e di non copiare le immagini.
