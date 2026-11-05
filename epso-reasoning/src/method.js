// ---------- method guide (original text) ----------
const METHOD=[
{sec:'verbal',title:'Ragionamento verbale',spec:'20 domande · 35 minuti · circa 1:45 a domanda · soglia 10/20',blocks:[
 {h:'Com\'è fatta una domanda',p:['Un brano di 100-200 parole su qualsiasi argomento: politiche UE, economia, scienza, storia, cultura.','Una domanda, di solito "Which of the following statements is correct?". A volte è "incorrect", oppure una domanda mirata da completare ("According to the passage, …").','Quattro opzioni, una sola giusta. Nessuna penalità per le risposte sbagliate: rispondi sempre.']},
 {h:'I tre tipi di affermazione',list:[
   ['Vera','il testo la dice o la implica in modo diretto, anche combinando due frasi diverse.'],
   ['Falsa','il testo la smentisce, anche solo in una parte. Una frase vera per tre quarti e sbagliata in un dettaglio è falsa.'],
   ['Non deducibile','il testo non basta né per confermarla né per smentirla. È la trappola principale: spesso suona logica o è vera nella realtà, ma qui non conta.']],
  p:['Nelle domande "correct" la risposta è l\'unica Vera; le altre sono False o Non deducibili.','Nelle domande "incorrect" la risposta è l\'unica Falsa: una Non deducibile non è falsa, quindi non va scelta.']},
 {h:'Metodo in cinque passi',ol:['Leggi la domanda: cerchi la correct o la incorrect?','Leggi le quattro opzioni e fissa le parole chiave: numeri, nomi, quantificatori, verbi.','Leggi il brano cercando solo quei punti.','Elimina le opzioni una per una, dicendoti perché ciascuna è falsa o non deducibile.','Se trovi la risposta con certezza prima di finire, scegli e passa oltre: il tempo risparmiato serve dopo.']},
 {h:'Le trappole, con esempi',list:[
   ['Conoscenza esterna','Testo: "the agency\'s budget increased in 2024". Opzione: "the agency is funded by the EU budget". Forse è vero, ma il testo non lo dice: non deducibile.'],
   ['Assunzione','Testo: "some fertilisers raise the yield of certain cereals". Opzione: "nitrogen fertiliser raises wheat yields". Né l\'azoto né il grano sono citati: servono due assunzioni.'],
   ['Quasi uguale non è uguale','"Rarely changed" non è "never changed"; "largely" non è "entirely".'],
   ['Omissione','Un\'opzione che dice meno del testo non è sbagliata. Testo: "the new tram line cut journey times and attracted 30% more passengers". Opzione: "the new line attracted more passengers": vera.'],
   ['Generalizzazione','Testo: "several Nordic cities have closed their centres to cars". Opzione: "Nordic cities close their centres to cars": va oltre il testo.'],
   ['Sovra-specificazione','Testo: "enrolment fell in rural schools". Opzione: "enrolment fell in rural schools because families moved to cities": la causa è aggiunta.'],
   ['Quantificatori','some ≠ many ≠ most ≠ all; "only" e "the only" restringono. "A majority of those who voted" non è "most residents".'],
   ['Frequenza e tempo','often ≠ always; until, since, before, after cambiano il senso. "The port handled most of the region\'s freight until the new terminal opened" non dice che lo faccia oggi.'],
   ['Verbi modali','may, could, might indicano possibilità; should una raccomandazione; will una previsione. "Could reduce" non è "reduces".'],
   ['Causa o successione','"After the reform, exports rose" non dice che la riforma abbia causato l\'aumento. Cerca connettivi come because, led to, as a result.'],
   ['Dettagli scambiati','Cifre, soggetti o periodi presi dal testo ma rimescolati. Testo: "sales rose 12% in France and 4% in Spain". Opzione: "sales rose 12% in Spain". Ricontrolla ogni numero e a chi si riferisce.']]},
 {h:'Gestione del tempo',p:['Budget medio 1:45 a domanda. Se dopo 2:30 sei ancora indeciso, scegli la migliore, segna la domanda e passa oltre.','Alla fine torna sulle domande segnate. Non lasciare risposte vuote.']}
]},
{sec:'numerical',title:'Ragionamento numerico',spec:'10 domande · 20 minuti · circa 2:00 a domanda · soglia 10/20 insieme all\'astratto',blocks:[
 {h:'Com\'è fatta una domanda',p:['Una tabella o un grafico (a barre, a torta, a linee) con dati su paesi, anni, settori.','Una domanda che chiede un valore ("approximately how much…") o un elemento ("which country…").','Cinque opzioni. Di solito c\'è una calcolatrice a schermo: verifica nelle istruzioni TAO.']},
 {h:'Metodo',ol:['Leggi la domanda prima dei dati: quale riga, quale colonna, quale anno, quale unità.','Scrivi l\'operazione prima di fare i conti.','Stima l\'ordine di grandezza: spesso basta per scartare due o tre opzioni.','Calcola con la calcolatrice solo ciò che serve.','Controlla le unità della risposta: €, %, punti percentuali, migliaia, milioni.']},
 {h:'Formule che servono quasi sempre',list:[
   ['Variazione %','(nuovo − vecchio) ÷ vecchio × 100. La base è sempre il valore di partenza.'],
   ['Punti percentuali','Da 6,0% a 7,5% sono +1,5 punti percentuali, cioè +25%. Leggi bene cosa chiede la domanda.'],
   ['Percentuale inversa','Valore finale ÷ (1 + p). Con 1.150 dopo un +15%: 1.150 ÷ 1,15 = 1.000, non 1.150 − 15%.'],
   ['Crescita composta','Valore × (1 + g)ⁿ. Due anni al 10% sono +21%, non +20%.'],
   ['Quota sul totale','Parte ÷ totale × 100. Controlla che il totale sia quello dello stesso anno.'],
   ['Media ponderata','Somma di (dimensione × tasso) ÷ dimensione totale. La media semplice è sbagliata se i gruppi sono diversi.'],
   ['Pro capite','Miliardi ÷ milioni = migliaia. €45 miliardi ÷ 1,5 milioni di abitanti = €30.000.'],
   ['Valute','Con il tasso "unità per €1": prezzo locale ÷ tasso = prezzo in €. Converti prima, poi confronta.'],
   ['"Superiore del x%"','Si calcola sul valore più piccolo: 120 è superiore a 80 del 50%, mentre 80 è inferiore a 120 del 33%.']]},
 {h:'Trappole tipiche',list:[
   ['Base sbagliata','la percentuale si calcola sul valore di partenza, o sul totale della stessa riga.'],
   ['Totale cumulato','"total up to and including 2023" è la somma degli anni fino al 2023, non il valore del solo 2023.'],
   ['Colonne scambiate','una tabella può riportare sia il valore in € sia il numero di pezzi: leggi le intestazioni prima di calcolare.'],
   ['Assoluto o relativo','l\'aumento più grande in valore non è per forza il più grande in percentuale.'],
   ['Condizioni doppie','"higher than both A and B": controlla entrambe le condizioni per ogni anno.'],
   ['Saldi','entrate meno uscite, riga per riga, con il segno; poi somma. Il risultato può essere negativo.'],
   ['Unità','migliaia, milioni, miliardi, € per ettaro: converti prima di confrontare.']]}
]},
{sec:'abstract',title:'Ragionamento astratto',spec:'10 domande · 10 minuti · circa 1:00 a domanda · soglia 10/20 insieme al numerico',blocks:[
 {h:'Com\'è fatta una domanda',p:['Una serie di cinque figure da sinistra a destra. Scegli tra cinque opzioni quella che viene dopo.','Ogni figura combina più elementi; di solito due o tre cambiano secondo una regola, gli altri restano fissi.']},
 {h:'Cosa controllare, un elemento alla volta',list:[
   ['Forma','cambia secondo un ciclo (cerchio → quadrato → triangolo…)?'],
   ['Riempimento','bianco, nero, grigio, tratteggiato: alterna o segue un ciclo?'],
   ['Rotazione','di quanti gradi gira ogni volta, e in che verso?'],
   ['Numero','punti, lati o linee aumentano o diminuiscono? Di quanto? Con schemi tipo +2, −1?'],
   ['Posizione','un elemento si sposta lungo il bordo o in una griglia? Di quante caselle, in che verso?'],
   ['Dimensione e colore','cresce, si riduce, alterna?'],
   ['Più elementi che si muovono','in una ruota o in una griglia ogni elemento colorato può avere un passo e un verso propri: seguine uno alla volta.'],
   ['Sovrapposizione','a volte la terza figura è la somma delle prime due, oppure la somma senza le parti in comune; poi si ripete con quarta e quinta.'],
   ['Conteggio dei lati','due forme nella stessa figura possono avere lo stesso numero di lati, o una un lato in meno dell\'altra: conta sempre i lati.'],
   ['Alternanza','figure in posizione 1, 3, 5 uguali tra loro e 2, 4 uguali tra loro (X, Y, X, Y…).'],
   ['Elementi di disturbo','un elemento che cambia senza regola serve a confondere: individua quello che segue la regola e ignora il resto.']]},
 {h:'Metodo',ol:['Scegli un elemento e confronta ogni coppia di figure vicine, non solo la prima con l\'ultima.','Trovata la regola, scarta subito le opzioni che la violano.','Passa all\'elemento successivo con le opzioni rimaste.','Di solito restano una o due opzioni dopo due regole. Se dopo un minuto non vedi la regola, scegli la più probabile, segna e passa oltre.']}
]}
];
function renderMethod(focus){
  app().innerHTML=header('Metodo','Come sono fatte le tre prove, come affrontarle e le trappole più frequenti.')+`
  <main class="wrap stack narrow">
    <nav class="row wrap-gap">${METHOD.map(m=>`<a class="chip" href="#m-${m.sec}">${m.title}</a>`).join('')}</nav>
    ${METHOD.map(m=>`<section class="panel stack" id="m-${m.sec}"><div class="eyebrow">${esc(m.spec)}</div><h2>${esc(m.title)}</h2>
      ${m.blocks.map(b=>`<div class="stack mblock"><h3>${esc(b.h)}</h3>
        ${b.list?`<dl class="dl">${b.list.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`:''}
        ${b.p?b.p.map(x=>`<p>${esc(x)}</p>`).join(''):''}
        ${b.ol?`<ol class="plan">${b.ol.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}</div>`).join('')}
      <div class="row"><button class="primary" data-msingle="${m.sec}">Prova a tempo</button><button data-mpractice="${m.sec}">Pratica</button></div>
    </section>`).join('')}
    ${footer()}
  </main>`;
  bindNav();
  document.querySelectorAll('[data-msingle]').forEach(b=>b.onclick=()=>startSession('single',{sec:b.dataset.msingle}));
  document.querySelectorAll('[data-mpractice]').forEach(b=>b.onclick=()=>startSession('practice',{sec:b.dataset.mpractice,n:10}));
  if(focus){const el=document.getElementById('m-'+focus); if(el) el.scrollIntoView();}
}
