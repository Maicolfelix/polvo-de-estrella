// Mundo 3D: paisaje de tormenta, capilla de piedra, portal abocinado y nave con nueve puertas.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CANCIONES } from './datos.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const eio = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const B = 1.02;                 // zócalo del edificio
const IW = 3.8, MURO = .6, Z0 = -.9, Z1 = -23.1;
export const MOVIL = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

// ---------- utilidades de geometría ----------
function arco(cx, y0, w, R, n = 14) {
  const c = R - w, thA = Math.acos(-c / R), p = [];
  for (let i = 0; i <= n; i++) { const th = Math.PI + (thA - Math.PI) * i / n; p.push(new V2(cx + c + R * Math.cos(th), y0 + R * Math.sin(th))); }
  for (let i = n - 1; i >= 0; i--) p.push(new V2(2 * cx - p[i].x, p[i].y));
  return p;
}
const altoArco = (w, R) => Math.sqrt(R * R - (R - w) ** 2);
const contorno = (cx, { w, s, R }, base = 0) => [new V2(cx - w, base), ...arco(cx, base + s, w, R), new V2(cx + w, base)];
const formaU = (cx, ext, int) => new THREE.Shape([...contorno(cx, ext), ...contorno(cx, int).reverse()]);
function anillo(cx, ext, int, base) {
  const s = new THREE.Shape(contorno(cx, ext, base - (ext.w - int.w)));
  s.holes.push(new THREE.Path(contorno(cx, int, base)));
  return s;
}
const extruir = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 });
const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// UV en metros reales, proyección por triángulo según su normal (sin costuras de escala entre piezas)
function uvMundo(g, tile) {
  if (g.index) g = g.toNonIndexed();
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = new V3(), b = new V3(), c = new V3(), n = new V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new V3().subVectors(a, b));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      let u, v;
      if (ay > ax && ay > az) { u = x; v = z; } else if (ax > az) { u = z; v = y; } else { u = x; v = y; }
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  return g;
}

function texturaRadial(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaGradiente(h = 64) {
  const c = document.createElement('canvas'); c.width = 4; c.height = h;
  const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 4, h);
  return new THREE.CanvasTexture(c);
}
function texturaPlaca(n) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 150;
  const x = c.getContext('2d');
  x.fillStyle = '#0d0a09'; x.fillRect(0, 0, 256, 150);
  x.strokeStyle = 'rgba(201,162,74,.55)'; x.lineWidth = 3; x.strokeRect(10, 10, 236, 130);
  const g = x.createLinearGradient(0, 30, 0, 120); g.addColorStop(0, '#f3dc9a'); g.addColorStop(.5, '#b98a34'); g.addColorStop(1, '#e9c879');
  x.fillStyle = g; x.font = '500 84px "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(n, 128, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function crearEscena({ canvas, rm, alProgreso, alCargar, alRayo }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.4 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x1d1215);
  scene.fog = new THREE.FogExp2(FOG, .0115);
  scene.background = FOG;
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 1200);

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, l, t) => alProgreso?.(l / t);
  manager.onLoad = () => alCargar?.();
  const loader = new THREE.TextureLoader(manager);
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cache = {};
  function tex(n, color = false, ext = 'jpg') {
    if (cache[n]) return cache[n];
    const t = loader.load(`tex/${n}.${ext}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return cache[n] = t;
  }
  const pbr = (b, o = {}) => new THREE.MeshStandardMaterial({
    map: tex(b + '_col', true), normalMap: tex(b + '_nor'), roughnessMap: tex(b + '_rug'),
    normalScale: new V2(o.normal ?? 1, o.normal ?? 1), roughness: 1, metalness: 0, color: o.color ?? 0xffffff, envMapIntensity: o.env ?? .4,
  });
  const M = {
    piedra: pbr('piedra', { normal: 1.5 }),
    muro: pbr('piedra', { normal: 1.3, color: 0xc4bcb6 }),
    suelo: pbr('suelo', { normal: 1.1, env: .3 }),
    tierra: pbr('tierra', { normal: 1, env: .12 }),
    pizarra: pbr('pizarra', { normal: 1.2, env: .6 }),
    marmol: pbr('marmol', { normal: .35, env: 1 }),
    hierro: new THREE.MeshStandardMaterial({ color: 0x16130f, metalness: .9, roughness: .42, envMapIntensity: .8 }),
    madera: new THREE.MeshStandardMaterial({ map: tex('puerta_col', true), normalMap: tex('puerta_nor'), roughnessMap: tex('puerta_rug'), metalnessMap: tex('puerta_met'), metalness: 1, roughness: 1, envMapIntensity: .6, normalScale: new V2(1.4, 1.4) }),
    vidrio: new THREE.MeshStandardMaterial({ color: 0x050304, roughness: .2, metalness: 0, emissive: 0x6a1812, emissiveIntensity: .55 }),
    vidrioCalido: new THREE.MeshStandardMaterial({ color: 0x050304, roughness: .2, emissive: 0xc06a2a, emissiveIntensity: .9 }),
  };

  // ---------- lotes: todo lo estático de un material se fusiona en una sola malla ----------
  const lotes = new Map();
  const poner = (mat, g, tile = 3) => { if (!lotes.has(mat)) lotes.set(mat, []); lotes.get(mat).push(uvMundo(g, tile)); };
  function cerrarLotes() {
    for (const [mat, gs] of lotes) {
      const m = new THREE.Mesh(mergeGeometries(gs, false), mat);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
    }
    lotes.clear();
  }
  // gira una pieza dibujada en el plano (u=a lo largo del muro, v=alto) hacia un muro lateral
  const aLado = (g, x, z) => g.rotateY(Math.PI / 2).translate(x, B, z);

  /* ===================== EXTERIOR ===================== */
  // suelo, plaza y camino
  poner(M.tierra, new THREE.PlaneGeometry(600, 600, 1, 1).rotateX(-Math.PI / 2), 9);
  poner(M.suelo, new THREE.PlaneGeometry(3.6, 66).rotateX(-Math.PI / 2).translate(0, .012, 37.1), 3);
  poner(M.suelo, new THREE.PlaneGeometry(17, 9).rotateX(-Math.PI / 2).translate(0, .011, 8.5), 3);
  for (const s of [-1, 1]) poner(M.piedra, caja(.2, .1, 61, s * 1.9, .05, 43.5), 1.5);
  // zócalo y escalinata
  poner(M.piedra, caja(17.6, B, 26.4, 0, B / 2, -11.6), 2.4);
  for (let i = 0; i < 6; i++) {
    const top = B - i * .17;
    poner(M.piedra, caja(7.6 + i * .55, top, .42, 0, top / 2, 1.6 + (i + .5) * .42), 1.6);
  }
  // fachada (muro con hueco del portal, dos lancetas y óculo)
  const PORTAL = { w: 2.9, s: 4.4, R: 3.77 };
  const fachada = new THREE.Shape([new V2(-7.2, 0), new V2(7.2, 0), new V2(7.2, 11), new V2(0, 17.4), new V2(-7.2, 11)]);
  fachada.holes.push(new THREE.Path(contorno(0, PORTAL, .001).map(p => new V2(p.x, Math.max(p.y, .001)))));
  const LAN = { w: .55, s: 3.1, R: .75 };
  for (const x of [-5.45, 5.45]) fachada.holes.push(new THREE.Path(contorno(x, LAN, 4.6)));
  fachada.holes.push(new THREE.Path().absarc(0, 13.1, 1.45, 0, Math.PI * 2, true));
  poner(M.piedra, extruir(fachada, .9).translate(0, B, -.9), 3.2);
  for (const x of [-5.45, 5.45]) {
    poner(M.piedra, extruir(anillo(x, { w: .7, s: 3.1, R: .9 }, LAN, 4.6), .22).translate(0, B, 0), 1);
    poner(M.vidrio, new THREE.ShapeGeometry(new THREE.Shape(contorno(x, LAN, 4.6))).translate(0, B, -.5), 1);
  }
  const ojo = new THREE.Shape().absarc(0, 0, 1.78, 0, Math.PI * 2, false); ojo.holes.push(new THREE.Path().absarc(0, 0, 1.45, 0, Math.PI * 2, true));
  poner(M.piedra, extruir(ojo, .26).translate(0, B + 13.1, 0), 1);
  for (let k = 0; k < 8; k++) poner(M.piedra, new THREE.BoxGeometry(.09, 2.9, .12).rotateZ(k * Math.PI / 8).translate(0, B + 13.1, -.2), 1);
  const ojoIn = new THREE.Shape().absarc(0, 0, .5, 0, Math.PI * 2, false); ojoIn.holes.push(new THREE.Path().absarc(0, 0, .38, 0, Math.PI * 2, true));
  poner(M.piedra, extruir(ojoIn, .14).translate(0, B + 13.1, -.24), 1);
  poner(M.vidrio, new THREE.CircleGeometry(1.46, 40).translate(0, B + 13.1, -.45), 1);
  // pórtico saliente con arquivoltas escalonadas: la entrada se hunde 2,3 m en la piedra
  const porche = new THREE.Shape([new V2(-4, 0), new V2(4, 0), new V2(4, 8.2), new V2(0, 11.2), new V2(-4, 8.2)]);
  porche.holes.push(new THREE.Path(contorno(0, PORTAL, .001).map(p => new V2(p.x, Math.max(p.y, .001)))));
  poner(M.piedra, extruir(porche, 1.4).translate(0, B, 0), 3.2);
  const ARQ = [2.55, 2.2, 1.9, 1.62].map(w => ({ w, s: 3.7 + (w - 1.62) * .55, R: w * 1.3 }));
  ARQ.forEach((a, k) => {
    const zf = 1.4 - k * .55, zb = k === 3 ? Z0 : 1.4 - (k + 1) * .55;
    poner(M.piedra, extruir(formaU(0, PORTAL, a), zf - zb).translate(0, B, zb), 1.6);
    for (const s of [-1, 1]) {
      poner(M.piedra, new THREE.CylinderGeometry(.085, .085, a.s - .3, 12).translate(s * (a.w + .05), B + .3 + (a.s - .3) / 2, zf - .1), 1);
      poner(M.piedra, caja(.26, .3, .26, s * (a.w + .05), B + .15, zf - .1), 1);
      poner(M.piedra, caja(.24, .18, .24, s * (a.w + .05), B + a.s - .05, zf - .1), 1);
    }
  });
  const UMBRAL = ARQ[3];
  poner(M.piedra, caja(3.3, .32, .62, 0, B + 3.7 + .16, -.6), 1.2);
  // gablete del pórtico y pináculos
  const ang = Math.atan2(3, 4);
  for (const s of [-1, 1]) {
    poner(M.piedra, new THREE.BoxGeometry(5.2, .34, 1.6).rotateZ(s * -ang).translate(s * 2, B + 9.75, .7), 1.5);
    poner(M.piedra, caja(.7, 9.6, .7, s * 4.1, B + 4.8, 1.05), 1.5);
    poner(M.piedra, new THREE.ConeGeometry(.42, 2.2, 4).rotateY(Math.PI / 4).translate(s * 4.1, B + 10.7, 1.05), 1);
  }
  // contrafuertes de esquina
  for (const s of [-1, 1]) {
    poner(M.piedra, caja(1.5, 7.5, 2.4, s * 7.65, B + 3.75, -.5), 2);
    poner(M.piedra, caja(1.1, 4.4, 1.8, s * 7.65, B + 10.2, -.6), 2);
    poner(M.piedra, new THREE.ConeGeometry(.75, 3.4, 4).rotateY(Math.PI / 4).translate(s * 7.65, B + 14.1, -.6), 1);
  }
  // muros laterales, cornisa, contrafuertes y lancetas
  for (const s of [-1, 1]) {
    poner(M.piedra, caja(.9, 11, 23.1, s * 6.75, B + 5.5, -12.45), 3.2);
    poner(M.piedra, caja(1.3, .38, 23.8, s * 6.85, B + 11.05, -12.4), 1.6);
    for (const z of [-5.5, -10.5, -15.5, -20.5]) {
      poner(M.piedra, caja(1.1, 7.6, 1.25, s * 7.75, B + 3.8, z), 2);
      poner(M.piedra, caja(.8, 2.6, 1.0, s * 7.6, B + 8.9, z), 2);
    }
    for (const z of [-3, -8, -13, -18, -22.3]) {
      const g = extruir(anillo(0, { w: .78, s: 3, R: 1.02 }, { w: .6, s: 3, R: .8 }, 3.8), .22);
      poner(M.piedra, s > 0 ? aLado(g, 7.2, z) : g.rotateY(-Math.PI / 2).translate(-7.2, B, z), 1);
      const vid = new THREE.ShapeGeometry(new THREE.Shape(contorno(0, { w: .6, s: 3, R: .8 }, 3.8)));
      poner(M.vidrio, s > 0 ? vid.rotateY(Math.PI / 2).translate(7.21, B, z) : vid.rotateY(-Math.PI / 2).translate(-7.21, B, z), 1);
    }
  }
  // muro trasero con el hueco de la puerta 9
  const P9 = { w: 1.0, s: 2.9, R: 1.35 };
  const trasero = new THREE.Shape([new V2(-7.2, -.05), new V2(7.2, -.05), new V2(7.2, 11), new V2(0, 17.4), new V2(-7.2, 11)]);
  trasero.holes.push(new THREE.Path(contorno(0, P9)));
  const LAN9 = { w: .42, s: 2.9, R: .55 };
  for (const x of [-2.25, 2.25]) trasero.holes.push(new THREE.Path(contorno(x, LAN9, 3.7)));
  poner(M.piedra, extruir(trasero, .9).translate(0, B, -24), 3.2);
  // tejado de pizarra
  const aT = Math.atan2(6.6, 7.6), lT = Math.hypot(6.6, 7.6) + .3;
  for (const s of [-1, 1]) poner(M.pizarra, new THREE.BoxGeometry(lT, .3, 25.2).rotateZ(s * -aT).translate(s * 3.8, B + 14.35, -12.2), 2);
  poner(M.piedra, new THREE.BoxGeometry(.4, .4, 25.2).rotateZ(Math.PI / 4).translate(0, B + 17.65, -12.2), 1);
  for (const s of [-1, 1]) poner(M.piedra, new THREE.BoxGeometry(lT - .2, .42, .55).rotateZ(s * -aT).translate(s * 3.75, B + 14.35, .05), 1.4);
  // torre y aguja
  poner(M.piedra, caja(3.6, 10.6, 3.6, 0, B + 15.8, -3.2), 3);
  poner(M.piedra, caja(4.2, .42, 4.2, 0, B + 21.3, -3.2), 1.4);
  poner(M.pizarra, new THREE.ConeGeometry(2.6, 8.6, 4).rotateY(Math.PI / 4).translate(0, B + 21.5 + 4.3, -3.2), 2);
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) poner(M.piedra, new THREE.ConeGeometry(.32, 1.9, 4).rotateY(Math.PI / 4).translate(dx * 1.9, B + 22.45, -3.2 + dz * 1.9), 1);
  for (let k = 0; k < 4; k++) {
    const g = extruir(anillo(0, { w: .58, s: 1.9, R: .76 }, { w: .44, s: 1.9, R: .6 }, 16.7), .18);
    const vid = new THREE.ShapeGeometry(new THREE.Shape(contorno(0, { w: .44, s: 1.9, R: .6 }, 16.7)));
    const r = k * Math.PI / 2;
    poner(M.piedra, g.translate(0, B, 1.8).rotateY(r).translate(0, 0, -3.2), 1);
    poner(M.vidrio, vid.translate(0, B, 1.81).rotateY(r).translate(0, 0, -3.2), 1);
  }
  // verja de hierro con pilares de piedra a la entrada del recinto
  for (const s of [-1, 1]) {
    poner(M.piedra, caja(37.4, .5, .42, s * 21.3, .25, 17), 1.5);
    poner(M.piedra, caja(.72, 2.7, .72, s * 2.4, 1.35, 17), 1.5);
    poner(M.piedra, caja(.9, .22, .9, s * 2.4, 2.81, 17), 1);
    poner(M.piedra, new THREE.ConeGeometry(.3, .55, 4).rotateY(Math.PI / 4).translate(s * 2.4, 3.2, 17), 1);
    for (const x of [8, 14, 20, 26, 32, 38]) { poner(M.piedra, caja(.5, 1.9, .5, s * x, .95, 17), 1.5); }
    poner(M.hierro, caja(37, .05, .05, s * 21.3, 1.55, 17), 1);
    poner(M.hierro, caja(37, .05, .05, s * 21.3, .75, 17), 1);
  }
  const barras = new THREE.InstancedMesh(new THREE.BoxGeometry(.028, 1.55, .028), M.hierro, 470);
  const puntas = new THREE.InstancedMesh(new THREE.ConeGeometry(.04, .16, 4), M.hierro, 470);
  { const m = new THREE.Matrix4(); let k = 0;
    for (const s of [-1, 1]) for (let x = 2.85; x < 40 && k < 470; x += .16, k++) {
      m.makeTranslation(s * x, .5 + .775, 17); barras.setMatrixAt(k, m);
      m.makeTranslation(s * x, .5 + 1.55 + .08, 17); puntas.setMatrixAt(k, m);
    }
    barras.count = puntas.count = k; }
  barras.castShadow = puntas.castShadow = true;
  scene.add(barras, puntas);
  // faroles a los lados de la escalinata
  const faroles = [];
  for (const s of [-1, 1]) {
    poner(M.hierro, new THREE.CylinderGeometry(.06, .08, 2.4, 10).translate(s * 4.7, 1.2, 4.7), 1);
    poner(M.hierro, caja(.42, .06, .42, s * 4.7, 2.4, 4.7), 1);
    poner(M.hierro, new THREE.ConeGeometry(.3, .25, 4).rotateY(Math.PI / 4).translate(s * 4.7, 2.98, 4.7), 1);
    const vid = new THREE.Mesh(new THREE.BoxGeometry(.3, .44, .3), M.vidrioCalido);
    vid.position.set(s * 4.7, 2.66, 4.7); scene.add(vid);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) poner(M.hierro, caja(.03, .5, .03, s * 4.7 + dx * .16, 2.66, 4.7 + dz * .16), 1);
    const l = new THREE.PointLight(0xffa25a, 7, 13, 2); l.position.set(s * 4.7, 2.66, 4.7); scene.add(l);
    faroles.push(l);
  }
  // portal: tímpano con la portada del álbum, dintel y hojas de la puerta principal
  const TIMP = new THREE.Shape(arco(0, 3.7, UMBRAL.w, UMBRAL.R).map(p => new V2(p.x, Math.max(p.y, 4.02))));
  const gT = new THREE.ShapeGeometry(TIMP);
  { const p = gT.attributes.position, uv = gT.attributes.uv, ap = altoArco(UMBRAL.w, UMBRAL.R) - .32;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + UMBRAL.w) / (2 * UMBRAL.w), .2 + (p.getY(i) - 4.02) / ap * .62); }
  const portada = loader.load('img/portada.png'); portada.colorSpace = THREE.SRGBColorSpace; portada.anisotropy = ANISO;
  const matTimp = new THREE.MeshStandardMaterial({ map: portada, emissiveMap: portada, emissive: 0xffffff, emissiveIntensity: .32, roughness: .3, metalness: .25, envMapIntensity: 1.2 });
  const timpano = new THREE.Mesh(gT.translate(0, B, -.62), matTimp); timpano.receiveShadow = true; scene.add(timpano);
  const hojasPortal = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * UMBRAL.w, B, -.83);
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(UMBRAL.w, 3.7, .1).translate(-s * UMBRAL.w / 2, 1.85, 0), M.madera);
    hoja.castShadow = hoja.receiveShadow = true; piv.add(hoja); scene.add(piv); hojasPortal.push([piv, s]);
  }
  const luzPortal = new THREE.PointLight(0xffb27a, 6, 16, 2); luzPortal.position.set(0, B + 2.5, -3.2); scene.add(luzPortal);
  const luzPorche = new THREE.PointLight(0xff9a62, 2.5, 7, 2); luzPorche.position.set(0, B + 3, .2); scene.add(luzPorche);

  // sombras de contacto al pie del zócalo y de la escalinata
  const grad = texturaGradiente();
  const matContacto = new THREE.MeshBasicMaterial({ map: grad, color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  matContacto.alphaMap = grad;
  const tira = (w, x, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.2), matContacto); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .02, z); scene.add(m); };
  tira(26.4, 9.9, -11.6, -Math.PI / 2); tira(26.4, -9.9, -11.6, Math.PI / 2); tira(17.6, 0, -25.9, Math.PI);
  for (const s of [-1, 1]) tira(2.5, s * 5.6, 3.1, s * -Math.PI / 2);

  /* ===================== INTERIOR ===================== */
  const LEN = Z0 - Z1;
  const PUERTA = { w: .74, s: 2.45, R: 1.0 };
  const MARCO = { w: .88, s: 2.45, R: 1.14 };
  const puertasDef = CANCIONES.map((c, i) => {
    if (i === 8) return { i, lado: 0, z: Z1, dim: P9 };
    const lado = i % 2 === 0 ? -1 : 1;
    return { i, lado, u: 4 + i * 2.2, z: Z0 - (4 + i * 2.2), dim: PUERTA };
  });
  for (const s of [-1, 1]) {
    const muro = new THREE.Shape([new V2(0, -.05), new V2(LEN, -.05), new V2(LEN, 8), new V2(0, 8)]);
    for (const d of puertasDef) if (d.lado === s) {
      muro.holes.push(new THREE.Path(contorno(d.u, PUERTA)));
      muro.holes.push(new THREE.Path(contorno(d.u, { w: .42, s: 1.5, R: .56 }, 5.1)));
    }
    const g = extruir(muro, MURO).rotateY(Math.PI / 2).translate(s < 0 ? -IW - MURO : IW, B, Z0);
    poner(M.muro, g, 2.6);
    for (const d of puertasDef) if (d.lado === s) {
      const v = new THREE.ShapeGeometry(new THREE.Shape(contorno(0, { w: .42, s: 1.5, R: .56 }, 5.1))).rotateY(Math.PI / 2).translate(s * (IW + .45), B, d.z);
      poner(M.vidrio, v, 1);
      const anillo2 = extruir(anillo(0, { w: .52, s: 1.5, R: .66 }, { w: .42, s: 1.5, R: .56 }, 5.1), .1).rotateY(Math.PI / 2).translate(s < 0 ? -IW : IW - .1, B, d.z);
      poner(M.piedra, anillo2, 1);
    }
  }
  // columnas adosadas, nervios y bóveda apuntada
  for (let j = 0; j < 10; j++) {
    const z = Z0 - (j ? .7 + j * 2.2 : .7);
    for (const s of [-1, 1]) {
      poner(M.piedra, new THREE.CylinderGeometry(.21, .21, 7.5, 18).translate(s * (IW - .04), B + .3 + 3.75, z), 1.2);
      poner(M.piedra, caja(.62, .3, .62, s * (IW - .06), B + .15, z), 1);
      poner(M.piedra, caja(.58, .26, .58, s * (IW - .06), B + 7.87, z), 1);
    }
    poner(M.piedra, extruir(new THREE.Shape([...arco(0, 0, IW, 5), ...arco(0, 0, IW - .26, 4.74).reverse()]), .3).translate(0, B + 8, z - .15), 1.2);
  }
  poner(M.muro, extruir(new THREE.Shape([...arco(0, 0, IW + .3, 5.3), ...arco(0, 0, IW, 5).reverse()]), LEN).translate(0, B + 8, Z1), 2.6);
  poner(M.marmol, new THREE.PlaneGeometry(IW * 2, LEN).rotateX(-Math.PI / 2).translate(0, B + .003, (Z0 + Z1) / 2), 3);
  for (const x of [-2.25, 2.25]) poner(M.vidrio, new THREE.ShapeGeometry(new THREE.Shape(contorno(x, LAN9, 3.7))).translate(0, B, -23.6), 1);
  // lámparas colgantes de hierro
  const lamparas = [-5.5, -10.9, -16.3, -21].map(z => {
    poner(M.hierro, new THREE.CylinderGeometry(.015, .015, 7.8, 6).translate(0, B + 4.6 + 3.9, z), 1);
    poner(M.hierro, new THREE.TorusGeometry(.55, .025, 8, 40).rotateX(Math.PI / 2).translate(0, B + 4.6, z), 1);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; poner(M.hierro, new THREE.CylinderGeometry(.008, .008, 1.1, 4).rotateZ(.46).rotateY(a).translate(Math.cos(a) * .27, B + 5.1, z - Math.sin(a) * .27), 1); }
    return new V3(0, B + 4.6, z);
  });
  const bulbos = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd7a0 }), 24);
  { const m = new THREE.Matrix4(); let k = 0; for (const p of lamparas) for (let a = 0; a < 6; a++) { m.makeTranslation(p.x + Math.cos(a * Math.PI / 3) * .55, p.y + .06, p.z + Math.sin(a * Math.PI / 3) * .55); bulbos.setMatrixAt(k++, m); } }
  scene.add(bulbos);

  // ---------- las nueve puertas ----------
  const glowTex = texturaRadial([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
  const charcoTex = texturaRadial([[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]);
  const puertas = puertasDef.map(d => {
    const c = CANCIONES[d.i], luz = new THREE.Color(c.luz), dim = d.dim;
    const marco = new THREE.Group();
    if (d.lado === 0) { marco.position.set(0, B, Z1 - .8); }
    else { marco.position.set(d.lado * (IW + .48), B, d.z); marco.rotation.y = d.lado < 0 ? Math.PI / 2 : -Math.PI / 2; }
    scene.add(marco);
    // moldura de piedra en la cara de la nave
    const mold = d.lado === 0
      ? extruir(formaU(0, { w: 1.16, s: 2.9, R: 1.51 }, P9), .16).translate(0, B, Z1)
      : extruir(formaU(0, MARCO, PUERTA), .12).rotateY(Math.PI / 2).translate(d.lado < 0 ? -IW : IW - .12, B, d.z);
    poner(M.piedra, mold, 1);
    // hojas: medio arco cada una, con bisagra en el borde exterior
    const ap = altoArco(dim.w, dim.R), arcPts = arco(0, dim.s, dim.w, dim.R);
    const mitad = arcPts.slice(0, Math.ceil(arcPts.length / 2));
    const hojas = [-1, 1].map(s => {
      const izq = [new V2(-dim.w, 0), new V2(0, 0), new V2(0, dim.s + ap), ...mitad.slice().reverse().slice(1)];
      const pts = s < 0 ? izq : izq.map(p => new V2(-p.x, p.y));
      const g = extruir(new THREE.Shape(pts), .065);
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) + dim.w) / (2 * dim.w), p.getY(k) / (dim.s + ap));
      g.translate(-s * dim.w, 0, 0);
      const piv = new THREE.Group(); piv.position.set(s * dim.w, 0, -.02);
      const m = new THREE.Mesh(g, M.madera); m.castShadow = m.receiveShadow = true;
      const tirador = new THREE.Mesh(new THREE.TorusGeometry(.06, .012, 6, 18), M.hierro);
      tirador.position.set(-s * dim.w + -s * -.12, 1.15, .085); piv.add(m, tirador);
      marco.add(piv);
      return { piv, s };
    });
    // habitación detrás (solo caras interiores) + resplandor de fondo
    const matHab = new THREE.MeshStandardMaterial({ map: tex('piedra_col', true), color: luz.clone().lerp(new THREE.Color(0x141010), .86), roughness: .95, side: THREE.BackSide, emissive: luz, emissiveIntensity: .02 });
    const anchoHab = dim.w * 2 + .9, altoHab = dim.s + ap + .4;
    const hab = new THREE.Mesh(new THREE.BoxGeometry(anchoHab, altoHab, 1.8).translate(0, altoHab / 2, -.92), matHab);
    marco.add(hab);
    const fondo = new THREE.Mesh(new THREE.PlaneGeometry(anchoHab * .9, altoHab * .95), new THREE.MeshBasicMaterial({ map: glowTex, color: luz, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false }));
    fondo.position.set(0, altoHab * .45, -1.78); marco.add(fondo);
    // luz que se escapa por debajo y su reflejo en el mármol
    const rendija = new THREE.Mesh(new THREE.BoxGeometry(dim.w * 2 - .04, .012, .02), new THREE.MeshBasicMaterial({ color: luz }));
    rendija.position.set(0, .006, .03); marco.add(rendija);
    const charco = new THREE.Mesh(new THREE.PlaneGeometry(dim.w * 3.2, 2.2), new THREE.MeshBasicMaterial({ map: charcoTex, color: luz, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(0, .012, d.lado === 0 ? 1.1 : 1.0 + .5); marco.add(charco);
    // placa con el número
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(.46, .27), new THREE.MeshStandardMaterial({ map: texturaPlaca(c.n), roughness: .4, metalness: .5, emissive: 0x2a1c08, emissiveIntensity: .4 }));
    placa.position.set(0, dim.s + ap + .42, d.lado === 0 ? 1.0 : .62); marco.add(placa);
    return { ...d, c, luz, marco, hojas, matHab, fondo, rendija, charco, ap, abierto: 0, objetivo: 0, brillo: 0, objetivoBrillo: 0 };
  });

  cerrarLotes();

  /* ===================== CIELO, NIEBLA, RAYOS, PARTÍCULAS ===================== */
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uT: { value: 0 }, uF: { value: 0 }, uD: { value: new V3(0, .3, -1) }, uFog: { value: FOG } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; uniform float uT,uF; uniform vec3 uD,uFog;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){ vec3 d=normalize(vD); float y=d.y;
        vec2 uv=d.xz/(max(y,0.)+.18)*.9+vec2(uT*.004,uT*.0015);
        float c=fbm(uv); float c2=fbm(uv*2.3+c*1.7-vec2(uT*.006,0.));
        float nube=smoothstep(.38,.9,c*.65+c2*.5);
        vec3 alto=vec3(.022,.018,.026), horiz=vec3(.16,.055,.06);
        vec3 col=mix(horiz,alto,smoothstep(-.02,.5,y));
        col=mix(col, vec3(.045,.035,.045)+horiz*.35*(1.-smoothstep(0.,.35,y)), nube*.85);
        float fl=pow(max(dot(d,normalize(uD)),0.),5.);
        col+=vec3(.85,.82,1.)*uF*fl*(.35+nube*1.3)+vec3(.3,.25,.35)*uF*.18;
        col=mix(uFog*1.05,col,smoothstep(-.06,.12,y));
        gl_FragColor=vec4(col,1.); }`,
  }));
  scene.add(cielo);

  const arbolesLejos = tex('arboles_lejos', true, 'png'), arbolesCerca = tex('arboles_cerca', true, 'png');
  arbolesLejos.wrapS = arbolesCerca.wrapS = THREE.RepeatWrapping;
  const bosque = (t, w, h, x, z, ry, rep = 1) => {
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: .05, depthWrite: false, color: 0x5a4a50, fog: true, side: THREE.DoubleSide });
    t.repeat.set(rep, 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, h / 2 - .5, z); m.rotation.y = ry; scene.add(m);
  };
  bosque(arbolesLejos, 420, 46, 0, -150, 0, 3);
  bosque(arbolesLejos, 260, 40, -120, -10, Math.PI / 2.4, 2);
  bosque(arbolesLejos, 260, 40, 120, -10, -Math.PI / 2.4, 2);
  bosque(arbolesCerca, 90, 26, -42, -48, .5);
  bosque(arbolesCerca, 90, 26, 44, -52, -.45);
  bosque(arbolesCerca, 70, 22, -58, 20, 1.2);
  bosque(arbolesCerca, 70, 22, 60, 24, -1.25);

  const nieblaTex = tex('niebla'); nieblaTex.wrapS = nieblaTex.wrapT = THREE.RepeatWrapping;
  const capasNiebla = [];
  const capa = (w, h, x, y, z, ry, op, vel) => {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { uMap: { value: nieblaTex }, uT: { value: 0 }, uOp: { value: op }, uCol: { value: new THREE.Color(0x4a383e) }, uF: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform sampler2D uMap; uniform float uT,uOp,uF; uniform vec3 uCol;
        void main(){ float a=texture2D(uMap,vUv*vec2(2.2,.8)+vec2(uT,0.)).r*texture2D(uMap,vUv*vec2(1.3,.6)+vec2(-uT*.7,.37)).r*2.2;
          a*=smoothstep(0.,.3,vUv.y)*smoothstep(1.,.4,vUv.y)*smoothstep(0.,.2,vUv.x)*smoothstep(1.,.8,vUv.x);
          gl_FragColor=vec4(uCol*(1.+uF*2.5),a*uOp); }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 2;
    scene.add(m); capasNiebla.push({ mat, vel });
  };
  capa(160, 9, 0, 3.2, -45, 0, .55, .004);
  capa(120, 7, 0, 2.4, -12, 0, .32, -.006);
  capa(90, 5, -18, 1.6, 10, .2, .35, .008);
  capa(90, 5, 18, 1.4, 26, -.15, .4, -.007);
  capa(70, 4, 0, 1.2, 46, 0, .3, .01);
  const sueloNiebla = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uMap: { value: nieblaTex }, uT: { value: 0 }, uCol: { value: new THREE.Color(0x3d2e33) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform sampler2D uMap; uniform float uT; uniform vec3 uCol;
      void main(){ float a=texture2D(uMap,vUv*7.+vec2(uT,uT*.4)).r; float r=length(vUv-.5)*2.; gl_FragColor=vec4(uCol,a*.42*smoothstep(1.,.3,r)); }`,
  }));
  sueloNiebla.rotation.x = -Math.PI / 2; sueloNiebla.position.set(0, .35, 20); sueloNiebla.renderOrder = 1; scene.add(sueloNiebla);

  // luces
  const hemi = new THREE.HemisphereLight(0x46485a, 0x2c1515, .9); scene.add(hemi);
  const luna = new THREE.DirectionalLight(0xa4b0d4, 1.25);
  luna.position.set(-28, 42, 38); luna.target.position.set(0, 4, -8);
  luna.castShadow = true;
  luna.shadow.mapSize.set(MOVIL ? 1024 : 2048, MOVIL ? 1024 : 2048);
  Object.assign(luna.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 150 });
  luna.shadow.bias = -.0004; luna.shadow.normalBias = .03;
  scene.add(luna, luna.target);
  const relampago = new THREE.DirectionalLight(0xd4dcff, 0); relampago.position.set(30, 60, 30); scene.add(relampago);
  const luzNave = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffd2aa, 0, 12, 2); scene.add(l); return l; });
  const luzPuerta = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 5, 2); scene.add(l); return l; });

  // entorno para reflejos sutiles (mármol, hierro, tímpano)
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x0b0809, side: THREE.BackSide })));
    // cielo de tormenta en miniatura: franja rojiza en el horizonte, cenit casi negro, un punto cálido (la puerta)
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, m = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), new THREE.MeshBasicMaterial({ color: 0x3a1214 })); m.position.set(Math.cos(a) * 9, .6, Math.sin(a) * 9); m.lookAt(0, .6, 0); es.add(m); }
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), new THREE.MeshBasicMaterial({ color: 0x7a4020 })); m2.position.set(0, 1.5, -9); m2.lookAt(0, 1.5, 0); es.add(m2);
    scene.environment = pm.fromScene(es, .04).texture; }

  // rayo: textura dibujada en cada descarga
  const rayoCanvas = document.createElement('canvas'); rayoCanvas.width = 256; rayoCanvas.height = 1024;
  const rayoTex = new THREE.CanvasTexture(rayoCanvas); rayoTex.colorSpace = THREE.SRGBColorSpace;
  const rayoMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 280), new THREE.MeshBasicMaterial({ map: rayoTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
  rayoMesh.renderOrder = -1; scene.add(rayoMesh);
  function dibujarRayo() {
    const x = rayoCanvas.getContext('2d'); x.clearRect(0, 0, 256, 1024);
    const ramas = [[[128 + (Math.random() - .5) * 60, 0]]];
    let px = ramas[0][0][0], py = 0;
    while (py < 1000) { py += 18 + Math.random() * 34; px += (Math.random() - .5) * 46; px = cl(px, 20, 236); ramas[0].push([px, py]);
      if (Math.random() < .16 && ramas.length < 5) { const r = [[px, py]]; let bx = px, by = py; const dir = Math.random() < .5 ? -1 : 1; for (let k = 0; k < 7; k++) { by += 20 + Math.random() * 20; bx += dir * Math.random() * 26; r.push([bx, by]); } ramas.push(r); } }
    ramas.forEach((pts, j) => {
      for (const [w, a, blur] of [[10, .12, 24], [3.2, .55, 10], [1.4, 1, 0]]) {
        x.strokeStyle = `rgba(235,238,255,${a * (j ? .6 : 1)})`; x.lineWidth = w * (j ? .55 : 1); x.shadowColor = 'rgba(200,190,255,1)'; x.shadowBlur = blur;
        x.beginPath(); pts.forEach(([a1, b1], q) => q ? x.lineTo(a1, b1) : x.moveTo(a1, b1)); x.stroke();
      }
    });
    rayoTex.needsUpdate = true;
  }

  const mota = texturaRadial([[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']], 64);
  function particulas(n, caja3, color, tam, op) {
    const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3), base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) p[i * 3 + k] = base[i * 3 + k] = caja3[k][0] + Math.random() * (caja3[k][1] - caja3[k][0]);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ map: mota, color, size: tam, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.userData = { base, fase: Float32Array.from({ length: n }, () => Math.random() * 6.28), caja3 };
    scene.add(m); return m;
  }
  const polvoExt = particulas(MOVIL ? 380 : 750, [[-22, 22], [0, 9], [-6, 72]], 0xc8b8b8, .07, .45);
  const polvoInt = particulas(MOVIL ? 260 : 520, [[-3.6, 3.6], [B, B + 7], [-22.8, -1]], 0xffd2a0, .03, .55);

  /* ===================== POSTPROCESO ===================== */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new V2(256, 256), .55, .6, .82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ===================== CÁMARA ===================== */
  const RUTA_P = new THREE.CatmullRomCurve3([
    new V3(10, 5.6, 82), new V3(6, 3.8, 56), new V3(1.6, 2.7, 33), new V3(0, 2.3, 18), new V3(0, 2.5, 8.6),
    new V3(0, B + 1.66, 3.4), new V3(0, B + 1.66, .2), new V3(0, B + 1.66, -1.9)], false, 'centripetal');
  const RUTA_T = new THREE.CatmullRomCurve3([
    new V3(0, 9.5, 0), new V3(0, 8, 0), new V3(0, 6, 0), new V3(0, 4.6, 0), new V3(0, 3.6, -.8),
    new V3(0, B + 2.1, -4), new V3(0, B + 1.8, -9), new V3(0, B + 1.7, -13)], false, 'centripetal');
  const U_EXT = 4.6, U_NAVE = 4.95, PASO = .9;
  const U_FIN = U_NAVE + 8 * PASO;
  let FACTOR_PUERTA = .8;
  function estacion(i) {
    const d = puertas[i];
    if (d.lado === 0) return [new V3(0, B + 1.66, -19.4), new V3(0, B + 1.95, Z1)];
    const pos = new V3(-d.lado * 1.15, B + 1.66, d.z + 2.5);
    const puerta = new V3(d.lado * IW, B + 1.6, d.z), frente = new V3(0, B + 1.6, d.z - 7);
    return [pos, frente.lerp(puerta, FACTOR_PUERTA)];
  }
  function poseScroll(u) {
    if (u <= U_EXT) {
      const t = cl((u - .12) / (U_EXT - .12));
      return [RUTA_P.getPointAt(t), RUTA_T.getPointAt(t)];
    }
    const [p0, t0] = [RUTA_P.getPointAt(1), RUTA_T.getPointAt(1)];
    const [p1, t1] = estacion(0);
    if (u < U_NAVE) { const f = suave(U_EXT, U_NAVE, u); return [p0.lerp(p1, f), t0.lerp(t1, f)]; }
    const s = cl((u - U_NAVE) / PASO, 0, 8), i = Math.min(7, Math.floor(s)), f = suave(.18, .82, s - i);
    const [a, ta] = estacion(i), [b, tb] = estacion(Math.min(8, i + 1));
    return [a.lerp(b, f), ta.lerp(tb, f)];
  }
  const uDePuerta = i => U_NAVE + i * PASO;

  /* ===================== ESTADO Y ANIMACIÓN ===================== */
  let tiempo = 0, uActual = 0, anim = null, mezcla = null, retenido = false; // retenido: la cámara se queda dentro de la habitación
  let rayo = null, proximoRayo = 3.5;
  const cam = { p: new V3(), t: new V3() };
  const tmp = new V3();
  const fovBase = () => camera.aspect < 1 ? 64 : 50;

  function tamano(w, h) {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = fovBase();
    FACTOR_PUERTA = camera.aspect < 1 ? .97 : .8;
    camera.updateProjectionMatrix();
    bloom.resolution.set(w / 2, h / 2);
  }

  const mundo = (d, x, y, z) => d.marco.localToWorld(new V3(x, y, z));

  // lienzo: la atmósfera 2D de la canción, proyectada en vivo en el fondo de esa habitación
  // La ventana mide exactamente el campo visual de la cámara al final del avance:
  // cuando la cámara se detiene, la ventana llena la pantalla y la habitación 2D la releva sin salto.
  let ventana = null;
  const DIST_VENTANA = .9;
  function entrar(i, lienzo) {
    const d = puertas[i];
    quitarVentana();
    if (lienzo) {
      const t = new THREE.CanvasTexture(lienzo); t.colorSpace = THREE.SRGBColorSpace;
      const alto = 2 * DIST_VENTANA * Math.tan(THREE.MathUtils.degToRad(fovBase() + 9) / 2), ancho = alto * camera.aspect;
      ventana = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false }));
      ventana.position.set(0, 1.62, -1.77); d.marco.add(ventana);
    }
    const p0 = cam.p.clone(), t0 = cam.t.clone();
    const pf = mundo(d, 0, 1.62, 2.1), tf = mundo(d, 0, 1.45, 0);
    const pin = mundo(d, 0, 1.62, -1.77 + DIST_VENTANA), tin = mundo(d, 0, 1.62, -4);
    return new Promise(res => {
      const a = anim = { tipo: 'entrar', d, inicio: performance.now(), t: 0, dur: rm ? .55 : 2.5, p0, t0, pf, tf, pin, tin, res, avisado: false };
      // respaldo: si el navegador deja de pintar (pantalla bloqueada, pestaña oculta) la interfaz no se queda a medias
      setTimeout(() => { if (!a.avisado) { a.avisado = true; res(); } }, a.dur * 800 + 400);
    });
  }
  function salir(i) {
    const d = puertas[i];
    quitarVentana();
    d.abierto = 1; d.objetivo = 0;
    cam.p.copy(mundo(d, 0, 1.62, 2.1)); cam.t.copy(mundo(d, 0, 1.45, 0));
    anim = null; retenido = false;
    mezcla = { inicio: performance.now(), t: 0, dur: rm ? .01 : 1.6, p0: cam.p.clone(), t0: cam.t.clone() };
    camera.fov = fovBase(); camera.updateProjectionMatrix();
  }
  // durante una habitación la cámara queda frente a la puerta abierta de esa canción
  function ponerEnPuerta(i) {
    puertas.forEach((q, k) => { q.abierto = q.objetivo = k === i ? 1 : 0; q.objetivoBrillo = k === i ? 1 : 0; });
    retenido = true;
    cam.p.copy(mundo(puertas[i], 0, 1.62, -1.77 + DIST_VENTANA)); cam.t.copy(mundo(puertas[i], 0, 1.62, -4));
  }

  function quitarVentana() {
    if (!ventana) return;
    ventana.parent.remove(ventana); ventana.material.map.dispose(); ventana.material.dispose(); ventana.geometry.dispose(); ventana = null;
  }
  function preescucha(i, on) {
    puertas.forEach((d, k) => { if (k === i) { d.objetivo = on ? .2 : 0; d.objetivoBrillo = on ? .9 : 0; } });
  }

  function actualizarRayo(dt, dentro) {
    proximoRayo -= dt;
    if (proximoRayo <= 0) {
      proximoRayo = 6 + Math.random() * 10;
      const az = Math.atan2(cam.t.x - cam.p.x, cam.t.z - cam.p.z) + (Math.random() - .5) * 1.6;
      const dist = 260 + Math.random() * 200;
      rayo = { t: 0, dir: new V3(Math.sin(az), .35 + Math.random() * .2, Math.cos(az)).normalize(), az, dist, fuerza: .55 + Math.random() * .45 };
      if (!rm) { dibujarRayo(); rayoMesh.position.set(cam.p.x + Math.sin(az) * dist, 110, cam.p.z + Math.cos(az) * dist); }
      alRayo?.(rayo.fuerza, dist, dentro);
    }
    let f = 0;
    if (rayo) {
      rayo.t += dt; const t = rayo.t * 1000;
      if (rm) f = Math.sin(cl(rayo.t / 2.6) * Math.PI) * .25;
      else f = (t < 70 ? 1 : t < 130 ? .2 : t < 240 ? .85 : t < 300 ? .3 : .75 * Math.exp(-(t - 300) / 190)) * rayo.fuerza;
      if (rayo.t > (rm ? 2.6 : 1.3)) rayo = null;
    }
    cielo.material.uniforms.uF.value = f;
    if (rayo) cielo.material.uniforms.uD.value.copy(rayo.dir);
    rayoMesh.material.opacity = rm ? 0 : cl(f * 1.4);
    rayoMesh.lookAt(cam.p);
    relampago.intensity = dentro ? 0 : f * 2.4;
    if (rayo) relampago.position.copy(rayo.dir).multiplyScalar(60);
    M.vidrio.emissiveIntensity = .55 + f * (dentro ? 7 : 3);
    hemi.intensity = (dentro ? .22 : .9) + f * (dentro ? .5 : .6);
    capasNiebla.forEach(c => c.mat.uniforms.uF.value = f);
    return f;
  }

  function moverParticulas(pts, dt, atraer) {
    const pos = pts.geometry.attributes.position, { base, fase } = pts.userData;
    for (let i = 0; i < pos.count; i++) {
      fase[i] += dt * .4;
      let x = base[i * 3] + Math.sin(fase[i] * .7) * .25, y = base[i * 3 + 1] + Math.sin(fase[i]) * .15, z = base[i * 3 + 2] + Math.cos(fase[i] * .5) * .25;
      if (!rm) { base[i * 3] += dt * .05; base[i * 3 + 2] -= dt * .02; }
      for (let k = 0; k < 3; k++) { const [lo, hi] = pts.userData.caja3[k]; if (base[i * 3 + k] < lo) base[i * 3 + k] += hi - lo; else if (base[i * 3 + k] > hi) base[i * 3 + k] -= hi - lo; }
      if (atraer) {
        tmp.set(x, y, z).sub(atraer.p); const dd = tmp.length();
        const k = atraer.k / (1 + dd * .4);
        base[i * 3] -= tmp.x * k * dt; base[i * 3 + 1] -= tmp.y * k * dt; base[i * 3 + 2] -= tmp.z * k * dt;
      }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }
  function reponerParticulas(pts) { const { base, caja3 } = pts.userData; for (let i = 0; i < base.length; i++) base[i] = caja3[i % 3][0] + Math.random() * (caja3[i % 3][1] - caja3[i % 3][0]); }

  function actualizar(dt, u, { usarScroll = true } = {}) {
    tiempo += dt; uActual = u;
    // cámara
    if (anim) {
      // reloj real: la transición dura lo mismo aunque el dispositivo vaya lento
      anim.t = (performance.now() - anim.inicio) / 1000; const k = cl(anim.t / anim.dur), T = anim.t, a = anim, d = a.d;
      if (rm) {
        d.objetivo = 1; d.objetivoBrillo = 1;
        cam.p.copy(a.pf); cam.t.copy(a.tf);
      } else {
        const giro = eio(cl(T / .95));
        cam.p.copy(a.p0).lerp(a.pf, giro); cam.t.copy(a.t0).lerp(a.tf, giro);
        if (T > .35) { d.objetivo = 1; d.objetivoBrillo = 1; }
        const avance = cl((T - .95) / (a.dur - .95)), e = avance * avance * (3 - 2 * avance) * .4 + avance * avance * .6;
        if (avance > 0) { cam.p.copy(a.pf).lerp(a.pin, e); cam.t.copy(a.tf).lerp(a.tin, e); }
        camera.fov = fovBase() + 9 * e; camera.updateProjectionMatrix();
      }
      if (!a.avisado && k >= (rm ? .6 : .78)) { a.avisado = true; a.res(); }
      if (k >= 1) { anim = null; retenido = true; }
    } else if (usarScroll && !retenido) {
      const [p, t] = poseScroll(u);
      if (mezcla) {
        mezcla.t = (performance.now() - mezcla.inicio) / 1000; const f = eio(cl(mezcla.t / mezcla.dur));
        cam.p.copy(mezcla.p0).lerp(p, f); cam.t.copy(mezcla.t0).lerp(t, f);
        if (f >= 1) mezcla = null;
      } else {
        // pequeña respiración de cámara en reposo, como sostenida a mano
        const r = rm ? 0 : 1;
        cam.p.copy(p).add(tmp.set(Math.sin(tiempo * .31) * .03 * r, Math.sin(tiempo * .47) * .02 * r, 0)); cam.t.copy(t);
      }
    }
    camera.position.copy(cam.p); camera.lookAt(cam.t);
    const dentro = cam.p.z < -.6;

    // portal: se abre al subir la escalinata
    const abrePortal = 1 - suave(1.4, 4.8, cam.p.z);
    hojasPortal.forEach(([piv, s]) => piv.rotation.y = s * abrePortal * 1.5); // hacia fuera: quedan dentro del pórtico
    luzPortal.intensity = 5 + abrePortal * 9;
    faroles.forEach((l, k) => l.intensity = 6.5 + Math.sin(tiempo * 9 + k * 2) * .35 + Math.sin(tiempo * 23 + k) * .25);

    const f = actualizarRayo(dt, dentro);
    cielo.material.uniforms.uT.value = rm ? 0 : tiempo;
    if (!rm) { capasNiebla.forEach(c => c.mat.uniforms.uT.value += c.vel * dt); sueloNiebla.material.uniforms.uT.value += dt * .004; }
    luna.intensity = dentro ? 0 : 1.25;

    // puertas: hojas, luz, habitación
    for (const d of puertas) {
      const vel = anim && anim.d === d ? 1.25 : 2.2;
      d.abierto += (d.objetivo - d.abierto) * cl(dt * vel);
      if (anim && anim.d === d) d.abierto = Math.max(d.abierto, rm ? cl(anim.t / .35) : eio(cl((anim.t - .35) / 1.1)));
      d.brillo += (d.objetivoBrillo - d.brillo) * cl(dt * 2.5);
      const ang = cl(d.abierto) * 1.8;
      d.hojas.forEach(({ piv, s }) => piv.rotation.y = -s * ang); // se abren hacia la habitación
      d.matHab.emissiveIntensity = .012 + d.brillo * .018;
      d.fondo.material.opacity = ventana && ventana.parent === d.marco ? 0 : .18 + d.brillo * .7;
      d.charco.material.opacity = .16 + d.brillo * .35 + d.abierto * .3;
    }
    // luces dinámicas: las tres lámparas y las tres puertas más cercanas a la cámara
    const porDist = (a, b) => a.distanceToSquared(cam.p) - b.distanceToSquared(cam.p);
    lamparas.slice().sort(porDist).forEach((p, k) => { if (k < 3) { luzNave[k].position.copy(p); luzNave[k].intensity = dentro || cam.p.z < 1.5 ? 8.5 : 0; } });
    puertas.slice().sort((a, b) => porDist(a.marco.position, b.marco.position)).slice(0, 3).forEach((d, k) => {
      const l = luzPuerta[k]; l.color.copy(d.luz); l.position.copy(mundo(d, 0, .9, .7));
      l.intensity = dentro ? 1 + d.brillo * 2.4 + d.abierto * 1.2 : 0;
    });
    if (ventana) ventana.material.map.needsUpdate = true;
    moverParticulas(polvoExt, dt, null);
    moverParticulas(polvoInt, dt, anim && !rm && anim.t > .8 ? { p: mundo(anim.d, 0, 1.4, -1), k: 1.6 * cl((anim.t - .8) / 1.2) } : null);
    return f;
  }

  function render() { composer.render(); }

  // rectángulo de pantalla de cada puerta, para los botones accesibles superpuestos
  const proy = new V3();
  function rectPuertas(w, h) {
    return puertas.map(d => {
      const pts = [mundo(d, -d.dim.w, 0, .1), mundo(d, d.dim.w, 0, .1), mundo(d, 0, d.dim.s + d.ap, .1), mundo(d, -d.dim.w, d.dim.s, .1), mundo(d, d.dim.w, d.dim.s, .1)];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, delante = true;
      for (const p of pts) {
        proy.copy(p).applyMatrix4(camera.matrixWorldInverse); if (proy.z > -.2) delante = false;
        proy.copy(p).project(camera);
        const sx = (proy.x * .5 + .5) * w, sy = (-proy.y * .5 + .5) * h;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      const centro = mundo(d, 0, 1.2, 0), dist = centro.distanceTo(cam.p);
      const normal = mundo(d, 0, 1.2, 1).sub(centro), hacia = cam.p.clone().sub(centro).normalize();
      const visible = delante && dist < 13 && normal.dot(hacia) > .15 && cam.p.z < 0;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, dist, visible };
    });
  }

  // ponytail: reinicia el polvo interior tras cada entrada en vez de simular su regreso
  return {
    renderer, camera, scene, tamano, actualizar, render, entrar, salir, ponerEnPuerta, preescucha, rectPuertas,
    uDePuerta, U_FIN, U_EXT, U_NAVE, PASO, reponerPolvo: () => reponerParticulas(polvoInt),
    cancelarMezcla: () => { mezcla = null; },
    depurar: () => ({ anim: anim && { t: +anim.t.toFixed(2), dur: anim.dur, avisado: anim.avisado }, mezcla: !!mezcla, cam: cam.p.toArray().map(v => +v.toFixed(2)) }),
  };
}
