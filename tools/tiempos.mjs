// Genera js/tiempos.js a partir de tools/alineamiento/NN.json.  Uso: node tools/tiempos.mjs
// Por línea del original: [inicio, fin, estado] o null (línea vacía). 'auto' = alineamiento automático
// con comprobaciones técnicas superadas; 'incierto' = revisar a oído. Nada está revisado auditivamente.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('./alineamiento/', import.meta.url);
const T = {};
for (const f of readdirSync(dir).filter(f => /^\d\d\.json$/.test(f)).sort()) {
  const a = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  T[a.n] = { duracion: a.duracion, metodo: a.metodo, revision: 'automática (sin revisión auditiva)', lineas: a.lineas.map(x => x && [x.inicio, x.fin, x.estado]) };
}
writeFileSync(new URL('../js/tiempos.js', import.meta.url),
  '// Generado por tools/tiempos.mjs desde tools/alineamiento/*.json — no editar a mano.\n' +
  `export const TIEMPOS = ${JSON.stringify(T)};\n`);
console.log('js/tiempos.js:', Object.keys(T).join(' '));
