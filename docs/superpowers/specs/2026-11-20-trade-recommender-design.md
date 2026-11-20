# Consiglio "craft o commercio" — design

Data: 2026-11-20 · Stato: **bozza da approvare** · Estende `2026-11-19-trade-tab-design.md` (la tab Trade; lì l'ottimizzatore era un non obiettivo, ora è questo documento).

## 1. Intento e perché
La tab Trade oggi mostra, per ogni materiale, "se lo prendessi col commercio" (casse, viaggi, giorni), ma non sceglie: l'utente deve confrontare a mano con il craft. Ogni riga è un'alternativa, e i materiali annidati (Standard Ingot → Fine Ingot → Superior Ingot) si sovrappongono. Il giocatore vuole che il tool **gli dica cosa craftare e cosa prendere col commercio** per l'oggetto scelto, con due obiettivi tra cui scegliere: **farmare meno** (meno materiali grezzi) oppure **spendere meno gold** (craft e casse).

Successo = per il Gyldenlord's Cleaver, scegliendo un obiettivo, il tool dice per ogni materiale commerciabile "CRAFTA" o "COMMERCIO", poi mostra il risultato (grezzi da farmare e gold) accanto a quello del solo craft, e il risultato non è mai peggiore del solo craft sull'obiettivo scelto.

## 2. Obiettivi, non obiettivi, anti-obiettivi
**Obiettivi**
- Interruttore obiettivo: **Farmare meno** / **Gold spesi**.
- Decisione craft/commercio **per ogni materiale commerciabile dell'albero**, senza doppi conteggi tra livelli annidati.
- Per ogni materiale scelto col commercio: avamposto, casse, viaggi, giorni, e **quale materiale mettere nelle casse** (scelto dal tool: il più economico di quel livello).
- Confronto con il solo craft (baseline) sull'obiettivo scelto e sull'altro.

**Non obiettivi (per ora)**
- Scorte da convertire (materiali in abbondanza dell'utente a costo zero): il tool sceglie il materiale di partenza più economico da solo. Rimandato.
- Pesi diversi per i grezzi (un Wild Petal vale come un Void Heart): ogni grezzo conta 1.
- Ottimizzare i giorni di viaggio, rischio PvP, prezzi di mercato.
- Decisioni diverse per quantità diverse dello stesso materiale (la decisione è per materiale, non per quantità).
- La modalità "guadagnare gold in gioco" (altro progetto, dopo).

**Anti-obiettivi**: raccomandare il commercio sulla base di rapporti che sono ipotesi **senza dirlo** (ogni decisione riporta se il rapporto è "stima" o "dal tuo registro"); raccomandare un piano peggiore del solo craft; contare due volte lo stesso materiale.

## 3. Regole di decisione
**Costo di un'unità** (coppia `[primario, secondario]`, confronto lessicografico):
- obiettivo *Farmare meno*: grezzo = `[1, 0]`; commissione di craft o cassa di `g` gold = `[0, g]`.
- obiettivo *Gold spesi*: grezzo = `[0, 1]`; commissione di `g` gold = `[g, 0]` (i grezzi si farmano gratis, ma a parità di gold si preferisce il piano con meno grezzi).
- **Craft** di un oggetto: `(commissione del craft + Σ qty × costo(ingrediente)) / yield`, dove ogni ingrediente ha il suo costo migliore (craft o commercio). Un materiale senza ricetta è un grezzo.
- **Commercio** di un materiale di livello `T` e famiglia `F` (solo se `tradeInfo` lo riconosce e il rapporto `r` di `effectiveRatio(F, T)` è > 0): una cassa costa `input` materiali di livello `T` più `packs[T].gold` e dà `r × input` unità. Costo per unità = `costoInput(T) / r + commissioneCassa / (r × input)`.
- `costoInput(T)` = il minore tra i costi **solo craft** (senza commercio) dei materiali di livello `T` di famiglie **diverse da `F`**. (Se il materiale di partenza potesse essere della stessa famiglia, "convertire X in X" a 1,22× risulterebbe sempre più economico del craft di X: un guadagno infinito. Il gioco consegna le casse a un avamposto diverso da quello di imbustamento.)
- Scelta: il costo minore; a parità, **craft** (nessun viaggio). Rapporto `null` o 0 (superior senza dati) = commercio non disponibile.

**Valutazione esatta** (dopo le decisioni): le quantità si ricalcolano con il motore esistente, trattando i materiali scelti col commercio come "ottenuti" (non espansi in grezzi), poi si calcolano le casse (`tradePlan`) e i materiali di partenza richiesti si aggiungono come obiettivi da craftare. Metriche finali: `farm` = somma dei grezzi, `gold` = gold dei craft + gold delle casse (con i giorni come informazione).
- **Guardia**: se il piano consigliato non è migliore o uguale al solo craft sull'obiettivo scelto (succede con quantità piccole perché le casse sono intere), il consiglio è il solo craft e si segnala.
- **Conflitto**: un materiale scelto per il commercio che serve anche come materiale di partenza per un'altra cassa viene riportato a craft (e si ricalcola) finché il piano è coerente.
- I materiali già posseduti (`have`) si sottraggono come oggi.

## 4. Approcci considerati
1. **A — confronto riga per riga**: semplice ma sbaglia con i materiali annidati (stesso difetto dei totali tolti nella tab Trade). Scartato.
2. **B — calcolo sull'albero** ← **scelto dall'utente**: decisione dal basso verso l'alto con costi unitari, poi ricalcolo esatto. Costo: l'ultimo passo richiede un'opzione nuova nel motore (`obtained`).
3. **Con scorte dell'utente**: rimandato, richiede un inventario.

## 5. Come funziona
**Motore** — `computeNeeds(items, targets, opts)` accetta `opts.obtained` (elenco di id): quegli oggetti non vengono espansi in grezzi (restano in `materials` con la quantità richiesta), a meno che siano obiettivi espliciti.

**Nuova funzione pura nel blocco `core`:**
`recommendPlan(items, trade, targets, have, deliveries, opts) -> Recommendation`, con `opts = {objective: 'farm'|'gold', tripsPerDay: number}` e
```
Recommendation = {
  objective,
  decisions: [{ id, tier, family, post, choice: 'craft'|'trade', unitCraft: [p,s], unitTrade: [p,s]|null,
                ratioSource: 'estimate'|'log'|null, units, crates, trips, days }],
  plan:     { farm, gold, rawMaterials: {id: qty}, crateInputs: [{ id, qty }] },
  baseline: { farm, gold },
  fallback: boolean            // true = consigliato il solo craft per via della guardia
}
```
I test devono coprire almeno: annidamento (se conviene il commercio del Fine, lo Standard che serve solo a lui sparisce dal piano e non si conta due volte); obiettivi diversi danno decisioni diverse su dati costruiti ad hoc; rapporto `null` → craft con motivo; la famiglia di partenza è diversa da quella di destinazione; la guardia (quantità piccole → solo craft); parità → craft; ossa non commerciabili; il risultato non è mai peggiore del solo craft sull'obiettivo scelto.

## 6. Schermata (bozza, in cima alla tab Trade)
```
Obiettivo: (Farmare meno) ( Gold spesi )

Consiglio per Gyldenlord's Cleaver
  Standard Additive ×2.106   COMMERCIO  Watcher's · metti Standard Lumber ×…   [stima 1,22×]
  Fine Ingot ×45             CRAFTA     (il commercio costerebbe di più)
  Superior Ingot ×5          CRAFTA     (nessun dato sul rapporto: registra una consegna)
Risultato: … grezzi da farmare (solo craft: …) · … gold (solo craft: …)
[ elenco dei grezzi del piano consigliato ]
```
Sotto resta la sezione attuale ("alternative per riga") e il registro consegne. Testi in EN/IT con test di parità.

## 7. Vincoli
Un solo `index.html`, JS senza build; logica pura nel blocco `core` con test `node:test`; repo pubblico "solo codice"; commit con autore noreply; push solo su richiesta; interfaccia in inglese di base, italiano selezionabile; layout che regge a 380 px; ogni decisione etichettata "stima" o "dal tuo registro".

## 8. Lasciato al costruttore
- Nome e posizione esatta dell'interruttore e del blocco "Consiglio" nella tab.
- Come mostrare il motivo di ogni decisione (percentuale di vantaggio sul primario, o testo breve).
- Gestione di eventuali cicli di ricette (trattarli come solo craft).
- Se estrarre la parte di calcolo dei costi unitari in una funzione a parte per testarla da sola.
