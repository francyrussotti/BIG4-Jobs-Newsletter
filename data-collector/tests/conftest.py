"""Server HTTP locale che simula le API (nessuna chiamata a servizi esterni nei test)."""
from __future__ import annotations

import copy
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
PROJECT_ROOT = Path(__file__).parent.parent


class FakeServer:
    def __init__(self):
        self.routes = {}  # path -> fn(query: dict) -> (status, headers, body)
        self.requests = []  # (path, query)
        self.routes["/robots.txt"] = lambda q: (404, {}, "")
        handler = self._make_handler()
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.base_url = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        threading.Thread(target=self.httpd.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True).start()

    def _make_handler(self):
        server = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                parts = urlsplit(self.path)
                query = {k: v[0] for k, v in parse_qs(parts.query).items()}
                server.requests.append((parts.path, query))
                route = server.routes.get(parts.path)
                status, headers, body = route(query) if route else (404, {}, "not found")
                if not isinstance(body, str):
                    body = json.dumps(body)
                    headers = {"Content-Type": "application/json", **headers}
                payload = body.encode()
                self.send_response(status)
                for k, v in headers.items():
                    self.send_header(k, v)
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, *args):
                pass

        return Handler

    def api_requests(self, path):
        return [q for p, q in self.requests if p == path]

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


@pytest.fixture
def server():
    s = FakeServer()
    yield s
    s.close()


def openalex_route(works, page_size=2, bad_cursors=()):
    """Simula /works di OpenAlex con paginazione a cursore (cursor=* → meta.next_cursor)."""
    def handle(query):
        cursor = query.get("cursor")
        if cursor in bad_cursors:
            return 400, {}, {"error": "Invalid cursor"}
        start = 0 if cursor == "*" else int(cursor[1:])
        page = works[start:start + page_size]
        nxt = start + page_size
        next_cursor = f"p{nxt}" if page else None
        return 200, {}, {"meta": {"count": len(works), "per_page": page_size, "next_cursor": next_cursor},
                         "results": page}
    return handle


@pytest.fixture
def sample_work():
    return json.loads((FIXTURES / "openalex_work.json").read_text())


@pytest.fixture
def make_works(sample_work):
    def make(n, start_date="2024-01-0"):
        works = []
        for i in range(n):
            w = copy.deepcopy(sample_work)
            w["id"] = f"https://openalex.org/W{1000 + i}"
            w["doi"] = f"https://doi.org/10.1234/Test.{i}"
            w["display_name"] = f"Paper {i}"
            w["publication_date"] = f"{start_date}{i + 1}"
            works.append(w)
        return works
    return make
