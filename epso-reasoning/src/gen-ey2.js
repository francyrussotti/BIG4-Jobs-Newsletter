// ---------- EY (Maki) harder formats: original items generated at random ----------
// Data sufficiency, circular seating, work rate, chained percentages, vote margins,
// interleaved and digit-reversal series, number pyramids, 3x3 and 2x2 figure matrices.

// ===== Data sufficiency =====
const DS_OPTS=['Statement 1 alone is sufficient, but statement 2 alone is not','Statement 2 alone is sufficient, but statement 1 alone is not','Both statements together are sufficient, but neither alone is','Each statement alone is sufficient','The statements together are not sufficient'];
const DS_T=[
 ()=>{ const N=R.int(12,40), k=R.int(3,N-3), nm=R.pick(EY_NAMES); const up=R.chance(.5);
   return up?{q:`In a competition with no ties, what was ${nm}'s position?`,s1:`There were ${N} participants.`,s2:`Exactly ${k} participants finished ahead of ${nm}.`,key:1,ex:`La 2 da sola basta: ${k} davanti → posizione ${k+1}. Il numero di partecipanti non serve.`}
     :{q:`In a competition with no ties, what was ${nm}'s position?`,s1:`There were ${N} participants.`,s2:`Exactly ${k} participants scored lower than ${nm}.`,key:2,ex:`Servono entrambe: davanti a ${nm} ci sono ${N} − ${k} − 1 = ${N-k-1} persone, quindi posizione ${N-k}. Con una sola non si sa.`}; },
 ()=>{ const a=R.int(28,45), d=R.int(2,9), [A,B]=R.sample(EY_NAMES,2); const v=R.int(0,2);
   if(v===0) return {q:`How old is ${A}?`,s1:`${A} is ${d} years older than ${B}.`,s2:`${B} is ${a-d}.`,key:2,ex:`Insieme: ${a-d} + ${d} = ${a}. Da sole no.`};
   if(v===1) return {q:`How old is ${A}?`,s1:`Five years ago ${A} was ${a-5}.`,s2:`In three years ${A} will be ${a+3}.`,key:3,ex:`Ognuna da sola dà ${a}.`};
   return {q:`How old is ${A}?`,s1:`${A} is older than ${B}.`,s2:`${B} is ${a-d}.`,key:4,ex:`Si sa solo che ${A} ha più di ${a-d} anni: non basta.`}; },
 ()=>{ const p=R.int(2,6), c=R.int(1,4), m=R.int(2,4), n=R.int(1,3); const v=R.int(0,1);
   const s1=`${m} pens and ${n} pencils cost €${m*p+n*c}.`;
   return v===0?{q:'What is the price of one pen?',s1,s2:`One pen and one pencil cost €${p+c} together.`,key:2,ex:`Due equazioni diverse in due incognite: si risolve solo con entrambe. Penna = €${p}.`}
     :{q:'What is the price of one pen?',s1,s2:`${2*m} pens and ${2*n} pencils cost €${2*(m*p+n*c)}.`,key:4,ex:`La 2 è la 1 moltiplicata per 2: stessa informazione. Una equazione, due incognite → non basta. È la trappola classica.`}; },
 ()=>{ const v=R.int(0,2);
   if(v===0) return {q:'x is an integer. Is x even?',s1:'3x is even.',s2:'x + 5 is odd.',key:3,ex:'3x pari ⇔ x pari; x + 5 dispari ⇔ x pari. Ognuna basta da sola.'};
   if(v===1) return {q:'x is an integer. Is x even?',s1:'x + 4 is even.',s2:'x² + x is even.',key:0,ex:'x + 4 pari ⇔ x pari: la 1 basta. x² + x = x(x+1) è sempre pari: la 2 non dice nulla.'};
   return {q:'x is an integer. Is x even?',s1:'2x is even.',s2:'x² + x is even.',key:4,ex:'2x è sempre pari e x(x+1) è sempre pari: nessuna delle due dice qualcosa su x.'}; },
 ()=>{ const T=R.pick([150,200,250,300,400,500]), pc=R.pick([20,30,40,60]); const v=R.int(0,1);
   return v===0?{q:'How many people work in the Brussels office?',s1:`The Brussels office employs ${pc}% of the company's staff.`,s2:`The company employs ${T} people.`,key:2,ex:`${pc}% × ${T} = ${T*pc/100}. Servono entrambe.`}
     :{q:'How many people work in the Brussels office?',s1:`The Brussels office employs ${pc}% of the company's staff.`,s2:`The other offices employ ${T*(100-pc)/100} people in total.`,key:2,ex:`Gli altri uffici sono il ${100-pc}% = ${T*(100-pc)/100} → totale ${T} → Bruxelles ${T*pc/100}. Servono entrambe.`}; }
];
function eyDSItem(sec){
  const t=R.pick(DS_T)();
  const it=mcq(sec,'ey-ds',`<div class="scenario"><p><b>Question:</b> ${esc(t.q)}</p><p><b>(1)</b> ${esc(t.s1)}</p><p><b>(2)</b> ${esc(t.s2)}</p></div>`,'Which statement(s) do you need to answer the question?',DS_OPTS,t.key,t.ex,'Sufficienza dei dati: valuta ogni affermazione da sola, poi insieme. Non calcolare il risultato: chiediti solo se è determinato in modo unico. Attenzione alle affermazioni che ripetono la stessa informazione.',false);
  return it;
}

// ===== Circular seating =====
const SEAT_NAMES=['Liam','Mia','Noah','Nora','Ethan','Ava','Lucas','Emma','Oscar','Lea','Hugo','Sofia','Marta','Jonas','Iris','Felix'];
function seatSolutions(names,clues){
  const rest=names.slice(1), out=[];
  const perm=(a,k)=>{ if(k===a.length){ const s=[names[0],...a]; if(clues.every(c=>c.ok(s))) out.push(s); return; } for(let i=k;i<a.length;i++){ [a[k],a[i]]=[a[i],a[k]]; perm(a,k+1); [a[k],a[i]]=[a[i],a[k]]; } };
  perm(rest.slice(),0); return out;
}
function eySeatItem(sec){
  for(let g=0;g<60;g++){
    const names=R.sample(SEAT_NAMES,6), seat=R.shuffle(names); // seat[i] clockwise
    const P=nm=>seat.indexOf(nm), at=(s,i)=>s[((i%6)+6)%6];
    const pos=(s,nm)=>s.indexOf(nm);
    const pool=[];
    names.forEach(a=>names.forEach(b=>{ if(a>=b&&a!==b) return; if(a===b) return;
      const d=((P(a)-P(b))%6+6)%6;
      if(d===3) pool.push({t:`${a} sits directly opposite ${b}.`,ok:s=>((pos(s,a)-pos(s,b))%6+6)%6===3});
      if(d===1) pool.push({t:`${a} sits immediately to the left of ${b}.`,ok:s=>((pos(s,a)-pos(s,b))%6+6)%6===1});
      if(d===5) pool.push({t:`${b} sits immediately to the left of ${a}.`,ok:s=>((pos(s,b)-pos(s,a))%6+6)%6===1});
      if(d===2||d===4) pool.push({t:`${a} does not sit next to ${b}.`,ok:s=>{const e=((pos(s,a)-pos(s,b))%6+6)%6;return e!==1&&e!==5}});
      if(d===1||d===5) pool.push({t:`${a} sits next to ${b}.`,ok:s=>{const e=((pos(s,a)-pos(s,b))%6+6)%6;return e===1||e===5}});
    }));
    const target=R.pick(names), qt=R.pick(['opp','left','right']);
    const ans=s=>qt==='opp'?at(s,pos(s,target)+3):qt==='left'?at(s,pos(s,target)+1):at(s,pos(s,target)-1);
    const truth=ans(seat);
    const clues=[]; let sols=null;
    for(const c of R.shuffle(pool)){
      if(clues.length>=6) break;
      if(c.t.includes(target)&&c.t.includes(truth)&&R.chance(.85)) continue; // avoid giving the answer away
      clues.push(c); sols=seatSolutions(names,clues);
      if(sols.length&&new Set(sols.map(ans)).size===1) break;
    }
    if(!sols||!sols.length||new Set(sols.map(ans)).size!==1||clues.length<3) continue;
    // drop redundant clues
    for(let i=clues.length-1;i>=0;i--){ const tr=clues.filter((_,j)=>j!==i); const s2=seatSolutions(names,tr); if(new Set(s2.map(ans)).size===1){ clues.splice(i,1); } }
    if(clues.length<3) continue;
    const others=names.filter(n=>n!==target);
    const qtxt=qt==='opp'?`Who sits directly opposite ${target}?`:qt==='left'?`Who sits immediately to the left of ${target}?`:`Who sits immediately to the right of ${target}?`;
    const order=[0,1,2,3,4,5].map(i=>at(seat,P(target)+i));
    const it=mcq(sec,'ey-seat',`<div class="scenario"><p>Six people – ${names.slice().sort().join(', ')} – sit evenly spaced around a round table, all facing the centre.</p><ul>${R.shuffle(clues).map(c=>`<li>${esc(c.t)}</li>`).join('')}</ul></div>`,qtxt,others,others.indexOf(truth),
      `Disposizione (in senso orario, partendo da ${target}): ${order.join(' → ')}. Rivolti verso il centro, la sinistra di una persona è il posto successivo in senso orario. Risposta: ${truth}.`,
      'Tavolo rotondo: disegna un cerchio con 6 posti, fissa la prima persona citata in un vincolo forte ("di fronte"), poi aggiungi gli altri. Ricorda: rivolti al centro, sinistra = senso orario.');
    return it;
  }
  return eyDSItem(sec);
}

// ===== Work rate, chained percentages, vote margin =====
function eyRateItem(sec){
  const v=R.int(0,2);
  if(v===0){ // operators and calls
    const r=R.pick([2,3,4,5,6]), N=R.int(4,12)*5, T=R.pick([2,3,4,5]), Q=N*T*r; const M=R.int(3,10)*5; let T2; do{ T2=R.int(2,9); }while(T2===T); const Q2=M*T2*r;
    const o=numOptions(T2,[[Q2/Q*T,'ignorato il numero di operatori'],[T*M/N*Q2/Q,'proporzione invertita sugli operatori'],[Q2/(M*r)+1,'errore di arrotondamento']],x=>nf(x,x%1?1:0)+' hours');
    if(!o||o.options.length!==5) return eyRateItem(sec);
    return {sec,fmt:'numerical',id:eyId(sec+'-rate'),tpl:'ey-num',stim:'',question:`${N} operators handle ${nf(Q)} calls in ${T} hours. Working at the same rate, how long will ${M} operators take to handle ${nf(Q2)} calls?`,options:o.options,key:o.key,
      explain:`Ritmo per operatore: ${nf(Q)} / (${N} × ${T}) = ${r} chiamate all'ora. ${M} operatori fanno ${M*r} chiamate all'ora. ${nf(Q2)} / ${M*r} = ${T2} ore.`,tip:'Lavoro = persone × tempo × ritmo. Calcola prima il ritmo per persona, poi il resto.'};
  }
  if(v===1){ // machines needed
    const r=R.pick([20,25,30,40,50]), N=R.int(3,8), D=R.pick([5,6,8,10]), Q=N*D*r; const M=R.int(4,15); const D2=R.pick([4,5,6,8,10,12].filter(x=>x!==D)); const Q2=M*D2*r;
    const o=numOptions(M,[[Math.round(N*Q2/Q),'ignorato il cambio di giorni'],[Math.round(N*Q2/Q*D2/D),'proporzione sui giorni invertita'],[M+1,'arrotondato in eccesso senza motivo'],[M-1,'arrotondato in difetto'],[M+2,'errore di calcolo']].filter(x=>x[0]>0),x=>nf(x)+' machines');
    if(!o||o.options.length!==5) return eyRateItem(sec);
    return {sec,fmt:'numerical',id:eyId(sec+'-rate'),tpl:'ey-num',stim:'',question:`${N} identical machines produce ${nf(Q)} parts in ${D} days. How many machines are needed to produce ${nf(Q2)} parts in ${D2} days?`,options:o.options,key:o.key,
      explain:`Una macchina fa ${nf(Q)} / (${N} × ${D}) = ${r} pezzi al giorno. In ${D2} giorni: ${r*D2} pezzi a macchina. ${nf(Q2)} / ${r*D2} = ${M} macchine.`,tip:'Riduci tutto a "una macchina, un giorno", poi moltiplica.'};
  }
  // three workers alone -> together
  const pairs=[[3,6,2],[4,12,3],[6,12,4],[10,15,6],[12,24,8],[20,30,12],[15,10,6],[6,3,2]];
  const [a,b,t]=R.pick(pairs); const [A,B]=R.sample(EY_NAMES,2);
  const o=numOptions(t,[[(a+b)/2,'media dei tempi'],[a+b,'tempi sommati'],[Math.min(a,b)/2,'metà del più veloce']],x=>nf(x,x%1?1:0)+' hours');
  if(!o||o.options.length!==5) return eyRateItem(sec);
  return {sec,fmt:'numerical',id:eyId(sec+'-rate'),tpl:'ey-num',stim:'',question:`${A} can complete a report in ${a} hours; ${B} can complete the same report in ${b} hours. Working together at the same rates, how long will they take?`,options:o.options,key:o.key,
    explain:`In un'ora: 1/${a} + 1/${b} = ${nf(1/a+1/b,3)} del report. Tempo = 1 / (1/${a} + 1/${b}) = ${a}×${b}/(${a}+${b}) = ${t} ore.`,tip:'Lavoro insieme: somma i ritmi (frazioni all\'ora), non i tempi.'};
}
function eyPctChainItem(sec){
  const v=R.int(0,1);
  if(v===0){
    const s1=R.pick([50,60,70,75,80]), d1=R.pick([20,25,30,40,50]), s2=R.pick([40,50,60,75]);
    const r1=100-s1, don1=r1*d1/100, left=r1-don1, sold2=left*s2/100, don2=left-sold2, tot=don1+don2;
    const o=numOptions(tot,[[don1,'solo la donazione del primo giorno'],[d1+(100-s2),'percentuali sommate direttamente'],[don2,'solo la donazione del secondo giorno']],x=>nf(x,1)+'%');
    if(!o) return eyPctChainItem(sec);
    return {sec,fmt:'numerical',id:eyId(sec+'-pct'),tpl:'ey-num',stim:'',question:`A bakery sells ${s1}% of its stock on day 1 and donates ${d1}% of what remains. On day 2 it sells ${s2}% of the remaining stock and donates the rest. What percentage of the original stock was donated in total?`,options:o.options,key:o.key,
      explain:`Giorno 1: resta ${r1}%, donato ${d1}% di ${r1} = ${nf(don1,1)}%, restano ${nf(left,1)}%. Giorno 2: venduto ${s2}% di ${nf(left,1)}, donato il resto = ${nf(don2,1)}%. Totale ${nf(tot,1)}%.`,tip:'Percentuali a catena: ogni percentuale si applica a ciò che resta, non al totale iniziale. Scrivi i passaggi in percentuale del totale.'};
  }
  const k=R.pick([4,6,8,10,12,20]), J=R.int(2,9)*450000; // J = votes for loser
  const T=J*200/(100-k); if(!Number.isInteger(T)) return eyPctChainItem(sec);
  const m=T*k/100;
  const o=numOptions(m,[[J*k/100,'percentuale applicata ai voti del perdente'],[m*1.25,'base sbagliata'],[T-J,'voti del vincitore, non lo scarto']],x=>nf(Math.round(x)));
  if(!o) return eyPctChainItem(sec);
  return {sec,fmt:'numerical',id:eyId(sec+'-pct'),tpl:'ey-num',stim:'',question:`In an election between two parties, Party A received ${k} percentage points more of the total votes than Party B. Party B received ${nf(J)} votes. By how many votes did Party A win?`,options:o.options,key:o.key,
    explain:`B ha (100 − ${k}) / 2 = ${(100-k)/2}% dei voti. Totale = ${nf(J)} / ${(100-k)/200} = ${nf(T)}. Scarto = ${k}% × ${nf(T)} = ${nf(m)}.`,tip:'Due candidati: A = B + k% del totale, quindi B = (100 − k)/2 %. Trova prima il totale.'};
}

// ===== Series: interleaved and digit reversal =====
function eySeries2Item(sec){
  const rev=n=>+String(n).split('').reverse().join('');
  for(let g=0;g<40;g++){
    if(R.chance(.5)){
      const x=R.int(20,60), y=R.int(61,99), a=R.int(11,29), b=R.int(31,65);
      const s=[x,y,x+a,y+a,x+a-b], next=y+a-b; if(x+a-b<=0||next<=0) continue;
      const o=numOptions(next,[[y+2*a,'stessa operazione ripetuta'],[s[4]-b+a,'applicato alla serie sbagliata'],[y+a+b,'segno invertito']],v=>nf(v));
      if(!o) continue;
      return {sec,fmt:'numerical',id:eyId(sec+'-ser2'),tpl:'ey-series',stim:`<p class="seriesnum mono">${s.join(' , ')} , ?</p>`,question:'Which number comes next in the series?',options:o.options,key:o.key,
        explain:`Due serie intrecciate con le stesse operazioni (+${a}, poi −${b}): posizioni dispari ${x} → ${x+a} → ${x+a-b}; posizioni pari ${y} → ${y+a} → ${next}.`,tip:'Se le differenze tra vicini non hanno senso, guarda le posizioni alterne: spesso sono due serie intrecciate.'};
    } else {
      const d=R.pick([101,111,102,110,112]); let n=R.int(4,7)*100+R.int(1,9)*10+R.int(1,8);
      const s=[n,rev(n),n+d,rev(n+d),n+2*d], next=rev(n+2*d);
      if(String(n+2*d).length!==3||String(n+2*d).endsWith('0')||String(n+d).endsWith('0')) continue;
      const o=numOptions(next,[[n+3*d,'continuata solo la serie dispari'],[rev(n+3*d),'invertito il numero successivo'],[next+d,'aggiunto il passo']],v=>String(v));
      if(!o) continue;
      return {sec,fmt:'numerical',id:eyId(sec+'-ser2'),tpl:'ey-series',stim:`<p class="seriesnum mono">${s.join(' , ')} , ?</p>`,question:'Which number comes next in the series?',options:o.options,key:o.key,
        explain:`Ogni numero in posizione pari è il precedente con le cifre invertite: ${n} → ${rev(n)}, ${n+d} → ${rev(n+d)}, ${n+2*d} → ${next}. I numeri in posizione dispari crescono di ${d}.`,tip:'Numeri a tre cifre che "saltano" avanti e indietro: prova a leggerli al contrario.'};
    }
  }
  return eySeriesItem(sec);
}

// ===== Number pyramids =====
function pyramidHTML(rows,label){
  return `<div class="pyr" aria-label="${esc(label)}">${rows.map(r=>`<div class="pyr-r">${r.map(v=>`<span class="${v==='?'?'q':''}">${v}</span>`).join('')}</div>`).join('')}</div>`;
}
function eyPyramidItem(sec){
  const rules=[
    {f:(a,b)=>a+b,t:'somma dei due numeri sopra'},
    {f:(a,b)=>Math.abs(a-b),t:'differenza (positiva) tra i due numeri sopra'},
    {f:(a,b)=>(a+b)/2,t:'media dei due numeri sopra'},
    {f:(a,b)=>a+b+1,t:'somma dei due numeri sopra più 1'}
  ];
  for(let g=0;g<80;g++){
    const ru=R.pick(rules);
    const mk=()=>{ const top=[R.int(2,30),R.int(2,30),R.int(2,30)]; const mid=[ru.f(top[0],top[1]),ru.f(top[1],top[2])]; const bot=[ru.f(mid[0],mid[1])]; return [top,mid,bot]; };
    const A=mk(), B=mk(); if([...A.flat(),...B.flat()].some(v=>!Number.isInteger(v))) continue;
    const ans=B[2][0]; const Bq=[B[0],B[1],['?']];
    const alt=rules.filter(r=>r!==ru).map(r=>r.f(B[1][0],B[1][1])).filter(Number.isInteger);
    if(ans<4) continue;
    const o=numOptions(ans,alt.filter(v=>v>0).map(v=>[v,'regola sbagliata']).concat([[ans+1,'errore di calcolo'],[ans-1,'errore di calcolo'],[ans+2,'errore di calcolo']]),v=>nf(v));
    if(!o||o.options.length!==5) continue;
    return {sec,fmt:'numerical',id:eyId(sec+'-pyr'),tpl:'ey-series',stim:`<div class="pyrs">${pyramidHTML(A,'pyramid 1')}${pyramidHTML(Bq,'pyramid 2')}</div>`,question:'Both pyramids follow the same rule. Which number replaces the question mark?',options:o.options,key:o.key,
      explain:`Regola: ogni numero è la ${ru.t}. Prima piramide: ${A[1].join(', ')} → ${A[2][0]}. Seconda: ${B[1][0]} e ${B[1][1]} → ${ans}.`,tip:'Piramidi: verifica la regola su tutte le coppie della piramide completa (somma, differenza, media, prodotto) prima di applicarla.'};
  }
  return eySeriesItem(sec);
}

// ===== Figure matrices (3x3 latin squares, 2x2 transformations) =====
Object.assign(AB_RULES,{
  mshape:{label:'Matrice: forma per riga e colonna'},
  mcount:{label:'Matrice: numero di figure'},
  mfill:{label:'Matrice: colore'},
  msize:{label:'Matrice: dimensione'},
  mflip:{label:'Matrice: capovolgimento'},
  mdot:{label:'Matrice: posizione del pallino'}
});
Object.assign(SHAPE_IT,{star:'stella',arc:'arco'});
const MC_FILL={white:'#ffffff',black:'#111111',grey:'#9aa0a6'};
function mcellSVG(f){
  const fill=MC_FILL[f.fill||'white'];
  const one=(kind,cx,cy,r,flip)=>{
    const st=`fill="${fill}" stroke="#111" stroke-width="2"`;
    if(kind==='circle') return `<circle cx="${cx}" cy="${cy}" r="${r}" ${st}/>`;
    if(kind==='square') return `<rect x="${cx-r*0.85}" y="${cy-r*0.85}" width="${r*1.7}" height="${r*1.7}" ${st}/>`;
    if(kind==='diamond') return `<polygon points="${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}" ${st}/>`;
    if(kind==='triangle'){ const s=flip?-1:1; return `<polygon points="${cx},${cy-s*r} ${cx+r*0.95},${cy+s*r*0.75} ${cx-r*0.95},${cy+s*r*0.75}" ${st}/>`; }
    if(kind==='arc'){ const s=flip?-1:1; return `<path d="M${cx-r},${cy-s*r*0.6} A${r},${r} 0 0 ${flip?1:0} ${cx+r},${cy-s*r*0.6}" fill="none" stroke="#111" stroke-width="${f.fill==='white'?2.4:4.5}" ${f.fill==='grey'?'stroke-opacity=".55"':''}/>`; }
    if(kind==='star'){ const p=[]; for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr=i%2?r*0.45:r; p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)); } return `<polygon points="${p.join(' ')}" ${st}/>`; }
    return '';
  };
  let s='';
  const n=f.n||1;
  if(n===1){ s+=one(f.shape,50,50,f.size==='S'?12:24,f.flip); }
  else { const pts={2:[[34,50],[66,50]],3:[[30,36],[70,36],[50,68]],4:[[32,32],[68,32],[32,68],[68,68]]}[n]; pts.forEach(([x,y])=>s+=one(f.shape,x,y,f.size==='S'?7:12,f.flip)); }
  if(f.dot!==null&&f.dot!==undefined){ const [x,y]=[[14,14],[86,14],[86,86],[14,86]][f.dot]; s+=`<circle cx="${x}" cy="${y}" r="6" fill="${f.dotc||'#111'}"/>`; }
  return s;
}
const mSig=f=>JSON.stringify([f.shape,f.n,f.fill,f.size,f.flip,f.dot]);
function matrixHTML(m,cls){
  return `<div class="mgrid ${cls||''}" style="--c:${m.cols}">${m.cells.map((c,i)=>c?frameSVG(c,'cella '+(i+1)):'<div class="qmark">?</div>').join('')}</div>`;
}
function latin3(){ const base=[[0,1,2],[1,2,0],[2,0,1]]; const rp=R.shuffle([0,1,2]), cp=R.shuffle([0,1,2]); return rp.map(r=>cp.map(c=>base[r][c])); }
function eyLatinItem(sec){
  for(let g=0;g<40;g++){
    const shapes=R.sample(['circle','square','triangle','diamond','star'],3), counts=R.sample([1,2,3,4],3);
    const LS=latin3(), LC=latin3(); const fillMode=R.pick(['const','latin']); const fills=R.sample(['white','black','grey'],3), LF=latin3(); const constFill=R.pick(['white','black','grey']);
    const cell=(r,c)=>({kind:'mcell',shape:shapes[LS[r][c]],n:counts[LC[r][c]],fill:fillMode==='const'?constFill:fills[LF[r][c]],size:'L',flip:false,dot:null});
    const ans=cell(2,2), cells=[]; for(let r=0;r<3;r++) for(let c=0;c<3;c++) cells.push(r===2&&c===2?null:cell(r,c));
    const opts=[{frame:ans,broken:[]}], seen=new Set([mSig(ans)]);
    const vary=[
      ()=>({f:Object.assign({},ans,{shape:R.pick(shapes.filter(s=>s!==ans.shape))}),b:['mshape']}),
      ()=>({f:Object.assign({},ans,{n:R.pick(counts.filter(s=>s!==ans.n))}),b:['mcount']}),
      ()=>({f:Object.assign({},ans,{n:ans.n<4?ans.n+1:ans.n-1}),b:['mcount']}),
      ()=>({f:Object.assign({},ans,{fill:R.pick(['white','black','grey'].filter(s=>s!==ans.fill))}),b:['mfill']}),
      ()=>({f:Object.assign({},ans,{shape:R.pick(shapes.filter(s=>s!==ans.shape)),n:R.pick(counts.filter(s=>s!==ans.n))}),b:['mshape','mcount']})
    ];
    let guard=0; while(opts.length<5&&guard++<60){ const v=R.pick(vary)(); if(seen.has(mSig(v.f))) continue; seen.add(mSig(v.f)); opts.push({frame:v.f,broken:v.b}); }
    if(opts.length<5) continue;
    const sh=R.shuffle(opts), key=sh.findIndex(o=>!o.broken.length);
    const rules=['mshape','mcount'].concat(fillMode==='latin'?['mfill']:[]);
    return {sec,fmt:'abstract',id:eyId(sec+'-mat3'),rules,hard:true,matrix:{cols:3,cells},series:cells.filter(Boolean),question:'Which figure completes the grid?',options:sh,key,
      explain:`Ogni riga e ogni colonna contiene una volta ciascuna forma (${shapes.map(s=>SHAPE_IT[s]||s).join(', ')}) e una volta ciascun numero di figure (${counts.join(', ')})${fillMode==='latin'?' e ciascun colore':''}. Nella cella mancante: ${ans.n} × ${SHAPE_IT[ans.shape]||ans.shape}${fillMode==='latin'?', '+(FILL_IT[ans.fill]||ans.fill):''}.`,
      tip:'Matrice 3×3: controlla un attributo alla volta (forma, numero, colore) su riga E colonna. Spesso ogni valore compare una sola volta per riga e per colonna.'};
  }
}
function eyTransformItem(sec){
  const T=[
    {k:'msize',d:'diventa piccola',ap:f=>Object.assign({},f,{size:f.size==='L'?'S':'L'}),ok:f=>true},
    {k:'mfill',d:'cambia colore (bianco ↔ nero, grigio → nero)',ap:f=>Object.assign({},f,{fill:f.fill==='white'?'black':f.fill==='black'?'white':'black'}),ok:f=>true},
    {k:'mflip',d:'si capovolge',ap:f=>Object.assign({},f,{flip:!f.flip}),ok:f=>f.shape==='triangle'||f.shape==='arc'},
    {k:'mdot',d:'il pallino passa all\'angolo opposto',ap:f=>Object.assign({},f,{dot:(f.dot+2)%4}),ok:f=>true}
  ];
  for(let g=0;g<60;g++){
    const sA=R.pick(['triangle','arc']), sB=R.pick(['triangle','arc','circle','square','diamond'].filter(s=>s!==sA));
    const mk=(shape)=>({kind:'mcell',shape,n:1,fill:R.pick(['white','grey']),size:'L',flip:R.chance(.5),dot:R.int(0,3)});
    const a=mk(sA), b=mk(sB);
    const pool=T.filter(t=>t.ok(a)&&t.ok(b)); const ts=R.sample(pool,R.chance(.5)?2:3);
    const ap=f=>ts.reduce((x,t)=>t.ap(x),f);
    const a2=ap(a), ans=ap(b);
    const cells=[a,a2,b,null];
    const opts=[{frame:ans,broken:[]}], seen=new Set([mSig(ans)]);
    ts.forEach(t=>{ const f=ts.filter(x=>x!==t).reduce((x,u)=>u.ap(x),b); if(!seen.has(mSig(f))){ seen.add(mSig(f)); opts.push({frame:f,broken:[t.k]}); } });
    const extra=T.filter(t=>!ts.includes(t)&&t.ok(b));
    extra.forEach(t=>{ const f=t.ap(ans); if(opts.length<5&&!seen.has(mSig(f))){ seen.add(mSig(f)); opts.push({frame:f,broken:[t.k]}); } });
    let guard=0; while(opts.length<5&&guard++<30){ const f=Object.assign({},ans,{dot:(ans.dot+R.pick([1,3]))%4}); if(!seen.has(mSig(f))){ seen.add(mSig(f)); opts.push({frame:f,broken:['mdot']}); } }
    if(opts.length<5) continue;
    const sh=R.shuffle(opts.slice(0,5)), key=sh.findIndex(o=>!o.broken.length);
    return {sec,fmt:'abstract',id:eyId(sec+'-mat2'),rules:ts.map(t=>t.k),hard:ts.length>2,matrix:{cols:2,cells},series:cells.filter(Boolean),question:'Which figure replaces the question mark?',options:sh,key,
      explain:`Da sinistra a destra la figura ${ts.map(t=>t.d).join('; ')}. Applica le stesse trasformazioni alla seconda riga.`,
      tip:'Matrice 2×2: elenca TUTTE le differenze tra le due celle della prima riga (forma, dimensione, colore, verso, posizione del pallino) e applicale tutte alla seconda riga.'};
  }
}

// ===== Practice of the harder formats only =====
const EY_HARD_T={ds:['Sufficienza dei dati',eyDSItem],seat:['Tavolo rotondo',eySeatItem],rate:['Produttività e tempi',eyRateItem],pct:['Percentuali a catena e voti',eyPctChainItem],ser2:['Serie intrecciate e cifre invertite',eySeries2Item],pyr:['Piramidi di numeri',eyPyramidItem],mat3:['Matrici 3×3',eyLatinItem],mat2:['Matrici 2×2 con trasformazioni',eyTransformItem]};
let EY_HARD_ONLY='', EY_HARD_SET=null;
function buildEYHard(sec,n){
  const keys=EY_HARD_ONLY?[EY_HARD_ONLY]:(EY_HARD_SET||Object.keys(EY_HARD_T));
  const plan=[]; while(plan.length<n) plan.push(...R.shuffle(keys)); return plan.slice(0,n).map(k=>EY_HARD_T[k][1](sec));
}
