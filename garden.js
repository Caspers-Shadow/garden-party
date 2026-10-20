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
const defaults = () => ({version:2, name:'My Botanical Garden', theme:'royal', variety:'all', melody:'clair', soundEnabled:false, motionEnabled:!matchMedia('(prefers-reduced-motion: reduce)').matches, living:false, plants:[]});
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
      state.melody = ['clair','ghibli','gymnopedie','canon','harp','mute'].includes(saved.melody) ? saved.melody : 'clair';
      for (const key of ['soundEnabled','motionEnabled','living']) if (typeof saved[key]==='boolean') state[key]=saved[key];
      const ids = new Set();
      state.plants = saved.plants.filter(p => p && typeof p.id==='string' && !ids.has(p.id) && ids.add(p.id) && botanicalBuilders[p.variety] && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.seed) && (!p.expiresAt || p.expiresAt>Date.now())).map(p=>({id:p.id, variety:p.variety, seed:p.seed>>>0, x:clamp(p.x,.01,.99), y:clamp(p.y,.025,.985), size:clamp(Number(p.size)||1,.65,1.5), tilt:clamp(Number(p.tilt)||0,-35,35), expiresAt:state.living && Number.isFinite(p.expiresAt) ? p.expiresAt : null}));
    }
  }
} catch { storageWorks = false; }
const gardenBed = $('garden-bed');
const surface = $('interaction-surface');
const melodyIndicator = $('melodyIndicator');
const melodyNoteText = $('melodyNoteText');
const elements = new Map();
const history = [];
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
  el.style.transform=`scale(${plantScale(p)}) rotate(${p.tilt}deg)`;
}
function renderPlant(p, grow=false) {
  const el=document.createElement('div');
  el.className='botanical-plant'; el.dataset.id=p.id;
  el.setAttribute('role','button'); el.setAttribute('aria-label',`${specimenName(p.variety)}. Select to arrange.`);
  el.tabIndex=tool==='edit'?0:-1;
  el.innerHTML=`<div class="ground-shadow" style="width:90px"></div><div class="specimen-wind"><div class="specimen-growth">${generateBotanicalSVG(p.variety,p.seed)}</div></div>`;
  el.style.setProperty('--sway-time',`${4.5+(p.seed%31)/10}s`);
  el.style.setProperty('--sway-delay',`${-(p.seed%40)/10}s`);
  gardenBed.appendChild(el); elements.set(p.id,el); positionPlant(p);
  if(grow && state.motionEnabled && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.querySelector('.specimen-growth').animate([{opacity:0,transform:'translateY(7px) scale(.75,.12)'},{opacity:1,transform:'translateY(0) scale(1,1)'}],{duration:850,easing:'cubic-bezier(.2,.8,.3,1)'});
  }
}
function renderGarden() {
  elements.clear(); gardenBed.replaceChildren();
  state.plants.forEach(p=>renderPlant(p));
  updateCount();
}
function removeById(id, animate=true) {
  const el=elements.get(id);
  state.plants=state.plants.filter(p=>p.id!==id); elements.delete(id);
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
function plantAt(x,y,quiet=false) {
  if(y<innerHeight*.38) { if(!quiet) spawnVisitor(x,y); return false; }
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const key=state.variety==='all' ? ['primrose','anemone','wildrose','hydrangea','morningglory','chamomile','rose','jasmine'][seed%8] : state.variety;
  const p={id:`flower-${++nextId}`,variety:key,seed,...normalizedPoint(x,y),size:1,tilt:(seed%11)-5,expiresAt:state.living?Date.now()+60000+seed%20000:null};
  state.plants.push(p); renderPlant(p,!quiet); changed();
  if(!quiet) {
    playMelodicPlantNote(p.y);
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
  $('gardenHelp').textContent=tool==='plant'?'Choose a seed, then click or brush across the meadow.':'Select a flower to move, resize, or gently tilt it.';
}
function selectPlant(id) {
  selectedId=id;
  elements.forEach((el,key)=>{el.classList.toggle('selected',key===id);el.setAttribute('aria-pressed',key===id);});
  const p=state.plants.find(p=>p.id===id);
  $('selectionTools').hidden=!p;
  if(p) { $('selectionName').textContent=specimenName(p.variety); $('plantSize').value=p.size; $('plantTilt').value=p.tilt; }
}
function pointerDown(e) {
  if(e.button!==0 || pointer) return;
  const specimen=e.target.closest('.botanical-plant');
  if(tool==='edit' && specimen) {
    const p=state.plants.find(p=>p.id===specimen.dataset.id); if(!p) return;
    selectPlant(p.id);
    pointer={mode:'move',id:e.pointerId,plantId:p.id,startX:e.clientX,startY:e.clientY,origin:rootPosition(p),snapshot:copy(state.plants),changed:false,target:specimen};
    specimen.setPointerCapture(e.pointerId); e.preventDefault();
  } else if(e.currentTarget===surface) {
    if(tool==='edit') {selectPlant(null);return;}
    if(e.clientY<innerHeight*.38) {spawnVisitor(e.clientX,e.clientY); return;}
    remember(); plantAt(e.clientX,e.clientY);
    pointer={mode:'paint',id:e.pointerId,x:e.clientX,y:e.clientY,target:surface};
    surface.setPointerCapture(e.pointerId); e.preventDefault();
  }
}
surface.addEventListener('pointerdown',pointerDown); gardenBed.addEventListener('pointerdown',pointerDown);
window.addEventListener('pointermove',e=>{
  if(!pointer || e.pointerId!==pointer.id) return;
  if(pointer.mode==='paint') {
    const depth=normalizedPoint(e.clientX,e.clientY).y;
    if(e.clientY>=innerHeight*.38 && Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>40+depth*35) {
      plantAt(e.clientX,e.clientY);pointer.x=e.clientX;pointer.y=e.clientY;
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
    pointer=null; saveGarden();
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
  if(e.target.matches('input,select,textarea') || document.querySelector('dialog[open]')) return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z') {e.preventDefault();undo();}
  else if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='p') setTool('plant');
  else if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='e') setTool('edit');
  else if(e.key==='Escape') selectPlant(null);
});
for(const [id,key] of [['plantSize','size'],['plantTilt','tilt']]) {
  const control=$(id);let snapshot=null;
  const start=()=>{if(!snapshot)snapshot=copy(state.plants);};
  control.addEventListener('pointerdown',start);control.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')||['Home','End','PageUp','PageDown'].includes(e.key))start();});
  control.addEventListener('input',()=>{const p=state.plants.find(p=>p.id===selectedId);if(!p)return;if(snapshot){remember(snapshot);snapshot=null;}p[key]=Number(control.value);positionPlant(p);changed();});
  control.addEventListener('change',()=>snapshot=null);
}
$('removePlant').addEventListener('click',removeSelected);
$('selectionDone').addEventListener('click',()=>selectPlant(null));
$('undoButton').addEventListener('click',undo);
$('plantTool').addEventListener('click',()=>setTool('plant'));
$('editTool').addEventListener('click',()=>{setTool('edit');toast('Select a flower, then drag it to a new spot.');});

function openDialog(id) { selectPlant(null);$(id).showModal(); }
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
$('catalogueOpen').addEventListener('click',()=>openDialog('catalogueDialog'));
$('folioOpen').addEventListener('click',()=>openDialog('folioDialog'));
$('printOpen').addEventListener('click',()=>{$('printName').value=state.name;openDialog('printDialog');});
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
$('seedCards').addEventListener('click',e=>{const card=e.target.closest('.seed-card');if(!card)return;state.variety=card.dataset.variety;setTool('plant');updateSeedChoice();$('catalogueDialog').close();changed();toast(`${specimenName(state.variety)} selected. Plant on the meadow.`);});
$('seedSearch').addEventListener('input',()=>{const query=$('seedSearch').value.trim().toLowerCase();let count=0;document.querySelectorAll('.seed-card').forEach(c=>{c.hidden=!c.textContent.toLowerCase().includes(query);if(!c.hidden)count++;});$('noSeeds').hidden=count!==0;});

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
$('melodySelect').addEventListener('change',e=>{state.melody=e.target.value;melodyNoteIndex=0;changed();});
$('soundEnabled').addEventListener('change',e=>{state.soundEnabled=e.target.checked;changed();if(state.soundEnabled)playMelodicPlantNote(.5);});
$('motionEnabled').addEventListener('change',e=>{state.motionEnabled=e.target.checked;applyMotion();changed();});
$('lifeSelect').addEventListener('change',e=>{
  remember();state.living=e.target.value==='living';
  state.plants.forEach(p=>p.expiresAt=state.living?Date.now()+60000+p.seed%20000:null);changed();
  toast(state.living?'Your flowers will gently fade after a minute.':'Your garden will stay rooted.');
});
$('harvestButton').addEventListener('click',()=>{
  if(!state.plants.length){toast('The meadow is already clear.');return;}
  remember();state.plants=[];renderGarden();changed();$('folioDialog').close();toast('The meadow is clear. Undo restores your arrangement.');
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
      const image=await svgImage(svg.outerHTML);
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
    $('printDialog').close();toast('Your botanical print is ready.');
  } catch {toast('The print could not be saved. Please try again.');}
  finally {button.disabled=false;button.textContent='Save botanical print';}
}
$('downloadPrint').addEventListener('click',exportPrint);

$('themeSelect').value=state.theme;$('melodySelect').value=state.melody;$('gardenName').value=state.name;
$('soundEnabled').checked=state.soundEnabled;$('motionEnabled').checked=state.motionEnabled;$('lifeSelect').value=state.living?'living':'permanent';
setTheme();applyMotion();engraveGrass();renderCatalogue();updateSeedChoice();setTool('plant');renderGarden();updateKeyboardCursor();
if(firstVisit) {
  const initial=[['chamomile',.26,.46,451],['rose',.5,.74,751],['morningglory',.73,.54,132]];
  initial.forEach(([variety,x,y,seed],i)=>{const p={id:`welcome-${i}`,variety,x,y,seed,size:1,tilt:i*3-3,expiresAt:null};state.plants.push(p);renderPlant(p,true);});
}
updateCount();saveGarden();
