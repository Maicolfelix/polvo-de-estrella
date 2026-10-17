// Comprueba la versión de presentación y los tiempos.  Uso: node tools/validar-letras.mjs
// 1. Cada edición aparece exactamente las veces declaradas en el original.
// 2. Mismo número de líneas y mismas posiciones vacías que el original.
// 3. Cada línea conserva exactamente las mismas letras (sin tildes, mayúsculas, signos ni espacios).
// 4. Tiempos (si existen): uno por línea con texto, ordenados, sin solapes, dentro de la duración.
import { CANCIONES } from '../js/datos.js';
import { EDICIONES, lineasPresentacion } from '../js/letras.js';
let TIEMPOS = {};
try { ({ TIEMPOS } = await import('../js/tiempos.js')); } catch {}

const letras = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zñ]/g, '');
let fallos = 0;
const mal = m => { fallos++; console.log('FALLA', m); };

for (const c of CANCIONES) {
  const orig = c.letra.split('\n');
  for (const [de, , veces] of EDICIONES[c.n] || []) {
    const k = c.letra.split(de).length - 1;
    if (k !== veces) mal(`${c.n}: «${de}» aparece ${k} veces (declaradas ${veces})`);
  }
  const pres = lineasPresentacion(c.n);
  if (pres.length !== orig.length) mal(`${c.n}: ${pres.length} líneas frente a ${orig.length}`);
  orig.forEach((o, i) => {
    if (!o.trim() !== !(pres[i] || '').trim()) mal(`${c.n}:${i + 1} cambia una línea vacía`);
    if (letras(o) !== letras(pres[i] || '')) mal(`${c.n}:${i + 1} cambian las letras: «${o}» → «${pres[i]}»`);
  });
  const t = TIEMPOS[c.n];
  if (!t) { console.log(`${c.n}: sin tiempos`); continue; }
  if (t.lineas.length !== orig.length) mal(`${c.n}: ${t.lineas.length} tiempos para ${orig.length} líneas`);
  let prev = 0, n = { auto: 0, incierto: 0, sin: 0 };
  t.lineas.forEach((x, i) => {
    if (!orig[i].trim()) { if (x) mal(`${c.n}:${i + 1} línea vacía con tiempo`); return; }
    if (!x) { n.sin++; return; }
    const [a, b, e] = x;
    if (!(a >= 0 && b > a && b <= t.duracion + .05)) mal(`${c.n}:${i + 1} tiempo fuera de rango ${a}–${b}`);
    if (a < prev - .01) mal(`${c.n}:${i + 1} desordenado o solapado (${a} < ${prev})`);
    prev = b; n[e === 'incierto' ? 'incierto' : 'auto']++;
  });
  console.log(`${c.n} ${c.titulo}: ${n.auto} alineadas, ${n.incierto} inciertas, ${n.sin} sin tiempo`);
}
console.log(fallos ? `${fallos} fallos` : 'OK: presentación fiel y tiempos coherentes');
process.exit(fallos ? 1 : 0);
