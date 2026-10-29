// Motor de sonido. Dos fuentes musicales que nunca se pisan: preescucha (detrás de la puerta) y canción
// (master intacto). Sin música de fondo: el ambiente es lluvia y viento (archivo en bucle) más el viento que
// acompaña el movimiento y los truenos, sintetizados en vivo.
// El ambiente va en un elemento <audio> real a propósito: en iPhone el audio solo sintetizado se calla con el
// interruptor de silencio, y un elemento sonando hace que todo lo demás también se oiga.
import { CANCIONES } from './datos.js';

const pre = new Audio(); pre.loop = true; pre.preload = 'auto';
const song = new Audio(); song.preload = 'metadata';
const amb = new Audio('audio/ambiente.m4a'); amb.loop = true; amb.preload = 'auto';
export const elementos = { pre, song, amb };

// viento: 1 en la nave; cede ante la preescucha y calla dentro de una habitación (la canción manda)
export const NIVEL = { pre: 1, viento: .16, trueno: .5, vientoPre: .3, lluvia: .55 };   // lluvia: ganancia del archivo de ambiente (ya mezclado a −20 dBFS RMS)

let analizador, graves, mediaGraves = 0, picoGraves = .05, ctx, master, preG, songG, vientoG, vientoF, cancionPre = -1, cancionSong = -1;
let tokPre = 0, tokSong = 0; // cada pausa diferida solo actúa si nadie volvió a usar esa fuente
let cedeViento = 1, ultimoViento = [0, 420], lluviaG = null, ultimaLluvia = 0;
export let activo = false;
let mudo = false;

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
  // derivación para el pulso del fondo (solo escucha: no cambia lo que suena)
  analizador = ctx.createAnalyser(); analizador.fftSize = 512; analizador.smoothingTimeConstant = .55; songG.connect(analizador);
  // viento: ruido en bucle, filtrado; su nivel lo mueve la escena
  const n = ctx.sampleRate * 4, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let br = 0; for (let i = 0; i < n; i++) { br = br * .985 + (Math.random() * 2 - 1) * .015; d[i] = br * 6 + (Math.random() * 2 - 1) * .05; } }
  const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
  vientoF = ctx.createBiquadFilter(); vientoF.type = 'bandpass'; vientoF.frequency.value = 420; vientoF.Q.value = .6;
  vientoG = ctx.createGain(); vientoG.gain.value = 0;
  src.connect(vientoF).connect(vientoG).connect(master); src.start();
  // lluvia y viento de fondo: archivo en bucle (tools/ambiente.py) por un elemento <audio>; su nivel lo pone la nave
  lluviaG = ctx.createGain(); lluviaG.gain.value = 0;
  ctx.createMediaElementSource(amb).connect(lluviaG).connect(master);
}

function rampa(g, v, seg = .5, cuando = 0) {
  if (!g) return;
  const t = ctx.currentTime + cuando;
  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
  g.gain.setTargetAtTime(v, t, Math.max(.01, seg / 3));
}

// Arranca el audio dentro de un gesto. Devuelve si quedó sonando. Nunca se queda esperando: si el navegador no
// cuenta el gesto (en el teléfono, apoyar el dedo o desplazar no cuentan; soltar un toque sí), devuelve false y
// el siguiente gesto lo vuelve a intentar.
export async function activar() {
  if (!ctx) crear();
  sesionReproduccion();
  amb.play().catch(() => {});                       // dentro del gesto y antes de cualquier espera
  if (!activo) {
    // Safari/iOS: cada elemento debe reproducirse una vez dentro del gesto, antes de cualquier espera (en silencio)
    if (!pre.src) pre.src = fuentePre(0);
    if (!song.src) song.src = fuenteSong(0);
    const t = tokPre;
    pre.play().then(() => { if (t === tokPre) pre.pause(); }).catch(() => {});
    if (!quiere) song.play().catch(() => {});       // el evento 'play' la detiene al instante
  }
  const reanudado = ctx.resume().then(() => true, () => false);
  await Promise.race([reanudado, new Promise(r => setTimeout(r, 700))]);
  if (ctx.state !== 'running' || amb.paused) return false;
  activo = true;
  fundir(master, mudo ? 0 : 1, FUNDIDO.silencio);
  return true;
}
// Intento sin gesto: si el navegador deja reanudar el audio, el ambiente suena desde el principio; si no, se
// queda esperando (activar() lo arrancará con el primer gesto). Nunca bloquea.
// iOS 17+: tratar el sonido como reproducción (como la música), no como «ambiente» que el interruptor silencia
function sesionReproduccion() { try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {} }
export async function intentarActivar() {
  if (activo) return true;
  if (!ctx) crear();
  sesionReproduccion();
  amb.play().catch(() => {});
  ctx.resume().catch(() => {});
  await new Promise(r => setTimeout(r, 350));
  if (ctx.state !== 'running' || amb.paused) return false;   // sin el elemento sonando no cuenta como activado
  activo = true;
  fundir(master, mudo ? 0 : 1, FUNDIDO.silencio);
  return true;
}
export const contexto = () => ctx;
// energía de graves de la canción (0..1, relativa a su propio máximo reciente): late con el bombo y el bajo
export function pulso() {
  if (!analizador) return 0;
  graves ||= new Uint8Array(analizador.frequencyBinCount);
  analizador.getByteFrequencyData(graves);
  const e = (graves[1] + graves[2] + graves[3] + graves[4]) / 1020;
  // solo lo que sobresale de la media lenta: los golpes, no el bajo sostenido
  mediaGraves += (e - mediaGraves) * .04;
  picoGraves = Math.max(e - mediaGraves, picoGraves * .997, .03);
  return Math.min(1, Math.max(0, (e - mediaGraves) / picoGraves));
}
// estado de la mezcla (para verificación)
export const niveles = () => ctx && ({
  master: master.gain.value, cancion: volG.gain.value,   // sin redondeo: el silencio debe ser 0 exacto
  pre: +preG.gain.value.toFixed(3),
  song: +songG.gain.value.toFixed(3), viento: +vientoG.gain.value.toFixed(3), lluvia: +lluviaG.gain.value.toFixed(3), cede: cedeViento,
  sonando: { pre: !pre.paused, song: !song.paused, amb: !amb.paused },
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

// ---- preescucha ----
export function prepararPre(i) {               // llamada dentro del gesto en táctil
  if (!ctx) return;
  tokPre++;
  if (cancionPre !== i) { cancionPre = i; pre.src = fuentePre(i); }
  if (pre.paused) pre.play().catch(() => {});
}
export function abrirPre() { tokPre++; rampa(preG, NIVEL.pre, .7); ceder(NIVEL.vientoPre, .9); }
export function cerrarPre(volverAmbiente = true) {
  if (!ctx) return;
  rampa(preG, 0, .55);
  if (volverAmbiente) ceder(1, 1.4);
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
  // si la carga falló (red cortada, servidor caído) se vuelve a pedir: si no, se quedaría muda para siempre
  if (cancionSong !== i || song.error) { cancionSong = i; song.src = fuenteSong(i); song.load(); }
}
export function reproducir() {
  quiere = true; marcar(); avisar();
  if (cambiando) return;                     // el cambio en curso la arrancará
  if (song.error) { const t = song.currentTime; song.load(); song.currentTime = t; }
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
  cedeViento = 0;                            // la ráfaga de la entrada sigue; después el viento no vuelve hasta salir
  if (lluviaG) rampa(lluviaG, 0, Math.max(.4, retraso));
  detenerPreYa();
  cargarCancion(i);
  song.currentTime = 0;
  if (!ctx) { quiere = false; avisar(); return; }   // «Sin sonido»: se carga pero no suena
  quiere = true; marcar(); avisar();
  silenciarYa(songG);
  song.play().catch(() => {});
  subir(songG, 1.4, retraso);
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
  if (!ctx) { song.pause(); cedeViento = 1; return; }   // sin audio aún: el ambiente queda listo para cuando arranque
  rampa(songG, 0, .5);                       // cola breve de 0,5 s, luego parada real
  setTimeout(() => { if (!quiere) song.pause(); }, 550);
  ceder(1, 2.5);                             // al volver solo regresa el ambiente
}

// ---- viento ----
export function viento(nivel, frec = 420, seg = .25) {
  if (!ctx) return;
  ultimoViento = [nivel, frec];
  rampa(vientoG, Math.min(1, nivel) * NIVEL.viento * cedeViento, seg);
  vientoF.frequency.setTargetAtTime(frec, ctx.currentTime, seg / 3);
}
function ceder(k, seg) { cedeViento = k; if (ctx) { viento(ultimoViento[0], ultimoViento[1], seg); lluvia(ultimaLluvia, seg); } }
// lluvia: 0..1; cede igual que el viento (preescucha, habitación)
export function lluvia(nivel, seg = .5) {
  if (!ctx) return;
  ultimaLluvia = nivel;
  rampa(lluviaG, Math.min(1, nivel) * NIVEL.lluvia * cedeViento, seg);
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

// al volver a la pestaña o desbloquear el teléfono, el sistema puede haber pausado el ambiente
// en segundo plano el ambiente se pausa (no debe sonar con la pestaña oculta) y vuelve al regresar
document.addEventListener('visibilitychange', () => { if (document.hidden) amb.pause(); else if (activo && amb.paused) amb.play().catch(() => {}); });
export function silencioTotal() { // al ocultar la pestaña durante una preescucha
  if (!ctx) return;
  tokPre++; rampa(preG, 0, .1); pre.pause();
}
