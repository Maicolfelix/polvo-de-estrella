// Fotogramas intermedios de la entrada por una puerta, enviados a tools/receptor-capturas.mjs.
// Uso en la consola (página con ?captura):
//   const f = await import('/tools/fotogramas-entrada.js'); await f.fotogramas(3, 'despues')
// Avanza la animación real (reloj de pared) con un bucle síncrono y compone lo que ve la persona: la escena 3D
// y, encima, la habitación 2D recortada con la forma del hueco de la puerta y la opacidad que le da la app.
const espera = ms => new Promise(r => setTimeout(r, ms));
export async function fotogramas(i, prefijo, instantes = [0, .3, .6, .9, 1.2, 1.5, 1.8, 2.1]) {
  const { escena, fondo } = window.__pde, lienzo = escena.renderer.domElement, u = escena.uDePuerta(i);
  const hab = document.querySelector('#fondo'), gl = escena.renderer.getContext(), px = new Uint8Array(4);
  scrollTo(0, u * innerHeight);
  for (let k = 0; k < 90; k++) escena.actualizar(1 / 30, u);
  fondo.poner(i); await new Promise(r => hab.readyState >= 2 ? r() : hab.addEventListener('loadeddata', r, { once: true }));
  // misma regla que recortarHueco() en app.js
  const comp = document.createElement('canvas'); comp.width = innerWidth; comp.height = innerHeight;
  const g = comp.getContext('2d');
  const componer = () => {
    g.drawImage(lienzo, 0, 0, comp.width, comp.height);
    const h = escena.huecoPantalla(i, innerWidth, innerHeight);
    const op = !h ? 1 : Math.min(1, Math.max(0, (h.abierto - .04) / .4)) * Math.min(1, Math.max(0, (h.alin - .55) / .3));
    g.save(); g.globalAlpha = op;
    if (h) { g.beginPath(); h.pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip(); }
    g.drawImage(hab, 0, 0, comp.width, comp.height); g.restore();
    return comp.toDataURL('image/jpeg', .82);
  };
  const paso = () => { escena.actualizar(1 / 60, u); escena.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  const fotos = [];
  escena.entrar(i);
  const t0 = performance.now();
  for (const t of instantes) { while ((performance.now() - t0) / 1000 < t) paso(); paso(); fotos.push([t.toFixed(1), componer()]); }
  escena.terminarEntrada(true);
  paso(); escena.salir(i);
  const t1 = performance.now();
  for (const t of [.3, .9, 1.5, 2.1]) { while ((performance.now() - t1) / 1000 < t) paso(); paso(); fotos.push(['s' + t.toFixed(1), componer()]); }
  for (let k = 0; k < 120; k++) escena.actualizar(1 / 30, u);
  for (const [t, d] of fotos) await fetch(`http://127.0.0.1:8766/?n=${prefijo}-p${i + 1}-${t.replace('.', '_')}`, { method: 'POST', body: d });
  await espera(50);
  return fotos.length;
}
