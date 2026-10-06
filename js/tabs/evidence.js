import {getJSON,esc,badge,confOn} from '../core.js';
let S=[],root,sortK='date',sortD=-1;
const COLS=[['title','Title'],['publisher','Publisher'],['date','Date'],['type','Type'],['confidence','Confidence'],['url','Link']];
export async function mount(el){
  S=await getJSON('sources.json'); root=el;
  el.innerHTML=`<h1>Evidence locker</h1><p class="note">Every source used, with the confidence we assign to what it supports. “Accessed” is when we last opened it.</p>
  <div class="controls"><input id="evq" type="search" placeholder="Filter sources…" aria-label="Filter sources"><select id="evt" aria-label="Filter by type"><option value="">All types</option>${[...new Set(S.map(s=>s.type))].sort().map(t=>`<option>${esc(t)}</option>`).join('')}</select><span id="evn" class="note"></span></div>
  <div class="card tablewrap"><table><thead><tr>${COLS.map(([k,l])=>`<th data-k="${k}" tabindex="0" role="columnheader" aria-sort="none">${l}</th>`).join('')}<th>Notes</th></tr></thead><tbody></tbody></table></div>`;
  el.querySelector('#evq').oninput=update; el.querySelector('#evt').onchange=update;
  el.querySelectorAll('th[data-k]').forEach(th=>{ const f=()=>{ const k=th.dataset.k; sortD=sortK===k?-sortD:1; sortK=k; update(); }; th.onclick=f; th.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}; });
  update();
}
export function show(p){ if(p.q!==undefined){ root.querySelector('#evq').value=p.q; update(); } }
export function update(){
  const q=root.querySelector('#evq').value.toLowerCase(), t=root.querySelector('#evt').value;
  const rows=S.filter(s=>confOn(s.confidence)&&(!t||s.type===t)&&(!q||JSON.stringify(s).toLowerCase().includes(q))).sort((a,b)=>String(a[sortK]).localeCompare(String(b[sortK]))*sortD);
  root.querySelectorAll('th[data-k]').forEach(th=>th.setAttribute('aria-sort',th.dataset.k===sortK?(sortD>0?'ascending':'descending'):'none'));
  root.querySelector('tbody').innerHTML=rows.map(s=>`<tr id="src-${s.id}"><td><strong>${esc(s.id)}</strong> ${esc(s.title)}</td><td>${esc(s.publisher)}</td><td>${esc(s.date)}</td><td>${esc(s.type)}</td><td>${badge(s.confidence)}</td>
   <td><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a><br><small>accessed ${esc(s.accessed)}</small></td><td><small>${esc(s.notes)}</small></td></tr>`).join('')||'<tr><td colspan="7">No sources match the current filters.</td></tr>';
  root.querySelector('#evn').textContent=`${rows.length} of ${S.length} sources`;
}
