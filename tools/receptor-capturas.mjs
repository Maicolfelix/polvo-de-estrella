// Guarda capturas del lienzo WebGL enviadas desde la página (solo para revisión local).
// Uso: node tools/receptor-capturas.mjs <carpeta>   → escucha en 127.0.0.1:8766
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const dir = process.argv[2] || 'capturas';
mkdirSync(dir, { recursive: true });
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8765');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  const nombre = basename(new URL(req.url, 'http://x').searchParams.get('n') || 'captura').replace(/[^\w-]/g, '');
  let datos = '';
  req.on('data', c => datos += c);
  req.on('end', () => {
    const b64 = datos.replace(/^data:image\/\w+;base64,/, '');
    writeFileSync(join(dir, nombre + '.png'), Buffer.from(b64, 'base64'));
    res.end('ok');
  });
}).listen(8766, '127.0.0.1');
