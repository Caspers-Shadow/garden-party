'use strict';

// Original ambient arrangements: long overlapping harmonies, breathy flute,
// and quiet air/water textures. Flower feedback uses short filtered-noise
// percussion, with no electronic oscillator or ringing notification tone.
const GardenAudio = (() => {
  const TRACKS = {
    meadow:{chordSeconds:26,padLength:36,padLevel:.065,air:.014,water:0,fluteGap:8.6,fluteLength:6.8,fluteLevel:.052,melody:[67,64,null,62,60,null,64,67,null,69,67,null,64,62,null,60]},
    moonlight:{chordSeconds:30,padLength:41,padLevel:.056,air:.008,water:.038,fluteGap:10.4,fluteLength:8.2,fluteLevel:.043,melody:[60,null,64,67,null,62,null,64,60,null,67,null,69,67,null,64]},
    clouds:{chordSeconds:34,padLength:46,padLevel:.07,air:.02,water:0,fluteGap:12,fluteLength:9,fluteLevel:.026,melody:[null,60,null,null,64,null,null,62,null,null,67,null,null,64,null,null]}
  };
  const CHORDS=[[48,55,60,64],[45,52,57,60],[50,55,57,62],[48,55,62,64]];
  // Pitch gently colours the wooden body; the leaf layer stays unpitched.
  const FLOWERS={
    primrose:[52,1150,.14],anemone:[60,1700,.13],wildrose:[55,1000,.17],hydrangea:[50,900,.18],
    morningglory:[57,1350,.16],chamomile:[64,1900,.12],rose:[48,850,.19],jasmine:[62,1850,.13],
    lily:[55,1500,.15],poppy:[50,1250,.14],foxglove:[57,1100,.17],peony:[52,950,.19],
    sunflower:[48,780,.18],urn:[43,620,.2]
  };
  let context=null,output=null,plantBus=null,noise=null,brownNoise=null,impulse=null,padWave=null,fluteWave=null;
  let currentRun=null,track='meadow',volume=.28,wanted=false,generation=0,listener=()=>{};
  const plantVoices=new Set(),plantBuffers=new Map();
  const supported=!!(window.AudioContext||window.webkitAudioContext);
  const frequency=midi=>440*Math.pow(2,(midi-69)/12);
  const notify=()=>listener({enabled:wanted,playing:!!currentRun,track,supported});
  function random(seed) {return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};}
  function noiseBuffer(seconds,brown=false) {
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*seconds),context.sampleRate);
    const data=buffer.getChannelData(0),next=random(brown?9147:2753);let previous=0;
    for(let i=0;i<data.length;i++){const white=next();previous=(previous+.02*white)/1.02;data[i]=brown?previous*4:white;}
    // Match loop endpoints, avoiding a tick each time an ambience buffer wraps.
    const difference=data[data.length-1]-data[0];
    for(let i=0;i<data.length;i++)data[i]-=difference*i/(data.length-1);
    return buffer;
  }
  function audioContext() {
    if(!supported)return null;
    if(!context) {
      context=new (window.AudioContext||window.webkitAudioContext)();
      output=context.createDynamicsCompressor();output.threshold.value=-20;output.knee.value=24;output.ratio.value=3;output.attack.value=.015;output.release.value=.4;output.connect(context.destination);
      plantBus=context.createGain();plantBus.gain.value=.6;plantBus.connect(output);
      noise=noiseBuffer(8);brownNoise=noiseBuffer(12,true);
      padWave=context.createPeriodicWave(new Float32Array(7),new Float32Array([0,1,.22,.09,.035,.012,.006]));
      fluteWave=context.createPeriodicWave(new Float32Array(6),new Float32Array([0,1,.13,.045,.018,.005]));
    }
    return context;
  }
  function reverbBuffer() {
    if(impulse)return impulse;
    impulse=context.createBuffer(2,Math.ceil(context.sampleRate*3.8),context.sampleRate);
    for(let channel=0;channel<2;channel++){
      const data=impulse.getChannelData(channel),next=random(8103+channel*41);let low=0;
      for(let i=0;i<data.length;i++){low+=.24*(next()-low);const t=i/context.sampleRate;data[i]=low*Math.exp(-t*1.8)*Math.min(1,t/.015);}
    }
    return impulse;
  }
  function register(sources,nodes,voices,envelope=null) {
    let remaining=sources.length,finished=false;
    const voice={stop(when){
      if(finished)return;
      if(envelope){const now=context.currentTime;envelope.gain.cancelScheduledValues(now);envelope.gain.setTargetAtTime(.00001,now,.012);}
      for(const source of sources){try{source.stop(when);}catch{/* Already ended. */}}
    }};
    sources.forEach(source=>source.onended=()=>{if(--remaining===0){finished=true;voices.delete(voice);nodes.forEach(node=>node.disconnect());}});
    voices.add(voice);return voice;
  }
  function padNote(midi,at,duration,level,pan,run) {
    const envelope=context.createGain(),filter=context.createBiquadFilter(),stereo=context.createStereoPanner();
    filter.type='lowpass';filter.frequency.value=1050;filter.Q.value=.3;stereo.pan.value=pan;
    const a=context.createOscillator(),b=context.createOscillator();
    [a,b].forEach(osc=>{osc.setPeriodicWave(padWave);osc.frequency.value=frequency(midi);osc.connect(filter);});a.detune.value=-2.1;b.detune.value=2.1;
    filter.connect(envelope);envelope.connect(stereo);stereo.connect(run.input);
    envelope.gain.setValueAtTime(.00001,at);envelope.gain.linearRampToValueAtTime(level*.5,at+5.5);envelope.gain.linearRampToValueAtTime(level*.42,at+duration*.58);envelope.gain.linearRampToValueAtTime(.00001,at+duration);
    register([a,b],[a,b,filter,envelope,stereo],run.voices,envelope);
    a.start(at);b.start(at);a.stop(at+duration+.03);b.stop(at+duration+.03);
  }
  function fluteNote(midi,at,duration,level,run) {
    const osc=context.createOscillator(),breath=context.createBufferSource(),filter=context.createBiquadFilter(),breathLevel=context.createGain();
    const envelope=context.createGain(),stereo=context.createStereoPanner(),vibrato=context.createOscillator(),vibratoDepth=context.createGain();
    osc.setPeriodicWave(fluteWave);osc.frequency.value=frequency(midi);
    breath.buffer=noise;breath.loop=true;filter.type='bandpass';filter.frequency.value=1450;filter.Q.value=.65;breathLevel.gain.value=.14;
    breath.connect(filter);filter.connect(breathLevel);breathLevel.connect(envelope);osc.connect(envelope);envelope.connect(stereo);stereo.pan.value=midi%3===0?-.18:.18;stereo.connect(run.input);
    vibrato.frequency.value=4.8;vibratoDepth.gain.setValueAtTime(0,at);vibratoDepth.gain.linearRampToValueAtTime(2.8,at+1.6);vibrato.connect(vibratoDepth);vibratoDepth.connect(osc.detune);
    envelope.gain.setValueAtTime(.00001,at);envelope.gain.linearRampToValueAtTime(level,at+.85);envelope.gain.linearRampToValueAtTime(level*.74,at+duration*.58);envelope.gain.linearRampToValueAtTime(.00001,at+duration);
    register([osc,breath,vibrato],[osc,breath,filter,breathLevel,envelope,stereo,vibrato,vibratoDepth],run.voices,envelope);
    osc.start(at);breath.start(at,(midi%7)*.7);vibrato.start(at);[osc,breath,vibrato].forEach(source=>source.stop(at+duration+.03));
  }
  function ambience(run,water,level) {
    if(!level)return;
    const source=context.createBufferSource(),high=context.createBiquadFilter(),low=context.createBiquadFilter(),gain=context.createGain();
    const drift=context.createOscillator(),driftDepth=context.createGain();
    source.buffer=water?noise:brownNoise;source.loop=true;
    high.type='highpass';high.frequency.value=water?180:75;low.type='lowpass';low.frequency.value=water?850:480;low.Q.value=.35;
    gain.gain.value=level;drift.frequency.value=water?.087:.039;driftDepth.gain.value=level*.24;
    source.connect(high);high.connect(low);low.connect(gain);gain.connect(run.input);drift.connect(driftDepth);driftDepth.connect(gain.gain);
    register([source,drift],[source,high,low,gain,drift,driftDepth],run.voices);
    source.start(context.currentTime,water?2.3:0);drift.start();
  }
  function fadeRun() {
    const run=currentRun;if(!run)return;currentRun=null;clearInterval(run.timer);
    const t=context.currentTime;run.bus.gain.cancelScheduledValues(t);run.bus.gain.setValueAtTime(run.bus.gain.value,t);run.bus.gain.linearRampToValueAtTime(0,t+.5);
    run.voices.forEach(v=>v.stop(t+.55));
    setTimeout(()=>[run.input,run.dry,run.reverb,run.wet,run.bus].forEach(node=>node.disconnect()),650);
  }
  function schedule(run) {
    if(currentRun!==run)return;const score=TRACKS[track],now=context.currentTime;
    if(run.chordAt<now-.5)run.chordAt=now+.1;
    if(run.fluteAt<now-.5)run.fluteAt=now+2;
    if(run.chordAt<now+.4){CHORDS[run.chordIndex%CHORDS.length].forEach((midi,i)=>padNote(midi,run.chordAt,score.padLength,score.padLevel,-.54+i*.36,run));run.chordAt+=score.chordSeconds;run.chordIndex++;}
    if(run.fluteAt<now+.4){const midi=score.melody[run.fluteIndex%score.melody.length];if(midi!==null)fluteNote(midi,run.fluteAt,score.fluteLength,score.fluteLevel,run);run.fluteAt+=score.fluteGap;run.fluteIndex++;}
  }
  async function startMusic() {
    wanted=true;const request=++generation;notify();
    try {
      const ctx=audioContext();if(!ctx)throw new Error('Audio unavailable');
      if(ctx.state!=='running')await ctx.resume();
      if(request!==generation||!wanted||document.hidden)return null;
      if(ctx.state!=='running')throw new Error('Audio paused');
      fadeRun();
      const input=ctx.createGain(),dry=ctx.createGain(),reverb=ctx.createConvolver(),wet=ctx.createGain(),bus=ctx.createGain();
      dry.gain.value=.8;wet.gain.value=.25;reverb.buffer=reverbBuffer();input.connect(dry);dry.connect(bus);input.connect(reverb);reverb.connect(wet);wet.connect(bus);bus.connect(output);
      bus.gain.setValueAtTime(0,ctx.currentTime);bus.gain.linearRampToValueAtTime(volume,ctx.currentTime+2);
      const run={input,dry,reverb,wet,bus,voices:new Set(),chordAt:ctx.currentTime+.08,chordIndex:0,fluteAt:ctx.currentTime+3.4,fluteIndex:0,timer:null};currentRun=run;
      ambience(run,false,TRACKS[track].air);ambience(run,true,TRACKS[track].water);schedule(run);run.timer=setInterval(()=>schedule(run),150);notify();return true;
    }catch{if(request===generation){wanted=false;fadeRun();notify();}return false;}
  }
  function pauseMusic(){wanted=false;generation++;fadeRun();notify();}
  function setTrack(value){if(!TRACKS[value])return;track=value;if(wanted)void startMusic();else notify();}
  function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(currentRun){const gain=currentRun.bus.gain,t=context.currentTime;gain.cancelScheduledValues(t);gain.setTargetAtTime(volume,t,.15);}}

  function placementBuffer(variety) {
    if(plantBuffers.has(variety))return plantBuffers.get(variety);
    const [midi,leafCutoff,length]=FLOWERS[variety]||FLOWERS.chamomile;
    const sampleRate=context.sampleRate,buffer=context.createBuffer(1,Math.ceil(sampleRate*(length+.04)),sampleRate),data=buffer.getChannelData(0);
    const seed=[...variety].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),17),next=random(seed);
    // Noise excites a broad, damped wooden resonance rather than a pure tone.
    const bodyCutoff=frequency(midi),r=Math.exp(-1/(sampleRate*.009)),coefficient=2*r*Math.cos(2*Math.PI*bodyCutoff/sampleRate);
    const leafAlpha=1-Math.exp(-2*Math.PI*leafCutoff/sampleRate),bodyAlpha=1-Math.exp(-2*Math.PI*450/sampleRate);
    let y1=0,y2=0,leaf=0,body=0,peak=0;
    for(let i=0;i<data.length;i++){
      const t=i/sampleRate,white=next();leaf+=leafAlpha*(white-leaf);body+=bodyAlpha*(white-body);
      const excitation=body*Math.exp(-t/.004),resonance=excitation+coefficient*y1-r*r*y2;y2=y1;y1=resonance;
      const attack=1-Math.exp(-t/.006),release=Math.pow(Math.max(0,1-t/length),2);
      data[i]=(resonance*.006+leaf*.34)*attack*release;peak=Math.max(peak,Math.abs(data[i]));
    }
    for(let i=0;i<data.length;i++)data[i]=data[i]/Math.max(.001,peak)*.032;
    plantBuffers.set(variety,buffer);return buffer;
  }
  function playPlant(variety) {
    if(document.hidden)return;
    try{
      const ctx=audioContext();if(!ctx)return;if(ctx.state!=='running')void ctx.resume().catch(()=>{});
      if(plantVoices.size>=8){const oldest=plantVoices.values().next().value;plantVoices.delete(oldest);oldest.stop(ctx.currentTime+.03);}
      const source=ctx.createBufferSource();source.buffer=placementBuffer(variety);source.connect(plantBus);register([source],[source],plantVoices);source.start(ctx.currentTime+.006);
    }catch{/* Keep planting available when audio is unavailable. */}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;fadeRun();if(context)plantVoices.forEach(v=>v.stop(context.currentTime+.03));notify();}else if(wanted)void startMusic();});
  window.addEventListener('pagehide',()=>{generation++;fadeRun();if(context)plantVoices.forEach(v=>v.stop(context.currentTime+.03));});
  return {startMusic,pauseMusic,setTrack,setVolume,playPlant,subscribe(callback){listener=callback;notify();}};
})();
