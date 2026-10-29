"""Esplorazione temporanea: portali carriere ufficiali delle nuove aziende."""
import re, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8", "Accept": "text/html,application/json,*/*"}
ATS = re.compile(r"https?://[^\s\"'<>\\]*(myworkdayjobs|successfactors|smartrecruiters|greenhouse|lever\.co|"
                 r"teamtailor|recruitee|workable|avature|phenom|eightfold|icims|taleo|oraclecloud|jobvite|"
                 r"personio|bamboohr|join\.com|ashby|careers?\.|jobs\.|werkenbij)[^\s\"'<>\\]*", re.I)
PAGINE = {
 "Arthur D. Little": ["https://www.adlittle.com/en/careers", "https://www.adlittle.com/en/careers/vacancies"],
 "Gartner": ["https://jobs.gartner.com/jobs/", "https://www.gartner.com/en/careers"],
 "ZS": ["https://jobs.zs.com/", "https://www.zs.com/careers"],
 "Roland Berger": ["https://www.rolandberger.com/en/Join/", "https://www.rolandberger.com/en/Join/Job-Search.html"],
 "Grant Thornton": ["https://www.bernoni.it/lavora-con-noi/", "https://www.ria-grantthornton.it/lavora-con-noi/",
                    "https://www.grantthornton.be/en/careers/", "https://www.grantthornton.lu/careers/",
                    "https://www.grantthornton.ie/careers/", "https://www.grantthornton.nl/werken-bij/"],
 "IBM Consulting": ["https://www.ibm.com/careers/search"],
 "Simon-Kucher": ["https://www.simon-kucher.com/en/careers", "https://www.simon-kucher.com/en/careers/jobs"],
 "Oliver Wyman": ["https://www.oliverwyman.com/careers.html", "https://www.oliverwyman.com/careers/job-search.html"],
 "OC&C": ["https://www.occstrategy.com/en/careers", "https://www.occstrategy.com/en/careers/vacancies"],
 "L.E.K.": ["https://www.lek.com/careers", "https://www.lek.com/join-lek"],
}
def T(t): print("\n" + "=" * 90 + "\n" + t + "\n" + "=" * 90, flush=True)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--no-sandbox"])
    for azienda, urls in PAGINE.items():
        T(azienda)
        for url in urls:
            print(f"\n▶ {url}", flush=True)
            ctx = b.new_context(user_agent=H["User-Agent"], locale="en-US")
            pg = ctx.new_page()
            xhr = []
            def on_resp(resp):
                if resp.request.resource_type in ("xhr", "fetch") and not re.search(
                        r"google|gtm|analytics|cookie|consent|hotjar|linkedin|facebook|doubleclick|clarity|bing|"
                        r"onetrust|cdn|\.svg|\.css|\.js(\?|$)|youtube|vimeo|hubspot|segment|sentry|newrelic", resp.url, re.I):
                    try:
                        txt = resp.text()[:4000]
                    except Exception:
                        txt = ""
                    if re.search(r"job|vacanc|requisition|title|position", txt, re.I):
                        xhr.append((resp.status, resp.request.method, resp.url, resp.request.post_data, txt[:500]))
            pg.on("response", on_resp)
            try:
                pg.goto(url, wait_until="networkidle", timeout=45000)
                pg.wait_for_timeout(4000)
                html = pg.content()
                print(f"  finale: {pg.url} ({len(html)})")
                ats = []
                for m in ATS.finditer(html):
                    x = m.group(0)[:180]
                    if x not in ats and not re.search(r"\.(css|js|png|svg|jpg|woff2?|ico|webp)(\?|$)", x):
                        ats.append(x)
                for x in ats[:15]:
                    print("   ·", x)
                links = list(dict.fromkeys(re.findall(r'href="([^"]*(?:/job/|/jobs/|vacanc|vacature|requisition|JobDetail|position)[^"]*)"', html, re.I)))
                print(f"  link offerta: {len(links)}")
                for l in links[:6]:
                    print("    ↳", l[:180])
                for st, me, u, body, txt in xhr[:6]:
                    print(f"  XHR {st} {me} {u[:200]}")
                    if body:
                        print("     body:", body[:300])
                    print("     resp:", txt.replace("\n", " ")[:300])
            except Exception as e:
                print("  ERRORE", str(e)[:200])
            ctx.close()
    b.close()
