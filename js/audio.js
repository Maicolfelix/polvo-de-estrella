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

// ---- volumen de la canción: una sola ganancia, sin efectos ----
// 0..1 (100 % = nivel del master, sin amplificar). El silencio general (master) tiene prioridad.
let volCancion = 1, volG = null;
export const volumen = () => volCancion;

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
  volG = ctx.createGain(); volG.gain.value = volCancion;
  ctx.createMediaElementSource(song).connect(volG).connect(songG);
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
  fundir(master, mudo ? 0 : 1, FUNDIDO.silencio);
  return ctx;
}
export const contexto = () => ctx;
// estado de la mezcla (para verificación)
export const niveles = () => ctx && ({
  master: master.gain.value, cancion: volG.gain.value,   // sin redondeo: el silencio debe ser 0 exacto
  inst: +instG.gain.value.toFixed(3), pre: +preG.gain.value.toFixed(3),
  song: +songG.gain.value.toFixed(3), viento: +vientoG.gain.value.toFixed(3),
  sonando: { inst: !inst.paused, pre: !pre.paused, song: !song.paused },
  fuentes: { pre: pre.src.split('/').pop(), song: song.src.split('/').pop() },
});
// el volumen del reproductor es el de la canción (100 % = nivel base, sin amplificar); el silencio general manda
// Fundido lineal con final exacto: termina en `v` (0 incluido) a los `seg` segundos. Cada llamada cancela
// la anterior desde el valor actual, así que silenciar/reactivar rápido no deja nada programado.
function fundir(g, v, seg) {
  const t = ctx.currentTime;
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(v, t + seg);
}
export const FUNDIDO = { volumen: .1, silencio: .25 };
export function setVolumen(v) {
  volCancion = Math.min(1, Math.max(0, v));
  if (volG) fundir(volG, volCancion, FUNDIDO.volumen);
}
export function setMudo(m) { mudo = m; if (ctx) fundir(master, m ? 0 : 1, FUNDIDO.silencio); }
export const estaMudo = () => mudo || !activo;

const fuentePre = i => `audio/${CANCIONES[i].n}-pre.m4a`;
const fuenteSong = i => `audio/${CANCIONES[i].n}.m4a`;

// ---- ambiente (nave / exterior) ----
export function ambiente(on, seg = 2.5) {
  if (!ctx) return;
  const yo = ++tokAmb;
  if (on) { inst.play().catch(() => {}); rampa(instG, NIVEL.inst, seg); }
  else { rampa(instG, 0, seg); setTimeout(() => { if (yo === tokAmb) inst.pause(); }, seg * 1000 + 600); }
}

// ---- preescucha ----
export function prepararPre(i) {               // llamada dentro del gesto en táctil
  if (!ctx) return;
  tokPre++;
  if (cancionPre !== i) { cancionPre = i; pre.src = fuentePre(i); }
  if (pre.paused) pre.play().catch(() => {});
}
export function abrirPre() { tokPre++; tokAmb++; rampa(preG, NIVEL.pre, .7); rampa(instG, NIVEL.instDuck, .9); }
export function cerrarPre(volverAmbiente = true) {
  if (!ctx) return;
  rampa(preG, 0, .55);
  if (volverAmbiente) { tokAmb++; rampa(instG, NIVEL.inst, 1.4); }
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
  setTimeout(() => { if (!quiere) song.pause(); }, 550);
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
