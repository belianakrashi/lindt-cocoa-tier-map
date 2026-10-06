// Shared helpers, state and data loading.
export const CONF = ['Confirmed','Reported','Alleged','Unverified'];
export const ICON = {Confirmed:'✔',Reported:'●',Alleged:'▲',Unverified:'?'};
export const CONF_HELP = {
  Confirmed:'Stated by an official, primary or company source.',
  Reported:'Reported by credible secondary sources; not independently verified.',
  Alleged:'A claim made in the lawsuit; unproven and denied by Lindt.',
  Unverified:'Inferred, placeholder or awaiting data.'};

export const state = { conf:new Set(JSON.parse(localStorage.getItem('conf')||'null')||CONF) };
const subs = {};
export const bus = {
  on(e,f){(subs[e]=subs[e]||[]).push(f)},
  emit(e,d){(subs[e]||[]).forEach(f=>f(d))}
};
export const confOn = c => state.conf.has(c);

export const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const badge = c => `<span class="badge" style="--cc:var(--c-${esc(c)})" data-icon="${ICON[c]||''}" data-tip="${esc(CONF_HELP[c]||'')}">${esc(c)}</span>`;
export const isDark = () => document.documentElement.dataset.theme === 'dark';
export const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const cache = {};
export function getJSON(name){ return cache[name] ||= fetch(`data/${name}`).then(r=>{ if(!r.ok) throw new Error(name+' '+r.status); return r.json(); }); }
export function getText(name){ return cache['t'+name] ||= fetch(`data/${name}`).then(r=>{ if(!r.ok) throw new Error(name+' '+r.status); return r.text(); }); }

export function parseCSV(text){
  const rows=[]; let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c=='"'){ if(text[i+1]=='"'){f+='"';i++} else q=false } else f+=c }
    else if(c=='"') q=true;
    else if(c==','){row.push(f);f=''}
    else if(c=='\n'||c=='\r'){ if(c=='\r'&&text[i+1]=='\n')i++; row.push(f);f=''; if(row.length>1||row[0]!=='')rows.push(row); row=[] }
    else f+=c;
  }
  if(f!==''||row.length){row.push(f);rows.push(row)}
  const [h,...b]=rows;
  return (h?b.map(r=>Object.fromEntries(h.map((k,i)=>[k.trim(),(r[i]??'').trim()]))):[]);
}
export const toCSV = (rows,cols) => [cols.join(','),...rows.map(r=>cols.map(c=>{const v=r[c]??'';return /[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':v}).join(','))].join('\n');
export function download(name,text){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

const loaded = {};
export function loadScript(url){ return loaded[url] ||= new Promise((res,rej)=>{const s=document.createElement('script');s.src=url;s.onload=res;s.onerror=()=>rej(new Error('Failed to load '+url));document.head.appendChild(s)}); }
export function loadCSS(url){ if(loaded[url])return; loaded[url]=1; const l=document.createElement('link'); l.rel='stylesheet'; l.href=url; document.head.appendChild(l); }

export const srcLinks = (arr=[]) => arr.length ? `<div class="src">Sources: ${arr.map((s,i)=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="Accessed ${esc(s.accessed)}">${esc(s.id||('['+(i+1)+']'))}</a>`).join('')}<span class="muted" style="color:var(--muted)">accessed ${esc(arr[0].accessed)}</span></div>` : '';

export function go(hash){ location.hash = hash; }
export function setAll(){ /* placeholder to keep API explicit */ }
