import { CANCIONES } from './datos.js';
import * as A from './audio.js';
import { crearEscena } from './escena.js';
import { crearFondo } from './habitaciones.js';
import { lineasPresentacion } from './letras.js';
import { TIEMPOS } from './tiempos.js';

const $ = s => document.querySelector(s);
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('rm');
document.documentElement.classList.toggle('rm', RM);
const HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
// ?captura: bucle por temporizador para poder capturar la página aunque el navegador no pinte la pestaña
const CAPTURA = new URLSearchParams(location.search).has('captura');
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const fmt = s => isFinite(s) ? `${s / 60 | 0}:${String(s % 60 | 0).padStart(2, '0')}` : '0:00';

// nave → entrando → habitacion → saliendo → nave
let modo = 'nave', actual = -1, cargado = false;
let H = innerHeight, W = innerWidth;
const hab = $('#habitacion'), llegada = $('#llegada'), capa = $('#puertas'), velo = $('#velo');
const { song } = A.elementos;

/* ---------- escena ---------- */
const escena = crearEscena({
  canvas: $('#gl'), rm: RM, adaptar: !CAPTURA,
  alProgreso: p => { $('#cargaBarra').style.width = Math.round(p * 100) + '%'; $('#cargaTxt').textContent = `Preparando el lugar · ${Math.round(p * 100)}%`; },
  alCargar: () => {
    cargado = performance.now();   // instante en que el lugar está listo (medido en tools/medir-rendimiento.js)
    $('#carga').classList.add('lista');
  },
  alRayo: (f, d, dentro) => { if (modo === 'nave') A.trueno(f, d, dentro); },
});
function medir() {
  // ignora la barra de URL del móvil; vuelve a medir si la ventana empezó sin tamaño (pestaña oculta)
  if (innerWidth !== W || !medir.ok || !H) { W = innerWidth; H = innerHeight; medir.ok = H > 0; }
  escena.tamano(innerWidth, innerHeight);
  $('#recorrido').style.height = (escena.U_FIN + 1.1) * H + 'px';
}
addEventListener('resize', medir);
medir();
const fondo = crearFondo($('#fondo'), RM);

/* ---------- puertas accesibles sobre la escena ---------- */
const botones = CANCIONES.map((c, i) => {
  const b = document.createElement('button');
  b.className = 'puerta';
  b.setAttribute('aria-label', `${c.n}. ${c.titulo}`);
  b.innerHTML = '<span class="zona"></span><span class="rotulo"><span class="num"></span><span class="titulo"></span></span>';
  b.querySelector('.num').textContent = c.n;
  b.querySelector('.titulo').textContent = c.titulo;
  capa.appendChild(b);
  return b;
});
function colocarPuertas() {
  const rs = escena.rectPuertas(innerWidth, innerHeight);
  rs.forEach((r, i) => {
    const b = botones[i], foco = document.activeElement === b;
    const vis = r.visible && modo === 'nave';
    const op = vis ? (foco ? 1 : cl(1.55 - r.dist / 7.5)) : 0;
    b.style.transform = `translate3d(${r.x.toFixed(1)}px,${r.y.toFixed(1)}px,0)`;
    b.style.width = Math.max(0, r.w).toFixed(1) + 'px';
    b.style.height = Math.max(0, r.h).toFixed(1) + 'px';
    b.style.opacity = op.toFixed(2);
    b.classList.toggle('activa', vis && op > .35);
  });
}
const irAPuerta = i => scrollTo({ top: escena.uDePuerta(i) * H, behavior: RM ? 'auto' : 'smooth' });

/* ---------- preescucha ---------- */
const DELAY_HOVER = 260, DELAY_TOQUE = 380;
let escuchando = null, preTimer, uPre = 0;
const aviso = $('#aviso');
function avisar(t) { aviso.textContent = t; aviso.classList.add('ver'); clearTimeout(avisar.t); avisar.t = setTimeout(() => aviso.classList.remove('ver'), 2400); }
function iniciarPre(i, retardo) {
  if (modo !== 'nave') return;
  if (!A.activo || A.estaMudo()) { avisar('Activa el sonido para escuchar detrás de la puerta'); return; }
  if (escuchando != null && escuchando !== i) pararPre();
  A.prepararPre(i);                       // play() dentro del gesto (iOS); aún en silencio
  clearTimeout(preTimer);
  preTimer = setTimeout(() => {
    if (modo !== 'nave') return;
    escuchando = i; uPre = scrollY / H;
    botones[i].classList.add('escuchando');
    escena.preescucha(i, true);
    A.abrirPre();
  }, retardo);
}
function pararPre(volverAmbiente = true) {
  clearTimeout(preTimer);
  if (escuchando != null) { botones[escuchando].classList.remove('escuchando'); escena.preescucha(escuchando, false); }
  escuchando = null;
  A.cerrarPre(volverAmbiente && modo === 'nave');
}

botones.forEach((b, i) => {
  let t0 = null, largo = false, lpTimer, ignorarClick = false;
  b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') iniciarPre(i, DELAY_HOVER); });
  b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pararPre(); });
  b.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    t0 = { x: e.clientX, y: e.clientY }; largo = false; ignorarClick = false;
    iniciarPre(i, DELAY_TOQUE);
    lpTimer = setTimeout(() => { largo = true; navigator.vibrate?.(8); }, DELAY_TOQUE);
  });
  b.addEventListener('pointermove', e => {
    if (t0 && Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 10) { clearTimeout(lpTimer); if (!largo) pararPre(); t0 = null; ignorarClick = true; }
  });
  const soltar = e => {
    if (e.pointerType === 'mouse') return;
    clearTimeout(lpTimer);
    if (largo) ignorarClick = true;          // soltar tras mantener pulsado nunca entra
    pararPre(); t0 = null;
  };
  b.addEventListener('pointerup', soltar);
  b.addEventListener('pointercancel', soltar);
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('click', e => {
    if (ignorarClick) { ignorarClick = false; e.preventDefault(); return; }
    entrar(i);
  });
  b.addEventListener('keydown', e => {
    if (e.key === ' ') { e.preventDefault(); if (!e.repeat) iniciarPre(i, 0); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const j = cl(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1), 0, 8);
      botones[j].focus({ preventScroll: true }); irAPuerta(j);
    }
  });
  b.addEventListener('keyup', e => { if (e.key === ' ') { e.preventDefault(); pararPre(); } });
  b.addEventListener('focus', () => { if (b.matches(':focus-visible') && modo === 'nave') irAPuerta(i); });
});
document.addEventListener('mouseleave', () => { if (escuchando != null) pararPre(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(preTimer); if (escuchando != null) pararPre(); A.silencioTotal(); } });

/* ---------- entrar / habitación / volver ---------- */
const espera = ms => new Promise(r => setTimeout(r, ms));
async function entrar(i) {
  if (modo !== 'nave') return;
  modo = 'entrando';
  pararPre(false);
  // si la puerta no está delante (teclado, índice), primero se coloca la cámara frente a ella
  if (Math.abs(uSuave - escena.uDePuerta(i)) > .45) {
    velo.style.opacity = 1; await espera(260);
    scrollTo({ top: escena.uDePuerta(i) * H, behavior: 'auto' });
    uSuave = uObjetivo = escena.uDePuerta(i); escena.cancelarMezcla();
    escena.actualizar(.016, uSuave); velo.style.opacity = 0; await espera(200);
  }
  document.body.classList.add('bloqueado');
  capa.inert = llegada.inert = true;
  $('#ayuda').style.opacity = 0;
  if (A.activo) A.rafaga(RM ? 1 : 2.6, RM ? .35 : 1);
  A.entrarCancion(i, RM ? .25 : 1.15);          // sin sonido: solo carga, no suena
  pintarHabitacion(i, false); mostrarHueco(i);   // la habitación ya suena y se mueve: asoma por el hueco mientras se abre
  await escena.entrar(i);
  abrirHabitacion(i);
}
function pintarHabitacion(i, fundido) {
  const c = CANCIONES[i];
  const aplicar = () => {
    hab.style.setProperty('--luz', c.luz);
    $('#habNum').textContent = c.n;
    $('#hab-titulo').textContent = c.titulo;
    pintarLetra(c.n);                            // presentación fiel (js/letras.js) + tiempos si existen
    $('#habScroll').scrollTop = 0;
    $('#seek').value = 0; pintarRango($('#seek'));
    $('#tiempo').textContent = '0:00';
  };
  if (!fundido) { fondo.poner(i); return aplicar(); }
  hab.classList.add('cambiando');
  setTimeout(() => { fondo.poner(i); aplicar(); hab.classList.remove('cambiando'); }, 450);
}
// La habitación 2D se muestra en la página recortada con la forma del hueco de la puerta (calculada en cada
// fotograma por la escena) y aparece a medida que la puerta se abre y la cámara se alinea con ella. Al cruzar,
// el recorte cubre la pantalla y desaparece. Igual en cualquier dispositivo: es el mismo lienzo de la habitación.
let huecoDe = -1;
function mostrarHueco(i) {
  clearTimeout(mostrarHueco.t);
  huecoDe = i; hab.hidden = false;
  hab.classList.add('hueco', 'visible'); hab.classList.remove('listo');
  recortarHueco();
}
function quitarHueco() {
  huecoDe = -1; hab.classList.remove('hueco'); hab.style.clipPath = ''; hab.style.opacity = '';
}
function recortarHueco() {
  if (huecoDe < 0) return;
  const h = escena.huecoPantalla(huecoDe, innerWidth, innerHeight);
  if (!h) { hab.style.clipPath = ''; hab.style.opacity = 1; return; }   // la cámara ya cruza el hueco
  hab.style.clipPath = `polygon(${h.pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
  const ve = Math.min(1, Math.max(0, (h.abierto - .04) / .4)) * Math.min(1, Math.max(0, (h.alin - .55) / .3));
  hab.style.opacity = ve.toFixed(3);
}
function abrirHabitacion(i) {
  escena.terminarEntrada();
  actual = i;
  quitarHueco(); hab.classList.add('visible');   // el recorte ya llenaba la pantalla: sin fundido
  hab.hidden = false;
  document.body.classList.add('en-habitacion');
  requestAnimationFrame(() => hab.classList.add('visible'));
  $('#hab-titulo').focus({ preventScroll: true });
  pintarPlay();
  // la letra y los controles llegan cuando la habitación ya está estable
  clearTimeout(abrirHabitacion.t);
  abrirHabitacion.t = setTimeout(() => { if (modo !== 'nave' && modo !== 'saliendo') hab.classList.add('listo'); }, RM ? 150 : 650);
  setTimeout(() => { if (modo === 'entrando') { escena.terminarEntrada(true); modo = 'habitacion'; A.viento(0, 400, 1); } }, RM ? 420 : 750);
}
function cambiar(i) {
  i = (i + 9) % 9;
  if (modo !== 'habitacion') { if (modo === 'nave') irAPuerta(i); return; }
  actual = i;
  escena.ponerEnPuerta(i);
  pintarHabitacion(i, true);
  A.cambiarCancion(i);
  scrollTo({ top: escena.uDePuerta(i) * H, behavior: 'auto' });
  uSuave = uObjetivo = escena.uDePuerta(i);
}
function volver() {
  if (modo !== 'habitacion') return;
  const i = actual;
  modo = 'saliendo';
  A.salirCancion();
  document.body.classList.remove('bloqueado');
  scrollTo({ top: escena.uDePuerta(i) * H, behavior: 'auto' });
  uSuave = uObjetivo = escena.uDePuerta(i);
  escena.salir(i);
  escena.reponerPolvo();
  botones[i].classList.add('visitada');
  document.body.classList.remove('en-habitacion');
  capa.inert = llegada.inert = false;
  // la habitación vuelve a encogerse al hueco de la puerta mientras la cámara retrocede, y se apaga al cerrarse
  mostrarHueco(i);
  mostrarHueco.t = setTimeout(() => { if (huecoDe === i && modo !== 'entrando' && modo !== 'habitacion') { quitarHueco(); hab.classList.remove('visible'); hab.hidden = true; fondo.parar(); } }, RM ? 500 : 2600);
  setTimeout(() => { modo = 'nave'; botones[i].focus({ preventScroll: true }); }, RM ? 420 : 900);
}

/* ---------- letra sincronizada ---------- */
// El único reloj es el del reproductor (song.currentTime): pausar congela, buscar actualiza al instante.
const SILENCIO = 1.2;   // tras el final de una línea, segundos que sigue marcada antes de apagarse
const habScroll = $('#habScroll'), btnSeguir = $('#seguir');
const sync = { lineas: [], tiempos: null, activa: -1, pausa: -1, seguir: true, propio: 0, desde: 0, hasta: 0, t0: null };
// puntos que laten en los silencios largos (intro e instrumentales), como en Apple Music
const pausa = document.createElement('span');
pausa.className = 'pausa'; pausa.setAttribute('aria-hidden', 'true'); pausa.innerHTML = '<i></i><i></i><i></i>';
const PAUSA_MIN = 3.5;   // segundos de silencio a partir de los que se muestran
function pintarLetra(n) {
  const cont = $('#letra'), t = TIEMPOS[n] || null;
  cont.replaceChildren(...lineasPresentacion(n).map((txt, i) => {
    const el = document.createElement('span');
    el.className = txt.trim() ? 'linea' : 'linea vacia';
    el.textContent = txt;
    el.dataset.i = i;
    return el;
  }));
  Object.assign(sync, { lineas: [...cont.children], tiempos: t, activa: -1, pausa: -1, seguir: true, t0: null });
  marcarDistancias(-1);
  cont.classList.toggle('sincronizada', !!t);
  btnSeguir.hidden = true;
  $('#habNota').textContent = t ? '' : 'Letra sin sincronizar';
}
function lineaActiva(tm) {
  const L = sync.tiempos?.lineas; if (!L) return -1;
  let k = -1;
  for (let i = 0; i < L.length; i++) if (L[i] && L[i][0] <= tm) k = i;   // nunca una línea futura
  return k >= 0 && tm <= L[k][1] + SILENCIO ? k : -1;
}
// desplazamiento propio con frenado suave (el «smooth» del navegador es brusco y no se puede afinar)
function centrar(el) {
  const r = el.getBoundingClientRect(), c = habScroll.getBoundingClientRect();
  const y = Math.max(0, habScroll.scrollTop + r.top - c.top - c.height * .34);
  sync.propio = performance.now();
  if (RM) { habScroll.scrollTop = y; sync.t0 = null; return; }
  Object.assign(sync, { desde: habScroll.scrollTop, hasta: y, t0: performance.now() });
}
function deslizar(now) {
  if (sync.t0 == null) return;
  const k = Math.min(1, (now - sync.t0) / 950);
  habScroll.scrollTop = sync.desde + (sync.hasta - sync.desde) * (1 - (1 - k) ** 4);
  if (k === 1) sync.t0 = null;
}
// cada línea sabe a qué distancia está de la que suena: la letra se desenfoca y apaga hacia los lados
function marcarDistancias(k) {
  const ref = k >= 0 ? k : sync.pausa;
  sync.lineas.forEach((el, i) => {
    el.style.setProperty('--d', ref < 0 ? 0 : Math.min(4, Math.abs(i - ref)));
    el.classList.toggle('pasada', ref >= 0 && i < ref);
  });
}
// siguiente línea cantada después de tm (índice) o -1
function siguienteLinea(tm) {
  const L = sync.tiempos.lineas;
  for (let i = 0; i < L.length; i++) if (L[i] && L[i][0] > tm) return i;
  return -1;
}
function actualizarLetra() {
  deslizar(performance.now());
  if (!sync.tiempos) return;
  const tm = song.currentTime, k = lineaActiva(tm);
  // silencio largo: los puntos aparecen donde entrará la siguiente línea y se llenan hasta que llega
  let p = -1;
  if (k < 0) { const nx = siguienteLinea(tm); if (nx >= 0) { const prev = nx > 0 ? (sync.tiempos.lineas.slice(0, nx).filter(Boolean).at(-1)?.[1] ?? 0) : 0; if (sync.tiempos.lineas[nx][0] - prev >= PAUSA_MIN) p = nx; } }
  if (p >= 0) { const L = sync.tiempos.lineas[p], ini = p > 0 ? (sync.tiempos.lineas.slice(0, p).filter(Boolean).at(-1)?.[1] ?? 0) + SILENCIO : 0; pausa.style.setProperty('--lleno', Math.min(1, Math.max(0, (tm - ini) / Math.max(.1, L[0] - ini))).toFixed(3)); }
  if (k === sync.activa && p === sync.pausa) return;
  sync.lineas[sync.activa]?.classList.remove('activa');
  sync.activa = k;
  if (p !== sync.pausa) {
    sync.pausa = p;
    if (p >= 0) { sync.lineas[p].before(pausa); pausa.classList.add('ver'); if (sync.seguir) centrar(pausa); }
    else pausa.classList.remove('ver');
  }
  marcarDistancias(k);
  if (k < 0) return;
  sync.lineas[k].classList.add('activa');
  if (sync.seguir) centrar(sync.lineas[k]);
}
// tocar una línea lleva la canción a ese verso
$('#letra').addEventListener('click', e => {
  const el = e.target.closest('.linea'); const L = sync.tiempos?.lineas[+el?.dataset.i];
  if (!L || !song.duration) return;
  song.currentTime = L[0];
  sync.seguir = true; btnSeguir.hidden = true;
  centrar(el);
});
// desplazamiento manual: suspende el seguimiento hasta pulsar «Seguir canción»
function manual() {
  sync.t0 = null;
  if (!sync.tiempos || !sync.seguir) return;
  sync.seguir = false; btnSeguir.hidden = false;
}
habScroll.addEventListener('wheel', manual, { passive: true });
habScroll.addEventListener('touchmove', manual, { passive: true });
habScroll.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) manual(); });
habScroll.addEventListener('pointerdown', e => { if (e.target === habScroll) manual(); });   // barra de desplazamiento
btnSeguir.addEventListener('click', () => {
  sync.seguir = true; btnSeguir.hidden = true;
  const k = lineaActiva(song.currentTime);
  if (k >= 0) centrar(sync.lineas[k]); else habScroll.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
  $('#play').focus({ preventScroll: true });
});

/* ---------- reproductor ---------- */
function pintarRango(r) { r.style.setProperty('--v', (r.value - r.min) / (r.max - r.min) * 100 + '%'); }
// el botón refleja lo pedido (A.estaSonando), no el estado transitorio del <audio>
function pintarPlay() {
  const p = $('#play'), suena = A.estaSonando();
  p.classList.toggle('pausado', !suena);
  p.setAttribute('aria-label', suena ? 'Pausa' : 'Reproducir');
}
A.alCambiarEstado(pintarPlay);
let activando = false;
$('#play').addEventListener('click', async () => {
  if (activando) return;                       // toques repetidos mientras se desbloquea el audio
  if (!A.activo) { activando = true; try { await A.activar(); pintarSonido(); } finally { activando = false; } }
  A.playPausa();   // aunque el audio no arrancara, el reproductor sigue respondiendo
});
song.addEventListener('loadedmetadata', () => $('#duracion').textContent = fmt(song.duration));
let arrastrando = false;
song.addEventListener('timeupdate', () => {
  if (arrastrando || !song.duration) return;
  const s = $('#seek');
  s.value = song.currentTime / song.duration * 1000; pintarRango(s);
  s.setAttribute('aria-valuetext', `${fmt(song.currentTime)} de ${fmt(song.duration)}`);
  $('#tiempo').textContent = fmt(song.currentTime);
});
$('#seek').addEventListener('input', e => {
  arrastrando = true; pintarRango(e.target);
  if (song.duration) { song.currentTime = e.target.value / 1000 * song.duration; $('#tiempo').textContent = fmt(song.currentTime); }
});
$('#seek').addEventListener('change', () => arrastrando = false);
$('#anterior').addEventListener('click', () => cambiar(actual - 1));
$('#siguiente').addEventListener('click', () => cambiar(actual + 1));
$('#volver').addEventListener('click', volver);

/* ---------- sonido: silencio y volumen ---------- */
// Volumen de la canción 0–100 %, como un reproductor normal. Silenciar no pierde el nivel:
// al reactivar se recupera el último volumen distinto de cero. Nada de esto inicia ni reanuda una canción.
let mudo = false, vol = 100, ultimoVol = 100;
try { localStorage.removeItem('pde-tu-sonido'); } catch {}   // ajustes de «Tu sonido» (retirado): no deben quedar
{ const v = +leer('pde-vol'); if (leer('pde-vol') != null && v >= 0 && v <= 100) { vol = v; if (v > 0) ultimoVol = v; } }
{ const u = +leer('pde-vol-ultimo'); if (u > 0 && u <= 100) ultimoVol = u; }
A.setVolumen(vol / 100);
const silenciado = () => !A.activo || mudo || vol === 0;
function pintarSonido() {
  const off = silenciado(), r = $('#vol');
  $('#mudo').classList.toggle('silencio', off);
  $('#mudo').setAttribute('aria-pressed', off);
  $('#mudo').setAttribute('aria-label', off ? 'Activar sonido' : 'Silenciar');
  r.value = off ? 0 : vol;                                   // en silencio la barra se ve a cero…
  r.setAttribute('aria-valuetext', off ? 'Silenciado' : vol + ' %');
  pintarRango(r);
}
function ponerVol(v) {
  vol = v; if (v > 0) ultimoVol = v;
  A.setVolumen(v / 100);
  guardar('pde-vol', v); guardar('pde-vol-ultimo', ultimoVol);
}
async function alternarMudo(forzar) {
  if (!A.activo) { await A.activar(); mudo = false; A.setMudo(false); if (vol === 0) ponerVol(ultimoVol); pintarSonido(); return; }
  const callar = forzar ?? !silenciado();
  if (callar) mudo = true;
  else { mudo = false; if (vol === 0) ponerVol(ultimoVol); }   // …y al reactivar vuelve al último nivel
  A.setMudo(mudo);   // solo para esta visita: al volver a entrar siempre hay sonido
  if (mudo && escuchando != null) pararPre();
  pintarSonido();
}
$('#vol').addEventListener('input', async e => {
  const v = +e.target.value;
  if (v > 0 && !A.activo) { await A.activar(); }
  ponerVol(v);
  if (v > 0 && mudo) { mudo = false; A.setMudo(false); }      // subir la barra reactiva el sonido (no la reproducción)
  pintarSonido();
});
$('#mudo').addEventListener('click', () => alternarMudo());
// Sonido desde el principio: al cargar se intenta arrancar el ambiente sin esperar a nada (algunos navegadores
// lo permiten, sobre todo si la persona ya visitó la página). Si el navegador lo bloquea —todos los teléfonos y
// la mayoría de los ordenadores en la primera visita—, arranca con el primer gesto real en cualquier parte, y
// solo entonces se ve el aviso. Los mandos del reproductor gestionan su propio primer toque.
const MANDOS_SONIDO = '#mudo, #vol';
// Se escuchan todos los gestos que un navegador puede contar (soltar un toque, clic, tecla); se sigue intentando
// hasta que suena de verdad. Antes, el primer apoyo del dedo (que no cuenta) apagaba los intentos para siempre.
const GESTOS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
// Sin bloqueo entre intentos: en un toque, el apoyo del dedo no cuenta pero el soltarlo sí, y ese segundo intento
// no debe quedar esperando al primero.
async function despertarSonido(e) {
  if (!e.isTrusted) return;
  pedirGiro();                                   // iOS solo da el giroscopio tras un gesto
  if (A.activo || e.target.closest?.(MANDOS_SONIDO)) return;
  if (await A.activar()) { for (const ev of GESTOS) removeEventListener(ev, despertarSonido, true); mudo = false; A.setMudo(false); }
  pintarSonido();
}
for (const ev of GESTOS) addEventListener(ev, despertarSonido, true);
try { localStorage.removeItem('pde-mudo'); } catch {}   // ya no se recuerda el silencio entre visitas
// Si el navegador no deja sonar solo (todos los teléfonos y muchos ordenadores), la llegada pide un toque para
// entrar y no deja desplazar hasta entonces: desplazar no cuenta como gesto para el audio y la persona se quedaría
// sin sonido toda la visita. Con ese toque arranca todo el ambiente.
const capaToque = $('#entrarToque');
$('.entrar-texto').textContent = HOVER ? 'Haz clic para entrar' : 'Toca para entrar';
function entrarConToque() {
  capaToque.classList.add('ido'); document.body.classList.remove('bloqueado', 'esperando');
  setTimeout(() => { capaToque.hidden = true; }, 500);
}
capaToque.addEventListener('click', entrarConToque);   // el sonido lo arranca despertarSonido en el mismo gesto
const sinAutoplay = new URLSearchParams(location.search).has('sinautoplay');   // para probar el caso bloqueado
(sinAutoplay ? Promise.resolve(false) : A.intentarActivar()).then(ok => {
  if (ok) { mudo = false; A.setMudo(false); pintarSonido(); return; }
  if (A.activo) return;   // un gesto llegó antes
  scrollTo(0, 0); capaToque.hidden = false; document.body.classList.add('bloqueado', 'esperando');
});

/* ---------- mirar alrededor: ratón en el ordenador, giro del teléfono ---------- */
// La vista gira un poco hacia donde apunta el ratón o hacia donde se inclina el teléfono. Sobre una puerta,
// la vista se queda quieta (si no, la puerta se movería bajo el cursor).
const mira = { x: 0, y: 0, giro: false };
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || e.target.closest?.('.puerta')) return;
  mira.x = e.clientX / innerWidth * 2 - 1; mira.y = e.clientY / innerHeight * 2 - 1;
}, { passive: true });
document.addEventListener('mouseleave', () => { mira.x = mira.y = 0; });
// En el teléfono, como una foto de 360°: la cámara sigue el giro real del teléfono (orientación completa, sin el
// bloqueo que da leer solo la inclinación cuando se sostiene de pie). Android lo da sin pedir; iOS pide permiso
// en el primer toque.
const anguloPantalla = () => (screen.orientation?.angle ?? window.orientation ?? 0);
function alGirar(e) {
  if (e.alpha == null || e.beta == null) return;
  mira.giro = true;
  escena.orientar(e.alpha, e.beta, e.gamma, anguloPantalla());
}
let giroPedido = false;
function pedirGiro() {
  if (giroPedido || !window.DeviceOrientationEvent || HOVER) return;
  giroPedido = true;
  const pide = DeviceOrientationEvent.requestPermission;
  if (pide) pide.call(DeviceOrientationEvent).then(r => { if (r === 'granted') addEventListener('deviceorientation', alGirar); }).catch(() => {});
}
if (!HOVER && window.DeviceOrientationEvent) addEventListener('deviceorientation', alGirar);   // desde el principio; en iOS los datos llegan tras aceptar el permiso
addEventListener('orientationchange', () => escena.recentrar());
pintarSonido();


$('#saltar').addEventListener('click', e => { e.preventDefault(); irAPuerta(0); botones[0].focus({ preventScroll: true }); });

addEventListener('keydown', e => {
  if (e.key === 'Escape' && modo === 'habitacion') volver();
  if (modo === 'habitacion' && e.key === ' ' && !e.target.closest('button,input,a')) { e.preventDefault(); $('#play').click(); }
});

/* ---------- bucle ---------- */
const ESTACIONES_RM = [0, 1.7, 3.5, 4.3, ...CANCIONES.map((_, i) => escena.uDePuerta(i))];
let uObjetivo = 0, uSuave = 0, uRM = 0, uRMdestino = 0, uPrevio = 0, ultimo = performance.now();
const ayuda = $('#ayuda');
ayuda.textContent = HOVER ? 'Deja el cursor sobre una puerta para escuchar · Haz clic para entrar' : 'Mantén pulsada una puerta para escuchar · Tócala para entrar';

function tick(now) {
  const dt = Math.min(.05, (now - ultimo) / 1000); ultimo = now;
  uObjetivo = H > 0 ? scrollY / H : 0;
  let u;
  if (RM) {
    const est = ESTACIONES_RM.reduce((a, b) => Math.abs(b - uObjetivo) < Math.abs(a - uObjetivo) ? b : a);
    if (est !== uRMdestino && modo === 'nave') { uRMdestino = est; velo.style.opacity = .9; setTimeout(() => { uRM = uRMdestino; velo.style.opacity = 0; }, 230); }
    u = uSuave = uRM;
  } else {
    if (modo === 'nave') uSuave += (uObjetivo - uSuave) * (1 - Math.exp(-dt * 4.5));
    u = uSuave;
  }
  const vel = Math.abs(u - uPrevio) / Math.max(dt, .001); uPrevio = u;

  if (modo !== 'habitacion') {   // dentro de una habitación la escena 3D no se dibuja: solo vídeo y letra
    escena.actualizar(dt, u);
    escena.render();
    colocarPuertas();
  }
  if (modo !== 'nave') { fondo.dibujar(dt, A.elementos.song.paused ? 0 : A.pulso()); actualizarLetra(); }

  recortarHueco();
  escena.mirarActiva(modo === 'nave' && !RM);   // en las transiciones, la vista al frente
  if (!mira.giro) escena.mirar(mira.x, mira.y);
  // interfaz según el recorrido
  const a = cl(u / .55);
  llegada.style.opacity = (1 - a).toFixed(3);
  llegada.style.visibility = a >= 1 ? 'hidden' : 'visible';
  llegada.style.pointerEvents = a > .6 ? 'none' : '';
  // solo el contenido sube; el fondo oscuro de la capa no se mueve ni encoge (antes dejaba ver su borde)
  if (!RM) llegada.style.setProperty('--sube', (-a * 5).toFixed(2) + 'vh');
  $('#marca').style.opacity = cl((u - .5) / .4);
  ayuda.style.opacity = modo === 'nave' && u > escena.U_NAVE - .25 && escuchando == null ? .9 : 0;

  // viento que acompaña el avance
  if (modo === 'nave' && A.activo) {
    const fuera = u < escena.U_EXT - .2, k = Math.min(1, vel * 1.6);
    const R = escena.rafaga();   // ventisca: el viento sube y se vuelve más agudo con ella
    A.viento(fuera ? .35 + k * .65 + R * .9 : .1 + k * .35 + R * .35, (fuera ? 380 + k * 300 : 300 + k * 200) + R * 650, .4);
    A.lluvia(fuera ? .9 + R * .5 : .35, .6);   // dentro se oye sobre el tejado, más apagada
  }
  // si la puerta escuchada se aleja por desplazamiento, la preescucha se cierra
  if (escuchando != null && Math.abs(uObjetivo - uPre) > .35) pararPre();
  if (CAPTURA) setTimeout(() => tick(performance.now()), 33); else requestAnimationFrame(tick);
}
if (CAPTURA) setTimeout(() => tick(performance.now()), 0); else requestAnimationFrame(tick);   // en ?captura arranca aunque la pestaña no se pinte

// para pruebas desde la consola
window.__pde = { escena, A, fondo, cargado: () => cargado, entrar, volver, cambiar, actualizarLetra, estado: () => ({ modo, actual, escuchando, u: uSuave }) };
// revisión local: renderiza un punto del recorrido y lo envía a tools/receptor-capturas.mjs
if (CAPTURA) {
  const enviar = (n, lienzo) => fetch('http://127.0.0.1:8766/?n=' + n, { method: 'POST', body: lienzo.toDataURL('image/jpeg', .9) }).then(r => r.text());
  window.__pde.foto = (n, u, pasos = 120, antes) => {
    scrollTo(0, u * H); uSuave = uObjetivo = u;
    antes?.(escena);
    for (let i = 0; i < pasos; i++) escena.actualizar(1 / 30, u);
    escena.render();
    return enviar(n, $('#gl'));
  };
}
