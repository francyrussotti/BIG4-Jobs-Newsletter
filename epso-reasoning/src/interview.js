// ---------- Colloquio EY · EU Space (MIST): requisiti, contenuti tecnici, domande, esercizi ----------
// Contenuti scritti per questo programma da fonti pubbliche (Commissione, EUSPA, ESA, Corte dei conti UE).
// Le note personali restano nel browser (DB.iv), non nel codice pubblicato.
const IVV={tab:'req',ex:null,quiz:null};
const ivDB=()=>{ DB.iv=DB.iv||{notes:{},ex:{n:0,ok:0},quiz:{n:0,ok:0}}; DB.iv.notes=DB.iv.notes||{}; DB.iv.ex=DB.iv.ex||{n:0,ok:0}; DB.iv.quiz=DB.iv.quiz||{n:0,ok:0}; return DB.iv; };
const IV_TABS=[['req','Requisiti'],['space','Spazio UE'],['meth','Metodi'],['proj','Progetti EY'],['tq','Domande tecniche'],['bq','Domande personali'],['ex','Esercizi'],['quiz','Quiz']];

// ---- 1. Requisiti della vacancy ----
const IV_REQ=[
 {k:'msc',r:'MSc in Science, Engineering, Business, Economics',they:'Un filtro formale. Al colloquio conta come lo colleghi al lavoro: metodo quantitativo, ricerca, policy.',prove:'Una frase che lega la tua laurea (tesi, esami, progetti) ad analisi di mercato, economia o politiche pubbliche.',q:'Walk me through your background. Why does it fit this role?'},
 {k:'innov',r:'Strong interest in innovation, science and new technologies',they:'Che tu segua davvero il settore, non che lo dichiari.',prove:'Cita due o tre sviluppi recenti e dai un\'opinione: il lancio dei primi satelliti Celeste (marzo 2026), l\'accelerazione di IRIS², la proposta di EU Space Act, il nuovo EU Space Market Report di EUSPA (2026).',q:'Which recent development in European space caught your attention, and why does it matter?'},
 {k:'comm',r:'Excellent communication in English (oral and written)',they:'Lo valutano durante tutto il colloquio.',prove:'Risposta prima, motivi dopo (struttura a piramide). Frasi brevi. Numeri con l\'unità e l\'ordine di grandezza.',q:'Explain a technical topic you know to someone with no background.'},
 {k:'quant',r:'Demonstrable quantitative skills for market and cost-benefit assessments',they:'Il requisito tecnico centrale: è il lavoro quotidiano del team.',prove:'Sapere impostare un\'analisi costi-benefici e una stima di mercato a voce, con formule e ipotesi esplicite. Un esempio tuo di analisi numerica (Excel, Python, statistica) con il risultato.',q:'How would you structure a cost-benefit analysis of an EU space initiative? / Estimate the market for X.'},
 {k:'wp',r:'Demonstrable experience managing research tasks / work packages',they:'Che tu sappia portare a termine un pezzo di ricerca in autonomia: obiettivo, fonti, piano, scadenza, controllo qualità, consegna.',prove:'Un esempio STAR concreto con numeri: quante fonti, quanti intervistati, quante settimane, cosa hai consegnato, cosa è stato usato.',q:'Tell me about a research task you managed from start to finish.'},
 {k:'office',r:'Proficiency in Excel, Word and PowerPoint',they:'Che tu sia operativo dal primo giorno.',prove:'Sii specifico: XLOOKUP/INDEX-MATCH, tabelle pivot, funzioni NPV/IRR, tabelle dati per l\'analisi di sensibilità, controllo degli errori. PowerPoint: titoli che dicono la conclusione, un messaggio per slide.',q:'How would you build a sensitivity analysis in Excel?'},
 {k:'flex',r:'Self-motivation and flexibility in a small, fast-growing consultancy',they:'Che non serva tenerti per mano e che reggi cambi di priorità e scadenze ravvicinate.',prove:'Un esempio di priorità cambiate all\'ultimo e di come hai riorganizzato il lavoro senza perdere qualità.',q:'Tell me about a time priorities changed suddenly.'},
 {k:'ai',r:'Strong affinity with AI, interest in applying AI at work',they:'Un uso concreto e critico, non entusiasmo generico. EY vende l\'adozione dell\'AI ai clienti.',prove:'Due o tre usi reali (ricerca desk, estrazione dati da PDF, codice per analisi, prime bozze) e come controlli il risultato: verifica delle fonti, niente dati riservati in strumenti pubblici, tracciabilità.',q:'How do you use AI in your work? How would you use it to produce a market report?'},
 {k:'team',r:'Work independently and in a team',they:'Equilibrio: autonomia sul tuo pezzo, coordinamento sul resto.',prove:'Un esempio in cui hai chiesto aiuto al momento giusto, e uno in cui hai sbloccato il lavoro di altri.',q:'Describe a disagreement in a team and how you handled it.'},
 {k:'bonus',r:'Bonus: secure satcom, Earth Observation and geospatial, GNSS, EU space ecosystem',they:'Non obbligatori, ma ti distinguono da altri junior con lo stesso profilo.',prove:'Conoscere le basi delle schede «Spazio UE» e «Progetti EY» e saperle collegare ai mercati (agricoltura, trasporti, assicurazioni, sicurezza).',q:'What do you know about Galileo / Copernicus / IRIS²?'}
];

// ---- 2. Ecosistema spaziale UE ----
const IV_SPACE=[
 {h:'Chi fa cosa',b:`<dl class="dl">
  <dt>Commissione europea · DG DEFIS</dt><dd>Direzione generale Industria della difesa e spazio. Titolare del programma spaziale UE: politica, bilancio, regole. Il commissario competente è quello per la Difesa e lo spazio.</dd>
  <dt>EUSPA (Praga)</dt><dd>Agenzia UE per il programma spaziale. Gestisce l'esercizio di Galileo ed EGNOS, l'accreditamento di sicurezza, lo sviluppo del mercato e la diffusione presso gli utenti (Galileo, EGNOS, Copernicus), ruoli su GOVSATCOM e IRIS². Pubblica l'<i>EU Space Market Report</i>. È il cliente principale del team.</dd>
  <dt>ESA</dt><dd>Organizzazione <b>intergovernativa</b>, non un organo UE (alcuni Stati membri ESA non sono UE, es. Regno Unito, Svizzera, Norvegia). Per l'UE è autorità tecnica e di progettazione su molte componenti. Ha programmi propri (scienza, lanciatori, Celeste per LEO-PNT).</dd>
  <dt>Altri</dt><dd>EU SatCen (intelligence geospaziale, servizio sicurezza di Copernicus). Le entità delegate di Copernicus: ECMWF per atmosfera e clima, Mercator Ocean per il marino, EEA e JRC per il territorio e le emergenze. Agenzie nazionali: CNES, DLR, ASI. Corte dei conti europea (audit).</dd>
 </dl>`},
 {h:'Programma spaziale UE 2021-2027',b:`<p>Regolamento (UE) 2021/696. Bilancio <b>€14,88 miliardi</b>: Galileo ed EGNOS circa €9 mld, Copernicus circa €5,4 mld, SSA e GOVSATCOM circa €0,44 mld. Componenti: <b>Galileo, EGNOS, Copernicus, SSA</b> (sorveglianza dello spazio, meteo spaziale, oggetti vicini alla Terra), <b>GOVSATCOM</b>. IRIS² ha un regolamento proprio, il 2023/588.</p>
  <p class="small muted">Prossimo bilancio 2028-2034: la proposta della Commissione (luglio 2025) mette lo spazio dentro un <i>European Competitiveness Fund</i>, in una finestra «Resilience, Security, Defence Industry and Space» da circa €131 mld, senza una quota riservata allo spazio. È in negoziato: verifica lo stato prima del colloquio.</p>`},
 {h:'Galileo ed EGNOS (navigazione, GNSS)',b:`<dl class="dl">
  <dt>Galileo</dt><dd>Sistema globale di navigazione satellitare UE, sotto controllo civile. Satelliti in orbita media (circa 23.000 km).</dd>
  <dt>Servizi</dt><dd><b>Open Service</b> gratuito. <b>HAS</b> (High Accuracy Service): correzioni gratuite, precisione intorno ai 20 cm, servizio iniziale da gennaio 2023. <b>OSNMA</b>: autentica il messaggio di navigazione contro lo spoofing, servizio iniziale dichiarato da EUSPA il 24 luglio 2025. <b>PRS</b>: servizio cifrato per utenti governativi autorizzati. <b>SAR</b>: ricerca e soccorso con messaggio di ritorno.</dd>
  <dt>Perché serve se GPS è gratis</dt><dd>Autonomia strategica (GPS è militare USA), resilienza, più satelliti in vista e quindi migliore precisione nei centri urbani, servizi distintivi (HAS, OSNMA, SAR con ritorno), PRS.</dd>
  <dt>EGNOS</dt><dd>Sistema di correzione e integrità (SBAS) sull'Europa che migliora GPS: approcci di precisione in aviazione (LPV), agricoltura, marittimo.</dd>
  <dt>LEO-PNT</dt><dd>Posizionamento, navigazione e tempo da orbita bassa (500-1.200 km). Segnali più forti e geometria che cambia in fretta: più resistenza a disturbo (jamming) e falsificazione (spoofing) del segnale, convergenza rapida delle soluzioni di precisione. Il dimostratore ESA <b>Celeste</b> ha lanciato i primi 2 satelliti a fine marzo 2026 (razzo Electron); altri 8 previsti dal 2027. La vacancy cita un'analisi costi-benefici di un'iniziativa UE LEO-PNT.</dd>
 </dl>`},
 {h:'Copernicus (osservazione della Terra)',b:`<dl class="dl">
  <dt>Cos'è</dt><dd>Programma UE di osservazione della Terra. Dati <b>gratuiti, completi e aperti</b>. Accesso tramite il Copernicus Data Space Ecosystem.</dd>
  <dt>Sentinel</dt><dd><b>1</b> radar ad apertura sintetica (SAR, banda C): vede di notte e con le nuvole. <b>2</b> ottico multispettrale ad alta risoluzione (10 m): agricoltura, territorio. <b>3</b> oceano e territorio: colore, temperatura, altimetria. <b>5P</b> atmosfera. <b>6</b> livello del mare. In sviluppo le missioni di espansione (es. CO2M per la CO₂, CHIME, CIMR, CRISTAL, LSTM, ROSE-L).</dd>
  <dt>6 servizi</dt><dd>Territorio, marino, atmosfera, cambiamento climatico, gestione delle emergenze, sicurezza.</dd>
  <dt>Missioni contributive</dt><dd>Dati commerciali, spesso ad altissima risoluzione, acquistati per integrare i Sentinel. Una delle analisi costi-benefici citate nella vacancy riguarda il valore di dati ad alta risoluzione con passaggi frequenti (<i>fast revisit</i>) rispetto ai Sentinel (10 m, alcuni giorni tra un passaggio e l'altro).</dd>
 </dl>`},
 {h:'Comunicazioni satellitari sicure',b:`<dl class="dl">
  <dt>GOVSATCOM</dt><dd>Messa in comune e condivisione di capacità satellitari sicure, nazionali e commerciali, per utenti governativi (sicurezza, gestione delle crisi, sorveglianza marittima).</dd>
  <dt>IRIS²</dt><dd>Costellazione multi-orbita (LEO e MEO) per connettività sicura. Contratto di concessione di 12 anni firmato il 16 dicembre 2024 con il consorzio <b>SpaceRISE</b> (SES, Eutelsat, Hispasat). Piano iniziale: circa 290 satelliti, €10,6 mld (circa €6,5 mld pubblici), servizi governativi dal 2030. Nel 2026 è stato annunciato un rafforzamento con anticipo al 2029; i numeri riportati dalla stampa variano, quindi verifica prima del colloquio.</dd>
  <dt>Perché</dt><dd>Sovranità e dipendenza da costellazioni non UE (Starlink), lezione della guerra in Ucraina, resilienza delle comunicazioni governative.</dd>
 </dl>`},
 {h:'Politiche e documenti da conoscere',b:`<dl class="dl">
  <dt>EU Space Act</dt><dd>Proposta di regolamento COM(2025) 335 del 25 giugno 2025. Tre pilastri: <b>sicurezza</b> (detriti, evitare collisioni), <b>resilienza</b> (cybersicurezza; norma speciale rispetto a NIS2), <b>sostenibilità</b> (metodo comune per l'impronta ambientale). Applicazione prevista dal 2030. In discussione al Parlamento europeo (commissione ITRE) e al Consiglio.</dd>
  <dt>Corte dei conti UE, Special Report 07/2021</dt><dd>Su Galileo e Copernicus: servizi avviati, ma diffusione sotto il potenziale. Copernicus usato soprattutto da esperti, monitoraggio della diffusione di Galileo debole, nessuna <b>strategia complessiva con obiettivi misurabili e scadenze</b>. Raccomandazioni: una strategia, un quadro per misurare i benefici socio-economici, accesso integrato ai dati. Nel 2024 la Commissione ha pubblicato un documento di lavoro con un quadro per misurare la diffusione. Uno dei progetti della vacancy è proprio l'attuazione di queste raccomandazioni.</dd>
  <dt>Altro</dt><dd>EU Space Strategy for Security and Defence (marzo 2023). Chips Act (2023), per il progetto sui semiconduttori.</dd>
 </dl>`},
 {h:'Mercato: definizioni e numeri',b:`<dl class="dl">
  <dt>Upstream</dt><dd>Costruire e lanciare l'infrastruttura: satelliti, lanciatori, segmento di terra.</dd>
  <dt>Downstream</dt><dd>Prodotti e servizi che usano segnali e dati spaziali: ricevitori, applicazioni, servizi a valore aggiunto. È il focus del team.</dd>
  <dt>In-space economy</dt><dd>Attività in orbita: manutenzione e rifornimento dei satelliti, logistica, produzione in orbita, rimozione dei detriti.</dd>
  <dt>New Space</dt><dd>Attori privati finanziati da capitale di rischio, piccoli satelliti in costellazioni, costi di lancio più bassi, modelli «dati come servizio». Per l'UE pone il tema di comprare servizi commerciali invece di costruire infrastrutture proprie.</dd>
  <dt>EU Space Market Report 2026</dt><dd>EUSPA, maggio 2026: unisce GNSS, osservazione della Terra, comunicazioni sicure e SSA, 16 segmenti di mercato (nuovo: sicurezza delle frontiere e interna). <b>GNSS</b>: ricavi da circa €300 mld (2024) a €580 mld (2034), quasi 10 mld di dispositivi installati, i servizi verso l'80% dei ricavi. <b>Osservazione della Terra</b>: da €3,5 mld a €7,9 mld; l'agricoltura è il segmento principale (circa 21%); i fornitori europei hanno il 42% dei ricavi. <b>Comunicazioni sicure</b>: domanda UE da circa €0,2 mld (2025) a circa €1,2 mld (2040). Leggi almeno la sintesi del report sul sito EUSPA.</dd>
 </dl>`}
];

// ---- 3. Metodi ----
const IV_METH=[
 {h:'Analisi costi-benefici (CBA)',b:`<p><b>A cosa serve:</b> misurare se un intervento aumenta il benessere della società, non se è redditizio per chi lo realizza.</p>
  <p><b>Passi</b> (Guida della Commissione all'analisi costi-benefici dei progetti d'investimento, 2014):</p>
  <ol>
   <li>Contesto e obiettivi.</li>
   <li>Scenario <b>senza progetto</b> (counterfactual o baseline). Tutto si misura come differenza «con meno senza».</li>
   <li>Opzioni alternative.</li>
   <li><b>Analisi finanziaria</b>: flussi di cassa del gestore, FNPV.</li>
   <li><b>Analisi economica</b>: prezzi ombra, effetti esterni, tasse e sussidi esclusi perché sono trasferimenti. Risultati: ENPV, ERR, B/C.</li>
   <li><b>Rischio</b>: analisi di sensibilità, valori di commutazione, scenari, Monte Carlo.</li>
  </ol>
  <dl class="dl">
   <dt>Formule</dt><dd>NPV = Σ (Bₜ − Cₜ) / (1+r)ᵗ. B/C = valore attuale dei benefici / valore attuale dei costi. IRR = il tasso che rende NPV = 0. Annualità costante per n anni: fattore = (1 − (1+r)⁻ⁿ) / r.</dd>
   <dt>Regola</dt><dd>ENPV &gt; 0, ERR &gt; tasso sociale, B/C &gt; 1.</dd>
   <dt>Tasso di sconto</dt><dd>Guida 2014: 3% sociale reale, 5% nei Paesi della coesione; 4% finanziario reale. Il Better Regulation Toolbox raccomanda il 3%. Prezzi costanti con tasso reale, oppure correnti con tasso nominale: mai mescolarli.</dd>
   <dt>Sensibilità</dt><dd>Una variabile è <b>critica</b> se una sua variazione dell'1% sposta il NPV di più dell'1%. Il <b>valore di commutazione</b> (switching value) è la variazione che porta il NPV a zero, ad esempio quanto devono scendere i benefici: NPV / PV benefici.</dd>
   <dt>Errori classici</dt><dd>Contare due volte lo stesso beneficio (es. tempo risparmiato e aumento di produttività dallo stesso effetto). Attribuire all'intervento benefici che ci sarebbero comunque. Includere costi già sostenuti (sunk costs). Dimenticare i costi operativi e i rinnovi.</dd>
  </dl>`},
 {h:'Valutare benefici difficili',b:`<dl class="dl">
  <dt>Categorie</dt><dd>Effetti diretti: ricavi e occupazione dell'industria. Indiretti: filiera. Indotti: spesa dei redditi generati. Benefici per gli utenti: tempo e carburante risparmiati, rese agricole, danni evitati, vite salvate (valore statistico della vita). Benefici strategici: autonomia, sicurezza.</dd>
  <dt>Metodi</dt><dd>Costi evitati. Effetto sulla produttività. Disponibilità a pagare: rivelata dai comportamenti o dichiarata con questionari (contingent valuation). Trasferimento di valori da studi esistenti (benefit transfer). Valore dell'informazione, per i dati di osservazione della Terra.</dd>
  <dt>Attribuzione</dt><dd>Il punto delicato nello spazio. I ricevitori usano più costellazioni insieme, quindi il beneficio di Galileo è <b>marginale rispetto a GPS</b>: più precisione nei centri urbani, autenticazione, resilienza se GPS non è disponibile. Formula tipica: beneficio totale × quota di utenti con Galileo × quota del beneficio dovuta a Galileo.</dd>
  <dt>Se non si può monetizzare</dt><dd>Analisi multicriteri o analisi costo-efficacia, oppure costo di rimpiazzo e scenari di interruzione: quanto costerebbe all'economia un'interruzione del GNSS.</dd>
 </dl>`},
 {h:'Valutazioni e valutazioni d\'impatto (Better Regulation)',b:`<dl class="dl">
  <dt>Valutazione (ex post)</dt><dd>Cinque criteri: <b>efficacia, efficienza, rilevanza, coerenza, valore aggiunto UE</b>. Si parte dalla logica d'intervento (bisogni → obiettivi → risorse → attività → output → risultati → impatti) e si formulano domande di valutazione per ogni criterio.</dd>
  <dt>Valutazione d'impatto (ex ante)</dt><dd>Problema e sue cause; perché deve agire l'UE (sussidiarietà); obiettivi SMART; opzioni, inclusa la baseline; impatti economici, sociali e ambientali, su PMI e competitività; confronto delle opzioni; monitoraggio. Esaminata dal Regulatory Scrutiny Board, con consultazione pubblica.</dd>
  <dt>Strumenti</dt><dd>Ricerca desk, sondaggi, interviste semi-strutturate, casi studio, workshop. Triangolazione tra fonti diverse. Analisi di contributo e analisi controfattuale per separare l'effetto dell'intervento da tutto il resto.</dd>
  <dt>Gap analysis</dt><dd>Stato attuale contro stato desiderato: bisogni degli utenti contro offerta, barriere e azioni per colmare la distanza. EUSPA raccoglie i requisiti degli utenti per segmento (User Requirements Reports, User Consultation Platform).</dd>
 </dl>`},
 {h:'Analisi di mercato e previsioni',b:`<dl class="dl">
  <dt>TAM / SAM / SOM</dt><dd>Mercato totale, mercato raggiungibile con la propria offerta, quota realisticamente conquistabile.</dd>
  <dt>Top-down e bottom-up</dt><dd><b>Top-down</b>: mercato totale × quote. <b>Bottom-up</b>: numero di utenti × tasso di adozione × prezzo. Fai entrambe e confrontale: se divergono, una delle ipotesi è sbagliata.</dd>
  <dt>Indicatori</dt><dd>Base installata e consegne annue di dispositivi, ricavi medi per utente, penetrazione. CAGR = (finale / iniziale)^(1/n) − 1. Regola del 72: anni per raddoppiare ≈ 72 / crescita %.</dd>
  <dt>Previsioni</dt><dd>Curve di adozione a S (modello di Bass), scenari (basso, base, alto), fattori che guidano la domanda (normative, prezzi, tecnologia). Le ipotesi vanno dichiarate.</dd>
  <dt>Catena del valore</dt><dd>Per i semiconduttori: progettazione, produzione, assemblaggio e test, integrazione. Si individuano attori, dipendenze e colli di bottiglia (es. componenti resistenti alle radiazioni, export control USA). La domanda si stima come unità × contenuto per unità × prezzo.</dd>
  <dt>Monitoraggio di mercato e tecnologia</dt><dd>Indicatori fissi, fonti ricorrenti (bilanci aziendali, banche dati, brevetti, investimenti nelle start-up, stampa di settore), validazione con esperti, aggiornamento periodico.</dd>
  <dt>Dati in conflitto</dt><dd>Controlla definizioni e perimetro (ricavi da dispositivi o da servizi? mondo o UE?), anno e valuta, metodo, chi ha prodotto il dato e perché. Riconcilia o mostra una forchetta di valori, e dichiara la scelta.</dd>
 </dl>`},
 {h:'Diffusione sul mercato: barriere e leve',b:`<p><b>Barriere</b>: poca conoscenza, costi di integrazione, mancanza di standard, competenze, regolamentazione, dati difficili da usare.</p>
  <p><b>Leve</b>: inserire il servizio in norme e standard. Galileo è obbligatorio nell'eCall delle auto nuove omologate dal 2018 ed è usato dal tachigrafo intelligente. Altre leve: appalti pubblici, finanziamenti (Horizon Europe), formazione, servizi già pronti all'uso.</p>
  <p><b>Mobilità intelligente</b>: eCall, tariffazione stradale, guida connessa e automatizzata (serve precisione al livello di corsia: HAS, correzioni), droni (U-space).</p>
  <p><b>Commodities trading</b>: osservazione della Terra per prevedere i raccolti, monitorare scorte di petrolio, porti e miniere. Timing GNSS per marcare l'ora delle transazioni: MiFID II chiede orologi sincronizzati e riconducibili a UTC.</p>`}
];

// ---- 4. Progetti citati nella vacancy ----
const IV_PROJ=[
 {t:'CBA dell\'iniziativa UE LEO-PNT (per EUSPA e Commissione)',what:'Decidere se e come l\'UE debba avere una componente di navigazione da orbita bassa accanto a Galileo.',you:'Raccolta dati su costi (satelliti, lanci, segmento di terra, operazioni), stima dei benefici per settore, modello Excel, analisi di sensibilità, interviste con industria e utenti.',m:'Scenario senza intervento: Galileo da solo, più alternative commerciali o terrestri. Benefici: perdite evitate in caso di disturbo o falsificazione del segnale GNSS (telecomunicazioni, finanza, energia, trasporti), prestazioni migliori, autonomia. Analisi costo-efficacia o multicriteri per la parte strategica.',trap:'Non attribuire a LEO-PNT benefici già garantiti da Galileo (OSNMA, HAS). Considerare le alternative commerciali come opzione, non ignorarle.',q:'What would be the key benefit categories and the counterfactual in a CBA of LEO-PNT?'},
 {t:'Monitoraggio di mercato e tecnologia, EO & GNSS Market Report',what:'Il report di riferimento di EUSPA sui mercati downstream, ora EU Space Market Report.',you:'Aggiornare banche dati per segmento, raccogliere dati aziendali e di consegne, controllare coerenza, scrivere sezioni di segmento, validare con esperti.',m:'Base installata × penetrazione × ricavo per unità. Ricavi da dispositivi e da servizi. Previsioni a 10 anni con scenari.',trap:'Definizioni che cambiano tra un\'edizione e l\'altra: un confronto diretto tra report può essere sbagliato.',q:'How would you forecast GNSS revenues in road and automotive to 2034?'},
 {t:'Raccomandazioni della Corte dei conti UE su una strategia spaziale complessiva',what:'Aiutare EUSPA a rispondere allo Special Report 07/2021: strategia, obiettivi misurabili, monitoraggio della diffusione.',you:'Mappare le raccomandazioni, analizzare cosa esiste già, proporre indicatori (KPI) con baseline e target.',m:'Logica d\'intervento, indicatori SMART, quadro di monitoraggio.',trap:'Indicatori facili da misurare ma che non dicono nulla (numero di eventi organizzati) invece di indicatori di risultato (utenti attivi, quota di ricevitori con Galileo).',q:'Which KPIs would you propose to measure Copernicus uptake?'},
 {t:'Semiconduttori per difesa e spazio (DG DEFIS)',what:'Mappare la catena del valore UE, gli attori chiave e prevedere la domanda per dieci anni.',you:'Ricerca desk su aziende e capacità produttive, interviste, banca dati degli attori, modello di domanda.',m:'Catena del valore per fasi. Domanda = numero di piattaforme × componenti per piattaforma × prezzo, con scenari. Analisi delle dipendenze.',trap:'Volumi piccoli ma critici: il problema non è la dimensione del mercato ma la dipendenza (export control USA, una sola fonderia).',q:'How would you forecast EU demand for space-grade semiconductors?'},
 {t:'Diffusione sul mercato: mobilità intelligente e commodities trading (EUSPA)',what:'Supporto strategico ed economico per aumentare l\'uso dei servizi spaziali UE in due segmenti.',you:'Analisi degli utenti e dei bisogni, mappatura degli attori, casi d\'uso, barriere, piano d\'azione.',m:'Vedi la scheda «Diffusione sul mercato» in Metodi.',trap:'Proporre azioni generiche («più comunicazione») invece di leve concrete (standard, norme, appalti).',q:'How would you increase Galileo HAS uptake in automated driving?'},
 {t:'CBA di dati Copernicus e dati ad alta risoluzione con passaggi frequenti (cliente privato)',what:'Valutare se conviene comprare dati commerciali ad altissima risoluzione oltre ai Sentinel gratuiti.',you:'Casi d\'uso, confronto tecnico (risoluzione, frequenza, costo per km²), stima del valore aggiunto.',m:'Valore dell\'informazione: quanto migliora la decisione (es. perdite evitate, interventi mirati) con dati migliori, meno il costo dei dati.',trap:'Più risoluzione non vale sempre di più: se la decisione non cambia, il valore aggiunto è zero.',q:'When is it worth paying for very-high-resolution imagery instead of free Sentinel-2 data?'},
 {t:'Ecosistema dei dati spaziali UE (EUSPA)',what:'Capire come si muovono i dati: piattaforme, fornitori, utenti, modelli di business.',you:'Mappatura degli attori e delle piattaforme, interviste, analisi dei flussi e delle barriere all\'accesso.',m:'Mappa dell\'ecosistema, analisi dei modelli di business, raccomandazioni.',trap:'Confondere disponibilità dei dati con usabilità: i dati aperti non bastano se servono competenze per usarli.',q:'What are the main barriers for SMEs to use Copernicus data?'},
 {t:'Rafforzare l\'uso di Copernicus: valutazione, gap analysis, raccomandazioni (DG DEFIS)',what:'Valutazione con i criteri Better Regulation e piano per colmare le lacune.',you:'Sondaggi e interviste con utenti, analisi dei dati di accesso, casi studio, griglia di valutazione.',m:'Cinque criteri di valutazione, logica d\'intervento, gap analysis, triangolazione.',trap:'Misurare i download invece dell\'uso effettivo e del valore generato.',q:'How would you evaluate the effectiveness of Copernicus user uptake actions?'}
];

// ---- 5. Domande tecniche con risposta modello (in inglese, come al colloquio) ----
const IV_TQ=[
 {q:'What is the difference between upstream and downstream space?',a:'Upstream is building and launching the infrastructure: satellites, launchers and ground segment. Downstream is everything that uses space signals and data: receivers, applications and value-added services. Downstream is much larger in revenue. GNSS downstream alone is around €300 billion a year according to EUSPA, and it is where most socio-economic benefits are generated.',n:'Aggiungi «in-space economy» se vuoi mostrare che conosci il trend.'},
 {q:'Why does Europe need Galileo when GPS is free?',a:'Three reasons. Strategic autonomy: GPS is a US military system and Europe cannot depend on it for critical infrastructure. Performance: more satellites mean better accuracy and availability, especially in cities. Distinctive services: free high-accuracy corrections (HAS), navigation message authentication against spoofing (OSNMA), the encrypted Public Regulated Service and search-and-rescue with a return link.',n:'Se chiedono i benefici economici: il valore di Galileo è marginale rispetto a GPS. Dillo tu prima che lo dicano loro.'},
 {q:'How would you structure a CBA of an EU LEO-PNT component?',a:'First define the counterfactual: Galileo and GPS as they are, plus available commercial or terrestrial alternatives. Then the options, for example an EU-owned system versus buying a commercial service. On the cost side: development, deployment, launch, ground segment, operations and replenishment over the life cycle. On the benefit side: avoided losses from GNSS jamming or spoofing in critical sectors, performance gains, and strategic autonomy, which may need a multi-criteria approach. Discount at the social rate, test sensitivity on the most uncertain variables, especially outage probability and duration, and report switching values.',n:'Struttura: counterfactual → opzioni → costi → benefici → sconto → sensibilità.'},
 {q:'Financial vs economic analysis: what is the difference?',a:'The financial analysis looks at cash flows for the project owner and tells you if the project is financially sustainable. The economic analysis looks at society as a whole: it uses shadow prices, includes externalities and non-market benefits, and removes transfers such as taxes and subsidies. A space infrastructure typically has a negative financial NPV and, to be justified, a positive economic NPV.',n:''},
 {q:'Which discount rate would you use, and what if the result depends on it?',a:'For EU appraisal I would use the social discount rate in Commission guidance, 3% in real terms, consistent with constant prices. If the conclusion changes with the rate, that is a finding in itself: I would show NPV at alternative rates, compute the internal rate of return and explain that long-lived benefits are sensitive to discounting.',n:'5% nei Paesi della coesione secondo la guida del 2014.'},
 {q:'How do you value benefits that are hard to monetise, such as security or autonomy?',a:'I would be explicit that they are not in the NPV and avoid inventing a number. Options are: an avoided-cost approach, such as the economic cost of a GNSS outage; cost-effectiveness, meaning the cheapest way to reach a given level of resilience; or a multi-criteria analysis alongside the CBA. Decision makers need to see the monetised and non-monetised parts separately.',n:''},
 {q:'Users have multi-constellation receivers. How do you attribute benefits to Galileo?',a:'By measuring the marginal contribution. Start from the total benefit in a segment, apply the share of devices that are Galileo-enabled, then the share of the benefit that depends on Galileo specifically: better availability in urban areas, authentication, or service continuity if another constellation fails. Then test that share in the sensitivity analysis, because it is usually the most uncertain parameter.',n:'Esercizio numerico nella scheda Esercizi.'},
 {q:'How would you estimate the market for Copernicus-based services in EU agriculture?',a:'Bottom-up: number of farms above a size threshold, times expected adoption of satellite-based services, times average annual spend per farm. Cross-check top-down using the EO revenue figures in the EUSPA market report, where agriculture is the largest EO segment. If the two numbers diverge, revisit adoption and price assumptions. I would present a range with low, base and high scenarios.',n:''},
 {q:'What are the Better Regulation evaluation criteria? How would you evaluate Copernicus uptake actions?',a:'Effectiveness, efficiency, relevance, coherence and EU added value. I would reconstruct the intervention logic of the uptake actions, define evaluation questions for each criterion, and combine data on platform use, a user survey, interviews with intermediaries and a few case studies. Then I would triangulate the sources and compare results with a baseline where possible.',n:''},
 {q:'What is IRIS² and why is the EU building it?',a:'IRIS² is a multi-orbit secure connectivity constellation, in low and medium Earth orbit, delivered through a 12-year concession with the SpaceRISE consortium of SES, Eutelsat and Hispasat, signed in December 2024. It provides secure governmental communications and commercial services. The rationale is sovereignty, resilience and reducing dependence on non-EU providers such as Starlink, which the war in Ukraine made very visible.',n:'Nel 2026 è stato annunciato un rafforzamento e l\'anticipo al 2029: verifica i numeri aggiornati.'},
 {q:'What is the role of EUSPA compared with ESA and DG DEFIS?',a:'DG DEFIS in the Commission owns the EU Space Programme: policy, budget and legislation. EUSPA is the EU agency that operates Galileo and EGNOS, does security accreditation and drives market development and user uptake, including for Copernicus. ESA is an intergovernmental organisation, not an EU body, that acts as technical and design authority on many EU programme components and runs its own programmes.',n:''},
 {q:'Two sources give very different market sizes. What do you do?',a:'First I check definitions and scope: devices or services, global or EU, which year and currency, whether the figure is revenue or value added. Then the method and who produced it. Usually the gap comes from scope. If it remains, I build my own estimate bottom-up, present a range, and state clearly which assumption I chose and why.',n:''},
 {q:'How would you design a user survey on needs for a space service?',a:'Define the population and how to reach it through associations and EUSPA networks. Keep it short, with closed questions for the core indicators and a few open ones. Pilot it with a handful of users and avoid leading questions. Monitor response rates by segment, then follow up with interviews to understand the reasons behind the numbers, because surveys tell you what and interviews tell you why.',n:''},
 {q:'How would you use AI to prepare a market report without compromising quality?',a:'For speed on low-risk tasks: screening sources, extracting figures from long PDFs, first drafts and code for data cleaning. Every figure is traced back to a primary source and verified, because models can invent numbers. Confidential client data does not go into public tools, only into approved enterprise tools. The final judgement and the numbers we sign off stay with the team.',n:'È anche la logica della parte AI proficiency del test Maki.'},
 {q:'What did the European Court of Auditors find on Galileo and Copernicus?',a:'In Special Report 07/2021 the Court found that services were launched but uptake was below potential: Copernicus mainly used by experts, weak monitoring of Galileo uptake, and no comprehensive strategy with measurable, time-bound objectives. It recommended a strategy, a framework to assess socio-economic benefits and better integrated access to data.',n:''},
 {q:'What is the EU Space Act?',a:'A Commission proposal from June 2025 for a regulation on space activities, built on three pillars: safety, meaning collision avoidance and debris; resilience, with cybersecurity rules acting as a lex specialis to NIS2; and environmental sustainability, with a common method to measure footprint. It would apply from 2030 and is still in the legislative process. For a consultancy it means work on impact and compliance-cost assessments.',n:''},
 {q:'When is very-high-resolution commercial imagery worth paying for compared with free Sentinel-2?',a:'Only when it changes a decision. Sentinel-2 at 10 metres is enough for crop monitoring at field level. Higher resolution or daily revisit adds value for small objects, urban change, infrastructure inspection, insurance claims or emergencies where timing matters. I would quantify it as a value of information: the better decisions made possible, minus the cost of the data.',n:''},
 {q:'How would you present a complex CBA to a non-technical audience?',a:'Start with the answer: the project creates net benefits of X under realistic assumptions. Then show the three biggest benefit drivers, what would make the result change sign, and what we could not monetise. One chart for benefits versus costs over time, one for sensitivity. Methodology in the annex.',n:''},
 {q:'How would you build a sensitivity analysis in Excel?',a:'Put all assumptions in one input sheet, with no hard-coded numbers in the calculations. Compute NPV with the NPV function or explicit discount factors. Use data tables to vary one or two key inputs, a tornado chart to rank variables by impact, and Goal Seek to find switching values. For uncertainty ranges, a simple Monte Carlo with random draws over the critical variables.',n:''}
];

// ---- 6. Domande personali (STAR) ----
const IV_BQ=[
 {k:'pitch',q:'Tell me about yourself (60-90 seconds).',t:'Chi sei in una frase, due esperienze collegate al ruolo (ricerca, analisi quantitativa), perché spazio UE e perché ora.'},
 {k:'whyey',q:'Why EY, and why this team?',t:'Team piccolo ma con clienti istituzionali (EUSPA, DG DEFIS, ESA), lavoro su dati e politiche reali, i progetti citati nella vacancy. Niente frasi che valgono per qualunque azienda.'},
 {k:'whyspace',q:'Why space? Why EU policy?',t:'Un motivo concreto e personale, collegato all\'impatto: lo spazio come infrastruttura per agricoltura, trasporti, sicurezza; l\'UE come attore che decide come usarlo.'},
 {k:'research',q:'Tell me about a research task you managed end to end.',t:'STAR: obiettivo, fonti, piano, scadenze, ostacoli, risultato con numeri, come è stato usato.'},
 {k:'deadline',q:'Tell me about a time priorities changed or a deadline was very tight.',t:'Come hai riorganizzato, cosa hai comunicato e a chi, cosa hai sacrificato e perché.'},
 {k:'conflict',q:'Describe a disagreement in a team.',t:'Il fatto, la tua posizione, come hai ascoltato, la soluzione. Niente colpe agli altri.'},
 {k:'defend',q:'Tell me about a time you had to defend your analysis.',t:'Cosa hai presentato, l\'obiezione, come hai risposto con i dati, cosa hai cambiato.'},
 {k:'mistake',q:'Tell me about a mistake you made.',t:'Un errore vero ma non grave, come te ne sei accorto, cosa hai corretto, cosa fai diversamente adesso.'},
 {k:'learn',q:'How do you get up to speed on a new topic quickly?',t:'Il tuo metodo: fonti ufficiali, report di settore, esperti, schema dei concetti. Esempio concreto.'},
 {k:'aiuse',q:'Give an example of how you used AI to do something better or faster.',t:'Compito, strumento, come hai controllato il risultato, quanto tempo hai risparmiato.'},
 {k:'ask',q:'Your questions for them',t:'Esempi: «What would a typical first project look like for a junior?» · «How is work split between desk research, modelling and client meetings?» · «How is the team using AI in market monitoring?» · «What does a strong first year look like?»'}
];

// ---- 7. Quiz di concetti ----
const IV_QUIZ=[
 ['Which body operates Galileo and EGNOS and leads their market uptake?',['EUSPA','ESA','EU SatCen','European Defence Agency'],'EUSPA, agenzia UE a Praga. ESA è intergovernativa e fa da autorità tecnica.'],
 ['ESA is…',['an intergovernmental organisation, not an EU body','an EU agency under DG DEFIS','a Commission directorate-general','a public-private partnership'],'ESA ha Stati membri non UE (Regno Unito, Svizzera, Norvegia).'],
 ['Copernicus data policy is…',['free, full and open','free for public bodies only','paid per scene','restricted to EU companies'],'Dati gratuiti e aperti per tutti.'],
 ['Sentinel-1 carries…',['a C-band synthetic aperture radar','a multispectral optical imager','an atmospheric spectrometer','a radar altimeter for sea level only'],'Il radar vede anche di notte e con le nuvole. L\'ottico multispettrale è Sentinel-2.'],
 ['Galileo OSNMA provides…',['authentication of the navigation message against spoofing','free 20 cm corrections','an encrypted service for governments','a return link for search and rescue'],'OSNMA, servizio iniziale da luglio 2025. I 20 cm sono HAS, il servizio cifrato è PRS.'],
 ['Galileo HAS is…',['a free high-accuracy correction service (around 20 cm)','a paid commercial authentication service','the encrypted governmental service','a ground augmentation for aviation'],'Servizio iniziale da gennaio 2023.'],
 ['EGNOS is…',['an SBAS improving GPS accuracy and integrity over Europe','a second Galileo constellation','an EO satellite','a secure satcom system'],'Usato soprattutto per gli approcci di precisione in aviazione.'],
 ['IRIS² is…',['a multi-orbit secure connectivity constellation under a public-private concession','a new Copernicus satellite','a LEO navigation demonstrator','an EU space traffic regulation'],'Concessione a SpaceRISE (SES, Eutelsat, Hispasat), firmata a dicembre 2024.'],
 ['GOVSATCOM is about…',['pooling and sharing secure satcom capacity for governmental users','a global navigation service','debris tracking','free broadband for citizens'],'Componente del programma spaziale UE 2021-2027.'],
 ['Downstream space refers to…',['products and services using space signals and data','satellite manufacturing','launch services','ground station construction'],'Il focus del team MIST.'],
 ['In the economic analysis of a CBA, taxes and subsidies are…',['excluded, because they are transfers','added to benefits','added to costs','counted twice'],'Si escludono: spostano risorse senza crearne.'],
 ['A benefit-cost ratio of 1.3 means…',['present value of benefits is 30% higher than present value of costs','NPV equals 1.3 million','the IRR is 13%','payback takes 1.3 years'],'B/C = PV benefici / PV costi.'],
 ['In the Commission CBA guide, a variable is critical when…',['a 1% change moves NPV by more than 1%','it changes the sign of the NPV','it is the largest cost item','it has the highest uncertainty'],'Definizione della guida 2014.'],
 ['A switching value is…',['the change in a variable that makes NPV equal to zero','the discount rate that maximises NPV','the value of the project at the end of the period','the exchange rate used in the analysis'],'Per i benefici: NPV / PV benefici.'],
 ['The counterfactual in a CBA is…',['the scenario without the intervention','the most optimistic scenario','the financial analysis','the sensitivity analysis'],'Tutto si misura come differenza con e senza intervento.'],
 ['Better Regulation evaluation criteria are…',['effectiveness, efficiency, relevance, coherence, EU added value','effectiveness, efficiency, impact, sustainability, relevance','cost, time, quality, scope, risk','relevance, legality, transparency, value, impact'],'Il secondo elenco somiglia ai criteri OCSE-DAC: è la trappola.'],
 ['The main finding of ECA Special Report 07/2021 was…',['uptake below potential and no comprehensive strategy with measurable targets','Galileo is over budget','Copernicus data are too expensive','EUSPA should be merged with ESA'],'Strategia, misura dei benefici, accesso integrato ai dati.'],
 ['The three pillars of the proposed EU Space Act are…',['safety, resilience, sustainability','funding, procurement, launch','research, industry, defence','data, AI, connectivity'],'COM(2025) 335, giugno 2025.'],
 ['Why consider LEO for positioning, navigation and timing?',['stronger signals and faster geometry: more resilience to jamming, faster convergence','it replaces Galileo','it only needs one satellite','it covers only Europe'],'Complemento a Galileo, non sostituto. Dimostratore ESA Celeste, primi lanci a marzo 2026.'],
 ['A market grows from 100 to 200 in 10 years. Approximate CAGR?',['about 7%','10%','20%','5%'],'Regola del 72: 72/10 ≈ 7,2%. Esatto: 2^(1/10) − 1 = 7,18%.'],
 ['Bottom-up market sizing starts from…',['number of users × adoption × price','total market × market share','GDP × share of space','last year revenue × growth'],'Il secondo è top-down.'],
 ['Contingent valuation measures…',['stated willingness to pay','observed market prices','avoided costs','shadow wage rates'],'Si chiede a un campione quanto pagherebbe.'],
 ['In a CBA at constant prices you should use…',['a real discount rate','a nominal discount rate','the inflation rate','no discounting'],'Prezzi costanti con tasso reale, prezzi correnti con tasso nominale.'],
 ['A receiver uses GPS and Galileo. The benefit attributable to Galileo is…',['its marginal contribution (availability, authentication, resilience)','the full benefit of positioning','zero, because GPS is enough','half of the benefit by default'],'Il punto chiave delle analisi costi-benefici sul GNSS.']
];

// ---- Esercizi numerici generati ----
const ivR=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const ivPick=a=>a[Math.floor(Math.random()*a.length)];
function ivOpts(v,ds,fmt){
  const vals=[v], gap=Math.max(Math.abs(v)*0.04,0.05), far=x=>vals.every(y=>Math.abs(y-x)>gap&&fmt(y)!==fmt(x));
  ds.forEach(d=>{ if(Number.isFinite(d)&&far(d)) vals.push(d); });
  let k=1; while(vals.length<4&&k<60){ const c=v+(k%2?1:-1)*Math.max(Math.abs(v),2)*(0.1+0.06*Math.ceil(k/2)); if(far(c)) vals.push(c); k++; }
  const sel=vals.slice(0,4), order=sel.map((x,i)=>i).sort(()=>Math.random()-.5);
  return {opts:order.map(i=>fmt(sel[i])), key:order.indexOf(0)};
}
const ivM=x=>(x<0?'−€':'€')+nf(Math.abs(x),1)+'m', ivP=x=>nf(x*100,1)+'%';
const IV_EX=[
 {t:'NPV',make(){ const r=ivPick([3,4,5])/100, n=ivPick([5,8,10]), B=ivR(3,9)*5; const af=(1-Math.pow(1+r,-n))/r; const I=Math.round(B*af*(0.7+Math.random()*0.5)); const v=-I+B*af;
   return {q:`An EU programme costs €${I}m in year 0 and generates benefits of €${B}m per year in years 1 to ${n}. Using a ${r*100}% discount rate, what is the NPV?`,
    ...ivOpts(v,[B*n-I,B*af*(1+r)-I,-I+B*((1-Math.pow(1+r+.02,-n))/(r+.02))],ivM),
    ex:`Fattore di annualità = (1 − 1.0${r*100}^−${n}) / ${r} = ${nf(af,3)}. PV benefici = ${B} × ${nf(af,3)} = €${nf(B*af,1)}m. NPV = ${nf(B*af,1)} − ${I} = €${nf(v,1)}m. Trappole: non scontare (${nf(B*n-I,1)}), scontare dall'anno 0.`}; }},
 {t:'B/C',make(){ const r=ivPick([3,4]), n=ivPick([10,15]); const af=(1-Math.pow(1+r/100,-n))/(r/100); const I=ivR(20,60)*5, O=ivR(2,8), C=I+O*af; const PB=Math.round(C*(0.8+Math.random()*0.9)); const v=PB/C;
   return {q:`Present value of benefits: €${PB}m. Costs: investment of €${I}m in year 0 and operating costs of €${O}m per year for ${n} years. The annuity factor at ${r}% for ${n} years is ${nf(af,2)}. What is the benefit-cost ratio?`,
    ...ivOpts(v,[PB/I,PB/(I+O*n),(PB-C)/C],x=>nf(x,2)),
    ex:`PV costi = ${I} + ${O} × ${nf(af,2)} = €${nf(C,1)}m. B/C = ${PB} / ${nf(C,1)} = ${nf(v,2)}. ${v>=1?'Maggiore di 1: benefici superiori ai costi.':'Minore di 1: costi superiori ai benefici.'} Trappole: dimenticare i costi operativi, non scontarli.`}; }},
 {t:'CAGR',make(){ const n=ivPick([5,8,10]), g=ivR(4,13)/100, S=ivR(3,40)*10; const E=Math.round(S*Math.pow(1+g,n)); const v=Math.pow(E/S,1/n)-1;
   return {q:`A downstream market grows from €${S}bn to €${E}bn in ${n} years. What is the compound annual growth rate?`,
    ...ivOpts(v,[(E/S-1)/n,E/S-1,(E-S)/E/n],ivP),
    ex:`CAGR = (${E}/${S})^(1/${n}) − 1 = ${nf(E/S,3)}^(${nf(1/n,3)}) − 1 = ${nf(v*100,1)}%. La media semplice (${nf((E/S-1)/n*100,1)}%) sopravvaluta la crescita.`}; }},
 {t:'Regola del 72',make(){ const g=ivPick([4,6,8,9,12]); const v=72/g;
   return {q:`A market grows by ${g}% a year. Approximately how many years does it take to double?`,
    ...ivOpts(v,[100/g,50/g,2*72/g],x=>nf(x,0)+' years'),
    ex:`Regola del 72: 72 / ${g} ≈ ${nf(v,0)} anni. Esatto: ln 2 / ln(1.${String(g).padStart(2,'0')}) = ${nf(Math.log(2)/Math.log(1+g/100),1)}.`}; }},
 {t:'Stima bottom-up',make(){ const N=ivR(15,60)*10000, a=ivPick([5,8,10,12,15,20]), p=ivPick([300,450,600,800,1200]); const v=N*a/100*p/1e6;
   return {q:`There are ${nf(N)} farms above 50 ha in the target countries. You assume ${a}% adopt a satellite-based advisory service at €${nf(p)} per year. What is the annual market?`,
    ...ivOpts(v,[N*p/1e6,v*12,v/10],ivM),
    ex:`${nf(N)} × ${a}% × €${nf(p)} = €${nf(v,1)}m all'anno. Le trappole: dimenticare l'adozione (€${nf(N*p/1e6,1)}m) o confondere mensile e annuale. Poi confronta con un dato top-down.`}; }},
 {t:'Valore di commutazione',make(){ const PB=ivR(30,90)*10, PC=Math.round(PB*(0.55+Math.random()*0.35)); const v=(PB-PC)/PB;
   return {q:`PV of benefits is €${PB}m and PV of costs is €${PC}m. By how much can benefits fall before the NPV becomes zero?`,
    ...ivOpts(v,[(PB-PC)/PC,PC/PB,1-PC/PB*0.9],ivP),
    ex:`NPV = ${PB} − ${PC} = €${PB-PC}m. Valore di commutazione dei benefici = NPV / PV benefici = ${PB-PC} / ${PB} = ${nf(v*100,1)}%. Se è basso, il risultato è fragile.`}; }},
 {t:'Attribuzione',make(){ const B=ivR(20,90)*10, s=ivPick([60,70,80,90]), a=ivPick([10,15,20,25,30]); const v=B*s/100*a/100;
   return {q:`Precision-agriculture positioning generates €${B}m of annual benefits. ${s}% of receivers in use are Galileo-enabled, and you estimate that ${a}% of the benefit for those users depends on Galileo specifically. What benefit do you attribute to Galileo?`,
    ...ivOpts(v,[B*s/100,B*a/100,B],ivM),
    ex:`${B} × ${s}% × ${a}% = €${nf(v,1)}m. Il beneficio di Galileo è marginale rispetto a GPS: attribuirgli tutto (€${B}m) è l'errore più comune.`}; }},
 {t:'Valore attuale',make(){ const X=ivR(5,40)*10, r=ivPick([3,4,5]), t=ivPick([5,10,15,20]); const v=X/Math.pow(1+r/100,t);
   return {q:`What is the present value of €${X}m received in year ${t}, discounted at ${r}%?`,
    ...ivOpts(v,[X/(1+r*t/100),X*(1-r*t/100),X*Math.pow(1+r/100,t)],ivM),
    ex:`${X} / 1.0${r}^${t} = ${X} / ${nf(Math.pow(1+r/100,t),3)} = €${nf(v,1)}m. Lo sconto è composto, non lineare.`}; }}
];

function renderInterview(tab){
  if(tab) IVV.tab=tab; const D=ivDB(); const t=IVV.tab;
  let body='';
  if(t==='req') body=`<p class="small muted">Per ogni requisito: cosa vogliono vedere, come dimostrarlo, la domanda probabile. Nel riquadro scrivi il tuo esempio: resta solo in questo browser.</p>`+IV_REQ.map(r=>`<section class="panel stack"><h3>${esc(r.r)}</h3><dl class="dl"><dt>Cosa cercano</dt><dd>${esc(r.they)}</dd><dt>Come dimostrarlo</dt><dd>${esc(r.prove)}</dd><dt>Domanda probabile</dt><dd><i>${esc(r.q)}</i></dd></dl><textarea class="ivnote" data-ivn="req-${r.k}" rows="3" placeholder="Il tuo esempio concreto (situazione, cosa hai fatto, risultato con numeri)">${esc(D.notes['req-'+r.k]||'')}</textarea></section>`).join('');
  else if(t==='space') body=`<p class="small muted">Dati verificati a novembre 2026 su fonti ufficiali (Commissione, EUSPA, ESA, Corte dei conti UE). Prima del colloquio ricontrolla le voci marcate «verifica».</p>`+IV_SPACE.map(s=>`<section class="panel stack ivtext"><h2>${s.h}</h2>${s.b}</section>`).join('');
  else if(t==='meth') body=IV_METH.map(s=>`<section class="panel stack ivtext"><h2>${s.h}</h2>${s.b}</section>`).join('')+`<div class="row"><button class="primary" data-ivt="ex">Prova gli esercizi numerici</button></div>`;
  else if(t==='proj') body=`<p class="small muted">Sono i progetti elencati nella vacancy: ti possono chiedere come lavoreresti su uno di questi.</p>`+IV_PROJ.map(p=>`<section class="panel stack"><h3>${esc(p.t)}</h3><dl class="dl"><dt>Di cosa si tratta</dt><dd>${esc(p.what)}</dd><dt>Cosa faresti da junior</dt><dd>${esc(p.you)}</dd><dt>Metodo</dt><dd>${esc(p.m)}</dd><dt>Trappola</dt><dd>${esc(p.trap)}</dd><dt>Domanda possibile</dt><dd><i>${esc(p.q)}</i></dd></dl></section>`).join('');
  else if(t==='tq') body=`<p class="small muted">Prova a rispondere ad alta voce in inglese, in 60-90 secondi, poi apri la risposta modello. Non impararla a memoria: prendi la struttura.</p>`+IV_TQ.map((x,i)=>`<section class="panel stack"><h3>${i+1}. ${esc(x.q)}</h3><details><summary>Risposta modello</summary><p class="ivans" lang="en">${esc(x.a)}</p>${x.n?`<p class="small muted">${esc(x.n)}</p>`:''}</details></section>`).join('');
  else if(t==='bq') body=`<p class="small muted">Schema STAR: Situazione, Compito, Azione (la parte più lunga, in prima persona), Risultato con numeri. Scrivi in inglese. Le risposte restano solo in questo browser.</p>`+IV_BQ.map(x=>`<section class="panel stack"><h3 lang="en">${esc(x.q)}</h3><p class="small">${esc(x.t)}</p><textarea class="ivnote" data-ivn="bq-${x.k}" rows="5" placeholder="${x.k==='ask'?'Le tue domande':'Situation · Task · Action · Result'}">${esc(D.notes['bq-'+x.k]||'')}</textarea></section>`).join('');
  else if(t==='ex') body=ivExHTML();
  else if(t==='quiz') body=ivQuizHTML();
  app().innerHTML=header('Colloquio EY · EU Space','Junior EU Consultant, Market Intelligence and Space Technology (Diegem). Requisiti, contenuti tecnici, domande ed esercizi.')+`
  <main class="wrap stack">
    <nav class="ivtabs" aria-label="Sezioni">${IV_TABS.map(([k,l])=>`<button class="${t===k?'on':''}" data-ivt="${k}">${l}</button>`).join('')}</nav>
    ${body}
  </main>${footer()}`;
  bindNav();
  document.querySelectorAll('[data-ivt]').forEach(b=>b.onclick=()=>{ renderInterview(b.dataset.ivt); window.scrollTo(0,0); });
  document.querySelectorAll('.ivnote').forEach(a=>a.oninput=()=>{ ivDB().notes[a.dataset.ivn]=a.value; clearTimeout(a._t); a._t=setTimeout(saveDB,400); });
  if(t==='ex') ivExBind();
  if(t==='quiz') ivQuizBind();
}
function ivExHTML(){
  const D=ivDB(); if(!IVV.ex) IVV.ex=ivNewEx(); const X=IVV.ex;
  return `<section class="panel stack"><div class="row spread"><span class="eyebrow">${esc(X.t)}</span><span class="small mono">Giuste ${D.ex.ok}/${D.ex.n}</span></div>
    <p class="ivq" lang="en">${esc(X.q)}</p>
    <div class="ivopts">${X.opts.map((o,i)=>`<button class="ivopt ${X.ans!==undefined?(i===X.key?'ok':i===X.ans?'bad':''):''}" data-ixo="${i}" ${X.ans!==undefined?'disabled':''}><b>${'ABCD'[i]}</b> ${esc(o)}</button>`).join('')}</div>
    ${X.ans!==undefined?`<div class="note ${X.ans===X.key?'okn':'badn'}"><b>${X.ans===X.key?'Giusta.':'Sbagliata: la risposta è '+'ABCD'[X.key]+'.'}</b> ${esc(X.ex)}</div>`:'<p class="small muted">Puoi usare carta e calcolatrice: qui conta il metodo.</p>'}
    <div class="row"><button class="primary" id="ix-next">${X.ans!==undefined?'Nuovo esercizio':'Salta'}</button><label class="row small">Tipo <select id="ix-type"><option value="">Misti</option>${IV_EX.map((e,i)=>`<option value="${i}" ${IVV.exType===String(i)?'selected':''}>${e.t}</option>`).join('')}</select></label></div></section>`;
}
function ivNewEx(){ const i=IVV.exType?+IVV.exType:Math.floor(Math.random()*IV_EX.length); return Object.assign({t:IV_EX[i].t},IV_EX[i].make()); }
function ivExBind(){
  document.querySelectorAll('[data-ixo]').forEach(b=>b.onclick=()=>{ const X=IVV.ex; if(X.ans!==undefined) return; X.ans=+b.dataset.ixo; const D=ivDB(); D.ex.n++; if(X.ans===X.key) D.ex.ok++; saveDB(); renderInterview('ex'); });
  $('#ix-next').onclick=()=>{ IVV.ex=ivNewEx(); renderInterview('ex'); };
  $('#ix-type').onchange=e=>{ IVV.exType=e.target.value; IVV.ex=ivNewEx(); renderInterview('ex'); };
}
function ivQuizHTML(){
  const D=ivDB();
  if(!IVV.quiz) IVV.quiz={order:IV_QUIZ.map((_,i)=>i).sort(()=>Math.random()-.5),i:0,ok:0,ans:undefined,perm:null};
  const Q=IVV.quiz;
  if(Q.i>=Q.order.length) return `<section class="panel stack"><h2>Quiz finito: ${Q.ok}/${Q.order.length}</h2><p>${Q.ok>=Q.order.length*0.85?'Base solida.':'Rileggi le schede Spazio UE e Metodi, poi rifallo.'}</p><div class="row"><button class="primary" id="iq-restart">Ricomincia</button></div></section>`;
  const it=IV_QUIZ[Q.order[Q.i]]; if(!Q.perm) Q.perm=it[1].map((_,i)=>i).sort(()=>Math.random()-.5);
  const key=Q.perm.indexOf(0);
  return `<section class="panel stack"><div class="row spread"><span class="eyebrow">Domanda ${Q.i+1} di ${Q.order.length}</span><span class="small mono">Totale storico ${D.quiz.ok}/${D.quiz.n}</span></div>
    <p class="ivq" lang="en">${esc(it[0])}</p>
    <div class="ivopts">${Q.perm.map((j,i)=>`<button class="ivopt ${Q.ans!==undefined?(i===key?'ok':i===Q.ans?'bad':''):''}" data-iqo="${i}" ${Q.ans!==undefined?'disabled':''}><b>${'ABCD'[i]}</b> ${esc(it[1][j])}</button>`).join('')}</div>
    ${Q.ans!==undefined?`<div class="note ${Q.ans===key?'okn':'badn'}"><b>${Q.ans===key?'Giusta.':'Sbagliata.'}</b> ${esc(it[2])}</div><div class="row"><button class="primary" id="iq-next">Avanti</button></div>`:''}</section>`;
}
function ivQuizBind(){
  const Q=IVV.quiz;
  document.querySelectorAll('[data-iqo]').forEach(b=>b.onclick=()=>{ if(Q.ans!==undefined) return; Q.ans=+b.dataset.iqo; const ok=Q.ans===Q.perm.indexOf(0); if(ok) Q.ok++; const D=ivDB(); D.quiz.n++; if(ok) D.quiz.ok++; saveDB(); renderInterview('quiz'); });
  const n=$('#iq-next'); if(n) n.onclick=()=>{ Q.i++; Q.ans=undefined; Q.perm=null; renderInterview('quiz'); };
  const r=$('#iq-restart'); if(r) r.onclick=()=>{ IVV.quiz=null; renderInterview('quiz'); };
}
