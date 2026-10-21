"""Registro dei connettori. In config `connector:` accetta un nome registrato o 'modulo:Classe'."""
from __future__ import annotations

import importlib

from ..config import ConfigError
from .base import Connector, Page

REGISTRY = {
    "openalex": "collector.connectors.openalex:OpenAlexConnector",
}


def load_connector(name: str) -> type[Connector]:
    target = REGISTRY.get(name, name)
    module_name, sep, class_name = target.partition(":")
    if not sep:
        raise ConfigError(f"connettore sconosciuto '{name}' (registrati: {', '.join(REGISTRY)})")
    try:
        cls = getattr(importlib.import_module(module_name), class_name)
    except (ImportError, AttributeError) as exc:
        raise ConfigError(f"impossibile caricare il connettore '{target}': {exc}") from exc
    if not (isinstance(cls, type) and issubclass(cls, Connector)):
        raise ConfigError(f"'{target}' non è una sottoclasse di Connector")
    return cls


__all__ = ["Connector", "Page", "REGISTRY", "load_connector"]
