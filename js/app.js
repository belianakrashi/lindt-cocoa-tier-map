import {CONF,state,bus,esc,getJSON,badge,CONF_HELP,ICON,isDark} from './core.js';

const TABS = [
  ['overview','Overview'],['map','Supply Chain Map'],['tiers','Tier Explorer'],['timeline','Promises vs. Reality'],
  ['dashboard','Data Dashboard'],['lawsuit','The Lawsuit'],['evidence','Evidence Locker'],['method','Methodology & Gaps'],['about','About']];
const mods = {}, mounted = {};
const view = document.getElementById('view'), loader = document.getElementById('loader');

// nav
const nav = document.getElementById('nav');
nav.innerHTML = TABS.map(([id,l])=>`<a href="#${id}" data-tab="${id}">${l}</a>`).join('');
const menuBtn = document.getElementById('menuBtn');
menuBtn.onclick = () => { const o=nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded',o); };
nav.onclick = e => { if(e.target.closest('a')){nav.classList.remove('open');menuBtn.setAttribute('aria-expanded',false)} };

// theme
const themeBtn = document.getElementById('themeBtn');
themeBtn.onclick = () => {
  const t = isDark()?'light':'dark'; document.documentElement.dataset.theme=t; localStorage.setItem('theme',t); bus.emit('theme',t);
};

// confidence filter
const fb = document.getElementById('filters');
CONF.forEach(c=>{
  const b=document.createElement('button'); b.className='chip'; b.style.setProperty('--cc',`var(--c-${c})`);
  b.dataset.c=c; b.dataset.tip=CONF_HELP[c]; b.setAttribute('aria-pressed',state.conf.has(c));
  b.innerHTML=`${ICON[c]} ${c}`;
  b.onclick=()=>{
    if(state.conf.has(c)){ if(state.conf.size>1) state.conf.delete(c); } else state.conf.add(c);
    localStorage.setItem('conf',JSON.stringify([...state.conf]));
    fb.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',state.conf.has(x.dataset.c)));
    bus.emit('filter');
  };
  fb.appendChild(b);
});

// tooltips: any element with data-tip
const tip = document.getElementById('tip');
const showTip = (t,x,y) => { tip.textContent=t; tip.hidden=false; const w=tip.offsetWidth; tip.style.left=Math.min(innerWidth-w-8,Math.max(8,x+12))+'px'; tip.style.top=(y+16)+'px'; };
document.addEventListener('pointermove',e=>{ const el=e.target.closest?.('[data-tip]'); if(el&&e.pointerType!=='touch') showTip(el.dataset.tip,e.clientX,e.clientY); else tip.hidden=true; });
document.addEventListener('focusin',e=>{ const el=e.target.closest?.('[data-tip]'); if(el){const r=el.getBoundingClientRect(); showTip(el.dataset.tip,r.left,r.bottom-12)} });
document.addEventListener('focusout',()=>tip.hidden=true);

// router
function parse(){ const h=location.hash.slice(1)||'overview'; const [id,qs]=h.split('?'); return {id:TABS.some(t=>t[0]===id)?id:'overview',params:Object.fromEntries(new URLSearchParams(qs||''))}; }
let current=null, token=0;
async function route(){
  const {id,params}=parse(); const my=++token;
  nav.querySelectorAll('a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.tab===id)); nav.querySelectorAll('a').forEach(a=>{ if(a.dataset.tab===id)a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current')});
  document.title = `${TABS.find(t=>t[0]===id)[1]} · Lindt Cocoa Tier Map`;
  if(!mounted[id]){
    const sec=document.createElement('section'); sec.className='tab'; sec.id='tab-'+id; sec.hidden=true; view.appendChild(sec);
    mounted[id]={sec,mod:null};
    loader.hidden=false;
    try{
      mods[id]=await import(`./tabs/${id}.js`);
      if(my!==token){loader.hidden=true;return}
      await mods[id].mount(sec);
      mounted[id].mod=mods[id];
    }catch(err){ console.error(err); sec.innerHTML=`<div class="empty">Could not load this section (${esc(err.message)}). Check your connection and reload.</div>`; }
    loader.hidden=true;
  }
  if(my!==token) return;
  Object.entries(mounted).forEach(([k,v])=>{ v.sec.hidden = k!==id; });
  const m=mounted[id]; m.sec.style.animation='none'; void m.sec.offsetWidth; m.sec.style.animation='';
  m.mod?.show?.(params);
  if(current!==id){ window.scrollTo({top:0}); view.focus({preventScroll:true}); }
  current=id;
}
addEventListener('hashchange',route);
bus.on('filter',()=>Object.values(mounted).forEach(m=>m.mod?.update?.()));
bus.on('theme',t=>Object.values(mounted).forEach(m=>m.mod?.theme?.(t)));

// global search
(async function(){
  const input=document.getElementById('q'), list=document.getElementById('results');
  const [ents,geo,srcs,site]=await Promise.all([getJSON('entities.json'),getJSON('geo.json'),getJSON('sources.json'),getJSON('site.json')]);
  document.getElementById('updated').textContent=site.updated; document.getElementById('legal').textContent=site.legal;
  const idx=[
    ...ents.map(e=>({t:e.name,s:`${e.kind} · ${e.country}`,k:(e.name+' '+e.aliases.join(' ')+' '+e.role).toLowerCase(),h:`#tiers?node=${e.id}`})),
    ...[...geo.ports,...geo.processing,...geo.regions].map(p=>({t:p.name,s:`place · ${p.country}`,k:(p.name+' '+p.country).toLowerCase(),h:`#map?focus=${p.id}`})),
    ...srcs.map(s=>({t:s.title,s:`source · ${s.publisher}`,k:(s.title+' '+s.publisher).toLowerCase(),h:`#evidence?q=${encodeURIComponent(s.title.slice(0,40))}`}))];
  let sel=-1,items=[];
  const render=()=>{ list.innerHTML=items.map((r,i)=>`<li role="option" id="r${i}" aria-selected="${i===sel}" data-i="${i}">${esc(r.t)}<small>${esc(r.s)}</small></li>`).join('')||'<li>No matches</li>'; list.hidden=false; };
  input.oninput=()=>{ const q=input.value.trim().toLowerCase(); if(!q){list.hidden=true;return} items=idx.filter(r=>r.k.includes(q)).slice(0,8); sel=-1; render(); };
  const pick=i=>{ const r=items[i]; if(!r)return; location.hash=r.h; list.hidden=true; input.value=''; input.blur(); };
  list.onclick=e=>{ const li=e.target.closest('li[data-i]'); if(li)pick(+li.dataset.i); };
  input.onkeydown=e=>{
    if(e.key==='ArrowDown'){sel=Math.min(items.length-1,sel+1);render();e.preventDefault()}
    else if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);render();e.preventDefault()}
    else if(e.key==='Enter'){pick(sel<0?0:sel)} else if(e.key==='Escape'){list.hidden=true}
  };
  document.addEventListener('click',e=>{ if(!e.target.closest('.search'))list.hidden=true; });
})().catch(e=>console.error(e));

route();
