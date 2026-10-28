"""Esplorazione temporanea: portali ufficiali per Belgio, Lussemburgo, Irlanda, Paesi Bassi."""
import re, json, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "application/json, text/html, */*"}
PAESI = re.compile(r"belg|luxem|irel|netherl|nederl|dublin|amsterdam|rotterdam|utrecht|cork|limerick|galway|"
                   r"eindhoven|hague|haag|amstelveen|zwolle|groningen|brussel|bruxel|antwer|ghent|gent|li[eè]ge|"
                   r"diegem|zaventem|hasselt|mechelen|kirchberg", re.I)
ATS = re.compile(r"https?://[^\s\"'<>]*(myworkdayjobs|successfactors|smartrecruiters|greenhouse|lever\.co|"
                 r"teamtailor|recruitee|workable|avature|phenom|eightfold|icims|taleo|oraclecloud|jobvite|yello|"
                 r"careers?\.|jobs\.|werkenbij)[^\s\"'<>]*", re.I)
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)

def links(u):
    try:
        r = requests.get(u, headers=H, timeout=25)
        print(f"  {u} → {r.status_code} {r.url} ({len(r.text)})")
        seen = []
        for m in ATS.finditer(r.text):
            x = m.group(0)[:180]
            if x not in seen and not re.search(r"\.(css|js|png|svg|jpg|woff2?|ico)(\?|$)", x):
                seen.append(x)
        for x in seen[:25]:
            print("     ·", x)
    except Exception as e:
        print("  ", u, "ERRORE", e)

# 1) Accenture Workday: facet paese
T("ACCENTURE facet locationCountry")
r = requests.post("https://accenture.wd103.myworkdayjobs.com/wday/cxs/accenture/AccentureCareers/jobs",
                  json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""},
                  headers={**H, "Content-Type": "application/json",
                           "Origin": "https://accenture.wd103.myworkdayjobs.com"}, timeout=30)
print(" status", r.status_code)
try:
    for f in r.json().get("facets", []):
        def walk(vals, par):
            for v in vals:
                if "values" in v:
                    walk(v["values"], v.get("facetParameter"))
                elif PAESI.search(v.get("descriptor", "")):
                    print(f"   [{par}] {v.get('descriptor')} = {v.get('id')} ({v.get('count')})")
        walk(f.get("values", []), f.get("facetParameter"))
except Exception as e:
    print(" ERR", e, r.text[:200])

# 2) PwC Workday: facet sedi
T("PWC Workday facet")
for site in ["Global_Campus_Careers", "Global_Experienced_Careers"]:
    r = requests.post(f"https://pwc.wd3.myworkdayjobs.com/wday/cxs/pwc/{site}/jobs",
                      json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""},
                      headers={**H, "Content-Type": "application/json"}, timeout=30)
    print(site, r.status_code, "total", r.json().get("total"))
    for f in r.json().get("facets", []):
        for g in f.get("values", []):
            for v in g.get("values", []) if "values" in g else [g]:
                if PAESI.search(v.get("descriptor", "")):
                    print(f"   [{g.get('facetParameter', f.get('facetParameter'))}] {v.get('descriptor')} ({v.get('count')})")

# 3) NTT DATA Phenom
T("NTT DATA Phenom per paese")
for paese in ["Belgium", "Luxembourg", "Ireland", "Netherlands"]:
    body = {"lang": "en_global", "deviceType": "desktop", "country": "global", "pageName": "search-results",
            "ddoKey": "refineSearch", "from": 0, "jobs": True, "counts": True, "size": 5,
            "all_fields": ["country"], "siteType": "external", "keywords": "", "global": True,
            "selected_fields": {"country": [paese]}, "pageId": "page20", "jdsource": "facets"}
    d = requests.post("https://careers.nttdata.com/widgets", json=body, headers={**H, "Content-Type": "application/json"}, timeout=30).json()
    print(f"  {paese}: {d['refineSearch'].get('totalHits')}")

# 4) Capgemini
T("CAPGEMINI country_code")
for cc in ["it-it", "be-en", "be-nl", "be-fr", "nl-nl", "nl-en", "ie-en", "en-ie", "lu-en", "lu-fr", "fr-lu", "benelux-en"]:
    try:
        d = requests.get("https://cg-jobstream-api.azurewebsites.net/api/job-search", params={"country_code": cc, "page": 1, "size": 3},
                         headers=H, timeout=20).json()
        print(f"  {cc}: total {d.get('total')} · es. {[ (j.get('title'), j.get('location')) for j in (d.get('data') or [])[:2]]}")
    except Exception as e:
        print("  ", cc, "ERR", e)

# 5) Bip: paesi presenti
T("BIP paesi")
from collections import Counter
c, off = Counter(), 0
while off < 1000:
    d = requests.get("https://fa-etjb-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions",
                     params={"onlyData": "true", "expand": "requisitionList",
                             "finder": f"findReqs;siteNumber=CX_1,limit=25,offset={off},sortBy=POSTING_DATES_DESC"},
                     headers=H, timeout=30).json()["items"][0]
    reqs = d.get("requisitionList") or []
    c.update(r.get("PrimaryLocationCountry") for r in reqs)
    off += 25
    if not reqs or off >= (d.get("TotalJobsCount") or 0):
        break
print(" ", dict(c))

# 6) EY: ricerche Yello + siti nazionali
T("EY")
BASE = "https://eyglobal.yello.co/job_boards/c1riT--B2O-KySgYWsZO1Q"
for q in ["dublin", "cork", "luxembourg", "amsterdam", "rotterdam", "ireland", "netherlands"]:
    try:
        j = requests.get(f"{BASE}/search?query={q}&locale=it&page_number=1",
                         headers={**H, "X-Requested-With": "XMLHttpRequest"}, timeout=25).json()
        print(f"  yello {q}: {j.get('display_count_text')}")
    except Exception as e:
        print("  yello", q, "ERR", e)
for u in ["https://www.ey.com/en_ie/careers", "https://www.ey.com/en_nl/careers", "https://www.ey.com/en_lu/careers",
          "https://careers.ey.com/ey/search/?q=&locationsearch=Dublin", "https://careers.ey.com/ey/search/?q=&locationsearch=Luxembourg"]:
    links(u)

# 7) Deloitte, KPMG, PwC, Accenture: siti nazionali → portali
T("SITI NAZIONALI")
for u in ["https://www.deloitte.com/be/en/careers.html", "https://www.deloitte.com/lu/en/careers.html",
          "https://www.deloitte.com/ie/en/careers.html", "https://www.deloitte.com/nl/nl/careers.html",
          "https://jobs.deloitte.ie/", "https://www.werkenbijdeloitte.nl/",
          "https://kpmg.com/be/en/home/careers.html", "https://kpmg.com/lu/en/home/careers.html",
          "https://kpmg.com/ie/en/home/careers.html", "https://www.werkenbijkpmg.nl/",
          "https://www.pwc.lu/en/careers.html", "https://www.pwc.ie/careers.html", "https://www.werkenbijpwc.nl/",
          "https://www.bip-group.com/careers/", "https://www.capgemini.com/be-en/careers/", "https://www.capgemini.com/nl-nl/careers/"]:
    links(u)
