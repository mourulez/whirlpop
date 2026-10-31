// Parte de navegador de audio/build_baked.py: no la carga el juego. El script la
// inyecta tras el <script> principal de index.html, así que lee del juego la
// partitura (MEL, CHORDS, PROG, WALK) y las utilidades (mtof, link,
// mulberry32), y no hay copia que mantener al día. Renderiza cada pieza en su
// propio OfflineAudioContext, desde t = 0, y manda a Python los dos sprites
// (música y efectos) como PCM float.
//
// La síntesis es el diseño de sonido del banco de escucha, tal cual estaba en
// el juego cuando horneaba al desbloquear; un cambio de sonido se hace aquí y
// se regenera audio/baked.js.
(function(){
const SR = 48000;
// Cada sprite empieza por un chirrido de sincronía: el juego lo busca al
// decodificar para saber dónde caen las piezas, porque cada navegador trata a
// su modo el retardo del codificador MP3. Entre pieza y pieza, silencio: el
// pre-eco de un ataque no se mete en la cola de la anterior.
const SYNC_AT = 1024, SYNC_LEN = 960, GAP = 2400;   // en muestras a SR
const arand = mulberry32(0xa0d10);
const arnd  = (a,b) => a + arand()*(b-a);
// el grafo apunta al contexto de la pieza que se renderiza
let actx = null, sfxIn = null, noiseBuf = null;
const LAY = {};

// ── síntesis ──
function partial(f,t,v,decay,dest){
  const o=actx.createOscillator(), g=actx.createGain(); o.type='sine'; o.frequency.value=f;
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.003); g.gain.setTargetAtTime(0,t+.003,decay/4);
  link(o, g, dest); o.start(t); o.stop(t+decay*1.2+.05);
}
function envGain(g,t,v,dur,att=.002){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(v,.0002),t+att); g.gain.exponentialRampToValueAtTime(.0001,t+dur); }
function noiseHit(t,dur,v,type,freq,dest,q=.7){
  const s=actx.createBufferSource(), f=actx.createBiquadFilter(), g=actx.createGain();
  s.buffer=noiseBuf; f.type=type; f.frequency.value=freq; f.Q.value=q; envGain(g,t,v,dur);
  link(s, f, g, dest); s.start(t,arand()*.5); s.stop(t+dur+.03); return f;
}
function tone(t,type,f0,f1,dur,v,dest){
  const o=actx.createOscillator(), g=actx.createGain(); o.type=type;
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+dur*.8);
  envGain(g,t,v,dur,.004); link(o, g, dest); o.start(t); o.stop(t+dur+.03);
}
// Burbuja: chirp ascendente corto (resonancia de Minnaert). No es un evento: con
// ella están hechos match, combo, hard drop, bomba y recolocación.
function bubble(t,size=.5,vol=.22,dest=sfxIn){
  const f0=(900-size*650)*arnd(.85,1.15), dur=.04+size*.09, o=actx.createOscillator(), g=actx.createGain();
  o.type='sine'; o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f0*(1.8+size*.8),t+dur);
  envGain(g,t,vol,dur,.003); link(o, g, dest); o.start(t); o.stop(t+dur+.03);
}
function bubbles(t,n,spread,s0,s1,vol,dest=sfxIn){ for(let i=0;i<n;i++) bubble(t+arand()*spread,arnd(s0,s1),vol*arnd(.6,1),dest); }
const SYN={
  vibes(f,t,v,dur,dest){ const end=t+Math.max(dur,.05)+.15;
    const vg=actx.createGain(), dmp=actx.createGain(), lfo=actx.createOscillator(), lg=actx.createGain();
    vg.gain.value=.75; lfo.frequency.value=5.2; lg.gain.value=.25; link(lfo, lg, vg.gain);
    dmp.gain.setValueAtTime(1,end); dmp.gain.setTargetAtTime(0,end,.12); link(vg, dmp, dest);
    partial(f,t,v,2.2,vg); partial(f*4,t,v*.12,.4,vg); lfo.start(t); lfo.stop(end+1); },
  rhodes(f,t,v,dur,dest){ const end=t+dur;
    const car=actx.createOscillator(), mod=actx.createOscillator(), mg=actx.createGain(),
          tine=actx.createOscillator(), tg=actx.createGain(), g=actx.createGain();
    car.frequency.value=f; mod.frequency.value=f; tine.frequency.value=f*14;
    mg.gain.setValueAtTime(f*1.8,t); mg.gain.setTargetAtTime(f*.35,t,.25);
    tg.gain.setValueAtTime(f*1.2,t); tg.gain.setTargetAtTime(0,t,.02);
    link(mod, mg, car.frequency); link(tine, tg, car.frequency);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.004);
    g.gain.setTargetAtTime(v*.3,t+.004,.6); g.gain.setTargetAtTime(0,end,.12);
    link(car, g, dest); [car,mod,tine].forEach(x=>{x.start(t); x.stop(end+.8);}); },
  bass(midi,t,dur,vel){
    const f=mtof(midi), o=actx.createOscillator(), o2=actx.createOscillator(), g2=actx.createGain(),
          lp=actx.createBiquadFilter(), g=actx.createGain();
    o.type='sine'; o.frequency.value=f; o2.type='triangle'; o2.frequency.value=f; g2.gain.value=.45;
    lp.type='lowpass'; lp.frequency.value=420;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+.012);
    g.gain.setTargetAtTime(vel*.7,t+.03,.15); g.gain.setTargetAtTime(0,t+dur,.06);
    o.connect(lp); link(o2, g2, lp); link(lp, g, LAY.bass);
    o.start(t); o2.start(t); o.stop(t+dur+.5); o2.stop(t+dur+.5); },
  kick(t,v){ tone(t,'sine',120,58,.32,v,LAY.drums); noiseHit(t,.012,v*.25,'lowpass',2500,LAY.drums); },
  snare(t,v){ noiseHit(t,.2,v*.55,'bandpass',1900,LAY.drums,.8); tone(t,'triangle',210,160,.09,v*.5,LAY.drums); },
  hat(t,v,open){ noiseHit(t,open?.22:.045,v*.22,'highpass',7500,LAY.drums); }
};

// ── qué se hornea ──
// Las notas, sin apagar, a velocidad 1, con la duración justa para cubrir la más
// larga a 96 BPM con su cola: el juego pone la velocidad y el apagado. Los
// golpes, a cada velocidad que usa la partitura (su envolvente no es lineal);
// lo que se sortea —ruido, burbujas—, en varias variantes.
const TEX_VARIANTS = 3, DRUM_VARIANTS = 2;
// [duración, receta]; la receta programa desde t, en sfxIn
const TEX = {
  match:     [.45, t=>bubbles(t+.01,7,.22,.15,.6,.16)],
  orbe:      [.15, t=>bubble(t,.1,.07)],
  anillo:    [.7,  t=>bubbles(t,10,.5,.05,.35,.1)],
  nivel:     [.95, t=>bubbles(t+.3,8,.5,.05,.3,.1)],
  aterrizaje:[.25, t=>{ bubble(t,.95,.22); tone(t,'sine',95,55,.09,.3,sfxIn); }],
  giro:      [.06, t=>noiseHit(t,.02,.09,'bandpass',2600,sfxIn,1.5)],
  // ráfaga de burbujas que crecen —y bajan de tono— mientras la bola se hunde
  drop:      [.45, t=>{ for(let i=0;i<12;i++){ const u=i/11; bubble(t+u*.26+arnd(0,.02),.1+.55*u*arnd(.85,1.15),.15*arnd(.7,1)); } }],
  bomba:     [.85, t=>{ tone(t,'sine',85,32,.55,.6,sfxIn); noiseHit(t,.45,.35,'lowpass',600,sfxIn); bubbles(t+.02,18,.6,.1,1,.2); }],
  petri:     [.8,  t=>{ let x=0; for(let i=0;i<22;i++){ x+=.05*Math.pow(.9,i); noiseHit(t+x,.006,.18,'bandpass',arnd(900,2600),sfxIn,2); }
                         tone(t,'sine',196,98,.7,.12,sfxIn); }],
  recoloca:  [.45, t=>{ const f=noiseHit(t,.28,.1,'bandpass',700,sfxIn,1);
                         f.frequency.setValueAtTime(700,t); f.frequency.exponentialRampToValueAtTime(1600,t+.26); bubbles(t+.05,5,.25,.1,.4,.1); }],
  boton:     [.05, t=>noiseHit(t,.012,.05,'highpass',4000,sfxIn)],
};
for (let c=1; c<=6; c++) TEX['combo'+c] = [.45, t=>bubbles(t,4+c*2,.25,.1,.5,.13)];
// las velocidades de la batería en playStep()
const DRUM_V = { k:[.55,.45,.3], s:[.38,.22,.08], h:[.3,.2,.18,.12,.11], ho:[.2] };

// [grupo, clave, duración, receta]
function musicList(){
  const list = [];
  for (let v = 0; v < DRUM_VARIANTS; v++){
    for (const x of DRUM_V.k)  list.push(['drums', 'k'+x,     .35, t=>SYN.kick(t,x)]);
    for (const x of DRUM_V.s)  list.push(['drums', 's'+x,     .25, t=>SYN.snare(t,x)]);
    for (const x of DRUM_V.h)  list.push(['drums', 'h'+x,     .1,  t=>SYN.hat(t,x,false)]);
    for (const x of DRUM_V.ho) list.push(['drums', 'h'+x+'o', .25, t=>SYN.hat(t,x,true)]);
  }
  const vib = new Set(), rh = new Set(), bass = new Set();
  for (const m of MEL){ vib.add(m[2]); if (m[5]) vib.add(m[2]-1); }
  for (const c of Object.values(CHORDS)){ c.v.forEach(x => rh.add(x)); for (const d of [0,7,12]) bass.add(c.bass+d); }
  for (const b of WALK){ const nb = CHORDS[PROG[(b+1)%32][0][1]].bass; for (let d=1; d<=4; d++) bass.add(nb+d); }
  const up = s => [...s].sort((a,b)=>a-b);
  // dur largo: el apagado de la síntesis cae fuera del búfer
  for (const m of up(vib))  list.push(['vibes',  m, 1.3,  t=>SYN.vibes(mtof(m),t,1,2,sfxIn)]);
  for (const m of up(rh))   list.push(['rhodes', m, 1.15, t=>SYN.rhodes(mtof(m),t,1,2,sfxIn)]);
  for (const m of up(bass)) list.push(['bass',   m, .85,  t=>SYN.bass(m,t,2,1)]);
  return list;
}
function texList(){
  const list = [];
  for (let v = 0; v < TEX_VARIANTS; v++) for (const n in TEX) list.push(['tex', n, TEX[n][0], TEX[n][1]]);
  return list;
}

// ── render ──
async function render(len, fn){
  const off = new OfflineAudioContext(1, Math.ceil(len*SR), SR);
  actx = off; sfxIn = off.destination; LAY.bass = LAY.drums = off.destination;
  fn(0);
  return (await off.startRendering()).getChannelData(0);
}
// syncChirp() es del juego: lo genera igual al buscarlo
async function sprite(list){
  const parts = [], bufs = [];
  let pos = SYNC_AT + SYNC_LEN + GAP;
  for (const [grp, key, len, fn] of list){
    const d = await render(len, fn);
    parts.push([grp, key, pos, d.length]); bufs.push([pos, d]);
    pos += d.length + GAP;
  }
  const pcm = new Float32Array(pos);
  pcm.set(syncChirp(SYNC_LEN, SR), SYNC_AT);
  for (const [p, d] of bufs) pcm.set(d, p);
  return { parts, pcm };
}
async function post(path, body){
  const r = await fetch(path, { method:'POST', body });
  if (!r.ok) throw new Error(path + ': ' + r.status);
}
addEventListener('load', async () => {
  try {
    // el ruido de los golpes, una vez, como hacía el juego al desbloquear
    noiseBuf = new AudioBuffer({ length:SR, sampleRate:SR, numberOfChannels:1 });
    const nd = noiseBuf.getChannelData(0); for (let i=0;i<nd.length;i++) nd[i] = arand()*2-1;
    const music = await sprite(musicList()), tex = await sprite(texList());
    await post('/__pcm/music', music.pcm.buffer);
    await post('/__pcm/tex', tex.pcm.buffer);
    await post('/__manifest', JSON.stringify({ sr:SR, syncAt:SYNC_AT, syncLen:SYNC_LEN,
      music:music.parts, tex:tex.parts }));
  } catch(e){ post('/__error', String(e && e.stack || e)); }
});
})();
