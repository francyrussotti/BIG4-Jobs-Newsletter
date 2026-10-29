"""Esplorazione temporanea (2): API e siti caricati via JavaScript."""
import re, json, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "text/html,application/json,*/*"}
PAESI = re.compile(r"ital|belg|luxem|irel|netherl|nederl|milan|rome|roma|brussel|amsterdam|dublin|rotterdam|utrecht", re.I)
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)

T("ZS api")
for q in ["", "&location=Italy", "&country=Italy"]:
    try:
        d = requests.get(f"https://jobs.zs.com/api/jobs?page=1&sortBy=relevance&descending=false&internal=false{q}", headers=H, timeout=30).json()
        jobs = d.get("jobs") or []
        print(f"  q={q!r}: totalCount={d.get('totalCount') or d.get('count')} n={len(jobs)} chiavi_top={list(d.keys())}")
        if jobs:
            j = jobs[0]["data"]
            print("   chiavi job:", sorted(j.keys()))
            for x in jobs[:4]:
                x = x["data"]
                print("   ·", x.get("title"), "|", x.get("city"), x.get("country"), x.get("country_code"), x.get("full_location"), "|", x.get("posted_date") or x.get("create_date"))
    except Exception as e:
        print("  ERR", e)

T("Gartner RSS")
try:
    r = requests.get("https://jobs.gartner.com/jobs/jobs-xml/?rss=true", headers=H, timeout=40)
    print("  ", r.status_code, len(r.text))
    items = re.findall(r"<item>([\s\S]*?)</item>", r.text)
    print("  item:", len(items))
    print("  primo:", items[0][:1200] if items else r.text[:800])
    locs = {}
    for it in items:
        for tag in ("location", "country", "city", "category"):
            for v in re.findall(rf"<[^>]*{tag}[^>]*>([^<]+)<", it, re.I):
                if PAESI.search(v):
                    locs[v.strip()] = locs.get(v.strip(), 0) + 1
    print("  sedi utili:", locs)
except Exception as e:
    print("  ERR", e)

T("Oliver Wyman Phenom (careers.marshmclennan.com)")
for pae in [None, "Italy"]:
    body = {"lang": "en_global", "deviceType": "desktop", "country": "global", "pageName": "oliver-wyman-search",
            "ddoKey": "refineSearch", "from": 0, "jobs": True, "counts": True, "size": 5,
            "all_fields": ["country", "company", "brand"], "siteType": "external", "keywords": "", "global": True,
            "selected_fields": ({"country": [pae]} if pae else {}), "pageId": "page20", "jdsource": "facets"}
    try:
        d = requests.post("https://careers.marshmclennan.com/widgets", json=body, headers={**H, "Content-Type": "application/json"}, timeout=30).json()
        rs = d.get("refineSearch", {})
        print(f"  paese={pae}: totalHits={rs.get('totalHits')}")
        for a in (rs.get("data") or {}).get("aggregations") or []:
            if a.get("field") in ("country", "company", "brand"):
                v = a.get("value") or {}
                print(f"   facet {a.get('field')}:", {k: n for k, n in v.items() if PAESI.search(k) or re.search(r'wyman|oliver', k, re.I)})
        for j in ((rs.get("data") or {}).get("jobs") or [])[:3]:
            print("   ·", j.get("title"), "|", j.get("country"), j.get("city"), "|", j.get("company"), j.get("brand"), "|", j.get("applyUrl") or j.get("jobUrl"))
    except Exception as e:
        print("  ERR", e)

T("OC&C")
r = requests.get("https://careers.occstrategy.com/vacancies/vacancy-search-results.aspx", headers=H, timeout=30)
t = re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", r.text))
print("  ", r.status_code, len(r.text)); print("  testo:", t[:1500])
for m in list(dict.fromkeys(re.findall(r'href="([^"]*vacanc[^"]*)"', r.text, re.I)))[:12]:
    print("   ↳", m)

T("L.E.K. tal.net (job board per regione)")
for ac in ["2", "1", "3", "4"]:
    u = f"https://lek.tal.net/vx/lang-en-GB/mobile-0/appcentre-{ac}/brand-2/candidate/jobboard/vacancy/{ {'2':3,'1':1,'3':5,'4':7}[ac] }/adv/"
    try:
        r = requests.get(u, headers=H, timeout=30)
        t = re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", r.text))
        print(f"\n  appcentre-{ac}: {r.status_code} {len(r.text)} · {t[:400]}")
        for m in list(dict.fromkeys(re.findall(r'href="([^"]*opp/[^"]*)"', r.text)))[:6]:
            print("   ↳", m[:200])
    except Exception as e:
        print("  ERR", e)

T("Grant Thornton Irlanda (Oracle)")
API = "https://ehzq.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
for site in ["GrantThorntonIrelandExperiencedHires", "CX_1"]:
    try:
        d = requests.get(API, params={"onlyData": "true", "expand": "requisitionList",
                                      "finder": f"findReqs;siteNumber={site},limit=5,offset=0"}, headers=H, timeout=30).json()
        it = d["items"][0]
        print(f"  {site}: TotalJobsCount={it.get('TotalJobsCount')} · es. {[(x.get('Title'), x.get('PrimaryLocation')) for x in it.get('requisitionList', [])[:3]]}")
    except Exception as e:
        print("  ", site, "ERR", str(e)[:200])

T("Siti JS: XHR, iframe e link")
from playwright.sync_api import sync_playwright
PAGINE = ["https://www.adlittle.com/en/careers/vacancies", "https://www.rolandberger.com/en/Join/Job-Search.html",
          "https://www.simon-kucher.com/en/careers/jobs", "https://www.ibm.com/careers/search?field_keyword_05[0]=Italy",
          "https://www.bernoni.it/lavora-con-noi/", "https://www.ria-grantthornton.it/lavora-con-noi/",
          "https://www.grantthornton.be/en/careers/", "https://www.grantthornton.lu/en/careers/",
          "https://www.grantthornton.nl/werken-bij/vacatures/", "https://www.grantthornton.ie/careers/"]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    for url in PAGINE:
        print(f"\n▶ {url}", flush=True)
        ctx = b.new_context(user_agent=H["User-Agent"], locale="en-US")
        pg = ctx.new_page()
        xhr = []
        pg.on("response", lambda resp: xhr.append((resp.status, resp.request.method, resp.url, resp.request.post_data))
              if resp.request.resource_type in ("xhr", "fetch") else None)
        try:
            pg.goto(url, wait_until="domcontentloaded", timeout=45000)
            pg.wait_for_timeout(9000)
            html = pg.content()
            print(f"  finale: {pg.url} ({len(html)})")
            for f in pg.frames[1:]:
                print("  iframe:", f.url[:200])
            for m in list(dict.fromkeys(re.findall(r'href="([^"]+)"', html)))[:400]:
                if re.search(r"job|vacan|vacature|position|opening|apply|career|lavora|offert", m, re.I) and not re.search(r"\.(css|js|png|svg|ico)", m):
                    print("   a:", m[:180])
            for st, me, u, body in xhr:
                if not re.search(r"google|gtm|analytics|cookie|consent|hotjar|linkedin|facebook|doubleclick|clarity|bing|onetrust|usercentrics|adobedc|demdex|\.svg|\.css|\.woff|youtube|vimeo|hubspot|segment|sentry|newrelic|qualtrics|trustarc", u, re.I):
                    print(f"  XHR {st} {me} {u[:220]}" + (f"  body={body[:200]}" if body else ""))
        except Exception as e:
            print("  ERRORE", str(e)[:200])
        ctx.close()
    b.close()
