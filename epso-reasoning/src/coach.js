// ---------- coach: weak points from past answers, targeted practice, tips ----------
const TRAP_TIP={
  con:'Confronta ogni parte dell\'opzione con la frase del testo che ne parla: basta un dettaglio in contrasto per renderla falsa.',
  mix:'Ricontrolla a chi o a cosa si riferisce ogni numero: la cifra è nel testo, ma attribuita a un soggetto o a un periodo diverso.',
  qnt:'Sottolinea always, never, all, only, most: cerca subito nel testo un\'eccezione o un quantificatore più debole (often, some, many).',
  mod:'may, could, should non sono is o will: se il testo parla di una possibilità o di una previsione, un\'opzione che afferma un fatto va oltre.',
  cau:'Che una cosa venga dopo un\'altra non significa che ne sia l\'effetto: cerca because, led to, as a result. Senza connettivo causale, è non deducibile.',
  ass:'Chiediti quale frase del testo lo dimostra. Se devi aggiungere un passaggio tuo, è un\'assunzione.',
  ext:'Dimentica quello che sai sull\'argomento: conta solo il testo, anche quando l\'opzione è vera nella realtà.',
  gen:'Il testo parla di alcuni casi: un\'opzione che vale per tutti va oltre il testo.',
  cmp:'Se il testo non mette a confronto le due cose, il confronto non è deducibile.',
  nd:'Prima di scegliere, trova la frase che lo dimostra. Se non c\'è, l\'affermazione è non deducibile.',
  dom:'Domanda "incorrect": cerchi l\'unica affermazione smentita dal testo. Quelle vere vanno scartate per prime.',
  ndf:'Domanda "incorrect": un\'affermazione non deducibile non è falsa. Scegli solo quella che il testo contraddice in modo esplicito.'
};
const NUM_TIP={
  pct:'Variazione %: (nuovo − vecchio) ÷ vecchio. La base è sempre il valore di partenza.',
  share:'Quota: parte ÷ totale dello stesso anno. Somma la colonna giusta, non la riga.',
  percap:'Miliardi ÷ milioni = migliaia. Scrivi le unità accanto ai numeri prima di dividere.',
  maxratio:'"Per addetto" è un rapporto: calcola casi ÷ personale per ogni riga, non guardare il valore più alto.',
  maxgrowth:'Percentuale, non assoluto: stima (nuovo ÷ vecchio) per ogni riga e confronta i rapporti.',
  fx:'Converti ogni prezzo in € con il suo tasso (prezzo ÷ tasso), poi sottrai.',
  reverse:'Valore iniziale = finale ÷ (1 + p). Mai togliere la percentuale dal valore finale.',
  compound:'Crescita composta: valore × tasso × tasso. Calcola il tasso con 4 decimali, non arrotondarlo troppo presto.',
  pp:'Tra due percentuali la differenza è in punti percentuali; la variazione relativa è un\'altra cosa.',
  pie:'(% A − % B) × totale. Prima la differenza delle percentuali, poi una sola moltiplicazione.',
  bar:'"Exceeded by x%": (alto − basso) ÷ basso. La base è il valore più piccolo.',
  weighted:'Media ponderata: (n1 × p1 + n2 × p2) ÷ (n1 + n2). La media semplice è una trappola.',
  cumul:'"Up to and including": somma tutti gli anni fino a quello indicato, non solo l\'ultimo.',
  netbal:'Più veloce: totale entrate − totale uscite (due somme), invece di un saldo per ogni riga.',
  yearboth:'Per ogni anno controlla entrambe le condizioni; scarta subito gli anni che ne falliscono una.',
  inverse:'Calcola il rapporto solo in modo approssimato per ogni riga: basta a vedere quale si avvicina al valore.',
  twocol:'Leggi le intestazioni: € milioni ÷ unità. Controlla l\'ordine di grandezza del risultato.',
  rowpct:'Usa il totale della stessa riga e la percentuale della colonna giusta.',
  split:'Prima la quota (totale × %), poi la divisione tra le persone.'
};
const ABS_TIP={
  rot:'Rotazione: guarda solo la lancetta e misura l\'angolo tra due figure vicine (45°, 90°, 135°) e il verso.',
  cnt:'Conta i punti in ogni figura e scrivi la sequenza: +1, −1 o schemi tipo +2, −1.',
  pos:'Segui solo il quadratino lungo il bordo: conta di quante posizioni si sposta e in che verso.',
  fill:'Riempimento: scrivi la sequenza (bianco, nero, grigio, tratteggiato) e trova il ciclo.',
  shape:'Forma centrale: scrivi la sequenza delle forme e trova il ciclo di 2 o 3.',
  sides:'Conta i lati delle due forme nella stessa figura: la regola è il rapporto tra interna ed esterna, non la sequenza tra figure.',
  wheel:'Ruota: segui un settore colorato alla volta e conta di quante posizioni si sposta; ognuno ha il suo passo.',
  grid:'Griglia: numera le caselle da 1 a 9 riga per riga e segui un colore alla volta.',
  union:'Prova a coppie: la figura 3 è la somma di 1 e 2? Allora la 6 è la somma di 4 e 5.',
  xor:'Prova a coppie: la figura 3 ha le linee di 1 e 2 tranne quelle comuni? Applica lo stesso a 4 e 5.'
};
const FAM_LABEL=Object.assign({},...Object.keys(ABS_TIP).map(k=>({[k]:AB_RULES[k]?AB_RULES[k].label:k})));

function recentAttempts(){
  const out=[]; DB.sessions.filter(s=>s.kind!=='sheet').slice(0,15).forEach(s=>s.parts.forEach(p=>(p.att||[]).forEach(a=>out.push(a)))); return out;
}
function profile(){
  const at=recentAttempts();
  const v=at.filter(a=>a.sec==='verbal'), n=at.filter(a=>a.sec==='numerical'), ab=at.filter(a=>a.sec==='abstract');
  const traps={}; v.forEach(a=>{ if(a.trap) traps[a.trap]=(traps[a.trap]||0)+1; });
  const qi=v.filter(a=>a.q==='i'), qc=v.filter(a=>a.q==='c');
  const tpl={}; n.forEach(a=>{ const t=tpl[a.tpl]=tpl[a.tpl]||{n:0,wrong:0,slow:0,ms:0}; t.n++; t.ms+=a.ms; if(!a.ok) t.wrong++; if(a.ms>SEC.numerical.sec/SEC.numerical.n*1000*1.5) t.slow++; });
  const fam={}; ab.forEach(a=>{ (a.rules||[]).forEach(r=>{ const f=fam[r]=fam[r]||{n:0,miss:0}; f.n++; }); if(!a.ok){ const miss=(a.broken&&a.broken.length)?a.broken:(a.rules||[]); miss.forEach(r=>{ fam[r]=fam[r]||{n:0,miss:0}; fam[r].miss++; }); } });
  return {v,n,ab,traps,qi,qc,tpl,fam};
}
function weakPoints(){
  const P=profile(), W=[];
  const wi=P.qi.filter(a=>!a.ok).length;
  if(P.qi.length>=2&&wi>=2) W.push({sec:'verbal',key:'qi',score:wi*2.2,text:`Domande "incorrect": ${wi} errori su ${P.qi.length}`,tip:TRAP_TIP.dom});
  Object.entries(P.traps).filter(([k])=>k!=='dom'&&k!=='ndf').forEach(([k,c])=>{ if(c>=1) W.push({sec:'verbal',key:'t:'+k,score:c*2,text:`${TRAPS[k]}: ${c} ${c>1?'errori':'errore'}`,tip:TRAP_TIP[k]}); });
  const slowV=P.v.filter(a=>a.ms>SEC.verbal.sec/SEC.verbal.n*1000*1.25).length;
  if(slowV>=4) W.push({sec:'verbal',key:'slow',score:slowV*0.6,text:`Verbale lento: ${slowV} domande oltre 2:10`,tip:'Oltre i 2 minuti su una domanda, scegli la migliore, segna e passa oltre.'});
  Object.entries(P.tpl).forEach(([k,t])=>{ const sc=t.wrong*2+t.slow*1.5; if(sc>0) W.push({sec:'numerical',key:'n:'+k,score:sc,text:`${NUM_T[k].label}: ${t.wrong?`${t.wrong} su ${t.n} sbagliate`:''}${t.wrong&&t.slow?', ':''}${t.slow?`tempo medio ${fmtT(t.ms/t.n/1000)}`:''}`,tip:NUM_TIP[k]}); });
  Object.entries(P.fam).forEach(([k,f])=>{ if(f.miss>0) W.push({sec:'abstract',key:'a:'+k,score:f.miss*2*(f.miss/f.n+0.5),text:`${FAM_LABEL[k]||k}: ${f.miss} su ${f.n} mancate`,tip:ABS_TIP[k]}); });
  // results on the manual and answer sheets
  const sheets=DB.sessions.filter(z=>z.kind==='sheet').slice(0,12);
  ['verbal','numerical','abstract'].forEach(sec=>{ const att=[]; sheets.forEach(z=>z.parts.forEach(p=>{ if(p.sec===sec) (p.att||[]).forEach(a=>att.push(a)); }));
    if(att.length>=5){ const ok=att.filter(a=>a.ok).length, r=ok/att.length; if(r<0.65) W.push({sec,key:'m:'+sec,score:(1-r)*6,text:`Esercizi del manuale: ${ok}/${att.length} giuste`,tip:'Rifai gli esercizi sbagliati (Statistiche → Esercizi del manuale da rifare) e leggi la spiegazione del manuale prima di ripartire.'});
      const budget=SEC[sec].sec/SEC[sec].n*1000, slow=att.filter(a=>a.ms>budget*1.3).length; if(slow>=3) W.push({sec,key:'ms:'+sec,score:slow*0.7,text:`Manuale: ${slow} esercizi oltre ${fmtT(budget*1.3/1000)}`,tip:'Se dopo il tempo previsto non vedi la regola, scegli, segna e vai avanti: all\'esame il tempo è uno solo per tutte le domande.'}); } });
  return W.sort((a,b)=>b.score-a.score);
}
function weightedPick(weights,n,cap=3){ // weights: {key:w}; returns n keys, repeats allowed but spread
  const out=[]; const w=Object.assign({},weights);
  for(let i=0;i<n;i++){ const tot=Object.values(w).reduce((a,b)=>a+b,0); let r=Math.random()*tot, pick=null; for(const [k,x] of Object.entries(w)){ r-=x; if(r<=0){pick=k;break} } pick=pick||Object.keys(w)[0]; out.push(pick); w[pick]=out.filter(k=>k===pick).length>=cap?0:w[pick]*0.45; if(Object.values(w).every(v=>v<=0)) Object.keys(w).forEach(k=>w[k]=1); }
  return out;
}
function withTop(weights,data,n){ // the two weakest keys first (the weakest twice), then a weighted fill
  const top=Object.keys(data).filter(k=>data[k]>0).sort((a,b)=>data[b]-data[a]).slice(0,2);
  const first=top.length?[top[0],top[0]].concat(top.slice(1)):[];
  const w=Object.assign({},weights); first.forEach(k=>{ if(first.filter(z=>z===k).length>=2) w[k]=(w[k]||0)*0.15; });
  return R.shuffle(first.slice(0,n).concat(weightedPick(w,Math.max(0,n-first.length),1)));
}
function buildFocusParts(nPer){
  const P=profile(), W=weakPoints();
  const weakTraps=new Set(W.filter(x=>x.key.startsWith('t:')).map(x=>x.key.slice(2)));
  const weakI=W.some(x=>x.key==='qi');
  // verbal: prefer passages that train your traps, 'incorrect' questions if weak, then unseen or missed passages
  const scored=verbalSources().map(s=>{ let sc=Math.random()*0.8;
    if(DB.vwrong[s.pid]) sc+=2.5; else if(!DB.seen[s.pid]) sc+=1.5; else sc+=1/(1+DB.seen[s.pid]);
    let forceQ=null;
    if(s.origin==='orig'){ s.p.o.slice(1).forEach(o=>{ if(weakTraps.has(o[1])) sc+=1.4; }); if(weakI&&s.p.q==='i') sc+=2.5; }
    else if(weakI){ sc+=1.5; forceQ='i'; }
    return {s,sc,forceQ}; }).sort((a,b)=>b.sc-a.sc).slice(0,nPer);
  const verbal=scored.map(x=>buildVerbalItem(x.s,x.forceQ));
  // numerical: weights from errors and slowness; untried templates get a small weight
  const nw={}; Object.keys(NUM_T).forEach(k=>{ const t=P.tpl[k]; nw[k]=t?0.4+t.wrong*2.5+t.slow*1.5:0.7; });
  const nd={}; Object.entries(P.tpl).forEach(([k,t])=>nd[k]=t.wrong*2+t.slow*1.5);
  const numerical=withTop(nw,nd,nPer).map(k=>buildNumericalItem(k));
  // abstract: weights from missed rule families
  const aw={}; ['rot','cnt','pos','fill','shape','sides','wheel','grid','union','xor'].forEach(k=>{ const f=P.fam[k]; aw[k]=f?0.4+f.miss*2.5:0.6; });
  const ad={}; Object.entries(P.fam).forEach(([k,f])=>ad[k]=f.miss);
  const abstract=withTop(aw,ad,nPer).map(k=>buildAbstractFamily(k));
  return [['verbal',verbal],['numerical',R.shuffle(numerical)],['abstract',abstract]].map(([sec,items])=>({sec,items,ans:{},flag:{},ms:{},changes:{},cur:0,timed:false,seconds:0}));
}
function startFocus(){ S={kind:'focus',parts:buildFocusParts(6),pi:0,created:Date.now(),done:false}; renderIntro(); }
function coachTip(it,a){
  if(a===undefined||a===it.key) return '';
  let t='';
  if(it.sec==='verbal') t=TRAP_TIP[verbalTrap(it,a)]||'';
  else if(it.sec==='numerical') t=NUM_TIP[it.tpl]||'';
  else { const br=it.options[a].broken||[]; t=br.map(r=>ABS_TIP[r]).filter(Boolean).join(' ')||ABS_TIP[it.rules[0]]||''; }
  return t?`<p class="tip"><b>Come evitarlo:</b> ${esc(t)}</p>`:'';
}
function weakPanel(compact){
  const W=weakPoints();
  if(!W.length) return `<div class="panel stack"><h2>I tuoi punti deboli</h2><p class="muted">Fai almeno una prova a tempo per ogni test: poi qui trovi i punti da allenare e un allenamento costruito sui tuoi errori.</p></div>`;
  const top=W.slice(0,compact?3:6);
  return `<div class="panel stack"><div class="row spread"><h2>I tuoi punti deboli</h2><span class="small muted">dalle ultime ${Math.min(15,DB.sessions.filter(s=>s.kind!=='sheet').length)} sessioni</span></div>
    <ol class="weak">${top.map(w=>`<li><span class="eyebrow">${SEC[w.sec].it}</span><b>${esc(w.text)}</b><span class="small muted">${esc(w.tip||'')}</span></li>`).join('')}</ol>
    <div class="row"><button class="primary" data-focus="1">Allenamento mirato · 18 domande con correzione</button></div></div>`;
}
function bindFocus(){ document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>startFocus()); }
