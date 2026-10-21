"""Export dei record in Parquet, a blocchi (adatto anche a milioni di righe)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from .storage import Storage

META_COLUMNS = ["source", "record_id", "dedup_key", "first_seen_at", "last_seen_at", "updated_at"]


def _row_to_dict(row, field_names: list[str]) -> dict[str, Any]:
    data = json.loads(row["data"])
    out = {col: row[col] for col in META_COLUMNS}
    for name in field_names:
        value = data.get(name)
        out[name] = json.dumps(value, ensure_ascii=False) if isinstance(value, dict) else value
    return out


def _infer_schema(store: Storage, sources: list[str], dedup: bool, field_names: list[str]) -> pa.Schema:
    """Tipo di ogni campo dal primo valore non vuoto; i campi sempre vuoti diventano stringhe."""
    samples: dict[str, Any] = {}
    for row in store.iter_rows(sources, dedup):
        d = _row_to_dict(row, field_names)
        for name in field_names:
            if name not in samples and d[name] not in (None, [], ""):
                samples[name] = d[name]
        if len(samples) == len(field_names):
            break
    fields = [pa.field(col, pa.string()) for col in META_COLUMNS]
    for name in field_names:
        if name in samples:
            fields.append(pa.field(name, pa.array([samples[name]]).type))
        else:
            fields.append(pa.field(name, pa.string()))
    return pa.schema(fields)


def export_parquet(store: Storage, sources: list[str], field_names: list[str], out: str | Path,
                   dedup: bool = False, batch_size: int = 50_000) -> int:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    schema = _infer_schema(store, sources, dedup, field_names)
    total = 0
    with pq.ParquetWriter(out, schema) as writer:
        batch: list[dict] = []
        for row in store.iter_rows(sources, dedup):
            batch.append(_row_to_dict(row, field_names))
            if len(batch) >= batch_size:
                writer.write_table(pa.Table.from_pylist(batch, schema=schema))
                total += len(batch)
                batch = []
        if batch or total == 0:
            writer.write_table(pa.Table.from_pylist(batch, schema=schema))
            total += len(batch)
    return total
