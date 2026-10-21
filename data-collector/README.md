# data-collector

Collector di dati generico, guidato da configurazione: interroga API ufficiali, normalizza i record, li salva in **SQLite** con aggiornamenti incrementali e deduplicazione, e li esporta in **Parquet** per l'analisi.

Primo connettore: **OpenAlex** (paper scientifici).

- Architettura e scelte: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Schema dati: [`docs/SCHEMA.md`](docs/SCHEMA.md)

## Installazione

Requisiti: Python ≥ 3.11.

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

## Configurazione OpenAlex

1. Crea un account gratuito su OpenAlex e copia la tua API key. Da febbraio 2026 la chiave è obbligatoria: senza, è consentito solo un uso dimostrativo.
2. Imposta le variabili d'ambiente:

```bash
export OPENALEX_API_KEY="la-tua-chiave"
export OPENALEX_MAILTO="tuo@email.it"
```

3. Adatta `config/openalex.yaml`:
   - **`params.filter`**: cosa raccogliere. L'esempio usa `title_and_abstract.search:large language model,type:article`.
   - **`incremental.start`**: da quando parte il primo run (`2018-01-01`).
   - **`max_requests_per_run`**: il tetto di richieste per run, che serve a restare nel budget gratuito giornaliero (circa 1 $).

## Uso end to end

```bash
# 1. primo run: scarica tutto dal 2018 (si ferma a max_requests_per_run)
collector -c config/openalex.yaml run

# 2. stato: record salvati, watermark, checkpoint, ultimo run
collector -c config/openalex.yaml status

# 3. rilanci successivi: riprendono dal checkpoint, poi diventano incrementali
collector -c config/openalex.yaml run

# 4. ogni tanto, un refresh completo per aggiornare le citazioni dei paper vecchi
collector -c config/openalex.yaml run --full

# 5. export per l'analisi
collector -c config/openalex.yaml export -o data/papers.parquet --dedup
```

Analisi d'esempio con DuckDB o pandas:

```python
import pandas as pd
df = pd.read_parquet("data/papers.parquet")
df.explode("topics").groupby(["year", "topics"]).size().sort_values().tail(20)
```

Esecuzione periodica con cron, ogni giorno alle 6:

```cron
0 6 * * * cd /percorso/data-collector && .venv/bin/collector -c config/openalex.yaml run >> data/collector.log 2>&1
```

Codici di uscita: `0` ok (anche run `partial`), `1` almeno una fonte fallita, `2` errore di configurazione.

## Come funziona l'incrementale

- Ogni pagina viene salvata insieme al **checkpoint** (il cursore della pagina successiva). Un run interrotto riparte da lì: per il budget giornaliero (stato `partial`), per un errore o per Ctrl-C.
- Quando un run arriva in fondo, il **watermark** diventa la data di pubblicazione più recente salvata. Il run successivo filtra `from_publication_date = watermark - lookback_days`.
- Gli upsert si basano sull'hash dei campi normalizzati. Un record restituito di nuovo viene contato come `unchanged` oppure, se è cambiato (es. le citazioni), come `updated`.
- Limite: senza un piano premium OpenAlex non è possibile filtrare per data di modifica (`from_updated_date`). Per questo le citazioni dei paper vecchi si aggiornano solo con `run --full`. Con un piano premium basta cambiare in config:

```yaml
incremental:
  field: source_updated_at
  filter: "from_updated_date:{since}"
```

## Aggiungere una fonte

**Stessa API, query diversa:** aggiungi un blocco a `sources:` con un altro `name` e un altro `params.filter`.

**Nuova API:** due passi.

1. Scrivi un connettore che implementa solo la paginazione:

```python
# src/collector/connectors/miafonte.py
from .base import Connector, Page

class MiaFonteConnector(Connector):
    def fetch(self, since, checkpoint):
        params = dict(self.source.params)
        page = int(checkpoint or 1)
        while True:
            params["page"] = page
            data = self.http.get_json(self.source.url, params)
            if not data["items"]:
                return
            yield Page(records=data["items"], checkpoint=str(page + 1))
            page += 1
```

2. Registralo in `connectors/__init__.py` (`REGISTRY`), oppure indicalo direttamente in config con `connector: "collector.connectors.miafonte:MiaFonteConnector"`.

I campi si mappano in config con espressioni:

| Espressione | Significato |
|---|---|
| `a.b.c` | valore annidato |
| `lista[].campo` | lista di valori |
| `\| lower`, `\| strip_prefix:https://…` | normalizzazione |
| `\| flatten`, `\| unique` | appiattisce le liste annidate; toglie duplicati e `None` |
| `\| inverted_index_text` | ricostruisce un testo da un indice invertito (abstract OpenAlex) |

Il client HTTP è condiviso da tutti i connettori e gestisce:
- throttling (`requests_per_second` e `Crawl-delay`);
- retry con backoff esponenziale su 429/5xx ed errori di rete, rispettando `Retry-After`;
- controllo di `robots.txt` (`respect_robots`);
- tetto di richieste;
- log con i parametri segreti oscurati.

## Test

```bash
pytest
```

I test non chiamano servizi esterni. Un server HTTP locale simula:
- l'API OpenAlex, con paginazione a cursore e cursori non validi;
- errori 429/5xx, `robots.txt` e il budget di richieste.

La config usata nei test è quella reale (`config/openalex.yaml`), puntata sul server locale.
