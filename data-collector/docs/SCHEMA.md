# Schema dati (SQLite)

Tutti i timestamp sono stringhe ISO 8601 in UTC (es. `2026-10-21T18:00:00+00:00`).

## `records`: un record per `(source, record_id)`

| Colonna | Tipo | Descrizione |
|---|---|---|
| `source` | TEXT | Nome della fonte in config (es. `openalex_llm`). |
| `record_id` | TEXT | Id del record nella fonte (da `id_field`). |
| `dedup_key` | TEXT, nullable | Chiave per la deduplicazione tra fonti (es. DOI normalizzato), dal campo indicato in `dedup_key`. |
| `data` | TEXT (JSON) | Campi normalizzati definiti in `fields`. |
| `raw` | TEXT (JSON), nullable | Risposta grezza della fonte (se `storage.store_raw: true`). |
| `content_hash` | TEXT | SHA-256 di `data`. Serve a capire se il record è cambiato. |
| `first_seen_at` | TEXT | Primo inserimento. |
| `last_seen_at` | TEXT | Ultima volta che la fonte l'ha restituito. |
| `updated_at` | TEXT | Ultima volta che `data` è cambiato. |

Chiave primaria `(source, record_id)`; indice su `dedup_key`.

I campi in `data` si interrogano con `json_extract`, ad esempio:

```sql
SELECT json_extract(data, '$.year') AS year, count(*)
FROM records WHERE source = 'openalex_llm' GROUP BY year;
```

## `sync_state`: stato incrementale per fonte

| Colonna | Descrizione |
|---|---|
| `source` | PK. |
| `watermark` | Valore massimo del campo incrementale dopo l'ultimo run completo. |
| `checkpoint` | Cursore da cui riprendere un run interrotto (NULL se nessuno). |
| `checkpoint_since` | Il `since` del run interrotto (la ripresa deve usare la stessa query). |
| `updated_at` | Ultimo aggiornamento. |

## `runs`: log dei run

`id, source, started_at, finished_at, status (running|success|partial|failed), since, fetched, inserted, updated, unchanged, skipped, requests, error`

- `partial`: il run si è fermato per il tetto di richieste o per il budget dell'API; il checkpoint è salvato.
- `failed`: errore; il checkpoint dell'ultima pagina salvata resta valido.

## Campi `data` per OpenAlex (`config/openalex.yaml`)

| Campo | Origine OpenAlex |
|---|---|
| `doi` | `doi`, senza `https://doi.org/`, minuscolo |
| `title` | `display_name` |
| `abstract` | ricostruito da `abstract_inverted_index` |
| `published_date`, `year` | `publication_date`, `publication_year` |
| `language`, `type` | `language`, `type` |
| `venue` | `primary_location.source.display_name` |
| `authors`, `author_ids` | `authorships[].author.display_name` / `.id` |
| `institutions`, `countries` | `authorships[].institutions[].display_name` / `.country_code` (unici) |
| `primary_topic`, `subfield`, `field`, `domain` | `primary_topic.*.display_name` |
| `topics`, `keywords` | `topics[].display_name`, `keywords[].display_name` |
| `cited_by_count`, `citations_by_year` | `cited_by_count`, `counts_by_year` (lista `{year, cited_by_count}`) |
| `is_oa`, `oa_url` | `open_access.is_oa`, `open_access.oa_url` |
| `landing_page_url`, `pdf_url` | `primary_location.*` |
| `source_updated_at` | `updated_date` |
