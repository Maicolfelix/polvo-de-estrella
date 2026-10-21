// Coste por fotograma (CPU + GPU) en puntos fijos del recorrido. Uso en la consola de la página:
//   const m = await import('/tools/medir-rendimiento.js'); await m.medir()
// Cada fotograma: actualizar + render + readPixels de 1 px (obliga a esperar a la GPU). Mediana y p90 en ms.
// Independiente de requestAnimationFrame, así que sirve aunque la pestaña no se esté pintando.
const espera = ms => new Promise(r => setTimeout(r, ms));
function estad(xs) { const s = [...xs].sort((a, b) => a - b); return { med: +s[s.length >> 1].toFixed(2), p90: +s[Math.floor(s.length * .9)].toFixed(2), n: s.length }; }

// `escala`: fija la escala de resolución durante la medida (la adaptación automática se suspende).
export async function medir({ fotogramas = 60, escala } = {}) {
  const { escena } = window.__pde, r = escena.renderer, gl = r.getContext(), px = new Uint8Array(4);
  const cal = escena.calidad;   // ausente en la versión anterior a la optimización
  if (cal) { cal.fija = true; if (escala) { cal.escala = escala; cal.aplicar(); } }
  r.info.autoReset = false;   // cuenta todas las pasadas del fotograma (sombras, portal, posproceso)
  const fot = (u, extra) => { const t = performance.now(); r.info.reset(); escena.actualizar(1 / 60, u); extra?.(); escena.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return performance.now() - t; };
  const punto = (u, extra) => { for (let i = 0; i < 8; i++) fot(u, extra); const xs = []; for (let i = 0; i < fotogramas; i++) xs.push(fot(u, extra)); return estad(xs); };
  const info = () => ({ llamadas: r.info.render.calls, triangulos: r.info.render.triangles });
  const res = { vista: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio, buffer: `${r.domElement.width}×${r.domElement.height}`, agente: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] };
  { const e = gl.getExtension('WEBGL_debug_renderer_info'); res.gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; }
  res.llegada = { ...punto(0), ...info() };
  res.desplazamiento = { ...punto(2.4), ...info() };
  res.umbral = { ...punto(escena.U_EXT - .1), ...info() };
  const u0 = escena.uDePuerta(0);
  res.nave = { ...punto(u0), ...info() };
  // apertura y cruce de la puerta 1 en tiempo real (la animación usa el reloj de pared)
  const xs = []; const p = escena.entrar(0); let fin = false; p.then(() => fin = true);
  const t0 = performance.now();
  while (performance.now() - t0 < 2700) xs.push(fot(u0));   // sin ceder: los temporizadores se frenan en pestañas ocultas
  res.apertura = { ...estad(xs), ...info() };
  escena.terminarEntrada(true);
  res.habitacion1 = { ...punto(u0, () => escena.actualizarSala(1 / 60, .3)), ...info() };
  escena.salir(0);
  if (cal) { res.escala = cal.escala; cal.fija = false; }
  return res;
}

// Fluidez real: intervalo entre fotogramas de requestAnimationFrame con la página funcionando normalmente
// (la pestaña debe estar visible). Mantiene cada punto del recorrido `seg` segundos y devuelve mediana y p90 en ms.
export async function fluidez({ seg = 2.5, puntos } = {}) {
  const { escena } = window.__pde, cal = escena.calidad, H = innerHeight;
  if (cal) cal.fija = true;
  puntos ||= { llegada: 0, desplazamiento: 2.4, umbral: escena.U_EXT - .1, nave: escena.uDePuerta(2) };
  const res = { vista: `${innerWidth}×${innerHeight}`, buffer: `${escena.renderer.domElement.width}×${escena.renderer.domElement.height}` };
  for (const [k, u] of Object.entries(puntos)) {
    scrollTo(0, u * H); await new Promise(r => setTimeout(r, 1200));
    const xs = []; let prev = performance.now();
    await new Promise(fin => { const t0 = prev; const paso = ahora => { xs.push(ahora - prev); prev = ahora; if (ahora - t0 < seg * 1000) requestAnimationFrame(paso); else fin(); }; requestAnimationFrame(paso); });
    xs.shift(); xs.sort((a, b) => a - b);
    res[k] = { med: +xs[xs.length >> 1].toFixed(1), p90: +xs[Math.floor(xs.length * .9)].toFixed(1), fps: +(1000 / xs[xs.length >> 1]).toFixed(0) };
  }
  if (cal) cal.fija = false;
  scrollTo(0, 0);
  return res;
}

// Fluidez real de la apertura de una puerta (entrada completa) y de la habitación ya abierta.
export async function fluidezEntrada(i = 0, { seg = 2.6 } = {}) {
  const p = window.__pde, cal = p.escena.calidad;
  if (cal) cal.fija = true;
  scrollTo(0, p.escena.uDePuerta(i) * innerHeight); await new Promise(r => setTimeout(r, 1500));
  const muestra = async s => { const xs = []; let prev = performance.now(); const t0 = prev;
    await new Promise(fin => { const paso = t => { xs.push(t - prev); prev = t; if (t - t0 < s * 1000) requestAnimationFrame(paso); else fin(); }; requestAnimationFrame(paso); });
    xs.shift(); xs.sort((a, b) => a - b); return { med: +xs[xs.length >> 1].toFixed(1), p90: +xs[Math.floor(xs.length * .9)].toFixed(1), max: +xs[xs.length - 1].toFixed(1) }; };
  p.entrar(i);
  const apertura = await muestra(seg);
  const habitacion = await muestra(2);
  p.volver(); await new Promise(r => setTimeout(r, 1500));
  if (cal) cal.fija = false;
  return { puerta: i + 1, apertura, habitacion };
}
