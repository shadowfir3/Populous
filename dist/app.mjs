import {generateWorld,SIZE,BIOMES} from './world.mjs';
import {Simulation,SPECIES} from './simulation.mjs';
import {mark,icon,animalArt} from './art.mjs';
import {drawTerrain,drawLabels,drawAnimals,drawGraph,sparkline} from './render.mjs';
const $=id=>document.getElementById(id);
const number=new Intl.NumberFormat();
const metaKey='populous.session.v1',snapshotKey='populous.checkpoint.v1';
const defaults=()=>({paused:false,speed:1,life:true,terrain:true,labels:true,visible:Array(7).fill(true),series:Array(7).fill(true),view:'atlas',scale:1,fit:true});
let world,sim,settings=defaults(),timer=null,graphEnd=null,checkpointJob=null,building=false;
const newSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const waitFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function status(text){$('saveStatus').lastElementChild.textContent=text;}
function saveMeta(){
  if(!sim || building)return;
  try{
    localStorage.setItem(metaKey,JSON.stringify({version:1,seed:world.seed,tick:sim.tick,settings}));
    status('Saved locally');
  }catch{status('Storage unavailable');}
}
function toBase64(bytes){
  let encoded='';for(let i=0;i<bytes.length;i+=16384)encoded+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(encoded);
}
async function checkpoint(){
  if(!sim||building||checkpointJob)return;
  const source=sim;checkpointJob=source;
  try{
    const value=JSON.stringify(source.save());
    let data=value,format='json';
    if(typeof CompressionStream!=='undefined'){
      const stream=new Blob([value]).stream().pipeThrough(new CompressionStream('gzip'));
      data=toBase64(new Uint8Array(await new Response(stream).arrayBuffer()));format='gzip';
    }
    if(sim===source && !building)localStorage.setItem(snapshotKey,JSON.stringify({seed:world.seed,format,data}));
  }catch{/* The seed and tick remain a deterministic recovery point when a checkpoint exceeds quota. */}
  finally{checkpointJob=null;}
}
async function restoreSnapshot(meta){
  const record=read(snapshotKey);if(!record || record.seed!==meta.seed)return null;
  try{
    let raw=record.data;
    if(record.format==='gzip'){
      const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
      raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    }
    const saved=JSON.parse(raw);
    return saved.tick<=meta.tick&&Array.isArray(saved.animals)?saved:null;
  }catch{return null;}
}
function initializeUI(){
  $('mark').innerHTML=mark;
  for(const el of document.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);
  for(const [group,indices,glyph] of [['Terrestrial',[0,1,2,3],'land'],['Aquatic',[4,5,6],'water']]){
    const h=document.createElement('div');h.className='grouptitle';h.innerHTML='<i>'+icon(glyph)+'</i>'+group;$('groups').append(h);
    for(const s of indices){
      const spec=SPECIES[s],button=document.createElement('button');button.className='speciesrow';button.dataset.species=s;
      button.setAttribute('aria-label','Show '+spec.name.toLowerCase());button.setAttribute('aria-pressed','true');
      button.innerHTML='<span class="specimenbox">'+animalArt(s,spec.color)+'</span><span class="spname">'+spec.name+'</span><span class="amount" id="count'+s+'">0</span><span class="toggle"></span>';
      button.onclick=()=>{settings.visible[s]=!settings.visible[s];refresh();saveMeta();};$('groups').append(button);
    }
  }
  $('biomes').innerHTML=BIOMES.map(b=>'<span class="biomeitem"><span class="swatch" style="--color:'+b.color+'"></span>'+b.name+'</span>').join('');
  for(let s=0;s<7;s++){
    const spec=SPECIES[s],b=document.createElement('button');b.className='series';b.dataset.series=s;
    b.innerHTML='<span style="background:'+spec.color+'"></span>'+spec.name;
    b.onclick=()=>{settings.series[s]=!settings.series[s];refresh();saveMeta();};$('graphLegend').append(b);
  }
}
function setView(view){
  settings.view=view;const graph=view==='graph';
  $('dashboard').classList.toggle('graphmode',graph);$('graphView').hidden=!graph;
  $('pageTitle').textContent=graph?'Population graph':'World atlas';$('pageTitle').classList.toggle('long',graph);
  document.title='Populous — '+$('pageTitle').textContent;
  for(const [id,active] of [['atlasTab',!graph],['graphTab',graph]]){
    $(id).classList.toggle('nav-active',active);
    if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');
  }
  closeLayers();refresh();saveMeta();
}
function renderGraph(){
  if(!sim||settings.view!=='graph')return;
  const bounds=drawGraph($('graph'),sim,settings,settings.scale,graphEnd,settings.fit);
  if(!bounds)return;
  $('timeline').max=sim.tick;$('timeline').min=Math.min(bounds.span,sim.tick);$('timeline').value=bounds.end;
  $('timeline').disabled=bounds.span>=sim.tick;$('zoomIn').disabled=!settings.fit&&settings.scale<=1;
  for(const b of $('graphLegend').children)b.setAttribute('aria-pressed',settings.series[+b.dataset.series]);
}
function refresh(){
  if(!sim)return;
  $('tick').textContent='Tick '+number.format(sim.tick);$('total').textContent=number.format(sim.animals.length);
  const extinct=sim.animals.length===0,paused=settings.paused||extinct;
  $('pause').innerHTML=icon(paused?'play':'pause')+(paused?'Resume':'Pause');$('pause').disabled=extinct;
  $('live').classList.toggle('idle',paused);$('live').lastElementChild.textContent=extinct?'Extinct':paused?'Paused':'Running';
  for(const b of document.querySelectorAll('[data-speed]')){const selected=+b.dataset.speed===settings.speed;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);}
  $('master').setAttribute('aria-pressed',settings.life);
  for(const [id,key] of [['terrainCheck','terrain'],['labelCheck','labels'],['lifeCheck','life']])$(id).checked=settings[key];
  for(const b of document.querySelectorAll('[data-species]')){
    const s=+b.dataset.species;$('count'+s).textContent=number.format(sim.counts[s]);b.setAttribute('aria-pressed',settings.visible[s]);
  }
  if(settings.view==='atlas'){
    $('terrain').hidden=!settings.terrain;$('labels').hidden=!settings.labels;
    drawAnimals($('dots'),sim,settings);sparkline($('spark'),sim.history,sim.tick);
  }else renderGraph();
}
function stopTimer(){clearTimeout(timer);timer=null;}
function schedule(){
  stopTimer();
  if(!sim || building || settings.paused || !sim.animals.length || $('resetDialog').open || document.hidden)return;
  timer=setTimeout(()=>{
    sim.step();refresh();saveMeta();if(sim.tick%48===0 || !sim.animals.length)void checkpoint();schedule();
  },680/settings.speed);
}
async function start(seed,meta){
  building=true;stopTimer();$('dashboard').inert=true;$('graphView').inert=true;
  $('loading').textContent=meta?'Restoring world…':'Generating terrain…';$('loading').hidden=false;
  await waitFrame();
  world=generateWorld(seed);
  const saved=meta?await restoreSnapshot(meta):null;
  const width=Math.max(2048,Math.ceil(innerWidth));
  try{sim=new Simulation(world,saved,width);}catch{sim=new Simulation(world,null,width);}
  if(meta){
    while(sim.tick<meta.tick&&sim.animals.length){
      const limit=performance.now()+35;
      do{sim.step();}while(sim.tick<meta.tick&&sim.animals.length&&performance.now()<limit);
      if(sim.tick<meta.tick)await waitFrame();
    }
  }
  drawTerrain($('terrain'),world);drawLabels($('labels'),world);
  $('seed').textContent='World seed · '+seed.toString(16).toUpperCase().padStart(8,'0');
  $('loading').hidden=true;$('dashboard').inert=false;$('graphView').inert=false;
  building=false;graphEnd=null;setView(settings.view);schedule();void checkpoint();
}
function closeLayers(){$('layerMenu').hidden=true;$('layersButton').setAttribute('aria-expanded','false');}
$('layersButton').onclick=()=>{const menu=$('layerMenu');menu.hidden=!menu.hidden;$('layersButton').setAttribute('aria-expanded',!menu.hidden);};
document.addEventListener('click',e=>{if(!e.target.closest('#layersButton,#layerMenu'))closeLayers();});
for(const [id,key] of [['terrainCheck','terrain'],['lifeCheck','life'],['labelCheck','labels']]){
  $(id).onchange=()=>{settings[key]=$(id).checked;refresh();saveMeta();};
}
$('master').onclick=()=>{settings.life=!settings.life;refresh();saveMeta();};
$('pause').onclick=()=>{settings.paused=!settings.paused;refresh();saveMeta();schedule();if(settings.paused)void checkpoint();};
for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>{settings.speed=+b.dataset.speed;refresh();saveMeta();schedule();};
$('atlasTab').onclick=()=>{if(!building)setView('atlas');};$('graphTab').onclick=()=>{if(!building)setView('graph');};
$('newWorld').onclick=()=>{if(building)return;stopTimer();$('resetDialog').showModal();};
$('cancelReset').onclick=()=>$('resetDialog').close();
$('resetDialog').addEventListener('close',schedule);
$('confirmReset').onclick=()=>{
  $('resetDialog').close();settings=defaults();setView('atlas');void start(newSeed(),null);
};
function zoom(factor){
  const width=Math.max(1,$('graph').clientWidth-86);
  const current=settings.fit?sim.tick/width:settings.scale;
  settings.scale=Math.min(4**16,Math.max(1,current*factor));settings.fit=false;renderGraph();saveMeta();
}
$('zoomIn').onclick=()=>zoom(.5);$('zoomOut').onclick=()=>zoom(2);
$('fit').onclick=()=>{settings.fit=true;graphEnd=null;renderGraph();saveMeta();};
$('timeline').oninput=()=>{graphEnd=+$('timeline').value>=sim.tick?null:+$('timeline').value;renderGraph();};
const map=$('mapcard');
function expanded(){return document.fullscreenElement===map||map.classList.contains('expanded');}
function expandLabel(){const label=expanded()?'Exit expanded map':'Expand map';$('expand').title=label;$('expand').setAttribute('aria-label',label);}
$('expand').onclick=async()=>{
  try{
    if(document.fullscreenElement) await document.exitFullscreen();
    else if(map.classList.contains('expanded'))map.classList.remove('expanded');
    else if(map.requestFullscreen)await map.requestFullscreen();
    else map.classList.add('expanded');
  }catch{map.classList.toggle('expanded');}
  expandLabel();
};
document.addEventListener('fullscreenchange',expandLabel);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLayers();map.classList.remove('expanded');expandLabel();$('inspect').hidden=true;}});
function inspect(e){
  if(!sim||building)return;
  const box=$('canvaswrap').getBoundingClientRect(),px=e.clientX-box.left,py=e.clientY-box.top;
  const x=Math.max(0,Math.min(SIZE-1,Math.floor(px/box.width*SIZE))),y=Math.max(0,Math.min(SIZE-1,Math.floor(py/box.height*SIZE))),p=y*SIZE+x;
  const pop=$('inspect');pop.innerHTML='<b>'+BIOMES[world.terrain[p]].name+'</b>'+x+', '+y+' · '+world.temperature[p]+' °C avg.<br>Fertility '+sim.fertility(p)+' / '+world.capacity[p];
  pop.hidden=false;pop.style.left=Math.max(3,Math.min(px+13,box.width-pop.offsetWidth-4))+'px';
  pop.style.top=Math.max(3,Math.min(py+13,box.height-pop.offsetHeight-4))+'px';
}
$('canvaswrap').onpointermove=inspect;$('canvaswrap').onpointerleave=()=>$('inspect').hidden=true;$('canvaswrap').onpointerdown=inspect;
document.addEventListener('visibilitychange',()=>{saveMeta();if(document.hidden)void checkpoint();schedule();});
window.addEventListener('pagehide',saveMeta);
window.addEventListener('resize',()=>{if(sim)sim.history.width=Math.max(sim.history.width,Math.ceil(innerWidth));renderGraph();});
initializeUI();
const meta=read(metaKey);
if(meta?.version===1&&Number.isInteger(meta.seed)&&Number.isSafeInteger(meta.tick)&&meta.tick>=0){
  settings={...defaults(),...meta.settings};void start(meta.seed,meta);
}else void start(newSeed(),null);
