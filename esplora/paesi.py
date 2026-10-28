"""Esplorazione temporanea (3): portali nazionali di EY, KPMG, Deloitte, PwC."""
import re, json, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "text/html,application/json,*/*"}
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)
def testo(html): return re.sub(r"\s+", " ", re.sub(r"<(script|style)[\s\S]*?</\1>|<[^>]+>", " ", html))

def guarda(u, job_re=r'href="([^"]*(?:/job/|/jobs/|vacature|vacancy|JobDetail|/offer/)[^"]*)"', n=6, mostra=0):
    try:
        r = requests.get(u, headers=H, timeout=30)
    except Exception as e:
        print(f"\n▶ {u}\n  ERRORE {e}"); return None
    print(f"\n▶ {u}\n  {r.status_code} {r.url} ({len(r.text)})")
    t = testo(r.text)
    for m in set(re.findall(r"(?:\d+\s*[–-]\s*\d+\s*(?:of|di|van)\s*\d+|\d[\d.,]*\s*(?:results?|risultati|vacatures|vacancies|jobs|offres|positions|resultaten))", t, re.I)):
        print("  conteggio:", m)
    links = list(dict.fromkeys(re.findall(job_re, r.text, re.I)))
    print(f"  link offerta: {len(links)}")
    for l in links[:n]:
        print("    ·", l[:170])
    for m in list(dict.fromkeys(re.findall(r'["\']((?:https?://[^"\']+)?/[^"\'\s]*(?:api|graphql|ajax|search\.json|/wp-json/)[^"\'\s]*)["\']', r.text)))[:10]:
        print("  api?:", m[:170])
    if mostra:
        print("  testo:", t[:mostra])
    return r

T("EY careers.ey.com (SuccessFactors)")
for q in ["Italy", "Belgium", "Luxembourg", "Ireland", "Netherlands"]:
    r = guarda(f"https://careers.ey.com/ey/search/?q=&locationsearch={q}", n=3)
    if r is not None and q == "Ireland":
        m = re.search(r'<tr class="data-row[\s\S]{0,1500}', r.text)
        print("  RIGA:", m.group(0)[:1500] if m else "nessuna data-row")
for u in ["https://careers.ey.com/ey/search/?q=&optionsFacetsDD_country=IE",
          "https://careers.ey.com/ey/search/?q=&optionsFacetsDD_country=IT",
          "https://careers.ey.com/ey/search/?q=&optionsFacetsDD_country=NL"]:
    guarda(u, n=2)

T("KPMG")
guarda("https://careers.kpmg.lu/search/?q=", mostra=600)
guarda("https://ema-careers.kpmg.com/", mostra=600)
guarda("https://ema-careers.kpmg.com/search/?q=&locationsearch=Belgium", mostra=400)
r = guarda("https://kpmg.com/ie/en/careers.html", job_re=r'href="([^"]*(?:job|vacanc|apply|search|career)[^"]*)"', n=40)
guarda("https://www.werkenbijkpmg.nl/vacatures", mostra=600)
guarda("https://www.werkenbijkpmg.nl/en/vacancies", mostra=300)

T("DELOITTE")
r = guarda("https://deloittebe.avature.net/en_US/careers/SearchJobs/?jobRecordsPerPage=50", n=3)
if r is not None:
    print("  cards h3 JobDetail:", len(re.findall(r"<h3[^>]*>\s*<a[^>]+JobDetail", r.text)))
r = guarda("https://jobs.deloitte.lu/go/View-all-Jobs/9826901/", n=3)
if r is not None:
    m = re.search(r'<tr class="data-row[\s\S]{0,1200}', r.text)
    print("  RIGA:", m.group(0)[:1200] if m else "nessuna data-row")
for site in ["Early_Careers", "Experienced_Professionals"]:
    try:
        d = requests.post(f"https://deloitteie.wd3.myworkdayjobs.com/wday/cxs/deloitteie/{site}/jobs",
                          json={"appliedFacets": {}, "limit": 3, "offset": 0, "searchText": ""},
                          headers={**H, "Content-Type": "application/json", "Accept": "application/json"}, timeout=30).json()
        print(f"  Deloitte IE {site}: total {d.get('total')} · es. {[(j.get('title'), j.get('locationsText'), j.get('postedOn'), j.get('externalPath')) for j in d.get('jobPostings', [])[:2]]}")
    except Exception as e:
        print("  Deloitte IE", site, "ERR", e)
guarda("https://werkenbijdeloitte.nl/vacatures/", mostra=600)
guarda("https://werkenbijdeloitte.nl/en/vacancies/", mostra=300)

T("PWC Paesi Bassi")
guarda("https://werkenbijpwc.nl/", mostra=300)
guarda("https://werkenbijpwc.nl/vacatures", mostra=600)
guarda("https://www.pwc.nl/nl/werken-bij-pwc.html", job_re=r'href="([^"]*(?:vacature|job|werkenbij|myworkday|career)[^"]*)"', n=15)
