// ---------- "Errori": every wrong answer with its explanation ----------
const ERRV={filter:'all',showDone:false};
function passageOf(id){ const o=VERBAL_ORIGINAL.find(x=>x.id===id); if(o) return {title:o.title||'',text:o.text}; const k=VERBAL_KVIZ.find(x=>x.id===id); return k?{title:'',text:k.text,src:k.topic}:null; }
function collectErrors(){
  const out=[];
  DB.sessions.forEach(s=>s.parts.forEach((p,pi)=>(p.att||[]).forEach((a,ai)=>{
    if(a.ok) return; const test=a.sec==='sheet'?p.sec:a.sec; if(!SEC[test]) return;
    out.push({s,p,a,test,uid:s.id+':'+pi+':'+ai,src:a.sec==='sheet'?(a.man?'manuale':'foglio'):'programma'});
  })));
  return out;
}
function renderErrors(){
  const all=collectErrors(); DB.understood=DB.understood||{};
  const list=all.filter(e=>(ERRV.filter==='all'||e.test===ERRV.filter)&&(ERRV.showDone||!DB.understood[e.uid]));
  const count=t=>all.filter(e=>(t==='all'||e.test===t)&&!DB.understood[e.uid]).length;
  app().innerHTML=header('Errori','Ogni risposta sbagliata con la spiegazione e il modo per non ripeterla.')+`
  <main class="wrap stack narrow">
    <div class="tabs four">${[['all','Tutti'],['verbal','Verbale'],['numerical','Numerico'],['abstract','Astratto']].map(([k,l])=>`<button class="${ERRV.filter===k?'on':''}" data-ef="${k}">${l} (${count(k)})</button>`).join('')}</div>
    <label class="chk small"><input type="checkbox" id="ev-done" ${ERRV.showDone?'checked':''}><span>Mostra anche gli errori già segnati come capiti</span></label>
    ${list.length?list.slice(0,80).map(errorCard).join(''):`<div class="panel"><p class="muted">${all.length?'Nessun errore da rivedere in questa categoria.':'Ancora nessun errore salvato: fai una prova e torna qui.'}</p></div>`}
    ${list.length>80?`<p class="small muted">Mostro i primi 80 di ${list.length}.</p>`:''}
    ${footer()}
  </main>`;
  bindNav();
  document.querySelectorAll('[data-ef]').forEach(b=>b.onclick=()=>{ ERRV.filter=b.dataset.ef; renderErrors(); });
  $('#ev-done').onchange=e=>{ ERRV.showDone=e.target.checked; renderErrors(); };
  document.querySelectorAll('[data-und]').forEach(b=>b.onclick=()=>{ const u=b.dataset.und; DB.understood[u]=!DB.understood[u]; if(!DB.understood[u]) delete DB.understood[u]; saveDB(); renderErrors(); });
  document.querySelectorAll('[data-ecause]').forEach(b=>b.onclick=()=>{ const [u,c]=b.dataset.ecause.split('|'); const e=all.find(x=>x.uid===u); if(!e) return; e.a.cause=e.a.cause===c?null:c; saveDB(); b.parentNode.querySelectorAll('button').forEach(z=>z.classList.toggle('csel',z===b&&e.a.cause===c)); });
  document.querySelectorAll('[data-eman]').forEach(b=>b.onclick=()=>{ MAN.pendingRetry=b.dataset.eman; renderManual(); });
}
function errorCard(e){
  const a=e.a, L=i=>i===null||i===undefined||i<0?'–':LETTERS[i];
  const when=fmtD(e.s.date), kind=e.src==='programma'?({full:'Simulazione completa',single:'Prova a tempo',practice:'Pratica',review:'Ripasso',focus:'Allenamento mirato'}[e.s.kind]||''):(e.s.label||'Foglio risposte');
  let body='', tip='';
  if(e.test==='verbal'&&a.snap){
    const pz=passageOf(a.id), sn=a.snap;
    body=`${pz?`<details><summary>Brano${pz.title?': '+esc(pz.title):''}</summary><p class="passage small2">${esc(pz.text)}</p></details>`:''}
      <p class="qtext">${esc(sn.q)}</p>
      ${sn.o.map((t,i)=>`<div class="eopt ${i===a.key?'right':''} ${i===a.ans?'mine':''}"><span class="mono">${LETTERS[i]}</span><div><span class="kind k-${sn.k[i]}">${{true:'Vera',false:'Falsa',cannot:'Non deducibile'}[sn.k[i]]}</span>${i===a.key?' <b>risposta giusta</b>':''}${i===a.ans?' <b class="badc">la tua</b>':''}<p>${esc(t)}</p>${sn.w&&sn.w[i]?`<p class="small muted">${esc(sn.w[i])}</p>`:''}</div></div>`).join('')}`;
    tip=TRAP_TIP[a.trap]||'';
  } else if(e.test==='numerical'&&a.snap){
    const sn=a.snap; body=`<details><summary>Dati della domanda</summary>${sn.stim}</details><p class="qtext">${esc(sn.q)}</p>
      <p class="mono small">${sn.o.map((o,i)=>`<span class="${i===a.key?'okc':(i===a.ans?'badc':'')}">${LETTERS[i]}. ${esc(o)}</span>`).join(' · ')}</p>
      <p><b>Soluzione:</b> ${esc(sn.ex)}</p>${a.slip?`<p class="small">La tua risposta corrisponde a: <b>${esc(a.slip)}</b>.</p>`:''}`;
    tip=NUM_TIP[a.tpl]||'';
  } else if(e.test==='abstract'&&a.snap){
    const sn=a.snap; body=`<div class="series sm">${sn.s.map(f=>frameSVG(f)).join('')}<div class="qmark">?</div></div>
      <div class="series sm">${sn.o.map((f,i)=>`<div class="optmini ${i===a.key?'k':''} ${i===a.ans?'w':''}"><span class="mono">${LETTERS[i]}</span>${frameSVG(f)}</div>`).join('')}</div>
      <p><b>Regola:</b> ${esc(sn.ex)}</p>${a.broken&&a.broken.length?`<p class="small">La tua opzione viola: <b>${a.broken.map(r=>AB_RULES[r]?AB_RULES[r].label.toLowerCase():r).join(', ')}</b>.</p>`:''}`;
    tip=(a.broken||[]).map(r=>ABS_TIP[r]).filter(Boolean)[0]||(a.rules?ABS_TIP[a.rules[0]]:'')||'';
  } else if(a.man){
    body=`<p>Manuale · <b>${esc(a.man.part)}</b> · esercizio <b>${a.man.num}</b></p>${a.man.why?`<p><b>Spiegazione del manuale:</b> ${esc(a.man.why)}</p>`:'<p class="small muted">Spiegazione non salvata per questa sessione.</p>'}
      <div class="row"><button class="small" data-eman="${esc(a.man.file+'|'+a.man.part)}">Rifai gli errori di questa sezione</button></div>`;
    tip=ABS_TIP && e.test==='abstract'?'Rileggi la spiegazione, poi rifai l\'esercizio senza guardarla: se trovi la regola in meno di un minuto, l\'hai capita.':'';
  } else {
    body=`<p class="small muted">${e.src==='foglio'?'Foglio risposte: la domanda è sul tuo libro.':'Domanda di una sessione precedente all\'aggiornamento: il testo non è stato salvato.'}</p>`;
    tip=a.trap?TRAP_TIP[a.trap]||'':a.tpl?NUM_TIP[a.tpl]||'':'';
  }
  const done=DB.understood&&DB.understood[e.uid];
  return `<article class="panel stack ecard ${done?'edone':''}">
    <div class="row spread"><span class="eyebrow">${SEC[e.test].it} · ${esc(kind)} · ${when}</span><span class="mono small">tua ${L(a.ans)} · giusta ${L(a.key)}${a.ms?` · ${fmtT(a.ms/1000)}`:''}</span></div>
    ${a.trap&&TRAPS[a.trap]?`<p class="small"><b>Trappola:</b> ${esc(TRAPS[a.trap])}</p>`:''}
    ${body}
    ${tip?`<p class="tip"><b>Come evitarlo:</b> ${esc(tip)}</p>`:''}
    <div class="row causes"><span class="small muted">Causa:</span>${Object.entries(CAUSES).map(([c,l])=>`<button class="small ${a.cause===c?'csel':''}" data-ecause="${e.uid}|${c}">${l}</button>`).join('')}</div>
    <div class="row"><button class="small ${done?'':'primary'}" data-und="${e.uid}">${done?'Rimetti tra gli errori da rivedere':'Capito, toglilo dalla lista'}</button></div>
  </article>`;
}
