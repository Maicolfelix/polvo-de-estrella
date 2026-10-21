// Resumen compacto por canción: líneas alineadas/inciertas, huecos largos y motivos.  Uso: node tools/resumen-alineamiento.mjs [NN ...]
import { readFileSync, readdirSync } from 'node:fs';
const dir = new URL('./alineamiento/', import.meta.url);
const ns = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(dir).filter(f => /^\d\d\.json$/.test(f)).map(f => f.slice(0, 2));
for (const n of ns) {
  const a = JSON.parse(readFileSync(new URL(n + '.json', dir), 'utf8')), L = a.lineas.map((x, i) => x && { ...x, i: i + 1 }).filter(Boolean);
  const inc = L.filter(x => x.estado === 'incierto');
  const huecos = L.slice(1).map((x, k) => [x.i, +(x.inicio - L[k].fin).toFixed(1)]).filter(([, g]) => g > 6);
  console.log(`${n} ${a.titulo} · ${a.duracion} s · ${L.length - inc.length} auto / ${inc.length} inciertas · primera ${L[0].inicio} s · última termina ${L.at(-1).fin} s`);
  if (huecos.length) console.log('   huecos > 6 s antes de las líneas:', huecos.map(([i, g]) => `${i} (${g} s)`).join(', '));
  for (const x of inc) console.log(`   ${String(x.i).padStart(2)} ${x.inicio}–${x.fin} «${x.linea.slice(0, 50)}» ${x.motivos.join('; ')}`);
}
