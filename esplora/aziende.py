"""Prova temporanea (4): tutte le nuove fonti come le usa la newsletter."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import job_newsletter as jn
CHIAVI = ("Roland Berger", "Simon-Kucher", "Oliver Wyman", "Gartner", "Grant Thornton")
for nome, fn in jn.elenco_fonti():
    if not nome.startswith(CHIAVI):
        continue
    try:
        out = fn()
    except Exception as e:
        print(f"RISULTATO {nome}: ERRORE {e}")
        continue
    print(f"RISULTATO {nome}: {len(out)}")
    for o in out[:3]:
        print("   ·", o["titolo"], "|", o["location"], "|", o["data"], "|", o["url"])
