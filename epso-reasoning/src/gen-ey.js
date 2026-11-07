// ---------- EY (Maki) practice: original items. MIND, critical thinking, adaptability, AI proficiency ----------
const eyId=p=>p+'-'+Math.random().toString(36).slice(2,8);
function mcq(sec,tpl,stim,question,opts,keyIdx,explain,tip,shuffle=true){
  let o=opts.map((x,i)=>({label:x,why:i===keyIdx?null:'',k:i===keyIdx}));
  if(shuffle) o=R.shuffle(o);
  return {sec,fmt:'numerical',id:eyId(sec+'-'+tpl),tpl,stim,question,options:o.map(x=>({label:x.label,why:x.why})),key:o.findIndex(x=>x.k),explain,tip};
}
function numOpts5(v,slips,fmt){ const r=numOptions(v,slips,fmt); return r; }

// ----- MIND: numerical word problems -----
const EY_NUM=[
 ()=>{ const a=R.pick([4,5,6,8,10,12]), b=R.pick([3,4,6,8,12,15].filter(x=>x!==a)); const t=a*b/(a+b);
   const r=numOptions(t,[[(a+b)/2,'media dei due tempi'],[Math.abs(a-b),'differenza dei tempi'],[a*b/Math.max(a,b),'solo il più veloce']],x=>nf(x,1)+' days');
   return {stim:'',q:`Anna can complete a report in ${a} days working alone. Ben can complete the same report in ${b} days. Working together at the same rates, how long do they need?`,...r,ex:`Insieme fanno 1/${a} + 1/${b} del lavoro al giorno = ${nf(1/a+1/b,3)}. Tempo = 1 ÷ ${nf(1/a+1/b,3)} = ${nf(t,1)} giorni.`,tip:'Lavoro combinato: somma le velocità (1/a + 1/b), non i tempi.'}; },
 ()=>{ const p=R.int(3,8), d=R.pick([10,12,15,20]), p2=R.int(2,6)*p; const v=d*p2/p;
   const r=numOptions(v,[[d*p/p2,'proporzione invertita'],[d+p2-p,'somma invece di proporzione'],[v/2,'metà']],x=>nf(x,0)+' days');
   return {stim:'',q:`A team completes ${p} projects in ${d} days. At the same pace, how many days does it need for ${p2} projects?`,...r,ex:`${d} ÷ ${p} = ${nf(d/p,2)} giorni a progetto; × ${p2} = ${nf(v,0)} giorni.`,tip:'Prima il valore unitario (giorni per progetto), poi moltiplica.'}; },
 ()=>{ const price=R.int(8,40)*10, d1=R.pick([10,20,25,30]), d2=R.pick([10,15,20]); const v=price*(1-d1/100)*(1-d2/100);
   const r=numOptions(v,[[price*(1-(d1+d2)/100),'sconti sommati invece che in sequenza'],[price*(1-d1/100),'solo il primo sconto'],[price*d1*d2/10000,'calcolati solo gli sconti']],x=>'€'+nf(x,2));
   return {stim:'',q:`A laptop costs €${nf(price)}. It is discounted by ${d1}%, and the discounted price is then reduced by a further ${d2}%. What is the final price?`,...r,ex:`€${nf(price)} × ${nf(1-d1/100,2)} × ${nf(1-d2/100,2)} = €${nf(v,2)}. Due sconti in sequenza non si sommano.`,tip:'Sconti successivi: moltiplica i fattori (1 − p).'}; },
 ()=>{ let tot,a,b,c; do{ tot=R.int(12,60)*100; a=R.int(2,5); b=R.int(2,6); c=R.int(1,4); }while(b*3===a+b+c||a===b); const v=tot*b/(a+b+c);
   const r=numOptions(v,[[tot/3,'diviso in parti uguali'],[tot*b/(a+c),'denominatore sbagliato'],[tot*a/(a+b+c),'quota di un altro']],x=>'€'+nf(Math.round(x)));
   return {stim:'',q:`A budget of €${nf(tot)} is shared between three units in the ratio ${a}:${b}:${c}. How much does the second unit receive?`,...r,ex:`Parti totali ${a}+${b}+${c} = ${a+b+c}. €${nf(tot)} × ${b}/${a+b+c} = €${nf(Math.round(v))}.`,tip:'Rapporto a:b:c → somma le parti, poi totale × parte/somma.'}; },
 ()=>{ const s=R.pick([60,75,80,90,100,120]), t1=R.pick([1.5,2,2.5]), s2=R.pick([50,60,80].filter(x=>x!==s)), t2=R.pick([1,1.5,2]); const v=(s*t1+s2*t2)/(t1+t2);
   const r=numOptions(v,[[(s+s2)/2,'media semplice delle velocità'],[s*t1+s2*t2,'distanza totale, non velocità'],[Math.max(s,s2),'velocità più alta']],x=>nf(x,1)+' km/h');
   return {stim:'',q:`A car travels for ${nf(t1,1)} hours at ${s} km/h and then for ${nf(t2,1)} hours at ${s2} km/h. What is its average speed over the whole trip?`,...r,ex:`Distanza = ${s}×${t1} + ${s2}×${t2} = ${nf(s*t1+s2*t2,0)} km; tempo = ${t1+t2} h; media = ${nf(v,1)} km/h.`,tip:'Velocità media = distanza totale ÷ tempo totale, non la media delle velocità.'}; },
 ()=>{ const n=R.int(4,7), avg=R.int(60,85), x=R.int(70,98); const v=(avg*n+x)/(n+1);
   const r=numOptions(v,[[(avg+x)/2,'media delle due medie'],[avg+x/(n+1),'formula sbagliata'],[avg*n/(n+1),'nuovo voto dimenticato']],x2=>nf(x2,1));
   return {stim:'',q:`The average score of ${n} tests is ${avg}. After one more test with a score of ${x}, what is the new average?`,...r,ex:`Somma = ${avg}×${n} + ${x} = ${avg*n+x}; ÷ ${n+1} = ${nf(v,1)}.`,tip:'Nuova media: ricostruisci la somma totale, aggiungi, dividi per il nuovo numero.'}; },
 ()=>{ const p1=R.int(30,60)/10, q1=R.pick([250,330,400,500]), p2=R.int(40,90)/10, q2=R.pick([500,750,1000].filter(z=>z>q1)); const u1=p1/q1*1000, u2=p2/q2*1000; if(Math.abs(u1-u2)<0.4) return EY_NUM[6]();
   const best=u1<u2?'Pack A':'Pack B', worst=u1<u2?'Pack B':'Pack A';
   const o=[best,worst,'Both cost the same per litre','It cannot be determined']; const it=mcq('mind','unit','',`A shop sells the same drink in two packs: Pack A costs €${nf(p1,2)} for ${q1} ml; Pack B costs €${nf(p2,2)} for ${q2} ml. Which pack is cheaper per litre?`,o,0,`A: €${nf(u1,2)}/litro · B: €${nf(u2,2)}/litro. Conviene ${u1<u2?'A':'B'}.`,'Confronta sempre il prezzo per unità (€ per litro), non il prezzo totale.'); it.options.forEach(x=>x.why=x.label===best?null:'unità non confrontate'); return {stim:'',q:it.question,options:it.options,key:it.key,ex:it.explain,tip:it.tip}; }
];
function eyNumItem(sec){ const f=R.pick(EY_NUM)(); return {sec,fmt:'numerical',id:eyId(sec+'-num'),tpl:'ey-num',stim:f.stim||'',question:f.q,options:f.options,key:f.key,explain:f.ex,tip:f.tip}; }

// ----- MIND: number series -----
function eySeriesItem(sec){
  const kinds=[
    ()=>{ const a=R.int(2,30), d=R.int(3,12); const s=[0,1,2,3,4].map(i=>a+d*i); return {s,next:a+d*5,ex:`Si aggiunge ${d} ogni volta.`,slips:[a+d*4+d+1,a+d*6,a+d*5-1]}; },
    ()=>{ const a=R.int(2,6), r=R.pick([2,3]); const s=[0,1,2,3,4].map(i=>a*r**i); return {s,next:a*r**5,ex:`Si moltiplica per ${r}.`,slips:[s[4]+(s[4]-s[3]),a*r**5+r,s[4]*(r+1)]}; },
    ()=>{ const a=R.int(1,10), d0=R.int(1,4), dd=R.int(1,3); const s=[a]; let d=d0; for(let i=1;i<5;i++){ s.push(s[i-1]+d); d+=dd; } return {s,next:s[4]+d,ex:`Le differenze crescono di ${dd}: ${s.slice(1).map((x,i)=>x-s[i]).join(', ')}, ${d}.`,slips:[s[4]+d-dd,s[4]+d+dd,s[4]+(s[4]-s[3])]}; },
    ()=>{ const a=R.int(1,9), b=R.int(20,40), da=R.int(2,5), db=R.pick([-2,-3,3,4]); const s=[a,b,a+da,b+db,a+2*da]; return {s,next:b+2*db,ex:`Due serie alternate: ${a}, ${a+da}, ${a+2*da} (+${da}) e ${b}, ${b+db}, ? (${db>0?'+':''}${db}).`,slips:[a+3*da,b+db*3,s[4]+da]}; },
    ()=>{ const k=R.int(1,4), off=R.pick([-1,0,1,2]); const s=[0,1,2,3,4].map(i=>(i+k)**2+off); return {s,next:(5+k)**2+off,ex:`Quadrati ${k}², ${k+1}², … ${off?`${off>0?'+':''}${off}`:''}.`,slips:[(5+k)**2+off+1,s[4]+(s[4]-s[3]),(6+k)**2+off]}; },
    ()=>{ const a=R.int(1,5), b=R.int(1,5); const s=[a,b]; for(let i=2;i<5;i++) s.push(s[i-1]+s[i-2]); return {s,next:s[3]+s[4],ex:'Ogni numero è la somma dei due precedenti.',slips:[s[4]+(s[4]-s[3]),s[4]*2,s[3]+s[4]+1]}; }
  ];
  const k=R.int(0,kinds.length-1), x=kinds[k]();
  const r=numOptions(x.next,x.slips.map(v=>[v,'regola applicata male']),v=>nf(Math.round(v)));
  if(!r) return eySeriesItem(sec);
  return {sec,fmt:'numerical',id:eyId(sec+'-ser'),tpl:'ey-series',stim:`<p class="seriesnum mono">${x.s.map(v=>nf(v)).join(' , ')} , ?</p>`,question:'Which number comes next in the series?',options:r.options,key:r.key,explain:x.ex,tip:'Guarda prima le differenze tra numeri vicini; se non tornano, prova rapporti, quadrati o due serie alternate.'};
}

// ----- logic: ordering -----
const EY_NAMES=['Anna','Ben','Clara','David','Elena','Filip','Greta','Hugo'];
function eyOrderItem(sec){
  const n=R.int(4,5), names=R.sample(EY_NAMES,n), attr=R.pick([['older','younger','oldest','youngest'],['taller','shorter','tallest','shortest']]);
  // order[0] is the most (oldest/tallest/earliest)
  const clues=[]; for(let i=0;i<n-1;i++){ const a=names[i],b=names[i+1]; clues.push(R.chance(.5)?`${a} is ${attr[0]} than ${b}.`:`${b} is ${attr[1]} than ${a}.`); }
  const ask=R.pick(['most','least','second']);
  const key=ask==='most'?names[0]:ask==='least'?names[n-1]:names[1];
  const qtxt=ask==='most'?`Who is the ${attr[2]}?`:ask==='least'?`Who is the ${attr[3]}?`:`Who is the second ${attr[2]}?`;
  const opts=R.sample(names,Math.min(n,4)); if(!opts.includes(key)) opts[0]=key;
  const it=mcq(sec,'ey-order',`<ul class="clues">${R.shuffle(clues).map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`,qtxt,opts,opts.indexOf(key),`Ordine completo: ${names.join(' > ')}.`,'Scrivi una riga e posiziona le persone indizio per indizio: a carta e penna si risolve in pochi secondi.');
  return it;
}

// ----- logic: syllogisms -----
const EY_TERMS=[['analysts','consultants','graduates'],['reports','documents','files'],['managers','employees','members of the union'],['projects','EU-funded initiatives','audited activities'],['trainees','language speakers','people in the Brussels office'],['policies','regulations','published texts']];
const SYL=[
  {p:(A,B,C)=>[`All ${A} are ${B}.`,`All ${B} are ${C}.`],ok:(A,B,C)=>`All ${A} are ${C}.`,bad:(A,B,C)=>[`All ${C} are ${A}.`,`No ${A} are ${C}.`,`Some ${C} are not ${B}.`],ex:'Se A è dentro B e B è dentro C, allora A è dentro C. Il contrario (tutti i C sono A) non segue.'},
  {p:(A,B,C)=>[`All ${A} are ${B}.`,`No ${B} are ${C}.`],ok:(A,B,C)=>`No ${A} are ${C}.`,bad:(A,B,C)=>[`Some ${A} are ${C}.`,`All ${C} are ${B}.`,`Some ${B} are not ${A}.`],ex:'A è dentro B e B non tocca C: quindi nessun A è C.'},
  {p:(A,B,C)=>[`Some ${A} are ${B}.`,`All ${B} are ${C}.`],ok:(A,B,C)=>`Some ${A} are ${C}.`,bad:(A,B,C)=>[`All ${A} are ${C}.`,`No ${A} are ${C}.`,`All ${C} are ${A}.`],ex:'Gli A che sono B sono anche C: quindi almeno alcuni A sono C. Non si può dire "tutti".'},
  {p:(A,B,C)=>[`All ${A} are ${B}.`,`Some ${C} are ${A}.`],ok:(A,B,C)=>`Some ${C} are ${B}.`,bad:(A,B,C)=>[`All ${C} are ${B}.`,`No ${C} are ${B}.`,`All ${B} are ${A}.`],ex:'I C che sono A sono anche B (perché tutti gli A sono B): quindi alcuni C sono B.'},
  {p:(A,B,C)=>[`No ${A} are ${B}.`,`All ${C} are ${A}.`],ok:(A,B,C)=>`No ${C} are ${B}.`,bad:(A,B,C)=>[`Some ${C} are ${B}.`,`All ${A} are ${C}.`,`All ${B} are ${C}.`],ex:'C è dentro A, e A non tocca B: quindi nessun C è B.'}
];
function eySylItem(sec){
  const [A,B,C]=R.pick(EY_TERMS), f=R.pick(SYL);
  return mcq(sec,'ey-syl',`<ul class="clues">${f.p(A,B,C).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,'Assuming both statements are true, which conclusion follows necessarily?',[f.ok(A,B,C)].concat(f.bad(A,B,C)),0,f.ex,'Disegna due o tre cerchi (diagrammi di Venn): ciò che segue "necessariamente" deve valere in ogni disegno possibile.');
}
// ----- logic: if-then -----
function eyCondItem(sec){
  const S=R.pick([['a report is approved by the director','it is published on the website'],['an applicant passes the reasoning tests','they are invited to the assessment centre'],['a project exceeds its budget','it is reviewed by the audit unit'],['a meeting has more than ten participants','it is held in room B']]);
  const [P,Q]=S, P2=P.replace(/^(a|an) /,'this '), cases=[
    {fact:`It is known that ${P2}.`,stmt:`Therefore ${Q}.`,ans:0,ex:'Se P allora Q, e P è vero: Q segue (modus ponens).'},
    {fact:`It is known that it is NOT the case that ${Q}.`,stmt:`Therefore it is NOT the case that ${P2}.`,ans:0,ex:'Se P allora Q, e Q è falso: anche P è falso (contronominale).'},
    {fact:`It is known that ${Q}.`,stmt:`Therefore ${P2}.`,ans:2,ex:'Q può essere vero anche per altri motivi: da Q non si può risalire a P (errore dell\'affermazione del conseguente).'},
    {fact:`It is known that it is NOT the case that ${P2}.`,stmt:`Therefore it is NOT the case that ${Q}.`,ans:2,ex:'Se P è falso, la regola non dice nulla su Q (errore della negazione dell\'antecedente).'}
  ];
  const c=R.pick(cases);
  return mcq(sec,'ey-cond',`<ul class="clues"><li>Rule: if ${esc(P)}, then ${esc(Q)}.</li><li>${esc(c.fact)}</li></ul>`,`Is the following statement true, false, or impossible to tell? "${c.stmt}"`,['True','False','Cannot say'],c.ans,c.ex,'"Se P allora Q": da P segue Q, da non-Q segue non-P. Da Q o da non-P non segue niente.',false);
}

// ----- adaptability (situational judgement): best answer + why -----
const EY_ADAPT=[
 {s:"Two days before a client deadline, the client changes the scope of the report you are drafting. Your manager is travelling and hard to reach.",o:["Clarify the new scope with the client in writing, re-plan the remaining work and send your manager a short update with the options.","Keep working on the original scope, because that is what was agreed in the contract.","Wait until your manager is back before changing anything.","Start the new scope immediately without telling anyone, to save time."],k:0,w:"Adattarsi senza perdere il controllo: chiarire, ripianificare e informare. Restare rigidi o agire da soli sono entrambi rischiosi."},
 {s:"Your team switches to a new project-management tool you have never used. The first deadline using the tool is next week.",o:["Spend a short time on the tool's tutorial, ask a colleague who knows it for tips and use it on the next task straight away.","Keep tracking your work in your old spreadsheet until the tool is mandatory.","Tell your manager the change is a bad idea and ask to postpone it.","Wait until someone organises a full training session."],k:0,w:"Apprendimento attivo e rapido: provare subito, usare le risorse e i colleghi."},
 {s:"In a meeting, a senior colleague criticises the structure of your analysis in front of the team.",o:["Thank them, ask one or two questions to understand the concern and propose how you will revise it.","Defend every point of your structure so the team sees your work was correct.","Say nothing and ignore the comment, since the analysis is already finished.","Agree with everything to avoid conflict, then keep the original version."],k:0,w:"Usare il feedback: ascoltare, chiarire, migliorare. Non difendersi a oltranza né far finta di accettare."},
 {s:"You are asked to cover a topic outside your expertise (space-industry regulation) for a client briefing in three days.",o:["Map the key sources and people quickly, ask an expert colleague for a 20-minute briefing and be transparent about what still needs checking.","Decline the task because it is outside your expertise.","Copy a briefing from a previous project on a different topic and adapt the title.","Accept and present your own assumptions as established facts."],k:0,w:"Curiosità e apprendimento rapido con onestà sui limiti."},
 {s:"Halfway through a project, the data source you relied on is withdrawn and the planned method no longer works.",o:["Inform the team, look for alternative sources or methods, and agree with the manager on an adjusted plan and timeline.","Continue with the old data you already downloaded without mentioning the problem.","Stop working until the original source is available again.","Change the research question so that no data is needed."],k:0,w:"Resilienza: riconoscere il problema, cercare alternative, riallineare il piano."},
 {s:"Two managers give you conflicting priorities for the same afternoon.",o:["Explain the conflict to both, propose a realistic order of tasks and ask them to confirm the priority.","Do the task of the more senior manager and ignore the other.","Try to do both at the same time and deliver both late.","Pick the task you prefer."],k:0,w:"Gestire le priorità in conflitto in modo trasparente e collaborativo."},
 {s:"A new colleague from another country joins your team and works in a very different way from you.",o:["Talk with them about how each of you prefers to work and agree simple ways to collaborate.","Ask the manager to move them to another team.","Keep your usual way of working and expect them to adjust.","Avoid working with them on shared tasks."],k:0,w:"Flessibilità e collaborazione in un team multiculturale."},
 {s:"Your proposal for a client workshop is rejected by the team, who choose another approach.",o:["Accept the decision, help make the chosen approach work and share one lesson from your proposal that could still be useful.","Keep arguing for your proposal at every meeting.","Do the minimum on the new approach because it was not your idea.","Ask to be removed from the project."],k:0,w:"Adattarsi alle decisioni di gruppo restando costruttivi."},
 {s:"A client asks for the same deliverable in a much shorter format the evening before a presentation.",o:["Identify the three key messages, cut the rest into an annex and check the short version with a colleague.","Send the long version anyway; the client can read what they need.","Ask for the presentation to be postponed.","Shorten it by deleting the last pages."],k:0,w:"Adattare il prodotto alle esigenze del cliente dando priorità ai contenuti."},
 {s:"You receive critical feedback in your mid-year review about missing details in your work.",o:["Ask for two concrete examples, agree on a checklist to use before submitting work and review progress in a month.","Explain that the deadlines were too short.","Accept the feedback but change nothing, since the review is over.","Ask a colleague to check everything for you from now on."],k:0,w:"Trasformare il feedback in un piano concreto di miglioramento."},
 {s:"An unexpected EU regulation is published that affects the recommendations of a nearly finished study.",o:["Assess the impact quickly, flag it to the manager and propose updating the affected recommendations before delivery.","Deliver the study as it is, because the regulation came after the work started.","Add a footnote saying a new regulation exists, without analysing it.","Restart the whole study from scratch."],k:0,w:"Reagire ai cambiamenti esterni con proporzione: valutare, segnalare, aggiornare."},
 {s:"Your team moves from in-person to fully remote work for a month.",o:["Agree with the team on check-ins and shared documents, and keep your manager updated on progress more often than usual.","Work as usual and only reply when contacted.","Wait for the team to return to the office before starting new tasks.","Ask for every task in writing in great detail before starting."],k:0,w:"Adattare il modo di lavorare mantenendo comunicazione e visibilità."}
];
// ----- AI proficiency (practical judgement + basic knowledge) -----
const EY_AI=[
 {s:"You want to use a public generative-AI chatbot to summarise a confidential client contract.",o:["Do not paste it into a public tool; use the firm's approved tool or remove confidential information first, following firm policy.","Paste it in, because the chatbot does not store anything.","Paste it in, but delete the conversation afterwards.","Ask the chatbot whether it is safe to paste confidential data."],k:0,w:"Riservatezza: niente dati confidenziali in strumenti pubblici; usare strumenti approvati o anonimizzare."},
 {s:"An AI summary of a study includes a precise statistic that you cannot find in the original document.",o:["Do not use it until you verify it in the source; it may be invented (a 'hallucination').","Use it, because AI summaries are generally accurate.","Use it but round the number.","Ask the AI to confirm the number and use it if it does."],k:0,w:"I modelli possono inventare dati in modo convincente: si verifica sempre sulla fonte originale. Chiedere conferma all'AI non basta."},
 {s:"The AI gives you a generic, superficial answer to your request for a policy analysis.",o:["Refine the prompt: give context, the audience, the format you want and an example, then iterate.","Conclude that AI is not useful for policy work.","Ask the same question again with the same words.","Accept the answer and add more detail yourself without changing the prompt."],k:0,w:"Qualità dell'interazione: contesto, ruolo, formato ed esempi migliorano l'output; poi si itera."},
 {s:"You use AI to find academic references for a briefing note.",o:["Check that every reference exists and says what is claimed before citing it.","Cite them directly: AI tools only give real references.","Cite only the first three references.","Remove the authors' names to avoid errors."],k:0,w:"Gli strumenti generativi possono produrre citazioni inesistenti: ogni riferimento va controllato."},
 {s:"Which statement best describes how a large language model produces text?",o:["It predicts likely next words from patterns learned in training data, so answers can be fluent but wrong.","It searches a verified database and returns the correct answer.","It understands meaning exactly like a human expert.","It always cites the sources it used."],k:0,w:"Conoscenza di base: un LLM genera testo probabile, non verificato. Per questo serve controllo umano."},
 {s:"Under the EU AI Act, an AI system used to screen job applications is classified as:",o:["High-risk, with obligations such as risk management, human oversight and documentation.","Prohibited in all cases.","Minimal risk, with no obligations.","Outside the scope of the AI Act."],k:0,w:"L'AI Act classifica come ad alto rischio i sistemi usati per selezionare candidati (allegato III, occupazione): obblighi di gestione del rischio, supervisione umana, documentazione."},
 {s:"A colleague pastes AI-generated text unchanged into a client deliverable.",o:["Suggest reviewing and fact-checking it, adapting it to the client, and following the firm's rules on disclosing AI use.","Nothing; AI text is ready to use.","Report the colleague to HR immediately.","Rewrite it all by hand to avoid any AI use."],k:0,w:"Uso responsabile: revisione, verifica dei fatti, trasparenza secondo le regole interne."},
 {s:"You need to analyse a 200-page regulation with an AI tool.",o:["Work section by section, ask for answers with article references, and check key points against the text.","Ask for a one-line summary of the whole regulation and rely on it.","Upload only the first page.","Ask the AI to decide which articles are relevant without reading them yourself."],k:0,w:"Strategia efficace: suddividere, chiedere riferimenti puntuali, verificare sul testo."},
 {s:"An AI tool ranks candidates and consistently scores women lower for the same experience.",o:["Stop relying on it for that decision, report the possible bias and ask for the model and data to be checked.","Keep using it, because the algorithm is objective.","Adjust the scores manually without telling anyone.","Use it only for female candidates."],k:0,w:"Bias: riconoscerlo, segnalarlo, mantenere la supervisione umana."},
 {s:"For which task is a generative-AI assistant LEAST appropriate without expert review?",o:["Giving final legal advice to a client.","Drafting a first outline of a presentation.","Suggesting alternative titles for a report.","Rewriting an email in a more concise style."],k:0,w:"Compiti ad alto rischio (consulenza legale finale) richiedono revisione esperta; bozze e riformulazioni sono usi adatti."},
 {s:"The AI produces a chart with numbers for a slide you must present tomorrow.",o:["Recalculate the key figures from the original data before using the chart.","Use it, because the AI did the maths.","Remove the numbers and keep only the chart shape.","Ask the AI to double-check its own calculations and use the result."],k:0,w:"Anche i calcoli prodotti dall'AI vanno verificati sui dati originali."},
 {s:"Which prompt is most likely to give a useful result?",o:["'You are an EU policy analyst. Summarise the attached text in 5 bullet points for a non-expert client, citing article numbers.'","'Summarise this.'","'Tell me everything about EU policy.'","'Write something good about the text.'"],k:0,w:"Un buon prompt indica ruolo, compito, pubblico, formato e vincoli."}
];
function eySJT(sec,bank,tip){ const x=R.pick(bank); return mcq(sec,sec==='adapt'?'ey-sjt':'ey-ai',`<p class="scenario">${esc(x.s)}</p>`,sec==='adapt'?'What is the most effective response?':(x.s.endsWith(':')||x.s.endsWith('?')?'Choose the best answer.':'What should you do?'),x.o,x.k,x.w,tip); }
function eyPickSJT(sec,n,bank,tip){ return R.sample(bank,Math.min(n,bank.length)).map(x=>mcq(sec,sec==='adapt'?'ey-sjt':'ey-ai',`<p class="scenario">${esc(x.s)}</p>`,sec==='adapt'?'What is the most effective response?':(/[:?]$/.test(x.s)?'Choose the best answer.':'What should you do?'),x.o,x.k,x.w,tip)); }

function eyFigItem(sec,hard){ const it=buildAbstractItem(hard); it.sec=sec; it.fmt='abstract'; return it; }
function eyChartItem(sec,kind){ const pool=kind==='chart'?['bar','pie','line','line']:['pct','share','rowpct','cumul','maxgrowth']; let it=null; for(let t=0;t<10&&!(it&&it.options&&it.key>=0);t++) it=buildNumericalItem(R.pick(pool)); it.sec=sec; it.fmt='numerical'; return it; }
function eyTableItem(sec){ const it=buildNumericalItem(R.pick(['maxratio','maxgrowth','yearboth','share'])); it.sec=sec; it.fmt='numerical'; return it; }

function buildEY(sec,n){
  if(sec==='eyhard') return buildEYHard(sec,n);
  if(sec==='mind'){ const plan=['num','rate','pct','ds','chart','chart','tab','seat','ser','ser2','pyr','ser2','mat2','fig','mat3','num']; const F={num:()=>eyNumItem(sec),rate:()=>eyRateItem(sec),pct:()=>eyPctChainItem(sec),ds:()=>eyDSItem(sec),chart:()=>eyChartItem(sec,'chart'),tab:()=>eyChartItem(sec,'table'),seat:()=>eySeatItem(sec),ser:()=>eySeriesItem(sec),ser2:()=>eySeries2Item(sec),pyr:()=>eyPyramidItem(sec),mat2:()=>eyTransformItem(sec),mat3:()=>eyLatinItem(sec),fig:()=>eyFigItem(sec,true)}; return plan.slice(0,n).map(k=>F[k]()); }
  if(sec==='crit'){ const plan=['fig','mat3','mat2','odd','fig','mat3','mat2','fig','odd','mat3','mat2','fig','mat3']; return plan.slice(0,n).map((k,i)=>k==='odd'?eyOddItem(sec):k==='mat3'?eyLatinItem(sec):k==='mat2'?eyTransformItem(sec):eyFigItem(sec,i%3!==0)); }
  if(sec==='adapt') return eyPickSJT(sec,n,EY_ADAPT,'Nelle situazioni di lavoro la risposta migliore di solito: affronta il problema, comunica con le persone coinvolte, mostra flessibilità e apprendimento. Evita rigidità, passività e iniziative non concordate.');
  return eyPickSJT(sec,n,EY_AI,'Uso dell\'AI: proteggere i dati, verificare i fatti e le fonti, dare contesto nei prompt, mantenere il controllo umano sulle decisioni importanti.');
}

// ----- non-verbal: odd one out (inner/outer side counts) -----
function eyOddItem(sec){
  for(let t=0;t<50;t++){
    const rule=R.pick(['same','minus']); const ok=(o,i)=>rule==='same'?i===o:i===o-1;
    const F=(o,i)=>({kind:'sides',o,i,ro:R.int(0,11)*30,ri:R.int(0,11)*30,inv:R.chance(.5)});
    const good=[]; const used=new Set();
    while(good.length<4){ const o=rule==='same'?R.int(3,6):R.int(4,7), i=rule==='same'?o:o-1; const k=o+':'+i; if(used.has(k)&&used.size<4) continue; used.add(k); good.push(F(o,i)); }
    let bo,bi; do{ bo=R.int(3,7); bi=R.int(3,6); }while(ok(bo,bi));
    const all=R.shuffle(good.map(f=>({f,odd:false})).concat([{f:F(bo,bi),odd:true}]));
    const key=all.findIndex(x=>x.odd);
    return {sec,fmt:'abstract',odd:true,id:eyId(sec+'-odd'),rules:['sides'],hard:true,series:[],question:'Which figure does not belong with the others?',
      options:all.map(x=>({frame:x.f,broken:x.odd?[]:['sides']})),key,
      explain:(rule==='same'?'In quattro figure la forma interna ha lo stesso numero di lati di quella esterna':'In quattro figure la forma interna ha un lato in meno di quella esterna')+`; la ${LETTERS[key]} (${bo} e ${bi} lati) no.`,tip:'Cerca la proprietà che hanno in comune quattro figure su cinque: numero di lati, colori, posizione, simmetria.'};
  }
}
