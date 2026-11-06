// ---------- "Manuale": practise on the user's own PDF, opened locally; the file never leaves the browser ----------
const MAN={url:null,name:'',run:null,blob:null,doc:null,page:1,hide:true,revealed:{},lib:null};
const MAN_DB='epsoManualPdf';
function manIDB(){ return new Promise((res,rej)=>{ try{ const r=indexedDB.open(MAN_DB,1); r.onupgradeneeded=()=>r.result.createObjectStore('f'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e) } }); }
async function manSave(file){ try{ const db=await manIDB(); const tx=db.transaction('f','readwrite'); tx.objectStore('f').put({blob:file,name:file.name},'pdf'); }catch(e){} }
async function manLoad(){ try{ const db=await manIDB(); return await new Promise(res=>{ const q=db.transaction('f').objectStore('f').get('pdf'); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null } }
async function manForget(){ try{ const db=await manIDB(); db.transaction('f','readwrite').objectStore('f').delete('pdf'); }catch(e){} }
function manSetFile(blob,name){ if(MAN.url) URL.revokeObjectURL(MAN.url); MAN.url=URL.createObjectURL(blob); MAN.blob=blob; MAN.doc=null; MAN.revealed={}; MAN.name=name||'manuale.pdf'; }

async function renderManual(){
  if(!MAN.url){ const saved=await manLoad(); if(saved&&saved.blob) manSetFile(saved.blob,saved.name); }
  if(!MAN.url) return renderManualPick();
  renderManualWork();
}
function renderManualPick(msg){
  app().innerHTML=header('Manuale','Fai gli esercizi del tuo manuale PDF con cronometro e punteggio.')+`
  <main class="wrap stack narrow">
    ${msg?`<p class="alert">${esc(msg)}</p>`:''}
    <div class="panel stack">
      <h2>Apri il PDF dal tuo computer</h2>
      <p>Scegli il file del manuale. Lo vedrai a sinistra e il foglio risposte a destra.</p>
      <p class="small muted">Il file resta solo in questo browser: non viene caricato su internet né sul sito. La prossima volta si riapre da solo su questo computer; puoi toglierlo quando vuoi.</p>
      <label class="filebtn primaryfile">Scegli il PDF<input type="file" id="man-file" accept="application/pdf,.pdf"></label>
    </div>${footer()}</main>`;
  bindNav();
  $('#man-file').onchange=e=>{ const f=e.target.files[0]; if(!f) return; if(!/pdf$/i.test(f.type)&&!/\.pdf$/i.test(f.name)) return renderManualPick('Il file scelto non è un PDF.'); manSetFile(f,f.name); manSave(f); renderManualWork(); };
}
function renderManualWork(){
  const R0=MAN.run;
  app().innerHTML=`<div class="bar"><div class="in"><div class="row"><span class="secname">Manuale</span><span class="small muted">${esc(MAN.name)}</span></div>
    <div class="row"><button class="ghost" data-nav="home">Inizio</button><button class="ghost" data-nav="stats">Statistiche</button><button class="ghost" id="man-change">Cambia PDF</button></div></div></div>
  <main class="manwrap">
    <section class="manpdf"><div class="row wrap-gap mantools"><button class="small" id="mv-prev">◀ Pagina</button><span class="mono small" id="mv-pg">–</span><button class="small" id="mv-next">Pagina ▶</button>
      <label class="chk small"><input type="checkbox" id="mv-hide" ${MAN.hide?'checked':''}><span>Nascondi le soluzioni</span></label><span class="small muted" id="mv-msg"></span></div>
      <div id="man-view" class="manview"><p class="muted small">Caricamento del PDF…</p></div></section>
    <aside class="panel stack mansheet" id="man-side"></aside>
  </main>`;
  bindNav();
  $('#man-change').onclick=()=>{ manForget(); if(MAN.url) URL.revokeObjectURL(MAN.url); MAN.url=null; MAN.run=null; clearInterval(TIMER); renderManualPick(); };
  $('#mv-prev').onclick=()=>showPage(MAN.page-1); $('#mv-next').onclick=()=>showPage(MAN.page+1);
  $('#mv-hide').onchange=e=>{ MAN.hide=e.target.checked; showPage(MAN.page); };
  R0?renderManSide():renderManSetup();
  initViewer(R0?R0.page:MAN.page);
}
function renderManSetup(){
  const side=$('#man-side');
  side.innerHTML=`<h2>Nuova sessione</h2>
    <label>Prova<select id="ms-sec"><option value="abstract">Astratto</option><option value="numerical">Numerico</option><option value="verbal">Verbale</option></select></label>
    <label>Etichetta<input id="ms-lab" type="text" maxlength="80" placeholder="es. Cap. 4, esercizi 1-20"></label>
    <div class="row wrap-gap"><label>Secondi per domanda<input id="ms-sec-q" type="number" min="10" max="600" value="50"></label><label>Opzioni<select id="ms-opt"><option>5</option><option>4</option></select></label></div>
    <label>Pagina del PDF da cui partire<input id="ms-page" type="number" min="1" value="1"></label>
    <p class="small muted">Rispondi alla domanda, poi leggi nel manuale la risposta corretta e inseriscila: il programma tiene il conto. Il cronometro diventa rosso quando superi il tempo per domanda.</p>
    <button class="primary" id="ms-go">Inizia</button>`;
  const dflt={abstract:[50,5],numerical:[120,5],verbal:[105,4]};
  $('#ms-sec').onchange=()=>{ const d=dflt[$('#ms-sec').value]; $('#ms-sec-q').value=d[0]; $('#ms-opt').value=d[1]; };
  $('#ms-go').onclick=()=>{ const page=Math.max(1,+$('#ms-page').value||1);
    MAN.run={sec:$('#ms-sec').value,label:$('#ms-lab').value.trim(),per:Math.max(10,+$('#ms-sec-q').value||50),opt:+$('#ms-opt').value,page,start:Date.now(),qStart:Date.now(),items:[],cur:{ans:null}};
    goPage(page); clearInterval(TIMER); TIMER=setInterval(manTick,250); renderManSide(); };
}
function goPage(n){ showPage(n); }
function manTick(){ const R=MAN.run; if(!R) return; const el=$('#mq-clock'); if(!el) return; const s=(Date.now()-R.qStart)/1000; el.textContent=fmtT(s); el.classList.toggle('low',s>R.per); const tot=$('#mq-total'); if(tot) tot.textContent=fmtT((Date.now()-R.start)/1000); }
function renderManSide(){
  const R=MAN.run, side=$('#man-side'); if(!side) return;
  const L=LETTERS.slice(0,R.opt).split(''), n=R.items.length+1, ok=R.items.filter(x=>x.ok).length;
  const step=R.cur.ans===null?'answer':'key';
  side.innerHTML=`<div class="row spread"><span class="eyebrow">${esc(SEC[R.sec].it)}${R.label?' · '+esc(R.label):''}</span><span class="mono small">tot. <span id="mq-total">--:--</span></span></div>
    <div class="row spread"><h2>Domanda ${n}</h2><span class="clock mono" id="mq-clock">00:00</span></div>
    <p class="small muted">Obiettivo: ${fmtT(R.per)} a domanda · finora ${ok}/${R.items.length} corrette</p>
    <div class="stack" style="gap:6px"><span class="small">${step==='answer'?'La tua risposta':'Risposta corretta (dal manuale)'}</span>
      <div class="seg big">${L.map(l=>`<button data-m="${l}" class="${step==='key'&&R.cur.ans===l?'sel':''}">${l}</button>`).join('')}</div>
      ${step==='key'?`<p class="small muted">Hai risposto <b>${R.cur.ans}</b> in ${fmtT(R.cur.ms/1000)}. Ora leggi la soluzione e inserisci la lettera giusta.</p><button class="ghost small" id="mq-undo">Correggi la mia risposta</button>`:'<button class="ghost small" id="mq-skip">Salta (senza risposta)</button>'}
    </div>
    <div class="row wrap-gap"><label class="inl">Vai a pagina<input id="mq-page" type="number" min="1" value="${R.page}"></label><button class="small" id="mq-go">Vai</button><button class="small" id="mq-prev">◀</button><button class="small" id="mq-next">▶</button></div>
    ${R.items.length?`<div class="tblwrap"><table class="times"><thead><tr><th>#</th><th>Tua</th><th>Giusta</th><th>Tempo</th></tr></thead><tbody>${R.items.map((x,i)=>`<tr><td class="mono">${i+1}</td><td class="mono">${x.ans||'–'}</td><td class="mono">${x.key}</td><td class="mono ${x.ms/1000>R.per?'badc':''}">${fmtT(x.ms/1000)} ${x.ok?'<span class="okc">✓</span>':'<span class="badc">✗</span>'}</td></tr>`).reverse().join('')}</tbody></table></div>`:''}
    <div class="row"><button class="primary" id="mq-end" ${R.items.length?'':'disabled'}>Termina e salva</button></div>`;
  manTick();
  side.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const l=b.dataset.m;
    if(step==='answer'){ R.cur={ans:l,ms:Date.now()-R.qStart}; }
    else { R.items.push({ans:R.cur.ans,key:l,ok:R.cur.ans===l,ms:R.cur.ms}); R.cur={ans:null}; R.qStart=Date.now(); }
    renderManSide(); });
  if($('#mq-skip')) $('#mq-skip').onclick=()=>{ R.cur={ans:'',ms:Date.now()-R.qStart}; renderManSide(); };
  if($('#mq-undo')) $('#mq-undo').onclick=()=>{ R.cur={ans:null}; renderManSide(); };
  const setP=p=>{ R.page=Math.max(1,p); goPage(R.page); renderManSide(); };
  $('#mq-go').onclick=()=>setP(+$('#mq-page').value||1); $('#mq-prev').onclick=()=>setP(R.page-1); $('#mq-next').onclick=()=>setP(R.page+1);
  $('#mq-end').onclick=()=>{ clearInterval(TIMER);
    const att=R.items.map((x,i)=>({sec:'sheet',id:'m'+(i+1),ok:x.ok,ans:x.ans?LETTERS.indexOf(x.ans):null,key:LETTERS.indexOf(x.key),ms:x.ms,ch:0,fl:false}));
    const score=att.filter(a=>a.ok).length;
    DB.sessions.unshift({id:Date.now(),date:R.start,kind:'sheet',label:'Manuale · '+SEC[R.sec].it+(R.label?' · '+R.label:''),parts:[{sec:R.sec,n:att.length,score,secs:Math.round((Date.now()-R.start)/1000),limit:null,att}]}); saveDB();
    const slow=att.filter(a=>a.ms/1000>R.per).length;
    MAN.run=null;
    side.innerHTML=`<h2>Sessione salvata</h2><p><b class="mono big2">${score}/${att.length}</b></p><p class="muted">${slow} domande oltre ${fmtT(R.per)}. La trovi in Statistiche → Fogli risposte.</p><div class="row"><button class="primary" id="mq-new">Nuova sessione</button></div>`;
    $('#mq-new').onclick=()=>renderManSetup(); };
}

// ---- own PDF viewer (pdf.js) that covers printed solutions until you click them ----
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadPdfJs(){ return new Promise((res,rej)=>{ if(window.pdfjsLib) return res(window.pdfjsLib); const sc=document.createElement('script'); sc.src=PDFJS+'pdf.min.js'; sc.onload=()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js'; res(window.pdfjsLib); }catch(e){ rej(e) } }; sc.onerror=()=>rej(new Error('pdfjs')); document.head.appendChild(sc); }); }
async function initViewer(page){
  const view=$('#man-view'); if(!view) return;
  try{
    const lib=await loadPdfJs();
    if(!MAN.doc){ const buf=await MAN.blob.arrayBuffer(); MAN.doc=await lib.getDocument({data:buf}).promise; }
    showPage(page||1);
  }catch(e){
    view.innerHTML=`<iframe title="Manuale" src="${MAN.url}#page=${page||1}" class="manframe"></iframe>`;
    const m=$('#mv-msg'); if(m) m.textContent='Senza connessione il PDF si apre nel visualizzatore del browser e le soluzioni non si possono coprire.';
    const h=$('#mv-hide'); if(h) h.disabled=true;
  }
}
function lineGroups(items,vp){
  const L=[];
  items.forEach(it=>{ const t=it.transform; if(Math.abs(t[1])>0.01||Math.abs(t[2])>0.01||!it.str.trim()) return; // skip rotated text (watermark) and blanks
    const [x,y]=vp.convertToViewportPoint(t[4],t[5]); const h=Math.abs(t[3])*vp.scale;
    let ln=L.find(l=>Math.abs(l.y-y)<Math.max(3,h*0.4)); if(!ln){ ln={y,h,x0:x,parts:[]}; L.push(ln); }
    ln.parts.push({x,s:it.str}); ln.x0=Math.min(ln.x0,x); ln.h=Math.max(ln.h,h); });
  L.forEach(l=>{ l.parts.sort((a,b)=>a.x-b.x); l.text=l.parts.map(p=>p.s).join(' ').replace(/\s+/g,' ').trim(); });
  return L.sort((a,b)=>a.y-b.y);
}
function solutionBlocks(lines,vp,openTop){
  const H=vp.height, W=vp.width, top=H*0.09, bottom=H-H*0.04;
  const isQ=l=>/^\d{1,3}\s?\.\s*\S/.test(l.text)&&l.x0<W*0.25&&!/Risposta/i.test(l.text);
  const isSol=l=>/^(\d{1,3}\s?\.\s*)?Risposta\s+corretta/.test(l.text);
  const isKeyHead=l=>/Risposte\s+del\s+test/i.test(l.text);
  const B=[];
  if(openTop){ const firstQ=lines.find(l=>l.y>top&&(isQ(l)||isSol(l)||isKeyHead(l))); const first=lines.find(l=>l.y>top);
    if(first&&(!firstQ||first!==firstQ)){ const end=firstQ?firstQ.y-firstQ.h-6:bottom; if(end>first.y-first.h) B.push({y0:first.y-first.h-4,y1:end}); } }
  lines.forEach((l,i)=>{
    if(isKeyHead(l)){ B.push({y0:l.y+4,y1:bottom,all:true}); return; }
    if(!isSol(l)) return;
    const nextQ=lines.slice(i+1).find(isQ);
    B.push({y0:l.y-l.h-4,y1:nextQ?nextQ.y-nextQ.h-6:bottom});
  });
  B.sort((a,b)=>a.y0-b.y0); const M=[]; B.forEach(b=>{ const last=M[M.length-1]; if(last&&b.y0<=last.y1+4){ last.y1=Math.max(last.y1,b.y1); last.all=last.all||b.all; } else M.push(Object.assign({},b)); });
  return M;
}
async function blocksForPage(n,vp){
  const page=await MAN.doc.getPage(n); const v=vp||page.getViewport({scale:1});
  const lines=lineGroups((await page.getTextContent()).items,v);
  let openTop=false;
  if(n>1){ const pp=await MAN.doc.getPage(n-1); const pv=pp.getViewport({scale:1}); const pl=lineGroups((await pp.getTextContent()).items,pv); const pb=solutionBlocks(pl,pv,false); openTop=pb.length>0&&pb[pb.length-1].y1>=pv.height-pv.height*0.04-1; }
  return solutionBlocks(lines,v,openTop);
}
let RENDER_TOKEN=0;
async function showPage(n){
  if(!MAN.doc){ return; }
  n=Math.max(1,Math.min(MAN.doc.numPages,n||1)); MAN.page=n; if(MAN.run) MAN.run.page=n;
  const pg=$('#mv-pg'); if(pg) pg.textContent=`${n} / ${MAN.doc.numPages}`;
  const inp=$('#mq-page'); if(inp) inp.value=n;
  const view=$('#man-view'); if(!view) return; const tok=++RENDER_TOKEN;
  const page=await MAN.doc.getPage(n); const base=page.getViewport({scale:1});
  const width=Math.min(view.clientWidth||800,1000); const scale=width/base.width; const vp=page.getViewport({scale});
  const ratio=window.devicePixelRatio||1;
  const canvas=document.createElement('canvas'); canvas.width=Math.floor(vp.width*ratio); canvas.height=Math.floor(vp.height*ratio); canvas.style.width=vp.width+'px'; canvas.style.height=vp.height+'px';
  const ctx=canvas.getContext('2d'); ctx.setTransform(ratio,0,0,ratio,0,0);
  await page.render({canvasContext:ctx,viewport:vp}).promise; if(tok!==RENDER_TOKEN) return;
  const wrap=document.createElement('div'); wrap.className='pagewrap'; wrap.style.width=vp.width+'px'; wrap.style.height=vp.height+'px'; wrap.appendChild(canvas);
  if(MAN.hide){ const bl=await blocksForPage(n,vp); if(tok!==RENDER_TOKEN) return;
    bl.forEach((b,i)=>{ const id=n+':'+i; if(MAN.revealed[id]) return; const m=document.createElement('button'); m.className='mask'; m.style.top=Math.max(0,b.y0)+'px'; m.style.height=Math.max(18,b.y1-b.y0)+'px';
      m.textContent=b.all?'Soluzioni del test nascoste · clicca per vederle':'Soluzione nascosta · clicca per vederla'; m.onclick=()=>{ MAN.revealed[id]=1; m.remove(); }; wrap.appendChild(m); });
    const msg=$('#mv-msg'); if(msg) msg.textContent=bl.length?`${bl.length} ${bl.length>1?'soluzioni coperte':'soluzione coperta'} in questa pagina`:''; }
  view.innerHTML=''; view.appendChild(wrap);
}
window.addEventListener('resize',()=>{ clearTimeout(window._mvr); window._mvr=setTimeout(()=>{ if(MAN.doc&&$('#man-view')) showPage(MAN.page); },250); });
