"""Esplorazione temporanea (2): API dei due portali NTT DATA per il Belgio."""
import re, json, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8"}

def titolo(t): print("\n" + "=" * 80 + "\n" + t + "\n" + "=" * 80)

# 1) Phenom globale careers.nttdata.com
titolo("PHENOM careers.nttdata.com /widgets")
for sel in ({}, {"country": ["Belgium"]}):
    body = {"lang": "en_global", "deviceType": "desktop", "country": "global", "pageName": "search-results",
            "ddoKey": "refineSearch", "sortBy": "", "subsearch": "", "from": 0, "jobs": True, "counts": True,
            "all_fields": ["category", "country", "state", "city", "type"], "size": 50, "clearAll": False,
            "jdsource": "facets", "isSliderEnable": False, "pageId": "page20", "siteType": "external",
            "keywords": "", "global": True, "selected_fields": sel, "locationData": {}}
    try:
        r = requests.post("https://careers.nttdata.com/widgets", json=body, headers={**H, "Content-Type": "application/json"}, timeout=30)
        print("selected", sel, "status", r.status_code, len(r.text))
        d = r.json().get("refineSearch", {})
        print("  totalHits:", d.get("totalHits"), "hits:", d.get("hits"))
        jobs = (d.get("data") or {}).get("jobs") or []
        if jobs:
            print("  chiavi job:", sorted(jobs[0].keys()))
        for j in jobs[:8]:
            print("   ·", j.get("title"), "|", j.get("country"), "|", j.get("city"), "|", j.get("postedDate"),
                  "|", j.get("applyUrl") or j.get("jobUrl") or j.get("jobId"), "|", j.get("company") or j.get("businessUnit"))
        agg = (d.get("data") or {}).get("aggregations") or []
        for a in agg:
            if a.get("field") == "country":
                vals = a.get("value") or {}
                print("  country facet:", {k: v for k, v in vals.items() if re.search(r"belg|ital", k, re.I)} if isinstance(vals, dict) else str(vals)[:400])
    except Exception as e:
        print("  ERRORE", e, r.text[:300] if 'r' in dir() else "")

# 2) Siti nazionali (Salesforce dietro)
for u in ["https://be.nttdata.com/careers", "https://be.nttdata.com/en/careers", "https://be.nttdata.com/careers/job-openings",
          "https://be.nttdata.com/jobs", "https://it.nttdata.com/career/posizioni-aperte"]:
    titolo(u)
    s = requests.Session()
    try:
        r = s.get(u, headers=H, timeout=25, allow_redirects=False)
        hops = 0
        while r.is_redirect and hops < 8:
            print("  redirect", r.status_code, "→", r.headers.get("location"), "cookie:", list(s.cookies.keys()))
            r = s.get(requests.compat.urljoin(r.url, r.headers["location"]), headers=H, timeout=25, allow_redirects=False)
            hops += 1
        print("  status", r.status_code, r.url, len(r.text))
        for m in re.finditer(r'<script[^>]+src="([^"]+)"', r.text):
            print("   script:", m.group(1)[:160])
        for m in set(re.findall(r'["\'](/[a-z0-9/_-]*(?:api|ajax|json|search|jobs)[a-z0-9/_?=&-]*)["\']', r.text, re.I)):
            print("   endpoint?:", m[:160])
        for m in list(re.finditer(r'href="(/jobs/[^"]+)"', r.text))[:5]:
            print("   job:", m.group(1))
    except Exception as e:
        print("  ERRORE", e)

# 3) Portale Salesforce EMEAL: intercetta le chiamate XHR con Playwright
titolo("SALESFORCE careers.emeal.nttdata.com (Playwright)")
from playwright.sync_api import sync_playwright
url = "https://careers.emeal.nttdata.com/s/?language=en_US&pcountry=Francia__Suiza__Luxemburgo__Paises_Bajos__Belgica"
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    pg = b.new_page(user_agent=H["User-Agent"])
    def on_resp(resp):
        if resp.request.resource_type in ("xhr", "fetch"):
            try:
                txt = resp.text()
            except Exception:
                txt = ""
            print(f"  XHR {resp.status} {resp.request.method} {resp.url[:180]}")
            if resp.request.method == "POST":
                print("     body:", (resp.request.post_data or "")[:700])
            if re.search(r"Belg|Brussel|offer", txt):
                print("     resp:", txt[:1500])
    pg.on("response", on_resp)
    pg.goto(url, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(8000)
    html = pg.content()
    print("  HTML len", len(html))
    for m in list(re.finditer(r'href="([^"]*offer[^"]*)"', html))[:15]:
        print("   offer:", m.group(1)[:200])
    print("  testo:", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))[:2500])
    b.close()
