// Fotogramas intermedios de la entrada por una puerta (lienzo WebGL), enviados a tools/receptor-capturas.mjs.
// Uso en la consola (página con ?captura):
//   const f = await import('/tools/fotogramas-entrada.js'); await f.fotogramas(3, 'despues')
// Avanza la animación real (reloj de pared) con un bucle síncrono, prepara la atmósfera como lo hace la app
// y, al final, mide cuánto difiere el último fotograma del lienzo de la habitación (relevo sin salto).
const espera = ms => new Promise(r => setTimeout(r, ms));
export async function fotogramas(i, prefijo, instantes = [0, .3, .6, .9, 1.2, 1.5, 1.8, 2.1]) {
  const { escena, atmos } = window.__pde, lienzo = escena.renderer.domElement, u = escena.uDePuerta(i);
  const hab = document.querySelector('#atmos');
  scrollTo(0, u * innerHeight);
  for (let k = 0; k < 90; k++) escena.actualizar(1 / 30, u);
  atmos.poner(i); atmos.dibujar(1 / 60, 0, false);
  const fotos = [];
  escena.entrar(i, hab);
  const t0 = performance.now();
  let negros = 0, n = 0;
  const px = new Uint8Array(4), gl = escena.renderer.getContext();
  for (const t of instantes) {
    while ((performance.now() - t0) / 1000 < t) {
      escena.actualizar(1 / 60, u); if (i) atmos.dibujar(1 / 60, 0, false); escena.render();
      gl.readPixels(lienzo.width >> 1, lienzo.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); n++;
      if (px[0] + px[1] + px[2] === 0) negros++;
    }
    escena.actualizar(1 / 60, u); if (i) atmos.dibujar(1 / 60, 0, false); escena.render();
    fotos.push([t.toFixed(1), lienzo.toDataURL('image/jpeg', .82)]);
  }
  // relevo: el último fotograma frente al lienzo 2D de la habitación (las habitaciones 2–9)
  let diferencia = null;
  if (i) {
    const c = document.createElement('canvas'); c.width = 160; c.height = 100; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(lienzo, 0, 0, 160, 100); const a = g.getImageData(0, 0, 160, 100).data;
    g.drawImage(hab, 0, 0, 160, 100); const b = g.getImageData(0, 0, 160, 100).data;
    let s = 0; for (let k = 0; k < a.length; k += 4) s += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]);
    diferencia = +(s / (160 * 100 * 3)).toFixed(2);   // media por canal, 0–255
    fotos.push(['hab', hab.toDataURL('image/jpeg', .82)]);
  }
  escena.terminarEntrada(true);
  escena.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);   // las capturas JPEG bloquean el siguiente fotograma: se absorbe antes de salir
  escena.salir(i);
  // vuelta a la nave: también se capturan fotogramas de la salida
  const t1 = performance.now(), salida = [], tiempos = [];
  for (const t of [.3, .9, 1.5]) {
    while ((performance.now() - t1) / 1000 < t) { const a = performance.now(); escena.actualizar(1 / 60, u); const b = performance.now(); if (i) atmos.dibujar(1 / 60, 0, false); const c = performance.now(); escena.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); tiempos.push([b - a, c - b, performance.now() - c].map(v => +v.toFixed(0))); }
    fotos.push(['s' + t.toFixed(1), lienzo.toDataURL('image/jpeg', .82)]); salida.push(escena.depurar().cam);
  }
  for (let k = 0; k < 120; k++) escena.actualizar(1 / 30, u);
  for (const [t, d] of fotos) await fetch(`http://127.0.0.1:8766/?n=${prefijo}-p${i + 1}-${t.replace('.', '_')}`, { method: 'POST', body: d });
  await espera(50);
  return { puerta: i + 1, fotogramas: n, negros, diferencia, salida, tiempos: tiempos.slice(0, 6) };
}
