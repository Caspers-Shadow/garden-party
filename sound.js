'use strict';

// Original, slow arrangements in C major pentatonic. Every flower belongs to
// the same scale, so a mixed meadow stays in tune with all three backgrounds.
const GardenAudio = (() => {
  const TRACKS = {
    meadow: {name:'Quiet meadow',step:2.7,tone:'keys',notes:[64,null,67,69,null,67,62,null,60,null,64,67,null,62,60,null],chords:[[48,55,64],[45,52,60],[50,57,62],[48,55,60]]},
    moonlight: {name:'Moonlit pond',step:3.1,tone:'harp',notes:[60,67,null,64,null,69,67,null,62,null,64,null,60,null,67,null],chords:[[48,55,60],[45,52,64],[50,55,62],[48,55,64]]},
    clouds: {name:'Drifting clouds',step:3.6,tone:'bells',notes:[67,null,null,64,62,null,60,null,69,null,67,null,64,null,62,null],chords:[[48,55,64],[45,52,60],[50,57,62],[48,55,60]]}
  };
  const FLOWERS = {
    primrose:[64,'keys'],anemone:[72,'bells'],wildrose:[67,'harp'],hydrangea:[62,'keys'],
    morningglory:[69,'bells'],chamomile:[76,'keys'],rose:[60,'harp'],jasmine:[74,'bells'],
    lily:[67,'bells'],poppy:[62,'harp'],foxglove:[69,'keys'],peony:[64,'harp'],
    sunflower:[60,'keys'],urn:[55,'harp']
  };
  const TIMBRES = {keys:{harmonic:.12,attack:.018},harp:{harmonic:.2,attack:.012},bells:{harmonic:.06,attack:.03},pad:{harmonic:.04,attack:1.8}};
  let context=null,output=null,plantBus=null,currentRun=null,track='meadow',volume=.28;
  let wanted=false,generation=0,listener=()=>{};
  const plantVoices=new Set();
  const supported=!!(window.AudioContext||window.webkitAudioContext);
  const frequency = midi => 440*Math.pow(2,(midi-69)/12);
  const notify=()=>listener({enabled:wanted,playing:!!currentRun,track,supported});

  function audioContext() {
    if(!supported)return null;
    if(!context) {
      context=new (window.AudioContext||window.webkitAudioContext)();
      output=context.createDynamicsCompressor();
      output.threshold.value=-18;output.knee.value=24;output.ratio.value=3;
      output.attack.value=.01;output.release.value=.3;output.connect(context.destination);
      plantBus=context.createGain();plantBus.gain.value=.7;plantBus.connect(output);
    }
    return context;
  }
  function voice(midi,tone,at,duration,amplitude,bus,voices) {
    const colour=TIMBRES[tone],envelope=context.createGain();
    const fundamental=context.createOscillator(),overtone=context.createOscillator(),partial=context.createGain();
    fundamental.type='sine';overtone.type='sine';
    fundamental.frequency.value=frequency(midi);overtone.frequency.value=frequency(midi)*2;
    partial.gain.value=colour.harmonic;
    fundamental.connect(envelope);overtone.connect(partial);partial.connect(envelope);envelope.connect(bus);
    envelope.gain.setValueAtTime(.00001,at);
    envelope.gain.exponentialRampToValueAtTime(amplitude,at+Math.min(colour.attack,duration*.25));
    envelope.gain.exponentialRampToValueAtTime(.00001,at+duration);
    const note={stop(when){fundamental.stop(when);overtone.stop(when);}};
    voices.add(note);
    fundamental.onended=()=>{voices.delete(note);fundamental.disconnect();overtone.disconnect();partial.disconnect();envelope.disconnect();};
    fundamental.start(at);overtone.start(at);note.stop(at+duration+.02);
  }
  function fadeRun() {
    const run=currentRun;if(!run)return;
    currentRun=null;clearInterval(run.timer);
    const t=context.currentTime;
    run.bus.gain.cancelScheduledValues(t);run.bus.gain.setValueAtTime(run.bus.gain.value,t);run.bus.gain.linearRampToValueAtTime(0,t+.35);
    run.voices.forEach(v=>v.stop(t+.4));
    setTimeout(()=>run.bus.disconnect(),500);
  }
  function schedule(run) {
    if(currentRun!==run)return;
    const score=TRACKS[track];
    // Resume from the present rather than bursting out missed notes after sleep.
    if(run.nextTime<context.currentTime-.25)run.nextTime=context.currentTime+.1;
    while(run.nextTime<context.currentTime+.35) {
      const i=run.index,at=run.nextTime,note=score.notes[i%score.notes.length];
      if(note!==null)voice(note,score.tone,at,score.step*1.65,.11,run.bus,run.voices);
      if(i%4===0)score.chords[Math.floor(i/4)%score.chords.length].forEach((n,j)=>voice(n,'pad',at+j*.08,score.step*3.7,.026,run.bus,run.voices));
      run.index++;run.nextTime+=score.step;
    }
  }
  async function startMusic() {
    wanted=true;const request=++generation;notify();
    try {
      const ctx=audioContext();if(!ctx)throw new Error('Audio unavailable');
      if(ctx.state!=='running')await ctx.resume();
      if(request!==generation||!wanted||document.hidden)return null;
      if(ctx.state!=='running')throw new Error('Audio paused');
      fadeRun();
      const bus=ctx.createGain();bus.gain.setValueAtTime(0,ctx.currentTime);bus.gain.linearRampToValueAtTime(volume,ctx.currentTime+1.3);bus.connect(output);
      const run={bus,voices:new Set(),index:0,nextTime:ctx.currentTime+.08,timer:null};currentRun=run;
      schedule(run);run.timer=setInterval(()=>schedule(run),120);notify();return true;
    } catch {
      if(request===generation){wanted=false;fadeRun();notify();}return false;
    }
  }
  function pauseMusic() {wanted=false;generation++;fadeRun();notify();}
  function setTrack(value) {if(!TRACKS[value])return;track=value;if(wanted)void startMusic();else notify();}
  function setVolume(value) {
    volume=Math.max(0,Math.min(1,Number(value)||0));
    if(currentRun){const gain=currentRun.bus.gain,t=context.currentTime;gain.cancelScheduledValues(t);gain.setTargetAtTime(volume,t,.12);}
  }
  function playPlant(variety) {
    if(document.hidden)return;
    try {
      const ctx=audioContext();if(!ctx)return;
      if(ctx.state==='suspended')void ctx.resume().catch(()=>{});
      // Quiet, short notes with a bounded tail even when painting a dense trail.
      if(plantVoices.size>=10){const oldest=plantVoices.values().next().value;plantVoices.delete(oldest);oldest.stop(ctx.currentTime+.025);}
      const [note,tone]=FLOWERS[variety]||FLOWERS.chamomile;
      voice(note,tone,ctx.currentTime+.008,.62,.045,plantBus,plantVoices);
    } catch { /* The visual garden remains usable without audio. */ }
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){generation++;fadeRun();if(context)plantVoices.forEach(v=>v.stop(context.currentTime+.03));notify();}
    else if(wanted)void startMusic();
  });
  window.addEventListener('pagehide',()=>{generation++;fadeRun();if(context)plantVoices.forEach(v=>v.stop(context.currentTime+.03));});
  return {startMusic,pauseMusic,setTrack,setVolume,playPlant,subscribe(callback){listener=callback;notify();}};
})();
