# EPSO Reasoning Trainer (AD/427/26)

Programma di allenamento per la Parte 1 del concorso EPSO/AD/427/26 (AD5): solo le tre prove di reasoning, con formato, tempi e soglie del bando.

| Prova | Domande | Tempo | Soglia |
|---|---|---|---|
| Verbale | 20 | 35 min | 10/20 |
| Numerico | 10 | 20 min | 10/20 combinata con l'astratto |
| Astratto | 10 | 10 min | (vedi sopra) |

## Come aprirlo

- **Dal computer, senza installare nulla:** scarica `index.html` e aprilo con doppio clic. Funziona anche offline.
- **Online con GitHub Pages:** Settings → Pages → "Deploy from a branch" → scegli il branch e la cartella `/ (root)`. L'indirizzo sarà `https://<utente>.github.io/<repo>/epso-reasoning/`.

Lo storico (punteggi, tempi, errori) resta nel browser in cui fai i test. Per spostarlo usa "Scarica backup JSON" e "Importa backup" nella pagina Statistiche.

## Cosa contiene

- **Simulazione completa:** verbale → numerico → astratto di fila, con esito secondo le soglie del bando.
- **Prove singole a tempo** e **pratica** con correzione immediata.
- **Verbale:** brano + 4 opzioni, una sola giusta. Domande "Which of the following statements is correct / incorrect / can be deduced?" e domande mirate da completare ("According to the passage, …", "Why…?"). 56 brani: 42 originali, 14 da atti UE.
- **Numerico:** 19 tipi di domanda generati al momento con dati fittizi (variazioni %, quote, pro capite, valute, percentuale inversa, crescita composta, punti percentuali, grafici a barre e a torta, medie ponderate, totali cumulati, saldi, anno che supera entrambi, ricerca inversa, valore medio da due colonne, quota di un totale di riga, ripartizioni), 5 opzioni, calcolatrice a schermo.
- **Astratto:** serie di 5 figure generate al momento, 5 opzioni. Famiglie di regole: rotazione, conteggio, posizione, riempimento, forma (2-3 regole insieme), settori di una ruota e caselle di una griglia che si muovono con passi diversi, sovrapposizione (con o senza parti comuni), conteggio dei lati.
- **Allenamento mirato:** il programma legge errori e tempi delle ultime sessioni, mostra i punti deboli e costruisce una sessione di 18 domande (6 per prova) che insiste su quelli, con un consiglio specifico a ogni errore.
- **Analisi:** tempo per domanda rispetto al budget, trappole verbali, tipi di calcolo sbagliati, regole astratte mancate, causa dell'errore indicata da te, export CSV.
- **Metodo:** guida alle tre prove (tipi di affermazione, trappole verbali con esempi, formule del numerico, checklist dell'astratto, gestione del tempo).
- **Piano di preparazione** 4-13 novembre con le attività del giorno.
- **Manuale:** apri il PDF del tuo manuale dal computer e fai gli esercizi accanto al foglio risposte. Le soluzioni stampate sono coperte; il programma legge le soluzioni dal PDF, corregge da solo quando premi Avanti, mostra la spiegazione e porta il PDF all'esercizio successivo (modalità test: esito solo alla fine). Modalità "Simulazione d'esame": estrae dal manuale 10 esercizi (prima quelli non ancora fatti) con un solo cronometro di 10 minuti per l'astratto (20 per il numerico, 35 per 20 domande di verbale), navigazione tra le domande, consegna automatica allo scadere e correzione alla fine. Il file resta nel browser: non viene caricato sul sito né altrove.
- **Foglio risposte** cronometrato per esercitarsi sul manuale (il programma non contiene domande del manuale).

## Modificare il programma

I sorgenti sono in `src/`. Dopo una modifica rigenera `index.html`:

```bash
python3 build.py .
```

## Fonti e licenze

- Brani `o01`-`o42`, generatori numerici e astratti, interfaccia: scritti per questo progetto.
- Brani `k01`-`k14`: considerando di atti UE © European Union, [EUR-Lex](https://eur-lex.europa.eu), riuso autorizzato dalla Decisione della Commissione 2011/833/UE. Affermazioni e spiegazioni adattate da [EPSO AI Field Trainer](https://github.com/Chartres/epso-kviz) (commit `fdce428`) di Pavol Dravecký, licenza [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Questi contenuti, e il file `src/verbal-kviz.js`, restano sotto CC BY-NC-SA 4.0: uso non commerciale, con attribuzione, adattamenti con la stessa licenza.
- Formato delle domande ricavato dal bando EPSO/AD/427/26 e dalle descrizioni generali del formato EPSO. Nessuna domanda reale d'esame o di manuali commerciali è inclusa.

Progetto indipendente, non affiliato a EPSO. Il punteggio ottenuto qui non predice il risultato reale.
