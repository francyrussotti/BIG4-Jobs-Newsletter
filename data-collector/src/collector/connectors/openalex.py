"""Connettore OpenAlex: paginazione a cursore (cursor=* → meta.next_cursor)."""
from __future__ import annotations

import logging
from typing import Iterator

from .base import Connector, Page

log = logging.getLogger(__name__)


class OpenAlexConnector(Connector):
    def fetch(self, since: str | None, checkpoint: str | None) -> Iterator[Page]:
        params = dict(self.source.params)
        if not params.get("api_key"):
            log.warning("%s: nessuna api_key; OpenAlex consente solo un uso dimostrativo senza chiave",
                        self.source.name)

        # I filtri OpenAlex si combinano in AND separandoli con la virgola.
        filters = [params.pop("filter")] if params.get("filter") else []
        if since is not None and self.source.incremental:
            filters.append(self.source.incremental.filter.format(since=since))
        if filters:
            params["filter"] = ",".join(filters)

        params["cursor"] = checkpoint or "*"
        while True:
            data = self.http.get_json(self.source.url, params)
            results = data.get("results") or []
            next_cursor = (data.get("meta") or {}).get("next_cursor")
            if not results:
                return
            yield Page(records=results, checkpoint=next_cursor)
            if not next_cursor:
                return
            params["cursor"] = next_cursor
