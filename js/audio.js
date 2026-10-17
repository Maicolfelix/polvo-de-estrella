// Motor de sonido. Tres fuentes musicales que nunca se pisan:
//   instrumental (con reverb ambiental), preescucha (detrás de la puerta) y canción (master intacto).
// Más un viento sintetizado que acompaña el movimiento.
import { CANCIONES } from './datos.js';

const inst = new Audio(); inst.loop = true; inst.preload = 'auto';
const pre = new Audio(); pre.loop = true; pre.preload = 'auto';
const song = new Audio(); song.preload = 'metadata';
export const elementos = { inst, pre, song };

// Reverb del ambiente. Valores ajustados midiendo picos/RMS con un render offline (ver verificarReverb).
export const REVERB = { seco: .86, humedo: .45, duracion: 2.6, predelay: .024, pasaAltos: 240, pasaBajos: 6200 };
export const NIVEL = { inst: .3, instDuck: .08, pre: 1, viento: .16, trueno: .5 }; // inst .3 ≈ −4,4 dB respecto a antes: fondo discreto

let ctx, master, instG, preG, songG, vientoG, vientoF, cancionPre = -1, cancionSong = -1;
let tokPre = 0, tokSong = 0, tokAmb = 0; // cada pausa diferida solo actúa si nadie volvió a usar esa fuente
export let activo = false;
let mudo = false;

function impulso(c, { duracion, predelay }) {
  const sr = c.sampleRate, n = Math.floor(sr * (duracion + predelay)), ir = c.createBuffer(2, n, sr);
  const p0 = Math.floor(predelay * sr), tau = duracion / 6.9; // -60 dB al final
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let lp = 0;
    for (let i = p0; i < n; i++) {
      const t = (i - p0) / sr;
      const a = .25 + .65 * Math.min(1, t / duracion);       // se oscurece al decaer
      lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
      d[i] = lp * Math.exp(-t / tau) * 2.2;
    }
    // reflexiones tempranas, distintas por canal para dar anchura sin borrar el centro
    for (const [ms, g] of [[7, .5], [13, .38], [21, .3], [29, .22], [41, .16]]) d[p0 + Math.floor((ms + ch * 2.3) * sr / 1000)] += g * (ch ? -1 : 1);
  }
  return ir;
}

function cadenaReverb(c, entrada, salida, R = REVERB) {
  const seco = c.createGain(); seco.gain.value = R.seco;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = R.pasaAltos; hp.Q.value = .5;
  const conv = c.createConvolver(); conv.buffer = impulso(c, R);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = R.pasaBajos; lp.Q.value = .5;
  const hum = c.createGain(); hum.gain.value = R.humedo;
  entrada.connect(seco).connect(salida);
  entrada.connect(hp).connect(conv).connect(lp).connect(hum).connect(salida);
}

// ---- Tu sonido: ajustes de escucha, solo sobre la canción completa ----
// graves: estante en 150 Hz (cuerpo bajo la voz, sin retumbe) · medios: campana ancha (Q 0,9) en 1,4 kHz,
// presencia de voz y guitarra · agudos: estante en 6 kHz (aire y brillo, por encima de las sibilantes).
export const PREFS_INICIALES = Object.freeze({ cancion: 100, graves: 0, medios: 0, agudos: 0, espacio: 0, ambiente: 100 });
const EQ = { graves: { tipo: 'lowshelf', f: 150 }, medios: { tipo: 'peaking', f: 1400, q: .9 }, agudos: { tipo: 'highshelf', f: 6000 } };
// espacio al 100 %: envío ≈ −11 dB, cola de 1,5 s con pre-delay de 28 ms; filtrado para no empastar graves ni sibilantes
export const ESPACIO = { duracion: 1.5, predelay: .028, pasaAltos: 350, pasaBajos: 5500, maximo: .28 };

function irEspacio(c) {
  const sr = c.sampleRate, p0 = Math.floor(ESPACIO.predelay * sr), n = p0 + Math.floor(ESPACIO.duracion * sr), ir = c.createBuffer(2, n, sr);
  const tau = ESPACIO.duracion / 6.9;
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    for (let i = p0; i < n; i++) { const t = (i - p0) / sr, a = .3 + .6 * Math.min(1, t / ESPACIO.duracion); lp = lp * a + (Math.random() * 2 - 1) * (1 - a); d[i] = lp * Math.exp(-t / tau) * 2; }
  }
  return ir;
}
// Una sola cadena por contexto; se crea una vez y solo se reajustan sus parámetros.
export function cadenaCancion(c, entrada, salida) {
  const comp = c.createGain();                         // margen: compensa el realce para no saturar
  entrada.connect(comp);
  let prev = comp; const bandas = {};
  for (const [k, d] of Object.entries(EQ)) {
    const b = c.createBiquadFilter(); b.type = d.tipo; b.frequency.value = d.f; if (d.q) b.Q.value = d.q; b.gain.value = 0;
    prev.connect(b); prev = b; bandas[k] = b;
  }
  const suma = c.createGain();
  prev.connect(suma);                                  // señal seca: la voz siempre al frente
  const envio = c.createGain(); envio.gain.value = 0;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = ESPACIO.pasaAltos;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = ESPACIO.pasaBajos;
  const ir = irEspacio(c);
  let conv = c.createConvolver(); conv.normalize = true; conv.buffer = ir;
  prev.connect(envio); envio.connect(hp); conv.connect(lp); lp.connect(suma);
  let colaConectada = false, tCola;
  const conectarCola = on => {                         // sin espacio, la convolución no trabaja (ahorro en teléfono)
    clearTimeout(tCola);
    if (on && !colaConectada) { hp.connect(conv); colaConectada = true; }
    if (!on && colaConectada) tCola = setTimeout(() => { hp.disconnect(); colaConectada = false; }, 300);
  };
  // Sin compresor: el DynamicsCompressor del navegador añade ganancia de compensación y alteraría el master
  // aun en posición neutra. El margen lo da `comp` (−realce dB), medido sin saturación en las nueve canciones.
  const vol = c.createGain();
  suma.connect(vol).connect(salida);
  return {
    aplicar(p, original, seg = .04) {
      const t = c.currentTime, k = original ? 0 : 1;
      for (const b of Object.keys(EQ)) bandas[b].gain.setTargetAtTime(p[b] * k, t, seg);
      const humedo = p.espacio / 100 * ESPACIO.maximo * k;
      envio.gain.setTargetAtTime(humedo, t, seg);
      const realce = Math.max(0, p.graves, p.medios, p.agudos) * k + 1.5 * (p.espacio / 100) * k;
      comp.gain.setTargetAtTime(10 ** (-realce / 20), t, seg);
      vol.gain.setTargetAtTime(p.cancion / 100, t, seg);
      conectarCola(humedo > 0);
    },
    // pausa/cambio: la cola guardada se descarta, reanudar nunca recupera reverb vieja
    vaciarCola() {
      const nuevo = c.createConvolver(); nuevo.normalize = true; nuevo.buffer = ir;
      if (colaConectada) hp.disconnect();
      conv.disconnect(); conv = nuevo; conv.connect(lp);
      if (colaConectada) hp.connect(conv);
    },
  };
}
let prefs = { ...PREFS_INICIALES }, original = false, cs = null;
export const preferencias = () => ({ ...prefs });
export const comparandoOriginal = () => original;
export function ponerPreferencias(p) {
  for (const k of Object.keys(PREFS_INICIALES)) if (Number.isFinite(+p?.[k])) prefs[k] = +p[k];
  cs?.aplicar(prefs, original);
  if (instG && !enHabitacion && !inst.paused) rampa(instG, nivelInst(), .3);
}
export function compararOriginal(on) { original = !!on; cs?.aplicar(prefs, original, .02); }
const nivelInst = () => NIVEL.inst * prefs.ambiente / 100;
const nivelDuck = () => NIVEL.instDuck * prefs.ambiente / 100;

function sala(c, sec) {
  const n = c.sampleRate * sec | 0, b = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
  return b;
}

function crear() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // iOS suspende el contexto tras una llamada o al bloquear la pantalla: se reanuda con el siguiente toque
  const reanudar = () => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); };
  document.addEventListener('pointerdown', reanudar, true);
  document.addEventListener('keydown', reanudar, true);
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  inst.src = 'audio/instrumental.m4a';
  instG = ctx.createGain(); instG.gain.value = 0; instG.connect(master);
  cadenaReverb(ctx, ctx.createMediaElementSource(inst), instG);
  // Preescucha "al otro lado de la puerta": agudos algo atenuados + sala corta; la voz sigue clara.
  const sPre = ctx.createMediaElementSource(pre);
  const shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 3400; shelf.gain.value = -6;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 10000; lp.Q.value = .5;
  const conv = ctx.createConvolver(); conv.buffer = sala(ctx, .6);
  const dry = ctx.createGain(); dry.gain.value = .88; const wet = ctx.createGain(); wet.gain.value = .22;
  preG = ctx.createGain(); preG.gain.value = 0;
  sPre.connect(shelf).connect(lp); lp.connect(dry).connect(preG); lp.connect(conv).connect(wet).connect(preG);
  preG.connect(master);
  songG = ctx.createGain(); songG.gain.value = 0;   // compuerta de pausa: va al final, corta también la cola
  cs = cadenaCancion(ctx, ctx.createMediaElementSource(song), songG);
  cs.aplicar(prefs, original, .001);
  songG.connect(master);
  // viento: ruido en bucle, filtrado; su nivel lo mueve la escena
  const n = ctx.sampleRate * 4, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let br = 0; for (let i = 0; i < n; i++) { br = br * .985 + (Math.random() * 2 - 1) * .015; d[i] = br * 6 + (Math.random() * 2 - 1) * .05; } }
  const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
  vientoF = ctx.createBiquadFilter(); vientoF.type = 'bandpass'; vientoF.frequency.value = 420; vientoF.Q.value = .6;
  vientoG = ctx.createGain(); vientoG.gain.value = 0;
  src.connect(vientoF).connect(vientoG).connect(master); src.start();
}

function rampa(g, v, seg = .5, cuando = 0) {
  if (!g) return;
  const t = ctx.currentTime + cuando;
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
  g.gain.setTargetAtTime(v, t, Math.max(.01, seg / 3));
}

export async function activar() {
  if (!ctx) crear();
  await ctx.resume();
  if (!activo) {
    // Safari/iOS: cada elemento debe reproducirse una vez dentro del gesto (en silencio)
    if (!pre.src) pre.src = fuentePre(0);
    if (!song.src) song.src = fuenteSong(0);
    const t = tokPre;
    pre.play().then(() => { if (t === tokPre) pre.pause(); }).catch(() => {});
    if (!quiere) song.play().catch(() => {});       // el evento 'play' la detiene al instante
  }
  activo = true;
  rampa(master, mudo ? 0 : 1, .3);
  return ctx;
}
export const contexto = () => ctx;
// estado de la mezcla (para verificación)
export const niveles = () => ctx && ({
  master: +master.gain.value.toFixed(3), inst: +instG.gain.value.toFixed(3), pre: +preG.gain.value.toFixed(3),
  song: +songG.gain.value.toFixed(3), viento: +vientoG.gain.value.toFixed(3),
  sonando: { inst: !inst.paused, pre: !pre.paused, song: !song.paused },
  fuentes: { pre: pre.src.split('/').pop(), song: song.src.split('/').pop() },
});
// el volumen del reproductor es el de la canción (100 % = nivel base, sin amplificar); el silencio general manda
export function setVolumen(v) { ponerPreferencias({ ...prefs, cancion: Math.round(v * 100) }); }
export function setMudo(m) { mudo = m; if (ctx) rampa(master, m ? 0 : 1, .25); }
export const estaMudo = () => mudo || !activo;

const fuentePre = i => `audio/${CANCIONES[i].n}-pre.m4a`;
const fuenteSong = i => `audio/${CANCIONES[i].n}.m4a`;

// ---- ambiente (nave / exterior) ----
export function ambiente(on, seg = 2.5) {
  if (!ctx) return;
  const yo = ++tokAmb;
  if (on) { inst.play().catch(() => {}); rampa(instG, nivelInst(), seg); }
  else { rampa(instG, 0, seg); setTimeout(() => { if (yo === tokAmb) inst.pause(); }, seg * 1000 + 600); }
}

// ---- preescucha ----
export function prepararPre(i) {               // llamada dentro del gesto en táctil
  if (!ctx) return;
  tokPre++;
  if (cancionPre !== i) { cancionPre = i; pre.src = fuentePre(i); }
  if (pre.paused) pre.play().catch(() => {});
}
export function abrirPre() { tokPre++; tokAmb++; rampa(preG, NIVEL.pre, .7); rampa(instG, nivelDuck(), .9); }
export function cerrarPre(volverAmbiente = true) {
  if (!ctx) return;
  rampa(preG, 0, .55);
  if (volverAmbiente) { tokAmb++; rampa(instG, nivelInst(), 1.4); }
  const yo = ++tokPre;
  setTimeout(() => { if (yo === tokPre) pre.pause(); }, 900);
}
export function detenerPre() { if (!ctx) return; const yo = ++tokPre; rampa(preG, 0, .2); setTimeout(() => { if (yo === tokPre) pre.pause(); }, 300); }

// ---- canción: un solo controlador ----
// `quiere` es la verdad (lo que el usuario pidió); el elemento <audio> se ajusta a ella.
// Cualquier reproducción que arranque tarde (promesa pendiente, desbloqueo iOS, carga lenta)
// y no coincida con `quiere` se corta en el evento 'play'.
let quiere = false, cambiando = false, tokCambio = 0, ultimaAccion = 0, enHabitacion = false;
const avisos = new Set();
export const alCambiarEstado = f => avisos.add(f);
const avisar = () => avisos.forEach(f => f(quiere));
export const estaSonando = () => quiere;
const marcar = () => { ultimaAccion = performance.now(); };

song.addEventListener('play', () => { if (!quiere || cambiando) song.pause(); });
song.addEventListener('ended', () => { quiere = false; avisar(); });
// pausa ajena (llamada, bloqueo de pantalla, auriculares): el botón debe reflejarla
song.addEventListener('pause', () => { if (quiere && !cambiando && performance.now() - ultimaAccion > 500) { quiere = false; avisar(); } });
// la preescucha nunca suena con una habitación abierta
pre.addEventListener('play', () => { if (enHabitacion) pre.pause(); });

function silenciarYa(g) { if (!ctx) return; const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); }
function subir(g, seg, retraso = 0) {
  if (!ctx) return;
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
  g.gain.setTargetAtTime(1, t + retraso, seg / 3);
}
function detenerPreYa() { tokPre++; if (ctx) silenciarYa(preG); pre.pause(); }

export function cargarCancion(i) {
  if (cancionSong !== i) { cancionSong = i; song.src = fuenteSong(i); song.load(); }
}
export function reproducir() {
  quiere = true; marcar(); avisar();
  if (cambiando) return;                     // el cambio en curso la arrancará
  song.play().catch(() => {});
  subir(songG, .08);                         // entrada de 80 ms: sin chasquido
}
export function pausar() {
  quiere = false; marcar(); avisar();
  silenciarYa(songG);                        // silencio inmediato…
  song.pause();                              // …y parada real: conserva la posición
  cs?.vaciarCola();
}
export function playPausa() { quiere ? pausar() : reproducir(); }

export function entrarCancion(i, retraso = .9) {
  enHabitacion = true; tokCambio++; cambiando = false;
  detenerPreYa();
  cargarCancion(i);
  song.currentTime = 0;
  if (!ctx) { quiere = false; avisar(); return; }   // «Sin sonido»: se carga pero no suena
  quiere = true; marcar(); avisar();
  silenciarYa(songG);
  song.play().catch(() => {});
  subir(songG, 1.4, retraso);
  ambiente(false, 1.8);
}
export function cambiarCancion(i) {
  const yo = ++tokCambio;
  if (!ctx) { cargarCancion(i); song.currentTime = 0; return; }
  quiere = true; marcar(); avisar();          // pasar de canción implica escucharla
  cambiando = true;
  rampa(songG, 0, .12);
  setTimeout(() => {
    if (yo !== tokCambio) return;              // otro cambio o la salida lo invalidaron
    cambiando = false;
    song.pause();
    cs?.vaciarCola();
    cargarCancion(i);
    song.currentTime = 0;
    if (quiere) { song.play().catch(() => {}); subir(songG, .6); }
  }, 140);
}
export function salirCancion() {
  enHabitacion = false; tokCambio++; cambiando = false;
  quiere = false; marcar(); avisar();
  if (!ctx) { song.pause(); return; }
  rampa(songG, 0, .5);                       // cola breve de 0,5 s, luego parada real
  setTimeout(() => { if (!quiere) { song.pause(); cs?.vaciarCola(); } }, 550);
  ambiente(true, 3.2);
}

// ---- viento ----
export function viento(nivel, frec = 420, seg = .25) {
  if (!ctx) return;
  rampa(vientoG, Math.min(1, nivel) * NIVEL.viento, seg);
  vientoF.frequency.setTargetAtTime(frec, ctx.currentTime, seg / 3);
}
// ráfaga coordinada con la apertura: sube con el avance de cámara y se va antes de que entre la voz
export function rafaga(dur = 2.2, k = 1) {
  if (!ctx) return;
  const t = ctx.currentTime, g = vientoG.gain, f = vientoF.frequency;
  g.cancelScheduledValues(t); f.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(NIVEL.viento * 2.4 * k, t + dur * .55);
  g.linearRampToValueAtTime(0, t + dur * 1.15);
  f.setValueAtTime(f.value, t);
  f.exponentialRampToValueAtTime(1400, t + dur * .55);
  f.exponentialRampToValueAtTime(360, t + dur * 1.1);
}

// trueno lejano tras cada rayo: ruido grave con envolvente lenta, siempre por debajo de la música
let bufTrueno;
export function trueno(fuerza, dist, dentro) {
  if (!ctx || !activo) return;
  if (!bufTrueno) {
    const n = ctx.sampleRate * 5; bufTrueno = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = bufTrueno.getChannelData(ch); let b = 0; for (let i = 0; i < n; i++) { b = b * .995 + (Math.random() * 2 - 1) * .05; d[i] = b; } }
  }
  const t = ctx.currentTime + .7 + dist / 500, s = ctx.createBufferSource(); s.buffer = bufTrueno;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(dentro ? 110 : 190, t); lp.frequency.exponentialRampToValueAtTime(70, t + 3.5);
  const g = ctx.createGain(), nivel = NIVEL.trueno * fuerza * (dentro ? .45 : 1);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(nivel, t + .35); g.gain.exponentialRampToValueAtTime(.0001, t + 4.2);
  s.connect(lp).connect(g).connect(master); s.start(t); s.stop(t + 4.5);
}

export function silencioTotal() { // al ocultar la pestaña durante una preescucha
  if (!ctx) return;
  tokPre++; rampa(preG, 0, .1); pre.pause();
}

// Mide la reverb sin tocar nada audible: render offline de 40 s del instrumental.
export async function verificarReverb(R = REVERB) {
  const datos = await (await fetch('audio/instrumental.m4a')).arrayBuffer();
  const tmp = new OfflineAudioContext(2, 44100, 44100);
  const buf = await tmp.decodeAudioData(datos);
  const medir = async conReverb => {
    const o = new OfflineAudioContext(2, 44100 * 40, 44100);
    const s = o.createBufferSource(); s.buffer = buf;
    if (conReverb) cadenaReverb(o, s, o.destination, R); else s.connect(o.destination);
    s.start(0, 30);
    const r = await o.startRendering();
    let pico = 0, sum = 0; const L = r.getChannelData(0), Rr = r.getChannelData(1);
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(Rr[i])); if (v > pico) pico = v; sum += L[i] * L[i]; }
    return { picoDb: +(20 * Math.log10(pico)).toFixed(2), rmsDb: +(10 * Math.log10(sum / L.length)).toFixed(2) };
  };
  return { seco: await medir(false), conReverb: await medir(true), niveles: NIVEL, reverb: R };
}

// Mide la cadena «Tu sonido» sin sonar: render offline de un tramo de la canción con unos ajustes dados.
// Devuelve pico, RMS y muestras saturadas (|x| ≥ 1) a la salida y a la entrada (master original).
export async function verificarCancion(i, p = PREFS_INICIALES, desde = 60, seg = 30, comparar = false) {
  const datos = await (await fetch(fuenteSong(i))).arrayBuffer();
  const buf = await new OfflineAudioContext(2, 44100, 44100).decodeAudioData(datos);
  const medir = r => {
    let pico = 0, sum = 0, sat = 0;
    for (let ch = 0; ch < 2; ch++) { const d = r.getChannelData(ch); for (let k = 0; k < d.length; k++) { const v = Math.abs(d[k]); if (v > pico) pico = v; if (v >= 1) sat++; sum += d[k] * d[k]; } }
    return { picoDb: +(20 * Math.log10(pico)).toFixed(2), rmsDb: +(10 * Math.log10(sum / (r.length * 2))).toFixed(2), saturadas: sat };
  };
  const o = new OfflineAudioContext(2, 44100 * seg, 44100), s = o.createBufferSource(); s.buffer = buf;
  const c = cadenaCancion(o, s, o.destination); c.aplicar(p, comparar, .001);
  s.start(0, desde);
  const salida = medir(await o.startRendering());
  const o2 = new OfflineAudioContext(2, 44100 * seg, 44100), s2 = o2.createBufferSource(); s2.buffer = buf; s2.connect(o2.destination); s2.start(0, desde);
  return { original: medir(await o2.startRendering()), salida, duracion: +buf.duration.toFixed(2) };
}
