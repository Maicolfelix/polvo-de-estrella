// Pruebas de aceptación del reproductor (emulación en navegador, no sustituye un teléfono real).
// Uso en la consola, con el sonido ya activado por un clic real:
//   const m = await import('/tools/prueba-audio.js'); await m.correr()
const w = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
// espera a que la app llegue a un modo (la pestaña de pruebas puede ir lenta)
async function modo(m, max = 25000) { const t = performance.now(); while (window.__pde.estado().modo !== m && performance.now() - t < max) await w(100); await w(300); }

function toque(el) {
  const r = el.getBoundingClientRect(), o = { pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, pointerId: 3 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new PointerEvent('pointerup', o));
  el.click();
}
// cuenta elementos <audio> que suenan de verdad (no en pausa y con ganancia audible)
function sonando(A) {
  const n = A.niveles(), e = A.elementos;
  return ['song', 'pre', 'inst'].filter(k => !e[k].paused && n[k] > .02);
}

export async function correr() {
  const P = window.__pde, A = P.A, s = A.elementos.song, L = [];
  const ok = (cond, txt) => L.push((cond ? 'OK   ' : 'FALLA') + ' ' + txt);
  const icono = () => $('#play').getAttribute('aria-label');
  const irPuerta = async i => { scrollTo(0, innerHeight * P.escena.uDePuerta(i)); await w(2500); };
  const entrarPorToque = async i => { await irPuerta(i); toque(document.querySelectorAll('.puerta')[i]); await modo('habitacion'); };

  // 1. entrar → pausar → esperar → reanudar
  await entrarPorToque(0);
  ok(P.estado().modo === 'habitacion' && sonando(A).join() === 'song', 'entrar: solo suena la canción (' + sonando(A) + ')');
  toque($('#play')); await w(400);
  const t1 = s.currentTime;
  ok(s.paused && sonando(A).length === 0, 'pausa: silencio inmediato (' + sonando(A) + ')');
  ok(icono() === 'Reproducir', 'pausa: icono = ' + icono());
  await w(2000);
  ok(Math.abs(s.currentTime - t1) < .05, `pausa conserva posición (${t1.toFixed(2)} → ${s.currentTime.toFixed(2)})`);
  toque($('#play')); await w(1200);
  ok(!s.paused && s.currentTime > t1 && s.currentTime < t1 + 2, `reanuda desde ${t1.toFixed(2)} (ahora ${s.currentTime.toFixed(2)})`);
  ok(icono() === 'Pausa', 'reanudar: icono = ' + icono());

  // 2. diez toques rápidos (número par → vuelve a sonar)
  for (let k = 0; k < 10; k++) { toque($('#play')); await w(50); }
  await w(1200);
  ok(!s.paused && sonando(A).join() === 'song' && icono() === 'Pausa', '10 toques rápidos: una sola reproducción, icono coherente (' + sonando(A) + ', ' + icono() + ')');
  for (let k = 0; k < 9; k++) { toque($('#play')); await w(50); }
  await w(1200);
  ok(s.paused && sonando(A).length === 0 && icono() === 'Reproducir', '9 toques rápidos: queda en pausa (' + icono() + ')');

  // 3. cambiar de canción durante la carga y pausar enseguida
  toque($('#play')); await w(500);
  toque($('#siguiente')); await w(80); toque($('#play')); await w(2500);
  const titulo = $('#hab-titulo').textContent;
  ok(A.niveles().fuentes.song === '02.m4a', `siguiente + pausa en carga: fuente ${A.niveles().fuentes.song}, título ${titulo}`);
  ok(sonando(A).length === 0 && icono() === 'Reproducir', 'siguiente + pausa en carga: queda en pausa (' + sonando(A) + ')');
  toque($('#play')); await w(1500);
  ok(!s.paused && A.niveles().fuentes.song === '02.m4a', 'reanuda la canción nueva, no la anterior');

  // 4. navegar repetidamente entre canciones
  for (let k = 0; k < 6; k++) { toque($('#siguiente')); await w(150); }
  for (let k = 0; k < 3; k++) { toque($('#anterior')); await w(150); }
  await w(2500);
  ok(sonando(A).join() === 'song' && A.niveles().fuentes.song === '05.m4a', 'navegación rápida: una canción, la correcta (' + A.niveles().fuentes.song + ')');

  // 5. salir durante la carga: no debe empezar después
  toque($('#siguiente')); await w(100); toque($('#volver')); await modo('nave'); await w(2500);
  ok(P.estado().modo === 'nave' && s.paused, 'salir durante la carga: la canción no arranca después (' + sonando(A) + ')');
  ok(sonando(A).join() === 'inst', 'al volver suena solo la instrumental');

  // 6. preescuchar → entrar → pausar → volver
  await irPuerta(2);
  const b = document.querySelectorAll('.puerta')[2], r = b.getBoundingClientRect(), o = { pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true, pointerId: 4 };
  b.dispatchEvent(new PointerEvent('pointerdown', o)); await w(1200);
  ok(P.estado().escuchando === 2 && A.niveles().pre > .5, 'pulsación larga: preescucha activa');
  b.dispatchEvent(new PointerEvent('pointerup', o)); b.click(); await w(800);
  ok(P.estado().modo === 'nave' && A.niveles().pre < .3, 'soltar tras mantener: no entra y la preescucha se cierra');
  toque(b); await modo('habitacion');
  ok(sonando(A).join() === 'song' && A.elementos.pre.paused, 'entrar tras preescuchar: la preescucha queda detenida');
  toque($('#play')); await w(400);
  ok(sonando(A).length === 0, 'pausa tras preescucha: silencio total (' + sonando(A) + ')');
  toque($('#volver')); await modo('nave'); await w(2500);
  ok(sonando(A).join() === 'inst', 'volver: solo instrumental');

  // 7. mantener → arrastrar para cancelar → soltar
  const b2 = document.querySelectorAll('.puerta')[2];
  b2.dispatchEvent(new PointerEvent('pointerdown', o)); await w(150);
  b2.dispatchEvent(new PointerEvent('pointermove', { ...o, clientY: o.clientY - 60 }));
  b2.dispatchEvent(new PointerEvent('pointercancel', o)); await w(700);
  ok(P.estado().modo === 'nave' && P.estado().escuchando == null, 'arrastrar cancela sin preescucha ni entrada');

  // 8. los controles no activan lo que hay detrás
  await entrarPorToque(2);
  const pr = $('#play').getBoundingClientRect(), arriba = document.elementFromPoint(pr.x + pr.width / 2, pr.y + pr.height / 2);
  ok($('#play').contains(arriba), 'el botón de pausa es lo que recibe el toque');
  ok(document.querySelector('#puertas').inert, 'las puertas quedan inertes detrás de la habitación');
  toque($('#volver')); await modo('nave');
  return L.join('\n');
}

// Recorrido sin sonido: hay que cargar la página y elegir «Sin sonido».
export async function correrSinSonido() {
  const P = window.__pde, A = P.A, L = [];
  const ok = (cond, txt) => L.push((cond ? 'OK   ' : 'FALLA') + ' ' + txt);
  for (const i of [0, 3, 6]) {
    scrollTo(0, innerHeight * P.escena.uDePuerta(i)); await w(2500);
    toque(document.querySelectorAll('.puerta')[i]); await modo('habitacion');
    ok(P.estado().modo === 'habitacion' && A.elementos.song.paused && !A.activo, `sin sonido, habitación ${i + 1}: nada suena`);
    toque($('#volver')); await modo('nave'); await w(1500);
    ok(A.elementos.inst.paused, 'sin sonido: la instrumental no arranca al volver');
  }
  return L.join('\n');
}

// Volumen y silencio. Requiere sonido activado por un clic real.
export async function correrVolumen() {
  const P = window.__pde, A = P.A, s = A.elementos.song, L = [], v = $('#vol'), m = $('#mudo');
  const ok = (cond, txt) => L.push((cond ? 'OK   ' : 'FALLA') + ' ' + txt);
  const mover = x => { v.value = x; v.dispatchEvent(new Event('input', { bubbles: true })); };
  const C = { fuentes: 0 }, proto = AudioContext.prototype, of = proto.createMediaElementSource;
  proto.createMediaElementSource = function (...a) { C.fuentes++; return of.apply(this, a); };
  try {
    ok(!document.querySelector('#tuSonido, #btnTuSonido, [data-pref]'), 'no queda rastro del panel «Tu sonido»');
    ok(localStorage.getItem('pde-tu-sonido') === null, 'los ajustes antiguos del panel se borraron');
    scrollTo(0, innerHeight * P.escena.uDePuerta(0)); await w(2500);
    toque(document.querySelectorAll('.puerta')[0]); await modo('habitacion'); await w(1500);
    // volumen mientras suena
    const t0 = s.currentTime;
    for (const x of [80, 30, 65, 100, 50]) { mover(x); await w(60); }
    await w(500);
    ok(!s.paused && s.currentTime > t0 && sonando(A).join() === 'song', 'mover la barra mientras suena: no reinicia ni duplica');
    ok(Math.abs(A.volumen() - .5) < .001 && v.getAttribute('aria-valuetext') === '50 %', 'volumen 50 %: ' + v.getAttribute('aria-valuetext'));
    // silenciar y recuperar el último nivel
    const fin = ms => w(ms + 200);                         // fin del fundido + margen de la pestaña de pruebas
    toque(m); await fin(A.FUNDIDO.silencio * 1000);
    ok(A.niveles().master === 0 && v.value === '0' && m.getAttribute('aria-pressed') === 'true', `silenciar: salida exactamente 0 tras ${A.FUNDIDO.silencio * 1000} ms (${A.niveles().master}), barra a 0, icono silenciado`);
    ok(!s.paused, 'silenciar no pausa la canción');
    toque(m); await fin(A.FUNDIDO.silencio * 1000);
    ok(A.niveles().master === 1 && v.value === '50' && A.niveles().cancion === .5, `reactivar: salida 1 y volumen 50 % (${A.niveles().master}, ${A.niveles().cancion})`);
    // alternar rápido: no debe quedar una operación pendiente que vuelva a silenciar
    for (let k = 0; k < 7; k++) { toque(m); await w(40); }  // 7 toques: termina silenciado
    await fin(A.FUNDIDO.silencio * 1000);
    ok(A.niveles().master === 0, `7 toques rápidos → silencio exacto (${A.niveles().master})`);
    toque(m); await w(30); toque(m); await w(30); toque(m); // 3 más: termina con sonido
    await fin(A.FUNDIDO.silencio * 1000); const g1 = A.niveles().master; await w(800);
    ok(g1 === 1 && A.niveles().master === 1, `toques rápidos terminando en sonido: queda en 1 y sigue en 1 800 ms después (${g1} → ${A.niveles().master})`);
    // bajar a cero con la barra y reactivar con el altavoz
    mover(0); await fin(A.FUNDIDO.volumen * 1000);
    ok(m.getAttribute('aria-pressed') === 'true' && A.volumen() === 0 && A.niveles().cancion === 0, `barra a 0: ganancia de la canción exactamente 0 (${A.niveles().cancion})`);
    toque(m); await w(400);
    await fin(A.FUNDIDO.volumen * 1000);
    ok(v.value === '50' && A.niveles().cancion === .5 && A.niveles().master === 1, `altavoz tras barra a 0: recupera el último nivel distinto de cero (${A.niveles().cancion})`);
    // en pausa: mover la barra no reanuda
    toque($('#play')); await w(300);
    const tp = s.currentTime;
    for (const x of [90, 20, 70]) { mover(x); await w(80); }
    for (let k = 0; k < 6; k++) { toque(m); await w(40); } await fin(A.FUNDIDO.silencio * 1000);
    ok(s.paused && Math.abs(s.currentTime - tp) < .02 && sonando(A).length === 0, 'en pausa: barra y altavoz no reanudan la canción');
    toque($('#play')); await w(800);
    ok(!s.paused && s.currentTime > tp && s.currentTime < tp + 1.5, 'reanuda una vez desde la misma posición');
    // cambio de canción conserva el volumen y no crea fuentes
    toque($('#siguiente')); await w(2500);
    ok(A.niveles().fuentes.song === '02.m4a' && sonando(A).join() === 'song' && Math.abs(A.volumen() - .7) < .001, 'cambiar de canción: suena solo la nueva, con el mismo volumen (70 %)');
    ok(C.fuentes === 0, 'sin fuentes de audio nuevas (' + C.fuentes + ')');
    ok(localStorage.getItem('pde-vol') === '70', 'el volumen se guarda (pde-vol = ' + localStorage.getItem('pde-vol') + ')');
    toque($('#volver')); await modo('nave'); await w(2500);
    ok(sonando(A).join() === 'inst', 'al volver: solo la instrumental');
  } finally { proto.createMediaElementSource = of; }
  return L.join('\n');
}

// Letra sincronizada: comprobación técnica del seguimiento (no valida la exactitud auditiva de los tiempos).
export async function correrLetra(n = '01') {
  const P = window.__pde, A = P.A, s = A.elementos.song, L = [];
  const ok = (cond, txt) => L.push((cond ? 'OK   ' : 'FALLA') + ' ' + txt);
  const { TIEMPOS } = await import('/js/tiempos.js'), T = TIEMPOS[n].lineas;
  const activa = () => { const e = document.querySelector('#letra .linea.activa'); return e ? +e.dataset.i : -1; };
  const conTiempo = T.map((x, i) => x ? i : -1).filter(i => i >= 0);
  const i0 = conTiempo[0], iMed = conTiempo[Math.floor(conTiempo.length / 2)], iFin = conTiempo.at(-1);
  const ir = async t => { s.currentTime = t; await w(500); };
  const i = +n - 1;
  scrollTo(0, innerHeight * P.escena.uDePuerta(i)); await w(2500);
  toque(document.querySelectorAll('.puerta')[i]); await modo('habitacion'); await w(800);
  ok(document.querySelectorAll('#letra .linea').length === T.length, `líneas en pantalla = líneas del original (${T.length})`);
  // introducción: ninguna línea futura resaltada
  if (T[i0][0] > 1) { await ir(Math.max(0, T[i0][0] - 1)); ok(activa() === -1, `antes de la primera línea (${T[i0][0]} s): nada resaltado`); }
  await ir(T[i0][0] + .05); ok(activa() === i0, `inicio: línea ${i0 + 1} activa`);
  await ir((T[iMed][0] + T[iMed][1]) / 2); ok(activa() === iMed, `búsqueda al medio: línea ${iMed + 1} activa`);
  // pausa congela
  toque($('#play')); await w(300); const congelada = activa(); await w(1500);
  ok(s.paused && activa() === congelada, 'pausa: la línea activa queda congelada');
  toque($('#play')); await w(600);
  ok(!s.paused && activa() >= iMed, 'reanudar: sigue desde la posición real');
  // búsqueda hacia atrás
  await ir(T[i0][0] + .05); ok(activa() === i0, 'búsqueda hacia atrás: actualiza al instante');
  // silencio no detiene el avance
  toque($('#mudo')); await w(300); const t1 = s.currentTime; await w(1200);
  ok(s.currentTime > t1 + .8, 'silenciar no detiene el avance de la canción ni de la letra');
  toque($('#mudo')); await w(300);
  // seguimiento: centrado, manual, «Seguir canción» (en pausa, para medir posiciones sin que avance)
  toque($('#play')); await w(200);
  await ir((T[iFin][0] + T[iFin][1]) / 2); await w(1500);
  const r = document.querySelector('#letra .linea.activa')?.getBoundingClientRect(), rp = $('.reproductor').getBoundingClientRect();
  ok(activa() === iFin && r && r.bottom < rp.top, `final: línea ${iFin + 1} activa y visible por encima del reproductor (activa ${activa() + 1}, t ${s.currentTime.toFixed(2)}, pausa ${s.paused}, línea ${r && Math.round(r.top)}–${r && Math.round(r.bottom)}, reproductor ${Math.round(rp.top)})`);
  $('#habScroll').dispatchEvent(new WheelEvent('wheel', { deltaY: -400, bubbles: true })); $('#habScroll').scrollTop -= 400; await w(300);
  ok(!$('#seguir').hidden, 'desplazar a mano: aparece «Seguir canción»');
  await ir(T[iMed][0] + .05); const fuera = document.querySelector('#letra .linea.activa').getBoundingClientRect();
  toque($('#seguir')); await w(1500);
  const dentro = document.querySelector('#letra .linea.activa').getBoundingClientRect(), hs = $('#habScroll').getBoundingClientRect();
  ok($('#seguir').hidden && dentro.top > hs.top && dentro.bottom < rp.top, `«Seguir canción» recupera el seguimiento en la posición actual (oculto ${$('#seguir').hidden}, línea ${Math.round(dentro.top)}–${Math.round(dentro.bottom)}, área ${Math.round(hs.top)}–${Math.round(rp.top)})`);
  // cambiar de canción limpia el estado
  toque($('#play')); await w(300);
  toque($('#siguiente')); await w(1500);
  const n2 = String(+n % 9 + 1).padStart(2, '0');
  ok($('#hab-titulo').textContent && activa() <= 0 && $('#seguir').hidden, `cambiar a ${n2}: estado anterior eliminado`);
  toque($('#volver')); await modo('nave'); await w(500);
  ok(sonando(A).join() === 'inst', 'volver: se cancela el seguimiento y suena solo la instrumental');
  return L.join('\n');
}
