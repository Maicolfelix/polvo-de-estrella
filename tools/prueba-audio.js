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
