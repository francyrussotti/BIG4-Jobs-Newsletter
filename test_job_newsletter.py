"""Test offline di job_newsletter.py: nessuna richiesta di rete, nessuna email.
Avvio:  python -m unittest -v test_job_newsletter
"""
import json
import os
import tempfile
import unittest
from unittest import mock

import job_newsletter as jn


class FintaRisposta:
    def __init__(self, testo="", dati=None, url="https://esempio.it"):
        self.text = testo
        self._dati = dati
        self.url = url

    def json(self):
        if self._dati is None:
            raise ValueError("non JSON")
        return self._dati


class ConFileTemporaneo(unittest.TestCase):
    """Ogni test lavora su un seen_jobs.json temporaneo."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.seen_file = os.path.join(self.dir.name, "seen_jobs.json")
        p = mock.patch.object(jn, "SEEN_FILE", self.seen_file)
        p.start()
        self.addCleanup(p.stop)
        self.addCleanup(self.dir.cleanup)
        jn.COPERTURA.clear()


class TestSeen(ConFileTemporaneo):
    def test_file_assente_parte_da_zero(self):
        self.assertEqual(jn.carica_seen(), (set(), []))

    def test_file_corrotto_blocca_la_run(self):
        with open(self.seen_file, "w") as f:
            f.write('{"ids": ["abc", ')          # JSON troncato
        with self.assertRaises(jn.SeenIlleggibile):
            jn.carica_seen()

    def test_conflitto_di_merge_blocca_la_run(self):
        with open(self.seen_file, "w") as f:
            f.write('<<<<<<< HEAD\n{"ids": []}\n=======\n{"ids": ["x"]}\n>>>>>>> abc\n')
        with self.assertRaises(jn.SeenIlleggibile):
            jn.carica_seen()

    def test_struttura_inattesa_blocca_la_run(self):
        with open(self.seen_file, "w") as f:
            json.dump(["a", "b"], f)
        with self.assertRaises(jn.SeenIlleggibile):
            jn.carica_seen()

    def test_salvataggio_e_rilettura(self):
        storico = [{"data": "2026-10-01", "conteggi": {"EY": 3}}] * 20
        jn.salva_seen({"b", "a"}, storico)
        ids, st = jn.carica_seen()
        self.assertEqual(ids, {"a", "b"})
        self.assertEqual(len(st), jn.STORICO_MAX_RUN)
        self.assertFalse(os.path.exists(self.seen_file + ".tmp"))


class TestDeduplica(unittest.TestCase):
    def test_doppione_nella_stessa_raccolta_compare_una_volta(self):
        o = {"titolo": "Analyst", "url": "https://x/1"}
        nuove, seen = jn.filtra_nuove("EY", [o, dict(o)], set())
        self.assertEqual(len(nuove), 1)
        self.assertEqual(len(seen), 1)

    def test_gia_vista_non_torna(self):
        o = {"titolo": "Analyst", "url": "https://x/1"}
        _, seen = jn.filtra_nuove("EY", [o], set())
        nuove, _ = jn.filtra_nuove("EY", [o], seen)
        self.assertEqual(nuove, [])


class TestHealthCheck(unittest.TestCase):
    def setUp(self):
        jn.COPERTURA.clear()

    def test_zero_e_bloccante(self):
        pb = jn.health_check({"EY": 0}, {}, [])
        self.assertEqual(pb[0][0], "bloccante")

    def test_gli_zeri_storici_non_abbassano_la_mediana(self):
        # Storico: 100 offerte con 3 giorni a zero (scraper rotto). Oggi 40:
        # con gli zeri inclusi la mediana scenderebbe e il calo non verrebbe visto.
        storico = [{"conteggi": {"X": v}} for v in (100, 100, 0, 0, 0, 100)]
        pb = jn.health_check({"X": 40}, {"X": 0}, storico)
        self.assertTrue(any(g == "sospetto" for g, _, _ in pb))


class TestDate(unittest.TestCase):
    def test_formati(self):
        self.assertEqual(jn._eta_giorni("oggi"), 0)
        self.assertEqual(jn._eta_giorni("Offerta pubblicata ieri"), 1)
        self.assertEqual(jn._eta_giorni("Offerta pubblicata 9 giorni fa"), 9)
        self.assertEqual(jn._eta_giorni("più di 30 giorni fa"), 31)
        self.assertIsNone(jn._eta_giorni(""))
        self.assertIsNone(jn._eta_giorni("2026-02-31"))   # data impossibile


class TestPaginazioneSenzaFine(unittest.TestCase):
    """Siti che, oltre l'ultima pagina, ripetono sempre la stessa pagina:
    gli scraper devono fermarsi invece di girare all'infinito."""

    def setUp(self):
        p = mock.patch.object(jn.time, "sleep")
        p.start()
        self.addCleanup(p.stop)

    def test_ntt_data(self):
        html = ('<a class="job-detail-link" href="/job/1"><span class="is-h5">A</span></a>'
                '<a class="job-detail-link" href="/job/2"><span class="is-h5">B</span></a>')
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(html)) as g:
            out = jn.scrape_nttdata()
        self.assertEqual(len(out), 2)
        self.assertEqual(g.call_count, 2)

    def test_digital360(self):
        html = ('<div class="positions-item"><div class="item-pre-heading"><p>P4I</p>'
                '<p>Milano</p></div><h3 class="item-heading">Consultant</h3>'
                '<div class="item-actions"><a href="https://d/1">x</a></div></div>')
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(html)) as g:
            out = jn.scrape_digital360()
        self.assertEqual(len(out), 1)
        self.assertEqual(g.call_count, 2)

    def test_kpmg(self):
        righe = "".join(f'<tr><td><a href="/job/{i}">Job {i}</a></td><td>Milano</td></tr>'
                        for i in range(5))
        html = f'<table id="searchresults"><tbody>{righe}</tbody></table>'
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(html)) as g:
            out = jn.scrape_kpmg()
        self.assertEqual(len(out), 5)
        self.assertEqual(g.call_count, 2)


class TestRisposteStrane(unittest.TestCase):
    def setUp(self):
        p = mock.patch.object(jn.time, "sleep")
        p.start()
        self.addCleanup(p.stop)

    def test_capgemini_totale_null(self):
        dati = {"total": None, "data": [{"title": "Dev", "apply_job_url": "https://c/1",
                                         "location": "Roma"}]}
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(dati=dati)):
            out = jn.scrape_capgemini()
        self.assertEqual(len(out), 1)

    def test_bip_totale_null(self):
        dati = {"items": [{"TotalJobsCount": None, "requisitionList": [
            {"Id": "1", "Title": "Analyst", "PrimaryLocationCountry": "IT"},
            {"Id": "2", "Title": "Analyst", "PrimaryLocationCountry": "FR"}]}]}
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(dati=dati)):
            out = jn.scrape_bip()
        self.assertEqual([o["titolo"] for o in out], ["Analyst"])

    def test_bip_risposta_non_json(self):
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta("<html>")):
            self.assertEqual(jn.scrape_bip(), [])


class TestMain(ConFileTemporaneo):
    """Flusso completo con scraper finti."""

    NOMI = ["scrape_ey", "scrape_pwc_italia", "scrape_pwc_belgio", "scrape_deloitte",
            "scrape_kpmg", "scrape_accenture", "scrape_nttdata", "scrape_bip",
            "scrape_digital360", "scrape_capgemini"]

    def esegui(self, stato_invio):
        patches = [mock.patch.object(jn, n, return_value=[
            {"titolo": f"Ruolo {n}", "url": f"https://x/{n}", "data": ""}]) for n in self.NOMI]
        patches += [mock.patch.object(jn, "invia_email", return_value=stato_invio),
                    mock.patch.object(jn.time, "sleep")]
        for p in patches:
            p.start()
        try:
            try:
                jn.main()
            except SystemExit:
                pass
        finally:
            for p in patches:
                p.stop()
        with open(self.seen_file) as f:
            return json.load(f)

    def test_email_inviata_segna_le_offerte(self):
        dati = self.esegui("ok")
        self.assertEqual(len(dati["ids"]), len(self.NOMI))
        self.assertEqual(len(dati["storico_conteggi"]), 1)

    def test_email_fallita_non_perde_le_offerte(self):
        dati = self.esegui("errore")
        self.assertEqual(dati["ids"], [])                  # verranno riproposte domani
        self.assertEqual(len(dati["storico_conteggi"]), 1)  # lo storico si aggiorna comunque

    def test_una_sola_newsletter_al_giorno(self):
        dati = self.esegui("ok")
        self.assertEqual(dati["ultimo_invio"], jn.oggi_italia())
        # Seconda run dello stesso giorno: si ferma prima di raccogliere e inviare
        with mock.patch.object(jn, "invia_email") as invio, \
             mock.patch.object(jn, "scrape_ey") as ey:
            jn.main()
        invio.assert_not_called()
        ey.assert_not_called()

    def test_forza_invia_di_nuovo(self):
        self.esegui("ok")
        with mock.patch.dict(os.environ, {"NEWSLETTER_FORZA": "true"}):
            dati = self.esegui("ok")
        self.assertEqual(len(dati["storico_conteggi"]), 2)

    def test_invio_fallito_lascia_riprovare(self):
        dati = self.esegui("errore")
        self.assertIsNone(dati.get("ultimo_invio"))
        dati = self.esegui("ok")                         # l'orario di riserva riprova
        self.assertEqual(dati["ultimo_invio"], jn.oggi_italia())
        self.assertEqual(len(dati["ids"]), len(self.NOMI))

    def test_seen_corrotto_non_invia_e_non_sovrascrive(self):
        with open(self.seen_file, "w") as f:
            f.write("{rotto")
        with mock.patch.object(jn, "invia_email") as invio:
            with self.assertRaises(SystemExit):
                jn.main()
        invio.assert_not_called()
        with open(self.seen_file) as f:
            self.assertEqual(f.read(), "{rotto")


if __name__ == "__main__":
    unittest.main()
