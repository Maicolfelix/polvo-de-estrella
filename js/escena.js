// Mundo 3D: paisaje de tormenta, capilla de piedra, portal abocinado y nave con nueve puertas.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CANCIONES } from './datos.js';
import { crearPrimerPlano } from './primer-plano.js';
import { crearCuervos } from './cuervos.js';
import { FOCO } from './habitaciones.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const eio = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const B = 1.02;                 // zócalo del edificio
const IW = 3.8, MURO = .6, Z0 = -.9, Z1 = -23.1;
export const MOVIL = matchMedia('(pointer: coarse)').matches || innerWidth < 700;

// ---------- utilidades de geometría ----------
export function arco(cx, y0, w, R, n = 14) {
  const c = R - w, thA = Math.acos(-c / R), p = [];
  for (let i = 0; i <= n; i++) { const th = Math.PI + (thA - Math.PI) * i / n; p.push(new V2(cx + c + R * Math.cos(th), y0 + R * Math.sin(th))); }
  for (let i = n - 1; i >= 0; i--) p.push(new V2(2 * cx - p[i].x, p[i].y));
  return p;
}
export const altoArco = (w, R) => Math.sqrt(R * R - (R - w) ** 2);
export const contorno = (cx, { w, s, R }, base = 0) => [new V2(cx - w, base), ...arco(cx, base + s, w, R), new V2(cx + w, base)];
export const formaU = (cx, ext, int) => new THREE.Shape([...contorno(cx, ext), ...contorno(cx, int).reverse()]);
function anillo(cx, ext, int, base) {
  const s = new THREE.Shape(contorno(cx, ext, base - (ext.w - int.w)));
  s.holes.push(new THREE.Path(contorno(cx, int, base)));
  return s;
}
export const extruir = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 });
const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

// UV en metros reales, proyección por triángulo según su normal (sin costuras de escala entre piezas)
export function uvMundo(g, tile) {
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
// alfombra de la nave: terciopelo carmesí gastado con cenefa dorada (se repite a lo largo)
function texturaAlfombra() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#2a070b'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '70,12,18' : '12,3,4'},${Math.random() * .35})`; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 3); }
  x.strokeStyle = 'rgba(150,26,34,.85)'; x.lineWidth = 5; x.strokeRect(-10, -10, 34, 532); x.strokeRect(232, -10, 34, 532);
  x.lineWidth = 2; x.strokeStyle = 'rgba(150,26,34,.5)'; x.beginPath(); x.moveTo(34, 0); x.lineTo(34, 512); x.moveTo(222, 0); x.lineTo(222, 512); x.stroke();
  x.strokeStyle = 'rgba(120,20,28,.4)'; x.lineWidth = 2;
  for (let y = 64; y < 512; y += 128) { x.beginPath(); x.moveTo(128, y - 40); x.lineTo(168, y); x.lineTo(128, y + 40); x.lineTo(88, y); x.closePath(); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function texturaPlaca(n) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 150;
  const x = c.getContext('2d');
  x.fillStyle = '#0d0a09'; x.fillRect(0, 0, 256, 150);
  x.strokeStyle = 'rgba(179,32,42,.7)'; x.lineWidth = 3; x.strokeRect(10, 10, 236, 130);
  const g = x.createLinearGradient(0, 30, 0, 120); g.addColorStop(0, '#f0b4b4'); g.addColorStop(.5, '#9a1e26'); g.addColorStop(1, '#d86a6a');
  x.fillStyle = g; x.font = '500 84px "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(n, 128, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// Inyecta el envejecimiento en un MeshStandardMaterial (sin texturas nuevas: ruido 3D en el shader).
export function envejecer(mat, { base = 0, alto = 2.4, fuerza = .5, vetas = .3, musgo = .3, macro = .3 } = {}) {
  const f = v => v.toFixed(3);
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMundo = (modelMatrix * vec4(transformed, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vMundo;
float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), q = fract(p); q = q*q*(3.-2.*q);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), q.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), q.x), q.y),
             mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), q.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), q.x), q.y), q.z); }
float fbm3(vec3 p){ return n3(p) * .62 + n3(p * 2.03 + 7.1) * .38; }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ float y = vMundo.y - ${f(base)};
  ${alto > 0 ? `float sube = 1. - smoothstep(0., ${f(alto)}, y + (fbm3(vMundo * 1.3) - .5) * .9);` : 'float sube = 0.;'}
  ${macro ? `diffuseColor.rgb *= (1. - ${f(macro)} * .5) + ${f(macro)} * n3(vMundo * .11);` : ''}
  ${vetas ? `diffuseColor.rgb *= 1. - ${f(fuerza)} * sube - ${f(vetas)} * smoothstep(.56, .86, n3(vec3(vMundo.x * 2.4, vMundo.y * .16, vMundo.z * 2.4)));` : `diffuseColor.rgb *= 1. - ${f(fuerza)} * sube;`}
  ${musgo ? `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.03, .042, .024), smoothstep(.58, .78, n3(vMundo * .8 + 3.1)) * max(sube, ${alto > 0 ? '0.' : '1.'}) * ${f(musgo)});` : ''}
}`)  // solo se calcula el ruido de los efectos que el material usa
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor *= ${alto > 0 ? `mix(1., .6, 1. - smoothstep(0., ${f(alto * .6)}, vMundo.y - ${f(base)}))` : '1.'};`);
  };
  mat.customProgramCacheKey = () => `env-${base}-${alto}-${fuerza}-${vetas}-${musgo}-${macro}`;
  mat.needsUpdate = true;
}

// Cielo de tormenta como función GLSL: lo usan el cielo, las vidrieras de la nave (dejan ver el cielo real
// que hay detrás, con sus nubes y relámpagos) y los charcos de la plaza (lo reflejan).
const CIELO_GLSL = `uniform float uT,uF,uFugaP; uniform vec3 uD,uFog,uFugaA,uFugaB;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      float fbm2(vec2 p){return n(p)*.6+n(p*2.03+vec2(1.7,9.2))*.4;}
      vec3 cielo(vec3 d){ float y=d.y;
        // tormenta carmesí: masas de nube iluminadas en rojo desde abajo, huecos casi negros
        vec2 uv=d.xz/(max(y,0.)+.2)*1.25+vec2(uT*.022,uT*.008);   // las nubes avanzan a la vista
        vec2 w=vec2(fbm2(uv*.6+uT*.012),fbm2(uv*.6+5.2-uT*.009));   // la deformación también cambia: las nubes se arremolinan
        float c=fbm(uv+w*1.6+vec2(0.,uT*.006)); float c2=fbm(uv*2.1+w*2.4-vec2(uT*.035,0.));   // dos capas a distinta velocidad: se deforman al pasar
        float nube=smoothstep(.3,.78,c*.7+c2*.45);
        float borde=smoothstep(.52,.9,c2)*nube;
        vec3 alto=vec3(.006,.002,.004), medio=vec3(.022,.004,.007), horiz=vec3(.1,.012,.016);   // entre nubes, casi negro
        vec3 col=mix(horiz,medio,smoothstep(-.02,.22,y)); col=mix(col,alto,smoothstep(.2,.75,y));
        vec3 rojo=vec3(.46,.035,.05)*(1.15-smoothstep(0.,.8,y)*.6);
        col=mix(col, vec3(.01,.003,.005), nube*.9);
        col+=rojo*borde*1.5+rojo*.22*nube*(1.-smoothstep(.0,.4,y));
        float fl=pow(max(dot(d,normalize(uD)),0.),5.);
        col+=vec3(.95,.8,.95)*uF*fl*(.35+nube*1.3)+vec3(.35,.12,.16)*uF*.2;
        // luna: disco pálido con mares y cráteres, teñido de rojo por la tormenta; las nubes la tapan al pasar
        { vec3 dl = normalize(vec3(-.2, .42, -1.)); float cd = dot(d, dl);
          vec3 ex = normalize(cross(dl, vec3(0., 1., 0.))), ey = cross(ex, dl);
          vec2 lc = vec2(dot(d, ex), dot(d, ey)) * 32.;
          float disco = smoothstep(.99935, .9995, cd);
          float mares = fbm2(lc * 1.6 + 3.) * .55 + n(lc * 5.) * .25 + n(lc * 11.) * .12;
          vec3 lunaC = vec3(1., .84, .82) * (.3 + .5 * smoothstep(.3, .75, mares)) * (.45 + .55 * sqrt(max(0., 1. - dot(lc, lc) * .9)));   // mares oscuros y borde en penumbra
          float tapa = smoothstep(.25, .8, nube);
          col = mix(col, lunaC, disco * (1. - tapa * .8));
          col += vec3(.95, .42, .4) * pow(max(cd, 0.), 1400.) * .35 * (1. - tapa * .6) + vec3(.55, .12, .14) * pow(max(cd, 0.), 70.) * .3 * (1. - tapa * .4); }
        // estrella fugaz: un trazo sobre el arco entre A y B; la cabeza avanza con uFugaP y la cola se apaga
        if (uFugaP > 0. && uFugaP < 1.) {
          vec3 nf = normalize(cross(uFugaA, uFugaB)); float dl = abs(dot(d, nf));
          float a = atan(dot(d, cross(nf, uFugaA)), dot(d, uFugaA)), T = acos(clamp(dot(uFugaA, uFugaB), -1., 1.));
          float cab = uFugaP * T, cola = .24 * T, s = (cab - a) / cola;
          float br = (1. - smoothstep(.0, 1., s)) * step(0., s) * smoothstep(.0045, .0, dl) * sin(3.1416 * uFugaP) * (1. - nube * .4);
          col += vec3(1., .92, .92) * br * 2.2 + vec3(1., .5, .5) * smoothstep(.009, .0, dl) * br * .25;
        }
        col=mix(uFog*1.1,col,smoothstep(-.06,.1,y));
        return col; }
`;

// Viento en el sombreador (sin coste de CPU): un solo reloj compartido.
//   'tarjeta': las capas de pinos se doblan por arriba (uv.y) en una onda que recorre el bosque.
//   'planta': tallos, hojas y rosas se mecen según su altura; cada instancia se mueve entera desde su ancla,
//   con la misma fase que el punto del tallo donde está, para que flor y tallo no se separen.
export const VIENTO = { value: 0 };
export const RAFAGA = { value: 0 };   // 0..1: ventisca de vez en cuando (las plantas se doblan y se agitan más)
// Suelo mojado por la lluvia: más oscuro y brillante en las zonas encharcadas, con ondas de gotas que
// se abren y se apagan (perturban la normal; se ven en los brillos de la luna y de las luces).
export const LLUVIA_T = { value: 0 };
export function mojar(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uLluviaT = LLUVIA_T;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uLluviaT;
        float hm(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float nm(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(hm(i), hm(i + vec2(1, 0)), f.x), mix(hm(i + vec2(0, 1)), hm(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float charcos = smoothstep(.42, .68, nm(vMundo.xz * .32 + 11.)) * .85 + .15;   // ruido 2D: más barato
        diffuseColor.rgb *= 1. - .32 * charcos;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor *= mix(1., .28, charcos);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (length(vViewPosition) < 12.) { vec2 g = vMundo.xz * 2.6, id = floor(g), f = fract(g) - .5;   // las ondas solo se distinguen de cerca
          float ph = fract(hm(id) + uLluviaT * .85);
          float rr = length(f + (vec2(hm(id + 2.), hm(id + 5.)) - .5) * .5);
          float onda = sin((rr - ph * .42) * 70.) * (1. - ph) * (1. - smoothstep(ph * .42, ph * .42 + .06, rr)) * step(.02, rr);
          normal = normalize(normal + (viewMatrix * vec4(f.x, 0., f.y, 0.)).xyz * onda * .6 * charcos); }`);
  };
  const k = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () => k.call(mat) + '-mojado';
  mat.needsUpdate = true;
}

export function mecer(mat, modo, amp) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.(sh, r);
    sh.uniforms.uViento = VIENTO; sh.uniforms.uRafaga = RAFAGA; sh.uniforms.uLluviaT = LLUVIA_T;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uViento, uRafaga, uLluviaT;');
    if (modo === 'tarjeta') sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed.x += ((sin(uViento * .8 + position.x * .07) * .7 + sin(uViento * 1.9 + position.x * .21) * .3) * (1. + uRafaga * 1.6) + uRafaga * 1.4) * ${amp.toFixed(3)} * uv.y * uv.y;`);
    else sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
        vec3 ancla = instanceMatrix[3].xyz;
      #else
        vec3 ancla = mvPosition.xyz;
      #endif
      float alto = clamp(ancla.y / .9, 0., 1.);
      float rafaga = .65 + .35 * sin(uViento * .37 + ancla.x * .05);
      vec2 agita = vec2(sin(uViento * 1.6 + ancla.x * .35 + ancla.z * .25), cos(uViento * 1.2 + ancla.x * .3 - ancla.z * .2) * .6) * (1. + uRafaga * 2.2);
      mvPosition.xz += (agita + vec2(uRafaga * 2.4, -uRafaga * .5)) * ${amp.toFixed(3)} * alto * alto * rafaga;   // en la ventisca, además, se doblan hacia un lado
      // gotas que golpean: la flor se hunde un poco y rebota (cada una a su ritmo; la fase depende del ancla)
      float golpe = fract(uLluviaT * .5 + fract(sin(dot(floor(ancla.xz * 6.), vec2(12.9898, 78.233))) * 43758.5453));
      mvPosition.y -= .022 * exp(-golpe * 9.) * cos(golpe * 46.) * alto;
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => (prev ? 'env-' : '') + `mecer-${modo}-${amp}`;
  mat.needsUpdate = true;
}

export function crearEscena({ canvas, rm, adaptar = true, alProgreso, alCargar, alRayo }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // El coste es casi todo de relleno (medido: la nave a 1440×900 tardaba 82 ms en una GTX 1650):
  // resolución limitada y ajustada en marcha (ver `calidad`), sombras estáticas y pocas luces.
  const PR_MAX = Math.min(devicePixelRatio, MOVIL ? 1.25 : 1);
  renderer.setPixelRatio(PR_MAX);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;     // todo lo que proyecta sombra está quieto: se dibujan una vez
  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0x1a0a0c);
  scene.fog = new THREE.FogExp2(FOG, .0105);
  const uCielo = { uT: { value: 0 }, uF: { value: 0 }, uD: { value: new V3(0, .3, -1) }, uFog: { value: FOG }, uFugaA: { value: new V3(0, .5, -1) }, uFugaB: { value: new V3(.3, .4, -1) }, uFugaP: { value: -1 } };
  // zonas: el exterior y la nave se ocultan cuando la cámara no puede verlos (ahorra el sobredibujado)
  const ext = new THREE.Group(), int = new THREE.Group();
  scene.add(ext, int);
  let destino = ext;
  const add = (...o) => destino.add(...o);
  scene.background = FOG;
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 1200);

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, l, t) => alProgreso?.(l / t);
  // (manager.onLoad se asigna tras crear las luces: precompila ambos estados antes de avisar)
  const loader = new THREE.TextureLoader(manager);
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const cache = {};
  const cargaHab = new THREE.TextureLoader();
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
    tierra: pbr('grieta', { normal: 1.3, env: .15, color: 0xe6ddd2 }),          // barro seco agrietado de la plaza
    pizarra: pbr('pizarra', { normal: 1.2, env: .6 }),
    losa: pbr('suelo', { normal: 1.3, env: .3, color: 0x8f8780 }),   // losas de piedra gastadas de la nave
    hierro: new THREE.MeshStandardMaterial({ color: 0x16130f, metalness: .9, roughness: .42, envMapIntensity: .8 }),
    madera: new THREE.MeshStandardMaterial({ map: tex('puerta_col', true), normalMap: tex('puerta_nor'), roughnessMap: tex('puerta_rug'), metalnessMap: tex('puerta_met'), metalness: 1, roughness: 1, envMapIntensity: .6, normalScale: new V2(1.4, 1.4) }),
    // vidriera vista desde fuera: rombos emplomados de colores, una vela que parpadea detrás, el cielo
    // reflejado en el cristal y el destello de los relámpagos
    vidrio: new THREE.ShaderMaterial({ uniforms: uCielo, fog: false,
      vertexShader: 'varying vec3 vW, vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW, vN; varying vec2 vUv; ${CIELO_GLSL}
        void main(){
          vec2 r = vec2(vUv.x + vUv.y, vUv.x - vUv.y) * 3.4, id = floor(r), f = fract(r);
          float plomo = smoothstep(.41, .47, max(abs(f.x - .5), abs(f.y - .5)));
          float k = h(id), k2 = h(id + 7.3);
          vec3 vid = k < .45 ? vec3(.62, .04, .05) : k < .72 ? vec3(.32, .015, .05) : k < .9 ? vec3(.5, .1, .04) : vec3(.12, .015, .025);   // carmesí, vino, brasa y casi negro
          vid *= .55 + .45 * k2;                                       // cada pieza de cristal con su propio espesor
          float vela = .32 + .1 * sin(uT * 7.3 + id.x * 1.7) * sin(uT * 3.1 + id.y) + .08 * n(vW.xy * .6 + uT * .4);
          float abajo = smoothstep(-.2, 1.6, 3.2 - (vW.y - 1.) * .45);  // la luz de dentro llega más abajo
          vec3 v = normalize(vW - cameraPosition), nn = normalize(vN), rf = reflect(v, nn); rf.y = abs(rf.y);
          float fres = .05 + .55 * pow(1. - abs(dot(v, nn)), 3.);
          vec3 c = vid * vela * abajo * (1. + uF * 4.) + cielo(rf) * fres * .7;
          gl_FragColor = vec4(mix(c, vec3(.012, .01, .01), plomo * .92), 1.); }` }),
    vidrioCalido: new THREE.MeshStandardMaterial({ color: 0x050304, roughness: .2, emissive: 0xc06a2a, emissiveIntensity: .9 }),
    // vidriera emplomada que deja ver el cielo de detrás (dirección de la vista a través del cristal)
    ventana: new THREE.ShaderMaterial({ uniforms: uCielo, fog: false,
      vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; varying vec2 vUv; ${CIELO_GLSL}
        void main(){ vec3 d = normalize(vW - cameraPosition); d.y = max(d.y, .04);
          vec2 r = vec2(vUv.x + vUv.y, vUv.x - vUv.y) * 3.4, id = floor(r), f = fract(r);
          float plomo = smoothstep(.41, .47, max(abs(f.x - .5), abs(f.y - .5)));
          float k = h(id);
          vec3 tinte = k < .45 ? vec3(1., .45, .45) : k < .72 ? vec3(.8, .3, .4) : k < .9 ? vec3(1., .6, .45) : vec3(.5, .25, .3);
          // cristal antiguo: el cielo de detrás teñido por cada pieza y algo ondulado
          vec3 c = cielo(normalize(d + vec3(n(vUv * 9.) - .5, 0., n(vUv * 9. + 4.) - .5) * .05)) * 1.3 * tinte + vec3(.014, .006, .006);
          gl_FragColor = vec4(mix(c, vec3(.008, .006, .006), plomo * .92), 1.); }` }),
    // charco: agua oscura que refleja el cielo real (nubes y relámpagos), con onditas y borde irregular
    charco: new THREE.ShaderMaterial({ uniforms: uCielo, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `varying vec3 vW; varying vec2 vUv; ${CIELO_GLSL}
        void main(){
          vec2 q = vUv - .5; float r = length(q) * 2.;
          float borde = 1. - smoothstep(.55, 1., r + (n(vW.xz * 1.7) - .5) * .7);
          if (borde < .01) discard;
          vec2 o = vec2(n(vW.xz * 6. + uT * .8), n(vW.xz * 6. - uT * .7 + 3.)) - .5;
          // gotas sobre el charco: anillos que se abren y se apagan
          { vec2 g = vW.xz * 3.2, id = floor(g), f = fract(g) - .5; float ph = fract(h(id) + uT * 1.1);
            float rr = length(f + (vec2(h(id + 2.), h(id + 5.)) - .5) * .5);
            float an = sin((rr - ph * .45) * 80.) * (1. - ph) * (1. - smoothstep(ph * .45, ph * .45 + .05, rr));
            o += f * an * 1.8; }
          vec3 nrm = normalize(vec3(o.x * .12, 1., o.y * .12));
          vec3 v = normalize(vW - cameraPosition), rf = reflect(v, nrm); rf.y = max(rf.y, .02);
          float fres = .25 + .75 * pow(1. - max(dot(-v, nrm), 0.), 4.);
          vec3 c = mix(vec3(.006, .004, .004), cielo(rf) * 1.4, fres);
          gl_FragColor = vec4(c, borde * .92); }` }),
    oro: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: .3, envMapIntensity: 1.6, emissive: 0x2a1404, emissiveIntensity: .5 }),
  };

  // Envejecimiento en coordenadas de mundo: suciedad y humedad que suben del suelo, chorreones,
  // musgo en la base y variación tonal amplia para que ninguna superficie se vea uniforme.
  envejecer(M.piedra, { base: 0, alto: 3.4, fuerza: .62, vetas: .5, musgo: .45, macro: .75 });
  envejecer(M.muro, { base: B, alto: 1.1, fuerza: .22, vetas: .14, musgo: 0, macro: .25 });
  envejecer(M.tierra, { base: 0, alto: 0, fuerza: 0, vetas: 0, musgo: 0, macro: .7 });
  mojar(M.tierra);   // la lluvia lo moja
  envejecer(M.suelo, { base: 0, alto: 0, fuerza: 0, vetas: 0, musgo: .5, macro: .3 });

  // ---------- lotes: todo lo estático de un material se fusiona en una sola malla ----------
  const lotes = new Map();
  const poner = (mat, g, tile = 3) => { const k = [mat, destino]; const c = [...lotes.keys()].find(([a, b]) => a === mat && b === destino) || k; if (!lotes.has(c)) lotes.set(c, []); lotes.get(c).push(uvMundo(g, tile)); };
  function cerrarLotes() {
    for (const [[mat, grupo], gs] of lotes) {
      const m = new THREE.Mesh(mergeGeometries(gs, false), mat);
      m.castShadow = m.receiveShadow = true;
      grupo.add(m);
    }
    lotes.clear();
  }
  // gira una pieza dibujada en el plano (u=a lo largo del muro, v=alto) hacia un muro lateral
  const aLado = (g, x, z) => g.rotateY(Math.PI / 2).translate(x, B, z);

  /* ===================== EXTERIOR ===================== */
  // suelo: barro agrietado hasta la escalinata (sin camino pavimentado: los escalones guían)
  poner(M.tierra, new THREE.PlaneGeometry(600, 600, 1, 1).rotateX(-Math.PI / 2), 4.2);
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
  poner(M.vidrio, new THREE.CircleGeometry(1.46, 40).translate(0, B + 13.1, -.45), 1);
  // estrella dorada en el óculo (el destino se reconoce desde lejos)
  { const e = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? .5 : 1.25; e[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    poner(M.oro, new THREE.ExtrudeGeometry(e, { depth: .14, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 1 }).translate(0, B + 13.1, -.22), 1); }
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
  // naves laterales bajas con tejado a un agua, como en la referencia: completan la silueta a los lados
  { const X0 = 7.2, X1 = 11.2, ALTO = 5.6, CUMBRE = 8.2, ZF = -1.2, ZB = -21.5;
    const VEN = { w: .42, s: 2.1, R: .56 };
    for (const s of [-1, 1]) {
      // se construye ya espejado (escalar en negativo invertiría las caras)
      const frente = new THREE.Shape([new V2(s * X0, 0), new V2(s * X1, 0), new V2(s * X1, ALTO), new V2(s * X0, CUMBRE)]);
      frente.holes.push(new THREE.Path(contorno(s * 9.3, VEN, 1.5)));
      poner(M.piedra, extruir(frente, .7).translate(0, B, ZF - .7), 3);
      poner(M.vidrio, new THREE.ShapeGeometry(new THREE.Shape(contorno(s * 9.3, VEN, 1.5))).translate(0, B, ZF - .45), 1);
      poner(M.piedra, extruir(anillo(s * 9.3, { w: .56, s: 2.1, R: .72 }, VEN, 1.5), .16).translate(0, B, ZF), 1);
      // muro exterior con lancetas y contrafuertes
      const largo = ZF - ZB, muro = new THREE.Shape([new V2(0, 0), new V2(largo, 0), new V2(largo, ALTO), new V2(0, ALTO)]);
      const zs = [-5.2, -10.2, -15.2];
      for (const z of zs) muro.holes.push(new THREE.Path(contorno(ZF - z, VEN, 1.5)));
      poner(M.piedra, extruir(muro, .6).rotateY(Math.PI / 2).translate(s > 0 ? X1 - .6 : -X1, B, ZF), 3);
      for (const z of zs) {
        const v = new THREE.ShapeGeometry(new THREE.Shape(contorno(0, VEN, 1.5))).rotateY(s * Math.PI / 2).translate(s * (X1 + .01), B, z);
        poner(M.vidrio, v, 1);
      }
      for (const z of [-2.7, -7.7, -12.7, -17.7, -21.1]) {
        poner(M.piedra, caja(.7, 4.6, .9, s * (X1 + .35), B + 2.3, z), 1.6);
        poner(M.piedra, new THREE.BoxGeometry(.9, .5, .9).rotateZ(s * .5).translate(s * (X1 + .3), B + 4.75, z), 1);
        poner(M.piedra, new THREE.ConeGeometry(.26, 1.3, 4).rotateY(Math.PI / 4).translate(s * (X1 + .35), B + 5.55, z), .6);   // pináculo
      }
      poner(M.piedra, caja(X1 - X0, ALTO, .6, s * (X0 + X1) / 2, B + ALTO / 2, ZB + .3), 2.4);   // cierre trasero
      // tejado de pizarra a un agua y su alero de piedra
      const ang = Math.atan2(CUMBRE - ALTO, X1 - X0), lt = Math.hypot(CUMBRE - ALTO, X1 - X0) + .7;
      poner(M.pizarra, new THREE.BoxGeometry(lt, .22, ZF - ZB + .8).rotateZ(s * -ang).translate(s * (X0 + X1) / 2 + s * .15, B + (ALTO + CUMBRE) / 2 + .2, (ZF + ZB) / 2), 2);
      poner(M.piedra, caja(.5, .3, ZF - ZB + .6, s * (X1 + .15), B + ALTO + .02, (ZF + ZB) / 2), 1.2);
    }
  }

  // muro trasero con el hueco de la puerta 9
  const P9 = { w: 1.0, s: 2.9, R: 1.35 };
  const trasero = new THREE.Shape([new V2(-7.2, -.05), new V2(7.2, -.05), new V2(7.2, 11), new V2(0, 17.4), new V2(-7.2, 11)]);
  trasero.holes.push(new THREE.Path(contorno(0, P9)));
  const LAN9 = { w: .42, s: 2.9, R: .55 };
  for (const x of [-2.25, 2.25]) trasero.holes.push(new THREE.Path(contorno(x, LAN9, 3.7)));
  destino = int; poner(M.piedra, extruir(trasero, .9).translate(0, B, -24), 3.2); destino = ext;   // solo se ve desde la nave
  // tejado de pizarra
  const aT = Math.atan2(6.6, 7.6), lT = Math.hypot(6.6, 7.6) + .3;
  for (const s of [-1, 1]) poner(M.pizarra, new THREE.BoxGeometry(lT, .3, 25.2).rotateZ(s * -aT).translate(s * 3.8, B + 14.35, -12.2), 2);
  poner(M.piedra, new THREE.BoxGeometry(.4, .4, 25.2).rotateZ(Math.PI / 4).translate(0, B + 17.65, -12.2), 1);
  for (const s of [-1, 1]) poner(M.piedra, new THREE.BoxGeometry(lT - .2, .42, .55).rotateZ(s * -aT).translate(s * 3.75, B + 14.35, .05), 1.4);
  // torre y aguja
  // campanario corto sobre el tejado, como en la referencia: tejado apuntado y cruz de hierro
  poner(M.piedra, caja(3.2, 7.6, 3.2, 0, B + 17.8, -3.2), 2.4);
  poner(M.piedra, caja(3.7, .38, 3.7, 0, B + 21.75, -3.2), 1.4);
  poner(M.pizarra, new THREE.ConeGeometry(2.45, 4.6, 4).rotateY(Math.PI / 4).translate(0, B + 21.95 + 2.3, -3.2), 2);
  poner(M.hierro, caja(.12, 1.5, .12, 0, B + 26.9, -3.2), 1); poner(M.hierro, caja(.8, .12, .12, 0, B + 27.15, -3.2), 1);
  for (let k = 0; k < 4; k++) {
    const g = extruir(anillo(0, { w: .5, s: 1.5, R: .66 }, { w: .38, s: 1.5, R: .52 }, 18.4), .18);
    const vid = new THREE.ShapeGeometry(new THREE.Shape(contorno(0, { w: .38, s: 1.5, R: .52 }, 18.4)));
    const r = k * Math.PI / 2;
    poner(M.piedra, g.translate(0, B, 1.6).rotateY(r).translate(0, 0, -3.2), 1);
    poner(M.vidrioCalido, vid.translate(0, B, 1.61).rotateY(r).translate(0, 0, -3.2), 1);   // luz cálida en el campanario: alguien vela arriba
  }
  // más detalle en la silueta, todo en los lotes estáticos (sin llamadas de dibujo nuevas):
  // almenas y pináculos en la torre
  for (let k = 0; k < 4; k++) {
    const r = k * Math.PI / 2;
    for (const x of [-1.35, -.45, .45, 1.35]) poner(M.piedra, caja(.42, .5, .3, x, B + 22.19, 1.7).rotateY(r).translate(0, 0, -3.2), 1);
  }
  for (const [x, z] of [[-1.7, -1.5], [1.7, -1.5], [-1.7, -4.9], [1.7, -4.9]]) {
    poner(M.piedra, caja(.42, 1, .42, x, B + 22.45, z), 1);
    poner(M.piedra, new THREE.ConeGeometry(.3, 1.3, 4).rotateY(Math.PI / 4).translate(x, B + 23.6, z), 1);
  }
  // crestería del gablete: florones a lo largo de los dos aleros y cruz de piedra en la cumbre
  for (const s of [-1, 1]) for (let k = 1; k < 8; k++) {
    const f = k / 8, x = s * 7.2 * (1 - f), y = B + 11 + 6.4 * f + .32;
    poner(M.piedra, new THREE.BoxGeometry(.2, .3, .24).rotateZ(s * -.5).translate(x, y, .05), .6);
  }
  poner(M.piedra, caja(.34, 1.4, .3, 0, B + 18.1, .05), 1); poner(M.piedra, caja(1.05, .3, .3, 0, B + 18.35, .05), 1);
  // canecillos bajo la cornisa de la fachada
  for (let x = -6.9; x <= 6.95; x += .66) poner(M.piedra, caja(.2, .26, .3, x, B + 10.74, .2), .5);
  // gárgolas en las esquinas: cuerpo que asoma del contrafuerte, cabeza inclinada y fauces
  for (const s of [-1, 1]) {
    poner(M.piedra, new THREE.BoxGeometry(.34, .32, 1.5).rotateX(-.25).translate(s * 7.65, B + 12.15, 1.1), .6);
    poner(M.piedra, new THREE.BoxGeometry(.4, .36, .42).rotateX(.35).translate(s * 7.65, B + 11.9, 1.9), .6);
    poner(M.piedra, new THREE.ConeGeometry(.12, .4, 4).rotateX(Math.PI / 2 + .3).translate(s * 7.65, B + 11.8, 2.2), .4);
    for (const d of [-1, 1]) poner(M.piedra, new THREE.ConeGeometry(.06, .22, 4).translate(s * 7.65 + d * .13, B + 12.12, 1.85), .4);   // orejas
  }
  // aro de lóbulos alrededor del óculo
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; poner(M.piedra, caja(.2, .2, .2, Math.cos(a) * 1.95, B + 13.1 + Math.sin(a) * 1.95, .14).rotateZ(0), .4); }
  // verja de hierro con pilares de piedra a la entrada del recinto
  // verja del cementerio solo a los lados: el frente queda libre hasta la escalinata
  for (const s of [-1, 1]) {
    poner(M.piedra, caja(31, .5, .42, s * 24.5, .25, 17), 1.5);
    poner(M.piedra, caja(.72, 2.7, .72, s * 9, 1.35, 17), 1.5);
    poner(M.piedra, caja(.9, .22, .9, s * 9, 2.81, 17), 1);
    poner(M.piedra, new THREE.ConeGeometry(.3, .55, 4).rotateY(Math.PI / 4).translate(s * 9, 3.2, 17), 1);
    for (const x of [15, 21, 27, 33, 39]) { poner(M.piedra, caja(.5, 1.9, .5, s * x, .95, 17), 1.5); }
    poner(M.hierro, caja(30.6, .05, .05, s * 24.5, 1.55, 17), 1);
    poner(M.hierro, caja(30.6, .05, .05, s * 24.5, .75, 17), 1);
  }
  const barras = new THREE.InstancedMesh(new THREE.BoxGeometry(.028, 1.55, .028), M.hierro, 470);
  const puntas = new THREE.InstancedMesh(new THREE.ConeGeometry(.04, .16, 4), M.hierro, 470);
  { const m = new THREE.Matrix4(); let k = 0;
    for (const s of [-1, 1]) for (let x = 9.45; x < 40 && k < 470; x += .16, k++) {
      m.makeTranslation(s * x, .5 + .775, 17); barras.setMatrixAt(k, m);
      m.makeTranslation(s * x, .5 + 1.55 + .08, 17); puntas.setMatrixAt(k, m);
    }
    barras.count = puntas.count = k; }
  barras.castShadow = puntas.castShadow = true;
  add(barras, puntas);
  // molduras: cornisa bajo el gablete, imposta a la altura de las lancetas, alféizares y labio del zócalo
  poner(M.piedra, caja(14.6, .3, .42, 0, B + 11.02, .14), 1.2);
  for (const s of [-1, 1]) {
    poner(M.piedra, caja(3.1, .22, .3, s * 5.65, B + 4.3, .1), 1);
    poner(M.piedra, caja(1.5, .16, .4, s * 5.45, B + 4.52, .14), 1);
  }
  poner(M.piedra, caja(17.9, .14, 26.7, 0, B - .07, -11.6), 1.5);
  const haloTex = texturaRadial([[0, 'rgba(255,255,255,.9)'], [.25, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']], 128);
  const halo = (x, y, z, tam, color) => { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); h.position.set(x, y, z); h.scale.setScalar(tam); add(h); return h; };
  // Luces puntuales: cada una es un «foco» candidato; solo POOL luces reales existen y se asignan
  // en cada fotograma a los focos que más aportan cerca de la cámara (el número de luces nunca cambia,
  // así que no hay recompilaciones). Antes había 11 luces activas en cada píxel.
  const focos = [];
  const foco = (x, y, z, color, distancia, intensidad = 0) => { const f = { p: new V3(x, y, z), c: new THREE.Color(color), d: distancia, i: intensidad }; focos.push(f); return f; };
  // faroles a los lados de la escalinata
  const faroles = [];
  for (const s of [-1, 1]) {
    poner(M.hierro, new THREE.CylinderGeometry(.06, .08, 2.4, 10).translate(s * 4.7, 1.2, 4.7), 1);
    poner(M.hierro, caja(.42, .06, .42, s * 4.7, 2.4, 4.7), 1);
    poner(M.hierro, new THREE.ConeGeometry(.3, .25, 4).rotateY(Math.PI / 4).translate(s * 4.7, 2.98, 4.7), 1);
    const vid = new THREE.Mesh(new THREE.BoxGeometry(.3, .44, .3), M.vidrioCalido);
    vid.position.set(s * 4.7, 2.66, 4.7); add(vid);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) poner(M.hierro, caja(.03, .5, .03, s * 4.7 + dx * .16, 2.66, 4.7 + dz * .16), 1);
    faroles.push(foco(s * 4.7, 2.66, 4.7, 0xffa25a, 13, 7));
    halo(s * 4.7, 2.66, 4.7, 1.6, 0xffa25a);
  }
  // portal: tímpano de piedra labrada (una estrella dorada de la que salen rayos en relieve), dintel y hojas.
  // Antes llevaba la portada como imagen: de lejos se leía como un destello raro sobre la puerta.
  const TIMP = new THREE.Shape(arco(0, 3.7, UMBRAL.w, UMBRAL.R).map(p => new V2(p.x, Math.max(p.y, 4.02))));
  const altoT = altoArco(UMBRAL.w, UMBRAL.R) - .32, cy = 4.02 + altoT * .42;
  poner(M.piedra, new THREE.ExtrudeGeometry(TIMP, { depth: .1, bevelEnabled: false, curveSegments: 20 }).translate(0, B, -.74), 1);
  for (let k = 0; k < 11; k++) {   // rayos en abanico, de distinta longitud
    const a = Math.PI * (.06 + .88 * k / 10), largo = .55 + (k % 2 ? .2 : .45);
    const g = new THREE.BoxGeometry(largo, .055, .06).translate(.42 + largo / 2, 0, 0).rotateZ(a).translate(0, B + cy, -.62);
    poner(M.piedra, g, .6);
  }
  { const e = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? .14 : .34; e[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    poner(M.oro, new THREE.ExtrudeGeometry(e, { depth: .06, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1 }).translate(0, B + cy, -.62), 1);
    const aro = new THREE.Shape().absarc(0, 0, .44, 0, Math.PI * 2, false); aro.holes.push(new THREE.Path().absarc(0, 0, .38, 0, Math.PI * 2, true));
    poner(M.piedra, extruir(aro, .07).translate(0, B + cy, -.64), .5); }
  const hojasPortal = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(s * UMBRAL.w, B, -.83);
    const hoja = new THREE.Mesh(new THREE.BoxGeometry(UMBRAL.w, 3.7, .1).translate(-s * UMBRAL.w / 2, 1.85, 0), M.madera);
    hoja.receiveShadow = true; piv.add(hoja);   // se mueve: no entra en la sombra estática
    for (const y of [.55, 1.85, 3.15]) {   // pernios de hierro y bisagras
      const banda = new THREE.Mesh(new THREE.BoxGeometry(UMBRAL.w * .92, .1, .03), M.hierro); banda.position.set(-s * UMBRAL.w * .47, y, .065); piv.add(banda);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .16, 10), M.hierro); pin.position.set(0, y, .02); piv.add(pin);
    }
    const aro = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 8, 20), M.hierro); aro.position.set(-s * UMBRAL.w * .86, 1.5, .09); piv.add(aro);
    add(piv); hojasPortal.push([piv, s]);
  }
  const luzPortal = foco(0, B + 2.5, -3.2, 0xffb27a, 16, 6);
  foco(0, B + 3, .2, 0xff9a62, 7, 2.5);   // porche

  // sombras de contacto al pie del zócalo y de la escalinata
  const grad = texturaGradiente();
  const matContacto = new THREE.MeshBasicMaterial({ map: grad, color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  matContacto.alphaMap = grad;
  const tira = (w, x, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.2), matContacto); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, .02, z); add(m); };
  tira(26.4, 9.9, -11.6, -Math.PI / 2); tira(26.4, -9.9, -11.6, Math.PI / 2); tira(17.6, 0, -25.9, Math.PI);

  /* ===================== INTERIOR ===================== */
  destino = int;
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
      poner(M.ventana, v, 1);   // desde la nave, las vidrieras dejan ver la tormenta
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
  poner(M.losa, new THREE.PlaneGeometry(IW * 2, LEN).rotateX(-Math.PI / 2).translate(0, B + .003, (Z0 + Z1) / 2), 2.2);
  // alfombra a lo largo de la nave, hasta la puerta del fondo
  { const t = texturaAlfombra(); t.repeat.set(1, (LEN - 1.4) / 3.2);
    const alf = new THREE.Mesh(new THREE.PlaneGeometry(1.7, LEN - 1.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: 0xb8a8a8 }));
    alf.position.set(0, B + .01, (Z0 + Z1) / 2 - .2); alf.receiveShadow = true; add(alf); }
  for (const x of [-2.25, 2.25]) poner(M.ventana, new THREE.ShapeGeometry(new THREE.Shape(contorno(x, LAN9, 3.7))).translate(0, B, -23.6), 1);
  // lámparas colgantes de hierro
  const lamparas = [-5.5, -10.9, -16.3, -21].map(z => {
    poner(M.hierro, new THREE.CylinderGeometry(.015, .015, 7.8, 6).translate(0, B + 4.6 + 3.9, z), 1);
    poner(M.hierro, new THREE.TorusGeometry(.55, .025, 8, 40).rotateX(Math.PI / 2).translate(0, B + 4.6, z), 1);
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; poner(M.hierro, new THREE.CylinderGeometry(.008, .008, 1.1, 4).rotateZ(.46).rotateY(a).translate(Math.cos(a) * .27, B + 5.1, z - Math.sin(a) * .27), 1); }
    return foco(0, B + 4.6, z, 0xffa080, 10);
  });
  // charco de luz cálida bajo cada lámpara: se ve aunque esa lámpara no tenga una de las luces reales
  const charcoLuz = texturaRadial([[0, 'rgba(255,255,255,.85)'], [.45, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]);
  for (const { p } of lamparas) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: charcoLuz, color: 0xff7a50, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(p.x, B + .02, p.z); add(m);
    m.material.opacity = .22;
  }
  // la luz de cada aplique sobre el muro (un halo pequeño a su alrededor, no un velo sobre la puerta)
  for (const s of [-1, 1]) {
    const lavado = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), new THREE.MeshBasicMaterial({ map: charcoLuz, color: 0xff9a55, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
    lavado.position.set(s * 1.75, B + 2.5, Z1 + .02); add(lavado);
  }
  // la puerta del fondo: dos apliques con llama a los lados y su luz en el suelo
  const apliques = [-1, 1].map(s => {
    const x = s * 1.75, y = B + 2.5, z = Z1 + .2;
    poner(M.hierro, caja(.05, .05, .32, x, y + .1, z + .14), 1);
    const llama = new THREE.Mesh(new THREE.BoxGeometry(.14, .22, .14), M.vidrioCalido); llama.position.set(x, y, z + .3); add(llama);
    const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xffa860, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); hl.position.set(x, y, z + .32); hl.scale.setScalar(.9); add(hl);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: charcoLuz, color: 0xff9a50, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x * .6, B + .021, z + 1.4); add(m);
    return null;
  });
  // una sola luz real para el fondo, a la altura de los apliques: siempre reservada dentro de la nave
  const luzFondo = foco(0, B + 2.7, Z1 + 1.3, 0xff9a60, 10, 0);
  const bulbos = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd7a0 }), 24);
  { const m = new THREE.Matrix4(); let k = 0; for (const { p } of lamparas) for (let a = 0; a < 6; a++) { m.makeTranslation(p.x + Math.cos(a * Math.PI / 3) * .55, p.y + .06, p.z + Math.sin(a * Math.PI / 3) * .55); bulbos.setMatrixAt(k++, m); } }
  add(bulbos);

  // ---------- las nueve puertas ----------
  M.maderaFondo = M.madera.clone(); Object.assign(M.maderaFondo, { emissive: new THREE.Color(0xff8a40), emissiveMap: tex('puerta_col', true), emissiveIntensity: .12 });
  M.piedraFondo = M.piedra.clone(); Object.assign(M.piedraFondo, { emissive: new THREE.Color(0xff9050), emissiveMap: tex('piedra_col', true), emissiveIntensity: .08 });
  envejecer(M.piedraFondo, { base: B, alto: 1.1, fuerza: .22, vetas: .14, musgo: 0, macro: .25 });
  const charcoTex = texturaRadial([[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]);
  const puertas = puertasDef.map(d => {
    const c = CANCIONES[d.i], luz = new THREE.Color(c.luz), dim = d.dim;
    const marco = new THREE.Group();
    if (d.lado === 0) { marco.position.set(0, B, Z1 - .8); }
    else { marco.position.set(d.lado * (IW + .48), B, d.z); marco.rotation.y = d.lado < 0 ? Math.PI / 2 : -Math.PI / 2; }
    add(marco);
    // moldura de piedra en la cara de la nave
    const mold = d.lado === 0
      ? extruir(formaU(0, { w: 1.16, s: 2.9, R: 1.51 }, P9), .16).translate(0, B, Z1)
      : extruir(formaU(0, MARCO, PUERTA), .12).rotateY(Math.PI / 2).translate(d.lado < 0 ? -IW : IW - .12, B, d.z);
    // la puerta 9 queda lejos de las luces reales: su madera y su moldura llevan el reflejo cálido de sus dos
    // apliques en el propio material (como luz horneada) para leerse igual que las demás desde la entrada
    if (d.lado === 0) add(new THREE.Mesh(uvMundo(mold, 1), M.piedraFondo)); else poner(M.piedra, mold, 1);
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
      const m = new THREE.Mesh(g, d.lado === 0 ? M.maderaFondo : M.madera); m.receiveShadow = true;
      const tirador = new THREE.Mesh(new THREE.TorusGeometry(.06, .012, 6, 18), M.hierro);
      tirador.position.set(-s * dim.w + -s * -.12, 1.15, .085); piv.add(m, tirador);
      marco.add(piv);
      return { piv, s };
    });
    // tras la puerta, pegada a las hojas, la propia imagen de la habitación llenando el hueco: por la rendija, al
    // entreabrir y al abrir se ve lo mismo que dentro (antes, un pasillo de piedra con paredes de color plano).
    // Al entrar, el hueco pasa a mostrar la habitación viva (recortada en la página, ver `huecoPantalla`).
    // Cargador aparte, sin el gestor de carga: no retrasa la entrada a la web.
    const altoHab = dim.s + ap;
    const img = cargaHab.load(`img/hab/${String(d.i + 1).padStart(2, '0')}.webp`);
    img.colorSpace = THREE.SRGBColorSpace;
    const Wv = dim.w * 2 + .1, Hv = altoHab + .1, rx = Math.min(1, (Wv / Hv) / (1672 / 941));   // «cover» centrado en el foco
    img.repeat.set(rx, 1); img.offset.set(cl(FOCO[d.i] - rx / 2, 0, 1 - rx), 0);
    const matPared = new THREE.MeshBasicMaterial({ map: img, color: 0x000000, fog: false });
    marco.add(new THREE.Mesh(new THREE.PlaneGeometry(Wv, Hv).translate(0, Hv / 2, -.14), matPared));
    // luz que se escapa por debajo y su reflejo en el mármol
    const rendija = new THREE.Mesh(new THREE.BoxGeometry(dim.w * 2 - .04, .012, .02), new THREE.MeshBasicMaterial({ color: luz }));
    rendija.position.set(0, .006, .03); marco.add(rendija);
    const charco = new THREE.Mesh(new THREE.PlaneGeometry(dim.w * 3.2, 2.2), new THREE.MeshBasicMaterial({ map: charcoTex, color: luz, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(0, .012, d.lado === 0 ? 1.1 : 1.0 + .5); marco.add(charco);
    // placa con el número
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(.46, .27), new THREE.MeshStandardMaterial({ map: texturaPlaca(c.n), roughness: .4, metalness: .5, emissive: 0x2a0606, emissiveIntensity: .4 }));
    placa.position.set(0, dim.s + ap + .42, d.lado === 0 ? 1.0 : .62); marco.add(placa);
    // acabado de las nueve puertas: pernios, puntas y bisagras de hierro (una malla por hoja), clave y umbral
    for (const { piv, s } of hojas) {
      const gs = [];
      for (const y of [.42, dim.s * .63, dim.s * 1.12]) {
        gs.push(new THREE.BoxGeometry(dim.w * .9, .07, .022).translate(-s * dim.w * .47, y, .078));
        gs.push(new THREE.CylinderGeometry(.03, .03, .022, 10).rotateX(Math.PI / 2).translate(-s * dim.w * .9, y, .078).toNonIndexed());
        gs.push(new THREE.CylinderGeometry(.028, .028, .14, 10).translate(0, y, .03).toNonIndexed());
      }
      piv.add(new THREE.Mesh(mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g)), M.hierro));
    }
    { const prof = d.lado === 0 ? .9 : .55;
      const clave = new THREE.Mesh(new THREE.BoxGeometry(.26, .36, .2), M.piedra); clave.position.set(0, dim.s + ap + .06, prof); marco.add(clave);
      const umbral = new THREE.Mesh(new THREE.BoxGeometry(dim.w * 2 + .26, .05, .56), M.piedra); umbral.position.set(0, .025, prof - .29); umbral.receiveShadow = true; marco.add(umbral); }
    if (d.i === 0) {
      // farol de hierro en la columna contigua (a 1,1 m de la puerta, hacia la entrada de la nave)
      const brazo = new THREE.Mesh(new THREE.BoxGeometry(.04, .04, .3), M.hierro); brazo.position.set(-1.1, 2.45, .88); marco.add(brazo);
      const caja = new THREE.Mesh(new THREE.BoxGeometry(.16, .24, .16), M.vidrioCalido); caja.position.set(-1.1, 2.3, 1.02); marco.add(caja);
      const techo = new THREE.Mesh(new THREE.ConeGeometry(.14, .12, 4).rotateY(Math.PI / 4), M.hierro); techo.position.set(-1.1, 2.48, 1.02); marco.add(techo);
      marco.updateMatrixWorld(true);
      const l = marco.localToWorld(new V3(-1.1, 2.3, 1.1)); foco(l.x, l.y, l.z, 0xffa860, 4.5, 1.8);   // llama del farol
      const hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xffa860, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); hl.position.set(-1.1, 2.3, 1.02); hl.scale.setScalar(.7); marco.add(hl);
    }
    return { ...d, c, luz, marco, hojas, matPared, rendija, charco, ap, abierto: 0, objetivo: 0, brillo: 0, objetivoBrillo: 0, foco: foco(0, 0, 0, luz, 6) };
  });

  destino = ext;
  /* ===================== CIELO, NIEBLA, RAYOS, PARTÍCULAS ===================== */
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: uCielo,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vD; ${CIELO_GLSL}
      void main(){ gl_FragColor=vec4(cielo(normalize(vD)),1.); }`,
  }));
  cielo.renderOrder = 10;   // después de lo opaco: lo tapado no se calcula
  add(cielo);

  const arbolesLejos = tex('arboles_lejos', true, 'png'), arbolesCerca = tex('arboles_cerca', true, 'png');
  arbolesLejos.wrapS = arbolesCerca.wrapS = THREE.RepeatWrapping;
  // capas de bosque con dos semillas, espejadas y desplazadas: ningún tramo se repite a la vista
  const lejos2 = tex('arboles_lejos2', true, 'png'), cerca2 = tex('arboles_cerca2', true, 'png');
  const capaBosque = (t, w, h, x, z, ry, rep, off, espejo, tono) => {
    const t2 = t.clone(); t2.wrapS = THREE.RepeatWrapping; t2.repeat.set(rep * (espejo ? -1 : 1), 1); t2.offset.x = off; t2.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: t2, transparent: true, alphaTest: .05, depthWrite: false, color: tono, fog: true, side: THREE.DoubleSide });
    mecer(mat, 'tarjeta', Math.min(1.2, h * .045));   // los pinos se mecen: más arriba, más movimiento
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, h / 2 - .5, z); m.rotation.y = ry; add(m);
  };
  // pinos oscuros pegados a la capilla: la enmarcan contra el cielo
  capaBosque(arbolesCerca, 70, 21, 0, -31, 0, 1.4, .35, false, 0x24161a);
  capaBosque(cerca2, 46, 17, -27, -6, Math.PI / 3, 1, .1, true, 0x2c1b20);
  capaBosque(arbolesCerca, 46, 17, 28, -4, -Math.PI / 3, 1, .6, false, 0x2c1b20);
  capaBosque(arbolesLejos, 460, 44, 0, -170, 0, 3, .13, false, 0x3a2228);
  capaBosque(lejos2, 420, 38, 20, -135, 0, 2.6, .41, true, 0x42282e);
  capaBosque(arbolesLejos, 280, 40, -125, -15, Math.PI / 2.4, 2, .7, true, 0x3d2429);
  capaBosque(lejos2, 280, 36, 128, -5, -Math.PI / 2.4, 2.2, .2, false, 0x3d2429);
  capaBosque(arbolesCerca, 90, 26, -44, -50, .5, 1, .1, false, 0x331d22);
  capaBosque(cerca2, 80, 24, 46, -56, -.45, 1, .55, true, 0x331d22);
  capaBosque(cerca2, 70, 22, -60, 22, 1.2, 1, .3, false, 0x331d22);
  capaBosque(arbolesCerca, 70, 22, 62, 26, -1.25, 1, .8, true, 0x331d22);
  // árboles secos en 3D cerca del camino: ramas que proyectan sombra con la luna
  { const geos = []; let semilla = 11;
    const rnd = () => (semilla = semilla * 16807 % 2147483647) / 2147483647;
    const ramas = (o, dir, largo, radio, nivel) => {
      const g = new THREE.CylinderGeometry(radio * .66, radio, largo, 6, 1, true);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir));
      const mid = o.clone().addScaledVector(dir, largo / 2); g.translate(mid.x, mid.y, mid.z); geos.push(g);
      if (!nivel || radio < .025) return;
      const fin = o.clone().addScaledVector(dir, largo);
      for (let k = 0, n = 2 + (rnd() < .45); k < n; k++)
        ramas(fin, dir.clone().add(new V3(rnd() - .5, rnd() * .4, rnd() - .5).multiplyScalar(1.4)).normalize(), largo * (.6 + rnd() * .22), radio * .63, nivel - 1);
    };
    for (const [x, z, h] of [[-13, 31, 5], [14.5, 27, 5.4], [-12.5, 12, 4.8], [14, 6, 5.2], [-20, -8, 6], [19, -16, 5.4]]) {
      ramas(new V3(x, 0, z), new V3((rnd() - .5) * .15, 1, (rnd() - .5) * .15).normalize(), h * .42, .2 + h * .02, MOVIL ? 4 : 5);
    }
    const arboles = new THREE.Mesh(mergeGeometries(geos.map(g => g.toNonIndexed()), false), new THREE.MeshStandardMaterial({ color: 0x15100e, roughness: .95, side: THREE.DoubleSide }));
    arboles.castShadow = true; add(arboles); }
  // rocas sueltas a los lados de la plaza (sin hierba en bloques: el suelo agrietado se lee mejor)
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let semilla = 5;
    const rnd = () => (semilla = semilla * 16807 % 2147483647) / 2147483647;
    const roca = new THREE.IcosahedronGeometry(.5, 1), pr = roca.attributes.position;
    for (let k = 0; k < pr.count; k++) { const v = new V3().fromBufferAttribute(pr, k); v.multiplyScalar(.75 + .5 * Math.abs(Math.sin(v.x * 7.1 + v.y * 3.3 + v.z * 5.7))); v.y *= .6; pr.setXYZ(k, v.x, v.y, v.z); }
    roca.computeVertexNormals();
    const rocas = new THREE.InstancedMesh(roca, pbr('piedra', { normal: 1.2, color: 0x9c948e }), 46);
    for (let k = 0; k < 46; k++) {
      const lado = rnd() < .5 ? -1 : 1, x = k < 30 ? lado * (3 + rnd() * 9) : (rnd() - .5) * 70, z = k < 30 ? 6 + rnd() * 38 : -28 + rnd() * 70;
      if (k >= 30 && Math.abs(x) < 10 && z < 18) continue;
      const sc = .25 + rnd() * .9;
      m4.compose(new V3(x, sc * .12, z), q.setFromEuler(e.set(rnd(), rnd() * 6, rnd())), new V3(sc, sc * (.6 + rnd() * .5), sc));
      rocas.setMatrixAt(k, m4);
    }
    rocas.castShadow = rocas.receiveShadow = true; add(rocas); }
  const primerPlano = crearPrimerPlano({ add, poner, M, MOVIL });
  const cuervos = crearCuervos({ centro: new V3(0, B + 13, -5) }); ext.add(cuervos.malla);
  cerrarLotes();

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
    add(m); capasNiebla.push({ mat, vel });
  };
  capa(160, 9, 0, 3.2, -45, 0, .55, .004);
  capa(120, 7, 0, 2.4, -34, 0, .32, -.006);   // detrás de la capilla (antes cruzaba la nave y se veía su borde desde dentro)
  capa(90, 5, -18, 1.6, 10, .2, .35, .008);
  capa(90, 5, 18, 1.4, 26, -.15, .4, -.007);
  capa(70, 4, 0, 1.2, 52, 0, .3, .01);
  const sueloNiebla = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uMap: { value: nieblaTex }, uT: { value: 0 }, uCol: { value: new THREE.Color(0x3d2e33) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; uniform sampler2D uMap; uniform float uT; uniform vec3 uCol;
      void main(){ float a=texture2D(uMap,vUv*7.+vec2(uT,uT*.4)).r; float r=length(vUv-.5)*2.; gl_FragColor=vec4(uCol,a*.42*smoothstep(1.,.3,r)); }`,
  }));
  sueloNiebla.rotation.x = -Math.PI / 2; sueloNiebla.position.set(0, .35, 20); sueloNiebla.renderOrder = 1; add(sueloNiebla);

  // luces
  const hemi = new THREE.HemisphereLight(0x36323a, 0x120b0b, .9); scene.add(hemi);
  const luna = new THREE.DirectionalLight(0xa4b0d4, 1.5);
  luna.position.set(-28, 42, 58); luna.target.position.set(0, 2, 12);
  luna.castShadow = true;
  luna.shadow.mapSize.set(MOVIL ? 1024 : 2048, MOVIL ? 1024 : 2048);
  Object.assign(luna.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 170 });
  luna.shadow.bias = -.0004; luna.shadow.normalBias = .03;
  scene.add(luna, luna.target);
  // contraluz carmesí del cielo detrás de la capilla: recorta aristas, cruces y pinos
  const contra = new THREE.DirectionalLight(0xff4a3a, .18); contra.position.set(6, 7, -60); scene.add(contra);   // rasante y tenue: con más, el relieve del barro se teñía de rojo
  const relampago = new THREE.DirectionalLight(0xd4dcff, 0); relampago.position.set(30, 60, 30); scene.add(relampago);
  // luz cálida sobre el primer plano (corona, rosas) mientras se está en la llegada
  const focoLlegada = foco(.6, 3.2, 41.5, 0xffe2c4, 10, 0);   // casi neutra: el naranja teñía el barro de rojo
  const POOL = 3;
  const luces = Array.from({ length: POOL }, () => { const l = new THREE.PointLight(0xffffff, 0, 5, 2); scene.add(l); return l; });

  // entorno para reflejos sutiles (mármol, hierro, tímpano)
  { const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x0b0809, side: THREE.BackSide })));
    // cielo de tormenta en miniatura: franja rojiza en el horizonte, cenit casi negro, un punto cálido (la puerta)
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, m = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6), new THREE.MeshBasicMaterial({ color: 0x3a1214 })); m.position.set(Math.cos(a) * 9, .6, Math.sin(a) * 9); m.lookAt(0, .6, 0); es.add(m); }
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), new THREE.MeshBasicMaterial({ color: 0x7a4020 })); m2.position.set(0, 1.5, -9); m2.lookAt(0, 1.5, 0); es.add(m2);
    // tres puntos blancos altos: brillo en el oro y en los diamantes del primer plano
    for (const [x, y, z] of [[-4, 7, 5], [5, 6, -3], [1, 8, -6]]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.set(x, y, z); b.lookAt(0, 0, 0); es.add(b); }
    // solo lo que refleja (metal, oro, mármol, diamantes, tímpano) lleva mapa de entorno: en la piedra,
    // la madera y el suelo apenas se notaba y costaba en cada píxel
    const env = pm.fromScene(es, .04).texture;
    scene.traverse(o => { const m = o.material; if (m?.isMeshStandardMaterial && (m.metalness > .2 || m.userData.refleja)) m.envMap = env; }); }

  // rayo: textura dibujada en cada descarga
  const rayoCanvas = document.createElement('canvas'); rayoCanvas.width = 256; rayoCanvas.height = 1024;
  const rayoTex = new THREE.CanvasTexture(rayoCanvas); rayoTex.colorSpace = THREE.SRGBColorSpace;
  const rayoMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 280), new THREE.MeshBasicMaterial({ map: rayoTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 }));
  rayoMesh.renderOrder = 11; add(rayoMesh);
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
    add(m); return m;
  }
  const polvoExt = particulas(MOVIL ? 300 : 600, [[-22, 22], [0, 9], [-6, 50]], 0xd8b8b0, .06, .45);

  // Lluvia ligera: trazos que caen en una caja que acompaña a la cámara (todo en el sombreador: la CPU solo
  // pasa el tiempo). Se inclina con el viento y más con la ventisca, se ilumina con los relámpagos y no
  // entra en la capilla. Debajo, salpicaduras en el suelo que se abren y se apagan.
  const CAJA = new V3(34, 20, 34), uLluvia = { uT: { value: 0 }, uCam: { value: new V3() }, uCaja: { value: CAJA }, uR: RAFAGA, uF: uCielo.uF };
  const FUERA = `float dentroCapilla(vec3 p){ return (abs(p.x) < 11.6 && p.z < 1.7 && p.z > -25.5 && p.y < 24.) || (abs(p.x) < 5.5 && p.z < 4.4 && p.z > 1.) ? 1. : 0.; }
    vec3 envolver(vec3 b, vec3 v){ return mod(b + v - uCam + uCaja * .5, uCaja) + uCam - uCaja * .5; }`;
  const lluvia = (() => {
    const n = MOVIL ? 1400 : 2600, pos = new Float32Array(n * 6), lado = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const x = Math.random() * CAJA.x, y = Math.random() * CAJA.y, z = Math.random() * CAJA.z; pos.set([x, y, z, x, y, z], i * 6); lado[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('lado', new THREE.BufferAttribute(lado, 1));
    const m = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      uniforms: uLluvia, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,   // solo aclara: sobre las nubes nunca se ve como una raya oscura
      vertexShader: `uniform float uT, uR; uniform vec3 uCam, uCaja; attribute float lado; varying float vA, vX; ${FUERA}
        void main(){
          vec3 vel = vec3(1.1 + uR * 7., -10.5, .35);
          vec3 p = envolver(position, vel * uT);
          p -= normalize(vel) * lado * (.32 + uR * .2);
          vX = dentroCapilla(p) + step(p.y, .02);
          float d = distance(p, uCam); vA = (1. - lado * .85) * smoothstep(19., 3., d) * smoothstep(.4, 1.6, d);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform float uF; varying float vA, vX;
        void main(){ if (vX > .5) discard; gl_FragColor = vec4(vec3(.5, .42, .46) * (1. + uF * 3.), vA * (.4 + uF * .4)); }`,
    }));
    m.frustumCulled = false; m.renderOrder = 4; add(m); return m;
  })();
  const salpicaduras = (() => {
    const n = MOVIL ? 500 : 1100, pos = new Float32Array(n * 3), fase = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos.set([Math.random() * CAJA.x, .02, Math.random() * CAJA.z], i * 3); fase[i] = Math.random() * 40; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    const m = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { ...uLluvia, uEsc: { value: 1 } }, transparent: true, depthWrite: false, fog: false,
      vertexShader: `uniform float uT, uEsc; uniform vec3 uCam, uCaja; attribute float fase; varying float vVida, vX; ${FUERA}
        float h1(float x){ return fract(sin(x * 91.7) * 43758.5); }
        void main(){
          float c = uT * 3. + fase, ciclo = floor(c); vVida = fract(c);
          vec3 b = position + vec3(h1(ciclo + fase) * 7., 0., h1(ciclo * 1.3 + fase) * 7.);   // cada gota cae en otro sitio
          vec3 p = envolver(vec3(b.x, 0., b.z), vec3(0.)); p.y = .025;
          vX = dentroCapilla(p) + step(16., distance(p, uCam));
          vec4 mv = viewMatrix * vec4(p, 1.); gl_PointSize = uEsc * (4. + 12. * vVida) / -mv.z * 6.; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uF; varying float vVida, vX;
        void main(){ if (vX > .5) discard; vec2 q = gl_PointCoord - .5; q.y *= 2.2; float r = length(q) * 2.;
          float anillo = smoothstep(.75, .95, r) * (1. - smoothstep(.95, 1., r)) + (1. - smoothstep(0., .35, r)) * step(vVida, .18);
          gl_FragColor = vec4(vec3(.7, .62, .66) * (1. + uF * 2.), anillo * (1. - vVida) * (1. - vVida) * .2); }`,   // sutiles: se intuyen, no se cuentan
    }));
    m.frustumCulled = false; m.renderOrder = 4; add(m); return m;
  })();
  destino = int;
  const polvoInt = particulas(MOVIL ? 260 : 520, [[-3.6, 3.6], [B, B + 7], [-22.8, -1]], 0xffd2a0, .03, .55);
  destino = ext;

  // Dos estados de luz: fuera, luna (con sombra), contraluz y relámpago; dentro de la nave no existen
  // (aunque estén a cero, cada píxel las calcula). Ambos estados se compilan al cargar: cruzar no tropieza.
  const lucesFuera = [luna, contra, relampago];
  let fuera = true;
  const ponerFuera = v => { if (v !== fuera) { fuera = v; lucesFuera.forEach(l => l.visible = v); } };
  // compileAsync lanza todas las compilaciones a la vez y, donde el navegador lo permite (KHR_parallel_shader_compile),
  // sin congelar la página mientras terminan: en teléfonos era el tramo más largo de la carga. Los programas se
  // eligen en el momento de la llamada, así que el estado de las luces puede restaurarse enseguida.
  async function precompilar() {
    const vis = [ext.visible, int.visible]; ext.visible = int.visible = true;
    const esperas = [];
    for (const v of [false, true]) { ponerFuera(v); esperas.push(renderer.compileAsync(scene, camera)); }
    [ext.visible, int.visible] = vis;
    await Promise.all(esperas).catch(() => {});
  }
  manager.onLoad = async () => { await precompilar(); calidad.lista = performance.now() + 2000; alCargar?.(); };

  /* ===================== POSTPROCESO ===================== */
  const composer = new EffectComposer(renderer);
  const pasoEscena = new RenderPass(scene, camera);
  composer.addPass(pasoEscena);
  // sin resplandor de posproceso: costaba lo suficiente para bajar de 72 a 48 fps en la llegada (GTX 1650,
  // 1440×900); los halos de faroles son sprites. La salida conserva ACES + sRGB (el portal lo necesita).
  composer.addPass(new OutputPass());

  /* ===================== CÁMARA ===================== */
  // Llegada compuesta como un cuadro: la capilla entera al fondo, la corona y las rosas delante.
  // Recorrido corto y bajo: del primer plano a la escalinata y al portal.
  const RUTA_P = new THREE.CatmullRomCurve3([
    new V3(0, 1.5, 44), new V3(0, 1.85, 32), new V3(0, 2.2, 20), new V3(0, 2.45, 10), new V3(0, 2.5, 6.4),
    new V3(0, B + 1.66, 3.4), new V3(0, B + 1.66, .2), new V3(0, B + 1.66, -1.9)], false, 'centripetal');
  const RUTA_T = new THREE.CatmullRomCurve3([
    new V3(0, 7.4, 0), new V3(0, 6.8, 0), new V3(0, 5.6, 0), new V3(0, 4.4, 0), new V3(0, 3.6, -.8),
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
      const t = cl((u - .12) / (U_EXT - .12)), mira = RUTA_T.getPointAt(t);
      // en vertical la capilla ocupa la mitad superior: el título y los botones quedan sobre el primer plano
      if (camera.aspect < 1) mira.y -= 4.2 * (1 - suave(0, .45, t));
      return [RUTA_P.getPointAt(t), mira];
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
  // mirar alrededor: ángulos (radianes) hacia los que gira la vista; ratón o giro del teléfono
  const mirada = { yaw: 0, pitch: 0, oyaw: 0, opitch: 0, activa: true, giro: false };
  const G = Math.PI / 180, qGiro = new THREE.Quaternion(), qBase = new THREE.Quaternion(), qPant = new THREE.Quaternion(), eGiro = new THREE.Euler();
  const qAjuste = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2), ejeZ = new V3(0, 0, 1), dirGiro = new V3();
  let hayBase = false;
  function orientar(alpha, beta, gamma, pantalla) {
    // la misma composición que DeviceOrientationControls de three.js, relativa a la postura inicial
    eGiro.set(beta * G, alpha * G, -gamma * G, 'YXZ');
    qGiro.setFromEuler(eGiro).multiply(qAjuste).multiply(qPant.setFromAxisAngle(ejeZ, -pantalla * G));
    if (!hayBase) { qBase.copy(qGiro).invert(); hayBase = true; }
    dirGiro.set(0, 0, -1).applyQuaternion(qBase.clone().multiply(qGiro));
    mirada.giro = true;
    mirada.oyaw = cl(Math.atan2(-dirGiro.x, -dirGiro.z), -1.1, 1.1);   // hasta ~63° a cada lado
    mirada.opitch = cl(Math.asin(cl(dirGiro.y, -1, 1)), -.5, .5);
  }
  let rayo = null, proximoRayo = 1.5, ventisca = null, proximaVentisca = 12, proximaFugaz = 4;
  const cam = { p: new V3(), t: new V3() };
  const tmp = new V3();
  const fovBase = () => camera.aspect < 1 ? 64 : 50;

  // calidad: la escala de resolución se ajusta en marcha según el tiempo real entre fotogramas.
  // Si un nivel resulta lento se baja y ese nivel no se vuelve a superar (sin oscilaciones).
  const calidad = { escala: 1, techo: 1, ema: 16.7, ultimo: 0, desde: 0, ancho: 1, alto: 1, fija: false, pr: () => PR_MAX * calidad.escala, aplicar: () => aplicarResolucion() };
  function aplicarResolucion() {
    const pr = PR_MAX * calidad.escala, { ancho: w, alto: h } = calidad;
    renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    primerPlano.escalaPuntos(pr); salpicaduras.material.uniforms.uEsc.value = pr;
  }
  function tamano(w, h) {
    calidad.ancho = w; calidad.alto = h;
    camera.aspect = w / h;
    camera.fov = fovBase();
    FACTOR_PUERTA = camera.aspect < 1 ? .97 : .8;
    camera.updateProjectionMatrix();
    aplicarResolucion();
  }
  function medirFotograma() {
    const ahora = performance.now(), dt = ahora - calidad.ultimo; calidad.ultimo = ahora;
    // no se mide hasta 2 s después de cargar: la compilación de sombreadores no debe bajar la calidad
    if (!adaptar || calidad.fija || !calidad.lista || ahora < calidad.lista || dt > 250) { calidad.desde = ahora; return; }   // pausa o pestaña oculta: no cuenta
    calidad.ema += (dt - calidad.ema) * .06;
    if (ahora - calidad.desde < 1500) return;
    if (calidad.ema > 23 && calidad.escala > .55) { calidad.escala = Math.max(.55, calidad.escala - .15); calidad.techo = calidad.escala; }
    else if (calidad.ema < 18 && calidad.escala < calidad.techo) calidad.escala = Math.min(calidad.techo, calidad.escala + .15);
    else return;
    calidad.desde = ahora; calidad.ema = 16.7; aplicarResolucion();
  }

  const mundo = (d, x, y, z) => d.marco.localToWorld(new V3(x, y, z));

  // Habitaciones: la habitación (su vídeo, tal cual) se muestra en la página recortada con la forma que
  // tiene el hueco de la puerta en pantalla (ver `huecoPantalla` y app.js). Así no depende de copiar el lienzo a
  // la GPU ni de convertir colores, y se ve igual en cualquier dispositivo. Cuando la cámara llega, el hueco
  // llena la pantalla y el recorte desaparece.
  let cierre = null;
  const finalEntrada = d => [mundo(d, 0, 1.62, .39), mundo(d, 0, 1.62, -4)];
  // contorno del hueco de la puerta i en píxeles de pantalla y lo alineada que está la cámara con él (0..1);
  // null si parte del hueco queda detrás de la cámara (la cámara ya lo está cruzando: pantalla completa)
  const proyHueco = new V3();
  function huecoPantalla(i, w, h) {
    const d = puertas[i]; if (!d) return null;
    camera.updateMatrixWorld(); d.marco.updateMatrixWorld();
    // la cámara está en el umbral (delante del hueco, centrada y muy cerca): la habitación ocupa la pantalla
    const lc = d.marco.worldToLocal(cam.p.clone());
    if (lc.z < .75 && Math.abs(lc.x) < d.dim.w * .9) return null;
    const pts = [];
    for (const q of contorno(0, d.dim)) {
      proyHueco.set(q.x, q.y, -.03); d.marco.localToWorld(proyHueco);
      const enVista = proyHueco.clone().applyMatrix4(camera.matrixWorldInverse);
      if (enVista.z > -camera.near * 2) return { pts: [], alin: 0, abierto: d.abierto };   // fuera de vista: no se muestra
      proyHueco.project(camera); pts.push([(proyHueco.x * .5 + .5) * w, (-proyHueco.y * .5 + .5) * h]);
    }
    const normal = mundo(d, 0, 1.2, 1).sub(mundo(d, 0, 1.2, 0)), mira = cam.t.clone().sub(cam.p).normalize();
    return { pts, alin: Math.max(0, -normal.dot(mira)), abierto: d.abierto };
  }
  function entrar(i) {
    const d = puertas[i];
    // si se entra enseguida por otra puerta, la anterior se cierra ya (antes se quedaba abierta para siempre)
    if (cierre && cierre.d !== d) { cierre.d.objetivo = 0; cierre.d.objetivoBrillo = 0; }
    cierre = null; mezcla = null;
    const p0 = cam.p.clone(), t0 = cam.t.clone();
    const pf = mundo(d, 0, 1.62, 2.1), tf = mundo(d, 0, 1.55, 0);
    const [pin, tin] = finalEntrada(d);
    return new Promise(res => {
      const a = anim = { tipo: 'entrar', d, inicio: performance.now(), t: 0, dur: rm ? .55 : 2.3, p0, t0, pf, tf, pin, tin, res, avisado: false };
      // respaldo: si el navegador deja de pintar (pantalla bloqueada, pestaña oculta) la interfaz no se queda a medias
      setTimeout(() => { if (!a.avisado) { a.avisado = true; a.respaldo = true; res(); } }, a.dur * 1000 + 400);
    });
  }
  // salida: la cámara parte de donde terminó la entrada (el portal llena la pantalla, igual que la habitación
  // que se desvanece encima) y retrocede a su sitio en la nave; la puerta se cierra después
  function salir(i) {
    const d = puertas[i];
    d.abierto = d.objetivo = 1; d.objetivoBrillo = 1;
    cierre = { d, en: performance.now() + (rm ? 300 : 900) };
    const [pin, tin] = finalEntrada(d);
    cam.p.copy(pin); cam.t.copy(tin);
    anim = null; retenido = false;
    mezcla = { inicio: performance.now(), t: 0, dur: rm ? .01 : 1.9, p0: pin, t0: tin, pc: mundo(d, 0, 1.62, 2.1), tc: mundo(d, 0, 1.55, 0), fov: rm ? 0 : 9 };
  }
  // durante una habitación la cámara queda en el umbral de la puerta abierta de esa canción
  function ponerEnPuerta(i) {
    puertas.forEach((q, k) => { q.abierto = q.objetivo = k === i ? 1 : 0; q.objetivoBrillo = k === i ? 1 : 0; });
    retenido = true; cierre = null;
    const [pin, tin] = finalEntrada(puertas[i]); cam.p.copy(pin); cam.t.copy(tin);
  }

  // Cierra la entrada aunque no haya habido fotogramas (pantalla bloqueada, pestaña oculta):
  // deja la cámara en la pose final y la puerta abierta.
  function terminarEntrada(forzar = false) {
    if (!anim || !(forzar || anim.respaldo)) return;
    const a = anim; anim = null; retenido = true;
    a.d.abierto = a.d.objetivo = 1; a.d.objetivoBrillo = 1;
    cam.p.copy(a.pin); cam.t.copy(a.tin);
    camera.fov = fovBase() + (rm ? 0 : 9); camera.updateProjectionMatrix();
    camera.position.copy(cam.p); camera.lookAt(cam.t);
    if (!a.avisado) { a.avisado = true; a.res(); }
  }
  function preescucha(i, on) {
    puertas.forEach((d, k) => { if (k === i) { d.objetivo = on ? .2 : 0; d.objetivoBrillo = on ? .9 : 0; } });
  }

  function actualizarRayo(dt, dentro) {
    proximoRayo -= dt;
    if (proximoRayo <= 0) {
      proximoRayo = 3 + Math.random() * 6;
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
    hemi.intensity = (dentro ? .5 : .9) + f * (dentro ? .5 : .6);   // dentro, con menos luces puntuales, algo más de ambiente
    capasNiebla.forEach(c => c.mat.uniforms.uF.value = f);
    return f;
  }

  function moverParticulas(pts, dt, atraer) {
    const pos = pts.geometry.attributes.position, { base, fase } = pts.userData;
    for (let i = 0; i < pos.count; i++) {
      fase[i] += dt * .4;
      let x = base[i * 3] + Math.sin(fase[i] * .7) * .25, y = base[i * 3 + 1] + Math.sin(fase[i]) * .15, z = base[i * 3 + 2] + Math.cos(fase[i] * .5) * .25;
      if (!rm) { const r = 1 + RAFAGA.value * 9; base[i * 3] += dt * .05 * r; base[i * 3 + 2] -= dt * .02 * r; }   // la ventisca arrastra el polvo
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

  const bezier = (o, a, c, b, s) => o.copy(a).multiplyScalar((1 - s) ** 2).addScaledVector(c, 2 * (1 - s) * s).addScaledVector(b, s * s);
  function actualizar(dt, u, { usarScroll = true } = {}) {
    tiempo += dt; uActual = u;
    if (!rm) {
      // ventisca: cada 20–45 s, una racha de 4–7 s que sube y baja suave
      proximaVentisca -= dt;
      if (proximaVentisca <= 0 && !ventisca) { ventisca = { t: 0, dur: 4 + Math.random() * 3 }; proximaVentisca = 20 + Math.random() * 25; }
      if (ventisca) { ventisca.t += dt; const k = ventisca.t / ventisca.dur; RAFAGA.value = Math.sin(Math.PI * cl(k)) ** 1.4; if (k >= 1) { ventisca = null; RAFAGA.value = 0; } }
      VIENTO.value += dt * (1 + RAFAGA.value * 1.6);
    }
    const ahora = performance.now();
    // cámara
    if (anim) {
      // reloj real: la transición dura lo mismo aunque el dispositivo vaya lento
      anim.t = (ahora - anim.inicio) / 1000; const k = cl(anim.t / anim.dur), a = anim, d = a.d;
      d.objetivo = 1; d.objetivoBrillo = 1;
      if (rm) { cam.p.copy(a.pin); cam.t.copy(a.tin); }
      else {
        // un solo movimiento: arranca suave, se alinea con la puerta y frena en el umbral
        const s2 = eio(k);
        bezier(cam.p, a.p0, a.pf, a.pin, s2); bezier(cam.t, a.t0, a.tf, a.tin, s2);
        camera.fov = fovBase() + 9 * suave(.45, 1, k); camera.updateProjectionMatrix();
      }
      if (!a.avisado && k >= (rm ? .6 : .9)) { a.avisado = true; a.res(); }
      if (k >= 1) { anim = null; retenido = true; }
    } else if (usarScroll && !retenido) {
      const [p, t] = poseScroll(u);
      if (mezcla) {
        mezcla.t = (ahora - mezcla.inicio) / 1000; const f = eio(cl(mezcla.t / mezcla.dur));
        if (mezcla.pc) { bezier(cam.p, mezcla.p0, mezcla.pc, p, f); bezier(cam.t, mezcla.t0, mezcla.tc, t, f); }
        else { cam.p.copy(mezcla.p0).lerp(p, f); cam.t.copy(mezcla.t0).lerp(t, f); }
        camera.fov = fovBase() + (mezcla.fov || 0) * (1 - f); camera.updateProjectionMatrix();
        if (f >= 1) mezcla = null;
      } else {
        // pequeña respiración de cámara en reposo, como sostenida a mano
        const r = rm ? 0 : 1;
        cam.p.copy(p).add(tmp.set(Math.sin(tiempo * .31) * .03 * r, Math.sin(tiempo * .47) * .02 * r, 0)); cam.t.copy(t);
      }
    }
    camera.position.copy(cam.p); camera.lookAt(cam.t);
    // mirar alrededor (ratón o giro del teléfono): la vista gira un poco hacia donde se apunta
    const oy = mirada.activa ? mirada.oyaw : 0, op = mirada.activa ? mirada.opitch : 0;
    mirada.yaw += (oy - mirada.yaw) * cl(dt * (mirada.giro ? 7 : 3.2)); mirada.pitch += (op - mirada.pitch) * cl(dt * (mirada.giro ? 7 : 3.2));
    if (!rm && (mirada.yaw || mirada.pitch)) { const k = cam.p.z < -.6 ? .6 : 1; camera.rotateY(mirada.yaw * k); camera.rotateX(mirada.pitch * k); }
    const dentro = cam.p.z < -.6;
    // zonas: lo que no puede verse desde aquí no se dibuja
    ext.visible = cam.p.z > -7; int.visible = cam.p.z < 12;
    ponerFuera(cam.p.z > -.6);
    if (cierre && ahora > cierre.en) { cierre.d.objetivo = 0; cierre.d.objetivoBrillo = 0; cierre = null; }

    // portal: se abre al subir la escalinata
    const abrePortal = 1 - suave(1.4, 4.8, cam.p.z);
    hojasPortal.forEach(([piv, s]) => piv.rotation.y = s * abrePortal * 1.5); // hacia fuera: quedan dentro del pórtico
    luzPortal.i = 5 + abrePortal * 5;
    faroles.forEach((l, k) => l.i = dentro ? 0 : 6.5 + Math.sin(tiempo * 9 + k * 2) * .35 + Math.sin(tiempo * 23 + k) * .25);
    focoLlegada.i = 3.6 * suave(20, 30, cam.p.z);

    const f = actualizarRayo(dt, dentro);
    cielo.material.uniforms.uT.value = rm ? 0 : tiempo;
    // estrellas fugaces de vez en cuando, en la parte del cielo que se está mirando
    if (!rm) {
      proximaFugaz -= dt;
      if (proximaFugaz <= 0 && uCielo.uFugaP.value < 0) {
        const az = Math.atan2(cam.t.x - cam.p.x, cam.t.z - cam.p.z) + (Math.random() - .5) * 1.1, el = .36 + Math.random() * .2, lado = Math.random() < .5 ? -1 : 1;
        uCielo.uFugaA.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
        uCielo.uFugaB.value.set(Math.sin(az + lado * .55) * Math.cos(el - .12), Math.sin(el - .12), Math.cos(az + lado * .55) * Math.cos(el - .12)).normalize();
        uCielo.uFugaP.value = 0; proximaFugaz = 5 + Math.random() * 10;
      }
      if (uCielo.uFugaP.value >= 0) { uCielo.uFugaP.value += dt / .9; if (uCielo.uFugaP.value >= 1) uCielo.uFugaP.value = -1; }
    }
    if (!rm) { capasNiebla.forEach(c => c.mat.uniforms.uT.value += c.vel * dt); sueloNiebla.material.uniforms.uT.value += dt * .004; }
    // sin sombra propia, el contraluz entraría en la nave: se apaga antes de cruzar el portal
    luna.intensity = dentro ? 0 : 1.5; contra.intensity = .18 * suave(.6, 3.2, cam.p.z);
    if (ext.visible) { primerPlano.actualizar(tiempo, rm, RAFAGA.value); cuervos.actualizar(rm ? 0 : tiempo, rm ? 0 : dt); }

    // puertas: hojas, luz, portal
    for (const d of puertas) {
      const vel = anim && anim.d === d ? 1.25 : 2.2;
      d.abierto += (d.objetivo - d.abierto) * cl(dt * vel);
      if (anim && anim.d === d) d.abierto = Math.max(d.abierto, rm ? 1 : eio(cl((anim.t - .15) / 1.0)));
      d.brillo += (d.objetivoBrillo - d.brillo) * cl(dt * 2.5);
      const ang = cl(d.abierto) * 1.8;
      // todas se abren hacia la nave, hasta quedar contra el derrame del muro: el hueco queda libre para la cámara
      d.hojas.forEach(({ piv, s }) => piv.rotation.y = s * Math.min(ang, 1.52));
      d.matPared.color.setScalar(.3 + d.brillo * .3 + d.abierto * .4);   // la habitación se enciende al abrir
      d.charco.material.opacity = .16 + d.brillo * .35 + d.abierto * .3;
      // la luz de cada puerta está dentro de su pasillo: sale por el hueco al abrirse
      d.foco.p.copy(mundo(d, 0, 1.5, -.9)); d.foco.i = dentro ? .8 + d.brillo * 3 + d.abierto * 2.5 : 0;
    }
    lamparas.forEach(l => l.i = dentro || cam.p.z < 1.5 ? 16 : 0);
    luzFondo.i = dentro ? 9 + Math.sin(tiempo * 8) * .35 + Math.sin(tiempo * 13.7) * .25 : 0;
    // el resplandor del posproceso cede al final de la entrada: el hueco debe verse igual que la habitación
    // POOL luces reales para todos los focos: las que más aportan cerca de la cámara
    for (const fo of focos) fo.peso = fo.i / (1 + fo.p.distanceToSquared(cam.p) / (fo.d * fo.d));
    const orden = focos.filter(fo => fo.i > 0 && fo !== luzFondo).sort((x, y) => y.peso - x.peso);
    if (luzFondo.i > 0) orden.unshift(luzFondo);   // la puerta del fondo siempre con luz real: de lejos debe verse iluminada, no pintada
    luces.forEach((l, k) => { const fo = orden[k]; if (!fo) { l.intensity = 0; return; } l.position.copy(fo.p); l.color.copy(fo.c); l.distance = fo.d; l.intensity = fo.i; });
    if (ext.visible) moverParticulas(polvoExt, dt, null);
    if (!rm) { uLluvia.uT.value += dt; LLUVIA_T.value += dt; }
    uLluvia.uCam.value.copy(cam.p);
    lluvia.visible = salpicaduras.visible = !rm && cam.p.z > -.5;   // con movimiento reducido no llueve (el suelo sigue mojado)
    if (int.visible) moverParticulas(polvoInt, dt, anim && !rm && anim.t > .8 ? { p: mundo(anim.d, 0, 1.4, -1), k: 1.6 * cl((anim.t - .8) / 1.2) } : null);
    return f;
  }

  // sombras estáticas: se dibujan una vez
  let sombraPrincipal = true;
  function render() {
    medirFotograma();
    renderer.shadowMap.needsUpdate = sombraPrincipal; sombraPrincipal = false;
    composer.render();
  }

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
    renderer, camera, scene, calidad, tamano, huecoPantalla, mirar: (x, y) => { mirada.oyaw = -x * .34; mirada.opitch = -y * .15; }, orientar, recentrar: () => { hayBase = false; }, mirarActiva: v => { mirada.activa = v; }, actualizar, render, entrar, salir, ponerEnPuerta, preescucha, rectPuertas, terminarEntrada,
    rafaga: () => RAFAGA.value, provocar: { ventisca: () => { proximaVentisca = 0; }, fugaz: () => { proximaFugaz = 0; } },   // para revisar y capturar
    uDePuerta, U_FIN, U_EXT, U_NAVE, PASO, reponerPolvo: () => reponerParticulas(polvoInt),
    cancelarMezcla: () => { mezcla = null; },
    depurar: () => ({ anim: anim && { t: +anim.t.toFixed(2), dur: anim.dur, avisado: anim.avisado }, mezcla: !!mezcla, cam: cam.p.toArray().map(v => +v.toFixed(2)) }),
  };
}
