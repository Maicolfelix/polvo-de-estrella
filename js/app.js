import { CANCIONES } from './datos.js';
import * as A from './audio.js';
import { crearEscena } from './escena.js';
import { crearAtmosfera } from './habitaciones.js';
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
    cargado = true;
    $('#carga').classList.add('lista');
    $('#conSonido').disabled = $('#sinSonido').disabled = false;
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
const atmos = crearAtmosfera($('#atmos'));

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
  cerrarIndice();
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
  atmos.poner(i); atmos.dibujar(1 / 60, 0, RM);   // la habitación queda preparada antes de abrir la puerta
  await escena.entrar(i, $('#atmos'));
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
  atmos.poner(i, fundido);
  hab.classList.toggle('con-sala', i === 0);   // la habitación 1 se ve a través de la escena 3D
  document.querySelectorAll('#listaIndice button').forEach((b, k) => b.setAttribute('aria-current', k === i));
  if (!fundido) return aplicar();
  hab.classList.add('cambiando');
  setTimeout(() => { aplicar(); hab.classList.remove('cambiando'); }, 450);
}
function abrirHabitacion(i) {
  escena.terminarEntrada();
  actual = i;
  pintarHabitacion(i, false);
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
  hab.classList.remove('visible', 'listo');
  document.body.classList.remove('en-habitacion');
  capa.inert = llegada.inert = false;
  setTimeout(() => { hab.hidden = true; modo = 'nave'; botones[i].focus({ preventScroll: true }); }, RM ? 420 : 900);
}

/* ---------- letra sincronizada ---------- */
// El único reloj es el del reproductor (song.currentTime): pausar congela, buscar actualiza al instante.
const SILENCIO = 1.2;   // tras el final de una línea, segundos que sigue marcada antes de apagarse
const habScroll = $('#habScroll'), btnSeguir = $('#seguir');
const sync = { lineas: [], tiempos: null, activa: -1, seguir: true, propio: 0 };
function pintarLetra(n) {
  const cont = $('#letra'), t = TIEMPOS[n] || null;
  cont.replaceChildren(...lineasPresentacion(n).map((txt, i) => {
    const el = document.createElement('span');
    el.className = txt.trim() ? 'linea' : 'linea vacia';
    el.textContent = txt;
    el.dataset.i = i;
    return el;
  }));
  Object.assign(sync, { lineas: [...cont.children], tiempos: t, activa: -1, seguir: true });
  cont.classList.toggle('sincronizada', !!t);
  btnSeguir.hidden = true;
  $('#habNota').textContent = t ? 'Letra sincronizada automáticamente · pendiente de revisión a oído' : 'Letra sin sincronizar';
}
function lineaActiva(tm) {
  const L = sync.tiempos?.lineas; if (!L) return -1;
  let k = -1;
  for (let i = 0; i < L.length; i++) if (L[i] && L[i][0] <= tm) k = i;   // nunca una línea futura
  return k >= 0 && tm <= L[k][1] + SILENCIO ? k : -1;
}
function centrar(el) {
  const r = el.getBoundingClientRect(), c = habScroll.getBoundingClientRect();
  const y = habScroll.scrollTop + r.top - c.top - c.height * .36;
  sync.propio = performance.now();
  habScroll.scrollTo({ top: Math.max(0, y), behavior: RM ? 'auto' : 'smooth' });
}
function actualizarLetra() {
  if (!sync.tiempos) return;
  const k = lineaActiva(song.currentTime);
  if (k === sync.activa) return;
  sync.lineas[sync.activa]?.classList.remove('activa');
  sync.activa = k;
  if (k < 0) return;
  sync.lineas[k].classList.add('activa');
  if (sync.seguir) centrar(sync.lineas[k]);
}
// desplazamiento manual: suspende el seguimiento hasta pulsar «Seguir canción»
function manual() {
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
  A.playPausa();
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
const progreso = () => song.duration ? song.currentTime / song.duration : 0;

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
  for (const b of [$('#btnSonido'), $('#mudo')]) b.classList.toggle('silencio', off);
  $('#btnSonido').setAttribute('aria-pressed', !off);
  $('#txtSonido').textContent = off ? 'Sin sonido' : 'Sonido';
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
  A.setMudo(mudo);
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
$('#btnSonido').addEventListener('click', () => alternarMudo());
$('#mudo').addEventListener('click', () => alternarMudo());
$('#conSonido').addEventListener('click', async () => {
  await A.activar(); mudo = false; A.setMudo(false);
  $('#acciones').classList.add('ido'); pintarSonido(); guardar('pde-sonido', '1');
  if (scrollY < H * .2) scrollTo({ top: H * .55, behavior: RM ? 'auto' : 'smooth' });
});
$('#sinSonido').addEventListener('click', () => {
  $('#acciones').classList.add('ido'); pintarSonido(); guardar('pde-sonido', '0');
  if (scrollY < H * .2) scrollTo({ top: H * .55, behavior: RM ? 'auto' : 'smooth' });
});
pintarSonido();


/* ---------- índice de canciones ---------- */
const indice = $('#indice'), btnIndice = $('#btnIndice');
CANCIONES.forEach((c, i) => {
  const li = document.createElement('li'), b = document.createElement('button');
  b.innerHTML = '<span class="n"></span><span class="t"></span>';
  b.querySelector('.n').textContent = c.n; b.querySelector('.t').textContent = c.titulo;
  b.addEventListener('click', () => { cerrarIndice(); if (modo === 'habitacion') cambiar(i); else if (modo === 'nave') { irAPuerta(i); botones[i].focus({ preventScroll: true }); } });
  li.appendChild(b); $('#listaIndice').appendChild(li);
});
function cerrarIndice() { indice.hidden = true; btnIndice.setAttribute('aria-expanded', false); }
btnIndice.addEventListener('click', () => {
  const abrir = indice.hidden; indice.hidden = !abrir; btnIndice.setAttribute('aria-expanded', abrir);
  if (abrir) indice.querySelector('button').focus();
});
document.addEventListener('pointerdown', e => { if (!indice.hidden && !indice.contains(e.target) && e.target !== btnIndice && !btnIndice.contains(e.target)) cerrarIndice(); });
$('#saltar').addEventListener('click', e => { e.preventDefault(); irAPuerta(0); botones[0].focus({ preventScroll: true }); });

addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!indice.hidden) { cerrarIndice(); btnIndice.focus(); return; } if (modo === 'habitacion') volver(); }
  if (modo === 'habitacion' && e.key === ' ' && !e.target.closest('button,input,a')) { e.preventDefault(); $('#play').click(); }
});

/* ---------- bucle ---------- */
const ESTACIONES_RM = [0, 1.7, 3.5, 4.3, ...CANCIONES.map((_, i) => escena.uDePuerta(i))];
let sala30 = false, uObjetivo = 0, uSuave = 0, uRM = 0, uRMdestino = 0, uPrevio = 0, ultimo = performance.now();
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

  const salaMar = actual === 0 && modo !== 'nave';   // la habitación 1 es la sala 3D del mar
  if (modo !== 'habitacion') {
    escena.actualizar(dt, u);
    if (salaMar) escena.actualizarSala(dt, progreso());
    escena.render();
    colocarPuertas();
  } else if (salaMar && (sala30 = !sala30)) { escena.actualizarSala(dt * 2, progreso()); escena.render(); }   // detrás de la letra basta con 30 fps
  if (modo !== 'nave') { if (!salaMar) atmos.dibujar(dt, progreso(), RM); actualizarLetra(); }

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
  }
  // si la puerta escuchada se aleja por desplazamiento, la preescucha se cierra
  if (escuchando != null && Math.abs(uObjetivo - uPre) > .35) pararPre();
  if (CAPTURA) setTimeout(() => tick(performance.now()), 33); else requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// para pruebas desde la consola
window.__pde = { escena, A, atmos, entrar, volver, cambiar, actualizarLetra, estado: () => ({ modo, actual, escuchando, u: uSuave }) };
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
  window.__pde.fotoHab = (n, i, p, pasos = 90) => {
    atmos.poner(i); for (let k = 0; k < pasos; k++) atmos.dibujar(1 / 30, p, RM);
    return enviar(n, $('#atmos'));
  };
}
