"""Estrazione dei campi dai record grezzi tramite espressioni definite in config.

Sintassi di un'espressione:  percorso [| trasformazione[:argomento]]...

- ``a.b.c``         → valore annidato (None se un passaggio manca)
- ``lista[].campo`` → lista con ``campo`` di ogni elemento (annidabile)
- trasformazioni disponibili: vedi ``TRANSFORMS``
"""
from __future__ import annotations

from typing import Any, Callable


def _inverted_index_text(value: Any, _arg: str | None) -> str | None:
    """Ricostruisce un testo da un indice invertito {parola: [posizioni]}."""
    if not isinstance(value, dict) or not value:
        return None
    positions = [(i, word) for word, idxs in value.items() for i in (idxs or [])]
    positions.sort()
    return " ".join(word for _, word in positions) or None


def _flatten(value: Any, _arg: str | None) -> Any:
    if not isinstance(value, list):
        return value
    out: list = []
    for item in value:
        if isinstance(item, list):
            out.extend(_flatten(item, None))
        else:
            out.append(item)
    return out


def _unique(value: Any, _arg: str | None) -> Any:
    """Rimuove None e duplicati mantenendo l'ordine."""
    if not isinstance(value, list):
        return value
    out: list = []
    for item in value:
        if item is not None and item not in out:
            out.append(item)
    return out


def _lower(value: Any, _arg: str | None) -> Any:
    if isinstance(value, str):
        return value.lower()
    if isinstance(value, list):
        return [_lower(v, None) for v in value]
    return value


def _strip_prefix(value: Any, arg: str | None) -> Any:
    if isinstance(value, str) and arg and value.startswith(arg):
        return value[len(arg):]
    if isinstance(value, list):
        return [_strip_prefix(v, arg) for v in value]
    return value


TRANSFORMS: dict[str, Callable[[Any, str | None], Any]] = {
    "inverted_index_text": _inverted_index_text,
    "flatten": _flatten,
    "unique": _unique,
    "lower": _lower,
    "strip_prefix": _strip_prefix,
}


def _get(obj: Any, keys: list[str]) -> Any:
    if not keys:
        return obj
    head, rest = keys[0], keys[1:]
    if head.endswith("[]"):
        name = head[:-2]
        seq = obj.get(name) if (name and isinstance(obj, dict)) else (obj if not name else None)
        if not isinstance(seq, list):
            return []
        return [_get(item, rest) for item in seq]
    if not isinstance(obj, dict):
        return None
    return _get(obj.get(head), rest)


def compile_expr(expr: str) -> Callable[[Any], Any]:
    parts = [p.strip() for p in expr.split("|")]
    path = parts[0]
    if not path:
        raise ValueError(f"espressione senza percorso: '{expr}'")
    steps = []
    for token in parts[1:]:
        name, _, arg = token.partition(":")
        if name not in TRANSFORMS:
            raise ValueError(f"trasformazione sconosciuta '{name}' in '{expr}'")
        steps.append((TRANSFORMS[name], arg or None))
    keys = path.split(".")

    def evaluate(record: Any) -> Any:
        value = _get(record, keys)
        for fn, arg in steps:
            value = fn(value, arg)
        return value

    return evaluate


class RecordMapper:
    def __init__(self, id_expr: str, fields: dict[str, str]):
        self._id = compile_expr(id_expr)
        self._fields = {name: compile_expr(expr) for name, expr in fields.items()}

    def record_id(self, raw: dict) -> str | None:
        value = self._id(raw)
        return None if value in (None, "") else str(value)

    def map(self, raw: dict) -> dict[str, Any]:
        return {name: fn(raw) for name, fn in self._fields.items()}
