"""Esplorazione temporanea (3): dettagli dei portali delle nuove aziende."""
import re, json, requests
from collections import Counter
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "text/html,application/json,*/*"}
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)
def testo(h): return re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", h))

T("Gartner RSS: struttura item")
r = requests.get("https://jobs.gartner.com/jobs/jobs-xml/?rss=true", headers=H, timeout=60)
items = re.findall(r"<item>([\s\S]*?)</item>", r.text)
senza_desc = re.sub(r"<description>[\s\S]*?</description>", "<description/>", items[0]) if items else ""
print(senza_desc[:1500])
tags = Counter(t for it in items[:50] for t in re.findall(r"<([\w:]+)[ >]", re.sub(r"<description>[\s\S]*?</description>", "", it)))
print("tag:", dict(tags))
for tag in [t for t in tags if t not in ("title", "link", "guid", "description", "pubDate")]:
    vals = Counter(v.strip() for it in items for v in re.findall(rf"<{re.escape(tag)}[^>]*>([^<]*)<", it))
    print(f"  {tag}:", [(k, n) for k, n in vals.most_common(400) if re.search(r"ital|belg|luxem|irel|nether|milan|rome|brussel|amsterdam|dublin|den bosch|hertogenbosch", k, re.I)][:20])

T("OC&C: righe e paginazione")
r = requests.get("https://careers.occstrategy.com/vacancies/vacancy-search-results.aspx", headers=H, timeout=30)
i = r.text.find("vacancy-apply.aspx?VacancyID=")
print(r.text[max(0, i - 2500): i + 300])
print("campi form:", re.findall(r'name="(__[A-Z]+|[^"]*PageSize[^"]*|[^"]*Pager[^"]*)"', r.text)[:15])
print("sedi:", Counter(re.findall(r"Location\s*</[^>]+>\s*<[^>]+>\s*([^<]+)<", r.text)))

T("L.E.K. Europa: righe")
r = requests.get("https://lek.tal.net/vx/lang-en-GB/mobile-0/system-42/appcentre-1/brand-2/candidate/jobboard/vacancy/1/adv/", headers=H, timeout=30)
i = r.text.find("/opp/")
print(r.text[max(0, i - 1500): i + 1500])
print("totale testo:", re.findall(r"(\d+)\s*(?:results|Results|vacancies|opportunities)", testo(r.text))[:5])
print("link opp:", len(set(re.findall(r'/opp/\d+', r.text))))
print("sedi (filtro):", re.findall(r"(Milan|Amsterdam|Brussels|Dublin|Luxembourg|Rome)[^<]{0,40}", testo(r.text))[:10])

T("Grant Thornton Irlanda Oracle: paesi")
API = "https://ehzq.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions"
c, off = Counter(), 0
while off < 400:
    d = requests.get(API, params={"onlyData": "true", "expand": "requisitionList",
                                  "finder": f"findReqs;siteNumber=GrantThorntonIrelandExperiencedHires,limit=25,offset={off}"}, headers=H, timeout=30).json()["items"][0]
    reqs = d.get("requisitionList") or []
    c.update(x.get("PrimaryLocationCountry") for x in reqs)
    off += 25
    if not reqs or off >= (d.get("TotalJobsCount") or 0): break
print("  ", dict(c))
for site in ["GrantThorntonIrelandEarlyCareers", "GrantThorntonIrelandGraduates", "GrantThorntonIreland"]:
    try:
        d = requests.get(API, params={"onlyData": "true", "expand": "requisitionList",
                                      "finder": f"findReqs;siteNumber={site},limit=3,offset=0"}, headers=H, timeout=30).json()
        print(f"  {site}: {d['items'][0].get('TotalJobsCount')}")
    except Exception as e:
        print(f"  {site}: ERR {str(e)[:80]}")

T("Requests semplici")
for u in ["https://www.grantthornton.lu/en/careers/", "https://www.grantthornton.lu/", "https://careers.grantthornton.be/",
          "https://www.ria-grantthornton.it/careers/", "https://www.bernoni.it/", "https://www.adlittle.com/en/arthur_d_little_careers",
          "https://api.smartrecruiters.com/v1/companies/ArthurDLittle/postings?limit=5",
          "https://www.rolandberger.com/en/Join/All-Jobs/"]:
    try:
        r = requests.get(u, headers=H, timeout=30)
        ats = list(dict.fromkeys(re.findall(r"https?://[^\s\"'<>]*(?:myworkdayjobs|successfactors|smartrecruiters|greenhouse|lever\.co|teamtailor|recruitee|workable|avature|phenom|icims|taleo|oraclecloud|jobvite|personio|csod|softgarden|onlyfy|join\.com|inrecruiting|zucchetti|altamira|jobs\.|careers?\.)[^\s\"'<>]*", r.text)))
        print(f"\n▶ {u} → {r.status_code} {r.url} ({len(r.text)})")
        print("  ats:", ats[:12])
        print("  testo:", testo(r.text)[:500])
        print("  link:", list(dict.fromkeys(re.findall(r'href="([^"]*(?:job|vacan|vacature|position|offert|lavora|opportunit)[^"]*)"', r.text, re.I)))[:15])
    except Exception as e:
        print(f"\n▶ {u} ERR {str(e)[:150]}")

T("Playwright: XHR")
from playwright.sync_api import sync_playwright
PAGINE = ["https://careers.marshmclennan.com/global/en/oliver-wyman-search",
          "https://www.ibm.com/careers/search?field_keyword_05[0]=Italy",
          "https://simon-kucher.csod.com/ux/ats/careersite/6/home?c=simon-kucher",
          "https://www.rolandberger.com/en/Join/All-Jobs/",
          "https://www.grantthornton.nl/werken-bij/vacatures/", "https://careers.grantthornton.be/",
          "https://www.adlittle.com/en/careers/vacancies"]
RUMORE = re.compile(r"google|gtm|analytics|cookie|consent|hotjar|linkedin|facebook|doubleclick|clarity|bing|onetrust|usercentrics|"
                    r"adobedc|demdex|\.svg|\.css|\.woff|youtube|vimeo|hubspot|segment|sentry|newrelic|nr-data|qualtrics|trustarc|"
                    r"marketo|applicationinsights|optimizely|textrecruit|bigid", re.I)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    for url in PAGINE:
        print(f"\n▶ {url}", flush=True)
        ctx = b.new_context(user_agent=H["User-Agent"], locale="en-US")
        pg = ctx.new_page()
        xhr = []
        def on_resp(resp):
            if resp.request.resource_type not in ("xhr", "fetch") or RUMORE.search(resp.url):
                return
            try:
                body = resp.request.post_data
            except Exception:
                body = "<binario>"
            try:
                txt = resp.text()[:600]
            except Exception:
                txt = ""
            xhr.append((resp.status, resp.request.method, resp.url, body, txt))
        pg.on("response", on_resp)
        try:
            pg.goto(url, wait_until="domcontentloaded", timeout=45000)
            pg.wait_for_timeout(10000)
            html = pg.content()
            print(f"  finale: {pg.url} ({len(html)})")
            print("  testo:", testo(html)[:600])
            for st, me, u, body, txt in xhr[:15]:
                print(f"  XHR {st} {me} {u[:220]}")
                if body:
                    print("     body:", str(body)[:500])
                if re.search(r"job|title|requisition|vacanc", txt, re.I):
                    print("     resp:", txt.replace("\n", " ")[:500])
        except Exception as e:
            print("  ERRORE", str(e)[:200])
        ctx.close()
    b.close()
