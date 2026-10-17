// Habitación 1 · «SI NO ESTOY A TU LADO»: una cámara de piedra del mismo edificio que se abre a un mar celeste.
// Ausencia: una silla vacía mirando al agua. Ataduras: cuerdas que cruzan el espacio y se tensan con la canción.
// El sol baja y se apaga a lo largo del tema («Se esfuma el sol pa siempre»).
// Coordenadas: la entrada está en z = 0 y la sala se abre hacia −z; el mar está más allá de z = −8.
import * as THREE from 'three';
import { arco, contorno, formaU, extruir, uvMundo, envejecer } from './escena.js';

const V3 = THREE.Vector3;
const ANCHO = 2.3, ALTO = 4.4, FONDO = 7.2;

const CIELO = `
  vec3 cielo(vec3 d, vec3 sol, float p){
    float y = max(d.y, 0.);
    vec3 horizonte = mix(vec3(.24,.44,.58), vec3(.36,.26,.27), p * .75);
    vec3 cenit = mix(vec3(.035,.085,.15), vec3(.012,.022,.05), p);
    vec3 c = mix(horizonte, cenit, pow(y, .55));
    float s = max(dot(d, sol), 0.);
    c += vec3(1.,.8,.55) * (pow(s, 1400.) * 5. + pow(s, 40.) * .22 + pow(s, 6.) * .05) * (1. - p * .85);
    return c;
  }`;

export function crearSalaMar({ tex, rm }) {
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(50, 1, .05, 1500);
  camara.matrixAutoUpdate = false; camara.matrixWorldAutoUpdate = false;
  escena.fog = new THREE.Fog(0x4a7590, 60, 900);

  const pbr = (b, o = {}) => new THREE.MeshStandardMaterial({
    map: tex(b + '_col', true), normalMap: tex(b + '_nor'), roughnessMap: tex(b + '_rug'),
    normalScale: new THREE.Vector2(o.normal ?? 1.2, o.normal ?? 1.2), roughness: o.rough ?? 1, color: o.color ?? 0xffffff, side: o.side ?? THREE.FrontSide,
  });
  const piedra = pbr('piedra', { normal: 1.4, color: 0xb8b2ae });
  envejecer(piedra, { base: 0, alto: 1.6, fuerza: .45, vetas: .45, musgo: .5, macro: .6 });
  const suelo = pbr('suelo', { normal: 1, rough: .55, color: 0xa8a6a4 });
  envejecer(suelo, { base: 0, alto: 0, fuerza: 0, vetas: 0, musgo: .3, macro: .4 });

  const add = (g, mat, tile = 2.4) => { const m = new THREE.Mesh(uvMundo(g, tile), mat); m.castShadow = m.receiveShadow = true; escena.add(m); return m; };
  // suelo de losas mojadas, muros, bóveda apuntada y el gran arco abierto al mar
  add(new THREE.PlaneGeometry(ANCHO * 2, FONDO + 2.4).rotateX(-Math.PI / 2).translate(0, 0, -(FONDO + 2.4) / 2 + .4), suelo, 3);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(.6, ALTO, FONDO + .4).translate(s * (ANCHO + .3), ALTO / 2, -FONDO / 2), piedra);
  add(extruir(new THREE.Shape([...arco(0, 0, ANCHO + .3, ANCHO * 1.35), ...arco(0, 0, ANCHO, ANCHO * 1.2).reverse()]), FONDO + .4).translate(0, ALTO - .2, -FONDO - .2), piedra);
  const ABERTURA = { w: 1.75, s: 3.1, R: 2.3 };
  const fondo = new THREE.Shape([new THREE.Vector2(-ANCHO - .6, 0), new THREE.Vector2(ANCHO + .6, 0), new THREE.Vector2(ANCHO + .6, ALTO + 2.6), new THREE.Vector2(-ANCHO - .6, ALTO + 2.6)]);
  fondo.holes.push(new THREE.Path(contorno(0, ABERTURA, .001)));
  add(extruir(fondo, .7).translate(0, 0, -FONDO - .7), piedra);
  add(extruir(formaU(0, { w: 2.0, s: 3.1, R: 2.62 }, ABERTURA), .2).translate(0, 0, -FONDO + .02), piedra, 1);
  // mirador: losa que sigue fuera del arco y antepecho bajo
  add(new THREE.BoxGeometry(3.6, .3, 2).translate(0, -.15, -FONDO - 1.7), piedra, 2);
  add(new THREE.BoxGeometry(3.6, .55, .3).translate(0, .27, -FONDO - 2.6), piedra, 1.4);

  // silla vacía, de espaldas, mirando al mar
  { const madera = new THREE.MeshStandardMaterial({ map: tex('puerta_col', true), color: 0xb79c83, roughness: .7 });
    const silla = new THREE.Group();
    const pieza = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), madera); m.position.set(x, y, z); m.castShadow = true; silla.add(m); };
    pieza(.46, .045, .44, 0, .46, 0);
    for (const [x, z] of [[-.2, -.19], [.2, -.19], [-.2, .19], [.2, .19]]) pieza(.04, .46, .04, x, .23, z);
    for (const x of [-.2, .2]) pieza(.04, .5, .04, x, .72, .19);
    pieza(.46, .07, .035, 0, .95, .19); pieza(.46, .05, .03, 0, .7, .19);
    silla.position.set(.75, 0, -FONDO + 2.6); silla.rotation.y = -.22; silla.scale.setScalar(1.1);
    escena.add(silla); }

  // cuerdas: catenarias de muro a muro y del arco al antepecho; se tensan con el progreso
  const matCuerda = new THREE.MeshStandardMaterial({ color: 0x2c2520, roughness: .9 });
  const matOro = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: .45, metalness: .6 });
  const CUERDAS = [
    [new V3(-ANCHO, 3.1, -1.6), new V3(ANCHO, 2.7, -2.9), .9, matCuerda],
    [new V3(-ANCHO, 2.2, -3.4), new V3(ANCHO, 2.6, -2.2), 1.1, matOro],
    [new V3(-ANCHO, 1.5, -4.6), new V3(ANCHO, 1.9, -5.4), .8, matCuerda],
    [new V3(-ANCHO, 3.4, -5.8), new V3(ANCHO, 3.0, -4.9), 1.2, matCuerda],
    [new V3(-1.3, 2.9, -FONDO), new V3(-1.5, .55, -FONDO - 2.45), .5, matCuerda],
    [new V3(1.25, 3.0, -FONDO), new V3(1.6, .55, -FONDO - 2.45), .5, matCuerda],
  ].map(([a, b, comba, mat]) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.castShadow = true; escena.add(m); return { a, b, comba, m }; });
  let tensionPintada = -1;
  function tensar(p) {
    const t = rm ? 0 : Math.round(p * 40) / 40;    // se rehace 40 veces por canción como máximo
    if (t === tensionPintada) return; tensionPintada = t;
    for (const c of CUERDAS) {
      const comba = c.comba * (1 - .82 * t), pts = [];
      for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push(c.a.clone().lerp(c.b, u).add(new V3(0, -comba * 4 * u * (1 - u), 0))); }
      c.m.geometry.dispose();
      c.m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .022, 6, false);
    }
  }

  // mar y cielo (sombreadores propios, mismo sol para los dos)
  const sol = new V3(0, .12, -1).normalize();
  const uni = { uT: { value: 0 }, uSol: { value: sol }, uP: { value: 0 } };
  escena.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uni,
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform vec3 uSol; uniform float uP; varying vec3 vD; ${CIELO}
      void main(){ vec3 d = normalize(vD); gl_FragColor = vec4(cielo(d, uSol, uP), 1.); }`,
  })));
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    fog: false, uniforms: uni,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 uSol; uniform float uP; uniform float uT; varying vec3 vW; ${CIELO}
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float olas(vec2 p){ return n(p * .35 + vec2(uT * .06, uT * .03)) * .6 + n(p * 1.1 - vec2(uT * .11, 0.)) * .3 + n(p * 3.7 + uT * .2) * .1; }
      void main(){
        vec2 q = vW.xz; float e = .3;
        vec3 nrm = normalize(vec3(olas(q - vec2(e, 0.)) - olas(q + vec2(e, 0.)), 1.6, olas(q - vec2(0., e)) - olas(q + vec2(0., e))));
        vec3 v = normalize(vW - cameraPosition), r = reflect(v, nrm);
        float fres = .04 + .96 * pow(1. - max(dot(-v, nrm), 0.), 5.);
        vec3 hondo = mix(vec3(.03, .11, .16), vec3(.01, .03, .06), uP);
        vec3 c = mix(hondo, cielo(r, uSol, uP), fres);
        c += vec3(1., .85, .62) * pow(max(dot(r, uSol), 0.), 380.) * 1.6 * (1. - uP * .9);
        float dist = length(vW.xz - cameraPosition.xz);
        c = mix(c, cielo(normalize(vec3(v.x, .002, v.z)), uSol, uP), smoothstep(150., 1400., dist));
        gl_FragColor = vec4(c, 1.); }`,
  }));
  mar.position.y = -2.2; escena.add(mar);

  // luces: sol bajo que entra por el arco y proyecta la sombra larga de la silla; cielo celeste de relleno
  const luzSol = new THREE.DirectionalLight(0xffd6a6, 1.8);
  luzSol.castShadow = true; luzSol.shadow.mapSize.set(1024, 1024);
  Object.assign(luzSol.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 80 });
  luzSol.shadow.bias = -.0005; luzSol.target.position.set(0, 0, -3);
  escena.add(luzSol, luzSol.target);
  const cielo = new THREE.HemisphereLight(0x9fd0ea, 0x0d0f12, .7); escena.add(cielo);
  const brillo = new THREE.PointLight(0x9fd0ea, 3, 9, 2); brillo.position.set(0, 2.2, -FONDO + .4); escena.add(brillo);

  let t = 0;
  function actualizar(dt, p) {
    t += rm ? 0 : dt;
    const e = .12 - .17 * p;                      // el sol baja hasta perderse bajo el horizonte
    sol.set(Math.sin(.18), e, -1).normalize();
    uni.uT.value = t; uni.uP.value = p;
    luzSol.position.copy(sol).multiplyScalar(40).add(new V3(0, 0, -3));
    luzSol.intensity = 1.8 * Math.max(0, Math.min(1, (e + .05) / .12));
    cielo.intensity = .75 - .35 * p;
    escena.fog.color.setRGB(.24 - .1 * p, .44 - .2 * p, .58 - .3 * p);
    tensar(p);
  }
  actualizar(0, 0);
  return { escena, camara, actualizar };
}
