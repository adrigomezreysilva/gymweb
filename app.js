'use strict';
/* GymProgress — todos los datos se guardan localmente en IndexedDB */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0'),R=v=>Math.round(v*10)/10;
const nz=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const dk=t=>{const d=new Date(t);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const hm=t=>new Date(t).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
const fd=t=>new Date(t).toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const dur=ms=>{const m=Math.round(ms/6e4);return m>=60?Math.floor(m/60)+' h '+pad(m%60)+' min':m+' min'};
const clk=ms=>{const s=Math.max(0,Math.floor(ms/1000));return pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60)};

/* ---------- Base de datos ---------- */
let idb,S={ex:[],ses:[]},V={v:'home'},F={q:'',g:''},K='w',C=new Date(),lt=0;C.setDate(1);
const openDB=()=>new Promise((ok,ko)=>{const r=indexedDB.open('gymprogress',1);r.onupgradeneeded=()=>{['exercises','sessions'].forEach(s=>r.result.createObjectStore(s,{keyPath:'id'}));r.result.createObjectStore('meta',{keyPath:'k'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)});
const tx=(st,mode,fn)=>new Promise((ok,ko)=>{const t=idb.transaction(st,mode),q=fn(t);t.oncomplete=()=>ok(q&&q.result);t.onerror=t.onabort=()=>ko(t.error)});
const put=(s,o)=>tx(s,'readwrite',t=>t.objectStore(s).put(o));
const del=(s,id)=>tx(s,'readwrite',t=>t.objectStore(s).delete(id));
const all=s=>tx(s,'readonly',t=>t.objectStore(s).getAll());
const save=(s,o)=>put(s,o).catch(e=>toast('No se pudo guardar: '+e.message));
const load=async()=>{S.ex=await all('exercises');S.ses=await all('sessions')};
const busy=()=>Date.now()-lt<350||(lt=Date.now(),false); // evita pulsaciones dobles

/* ---------- Utilidades de datos ---------- */
const active=()=>S.ses.find(s=>s.status==='active');
const done=()=>S.ses.filter(s=>s.status==='done').sort((a,b)=>b.start-a.start);
const nset=s=>s.items.reduce((c,i)=>c+i.sets.length,0);
const exn=i=>(S.ex.find(x=>x.id===i.x)||{n:i.n||'(ejercicio eliminado)'}).n;
const lastIt=x=>{for(const s of done()){const i=s.items.find(i=>i.x===x&&i.sets.length);if(i)return i}};
const defSet=x=>{const i=lastIt(x);return i?{w:i.sets[0].w,r:i.sets[0].r}:{w:0,r:10}};
const e1=z=>z.w*(1+z.r/30); // Epley
// series válidas (peso>0, reps>0) de un ejercicio, en orden cronológico
const sets=x=>done().reverse().flatMap(s=>s.items.filter(i=>i.x===x).flatMap(i=>i.sets.filter(z=>z.w>0&&z.r>0).map(z=>({w:z.w,r:z.r,t:s.start,d:s.id}))));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2800)}
function sheet(h){$('#sheet').innerHTML=`<div class=pn><button class="ic x" data-a=close aria-label="Cerrar">✕</button>${h}</div>`;$('#sheet').hidden=false;document.body.classList.add('lock')}

/* ---------- Vistas ---------- */
const LOGO='<i class=lg>GP</i>';
function vHome(){const d=done(),a=active(),n=new Date(),m=d.filter(s=>{const x=new Date(s.start);return x.getMonth()===n.getMonth()&&x.getFullYear()===n.getFullYear()}),l=d[0];
return `<header class=top><div class=logo>${LOGO}GymProgress</div></header>`+(a?`<button class="card act" data-go=workout>Entrenamiento en curso<b class=clk>${clk(Date.now()-a.start)}</b><small>Iniciado a las ${hm(a.start)} · toca para continuar</small></button>`:`<button class=big data-a=start>▶ Iniciar entrenamiento</button>`)+
`<div class=grid><div class="card stat"><b>${d.length}</b><small>Entrenamientos totales</small></div><div class="card stat"><b>${m.length}</b><small>Este mes</small></div><div class="card stat"><b>${dur(d.reduce((t,s)=>t+s.dur,0))}</b><small>Tiempo total entrenado</small></div><div class="card stat"><b>${l?fd(l.start):'—'}</b><small>Último entrenamiento</small></div></div>
<div class=grid><button class=card data-go=calendar>📅 Calendario</button><button class=card data-go=history>📋 Historial</button><button class=card data-go=progress>📈 Progreso</button><button class=card data-go=tech>📖 Técnica</button></div>`}

function vWork(){const a=active();if(!a){V={v:'home'};return vHome()}
return `<header class=top><span>Entrenamiento</span><span class="clk" style="margin-left:auto;color:var(--g)">${clk(Date.now()-a.start)}</span></header><small class=mut>Inicio: ${hm(a.start)} · se guarda automáticamente</small>`+
(a.items.map((it,i)=>{const l=lastIt(it.x);return `<div class=card><div class=row><b>${esc(exn(it))}</b><span><button class=ic data-a=up data-i=${i} aria-label="Subir">↑</button> <button class=ic data-a=dn data-i=${i} aria-label="Bajar">↓</button> <button class=ic data-a=rmx data-i=${i} aria-label="Quitar">🗑</button></span></div>${l?`<small class=mut>Última vez: ${l.sets.map(z=>z.w+'×'+z.r).join(', ')}</small>`:''}`+
it.sets.map((s,j)=>`<div class=set><span>${j+1}</span><input type=number inputmode=decimal step=0.5 min=0 value="${s.w}" data-a=sw data-i=${i} data-j=${j} aria-label="Kilos"><em>kg ×</em><input type=number inputmode=numeric step=1 min=1 value="${s.r}" data-a=sr data-i=${i} data-j=${j} aria-label="Repeticiones"><em>rep</em><button class=ic data-a=rms data-i=${i} data-j=${j} aria-label="Eliminar serie">✕</button></div>`).join('')+`<button class=sm data-a=adds data-i=${i}>+ Serie</button></div>`}).join('')||'<div class="card mut">Aún no hay ejercicios. Añade el primero.</div>')+
`<button class=big data-a=pick>+ Añadir ejercicio</button><button class="big out" data-a=finish>Finalizar entrenamiento</button>`}

function sd(s){return `<h2>${fd(s.start)}</h2><p class=mut>${hm(s.start)} – ${hm(s.end)} · ${dur(s.dur)}</p>`+s.items.map(i=>`<div class=card><b>${esc(exn(i))}</b>${i.sets.map((z,j)=>`<div class=ln>Serie ${j+1}: <b>${z.w} kg × ${z.r}</b></div>`).join('')}</div>`).join('')}

function vCal(){const y=C.getFullYear(),m=C.getMonth(),f=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate(),by={},pre=y+'-'+pad(m+1)+'-',td=dk(Date.now());
done().forEach(s=>{const k=dk(s.start);(by[k]=by[k]||[]).push(s)});
let c='';for(let i=0;i<f;i++)c+='<i></i>';
for(let d=1;d<=n;d++){const k=pre+pad(d);c+=`<button class="day${by[k]?' on':''}${k===td?' today':''}" data-a=day data-k=${k}>${d}</button>`}
const cnt=Object.keys(by).filter(k=>k.startsWith(pre)).reduce((t,k)=>t+by[k].length,0);
return `<header class=top>Calendario</header><div class="row card"><button class=ic data-a=mon data-n=-1 aria-label="Mes anterior">‹</button><b>${MES[m]} ${y}</b><button class=ic data-a=mon data-n=1 aria-label="Mes siguiente">›</button></div><p class=mut>${cnt} entrenamiento${cnt===1?'':'s'} este mes · pulsa un día para ver el detalle</p><div class=cal>${'LMXJVSD'.split('').map(x=>`<b>${x}</b>`).join('')}${c}</div>`}

const vHist=()=>{const d=done();return `<header class=top>Historial</header>`+(d.map(s=>`<button class=card data-a=ses data-id="${esc(s.id)}"><b>${fd(s.start)}</b><br><small>${dur(s.dur)} · ${s.items.length} ejercicio${s.items.length===1?'':'s'} · ${nset(s)} series</small></button>`).join('')||'<div class="card mut">Aún no hay entrenamientos. Cuando finalices el primero aparecerá aquí.</div>')};

// Listado con búsqueda y filtro por grupo; el modo decide qué hace cada fila
function exList(m){const q=nz(F.q);
const chips=['',...GROUPS].map(g=>`<button class="chip${F.g===g?' on':''}" data-a=chip data-g="${g}">${g||'Todos'}</button>`).join('');
const rows=GROUPS.filter(g=>!F.g||F.g===g).map(g=>{const l=S.ex.filter(e=>e.g===g&&nz(e.n).includes(q));
return l.length?`<h3>${g}</h3>`+l.map(e=>{const n=esc(e.n),id=`data-id="${esc(e.id)}"`;
return m==='lib'?`<div class="card row"><b>${n}</b><span><button class=ic data-a=editex ${id} aria-label="Editar">✎</button> <button class=ic data-a=delex ${id} aria-label="Eliminar">🗑</button></span></div>`
:m==='prog'?`<button class="card row" data-go=progd data-p="${esc(e.id)}">${n}<span>›</span></button>`
:`<button class="card row" data-a=${m==='tech'?'tech':'addex'} ${id}>${n}<span>${m==='tech'?'›':'＋'}</span></button>`}).join(''):''}).join('')||'<div class="card mut">Sin resultados.</div>';
return `<div class=chips>${chips}</div>${rows}`}
const browser=m=>`<input id=pq class=inp placeholder="Buscar ejercicio…" value="${esc(F.q)}" autocomplete=off><div id=pl data-m=${m}>${exList(m)}</div>`;
const back=(to,t)=>`<header class=top><button class=ic data-go=${to} aria-label="Volver">‹</button>${t}</header>`;
const vProg=()=>`<header class=top>Progreso</header><p class=mut>Elige un ejercicio para ver récords y gráficas.</p>${browser('prog')}`;
const vMore=()=>`<header class=top>Más</header><button class=card data-go=lib>🏋️ Mis ejercicios</button><button class=card data-go=tech>📖 Técnica de ejercicios</button><button class=card data-go=backup>💾 Copia de seguridad</button>`;
const vLib=()=>back('more','Mis ejercicios')+`<button class=big data-a=newex>+ Nuevo ejercicio</button>${browser('lib')}`;
const vTech=()=>back('more','Técnica de ejercicios')+browser('tech');
const vBackup=()=>back('more','Copia de seguridad')+`<div class=card>Tus datos se guardan <b>solo en este dispositivo</b> y no se sincronizan automáticamente con otros. Si borras los datos del navegador se perderán: exporta copias con regularidad.</div><button class=big data-a=exp>Exportar copia</button><button class="big out" data-a=imp>Importar copia</button><div class=card><b>Instalar en iPhone</b><br><small>Abre la web en Safari → Compartir → «Añadir a pantalla de inicio».</small></div>`;

function chart(p){try{if(p.length<2)return '<div class="card mut">Necesitas registrar más entrenamientos con este ejercicio (mínimo 2) para ver la gráfica.</div>';
const W=340,H=190,pd=30,v=p.map(q=>q.v),lo=Math.min(...v),hi=Math.max(...v),rg=hi-lo||1,X=i=>pd+i*(W-2*pd)/(p.length-1),Y=y=>H-pd-(y-lo)/rg*(H-2*pd),ds=t=>new Date(t).toLocaleDateString('es-ES',{day:'numeric',month:'short'});
return `<svg class=ch viewBox="0 0 ${W} ${H}" role=img aria-label="Gráfica"><polyline fill=none stroke="#22c55e" stroke-width=2.5 stroke-linejoin=round points="${p.map((q,i)=>X(i)+','+Y(q.v)).join(' ')}"/>${p.map((q,i)=>`<circle cx=${X(i)} cy=${Y(q.v)} r=3.5 fill="#22c55e"/>`).join('')}<text x=4 y=${pd-14}>${R(hi)}</text><text x=4 y=${H-pd+4}>${R(lo)}</text><text x=${pd} y=${H-8}>${ds(p[0].t)}</text><text x=${W-pd} y=${H-8} text-anchor=end>${ds(p[p.length-1].t)}</text></svg>`}catch(e){console.error(e);return '<div class="card mut">No se pudo dibujar la gráfica.</div>'}}

function vProgD(){const e=S.ex.find(x=>x.id===V.p);if(!e)return vProg();const ss=sets(V.p),h=back('progress',esc(e.n));
if(!ss.length)return h+'<div class="card mut">Todavía no hay series registradas de este ejercicio. Registra más entrenamientos.</div>';
const mw=Math.max(...ss.map(z=>z.w)),rec=ss.filter(z=>z.w===mw).sort((a,b)=>b.r-a.r||a.t-b.t)[0],best=ss.reduce((a,b)=>e1(b)>e1(a)?b:a),by=[];
ss.forEach(z=>{let g=by[by.length-1];if(!g||g.d!==z.d){g={d:z.d,t:z.t,w:0,r:0,e:0};by.push(g)}g.w=Math.max(g.w,z.w);g.r=Math.max(g.r,z.r);g.e=Math.max(g.e,e1(z))});
let run=0;const ser={w:by.map(g=>g.w),r:by.map(g=>g.r),e:by.map(g=>g.e),rec:by.map(g=>run=Math.max(run,g.w))},tabs=[['w','Peso'],['r','Repeticiones'],['e','1RM estimada'],['rec','Récords']];
return h+`<div class=card><small>🏆 Récord de peso</small><br><b style="font-size:24px">${mw} kg × ${rec.r} rep</b><br><small>${fd(rec.t)}</small></div><div class=card><small>Mejor serie histórica (según 1RM estimada)</small><br><b>${best.w} kg × ${best.r} rep</b> <small>· ${fd(best.t)}</small><br><small>1RM estimada (Epley): ≈ <b style="color:var(--g)">${R(e1(best))} kg</b>. Es una estimación con peso × (1 + reps / 30), no un máximo realmente probado.</small></div>
<div class=chips>${tabs.map(([k,l])=>`<button class="chip${K===k?' on':''}" data-a=ktab data-k=${k}>${l}</button>`).join('')}</div>${chart(by.map((g,i)=>({t:g.t,v:ser[K][i]})))}<small class=mut>${tabs.find(t=>t[0]===K)[1]} por sesión (${K==='r'?'repeticiones':'kg'}) · ${by.length} sesiones</small>`}

const VIEWS={home:vHome,workout:vWork,calendar:vCal,history:vHist,progress:vProg,progd:vProgD,more:vMore,lib:vLib,tech:vTech,backup:vBackup};
const NAV=[['home','🏠','Inicio'],['calendar','📅','Calendario'],['history','📋','Historial'],['progress','📈','Progreso'],['more','⚙️','Más']],GRP={workout:'home',progd:'progress',lib:'more',tech:'more',backup:'more'};
function render(){const y=scrollY,a=active();let h;
try{h=VIEWS[V.v]()}catch(e){console.error(e);h=`<div class=card>Error al mostrar esta sección (${esc(e.message)}). El resto de la app sigue funcionando.</div>`}
$('#app').innerHTML=(a&&V.v!=='home'&&V.v!=='workout'?`<button class="card act" data-go=workout>● Entrenando <b class=clk style="display:inline;font-size:18px">${clk(Date.now()-a.start)}</b> · volver al entrenamiento</button>`:'')+h;
$('#nav').innerHTML=NAV.map(([v,i,l])=>`<button class="${(GRP[V.v]||V.v)===v?'on':''}" data-go=${v}><span>${i}</span>${l}</button>`).join('');scrollTo(0,y)}
const go=(v,p)=>{V={v,p};F={q:'',g:''};render();scrollTo(0,0)};

/* ---------- Técnica ---------- */
const ZN={Pecho:[[50,38,14,7]],Hombros:[[32,30,7,5],[68,30,7,5]],Espalda:[[50,48,14,16]],Bíceps:[[24,42,5,9],[76,42,5,9]],Tríceps:[[24,56,5,8],[76,56,5,8]],Piernas:[[42,95,6,20],[58,95,6,20]]};
const fig=g=>`<svg class=fig viewBox="0 0 100 130" role=img aria-label="Mapa muscular: ${g}"><circle cx=50 cy=14 r=9 /><rect x=34 y=26 width=32 height=44 rx=8 /><rect x=18 y=28 width=12 height=40 rx=6 /><rect x=70 y=28 width=12 height=40 rx=6 /><rect x=36 y=72 width=13 height=50 rx=6 /><rect x=51 y=72 width=13 height=50 rx=6 />${(ZN[g]||[]).map(z=>`<ellipse class=z cx=${z[0]} cy=${z[1]} rx=${z[2]} ry=${z[3]} opacity=.9 />`).join('')}</svg>`;

/* ---------- Acciones ---------- */
const A={};
A.close=()=>{$('#sheet').hidden=true;document.body.classList.remove('lock')};
A.start=()=>{if(active())return;const s={id:uid(),start:Date.now(),status:'active',items:[]};S.ses.push(s);save('sessions',s);V={v:'workout'};render()};
const mut=fn=>{const a=active();if(!a)return;fn(a);save('sessions',a);render()};
A.pick=()=>{F={q:'',g:''};sheet(`<h2>Añadir ejercicio</h2><button class="sm" data-a=newex>+ Crear ejercicio nuevo</button>${browser('pick')}`)};
A.chip=t=>{F.g=t.dataset.g;$('#pl').innerHTML=exList($('#pl').dataset.m)};
A.addex=(t,d)=>{if(busy())return;const a=active(),e=S.ex.find(x=>x.id===d.id);if(!a||!e)return;a.items.push({id:uid(),x:e.id,n:e.n,sets:[defSet(e.id)]});save('sessions',a);A.close();V={v:'workout'};render()};
A.adds=(t,d)=>{if(busy())return;mut(a=>{const it=a.items[+d.i],p=it.sets[it.sets.length-1];it.sets.push(p?{w:p.w,r:p.r}:defSet(it.x))})};
A.rms=(t,d)=>mut(a=>a.items[+d.i].sets.splice(+d.j,1));
A.rmx=(t,d)=>{if(confirm('¿Quitar este ejercicio y sus series de la sesión?'))mut(a=>a.items.splice(+d.i,1))};
A.up=(t,d)=>mut(a=>{const i=+d.i;if(i>0)[a.items[i-1],a.items[i]]=[a.items[i],a.items[i-1]]});
A.dn=(t,d)=>mut(a=>{const i=+d.i;if(i<a.items.length-1)[a.items[i+1],a.items[i]]=[a.items[i],a.items[i+1]]});
A.finish=()=>{const a=active();if(!a)return;a.items=a.items.filter(i=>i.sets.length);
if(!nset(a)){if(confirm('No hay series registradas. ¿Descartar este entrenamiento?')){S.ses=S.ses.filter(s=>s!==a);del('sessions',a.id);V={v:'home'};render()}return}
if(!confirm('¿Finalizar el entrenamiento?'))return;
const recs=a.items.filter(it=>{const p=Math.max(0,...sets(it.x).map(z=>z.w));return it.sets.some(z=>z.w>p&&z.r>0)}).map(exn);
a.end=Date.now();a.dur=a.end-a.start;a.status='done';save('sessions',a);V={v:'home'};render();
toast(recs.length?'🏆 Nuevo récord de peso: '+recs.join(', '):'Entrenamiento guardado · '+dur(a.dur))};
A.mon=(t,d)=>{C=new Date(C.getFullYear(),C.getMonth()+(+d.n),1);render()};
A.day=(t,d)=>{const l=done().filter(s=>dk(s.start)===d.k).reverse();sheet(l.length?l.map(sd).join(''):`<h2>${fd(new Date(d.k+'T12:00:00'))}</h2><p class=mut>No entrenaste este día.</p>`)};
A.ses=(t,d)=>{const s=S.ses.find(x=>x.id===d.id);if(s)sheet(sd(s)+`<button class="big out" data-a=dels data-id="${esc(s.id)}">Eliminar sesión</button>`)};
A.dels=(t,d)=>{const s=S.ses.find(x=>x.id===d.id);if(!s||!confirm('¿Eliminar esta sesión? No se puede deshacer.'))return;S.ses=S.ses.filter(x=>x!==s);del('sessions',s.id);A.close();render();toast('Sesión eliminada')};
A.ktab=(t,d)=>{K=d.k;render()};
function exForm(e){sheet(`<h2>${e?'Editar':'Nuevo'} ejercicio</h2><input id=fn class=inp maxlength=60 placeholder="Nombre del ejercicio" value="${e?esc(e.n):''}"><select id=fg class=inp>${GROUPS.map(g=>`<option${e&&e.g===g?' selected':''}>${g}</option>`).join('')}</select><button class=big data-a=saveex data-id="${e?esc(e.id):''}">Guardar</button>`)}
A.newex=()=>exForm();A.editex=(t,d)=>exForm(S.ex.find(e=>e.id===d.id));
A.saveex=async(t,d)=>{const n=$('#fn').value.trim(),g=$('#fg').value;if(!n)return toast('Escribe un nombre');
if(S.ex.some(e=>e.id!==d.id&&nz(e.n)===nz(n)))return toast('Ya existe un ejercicio con ese nombre');
let e=S.ex.find(x=>x.id===d.id);if(!e){e={id:uid()};S.ex.push(e)}e.n=n;e.g=g;await save('exercises',e);A.close();render();toast('Ejercicio guardado')};
A.delex=(t,d)=>{const e=S.ex.find(x=>x.id===d.id);if(!e||!confirm(`¿Eliminar «${e.n}» del catálogo? Tu historial se conserva.`))return;S.ex=S.ex.filter(x=>x!==e);del('exercises',e.id);render()};
A.tech=(t,d)=>{const e=S.ex.find(x=>x.id===d.id);if(!e)return;const T=/^d\d+$/.test(e.id)&&DEF[+e.id.slice(1)],p=T&&T[3].split('|');
sheet(`<h2>${esc(e.n)}</h2>${fig(e.g)}<p class=mut style="text-align:center">Mapa muscular orientativo, no es una demostración del ejercicio. No hay vídeo verificado disponible.</p><p><b>Grupo principal:</b> ${e.g}</p>`+(T?`<p><b>Músculos secundarios:</b> ${T[2]}</p><h3>Posición inicial</h3><p>${p[0]}</p><h3>Movimiento correcto (paso a paso)</h3><ol>${p.slice(1).map(x=>`<li>${x}</li>`).join('')}</ol><h3>Respiración</h3><p>${BREATH}</p><h3>Errores frecuentes</h3><p>${T[4]}</p><h3>Consejos</h3><p>${T[5]}</p>`:'<div class="card mut">Este ejercicio personalizado no tiene ficha de técnica.</div>'))};

/* ---------- Copias de seguridad ---------- */
function valid(j){const bad=m=>{throw Error(m)};if(!j||j.app!=='GymProgress'||!Array.isArray(j.exercises)||!Array.isArray(j.sessions))bad('no es una copia de GymProgress');
j.exercises.forEach(e=>{if(!e||typeof e.id!=='string'||typeof e.n!=='string'||!GROUPS.includes(e.g))bad('ejercicio inválido')});
j.sessions.forEach(s=>{if(!s||typeof s.id!=='string'||!Number.isFinite(s.start)||!['active','done'].includes(s.status)||!Array.isArray(s.items))bad('sesión inválida');
if(s.status==='done'&&!(Number.isFinite(s.end)&&Number.isFinite(s.dur)))bad('sesión sin hora de fin');
s.items.forEach(i=>{if(!i||typeof i.id!=='string'||typeof i.x!=='string'||!Array.isArray(i.sets)||i.sets.some(z=>!z||!Number.isFinite(z.w)||!Number.isFinite(z.r)||z.w<0||z.r<0))bad('series inválidas')})});
if(j.sessions.filter(s=>s.status==='active').length>1)bad('hay más de una sesión activa')}
A.exp=async()=>{const f=new File([JSON.stringify({app:'GymProgress',version:1,exportedAt:new Date().toISOString(),exercises:S.ex,sessions:S.ses},null,1)],'gymprogress-'+dk(Date.now())+'.json',{type:'application/json'});
try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){if(e.name==='AbortError')return}
const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),6e3);toast('Copia exportada')};
A.imp=()=>$('#file').click();
$('#file').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
try{const j=JSON.parse(await f.text());valid(j);
if(!confirm(`Esto REEMPLAZARÁ todos tus datos actuales por la copia (${j.sessions.length} sesiones, ${j.exercises.length} ejercicios). ¿Continuar?`))return;
await tx(['exercises','sessions','meta'],'readwrite',t=>{['exercises','sessions'].forEach(s=>{t.objectStore(s).clear();j[s].forEach(o=>t.objectStore(s).put(o))});t.objectStore('meta').put({k:'seeded',v:1})});
await load();V={v:'home'};render();toast('Copia importada correctamente')}catch(err){toast('Archivo no válido: '+err.message)}});

/* ---------- Eventos ---------- */
document.addEventListener('click',e=>{if(e.target.id==='sheet')return A.close();const t=e.target.closest('[data-a],[data-go]');if(!t||t.tagName==='INPUT')return;
if(t.dataset.go){A.close();return go(t.dataset.go,t.dataset.p)}
Promise.resolve().then(()=>A[t.dataset.a]&&A[t.dataset.a](t,t.dataset)).catch(err=>toast('Error: '+err.message))});
document.addEventListener('change',e=>{const el=e.target,k=el.dataset.a;if(k!=='sw'&&k!=='sr')return;const a=active();if(!a)return;
const s=a.items[+el.dataset.i].sets[+el.dataset.j],v=parseFloat(el.value),ok=k==='sw'?(v>=0&&v<=1000):(Number.isInteger(v)&&v>=1&&v<=200);
if(!ok){el.value=k==='sw'?s.w:s.r;return toast(k==='sw'?'Peso: entre 0 y 1000 kg':'Repeticiones: número entero entre 1 y 200')}
if(k==='sw')s.w=v;else s.r=v;save('sessions',a)});
document.addEventListener('input',e=>{if(e.target.id==='pq'){F.q=e.target.value;$('#pl').innerHTML=exList($('#pl').dataset.m)}});
document.addEventListener('focusin',e=>{if(e.target.matches('.set input'))e.target.select()});
addEventListener('error',e=>toast('Error: '+e.message));
setInterval(()=>{const a=active();if(a)$$('.clk').forEach(c=>c.textContent=clk(Date.now()-a.start))},1000);

async function init(){
try{idb=await openDB();
if(!await tx('meta','readonly',t=>t.objectStore('meta').get('seeded')))await tx(['exercises','meta'],'readwrite',t=>{DEF_EX.forEach(e=>t.objectStore('exercises').put(e));t.objectStore('meta').put({k:'seeded',v:1})});
await load()}catch(e){$('#app').innerHTML=`<div class=card>No se pudo abrir la base de datos local: ${esc(e.message)}. Comprueba que no estás en modo privado.</div>`;return}
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
V={v:active()?'workout':'home'};render()}
init();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
