import {getJSON,loadScript,esc,badge,srcLinks,confOn} from '../core.js';
const TIERS=['US retail brands','US chocolate factories','Processors / suppliers','Regulators & buying companies / cooperatives','Farms'];
let d3,root,ents,rels,byId={},svg,g,nodes,links,nodeSel,linkSel,sel=null,zoom,W=900,H=640,nodeEls;
const rowY=t=>80+t*((H-130)/4);
const flowDir=r=> r.type==='supply'?[r.from,r.to]: r.type==='brand-factory'?[r.to,r.from]: r.type==='ownership'?[r.to,r.from]:null;

export async function mount(el){
  root=el;
  el.innerHTML=`<h1>Tier explorer</h1>
  <p class="note">Click a node to trace upstream (toward farms) and downstream (toward US shelves). Dashed gold lines are company <em>claims and certifications</em>, not verified supply links. Most links between suppliers and factories are <strong>Unverified</strong> sector-level routing.</p>
  <div class="maptools"><button class="btn small" id="zin">+</button><button class="btn small" id="zout">−</button><button class="btn small" id="zreset">Reset view</button><button class="btn small" id="clr">Clear selection</button><span class="legend-box" id="tl"></span></div>
  <div class="tierwrap"><svg id="net" role="img" aria-label="Supply chain tier network. Use Tab to move between nodes and Enter to select."></svg>
  <aside class="card sidepanel" id="side" aria-live="polite"><h3>Select a node</h3><p>Pick any box to see its role, evidence and sources.</p></aside></div>`;
  d3=(await Promise.all([loadScript('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'),0]))&&window.d3;
  [ents,rels]=await Promise.all([getJSON('entities.json'),getJSON('relationships.json')]);
  ents.forEach(e=>byId[e.id]=e);
  root.querySelector('#tl').innerHTML=TIERS.map((t,i)=>`<span style="margin-right:12px"><b>${i+1}</b> ${t}</span>`).join('')+'<span><b>★</b> Claims</span>';
  draw();
  root.querySelector('#zin').onclick=()=>svg.transition().call(zoom.scaleBy,1.4);
  root.querySelector('#zout').onclick=()=>svg.transition().call(zoom.scaleBy,1/1.4);
  root.querySelector('#zreset').onclick=()=>svg.transition().call(zoom.transform,d3.zoomIdentity);
  root.querySelector('#clr').onclick=()=>select(null);
  new ResizeObserver(()=>{ const w=root.querySelector('#net').clientWidth; if(w&&Math.abs(w-W)>40&&!root.hidden){ draw(); } }).observe(root.querySelector('#net'));
}
function draw(){
  svg=d3.select(root.querySelector('#net')); svg.selectAll('*').remove();
  W=root.querySelector('#net').clientWidth||900; H=root.querySelector('#net').clientHeight||640;
  const claimX=W-105, avail=claimX-120;
  const per={}; ents.forEach(e=>per[e.tier]=(per[e.tier]||0)+1); const idx={};
  nodes=ents.map(e=>{ const i=idx[e.tier]=(idx[e.tier]||0), n=per[e.tier]; idx[e.tier]++; const step=avail/n;
    return {...e,tw:Math.min(158,step-10),x:e.tier===5?claimX:20+step*(i+.5)+ (e.tier===5?0:0),y:e.tier===5?rowY(1+i):rowY(e.tier)}; });
  const nb={}; nodes.forEach(n=>nb[n.id]=n);
  links=rels.filter(r=>nb[r.from]&&nb[r.to]).map(r=>({...r,source:nb[r.from],target:nb[r.to]}));
  zoom=d3.zoom().scaleExtent([.4,3]).on('zoom',e=>g.attr('transform',e.transform));
  svg.call(zoom).on('dblclick.zoom',null);
  g=svg.append('g');
  const band=g.append('g').attr('class','band');
  TIERS.forEach((t,i)=>{ band.append('line').attr('x1',0).attr('x2',W).attr('y1',rowY(i)-24).attr('y2',rowY(i)-24); band.append('text').attr('x',8).attr('y',rowY(i)-30).text(`${i+1}. ${t}`); });
  band.append('text').attr('x',claimX-70).attr('y',rowY(0)-30).text('★ Claims & certifications');
  svg.append('defs').append('marker').attr('id','arr').attr('viewBox','0 0 10 10').attr('refX',9).attr('refY',5).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto').append('path').attr('d','M0,0L10,5L0,10z').attr('fill','currentColor');
  linkSel=g.append('g').selectAll('path').data(links).join('path').attr('class',d=>'net-link '+(d.type==='claim'?'claim':'')).attr('stroke-width',d=>d.type==='supply'?1.5+d.weight*.4:1.5)
    .attr('data-tip',d=>`${byId[d.from].name} → ${byId[d.to].name} (${d.type}, ${d.confidence}). ${d.note}`);
  nodeSel=g.append('g').selectAll('g').data(nodes).join('g').attr('class','net-node').attr('tabindex',0).attr('role','button')
    .attr('aria-label',d=>`${d.name}, ${d.confidence}, tier ${d.tier+1}`).attr('data-tip',d=>`${d.name} · ${d.confidence}`)
    .on('click',(e,d)=>{e.stopPropagation();select(d.id)}).on('keydown',(e,d)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();select(d.id)} });
  nodeSel.append('rect').attr('rx',8).attr('height',34).attr('y',-17).attr('width',d=>d.tw).attr('x',d=>-d.tw/2)
    .attr('stroke',d=>`var(--c-${d.confidence})`).attr('stroke-dasharray',d=>d.tier===5?'6 4':null);
  nodeSel.append('text').attr('text-anchor','middle').attr('y',4).text(d=>{const s=(d.tier===5?'★ ':'')+d.name,m=Math.floor(d.tw/5.5);return s.length>m?s.slice(0,m-1)+'…':s});
  nodeSel.call(d3.drag().on('drag',(e,d)=>{d.x=e.x;d.y=e.y;tick()}));
  svg.on('click',()=>select(null));
  tick();
  update(); if(sel) select(sel.id,true);
}
function tick(){
  nodeSel.attr('transform',d=>`translate(${d.x},${d.y})`);
  linkSel.attr('d',d=>{ const sx=d.source.x,sy=d.source.y,tx=d.target.x,ty=d.target.y,my=(sy+ty)/2; return `M${sx},${sy}C${sx},${my} ${tx},${my} ${tx},${ty}`; });
}
export function update(){
  if(!nodeSel)return;
  nodeSel.style('display',d=>confOn(d.confidence)?null:'none');
  linkSel.style('display',d=>confOn(d.confidence)&&confOn(d.source.confidence)&&confOn(d.target.confidence)?null:'none');
}
function walk(start,dir){
  const seen=new Set([start]),edges=new Set(),q=[start];
  while(q.length){ const x=q.shift(); rels.forEach(r=>{ const f=flowDir(r); if(!f)return; const [a,b]=f; const [from,to]=dir==='up'?[b,a]:[a,b]; if(from===x&&!seen.has(to)){seen.add(to);q.push(to)} if(from===x)edges.add(r.id); }); }
  return {seen,edges};
}
function select(id,keep){
  sel=id?byId[id]:null; const side=root.querySelector('#side');
  if(!sel){ nodeSel.classed('dim',false); linkSel.classed('dim',false).classed('hl',false); side.innerHTML='<h3>Select a node</h3><p>Pick any box to see its role, evidence and sources.</p>'; if(!keep&&location.hash.includes('node='))history.replaceState(null,'','#tiers'); return; }
  const up=walk(id,'up'),down=walk(id,'down'),on=new Set([...up.seen,...down.seen]),eon=new Set([...up.edges,...down.edges]);
  rels.forEach(r=>{ if(r.type==='claim'&&(r.from===id||r.to===id)){on.add(r.from);on.add(r.to);eon.add(r.id)} });
  nodeSel.classed('dim',d=>!on.has(d.id)); linkSel.classed('dim',d=>!eon.has(d.id)).classed('hl',d=>eon.has(d.id));
  const conn=rels.filter(r=>r.from===id||r.to===id);
  side.innerHTML=`<h3>${esc(sel.name)}</h3>${badge(sel.confidence)}
   <dl class="kv" style="margin:12px 0"><dt>Tier</dt><dd>${sel.tier===5?'Claim / certification':sel.tier+1+'. '+esc(TIERS[sel.tier])}</dd><dt>Country</dt><dd>${esc(sel.country)}</dd><dt>Role</dt><dd>${esc(sel.role)}</dd><dt>Evidence</dt><dd>${esc(sel.evidence)}</dd></dl>
   ${srcLinks(sel.sources)}
   <p><strong>Upstream:</strong> ${[...up.seen].filter(x=>x!==id).map(x=>esc(byId[x].name)).join('; ')||'none'}</p>
   <p><strong>Downstream:</strong> ${[...down.seen].filter(x=>x!==id).map(x=>esc(byId[x].name)).join('; ')||'none'}</p>
   <details><summary>Connections (${conn.length})</summary><ul>${conn.map(r=>`<li>${esc(byId[r.from].name)} → ${esc(byId[r.to].name)} <small>(${r.type})</small> ${badge(r.confidence)}<br><small>${esc(r.note)}</small></li>`).join('')}</ul></details>
   ${sel.lat!=null?`<p><a class="btn small" href="#map?focus=${esc(sel.id)}">Show on map</a></p>`:''}`;
}
export function show(p){ if(p.node&&byId[p.node]&&nodeSel) select(p.node,true); }
export function theme(){}
