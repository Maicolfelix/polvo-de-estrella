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

// Panel «Tu sonido». Requiere sonido activado por un clic real. Cuenta nodos creados para detectar duplicados.
export async function correrPanel() {
  const P = window.__pde, A = P.A, s = A.elementos.song, L = [];
  const ok = (cond, txt) => L.push((cond ? 'OK   ' : 'FALLA') + ' ' + txt);
  const C = { fuentes: 0, filtros: 0 }, proto = AudioContext.prototype;
  const of = proto.createMediaElementSource, ob = proto.createBiquadFilter;
  proto.createMediaElementSource = function (...a) { C.fuentes++; return of.apply(this, a); };
  proto.createBiquadFilter = function (...a) { C.filtros++; return ob.apply(this, a); };
  const mover = (id, v) => { const r = $(id); r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); };
  const panelAbierto = () => !$('#tuSonido').hidden;
  try {
    scrollTo(0, innerHeight * P.escena.uDePuerta(0)); await w(2500);
    toque(document.querySelectorAll('.puerta')[0]); await modo('habitacion'); await w(1500);
    // 1. abrir y cerrar varias veces
    const t0 = s.currentTime;
    ok(getComputedStyle($('#tuSonido')).display === 'none', 'cerrado: el panel no ocupa pantalla');
    for (let k = 0; k < 5; k++) { toque($('#btnTuSonido')); await w(150); toque($('#tsCerrar')); await w(150); }
    ok(C.fuentes === 0 && C.filtros === 0, `abrir/cerrar ×5: sin nodos nuevos (fuentes ${C.fuentes}, filtros ${C.filtros})`);
    ok(!s.paused && s.currentTime > t0 && sonando(A).join() === 'song', 'abrir/cerrar no pausa ni duplica');
    ok(document.activeElement === $('#btnTuSonido'), 'al cerrar, el foco vuelve a «Tu sonido»');
    // 2. ajustar mientras suena y en pausa
    toque($('#btnTuSonido')); await w(200);
    ok(panelAbierto() && $('#btnTuSonido').getAttribute('aria-expanded') === 'true' && getComputedStyle($('#tuSonido')).display !== 'none', 'panel abierto y visible, aria-expanded=true');
    mover('#tsGraves', 4); mover('#tsAgudos', -3); mover('#tsEspacio', 60); await w(300);
    ok(!s.paused && sonando(A).join() === 'song', 'ajustar mientras suena: sigue sonando una sola vez');
    ok($('#oGraves').textContent === '+4 dB' && $('#tsAgudos').getAttribute('aria-valuetext') === '-3 dB', 'valores visibles y accesibles');
    ok(/espacio 60/.test($('#tsEstado').textContent), 'estado textual: ' + $('#tsEstado').textContent);
    toque($('#play')); await w(300);
    const tp = s.currentTime;
    mover('#tsMedios', 5); mover('#tsEspacio', 100); mover('#tsCancion', 70); await w(800);
    ok(s.paused && Math.abs(s.currentTime - tp) < .02 && sonando(A).length === 0, 'ajustar en pausa: sigue en pausa y en la misma posición');
    // 3. pausa/reanudar con reverb: la compuerta va tras la reverb y la cola se vacía
    ok(A.niveles().song === 0, 'en pausa con espacio 100 %: salida de canción a 0 (sin cola)');
    toque($('#play')); await w(800);
    ok(!s.paused && s.currentTime > tp && s.currentTime < tp + 1.5, `reanuda desde ${tp.toFixed(2)} una vez`);
    // 4. cambiar de canción con ajustes activos
    const antes = JSON.stringify(A.preferencias());
    toque($('#siguiente')); await w(2500);
    ok(JSON.stringify(A.preferencias()) === antes && A.niveles().fuentes.song === '02.m4a' && sonando(A).join() === 'song', 'cambiar de canción conserva ajustes y suena solo la nueva');
    ok(C.fuentes === 0 && C.filtros === 0, 'cambiar de canción no crea rutas nuevas');
    // 5. cambiar y pausar durante la carga
    toque($('#siguiente')); await w(80); toque($('#play')); await w(2000);
    ok(A.niveles().fuentes.song === '03.m4a' && s.paused && sonando(A).length === 0, 'siguiente + pausa en carga: canción 03 cargada y en pausa');
    // 6. silencio general: mover controles no lo rompe
    toque($('#play')); await w(600);
    toque($('#mudo')); await w(400);
    mover('#tsCancion', 100); mover('#tsGraves', 6); mover('#tsAmbiente', 40); await w(400);
    ok(A.niveles().master === 0 && A.estaMudo(), 'en silencio: mover controles no devuelve el sonido');
    toque($('#mudo')); await w(500);
    // 7. comparar y restablecer sin reinicios
    const tc = s.currentTime;
    toque($('#tsComparar')); await w(300);
    ok($('#tsComparar').getAttribute('aria-pressed') === 'true' && /original/.test($('#tsEstado').textContent), 'comparar: estado visible');
    ok(!s.paused && s.currentTime >= tc && A.preferencias().cancion === 100, 'comparar: no reinicia ni cambia volumen');
    toque($('#tsComparar')); await w(200);
    toque($('#play')); await w(300);
    const tq = s.currentTime;
    toque($('#tsComparar')); await w(300); toque($('#tsReset')); await w(400);
    ok(s.paused && Math.abs(s.currentTime - tq) < .02, 'comparar/restablecer en pausa no inicia audio');
    ok(JSON.stringify(A.preferencias()) === JSON.stringify(A.PREFS_INICIALES) && $('#tsComparar').getAttribute('aria-pressed') === 'false', 'restablecer: valores iniciales');
    // 9. arrastrar un control en móvil no mueve lo de detrás
    const hs = $('#habScroll').scrollTop, r = $('#tsEspacio').getBoundingClientRect();
    const o = { pointerType: 'touch', clientX: r.x + 10, clientY: r.y + r.height / 2, bubbles: true, pointerId: 9 };
    ok(document.elementFromPoint(o.clientX, o.clientY) === $('#tsEspacio'), 'el control recibe el toque (nada encima)');
    ok(getComputedStyle($('#tsEspacio')).touchAction === 'none', 'touch-action: none en los controles (el arrastre no desplaza)');
    $('#tsEspacio').dispatchEvent(new PointerEvent('pointerdown', o)); $('#tsEspacio').dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: o.clientX + 120, clientY: o.clientY + 40 })); $('#tsEspacio').dispatchEvent(new PointerEvent('pointerup', o));
    ok($('#habScroll').scrollTop === hs && P.estado().modo === 'habitacion', 'arrastrar: la letra no se desplaza y la habitación sigue igual');
    // 11. duración y velocidad intactas
    ok(s.playbackRate === 1 && Math.abs(s.duration - 136.2) < 1, `velocidad ${s.playbackRate}, duración ${s.duration.toFixed(1)} s`);
    // Escape cierra el panel, no la habitación
    $('#tsCerrar').focus(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await w(200);
    ok(!panelAbierto() && P.estado().modo === 'habitacion', 'Escape cierra el panel sin salir de la habitación');
    toque($('#volver')); await modo('nave'); await w(2500);
    const esperado = .3 * A.preferencias().ambiente / 100;
    ok(sonando(A).join() === 'inst' && Math.abs(A.niveles().inst - esperado) < .03, `al volver: instrumental al ambiente elegido (${A.preferencias().ambiente} % → ${A.niveles().inst})`);
  } finally {
    proto.createMediaElementSource = of; proto.createBiquadFilter = ob;
  }
  return L.join('\n');
}
