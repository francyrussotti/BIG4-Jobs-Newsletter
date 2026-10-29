"""Prova temporanea (3): Gartner per paese e filtro società nel Workday di Marsh McLennan."""
import sys, os, re, json, requests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
for paese in ["Italia", "Belgio", "Irlanda", "Paesi Bassi"]:
    out = jn.scrape_gartner(paese)
    for o in out[:3]:
        print("   ·", o["titolo"], "|", o["location"], "|", o["url"])
print("\nMMC Workday: facet")
api = "https://mmc.wd1.myworkdayjobs.com/wday/cxs/mmc/MMC/jobs"
d = requests.post(api, json={"appliedFacets": {}, "limit": 1, "offset": 0, "searchText": ""},
                  headers={**jn.HEADERS, "Content-Type": "application/json", "Accept": "application/json"}, timeout=30).json()
print("total", d.get("total"))
def giro(vals, par, liv=0):
    for v in vals:
        if "values" in v:
            print("  " * liv + f"[{v.get('facetParameter')}] {v.get('descriptor')}")
            giro(v["values"], v.get("facetParameter"), liv + 1)
        elif re.search(r"oliver|wyman|ital|belg|luxem|irel|nether|amsterdam|milan|brussel|dublin", v.get("descriptor", ""), re.I) or par in ("Company", "company", "brand", "jobFamilyGroup"):
            print("  " * liv + f"  {par}: {v.get('descriptor')} = {v.get('id')} ({v.get('count')})")
for f in d.get("facets", []):
    print(f"FACET {f.get('facetParameter')} ({len(f.get('values', []))} valori)")
    giro(f.get("values", []), f.get("facetParameter"), 1)
