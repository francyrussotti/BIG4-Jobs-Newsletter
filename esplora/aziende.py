"""Prova temporanea (2): ZS, IBM, Gartner, ADL, Oliver Wyman."""
import sys, os, re, json, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
H = dict(jn.HEADERS)
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)

T("ZS")
for params in ["page=1&sortBy=relevance&descending=false&internal=false", "page=2&sortBy=relevance&descending=false&internal=false",
               "page=1&sortBy=posted_date&descending=true&internal=false", "page=1&limit=100&sortBy=relevance&descending=false&internal=false"]:
    try:
        r = requests.get(f"https://jobs.zs.com/api/jobs?{params}", headers=H, timeout=30)
        d = r.json()
        print(f"  {params}: status {r.status_code} totalCount={d.get('totalCount')} n={len(d.get('jobs') or [])}")
    except Exception as e:
        print("  ", params, "ERR", e, r.text[:200] if 'r' in dir() else "")
d = requests.get("https://jobs.zs.com/api/jobs?page=1&sortBy=relevance&descending=false&internal=false", headers=H, timeout=30).json()
print("  locations facet:", str(d.get("locations"))[:600])
j = (d.get("jobs") or [{}])[0].get("data", {})
print("  additional_locations es.:", json.dumps(j.get("additional_locations"))[:300])

T("IBM")
for filtro in [[{"term": {"field_keyword_05": "Italy"}}], [{"term": {"field_keyword_05": "Italy"}}, {"term": {"field_keyword_08": "Consulting"}}]]:
    body = {"appId": "careers", "scopes": ["careers2"], "query": {"bool": {"must": []}},
            "post_filter": {"bool": {"must": filtro}}, "size": 5, "from": 0, "lang": "zz", "localeSelector": {},
            "sm": {"query": "", "lang": "zz"},
            "aggs": {"paesi": {"terms": {"field": "field_keyword_05", "size": 300}}, "team": {"terms": {"field": "field_keyword_08", "size": 50}}},
            "_source": ["_id", "title", "url", "field_keyword_05", "field_keyword_08", "field_keyword_17", "field_keyword_19", "field_keyword_18"]}
    r = requests.post("https://www-api.ibm.com/search/api/v2", json=body,
                      headers={**H, "Content-Type": "application/json", "Origin": "https://www.ibm.com", "Referer": "https://www.ibm.com/careers/search"}, timeout=30)
    d = r.json()
    print(f"  filtro {filtro}: status {r.status_code} total={((d.get('hits') or {}).get('total'))}")
    for h in ((d.get("hits") or {}).get("hits") or [])[:3]:
        print("   ·", h.get("_source"))
    ag = d.get("aggregations") or {}
    if ag:
        print("   paesi:", [b for b in (ag.get("paesi") or {}).get("buckets", []) if re.search(r"ital|belg|luxem|irel|nether", str(b.get("key")), re.I)])
        print("   team:", [(b.get("key"), b.get("doc_count")) for b in (ag.get("team") or {}).get("buckets", [])][:20])

T("Gartner")
for u in ["https://jobs.gartner.com/jobs/?page=41", "https://jobs.gartner.com/jobs/?location=Netherlands",
          "https://jobs.gartner.com/jobs/?country=Netherlands", "https://jobs.gartner.com/jobs/?search=Netherlands",
          "https://jobs.gartner.com/jobs/?search=&location=Ireland&page=1"]:
    r = requests.get(u, headers=H, timeout=30)
    t = re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", r.text))
    m = re.findall(r"(\d[\d,]*)\s*(?:jobs|results|Jobs|Results)", t)
    print(f"  {u}: {r.status_code} link {len(set(re.findall(r'/jobs/job/\d+', r.text)))} · conteggi {m[:4]}")
r = requests.get("https://jobs.gartner.com/jobs/", headers=H, timeout=30)
print("  form/filtri:", re.findall(r'name="([a-z_\[\]]+)"', r.text)[:30])
print("  select opzioni paese:", re.findall(r'<option[^>]*value="([^"]*(?:Ireland|Netherlands|Italy|Belgium)[^"]*)"', r.text)[:10])
i = r.text.find("/jobs/job/"); print("  card:", r.text[max(0, i - 800): i + 900])

T("ADL iCIMS")
for u in ["https://experienced-careers-we-adlittle.icims.com/jobs/search?ss=1", "https://experienced-careers-we-adlittle.icims.com/jobs/search?ss=1&in_iframe=1",
          "https://experienced-careers-we-adlittle.icims.com/jobs/intro"]:
    for hdr in [H, {"User-Agent": H["User-Agent"], "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9"}]:
        try:
            r = requests.get(u, headers=hdr, timeout=30)
            print(f"  {u} → {r.status_code} ({len(r.text)}) link {len(set(re.findall(r'/jobs/\d+/', r.text)))}")
        except Exception as e:
            print("  ERR", e)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    pg = b.new_page(user_agent=H["User-Agent"])
    for u in ["https://experienced-careers-we-adlittle.icims.com/jobs/search?ss=1&in_iframe=1",
              "https://early-careers-we-adlittle.icims.com/jobs/search?ss=1&in_iframe=1"]:
        try:
            pg.goto(u, wait_until="domcontentloaded", timeout=45000); pg.wait_for_timeout(4000)
            html = pg.content()
            print(f"  PW {u}: ({len(html)}) link {len(set(re.findall(r'/jobs/\d+/', html)))}")
            i = html.find("/jobs/"); k = html.find("iCIMS_JobsTable")
            print("   tabella:", html[k: k + 1800] if k >= 0 else html[:600])
        except Exception as e:
            print("  PW ERR", e)
    b.close()

T("Oliver Wyman: campi")
body = {"lang": "en_global", "deviceType": "desktop", "country": "global", "ddoKey": "refineSearch", "from": 0, "jobs": True,
        "counts": True, "all_fields": ["category", "country", "state", "city", "type"], "size": 3, "siteType": "external",
        "keywords": "", "global": True, "selected_fields": {"country": ["Italy"]}, "refNum": "MAMCGLOBAL",
        "pageName": "Oliver Wyman Search", "pageId": "page52-prod-ds", "rk": "l-oliver-wyman-search"}
d = requests.post("https://careers.marsh.com/widgets", json=body, headers={**H, "Content-Type": "application/json",
                  "Origin": "https://careers.marsh.com", "Referer": "https://careers.marsh.com/global/en/"}, timeout=30).json()
rs = d["refineSearch"]; print("  totalHits", rs.get("totalHits"))
for j in rs["data"]["jobs"][:3]:
    print("  ", {k: v for k, v in j.items() if k not in ("descriptionTeaser", "ml_job_parser", "ml_skills", "description")})
for a in rs["data"].get("aggregations") or []:
    print("   facet", a.get("field"), str(a.get("value"))[:300])
