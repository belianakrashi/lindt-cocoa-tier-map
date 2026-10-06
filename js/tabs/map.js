import {getJSON,loadScript,loadCSS,esc,badge,srcLinks,confOn,isDark} from '../core.js';
const LV='https://unpkg.com/leaflet@1.9.4/dist/';
let L,map,geo,ents,tiles,layers={},items=[],byId={},root,journeyTimer,pulse,raf;

const centroid = poly => [poly.reduce((a,p)=>a+p[0],0)/poly.length, poly.reduce((a,p)=>a+p[1],0)/poly.length];
// quadratic Bezier arc: control point offset perpendicular to the straight line
function arc(a,b,n=40){
  const dy=b[0]-a[0], dx=b[1]-a[1], k=.25;
  const c=[(a[0]+b[0])/2+dx*k,(a[1]+b[1])/2-dy*k], pts=[];
  for(let i=0;i<=n;i++){const t=i/n,u=1-t; pts.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]])}
  return pts;
}
function popup(o,extra=''){ return `<div style="min-width:200px"><strong>${esc(o.name||o.label)}</strong><br>${badge(o.confidence)}<p style="margin:.5em 0">${esc(o.desc||o.role||o.risk||'')}</p>${extra}${srcLinks(o.sources)}</div>`; }
const icon=cls=>L.divIcon({className:'',html:`<div class="mk ${cls}"></div>`,iconSize:[16,16],iconAnchor:[8,8]});
function point(id){ const o=byId[id]; if(!o) return null; return o.polygon?centroid(o.polygon):[o.lat,o.lng]; }
function setTiles(){
  tiles?.forEach(l=>map.removeLayer(l));
  const b=geo.basemap; tiles=b[isDark()?'dark':'light'].map((u,i)=>L.tileLayer(u,{attribution:i?'':b.attribution,maxZoom:b.maxZoom,pane:i?'shadowPane':'tilePane'}).addTo(map));
}

export async function mount(el){
  root=el;
  el.innerHTML=`<h1>Supply chain map</h1>
  <p class="note">Region shapes are approximate illustrations. Flow thickness is an <strong>illustrative</strong> weight until shipment or trade data is added; no flow shows a verified Lindt shipment. Sector-level risk only.</p>
  <div class="maptools" id="lt" role="group" aria-label="Map layers"></div>
  <div class="maplayout"><div id="map" role="application" aria-label="Interactive supply chain map"></div><div class="journey" id="jc" hidden aria-live="polite"></div></div>
  <p class="legend-box">Legend: blue square = port · orange circle = US factory · brown diamond = Group HQ · green = farming areas · purple diamond = processing context · moving dashed lines = flows. Red shading = sector-level child-labor risk (NORC); regional prevalence values are not loaded yet.</p>`;
  loadCSS(LV+'leaflet.css');
  const d=await Promise.all([getJSON('geo.json'),getJSON('entities.json'),loadScript(LV+'leaflet.js')]);
  geo=d[0]; ents=d[1]; L=window.L;
  map=L.map('map',{worldCopyJump:true,minZoom:2}).setView([20,-35],3);
  setTiles();
  ['regions','ports','processing'].forEach(k=>geo[k].forEach(o=>byId[o.id]=o));
  ents.forEach(e=>{ if(e.lat!=null) byId[e.id]=e; });
  build(); toggles(); setTimeout(()=>{map.invalidateSize();map.fitBounds([[-2,-125],[50,12]],{padding:[10,10]})},60);
}
function build(){
  layers={risk:L.layerGroup(),farms:L.layerGroup(),ports:L.layerGroup(),proc:L.layerGroup(),fac:L.layerGroup(),flows:L.layerGroup()};
  const reg=(layer,obj,m)=>{ layer.addLayer(m); items.push({layer,m,obj}); };
  geo.regions.forEach(r=>{
    reg(layers.risk,r,L.polygon(r.polygon,{stroke:false,fillColor:'#d6322b',fillOpacity:.3}).bindTooltip(r.name+' · sector-level risk').bindPopup(popup(r,r.norc_prevalence!=null?`<p>NORC prevalence: ${r.norc_prevalence}%</p>`:'<p><em>Regional NORC prevalence not loaded; shading is sector-level.</em></p>')));
    reg(layers.farms,r,L.polygon(r.polygon,{color:'#176b3f',weight:2,fillColor:'#2ea36b',fillOpacity:.2}).bindTooltip(r.name+' (cocoa belt, approximate)').bindPopup(popup({...r,risk:'Approximate cocoa-growing belt.'})));
  });
  ents.filter(e=>e.kind==='farm').forEach(e=>reg(layers.farms,e,L.marker([e.lat,e.lng],{icon:icon('farm'),title:e.name}).bindTooltip(e.name).bindPopup(popup(e))));
  geo.ports.forEach(p=>reg(layers.ports,p,L.marker([p.lat,p.lng],{icon:icon('port'),title:p.name}).bindTooltip(p.name).bindPopup(popup(p))));
  geo.processing.forEach(p=>reg(layers.proc,p,L.marker([p.lat,p.lng],{icon:icon('processing'),title:p.name}).bindTooltip(p.name).bindPopup(popup(p))));
  ents.filter(e=>e.kind==='factory').forEach(e=>reg(layers.fac,e,L.marker([e.lat,e.lng],{icon:icon('factory'),title:e.name}).bindTooltip(e.name).bindPopup(popup(e,`<p><a href="#tiers?node=${esc(e.id)}">Open in Tier Explorer</a></p>`))));
  const hq=ents.find(e=>e.id==='lindt-group'); reg(layers.fac,hq,L.marker([hq.lat,hq.lng],{icon:icon('hq'),title:hq.name}).bindTooltip('Lindt & Sprüngli Group HQ').bindPopup(popup(hq)));
  geo.flows.forEach(f=>{
    const a=point(f.from),b=point(f.to); if(!a||!b)return;
    const col=f.stage==='farm→port'?'#2ea36b':f.stage==='port→processor'?'#7a5bb5':'#d9822b';
    reg(layers.flows,f,L.polyline(arc(a,b),{color:col,weight:1+f.weight*1.2,opacity:.8,className:'flow',lineCap:'round'}).bindTooltip(`${f.label} · weight ${f.weight}/5 (illustrative)`,{sticky:true}).bindPopup(popup({...f,name:f.stage,desc:f.label+'. Thickness = illustrative weight '+f.weight+'/5; not shipment data.'})));
  });
  ['risk','farms','ports','proc','fac','flows'].forEach(k=>layers[k].addTo(map));
  update();
}
const LAYER_NAMES=[['farms','Farms / growing areas'],['ports','Ports'],['proc','Processing (context)'],['fac','US factories & HQ'],['flows','Flows'],['risk','Risk heat']];
function toggles(){
  const t=root.querySelector('#lt');
  t.innerHTML=LAYER_NAMES.map(([k,n])=>`<label><input type="checkbox" data-l="${k}" checked> ${n}</label>`).join('')+`<button class="btn small primary" id="play">▶ Play the journey</button><button class="btn small" id="stop" hidden>■ Stop</button>`;
  t.onchange=e=>{ const k=e.target.dataset.l; if(!k)return; e.target.checked?layers[k].addTo(map):map.removeLayer(layers[k]); };
  t.querySelector('#play').onclick=play; t.querySelector('#stop').onclick=stop;
}
export function update(){ if(!map)return; items.forEach(({layer,obj,m})=>{ const on=confOn(obj.confidence); if(on&&!layer.hasLayer(m))layer.addLayer(m); if(!on&&layer.hasLayer(m))layer.removeLayer(m); }); }
export function theme(){ if(tiles) setTiles(); }
export function show(p){
  if(!map)return;
  setTimeout(()=>{ map.invalidateSize(); if(p.focus){ const pt=point(p.focus); if(pt){ map.flyTo(pt,byId[p.focus].polygon?6:8); items.find(i=>i.obj===byId[p.focus]&&i.layer!==layers.risk)?.m.openPopup?.(); } } },80);
}
let trail;
function stop(){
  clearTimeout(journeyTimer); cancelAnimationFrame(raf);
  if(pulse){map.removeLayer(pulse);pulse=null} if(trail){layers.flows.removeLayer(trail);trail=null}
  root.querySelector('#jc').hidden=true; root.querySelector('#stop').hidden=true; root.querySelector('#play').hidden=false;
}
function play(){
  stop(); const ids=geo.journey, jc=root.querySelector('#jc'); jc.hidden=false; root.querySelector('#stop').hidden=false; root.querySelector('#play').hidden=true;
  const labels=['Farms: cocoa is grown by smallholder households. Sector-level child-labor risk is documented here (NORC).','Port: beans or butter leave through a national port (Tema shown as an example).','Processing: grinding into liquor, butter and powder. Where Lindt’s cocoa is processed is not confirmed.','US factory: chocolate is made and shipped to US retail. Illustrative route, not a traced Lindt shipment.'];
  pulse=L.marker(point(ids[0]),{icon:L.divIcon({className:'',html:'<div class="mk pulse"></div>',iconSize:[20,20],iconAnchor:[10,10]}),zIndexOffset:1000}).addTo(map);
  let i=0;
  const next=()=>{
    jc.innerHTML=`<strong>Step ${i+1} of ${ids.length}: ${esc(byId[ids[i]].name)}</strong><br>${esc(labels[i]||'')}<br><small>Illustrative path of one bar of chocolate.</small>`;
    if(i>=ids.length-1){ journeyTimer=setTimeout(stop,6000); return; }
    const a=point(ids[i]),b=point(ids[i+1]),path=arc(a,b,60);
    map.fitBounds([a,b],{padding:[80,80],maxZoom:6,animate:true,duration:1});
    journeyTimer=setTimeout(()=>{
      if(trail)layers.flows.removeLayer(trail); trail=L.polyline(path,{color:'#ffd23f',weight:4,dashArray:'2 8'}).addTo(layers.flows);
      const t0=performance.now(),dur=2600;
      const step=t=>{ const p=Math.min(1,(t-t0)/dur); pulse.setLatLng(path[Math.round(p*(path.length-1))]); if(p<1)raf=requestAnimationFrame(step); else{ i++; journeyTimer=setTimeout(next,900);} };
      raf=requestAnimationFrame(step);
    },1200);
  };
  next();
}
