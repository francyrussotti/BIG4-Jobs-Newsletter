from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Iterator

from ..config import SourceConfig
from ..http_client import HttpClient


@dataclass
class Page:
    records: list[dict]
    checkpoint: str | None  # da passare a fetch() per riprendere DOPO questa pagina; None = fine


class Connector(ABC):
    """Un connettore sa solo come paginare la sua API. URL, parametri e campi arrivano dalla config."""

    def __init__(self, source: SourceConfig, http: HttpClient):
        self.source = source
        self.http = http

    @abstractmethod
    def fetch(self, since: str | None, checkpoint: str | None) -> Iterator[Page]:
        """Restituisce pagine di record grezzi.

        since:      valore da inserire nel filtro incrementale (None = nessun filtro)
        checkpoint: valore restituito da una Page precedente, per riprendere un run interrotto
        """
