"""Esplorazione temporanea (4): siti caricati via JavaScript."""
import re, json, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "application/json, text/html, */*"}
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)

T("SuccessFactors Career Site Builder: API /services/recruiting/v1/jobs")
for host in ["https://careers.kpmg.lu", "https://jobs.deloitte.lu"]:
    s = requests.Session()
    try:
        s.get(host + "/search/?q=", headers=H, timeout=30)
        body = {"locale": "en_US", "pageNumber": 0, "sortBy": "", "keywords": "", "location": "",
                "facetFilters": {}, "brand": "", "skills": [], "categoryId": 0, "alertId": "", "rcmCandidateId": ""}
        r = s.post(host + "/services/recruiting/v1/jobs", json=body,
                   headers={**H, "Content-Type": "application/json", "Origin": host, "Referer": host + "/search/?q="}, timeout=30)
        print(host, r.status_code, r.text[:1500])
    except Exception as e:
        print(host, "ERR", e)

T("KPMG ema-careers per paese")
for q in ["Ireland", "Netherlands", "Luxembourg", "Belgium"]:
    r = requests.get(f"https://ema-careers.kpmg.com/search/?q=&locationsearch={q}", headers=H, timeout=30)
    t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", r.text))
    m = re.search(r"\d+\s*[–-]\s*\d+\s*of\s*\d+", t)
    locs = re.findall(r'<span class="jobLocation">\s*([^<]+?)\s*</span>', r.text)
    print(f"  {q}: {m.group(0) if m else 'nessun conteggio'} · sedi: {sorted(set(locs))[:12]}")
r = requests.get("https://ema-careers.kpmg.com/search/?q=&locationsearch=Belgium", headers=H, timeout=30)
m = re.search(r'<tr class="data-row[\s\S]{0,1600}', r.text)
print("  RIGA:", m.group(0) if m else "-")

T("EY careers.ey.com: riga completa e paginazione")
r = requests.get("https://careers.ey.com/ey/search/?q=&optionsFacetsDD_country=IT&startrow=25", headers=H, timeout=30)
t = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", r.text))
print("  startrow=25:", re.search(r"\d+\s*[–-]\s*\d+\s*of\s*\d+", t).group(0) if re.search(r"\d+\s*[–-]\s*\d+\s*of\s*\d+", t) else "-")
for m in re.finditer(r'<th[^>]*id="(hdr\w+)"', r.text):
    print("  colonna:", m.group(1))
m = re.search(r'<tr class="data-row[\s\S]{0,2500}?</tr>', r.text)
print("  RIGA:", m.group(0) if m else "-")

T("Playwright: chiamate XHR")
from playwright.sync_api import sync_playwright
PAGINE = ["https://www.werkenbijkpmg.nl/vacatures", "https://werkenbijdeloitte.nl/vacatures/",
          "https://werkenbijpwc.nl/vacatures", "https://www.pwc.nl/nl/vacatures.html",
          "https://kpmg.com/ie/en/careers/experienced-professionals.html", "https://careers.kpmg.lu/search/?q=",
          "https://jobs.deloitte.lu/go/View-all-Jobs/9826901/"]
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    for url in PAGINE:
        print(f"\n▶ {url}", flush=True)
        ctx = b.new_context(user_agent=H["User-Agent"], locale="en-US")
        pg = ctx.new_page()
        def on_resp(resp, url=url):
            rt = resp.request.resource_type
            if rt in ("xhr", "fetch") and not re.search(r"google|gtm|analytics|cookie|consent|hotjar|linkedin|facebook|doubleclick|clarity|bing|secureprivacy|onetrust|cdn", resp.url, re.I):
                try:
                    txt = resp.text()
                except Exception:
                    txt = ""
                print(f"  XHR {resp.status} {resp.request.method} {resp.url[:200]}")
                if resp.request.method == "POST":
                    print("     body:", (resp.request.post_data or "")[:400])
                if re.search(r"vacan|job|title", txt[:5000], re.I):
                    print("     resp:", txt[:900].replace("\n", " "))
        pg.on("response", on_resp)
        try:
            pg.goto(url, wait_until="networkidle", timeout=60000)
            pg.wait_for_timeout(5000)
            html = pg.content()
            t = re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", html))
            for m in set(re.findall(r"\d[\d.]*\s*(?:vacatures|vacancies|results|jobs|resultaten)|\d+\s*[–-]\s*\d+\s*of\s*\d+", t, re.I)):
                print("  conteggio:", m)
            links = list(dict.fromkeys(re.findall(r'href="([^"]*(?:/vacature|/vacancies/|/job/|/jobs/|myworkday|JobDetail)[^"]*)"', html, re.I)))
            print(f"  link offerta: {len(links)}")
            for l in links[:8]:
                print("    ·", l[:180])
        except Exception as e:
            print("  ERRORE", e)
        ctx.close()
    b.close()
