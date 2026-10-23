'use strict';

const SPECIMENS = [
  ['all','Botanical mix','A meadow of possibilities'],
  ['primrose','Crimson primrose','Primula vulgaris'],
  ['anemone','Ivory anemone','Anemone coronaria'],
  ['wildrose','Blush hibiscus','Hibiscus rosa-sinensis'],
  ['hydrangea','Blush hydrangea','Hydrangea macrophylla'],
  ['morningglory','Morning glory','Ipomoea purpurea'],
  ['chamomile','Field chamomile','Matricaria chamomilla'],
  ['rose','Cabbage rose','Rosa centifolia'],
  ['jasmine','White jasmine','Jasminum officinale'],
  ['lily','Speckled lily','Lilium lancifolium'],
  ['poppy','Crimson poppy','Papaver rhoeas'],
  ['foxglove','Rose foxglove','Digitalis purpurea'],
  ['peony','Blush peony','Paeonia lactiflora'],
  ['sunflower','Golden sunflower','Helianthus annuus'],
  ['urn','Classical urn','An arrangement in stone']
];
const STORAGE_KEY = 'garden-party.herbarium.v2';
const $ = id => document.getElementById(id);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const copy = value => JSON.parse(JSON.stringify(value));
const specimenName = key => SPECIMENS.find(s => s[0] === key)?.[1] || 'Botanical specimen';
const defaults = () => ({version:2, name:'My Botanical Garden', theme:'royal', variety:'all', musicTrack:'meadow', musicVolume:.28, soundEnabled:true, plantVolume:.2, growFromSeeds:true, motionEnabled:!matchMedia('(prefers-reduced-motion: reduce)').matches, living:false, plants:[]});
let state = defaults();
let storageWorks = true;
let firstVisit = true;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.version === 2 && Array.isArray(saved.plants)) {
      firstVisit = false;
      state.name = typeof saved.name === 'string' ? saved.name.slice(0,70) : state.name;
      state.theme = ['royal','night','sunset','pastel','herbarium'].includes(saved.theme) ? saved.theme : 'royal';
      state.variety = SPECIMENS.some(s=>s[0]===saved.variety) ? saved.variety : 'all';
      state.musicTrack = ['meadow','moonlight','clouds'].includes(saved.musicTrack) ? saved.musicTrack : 'meadow';
      if(Number.isFinite(saved.musicVolume))state.musicVolume=clamp(saved.musicVolume,0,1);
      if(Number.isFinite(saved.plantVolume))state.plantVolume=clamp(saved.plantVolume,0,1);
      for (const key of ['soundEnabled','motionEnabled','living','growFromSeeds']) if (typeof saved[key]==='boolean') state[key]=saved[key];
      const ids = new Set();
      state.plants = saved.plants.filter(p => p && typeof p.id==='string' && !ids.has(p.id) && ids.add(p.id) && botanicalBuilders[p.variety] && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.seed) && (!p.expiresAt || p.expiresAt>Date.now())).map(p=>{
        const growing=state.growFromSeeds&&p.variety!=='urn'&&Number.isFinite(p.plantedAt)&&Number.isFinite(p.maturesAt)&&p.plantedAt<=Date.now()&&p.maturesAt>Date.now()&&p.maturesAt-p.plantedAt>0&&p.maturesAt-p.plantedAt<=12000;
        return {id:p.id,variety:p.variety,seed:p.seed>>>0,x:clamp(p.x,.01,.99),y:clamp(p.y,.025,.985),size:clamp(Number(p.size)||1,.65,1.5),tilt:clamp(Number(p.tilt)||0,-35,35),expiresAt:state.living&&Number.isFinite(p.expiresAt)?p.expiresAt:null,plantedAt:growing?p.plantedAt:null,maturesAt:growing?p.maturesAt:null};
      });    }
  }
} catch { storageWorks = false; }
const gardenBed = $('garden-bed');
const surface = $('interaction-surface');
const elements = new Map();
const history = [];
const growingPlants = new Map();
const plantGrowthAnatomy = new WeakMap();
let growthFrame = null;
let lastGrowthUpdate = 0;
const GROWTH_DURATION = 8000;
let selectedId = null;
let tool = 'plant';
let pointer = null;
let saveTimer;
let toastTimer;
let nextId = Date.now();
let keyboardPoint = {x:.5,y:.6};

function toast(message) {
  $('gardenToast').textContent = message;
  $('gardenToast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$('gardenToast').classList.remove('visible'), 2700);
}
function saveGarden() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageWorks = true;
    $('saveStatus').textContent = 'Saved on this device';
  } catch {
    storageWorks = false;
    $('saveStatus').textContent = 'Saving unavailable';
  }
}
function changed() { updateCount(); clearTimeout(saveTimer); saveTimer=setTimeout(saveGarden,180); }
function updateCount() { $('specimenCount').textContent=state.plants.length; $('undoButton').disabled=history.length===0; }
function remember(snapshot = state.plants) {
  history.push({plants:copy(snapshot),living:state.living});
  if(history.length>35) history.shift();
  updateCount();
}
function undo() {
  if(!history.length) return;
  const previous=history.pop();
  state.plants=previous.plants.filter(p=>!p.expiresAt||p.expiresAt>Date.now());
  state.living=previous.living; $('lifeSelect').value=state.living?'living':'permanent';
  selectPlant(null); renderGarden(); changed(); toast('The last change has been undone.');
}
function rootPosition(p) { return {x:p.x*innerWidth,y:innerHeight*(.38+p.y*.62)}; }
function plantScale(p) { return (.4+Math.pow(p.y,1.15)*.98)*p.size*Math.min(1,innerWidth/560,innerHeight/700); }
function positionPlant(p) {
  const el=elements.get(p.id); if(!el) return;
  const pos=rootPosition(p);
  el.style.left=`${pos.x}px`; el.style.top=`${pos.y}px`;
  el.style.zIndex=Math.round(pos.y);
  el.style.setProperty('--handle-scale',1/plantScale(p));
  el.style.transform=`scale(${plantScale(p)}) rotate(${p.tilt}deg)`;
}
function renderPlant(p) {
  const el=document.createElement('div');
  el.className='botanical-plant'; el.dataset.id=p.id;
  el.setAttribute('role','button'); el.setAttribute('aria-label',`${specimenName(p.variety)}. Select to move or edit.`);
  el.setAttribute('aria-pressed','false');
  el.tabIndex=tool==='edit'?0:-1;
  el.innerHTML=`<div class="ground-shadow" style="width:90px"></div><div class="specimen-wind"><div class="specimen-growth">${generateBotanicalSVG(p.variety,p.seed)}</div></div><div class="germination" aria-hidden="true" hidden><span class="seed-visual"><svg viewBox="0 0 30 22"><ellipse cx="15" cy="14" rx="11" ry="3" fill="#526044" opacity=".18"/><ellipse cx="15" cy="11" rx="5.5" ry="3.5" transform="rotate(-24 15 11)" fill="#aa8054" stroke="#715c3f" stroke-width=".8"/><path d="M12 12q3-1 6-3" fill="none" stroke="#e2c798" stroke-width=".8"/></svg></span></div><span class="plant-handle" aria-hidden="true"></span>`;
  el.style.setProperty('--sway-time',`${4.5+(p.seed%31)/10}s`);
  el.style.setProperty('--sway-delay',`${-(p.seed%40)/10}s`);
  gardenBed.appendChild(el); elements.set(p.id,el); positionPlant(p);
  if(state.growFromSeeds&&p.maturesAt&&p.maturesAt>Date.now()) {
    growingPlants.set(p.id,{plant:p,element:el});updatePlantGrowth(p,el);
    if(growthFrame===null)growthFrame=requestAnimationFrame(tickGrowth);
  } else finishGrowing(p,el);
}
function growthArrival(height) {
  const target=clamp(height,0,1);let low=0,high=1;
  for(let i=0;i<14;i++){const middle=(low+high)/2;if(growthEase(middle)<target)low=middle;else high=middle;}
  return .08+(low+high)/2*.54;
}
function growthStrokeFraction(part,targetY) {
  if(targetY>=part.samples[0].y)return 0;
  if(targetY<=part.top+.001)return 1;
  for(let i=1;i<part.samples.length;i++){
    const a=part.samples[i-1],b=part.samples[i];
    if(a.y>=targetY&&b.y<=targetY)return ((i-1)+clamp((a.y-targetY)/Math.max(.001,a.y-b.y),0,1))/(part.samples.length-1);
  }
  return 1;
}
function growthEase(value) {const t=clamp(value,0,1);return t*t*(3-2*t);}
function rememberGrowthAttributes(node) {
  const attributes={};
  for(const name of ['transform','opacity','stroke-dasharray','stroke-dashoffset'])attributes[name]=node.getAttribute(name);
  node.setAttribute('data-growth-base',JSON.stringify(attributes));
  return attributes;
}
function restoreGrowthSVG(svg) {
  if(!svg)return;
  svg.querySelectorAll('[data-growth-temporary]').forEach(node=>node.remove());
  svg.querySelectorAll('[data-growth-base]').forEach(node=>{
    const attributes=JSON.parse(node.getAttribute('data-growth-base'));
    for(const [name,value] of Object.entries(attributes)){if(value===null)node.removeAttribute(name);else node.setAttribute(name,value);}
    node.removeAttribute('data-growth-base');
  });
}
function matureBotanicalSVG(svg) {
  const clone=svg.cloneNode(true);restoreGrowthSVG(clone);return clone.outerHTML;
}
function pointInPlant(svg,node,point={x:0,y:0}) {
  const root=svg.getCTM(),local=node.getCTM();
  if(!root||!local)return null;
  const matrix=root.inverse().multiply(local);
  return {x:matrix.a*point.x+matrix.c*point.y+matrix.e,y:matrix.b*point.x+matrix.d*point.y+matrix.f};
}
function makeGrowthBud(svg,head) {
  const petal=head.querySelector('path[fill^="url("]');
  const fill=petal?.getAttribute('fill')||'#b995ae',stroke=petal?.getAttribute('stroke')||'#785c80';
  const box=head.getBBox(),width=clamp(box.width*.25,14,30),height=clamp(box.height*.46,23,37);
  const bud=document.createElementNS('http://www.w3.org/2000/svg','g');
  bud.setAttribute('data-growth-temporary','bud');bud.setAttribute('aria-hidden','true');bud.setAttribute('opacity','0');
  // The same closed-bud motif and inks used in the original botanical drawings.
  bud.innerHTML=`<g transform="scale(${width/24},${height/33})"><path d="M0,8 C-12,-2 -11,-19 -2,-25 C10,-22 13,-6 0,8 Z" fill="${fill}" stroke="${stroke}" stroke-width=".8"/><path d="M0,8 C-7,-1 -12,-5 -11,-12 L0,-2 7,-16 Q12,-2 0,8" fill="#77805b" stroke="#535a3c" stroke-width=".7"/><path d="M-2,-4 Q-6,-15 -2,-21 M3,-6 Q7,-14 2,-21" fill="none" stroke="${stroke}" stroke-width=".5"/></g>`;
  head.parentNode.insertBefore(bud,head.nextSibling);return bud;
}
function preparePlantGrowth(el) {
  const svg=el.querySelector('.specimen-growth').querySelector('svg');
  if(!svg||typeof svg.getCTM!=='function'||!svg.getCTM())return null;
  const stemPaths=[],ornaments=[];
  for(const path of svg.querySelectorAll('path')){
    if(path.closest('defs,.plant-leaf,.plant-flower-head'))continue;
    const fill=path.getAttribute('fill');
    if(path.getAttribute('stroke')&&(!fill||fill==='none')){
      const subpaths=path.getAttribute('d').trim().split(/(?=M)/).filter(Boolean);
      let parts=[path];
      if(subpaths.length>1){
        parts=subpaths.map(d=>{
          const piece=path.cloneNode(false);piece.setAttribute('d',d);piece.setAttribute('data-growth-temporary','stem');
          path.parentNode.insertBefore(piece,path);return piece;
        });
        rememberGrowthAttributes(path);path.setAttribute('opacity','0');
      }
      for(const node of parts){
        const length=node.getTotalLength();if(!length)continue;
        const matrix=svg.getCTM().inverse().multiply(node.getCTM());
        const samples=Array.from({length:25},(_,i)=>{
          const point=node.getPointAtLength(length*i/24);
          return {x:matrix.a*point.x+matrix.c*point.y+matrix.e,y:matrix.b*point.x+matrix.d*point.y+matrix.f};
        });
        stemPaths.push({node,length,samples,top:Math.min(...samples.map(point=>point.y))});
      }
    }else ornaments.push(path);
  }
  if(!stemPaths.length)return null;
  const rootY=275,span=Math.max(70,rootY-Math.min(...stemPaths.map(part=>part.top)));
  const height=y=>clamp((rootY-y)/span,0,1);
  const stems=stemPaths.map(part=>{
    const base=rememberGrowthAttributes(part.node);part.node.setAttribute('stroke-dasharray',`${part.length} ${part.length}`);
    return {...part,base};
  });
  const leaves=[...svg.querySelectorAll('.plant-leaf')].map((node,index)=>{
    const base=rememberGrowthAttributes(node),point=pointInPlant(svg,node);
    return {node,base,start:growthArrival(height(point.y))+.015,turn:index%2?-27:27};
  });
  const decorations=ornaments.map(node=>{
    const base=rememberGrowthAttributes(node),box=node.getBBox(),point=pointInPlant(svg,node,{x:box.x,y:box.y+box.height});
    return {node,base,start:growthArrival(height(point.y))};
  });
  const heads=[...svg.querySelectorAll('.plant-flower-head')].map(node=>{
    const point=pointInPlant(svg,node,{x:0,y:8}),arrival=growthArrival(height(point.y));
    const base=rememberGrowthAttributes(node),nativeBud=node.classList.contains('botanical-bud');
    const petals=nativeBud?[]:[...node.querySelectorAll('.botanical-petal')].map((petal,index,all)=>({node:petal,base:rememberGrowthAttributes(petal),delay:index/Math.max(1,all.length)*.2,turn:index%2?-17:17}));
    return {node,base,arrival,nativeBud,petals,bud:nativeBud?null:makeGrowthBud(svg,node),openAt:Math.min(.76,arrival+.1)};
  });
  return {svg,stems,span,leaves,decorations,heads};
}
function applyGrowthFrame(anatomy,progress,reduced) {
  const p=reduced?(progress<.1?0:progress<.48?.4:progress<.74?.73:1):progress;
  const targetY=275-growthEase((p-.08)/.54)*anatomy.span;
  for(const part of anatomy.stems){
    if(part.complete)continue;
    const amount=growthStrokeFraction(part,targetY);if(amount===part.lastAmount)continue;part.lastAmount=amount;part.complete=amount===1;
    part.node.setAttribute('stroke-dashoffset',String(part.length*(1-amount)));
    part.node.setAttribute('opacity',String(Number(part.base.opacity??1)*Math.min(1,amount*8)));
  }
  for(const part of anatomy.leaves){
    if(part.complete)continue;
    const amount=growthEase((p-part.start)/.18);if(amount===part.lastAmount)continue;part.lastAmount=amount;part.complete=amount===1;
    part.node.setAttribute('opacity',String(Number(part.base.opacity??1)*Math.min(1,amount*4)));
    part.node.setAttribute('transform',`${part.base.transform||''} rotate(${part.turn*(1-amount)}) scale(${.025+amount*.975},${.12+amount*.88})`);
  }
  for(const part of anatomy.decorations){
    if(part.complete)continue;const amount=growthEase((p-part.start)/.12);
    if(amount===part.lastAmount)continue;part.lastAmount=amount;part.complete=amount===1;
    part.node.setAttribute('opacity',String(Number(part.base.opacity??1)*amount));
  }
  for(const head of anatomy.heads){
    if(head.complete)continue;
    const budGrowth=growthEase((p-head.arrival)/.1);
    if(head.nativeBud){
      if(budGrowth===head.lastBudGrowth)continue;head.lastBudGrowth=budGrowth;head.complete=budGrowth===1;
      head.node.setAttribute('opacity',String(Number(head.base.opacity??1)*budGrowth));
      head.node.setAttribute('transform',`${head.base.transform||''} scale(${.2+budGrowth*.8})`);continue;
    }
    const opening=growthEase((p-head.openAt)/Math.max(.13,.99-head.openAt));
    if(budGrowth===head.lastBudGrowth&&opening===head.lastOpening)continue;
    head.lastBudGrowth=budGrowth;head.lastOpening=opening;head.complete=opening===1&&budGrowth===1;
    head.bud.setAttribute('opacity',String(budGrowth*(1-growthEase((opening-.25)/.5))));
    head.bud.setAttribute('transform',`scale(${.18+budGrowth*.82})`);
    head.node.setAttribute('opacity',String(Number(head.base.opacity??1)*growthEase(opening/.28)));
    head.node.setAttribute('transform',`${head.base.transform||''} scale(${.28+opening*.72},${.5+opening*.5})`);
    for(const petal of head.petals){
      const amount=growthEase((opening-petal.delay)/(1-petal.delay));
      if(amount===petal.lastAmount)continue;petal.lastAmount=amount;
      petal.node.setAttribute('transform',`${petal.base.transform||''} rotate(${petal.turn*(1-amount)}) scale(${.1+amount*.9},${.28+amount*.72})`);
    }
  }
}
function finishGrowing(p,el) {
  p.plantedAt=null;p.maturesAt=null;growingPlants.delete(p.id);
  const anatomy=plantGrowthAnatomy.get(el);if(anatomy)restoreGrowthSVG(anatomy.svg);plantGrowthAnatomy.delete(el);
  el.dataset.growth='mature';el.querySelector('.germination').hidden=true;
  const art=el.querySelector('.specimen-growth');art.style.opacity='';art.style.transform='';art.style.clipPath='';
  el.setAttribute('aria-label',`${specimenName(p.variety)}. Select to move or edit.`);
}
function updatePlantGrowth(p,el,now=Date.now()) {
  const progress=clamp((now-p.plantedAt)/(p.maturesAt-p.plantedAt),0,1);
  if(progress>=1){finishGrowing(p,el);return;}
  const stage=progress<.1?'seed':progress<.48?'sprout':progress<.74?'bud':'bloom';
  if(el.dataset.growth!==stage){
    el.dataset.growth=stage;
    const description={seed:'seed',sprout:'sprouting',bud:'forming buds',bloom:'blooming'}[stage];
    el.setAttribute('aria-label',`${specimenName(p.variety)}, ${description}. Select to move or edit.`);
  }
  let anatomy=plantGrowthAnatomy.get(el);
  if(!anatomy){anatomy=preparePlantGrowth(el);if(anatomy)plantGrowthAnatomy.set(el,anatomy);}
  const art=el.querySelector('.specimen-growth'),seed=el.querySelector('.seed-visual');
  el.querySelector('.germination').hidden=false;
  seed.style.opacity=String(1-growthEase((progress-(anatomy ? .1 : .7))/.1));
  art.style.transform='none';art.style.clipPath='none';
  if(anatomy){art.style.opacity='1';applyGrowthFrame(anatomy,progress,!state.motionEnabled||matchMedia('(prefers-reduced-motion: reduce)').matches);}
  else art.style.opacity=progress>=.8?'1':'0';
}
function tickGrowth() {
  growthFrame=null;const now=Date.now();let finished=false;
  if(now-lastGrowthUpdate<32){if(growingPlants.size)growthFrame=requestAnimationFrame(tickGrowth);return;}
  lastGrowthUpdate=now;
  for(const [id,{plant,element}] of growingPlants){
    if(elements.get(id)!==element){growingPlants.delete(id);continue;}
    updatePlantGrowth(plant,element,now);if(!plant.maturesAt)finished=true;
  }
  if(finished)changed();
  if(growingPlants.size)growthFrame=requestAnimationFrame(tickGrowth);
}

function renderGarden() {
  if(growthFrame!==null)cancelAnimationFrame(growthFrame);growthFrame=null;growingPlants.clear();
  elements.clear(); gardenBed.replaceChildren();
  state.plants.forEach(p=>renderPlant(p));
  updateCount();
}
function removeById(id, animate=true) {
  const el=elements.get(id);
  state.plants=state.plants.filter(p=>p.id!==id); elements.delete(id);growingPlants.delete(id);
  if(selectedId===id) selectPlant(null);
  if(el && animate && state.motionEnabled) {
    const effect=el.animate([{opacity:1},{opacity:0,translate:'0 -14px'}],{duration:550,fill:'forwards'});
    effect.onfinish=()=>el.remove();
  } else el?.remove();
  changed();
}
function removeSelected() {
  if(!selectedId) return;
  remember(); removeById(selectedId); toast('Specimen gathered. Undo brings it back.');
}
function normalizedPoint(x,y) { return {x:clamp(x/innerWidth,.01,.99),y:clamp((y/innerHeight-.38)/.62,.025,.985)}; }
function plantAt(x,y,quiet=false,playSound=true) {
  if(y<innerHeight*.38) { if(!quiet) spawnVisitor(x,y); return false; }
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const key=state.variety==='all' ? ['primrose','anemone','wildrose','hydrangea','morningglory','chamomile','rose','jasmine'][seed%8] : state.variety;
  const plantedAt=state.growFromSeeds&&key!=='urn'?Date.now():null;
  const p={id:`flower-${++nextId}`,variety:key,seed,plantedAt,maturesAt:plantedAt?plantedAt+GROWTH_DURATION:null,...normalizedPoint(x,y),size:1,tilt:(seed%11)-5,expiresAt:state.living?Date.now()+60000+seed%20000:null};
  state.plants.push(p); renderPlant(p); changed();
  if(!quiet) {
    if(state.soundEnabled&&playSound)GardenAudio.playPlant(p.variety);
    if(state.motionEnabled && seed%11===0) spawnVisitor(x,y-90);
  }
  return true;
}
function setTool(value) {
  tool=value; document.body.dataset.tool=tool;
  $('plantTool').classList.toggle('active',tool==='plant'); $('plantTool').setAttribute('aria-pressed',tool==='plant');
  $('editTool').classList.toggle('active',tool==='edit'); $('editTool').setAttribute('aria-pressed',tool==='edit');
  elements.forEach(el=>el.tabIndex=tool==='edit'?0:-1);
  if(tool==='plant') selectPlant(null);
  surface.setAttribute('aria-label',tool==='plant'?'Garden planting area':'Garden arranging area');
  updatePlantingHelp();
}
function updatePlantingHelp() {
  $('gardenHelp').textContent=tool==='edit'?'Tap a flower or its circle. Drag to move it.':state.growFromSeeds?'Tap to sow a seed. Drag to scatter seeds.':'Tap the meadow to plant. Drag to plant a trail.';
  $('catalogueIntro').textContent=state.growFromSeeds?'Choose a flower, then tap the meadow to sow its seeds.':'Choose a flower, then tap anywhere on the meadow to plant it.';
}
function selectPlant(id) {
  selectedId=id;
  elements.forEach((el,key)=>{el.classList.toggle('selected',key===id);el.setAttribute('aria-pressed',key===id);});
  const p=state.plants.find(p=>p.id===id);
  $('selectionTools').hidden=!p;
  if(p) { $('selectionName').textContent=specimenName(p.variety); $('plantSize').value=p.size; $('plantTilt').value=p.tilt; updateSelectionValues(); }
}
function updateSelectionValues() {
  const size=`${Math.round(Number($('plantSize').value)*100)}%`;
  const tilt=`${$('plantTilt').value}°`;
  $('sizeValue').textContent=size; $('tiltValue').textContent=tilt;
  $('plantSize').setAttribute('aria-valuetext',size); $('plantTilt').setAttribute('aria-valuetext',tilt);
}
function flowerAt(x,y) {
  // Keep small flowers easy to grab, including the space between their leaves.
  let nearest=null,score=Infinity;
  for(const p of state.plants) {
    const root=rootPosition(p),handleDistance=Math.hypot(x-root.x,y-root.y);
    const node=elements.get(p.id);if(node?.dataset.growth==='seed'&&handleDistance>24)continue;
    const r=node?.querySelector('.specimen-growth').getBoundingClientRect();
    if(!r) continue;
    if(handleDistance>24 && (x<r.left-12||x>r.right+12||y<r.top-12||y>r.bottom+12)) continue;
    const distance=handleDistance<=24 ? handleDistance/100-10 : Math.hypot((x-(r.left+r.width/2))/Math.max(44,r.width),(y-(r.top+r.height*.55))/Math.max(44,r.height));
    if(distance<score){score=distance;nearest=p;}
  }
  return nearest;
}
function pointerDown(e) {
  if(e.button!==0 || pointer) return;
  if(tool==='edit') {
    const p=flowerAt(e.clientX,e.clientY);
    selectPlant(p?.id||null);
    if(!p) return;
    pointer={mode:'move',id:e.pointerId,plantId:p.id,startX:e.clientX,startY:e.clientY,origin:rootPosition(p),snapshot:copy(state.plants),changed:false,target:surface};
    document.body.dataset.dragging='true';
  } else {
    if(e.clientY<innerHeight*.38) {spawnVisitor(e.clientX,e.clientY); return;}
    remember(); plantAt(e.clientX,e.clientY);
    pointer={mode:'paint',id:e.pointerId,x:e.clientX,y:e.clientY,target:surface};
  }
  surface.setPointerCapture(e.pointerId); e.preventDefault();
}
surface.addEventListener('pointerdown',pointerDown);
window.addEventListener('pointermove',e=>{
  if(!pointer || e.pointerId!==pointer.id) return;
  if(pointer.mode==='paint') {
    const depth=normalizedPoint(e.clientX,e.clientY).y;
    if(e.clientY>=innerHeight*.38 && Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>40+depth*35) {
      plantAt(e.clientX,e.clientY,false,false);pointer.x=e.clientX;pointer.y=e.clientY;
    }
  } else {
    const p=state.plants.find(p=>p.id===pointer.plantId); if(!p) return;
    if(!pointer.changed && Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)<3) return;
    if(!pointer.changed) {remember(pointer.snapshot);pointer.changed=true;}
    Object.assign(p,normalizedPoint(pointer.origin.x+e.clientX-pointer.startX,pointer.origin.y+e.clientY-pointer.startY));
    positionPlant(p); changed();
  }
});
function endPointer(e) {
  if(pointer && pointer.id===e.pointerId) {
    if(pointer.target.hasPointerCapture(e.pointerId)) pointer.target.releasePointerCapture(e.pointerId);
    pointer=null; delete document.body.dataset.dragging; saveGarden();
  }
}
window.addEventListener('pointerup',endPointer);window.addEventListener('pointercancel',endPointer);
gardenBed.addEventListener('keydown',e=>{
  if(tool!=='edit') return;
  const node=e.target.closest('.botanical-plant');if(!node)return;
  const p=state.plants.find(p=>p.id===node.dataset.id);if(!p)return;
  if(e.key==='Enter'||e.key===' ') {e.preventDefault();selectPlant(p.id);}
  if(e.key==='Delete'||e.key==='Backspace') {e.preventDefault();remember();removeById(p.id);}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(delta) {
    e.preventDefault();remember();selectPlant(p.id);const pos=rootPosition(p),step=e.shiftKey?20:7;
    Object.assign(p,normalizedPoint(pos.x+delta[0]*step,pos.y+delta[1]*step));positionPlant(p);changed();
  }
});
function updateKeyboardCursor() { const pos=rootPosition(keyboardPoint);$('keyboardCursor').style.left=`${pos.x}px`;$('keyboardCursor').style.top=`${pos.y}px`; }
surface.addEventListener('keydown',e=>{
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(delta) {e.preventDefault();const pos=rootPosition(keyboardPoint),step=e.shiftKey?40:15;keyboardPoint=normalizedPoint(pos.x+delta[0]*step,pos.y+delta[1]*step);updateKeyboardCursor();}
  if((e.key===' '||e.key==='Enter')&&tool==='plant') {e.preventDefault();remember();const pos=rootPosition(keyboardPoint);plantAt(pos.x,pos.y);}
});
window.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea') || $('gardenPanel').open) return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z') {e.preventDefault();undo();}
  else if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='p') setTool('plant');
  else if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='e') setTool('edit');
  else if(e.key==='Escape') finishSelection();
});
for(const [id,key] of [['plantSize','size'],['plantTilt','tilt']]) {
  const control=$(id);let snapshot=null;
  const start=()=>{if(!snapshot)snapshot=copy(state.plants);};
  control.addEventListener('pointerdown',start);control.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')||['Home','End','PageUp','PageDown'].includes(e.key))start();});
  control.addEventListener('input',()=>{const p=state.plants.find(p=>p.id===selectedId);if(!p)return;if(snapshot){remember(snapshot);snapshot=null;}p[key]=Number(control.value);updateSelectionValues();positionPlant(p);changed();});
  control.addEventListener('change',()=>snapshot=null);
}
$('removePlant').addEventListener('click',removeSelected);
function finishSelection() { const node=elements.get(selectedId); selectPlant(null); node?.focus({preventScroll:true}); }
$('selectionDone').addEventListener('click',finishSelection);
$('undoButton').addEventListener('click',undo);
$('plantTool').addEventListener('click',()=>setTool('plant'));
$('editTool').addEventListener('click',()=>setTool('edit'));

const panel=$('gardenPanel');
const panelTitles={flowers:'Choose your flowers',settings:'Garden settings',print:'Save your garden'};
let panelOpener=null;
function showPanel(view) {
  document.querySelectorAll('[data-panel]').forEach(tab=>{
    const active=tab.dataset.panel===view;
    tab.setAttribute('aria-selected',active);tab.tabIndex=active?0:-1;
    $(tab.getAttribute('aria-controls')).hidden=!active;
  });
  $('panelTitle').textContent=panelTitles[view];
  if(view==='print') $('printName').value=state.name;
  $(`${view}Panel`).scrollTop=0;
}
function openPanel(view,opener) {
  panelOpener=opener;
  if(view==='flowers') { $('seedSearch').value=''; filterCatalogue(); }
  showPanel(view);
  for(const id of ['catalogueOpen','folioOpen','printOpen']) $(id).setAttribute('aria-expanded',$(id)===opener);
  panel.showModal();
  document.querySelector(`[data-panel="${view}"]`).focus({preventScroll:true});
}
function closePanel() {panel.close();}
panel.addEventListener('close',()=>{
  for(const id of ['catalogueOpen','folioOpen','printOpen']) $(id).setAttribute('aria-expanded','false');
  panelOpener?.focus({preventScroll:true});
});
$('panelClose').addEventListener('click',closePanel);
panel.addEventListener('click',e=>{
  if(e.target!==panel)return;
  const r=panel.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();
});
const panelTabs=[...document.querySelectorAll('[data-panel]')];
panelTabs.forEach((tab,i)=>{
  tab.addEventListener('click',()=>showPanel(tab.dataset.panel));
  tab.addEventListener('keydown',e=>{
    const next={ArrowRight:(i+1)%3,ArrowLeft:(i+2)%3,Home:0,End:2}[e.key];
    if(next===undefined)return;
    e.preventDefault();showPanel(panelTabs[next].dataset.panel);panelTabs[next].focus({preventScroll:true});
  });
});
$('catalogueOpen').addEventListener('click',()=>openPanel('flowers',$('catalogueOpen')));
$('folioOpen').addEventListener('click',()=>openPanel('settings',$('folioOpen')));
$('printOpen').addEventListener('click',()=>openPanel('print',$('printOpen')));
function seedPreview(key,seed=51) {
  if(key==='all') return `<span class="mix-flowers">${['chamomile','rose','morningglory'].map((k,i)=>generateBotanicalSVG(k,seed+i)).join('')}</span>`;
  return generateBotanicalSVG(key,seed);
}
function updateSeedChoice() {
  $('selectedSeedName').textContent=specimenName(state.variety);
  $('selectedSeedPreview').innerHTML=generateBotanicalSVG(state.variety==='all'?'rose':state.variety,51);
  document.querySelectorAll('.seed-card').forEach(card=>card.setAttribute('aria-pressed',card.dataset.variety===state.variety));
}
function renderCatalogue() {
  $('seedCards').innerHTML=SPECIMENS.map(([key,name,latin],i)=>`<button class="seed-card" data-variety="${key}" aria-pressed="${key===state.variety}"><span aria-hidden="true">${seedPreview(key,123+i)}</span><strong>${name}</strong><small>${latin}</small></button>`).join('');
}
$('seedCards').addEventListener('click',e=>{const card=e.target.closest('.seed-card');if(!card)return;state.variety=card.dataset.variety;setTool('plant');updateSeedChoice();closePanel();changed();toast(`${specimenName(state.variety)} selected. Tap the meadow to plant.`);});
function filterCatalogue() {
  const query=$('seedSearch').value.trim().toLowerCase();let count=0;
  document.querySelectorAll('.seed-card').forEach(c=>{c.hidden=!c.textContent.toLowerCase().includes(query);if(!c.hidden)count++;});
  $('noSeeds').hidden=count!==0; $('clearSearch').disabled=!$('seedSearch').value;
}
$('seedSearch').addEventListener('input',filterCatalogue);
$('clearSearch').addEventListener('click',()=>{$('seedSearch').value='';filterCatalogue();$('seedSearch').focus();});


function setTheme() {
  document.body.dataset.theme=state.theme;
  const colors=getComputedStyle(document.body);
  const stroke=colors.getPropertyValue('--gold-foil').trim();
  const light=colors.getPropertyValue('--gold-light').trim();
  const pattern=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 30"><g fill="none" stroke="${stroke}" stroke-width=".8"><path d="M0 5H240M0 25H240M0 15Q15 2 30 15T60 15T90 15T120 15T150 15T180 15T210 15T240 15"/><path d="M15 15q-5-8-10-4q2 8 10 4m30 0q5 8 10 4q-2-8-10-4m30 0q-5-8-10-4q2 8 10 4m30 0q5 8 10 4q-2-8-10-4m30 0q-5-8-10-4q2 8 10 4m30 0q5 8 10 4q-2-8-10-4m30 0q-5-8-10-4q2 8 10 4"/></g><g fill="${light}" stroke="${stroke}" stroke-width=".7"><circle cx="30" cy="15" r="2"/><circle cx="90" cy="15" r="2"/><circle cx="150" cy="15" r="2"/><circle cx="210" cy="15" r="2"/></g></svg>`;
  for(const id of ['topGildedBorder','bottomGildedBorder']) $(id).style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(pattern)}")`;
  drawStars();
}
function drawStars() {
  const c=$('stars-canvas'),ctx=c.getContext('2d');c.width=innerWidth;c.height=innerHeight*.38;
  const random=seededRandom(711);
  for(let i=0;i<80;i++){ctx.beginPath();ctx.arc(random()*c.width,random()*c.height,.4+random()*1.3,0,Math.PI*2);ctx.fillStyle=`rgba(239,239,220,${.25+random()*.5})`;ctx.fill();}
}
function applyMotion() {document.body.dataset.motion=state.motionEnabled?'on':'off';}
$('themeSelect').addEventListener('change',e=>{state.theme=e.target.value;setTheme();changed();});
$('gardenName').addEventListener('input',e=>{state.name=e.target.value.slice(0,70);changed();});
let musicEnabled=false;
GardenAudio.subscribe(({enabled,playing,supported})=>{
  musicEnabled=enabled;
  $('musicToggle').setAttribute('aria-pressed',enabled);
  $('musicToggle').setAttribute('aria-label',enabled?'Pause background music':'Play background music');
  $('musicToggleLabel').textContent=enabled?'Pause':'Music';
  $('musicSettingsToggle').textContent=enabled?'Pause music':'Play music';
  $('musicSettingsToggle').setAttribute('aria-pressed',enabled);
  $('musicStatus').textContent=!supported?'Music is unavailable in this browser.':playing?'Playing softly in the background.':enabled?'Starting music…':'Press play for a little calm.';
});
async function toggleMusic() {
  if(musicEnabled)GardenAudio.pauseMusic();
  else if(await GardenAudio.startMusic()===false)toast('Music could not start. Try pressing Play music again.');
}
$('musicToggle').addEventListener('click',toggleMusic);
$('musicSettingsToggle').addEventListener('click',toggleMusic);
$('musicTrack').addEventListener('change',e=>{state.musicTrack=e.target.value;GardenAudio.setTrack(state.musicTrack);changed();});
$('musicVolume').addEventListener('input',e=>{state.musicVolume=Number(e.target.value)/100;$('musicVolumeValue').textContent=`${e.target.value}%`;GardenAudio.setVolume(state.musicVolume);changed();});
$('soundEnabled').addEventListener('change',e=>{state.soundEnabled=e.target.checked;$('plantVolume').disabled=!state.soundEnabled;changed();if(state.soundEnabled)GardenAudio.playPlant(state.variety==='all'?'chamomile':state.variety);});
$('plantVolume').addEventListener('input',e=>{state.plantVolume=Number(e.target.value)/100;$('plantVolumeValue').textContent=`${e.target.value}%`;GardenAudio.setPlantVolume(state.plantVolume);changed();});
$('plantVolume').addEventListener('change',()=>{if(state.soundEnabled)GardenAudio.playPlant(state.variety==='all'?'chamomile':state.variety);});
$('growFromSeeds').addEventListener('change',e=>{
  state.growFromSeeds=e.target.checked;
  if(!state.growFromSeeds)for(const {plant,element} of [...growingPlants.values()])finishGrowing(plant,element);
  updatePlantingHelp();changed();
});
$('motionEnabled').addEventListener('change',e=>{state.motionEnabled=e.target.checked;applyMotion();changed();});
$('lifeSelect').addEventListener('change',e=>{
  remember();state.living=e.target.value==='living';
  state.plants.forEach(p=>p.expiresAt=state.living?Date.now()+60000+p.seed%20000:null);changed();
  toast(state.living?'Your flowers will gently fade after a minute.':'Your garden will stay rooted.');
});
$('harvestButton').addEventListener('click',()=>{
  if(!state.plants.length){toast('The meadow is already clear.');return;}
  remember();state.plants=[];selectPlant(null);renderGarden();changed();closePanel();toast('The meadow is clear. Undo restores your arrangement.');
});
setInterval(()=>{const now=Date.now();state.plants.filter(p=>p.expiresAt&&p.expiresAt<=now).forEach(p=>removeById(p.id));},1000);
window.addEventListener('pagehide',saveGarden);
window.addEventListener('resize',()=>{state.plants.forEach(positionPlant);updateKeyboardCursor();drawStars();});

function spawnVisitor(x,y) {
  if(!state.motionEnabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const el=document.createElement('div');el.className='whimsical-bug';
  el.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:35px;height:35px;pointer-events:none;z-index:60`;
  el.innerHTML=createButterflySVG('#d5b5c1','#b99b72');document.body.appendChild(el);
  const a=el.animate([{transform:'translate(-15px,0) rotate(-8deg)',opacity:0},{transform:'translate(30px,-70px) rotate(7deg)',opacity:1,offset:.25},{transform:'translate(140px,-190px) rotate(-10deg)',opacity:0}],{duration:4600,easing:'ease-out'});a.onfinish=()=>el.remove();
}
function engraveGrass() {
  const random=seededRandom(32);let paths='';
  for(let i=0;i<140;i++) {
    const x=random()*1200,y=50+random()*540,h=3+y/60;
    paths+=`M${x},${y}q-1,${-h*.6} -3,${-h} M${x},${y}q2,${-h*.7} 4,${-h*.85}`;
  }
  $('lawnZone').innerHTML=`<svg class="grass-engraving" aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="none"><path d="${paths}" stroke="#495538" stroke-width=".65" fill="none" stroke-linecap="round"/></svg>`;
}

async function svgImage(svg) {
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try { const image=new Image();image.src=url;await image.decode();return image; }
  finally { URL.revokeObjectURL(url); }
}
async function exportPrint() {
  const button=$('downloadPrint');button.disabled=true;button.textContent='Preparing your print…';
  try {
    const title=$('printName').value.trim().slice(0,70);
    const ratio=innerHeight/innerWidth;
    const width=Math.round(Math.min(2400,2600/ratio)),height=Math.round(width*ratio);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');const margin=width*.035,header=width*.085;
    const artW=width-2*margin,artH=height-header-margin;
    ctx.fillStyle='#f7f2e5';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.beginPath();ctx.rect(margin,header,artW,artH);ctx.clip();
    if($('printStyle').value==='scene') {
      const colors=getComputedStyle(document.body),h=header+artH*.38;
      const sky=ctx.createLinearGradient(0,header,0,h);sky.addColorStop(0,colors.getPropertyValue('--sky-top').trim());sky.addColorStop(1,colors.getPropertyValue('--sky-bottom').trim());ctx.fillStyle=sky;ctx.fillRect(margin,header,artW,artH*.38);
      const lawn=ctx.createLinearGradient(0,h,0,header+artH);lawn.addColorStop(0,colors.getPropertyValue('--lawn-top').trim());lawn.addColorStop(1,colors.getPropertyValue('--lawn-bottom').trim());ctx.fillStyle=lawn;ctx.fillRect(margin,h,artW,artH*.62);
    }
    const scale=artW/innerWidth;
    const ordered=[...state.plants].sort((a,b)=>a.y-b.y);
    // One SVG per specimen keeps export independent of fonts, stylesheets and network access.
    for(const p of ordered) {
      const svg=elements.get(p.id)?.querySelector('svg');if(!svg)continue;
      const image=await svgImage(matureBotanicalSVG(svg));
      const ps=plantScale(p)*scale;
      ctx.save();ctx.translate(margin+p.x*artW,header+artH*(.38+p.y*.62));ctx.rotate(p.tilt*Math.PI/180);ctx.scale(ps,ps);ctx.drawImage(image,-110,-275,220,290);ctx.restore();
    }
    ctx.restore();
    const random=seededRandom(66);ctx.fillStyle='#887c6110';
    for(let i=0;i<2500;i++)ctx.fillRect(random()*width,random()*height,.6,.6);
    if($('printBorder').checked) {
      ctx.strokeStyle='#a28b56';ctx.lineWidth=1.3;ctx.strokeRect(margin*.45,margin*.45,width-margin*.9,height-margin*.9);
      ctx.lineWidth=.55;ctx.strokeRect(margin*.65,margin*.65,width-margin*1.3,height-margin*1.3);
      for(const x of [margin,width-margin])for(const y of [margin,height-margin]) {
        ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeStyle='#7f8763';
        ctx.beginPath();ctx.ellipse(0,0,margin*.15,margin*.35,0,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    }
    if(title) {ctx.textAlign='center';ctx.fillStyle='#504a36';ctx.font=`${Math.max(24,width*.026)}px Georgia, serif`;ctx.fillText(title,width/2,header*.6,width-margin*3);}
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image export failed')),'image/png'));
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${(title||'botanical-garden').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'botanical-garden'}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    closePanel();toast('Your botanical print is ready.');
  } catch {toast('The print could not be saved. Please try again.');}
  finally {button.disabled=false;button.textContent='Download image';}
}
$('downloadPrint').addEventListener('click',exportPrint);

$('themeSelect').value=state.theme;$('gardenName').value=state.name;
$('musicTrack').value=state.musicTrack;$('musicVolume').value=Math.round(state.musicVolume*100);$('musicVolumeValue').textContent=`${Math.round(state.musicVolume*100)}%`;
GardenAudio.setTrack(state.musicTrack);GardenAudio.setVolume(state.musicVolume);GardenAudio.setPlantVolume(state.plantVolume);
$('plantVolume').value=Math.round(state.plantVolume*100);$('plantVolumeValue').textContent=`${Math.round(state.plantVolume*100)}%`;$('plantVolume').disabled=!state.soundEnabled;$('growFromSeeds').checked=state.growFromSeeds;
$('soundEnabled').checked=state.soundEnabled;$('motionEnabled').checked=state.motionEnabled;$('lifeSelect').value=state.living?'living':'permanent';
setTheme();applyMotion();engraveGrass();renderCatalogue();updateSeedChoice();setTool('plant');renderGarden();updateKeyboardCursor();
if(firstVisit) {
  const initial=[['chamomile',.26,.46,451],['rose',.5,.74,751],['morningglory',.73,.54,132]];
  initial.forEach(([variety,x,y,seed],i)=>{const p={id:`welcome-${i}`,variety,x,y,seed,size:1,tilt:i*3-3,expiresAt:null};state.plants.push(p);renderPlant(p);});
}
updateCount();saveGarden();
