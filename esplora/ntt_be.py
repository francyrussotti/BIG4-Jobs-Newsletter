"""Esplorazione temporanea: dove pubblica le offerte NTT DATA Belgio?"""
import re, requests
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Accept-Language": "en,it;q=0.8"}
ATS = re.compile(r"https?://[^\s\"'<>]*(myworkdayjobs|successfactors|smartrecruiters|greenhouse|lever\.co|"
                 r"teamtailor|recruitee|workable|avature|phenom|eightfold|icims|taleo|oraclecloud|jobvite|"
                 r"careers?\.|jobs\.)[^\s\"'<>]*", re.I)
URLS = [
 "https://www.nttdata.com/be/en/careers", "https://www.nttdata.com/be/nl/careers",
 "https://www.nttdata.com/be/fr/careers", "https://www.nttdata.com/be/en",
 "https://www.nttdata.com/global/en/careers", "https://www.nttdata.com/global/en/careers/job-search",
 "https://be.nttdata.com/", "https://be.nttdata.com/careers", "https://it.nttdata.com/career/posizioni-aperte",
 "https://careers.services.global.ntt/global/en", "https://nttdata.com/careers",
 "https://dejobs.org/diegem-bel/freelance-azure-software-engineer/F2D867436AA94B9C85FACADEC40A8FF3/job",
 "https://dejobs.org/diegem-bel/microsoft-sharepoint-erp-architect/141374F38ED74C908776F0824E2AAB42/job/",
 "https://builtin.com/job/senior-solutions-architect/4502254",
 "https://builtin.com/job/freelance-lead-devops-azure-environement/4045589",
 "https://www.welcometothejungle.com/en/companies/ntt-ltd/jobs/senior-data-governance-specialist_bruxelles",
]
for u in URLS:
    print("\n" + "=" * 80 + "\n" + u)
    try:
        r = requests.get(u, headers=H, timeout=25, allow_redirects=True)
        print(f"  status {r.status_code} · finale {r.url} · {len(r.text)} byte")
        t = re.search(r"<title>(.*?)</title>", r.text, re.S | re.I)
        print("  title:", (t.group(1).strip()[:120] if t else "-"))
        visti = []
        for m in ATS.finditer(r.text):
            x = m.group(0)[:200]
            if x not in visti and not re.search(r"\.(css|js|png|svg|jpg|woff2?)(\?|$)", x):
                visti.append(x)
        for x in visti[:40]:
            print("   ·", x)
        for m in re.finditer(r'href="([^"]*(job|career|vacan|apply)[^"]*)"', r.text, re.I):
            print("   href:", m.group(1)[:200])
    except Exception as e:
        print("  ERRORE", e)
