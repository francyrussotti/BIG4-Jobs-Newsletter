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

    def test_zero_su_fonte_piccola_e_solo_sospetto(self):
        storico = [{"conteggi": {"Capgemini Irlanda": 1}}] * 3
        pb = jn.health_check({"Capgemini Irlanda": 0}, {}, storico)
        self.assertEqual(pb[0][0], "sospetto")
        storico = [{"conteggi": {"KPMG Italia": 200}}] * 3
        self.assertEqual(jn.health_check({"KPMG Italia": 0}, {}, storico)[0][0], "bloccante")

    def test_gli_zeri_storici_non_abbassano_la_mediana(self):
        # Storico: 100 offerte con 3 giorni a zero (scraper rotto). Oggi 40:
        # con gli zeri inclusi la mediana scenderebbe e il calo non verrebbe visto.
        storico = [{"conteggi": {"X": v}} for v in (100, 100, 0, 0, 0, 100)]
        pb = jn.health_check({"X": 40}, {"X": 0}, storico)
        self.assertTrue(any(g == "sospetto" for g, _, _ in pb))


    def test_zero_su_fonte_nuova_e_solo_sospetto(self):
        storico = [{"conteggi": {"EY": 50}}] * 3
        self.assertEqual(jn.health_check({"Gartner Italia": 0}, {}, storico)[0][0], "sospetto")
        # Dopo una settimana sempre a zero diventa bloccante
        storico = [{"conteggi": {"EY": 50, "Gartner Italia": 0}}] * 8
        self.assertEqual(jn.health_check({"Gartner Italia": 0}, {}, storico)[0][0], "bloccante")


class TestAltreSocieta(unittest.TestCase):
    def setUp(self):
        jn._CACHE_ELENCHI.clear()
        self.addCleanup(jn._CACHE_ELENCHI.clear)
        p = mock.patch.object(jn.time, "sleep")
        p.start()
        self.addCleanup(p.stop)

    def test_nel_paese(self):
        self.assertTrue(jn._nel_paese("Italia", "Milan, Italy"))
        self.assertTrue(jn._nel_paese("Belgio", "", ["be"]))
        self.assertFalse(jn._nel_paese("Irlanda", "Belfast, Northern Ireland"))
        self.assertTrue(jn._nel_paese("Irlanda", "Dublin"))
        self.assertFalse(jn._nel_paese("Paesi Bassi", "Paris; Munich"))

    def test_data_usa(self):
        self.assertEqual(jn._data_usa("7/1/2025"), "2025-07-01")
        self.assertEqual(jn._data_usa("12/25/2026 10:00"), "2026-12-25")
        self.assertEqual(jn._data_usa(""), "")

    def test_roland_berger_filtra_il_paese(self):
        jobs = [{"id": "1", "title": ["Consultant"], "location": ["Milan", "Munich"], "link": "https://rb/1"},
                {"id": "2", "title": ["Analyst"], "location": ["Paris"], "link": "https://rb/2"}]
        with mock.patch.object(jn, "_rb_tutte", return_value=(jobs, 2)) as tutte:
            it = jn.scrape_roland_berger("Italia")
            nl = jn.scrape_roland_berger("Paesi Bassi")
        tutte.assert_called_once()                       # scaricato una volta sola
        self.assertEqual(nl, [])
        self.assertEqual(len(it), 1)
        self.assertEqual(it[0]["location"], "Roland Berger Italia · Milan")
        self.assertEqual(it[0]["_id_src"], "rolandberger:1")

    def test_oliver_wyman_solo_titoli_oliver_wyman(self):
        jobs = [{"jobId": "R1", "title": "Oliver Wyman - Consultant", "city": "Milan", "postedDate": "2026-10-01T00:00"},
                {"jobId": "R2", "title": "Mercer - Actuary", "city": "Milan"}]
        with mock.patch.object(jn, "_phenom_generico", return_value=(jobs, 2)):
            out = jn.scrape_oliver_wyman("Italia")
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["url"], "https://careers.marsh.com/global/en/job/R1")
        self.assertEqual(out[0]["data"], "2026-10-01")

    def test_grant_thornton_belgio(self):
        dati = {"offers": [{"id": 9, "title": "Audit Senior", "careers_url": "https://gt/9",
                            "city": "Antwerpen", "published_at": "2026-10-20 10:00:00 UTC"}]}
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(dati=dati)):
            out = jn.scrape_grant_thornton_belgio()
        self.assertEqual(out[0]["location"], "Grant Thornton Belgio · Antwerpen")
        self.assertEqual(out[0]["data"], "2026-10-20")

    def test_gartner(self):
        pagina = ('<div class="card-job"><a href="/jobs/job/123-analyst/">Analyst Italy</a>'
                  '<span>Milan, Italy</span></div>')
        risposte = [FintaRisposta(testo=pagina), FintaRisposta(testo=pagina), FintaRisposta(testo="")]
        with mock.patch.object(jn, "http_get", side_effect=risposte):
            out = jn.scrape_gartner("Italia")
        self.assertEqual(len(out), 1)                    # la seconda pagina uguale non si duplica
        self.assertEqual(out[0]["url"], "https://jobs.gartner.com/jobs/job/123-analyst/")
        self.assertEqual(out[0]["titolo"], "Analyst Italy")
        self.assertEqual(out[0]["location"], "Gartner Italia · Milan, Italy")


class TestDate(unittest.TestCase):
    def test_formati(self):
        self.assertEqual(jn._eta_giorni("oggi"), 0)
        self.assertEqual(jn._eta_giorni("Offerta pubblicata ieri"), 1)
        self.assertEqual(jn._eta_giorni("Offerta pubblicata 9 giorni fa"), 9)
        self.assertEqual(jn._eta_giorni("più di 30 giorni fa"), 31)
        self.assertIsNone(jn._eta_giorni(""))
        self.assertIsNone(jn._eta_giorni("2026-02-31"))   # data impossibile


class TestRecuperoUnaTantum(unittest.TestCase):
    def test_offerte_ey_da_recuperare(self):
        with mock.patch.object(jn, "oggi_italia", return_value="2026-10-24"):
            self.assertTrue(jn._da_recuperare("EY", {"titolo": "Junior Accounting & Business Consultant - Tournai"}))
            self.assertFalse(jn._da_recuperare("EY", {"titolo": "Audit Senior - Milano"}))
            self.assertFalse(jn._da_recuperare("KPMG", {"titolo": "Consultant - Tournai"}))
        with mock.patch.object(jn, "oggi_italia", return_value="2026-12-01"):   # scaduto
            self.assertFalse(jn._da_recuperare("EY", {"titolo": "FAAS Trieste - Financial Services"}))


class TestNttData(unittest.TestCase):
    JOB_EMEAL = {"jobId": "P-1", "title": "SAP Service manager", "city": "Bruselas",
                 "postedDate": "2026-10-20T00:00:00.000+0000",
                 "applyUrl": "https://careers.emeal.nttdata.com/s/offer/a1JKA000000UXni2AG/sap-service-manager"
                             "?utm_medium=phenom&utm_source=OneNTTCareerPage"}
    JOB_WD = {"jobId": "R-2", "title": "Sales Specialist Network", "city": "Diegem",
              "postedDate": "2026-10-01T00:00:00.000+0000",
              "applyUrl": "https://nttlimited.wd3.myworkdayjobs.com/NTT_Careers/job/Diegem-Belgium/Sales_R-1/apply"}

    def test_belgio(self):
        with mock.patch.object(jn, "_nttdata_phenom", return_value=([self.JOB_EMEAL, self.JOB_WD], 2)):
            out = jn.scrape_nttdata_belgio()
        self.assertEqual(out[0]["location"], "NTT DATA Belgio · Bruxelles")
        self.assertNotIn("utm_", out[0]["url"])
        self.assertFalse(out[1]["url"].endswith("/apply"))
        self.assertEqual(out[1]["data"], "2026-10-01")
        self.assertEqual(jn._job_id("x", out[0]), jn._job_id("x", dict(out[0], url="altro")))  # ID stabile

    def test_italia_senza_doppioni(self):
        # Stessa offerta su it.nttdata.com (ID minuscolo nello slug) e sul portale globale
        html = ('<a class="job-detail-link" href="/jobs/a1jka000000uxni2ag-sap-service-manager">'
                '<span class="is-h5">SAP Service manager</span></a>')
        vuoto = FintaRisposta("<html></html>")
        with mock.patch.object(jn, "http_get", side_effect=[FintaRisposta(html), vuoto]), \
             mock.patch.object(jn, "_nttdata_phenom", return_value=([self.JOB_EMEAL, self.JOB_WD], 2)), \
             mock.patch.object(jn.time, "sleep"):
            out = jn.scrape_nttdata()
        self.assertEqual([o["titolo"] for o in out], ["SAP Service manager", "Sales Specialist Network"])

    def test_storico_rinominato(self):
        with tempfile.TemporaryDirectory() as d, \
             mock.patch.object(jn, "SEEN_FILE", os.path.join(d, "s.json")):
            with open(jn.SEEN_FILE, "w") as f:
                json.dump({"ids": [], "storico_conteggi": [{"conteggi": {"NTT DATA": 95}}]}, f)
            _, storico = jn.carica_seen()
        self.assertEqual(storico[0]["conteggi"], {"NTT DATA Italia": 95})


class TestNuoviPaesi(unittest.TestCase):
    def test_colori_e_nomi(self):
        self.assertEqual(jn.colore_marchio("Accenture Irlanda"), jn.BRAND_COLORS["Accenture"][0])
        self.assertEqual(jn.colore_marchio("EY Paesi Bassi"), jn.BRAND_COLORS["EY"][0])
        self.assertEqual(jn._azienda("NTT DATA Paesi Bassi"), "NTT DATA")
        self.assertEqual(jn._azienda("Digital360"), "Digital360")

    def test_successfactors_filtra_il_paese(self):
        riga = ('<tr class="data-row"><td><a class="jobTitle-link" href="/ey/job/{0}/">Job {0}</a></td>'
                '<td><span class="jobLocation">{1}</span></td></tr>')
        html = ("<p>1 – 3 of 3</p><table>" + riga.format(1, "Dublin, IE") + riga.format(2, "Cork, IE")
                + riga.format(3, "Hoboken, NJ, US") + "</table>")
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(html)), \
             mock.patch.object(jn.time, "sleep"):
            out = jn._sf_classico("https://careers.ey.com", "/ey/search/?q=", "EY Irlanda", "IE")
        self.assertEqual([o["location"] for o in out], ["EY Irlanda · Dublin", "EY Irlanda · Cork"])
        self.assertEqual(jn.COPERTURA["EY Irlanda"], (3, 3))

    def test_workday_esclude_belfast(self):
        dati = {"total": 2, "jobPostings": [
            {"title": "Audit Senior", "locationsText": "Belfast", "externalPath": "/job/Belfast/A_1"},
            {"title": "Tax Senior", "locationsText": "Dublin", "externalPath": "/job/Dublin/B_2",
             "postedOn": "Posted Today"}]}
        with mock.patch.object(jn, "http_post", return_value=FintaRisposta(dati=dati)), \
             mock.patch.object(jn.time, "sleep"):
            out = jn._workday("deloitteie.wd3.myworkdayjobs.com", "deloitteie", "Experienced_Professionals",
                              "Deloitte Irlanda", escludi="belfast")
        self.assertEqual([o["titolo"] for o in out], ["Tax Senior"])
        self.assertTrue(out[0]["url"].startswith("https://deloitteie.wd3.myworkdayjobs.com/en-US/"))


class TestPortaliNazionali(unittest.TestCase):
    def setUp(self):
        p = mock.patch.object(jn.time, "sleep")
        p.start()
        self.addCleanup(p.stop)

    def test_successfactors_nuovo(self):
        jobs = [{"id": "1967", "urlTitle": "Junior-Auditor", "unifiedStandardTitle": "Junior Auditor &amp; Tax",
                 "unifiedStandardStart": "16/09/2026", "jobLocationShort": ["Luxembourg, LUX, "]},
                {"id": "1967", "urlTitle": "Junior-Auditor", "unifiedStandardTitle": "Junior Auditor"}]
        with mock.patch.object(jn, "_sf_csb_requests", return_value=(jobs, 1)):
            out = jn._sf_csb("https://careers.kpmg.lu", "KPMG Lussemburgo")
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["titolo"], "Junior Auditor & Tax")
        self.assertEqual(out[0]["location"], "KPMG Lussemburgo · Luxembourg")
        self.assertEqual(out[0]["url"], "https://careers.kpmg.lu/job/Junior-Auditor/1967-en_GB")
        self.assertIsNotNone(jn._eta_giorni(out[0]["data"]))

    def test_successfactors_nuovo_prova_il_browser(self):
        with mock.patch.object(jn, "_sf_csb_requests", return_value=([], 0)), \
             mock.patch.object(jn, "_sf_csb_playwright", return_value=([{"id": "5", "urlTitle": "X",
                                                                         "unifiedStandardTitle": "X"}], 1)) as pw:
            out = jn._sf_csb("https://jobs.deloitte.lu", "Deloitte Lussemburgo", categoria=9826901)
        pw.assert_called_once()
        self.assertEqual(len(out), 1)

    def test_kpmg_paesi_bassi(self):
        dati = [{"title": "Test I am interested In", "searchable": None, "term_location": {"": ""}},
                {"title": "Cyber Defense Manager", "searchable": "<h1>Cyber</h1>",
                 "term_location": {"amstelveen": "Amstelveen", "utrecht": "Utrecht"},
                 "created": '<time datetime="2026-10-20T12:21:34+01:00">di</time>'}]
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(dati=dati)):
            out = jn.scrape_kpmg_paesi_bassi()
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["url"], "https://www.werkenbijkpmg.nl/vacature/cyber-defense-manager")
        self.assertEqual(out[0]["location"], "KPMG Paesi Bassi · Amstelveen, Utrecht")
        self.assertEqual(out[0]["data"], "2026-10-20")

    def test_deloitte_paesi_bassi(self):
        dati = [{"identifier": "a", "slug": "/vacature/senior-consultant-ref1/", "name": "Senior Consultant ",
                 "datePosted": "2026-05-26T09:50:12.356Z", "locale": "nl"},
                {"identifier": "a", "slug": "/en/vacancy/senior-consultant-ref1/", "name": "Senior Consultant",
                 "locale": "en"}]
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(dati=dati)):
            out = jn.scrape_deloitte_paesi_bassi()
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["url"], "https://werkenbijdeloitte.nl/vacature/senior-consultant-ref1/")
        self.assertEqual(out[0]["data"], "2026-05-26")


class TestRifiniture(unittest.TestCase):
    def test_ntt_scarta_le_offerte_di_prova(self):
        self.assertFalse(jn._ntt_link_valido({"applyUrl": "https://career8preview.sapsf.com/career?company=NTTDTEST2&x=1"}))
        self.assertTrue(jn._ntt_link_valido({"applyUrl": "https://nttlimited.wd3.myworkdayjobs.com/NTT_Careers/job/X/QA-Test-Engineer_R-1"}))

    def test_ey_titoli_confrontabili(self):
        self.assertEqual(jn._titolo_norm("Senior Consultant Technology Risk - Milano"),
                         jn._titolo_norm("Senior Consultant Technology Risk"))
        self.assertNotEqual(jn._titolo_norm("Senior Consultant"), jn._titolo_norm("Manager"))


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
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta(html)) as g, \
             mock.patch.object(jn, "_nttdata_phenom", return_value=([], None)):
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

    def test_accenture_righe_ripetute_non_sono_offerte_mancanti(self):
        """Workday dichiara 40 righe e ne restituisce 40, ma 3 sono la stessa
        offerta ripetuta: 37 offerte diverse e copertura completa."""
        ids = list(range(37)) + [36, 35, 34]

        def finta_post(body, headers):
            off = body["offset"]
            return {"total": 40 if off == 0 else 0,
                    "jobPostings": [{"title": f"Job {n}", "externalPath": f"/job/{n}"}
                                    for n in ids[off:off + 20]]}

        jn.COPERTURA.clear()
        with mock.patch.object(jn, "_accenture_post", side_effect=finta_post), \
             mock.patch.object(jn, "_accenture_playwright") as browser:
            out = jn.scrape_accenture()
        self.assertEqual(len(out), 37)
        self.assertEqual(jn.COPERTURA["Accenture Italia"], (40, 40))
        browser.assert_not_called()

    def test_bip_risposta_non_json(self):
        with mock.patch.object(jn, "http_get", return_value=FintaRisposta("<html>")):
            self.assertEqual(jn.scrape_bip(), [])


class TestPrivacyDestinatari(unittest.TestCase):
    """Ogni destinatario non deve vedere gli altri: indirizzi solo nella busta
    SMTP, mai nelle intestazioni (né To, né Cc, né Bcc)."""

    def test_destinatari_in_ccn(self):
        catturato = {}

        class FintoSMTP:
            def __init__(self, *a, **k): pass
            def __enter__(self): return self
            def __exit__(self, *a): pass
            def login(self, *a): pass
            def sendmail(self, mitt, dest, msg): catturato.update(dest=dest, msg=msg)

        dest = ["anna@x.it", "bruno@y.it", "carla@z.it"]
        with mock.patch.object(jn, "GMAIL_MITTENTE", "mittente@gmail.com"), \
             mock.patch.object(jn, "GMAIL_PASSWORD", "x"), \
             mock.patch.object(jn, "EMAIL_DESTINATARIO", ", ".join(dest)), \
             mock.patch.object(jn.smtplib, "SMTP_SSL", FintoSMTP):
            self.assertEqual(jn.invia_email("<p>ok</p>", 1), "ok")
        for d in dest:
            self.assertIn(d, catturato["dest"])        # consegnata a tutti
            self.assertNotIn(d, catturato["msg"])      # ma invisibile nel messaggio
        self.assertNotRegex(catturato["msg"], r"(?im)^(cc|bcc):")


class TestTesti(unittest.TestCase):
    def test_singolare_e_plurale(self):
        self.assertEqual(jn.conta_offerte(1), "1 nuova offerta")
        self.assertEqual(jn.conta_offerte(0), "0 nuove offerte")
        self.assertEqual(jn.conta_offerte(21), "21 nuove offerte")

    def test_oggetto_e_anteprima_con_una_offerta(self):
        html, _ = jn.genera_html({"Bip": [{"titolo": "Stage", "url": "https://b/1"}]}, 10)
        self.assertIn("1 nuova offerta: Bip 1", html)
        self.assertNotIn("1 nuove", html)


class TestVerificaGiornaliera(ConFileTemporaneo):
    """La verifica fallisce (→ email di GitHub) solo quando c'è un problema serio."""

    def esegui(self, offerte):
        import verifica_siti as vs
        vs.RIEPILOGO.clear()
        sommario = os.path.join(self.dir.name, "summary.md")
        with mock.patch.object(jn, "scrape_digital360", return_value=offerte), \
             mock.patch.dict(os.environ, {"VERIFICA_FONTI": "Digital360",
                                          "GITHUB_STEP_SUMMARY": sommario}):
            codice = vs.main()
        with open(sommario) as f:
            return codice, f.read()

    def test_fonte_vuota_fa_scattare_l_allarme(self):
        codice, testo = self.esegui([])
        self.assertEqual(codice, 1)
        self.assertIn("🚨", testo)

    def test_fonte_regolare_nessun_allarme(self):
        codice, testo = self.esegui([{"titolo": "Consultant", "url": "https://d/1"}])
        self.assertEqual(codice, 0)
        self.assertIn("Nessun problema", testo)

    def test_offerte_vecchie_di_fonte_nuova_non_sono_un_allarme(self):
        vecchia = (jn.datetime.now() - jn.timedelta(days=200)).strftime("%Y-%m-%d")
        offerte = [{"titolo": f"Ruolo {i}", "url": f"https://d/{i}", "data": vecchia} for i in range(20)]
        # Mai passata dalla newsletter: nessun allarme
        codice, _ = self.esegui(offerte)
        self.assertEqual(codice, 0)
        # Già nota alla newsletter: offerte vecchie mai segnalate → allarme
        with open(self.seen_file, "w") as f:
            json.dump({"ids": [], "storico_conteggi": [{"data": "2026-10-01", "conteggi": {"Digital360": 12}}]}, f)
        codice, _ = self.esegui(offerte)
        self.assertEqual(codice, 1)


class TestMain(ConFileTemporaneo):
    """Flusso completo con scraper finti."""

    NOMI = ["scrape_ey", "scrape_ey_experienced", "scrape_pwc_italia", "scrape_pwc_belgio",
            "scrape_pwc_paese", "scrape_deloitte", "scrape_deloitte_irlanda", "scrape_kpmg",
            "scrape_kpmg_belgio", "scrape_accenture", "scrape_nttdata", "scrape_nttdata_paese",
            "scrape_bip", "scrape_digital360", "scrape_capgemini", "scrape_kpmg_lussemburgo",
            "scrape_deloitte_lussemburgo", "scrape_deloitte_paesi_bassi", "scrape_kpmg_paesi_bassi",
            "scrape_roland_berger", "scrape_simon_kucher", "scrape_oliver_wyman", "scrape_gartner",
            "scrape_grant_thornton_belgio", "scrape_grant_thornton_irlanda"]

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

    def test_fonte_nuova_mostra_solo_le_offerte_recenti(self):
        oggi = jn.datetime.now().strftime("%Y-%m-%d")
        vecchia = (jn.datetime.now() - jn.timedelta(days=20)).strftime("%Y-%m-%d")
        storico = [{"data": "2026-10-01", "conteggi": {"EY": 5}}]   # "Accenture Irlanda" non c'è
        with open(self.seen_file, "w") as f:
            json.dump({"ids": [], "storico_conteggi": storico}, f)
        offerte = [{"titolo": "Nuova", "url": "https://a/1", "data": oggi},
                   {"titolo": "Vecchia", "url": "https://a/2", "data": vecchia},
                   {"titolo": "Senza data", "url": "https://a/3", "data": ""}]
        catturato = {}
        def finta_html(tutte, *a, **k):
            catturato.update(tutte=tutte, avviate=k.get("avviate"))
            return "<html></html>", sum(len(v) for v in tutte.values())
        with mock.patch.object(jn, "elenco_fonti", return_value=[("Accenture Irlanda", lambda: offerte),
                                                                  ("EY", lambda: [])]), \
             mock.patch.object(jn, "genera_html", side_effect=finta_html), \
             mock.patch.object(jn, "invia_email", return_value="ok"), \
             mock.patch.object(jn.time, "sleep"):
            try:
                jn.main()
            except SystemExit:
                pass
        self.assertEqual([o["titolo"] for o in catturato["tutte"]["Accenture Irlanda"]], ["Nuova"])
        self.assertEqual(catturato["avviate"], {"Accenture Irlanda": 2})
        with open(self.seen_file) as f:
            self.assertEqual(len(json.load(f)["ids"]), 3)          # tutte registrate come viste

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
