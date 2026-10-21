// Llegada: lo que hay entre el visitante y la capilla, en tres planos.
//   Primer plano: una corona caída, rosas, pétalos, ataduras de hierro y destellos minerales.
//   Plano medio: tumbas y cruces a los lados, la escalinata en el centro.
// Interpretación artística (no es un significado oficial): la corona de quien se creyó dueño del mundo,
// pequeña ante la tormenta; las rosas, los vínculos y su fragilidad; los destellos, el polvo de estrella.
// Geometría fusionada o instanciada, pocos materiales. Se mueve con el viento en el sombreador (rosas, hojas,
// tallos); en la CPU solo unos pocos pétalos que el viento arrastra por el suelo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mecer } from './escena.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;

export function crearPrimerPlano({ add, poner, M, MOVIL }) {
  let semilla = 23;
  const rnd = () => (semilla = semilla * 16807 % 2147483647) / 2147483647;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), tmpV = new V3(), uno = new V3(1, 1, 1);
  // agua: gotas que brillan con el entorno (sobre la corona, las rosas y las hojas)
  const matAgua = new THREE.MeshStandardMaterial({ color: 0xd8d0d4, roughness: .02, metalness: 0, transparent: true, opacity: .32, envMapIntensity: 3 });
  matAgua.userData.refleja = true;
  const fijo = (g, mat, sombra = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; add(m); return m; };

  /* ---------- corona ---------- */
  // Aro con molduras y dos hileras de perlas, ocho puntas curvadas sobre el aro (flor de lis y lanza
  // alternas), cabujones de rubí engastados en bisel y oro gastado: rayado, con suciedad en los huecos y
  // gotas de lluvia encima.
  const oroGastado = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#c99a3c'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '60,38,12' : '235,200,120'},${Math.random() * .12})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 10, 0, 6.3); x.fill(); }
    x.strokeStyle = 'rgba(255,230,170,.35)'; x.lineWidth = .7;
    for (let i = 0; i < 70; i++) { const px = Math.random() * 256, py = Math.random() * 256, a = Math.random() * 6.3, l = 6 + Math.random() * 30; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }   // rayas
    const col = new THREE.CanvasTexture(c); col.colorSpace = THREE.SRGBColorSpace; col.wrapS = col.wrapT = THREE.RepeatWrapping;
    const r = document.createElement('canvas'); r.width = r.height = 128; const y = r.getContext('2d');
    y.fillStyle = '#4d4d4d'; y.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) { y.fillStyle = `rgba(${Math.random() < .5 ? '20,20,20' : '160,160,160'},${Math.random() * .3})`; y.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 6, 1 + Math.random() * 2); }
    const rug = new THREE.CanvasTexture(r); rug.wrapS = rug.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: col, roughnessMap: rug, roughness: 1, metalness: 1, envMapIntensity: 1.8, color: 0xfff0d0, emissive: 0x1a0c02, emissiveIntensity: .4 });
  })();
  { const R = .43, partes = [], gemas = [], biseles = [], gotas = [];
    // aro: base ensanchada, dos acanaladuras y labio superior
    const perfil = [[.4, 0], [.455, 0], [.462, .018], [.445, .03], [.44, .06], [.452, .07], [.44, .08], [.44, .165], [.452, .175], [.44, .185], [.44, .205], [.465, .22], [.458, .245], [.4, .245], [.395, .12]].map(([x, y]) => new V2(x, y));
    partes.push(new THREE.LatheGeometry(perfil, 64));
    const perla = new THREE.SphereGeometry(.0105, 8, 6);
    for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; for (const y of [.045, .195]) partes.push(perla.clone().translate(Math.sin(a) * .448, y, Math.cos(a) * .448)); }
    // las puntas se dibujan planas y se curvan sobre el aro (x → ángulo)
    const doblar = (g, a0) => { const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) { const th = a0 + pp.getX(i) / R, rr = R + .004 + pp.getZ(i); pp.setXYZ(i, Math.sin(th) * rr, pp.getY(i), Math.cos(th) * rr); } g.computeVertexNormals(); return g; };
    const lis = new THREE.Shape().moveTo(-.12, 0).lineTo(.12, 0).bezierCurveTo(.1, .08, .02, .1, .05, .2).bezierCurveTo(.1, .22, .09, .3, .02, .3).bezierCurveTo(.02, .36, .0, .4, 0, .42)
      .bezierCurveTo(0, .4, -.02, .36, -.02, .3).bezierCurveTo(-.09, .3, -.1, .22, -.05, .2).bezierCurveTo(-.02, .1, -.1, .08, -.12, 0);
    const lanza = new THREE.Shape().moveTo(-.1, 0).lineTo(.1, 0).bezierCurveTo(.06, .1, .025, .18, 0, .3).bezierCurveTo(-.025, .18, -.06, .1, -.1, 0);
    const cabujon = (ancho, rojo) => { const g = new THREE.SphereGeometry(ancho, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1.2, .5); return g; };
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, alta = k % 2 === 0;
      const g = new THREE.ExtrudeGeometry(alta ? lis : lanza, { depth: .02, bevelEnabled: true, bevelSize: .007, bevelThickness: .007, bevelSegments: 2, curveSegments: 10 });
      partes.push(doblar(g.translate(0, .235, 0), a));
      const tope = alta ? .235 + .42 : .235 + .3;
      partes.push(new THREE.SphereGeometry(alta ? .026 : .02, 12, 8).translate(Math.sin(a) * (R + .015), tope + .015, Math.cos(a) * (R + .015)));
      // cabujón en el aro, entre las acanaladuras, y su bisel
      const ag = a + Math.PI / 8, rx = Math.sin(ag) * (R + .03), rz = Math.cos(ag) * (R + .03);
      gemas.push(cabujon(.034).rotateY(ag).translate(rx, .125, rz).toNonIndexed());
      biseles.push(new THREE.TorusGeometry(.036, .006, 6, 20).scale(1, 1.2, 1).rotateY(ag).translate(Math.sin(ag) * (R + .028), .125, Math.cos(ag) * (R + .028)).toNonIndexed());
      if (alta) gemas.push(new THREE.OctahedronGeometry(.022, 0).scale(1, 1.4, .5).rotateY(a).translate(Math.sin(a) * (R + .03), .235 + .2, Math.cos(a) * (R + .03)).toNonIndexed());
    }
    // gotas de lluvia sobre el labio y las puntas
    for (let k = 0; k < 26; k++) { const a = rnd() * 6.28, y = k < 16 ? .25 : .26 + rnd() * .3, rr = k < 16 ? .43 : R + .02; gotas.push(new THREE.SphereGeometry(.006 + rnd() * .006, 8, 6).scale(1, .7, 1).translate(Math.sin(a) * rr, y, Math.cos(a) * rr)); }
    const corona = new THREE.Group();
    const oro = new THREE.Mesh(mergeGeometries([...partes, ...biseles].map(g => g.index ? g.toNonIndexed() : g), false), oroGastado); oro.castShadow = true;
    const rubi = new THREE.Mesh(mergeGeometries(gemas), new THREE.MeshStandardMaterial({ color: 0x7a0612, roughness: .06, metalness: .1, envMapIntensity: 2.5, emissive: 0x2a0205, emissiveIntensity: .7 }));
    rubi.material.userData.refleja = true;
    const agua = new THREE.Mesh(mergeGeometries(gotas.map(g => g.toNonIndexed())), matAgua);
    corona.add(oro, rubi, agua);
    corona.scale.setScalar(1.4);
    corona.position.set(.3, .03, 37.9); corona.rotation.set(.12, .55, .46);   // caída de lado sobre el barro
    add(corona); }

  /* ---------- rosas ---------- */
  // pétalo: superficie combada (cóncava hacia +z) que se abre hacia la punta
  function petalo(largo, ancho, copa, rizo) {
    const g = new THREE.PlaneGeometry(1, 1, 6, 6), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const t = p.getX(k) * 2, s = p.getY(k) + .5, w = Math.sin(Math.PI * (s * .85 + .1)) * ancho;
      p.setXYZ(k, t * w, s * largo, t * t * copa * w * 2 - s * s * rizo);
    }
    g.computeVertexNormals(); return g;
  }
  // Cabeza de rosa: cada pétalo es un trozo de copa que envuelve el centro. Los interiores, altos y cerrados
  // (capullo); los exteriores, más anchos, se abren hacia arriba y vuelven el borde.
  function cabeza() {
    const gs = [];
    for (let k = 0; k < 15; k++) {
      const f = k / 14, a0 = k * 2.399, span = 1.9 + f * 1.1;
      const r0 = .006 + f * .036, alto = .045 + f * .045, abre = .12 + f * .65, base = -f * .03;
      const g = new THREE.PlaneGeometry(1, 1, 5, 4), p = g.attributes.position;   // ligero: ~100 rosas en pantalla
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) * 2, v = p.getY(i) + .5;
        const ancho = .55 + .45 * Math.sin(Math.min(1, v * 1.15) * Math.PI * .5);     // estrecho en la base
        const ang = a0 + u * span * .5 * ancho;
        const borde = Math.max(0, v - .7) / .3;
        const r = r0 * (1 + v * v * abre) + borde * borde * f * .02;                  // el labio se vuelve hacia fuera
        const y = base + v * alto - borde * borde * f * .012 - u * u * .004;
        p.setXYZ(i, Math.cos(ang) * r, y, Math.sin(ang) * r);
      }
      g.computeVertexNormals(); gs.push(g);
    }
    // cáliz: cinco sépalos finos bajo la flor
    for (let k = 0; k < 5; k++) gs.push(petalo(.05, .012, .2, .02).rotateX(2.1).translate(0, -.03, 0).rotateY(k * 1.2566));
    return mergeGeometries(gs);
  }
  const matRosa = new THREE.MeshStandardMaterial({ color: 0x6e0a12, roughness: .3, side: THREE.DoubleSide, emissive: 0x1c0204, emissiveIntensity: .7, envMapIntensity: .8 });
  // pétalos mojados: la rugosidad baja basta para el brillo de luna y faroles (el mapa de entorno en ~100 rosas costaba de más)
  const matHoja = new THREE.MeshStandardMaterial({ color: 0x0f150c, roughness: .6, side: THREE.DoubleSide });
  const matTallo = new THREE.MeshStandardMaterial({ color: 0x10120c, roughness: .8 });
  for (const m of [matRosa, matHoja, matTallo, matAgua]) mecer(m, 'planta', .07);
  const ARBUSTOS = [   // [x, z, nº de rosas, escala]
    [-2.9, 38.2, 3, 2], [-5.4, 35.2, 4, 2.1], [3.2, 37.8, 3, 1.9], [6.1, 33.5, 3, 2], [-1.4, 36.6, 3, 1.5], [1.05, 39.4, 2, 1.3],
    [-4.2, 25, 2, 1.3], [4.6, 23.5, 2, 1.3], [-6.4, 9.2, 3, 1.5], [6.8, 8.4, 3, 1.5], [-7.6, 15, 2, 1.4], [8, 14.5, 2, 1.4],
    // matas densas en las esquinas del primer plano y a lo largo del camino, como en la referencia
    [-2.5, 40.3, 3, 1.8], [2.7, 40.1, 3, 1.8], [-4.4, 37.6, 4, 2.2], [4.6, 37, 4, 2.2],
    [-3.3, 30.2, 4, 2.2], [3.5, 28.6, 4, 2.2], [-2.6, 20.4, 4, 2], [2.8, 18.2, 4, 2], [-5.9, 15.6, 4, 2], [6.1, 13.1, 4, 2], [-4.6, 25.4, 3, 2], [4.8, 23.6, 3, 2],
    [-4.3, 6.5, 4, 1.7], [4.5, 6.3, 4, 1.7],     [-.95, 40.5, 2, 1.2], [1.9, 35.3, 2, 1.3], [-2.1, 34, 2, 1.3], [.4, 31.5, 1, 1.1],
    // rosas que desbordan las dos urnas de piedra al pie de la escalinata
    [-6.1, 4.7, 5, 1.3, 1.5], [6.1, 4.7, 5, 1.3, 1.5],
  ];
  const nRosas = ARBUSTOS.reduce((a, b) => a + b[2], 0);
  const rosas = new THREE.InstancedMesh(cabeza(), matRosa, nRosas);
  const hojaG = (() => { const g = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, 0).quadraticCurveTo(.05, .06, 0, .15).quadraticCurveTo(-.05, .06, 0, 0), 4); g.rotateX(-.6); return g; })();
  const nHojas = nRosas * 5, hojas = new THREE.InstancedMesh(hojaG, matHoja, nHojas);
  const tallos = [], espinas = [], cabezas = [];
  let goteo = null;
  let kr = 0, kh = 0;
  for (const [x, z, n, esc, y0 = 0] of ARBUSTOS) for (let j = 0; j < n; j++) {
    const alto = (.16 + rnd() * .3) * esc, base = new V3(x + (rnd() - .5) * (y0 ? .35 : .5) * esc, y0, z + (rnd() - .5) * (y0 ? .3 : .4) * esc);
    const tope = base.clone().add(new V3((rnd() - .5) * .3, alto, (rnd() - .5) * .3));
    const curva = new THREE.QuadraticBezierCurve3(base, base.clone().lerp(tope, .5).add(new V3((rnd() - .5) * .25, 0, (rnd() - .5) * .25)), tope);
    tallos.push(new THREE.TubeGeometry(curva, 8, .008 * esc, 4, false));
    for (let k = 0; k < 4; k++) { const p = curva.getPoint(.2 + k * .18); espinas.push(new THREE.ConeGeometry(.006 * esc, .03 * esc, 4).rotateZ(Math.PI / 2 * (k % 2 ? 1 : -1)).translate(p.x, p.y, p.z)); }
    const sc = (1.35 + rnd() * .5) * esc;   // cabezas grandes y llenas, como en la referencia
    cabezas.push([tope.clone(), sc]);
    m4.compose(tope, q.setFromEuler(e.set((rnd() - .5) * .7, rnd() * 6, (rnd() - .5) * .7)), new V3(sc, sc, sc)); rosas.setMatrixAt(kr++, m4);
    for (let k = 0; k < 5; k++) {
      const p = curva.getPoint(.25 + rnd() * .65), s2 = esc * (.9 + rnd() * .6);
      m4.compose(p, q.setFromEuler(e.set(rnd() * .6, rnd() * 6.3, rnd() * .6)), new V3(s2, s2, s2)); hojas.setMatrixAt(kh++, m4);
    }
  }
  rosas.castShadow = true; hojas.castShadow = true; add(rosas, hojas);
  // gotas de lluvia en el borde de los pétalos (se mecen con su rosa) y gotas que caen de ellas
  { const n = cabezas.length * 4, gotas = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6).scale(1, .75, 1), matAgua, n);
    let k = 0;
    for (const [p, sc] of cabezas) for (let j = 0; j < 4; j++) {
      const a = rnd() * 6.28, r = (.03 + rnd() * .03) * sc, t = (.0022 + rnd() * .0022) * sc;
      m4.compose(new V3(p.x + Math.cos(a) * r, p.y + (.035 + rnd() * .03) * sc, p.z + Math.sin(a) * r), q.identity(), new V3(t, t, t)); gotas.setMatrixAt(k++, m4);
    }
    add(gotas);
    const g = new THREE.BufferGeometry().setFromPoints(cabezas.map(([p, sc]) => new V3(p.x + (rnd() - .5) * .08 * sc, p.y - .02, p.z + (rnd() - .5) * .08 * sc)));
    g.setAttribute('f', new THREE.BufferAttribute(Float32Array.from(cabezas, () => rnd() * 30), 1));
    goteo = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uEsc: { value: 1 } },
      vertexShader: 'attribute float f; uniform float uT, uEsc; varying float vA; void main(){ float c = fract(uT * .55 + f); float cae = max(0., c - .55) / .45; vec3 p = position - vec3(0., cae * cae * .55, 0.); vA = c < .55 ? smoothstep(0., .55, c) * .5 : 1. - cae; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = uEsc * 3.4 / -mv.z * 6.; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q * vec2(1.6, 1.)) * 2.; gl_FragColor = vec4(vec3(.85, .8, .82), (1. - smoothstep(.5, 1., d)) * vA * .8); }',
    }));
    goteo.renderOrder = 3; add(goteo); }
  fijo(mergeGeometries([...tallos, ...espinas].map(g => g.index ? g.toNonIndexed() : g)), matTallo);

  // pétalos caídos alrededor de la corona y por la plaza
  { const n = MOVIL ? 100 : 190, pet = new THREE.InstancedMesh(petalo(.09, .06, .35, .01), matRosa, n);
    for (let k = 0; k < n; k++) {
      const cerca = k < n * .4, x = cerca ? (rnd() - .5) * 4 : (rnd() - .5) * 14, z = cerca ? 35 + rnd() * 5 : 6 + rnd() * 34;
      m4.compose(new V3(x, .012, z), q.setFromEuler(e.set(-Math.PI / 2 + (rnd() - .5) * .4, 0, rnd() * 6.3)), new V3(1, 1, 1).multiplyScalar(.8 + rnd() * .8));
      pet.setMatrixAt(k, m4);
    }
    pet.receiveShadow = true; add(pet); }

  /* ---------- ataduras: rollos de hierro y zarzas en el suelo ---------- */
  { const hierro = [], zarza = [], pinchos = [];
    const rollo = (cx, cz, r, vueltas, grosor) => {
      const pts = [];
      for (let k = 0; k <= vueltas * 24; k++) {
        const a = k / 24 * Math.PI * 2, rr = r * (.75 + .25 * Math.sin(k * .37)) * (1 + .12 * Math.sin(a * 2.5));
        pts.push(new V3(cx + Math.cos(a) * rr + k * .004, grosor + .02 + Math.abs(Math.sin(a * 1.5)) * .06, cz + Math.sin(a) * rr * .8));
      }
      // cola que se aleja serpenteando
      const ult = pts[pts.length - 1];
      for (let k = 1; k < 8; k++) pts.push(new V3(ult.x + k * .28, grosor, ult.z + Math.sin(k) * .3 - k * .1));
      hierro.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, grosor, 6, false));
    };
    rollo(-2.7, 40.6, .7, 2.3, .035); rollo(3.9, 39.6, .55, 2, .03); rollo(5.4, 27, .6, 2, .03); rollo(-5.2, 30.5, .5, 1.6, .028);
    rollo(-4.4, 38.3, .8, 2.6, .04); rollo(4.7, 37.6, .75, 2.4, .04); rollo(-3.8, 23, .5, 1.8, .028); rollo(4.1, 10.5, .55, 1.8, .03);
    const vid = (a, b, n) => {
      const pts = [];
      for (let k = 0; k <= n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.x += Math.sin(t * 9 + a.x) * .35; p.z += Math.cos(t * 7 + a.z) * .35; p.y = .02 + Math.abs(Math.sin(t * 5)) * .05; pts.push(p); }
      const c = new THREE.CatmullRomCurve3(pts); zarza.push(new THREE.TubeGeometry(c, n * 4, .012, 4, false));
      for (let k = 0; k < n * 3; k++) { const t = k / (n * 3), p = c.getPoint(t); pinchos.push(new THREE.ConeGeometry(.007, .045, 4).rotateZ(Math.PI / 2).rotateY(rnd() * 6.3).translate(p.x, p.y + .01, p.z)); }
    };
    vid(new V3(-3.1, 0, 38.6), new V3(-.9, 0, 38.9), 6); vid(new V3(3.4, 0, 38.2), new V3(1.4, 0, 36.3), 6);
    vid(new V3(-5.6, 0, 35.2), new V3(-3, 0, 31), 7); vid(new V3(6.1, 0, 33.5), new V3(3.2, 0, 30.2), 7);
    vid(new V3(-6.4, 0, 9.2), new V3(-4.4, 0, 6.6), 5); vid(new V3(6.8, 0, 8.4), new V3(4.5, 0, 6.4), 5);
    vid(new V3(-2.5, 0, 40.3), new V3(-.8, 0, 39.5), 6); vid(new V3(2.7, 0, 40.1), new V3(1, 0, 39.2), 6);
    vid(new V3(-4.4, 0, 37.6), new V3(-3.6, 0, 33), 7); vid(new V3(4.6, 0, 37), new V3(3.8, 0, 32.4), 7);
    vid(new V3(-3.3, 0, 30.2), new V3(-1.2, 0, 27), 6); vid(new V3(3.5, 0, 28.6), new V3(1.4, 0, 25.5), 6);
    vid(new V3(-4.3, 0, 6.5), new V3(-2.6, 0, 4.9), 5); vid(new V3(4.5, 0, 6.3), new V3(2.8, 0, 4.8), 5);
    fijo(mergeGeometries(hierro), M.hierro);
    fijo(mergeGeometries([...zarza, ...pinchos.map(g => g.toNonIndexed())].map(g => g.index ? g.toNonIndexed() : g)), matTallo); }

  /* ---------- destellos minerales ---------- */
  const DIAMANTES = [[1.25, 38.7, .11], [-.95, 39.7, .09], [2.6, 35.2, .13], [-2.3, 31.4, .1], [.8, 28.4, .08], [-4.4, 40.2, .1], [4.7, 36.6, .12], [-1.6, 12.3, .09], [2.3, 10.6, .1], [-.4, 33.6, .07],
    [-3.2, 36.8, .1], [3.9, 33, .09], [-1.9, 25.6, .08], [2.1, 22.4, .09], [-5.4, 38.6, .12], [5.6, 41.2, .11], [.2, 41.6, .08], [-.9, 17.5, .08]];
  // talla brillante: pabellón, faja y corona con más facetas; el cristal irisado da destellos de color (fuego)
  const talla = new THREE.LatheGeometry([new V2(0, -.92), new V2(.42, -.52), new V2(.96, -.06), new V2(1, 0), new V2(1, .07), new V2(.86, .2), new V2(.62, .38), new V2(.5, .43), new V2(0, .43)], 16);
  // Diamante: cada faceta (normal por derivadas) refleja y refracta un entorno de tormenta (cielo carmesí
  // arriba, suelo casi negro abajo), así que las facetas alternan negro, rojo y blanco como en una piedra
  // tallada de verdad. La dispersión solo separa un poco los canales al refractar: color fino en los bordes,
  // sin destellos que parpadeen ni arcoíris.
  const matDiamante = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vV; varying vec3 vN; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.); vec4 mv = viewMatrix * w; vV = mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec3 vV;
      vec3 entorno(vec3 d){   // en espacio de vista: aproximación suficiente para piedras pequeñas
        float y = d.y;
        vec3 c = mix(vec3(.008, .006, .007), mix(vec3(.4, .06, .07), vec3(.62, .58, .6), smoothstep(.35, .8, y)), smoothstep(-.1, .45, y));   // abajo negro, horizonte rojo, arriba gris claro
        c += vec3(.9) * smoothstep(.97, 1., sin(d.x * 23. + d.y * 17.) * .5 + .5) * smoothstep(.1, .5, y);   // ventanas de luz: facetas blancas
        c += vec3(1., .82, .82) * pow(max(dot(d, normalize(vec3(.35, .75, -.45))), 0.), 90.) * 6.;   // luna
        c += vec3(1., .55, .3) * pow(max(dot(d, normalize(vec3(-.6, .2, -.6))), 0.), 50.) * 2.5;     // farol
        return c; }
      void main(){
        vec3 n = normalize(cross(dFdx(vV), dFdy(vV))), v = normalize(-vV);
        float nv = clamp(abs(dot(n, v)), 0., 1.);
        float fres = .17 + .83 * pow(1. - nv, 5.);   // diamante: n = 2,42
        vec3 r = reflect(-v, n);
        vec3 tR = refract(-v, n, 1. / 2.40), tG = refract(-v, n, 1. / 2.42), tB = refract(-v, n, 1. / 2.45);
        vec3 nIn = normalize(n * vec3(-1., -1., 1.));   // rebote interno en la faceta opuesta
        vec3 dentro = vec3(entorno(reflect(tR, nIn)).r, entorno(reflect(tG, nIn)).g, entorno(reflect(tB, nIn)).b);
        vec3 c = entorno(r) * fres + dentro * (1. - fres) * 1.25;
        gl_FragColor = vec4(c, 1.); }`,
  });
  const diam = new THREE.InstancedMesh(talla, matDiamante, DIAMANTES.length);
  DIAMANTES.forEach(([x, z, s], k) => {
    m4.compose(new V3(x, s * .55, z), q.setFromEuler(e.set((rnd() - .5) * 1.4, rnd() * 6, (rnd() - .5) * 1.4)), new V3(s, s, s)); diam.setMatrixAt(k, m4);
  });
  diam.castShadow = true; add(diam);

  /* ---------- cementerio a los lados ---------- */
  { const lapida = new THREE.Shape([new V2(-.3, 0), new V2(.3, 0), new V2(.3, .7)]); lapida.absarc(0, .7, .3, 0, Math.PI, false); lapida.lineTo(-.3, 0);
    const lap = new THREE.ExtrudeGeometry(lapida, { depth: .14, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1, curveSegments: 10 });
    // detrás de la verja, y en dos hileras que bordean el camino hacia la escalinata (el centro queda libre)
    for (const lado of [-1, 1]) for (let k = 0; k < 12; k++) {
      const junto = k >= 5, x = lado * (junto ? 5.6 + rnd() * 3.6 : 10.5 + rnd() * 13), z = junto ? 9 + (k - 5) * 3.4 + rnd() * 1.5 : 3 + rnd() * 13, sc = .9 + rnd() * .8;
      const g = lap.clone().scale(sc, sc * (.9 + rnd() * .5), sc).rotateZ((rnd() - .5) * .22).rotateX(-(rnd()) * .14).rotateY((rnd() - .5) * .5).translate(x, -.05, z);
      poner(M.piedra, g, 1.2);
      // cruz detrás de algunas tumbas: de piedra o de hierro, algunas con anillo
      if (junto || rnd() < .6) {
        const h = 1.5 + rnd() * 1.4, mat = rnd() < .5 ? M.piedra : M.hierro, gr = mat === M.hierro ? .07 : .16;
        const piezas = [new THREE.BoxGeometry(gr, h, gr).translate(0, h / 2, 0), new THREE.BoxGeometry(h * .5, gr, gr).translate(0, h * .72, 0)];
        if (rnd() < .5) piezas.push(new THREE.TorusGeometry(h * .14, gr * .32, 6, 20).translate(0, h * .72, 0));
        const cruz = mergeGeometries(piezas.map(g => g.toNonIndexed())).rotateZ((rnd() - .5) * .25).rotateY((rnd() - .5) * .6).translate(x + (rnd() - .5) * 1.2, -.05, z - .9 - rnd());
        poner(mat, cruz, 1);
      }
    } }

  /* ---------- la entrada: urnas, velas en la escalinata, zarzas por las columnas del pórtico ---------- */
  { // urnas de piedra sobre pedestal a los dos lados del pie de la escalinata
    const perfil = [[0, 0], [.42, 0], [.42, .1], [.3, .14], [.24, .3], [.36, .52], [.5, .78], [.54, 1], [.6, 1.06], [.56, 1.12], [.46, 1.1], [0, 1.1]].map(([x, y]) => new V2(x, y));
    for (const s of [-1, 1]) {
      poner(M.piedra, new THREE.BoxGeometry(.95, .5, .95).translate(s * 6.1, .25, 4.7), .8);
      poner(M.piedra, new THREE.LatheGeometry(perfil, 20).toNonIndexed().translate(s * 6.1, .5, 4.7), .8);
    }
  }
  const VELAS = [];
  { // racimos de velas sobre los peldaños, junto a los extremos; algunas consumidas
    const peldano = i => ({ y: 1.02 - i * .17, z: 1.6 + (i + .5) * .42 });
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const { y, z } = peldano(i), ancho = (7.6 + i * .55) / 2;
      const nv = 2 + (rnd() * 3 | 0);
      for (let k = 0; k < nv; k++) VELAS.push({ x: s * (ancho - .35 - rnd() * 1.1), y, z: z + (rnd() - .5) * .22, h: .08 + rnd() * .3, r: .025 + rnd() * .025 });
    }
    for (const s of [-1, 1]) for (let k = 0; k < 7; k++) VELAS.push({ x: s * (5.3 + rnd() * 1.4), y: 0, z: 5.2 + rnd() * 1.6, h: .1 + rnd() * .35, r: .03 + rnd() * .03 });   // y en el suelo, junto a las urnas
    const cuerpo = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, .5, 0), new THREE.MeshStandardMaterial({ color: 0xb9aea4, roughness: .7, emissive: 0x3a1408, emissiveIntensity: .35 }), VELAS.length);
    VELAS.forEach((v, k) => { m4.compose(new V3(v.x, v.y, v.z), q.identity(), new V3(v.r, v.h, v.r)); cuerpo.setMatrixAt(k, m4); });
    cuerpo.castShadow = true; add(cuerpo);
  }
  // llamas: un punto por vela con su propio parpadeo (una sola llamada de dibujo)
  const llamaG = new THREE.BufferGeometry().setFromPoints(VELAS.map(v => new V3(v.x, v.y + v.h + .035, v.z)));
  llamaG.setAttribute('f', new THREE.BufferAttribute(Float32Array.from(VELAS, () => rnd() * 50), 1));
  const llamas = new THREE.Points(llamaG, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uEsc: { value: 1 }, uR: { value: 0 } },
    vertexShader: 'attribute float f; uniform float uT, uEsc, uR; varying float vB; void main(){ vB = .75 + .25 * sin(uT * 11. + f) * sin(uT * 7.3 + f * 2.) - uR * .4 * (.5 + .5 * sin(uT * 23. + f)); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = uEsc * 55. * vB / -mv.z * 6.; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vB; void main(){ vec2 q = gl_PointCoord - .5; q.y *= .55; float d = length(q) * 2.; float c = pow(max(0., 1. - d), 2.2); gl_FragColor = vec4(vec3(1., .55, .22) * c + vec3(1., .9, .7) * pow(c, 6.), c) * vB; }',
  }));
  llamas.renderOrder = 3; add(llamas);
  { // zarzas que trepan por las columnas del pórtico y los pináculos
    const zg = [], pg = [];
    const trepa = (cx, cz, r, h, vueltas, fase) => {
      const pts = [];
      for (let k = 0; k <= 40; k++) { const t = k / 40, a = fase + t * vueltas * 6.283; pts.push(new V3(cx + Math.cos(a) * r * (1 + .15 * Math.sin(t * 17)), 1.02 + t * h, cz + Math.sin(a) * r * (1 + .15 * Math.cos(t * 13)))); }
      const c = new THREE.CatmullRomCurve3(pts); zg.push(new THREE.TubeGeometry(c, 80, .014, 4, false));
      for (let k = 0; k < 26; k++) { const p = c.getPoint(k / 26); pg.push(new THREE.ConeGeometry(.008, .05, 4).rotateZ(Math.PI / 2).rotateY(rnd() * 6.3).translate(p.x, p.y, p.z).toNonIndexed()); }
    };
    for (const s of [-1, 1]) {
      trepa(s * 2.6, 1.3, .13, 2.9, 3.2, rnd() * 6); trepa(s * 2.25, .75, .13, 2.4, 2.6, rnd() * 6);
      trepa(s * 4.1, 1.05, .42, 4.2, 2.1, rnd() * 6); trepa(s * 4.7, 4.7, .1, 1.9, 2.4, rnd() * 6);   // pináculo y farol
    }
    fijo(mergeGeometries([...zg.map(g => g.toNonIndexed()), ...pg]), matTallo);
    // alguna rosa pequeña que asoma entre las zarzas del pórtico
    const extra = new THREE.InstancedMesh(rosas.geometry, matRosa, 10);
    for (let k = 0; k < 10; k++) { const s = k % 2 ? 1 : -1, sc = .7 + rnd() * .5; m4.compose(new V3(s * (k < 6 ? 2.6 + (rnd() - .5) * .2 : 4.1 + (rnd() - .5) * .5), 1.02 + .8 + rnd() * 2.6, (k < 6 ? 1.42 : 1.5) + rnd() * .05), q.setFromEuler(e.set(1.3, rnd() * 6, 0)), new V3(sc, sc, sc)); extra.setMatrixAt(k, m4); }
    add(extra);
  }
  // pétalos sobre los peldaños
  { const n = 46, pp = new THREE.InstancedMesh(petalo(.09, .06, .35, .01), matRosa, n);
    for (let k = 0; k < n; k++) { const i = rnd() * 6 | 0, y = 1.02 - i * .17 + .012, z = 1.6 + (i + .5) * .42 + (rnd() - .5) * .3, x = (rnd() - .5) * (7 + i * .5);
      m4.compose(new V3(x, y, z), q.setFromEuler(e.set(-Math.PI / 2 + (rnd() - .5) * .4, 0, rnd() * 6.3)), new V3(1, 1, 1).multiplyScalar(.8 + rnd() * .7)); pp.setMatrixAt(k, m4); }
    add(pp); }

  /* ---------- charcos que reflejan la tormenta ---------- */
  for (const [x, z, r, ry] of [[-1.7, 33.2, 1.2, .3], [2.3, 26.4, 1, 1.2], [-2.9, 19.5, 1.4, 2], [1.5, 14.2, .9, .7], [-.6, 9.8, 1.1, 1.6], [3.2, 36.4, .8, 2.4], [-3.7, 27.3, .9, .9], [.9, 21.5, .7, 2.8]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.2, r * 1.5).rotateX(-Math.PI / 2).rotateY(ry), M.charco);
    m.position.set(x, .018, z); m.renderOrder = 1; add(m);
  }

  /* ---------- piedrecillas y cascotes ---------- */
  { const n = MOVIL ? 320 : 640, g = new THREE.IcosahedronGeometry(1, 0), mat = new THREE.MeshStandardMaterial({ color: 0x3a3532, roughness: .95, flatShading: true });
    const pie = new THREE.InstancedMesh(g, mat, n);
    for (let k = 0; k < n; k++) {
      // más densas junto a tumbas, rosas y escalinata; casi ninguna en el centro del camino
      let x = (rnd() - .5) * 20, z = 3 + rnd() * 40;
      if (Math.abs(x) < 1.4 && rnd() < .8) x += Math.sign(x || 1) * 2;
      const sc = (.018 + rnd() * rnd() * .11) * (k < n * .1 ? 2.4 : 1);
      m4.compose(new V3(x, sc * .3, z), q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)), new V3(sc * (1 + rnd()), sc * (.5 + rnd() * .5), sc * (1 + rnd())));
      pie.setMatrixAt(k, m4);
    }
    pie.receiveShadow = true; add(pie);
    // cascotes de piedra labrada caídos junto a las tumbas y al pie de la escalinata
    const cas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.piedra, 46);
    for (let k = 0; k < 46; k++) {
      const lado = rnd() < .5 ? -1 : 1, junto = k < 16, x = junto ? lado * (3.8 + rnd() * 2.2) : lado * (5 + rnd() * 6), z = junto ? 4 + rnd() * 3 : 8 + rnd() * 26;
      const w = .15 + rnd() * .35;
      m4.compose(new V3(x, w * .3, z), q.setFromEuler(e.set((rnd() - .5) * .8, rnd() * 6, (rnd() - .5) * .8)), new V3(w * (1 + rnd()), w * .6, w * (.6 + rnd())));
      cas.setMatrixAt(k, m4);
    }
    cas.castShadow = cas.receiveShadow = true; add(cas); }

  /* ---------- hojas secas sueltas por la plaza ---------- */
  { const n = MOVIL ? 70 : 140, seca = new THREE.InstancedMesh(hojaG, new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: .9, side: THREE.DoubleSide }), n);
    for (let k = 0; k < n; k++) {
      const x = (rnd() - .5) * 18, z = 5 + rnd() * 38, sc = 1.2 + rnd() * 1.4;
      if (Math.abs(x) < 1.2 && z < 30) { m4.makeScale(0, 0, 0); seca.setMatrixAt(k, m4); continue; }   // el camino queda limpio
      m4.compose(new V3(x, .01, z), q.setFromEuler(e.set(-Math.PI / 2 + (rnd() - .5) * .5, 0, rnd() * 6.3)), new V3(sc, sc, sc)); seca.setMatrixAt(k, m4);
    }
    seca.receiveShadow = true; add(seca); }

  /* ---------- pétalos que el viento arrastra por el suelo (CPU: pocos) ---------- */
  const N_VUELO = MOVIL ? 14 : 26, vuelo = new THREE.InstancedMesh(petalo(.09, .06, .35, .01), matRosa, N_VUELO);
  const vuelan = Array.from({ length: N_VUELO }, () => ({ x: (rnd() - .5) * 14, z: 28 + rnd() * 14, v: .25 + rnd() * .45, f: rnd() * 6.3, giro: (rnd() - .5) * 4 }));
  vuelo.frustumCulled = false; add(vuelo);

  /* ---------- animación ---------- */
  let tPrevio = 0;
  return {
    actualizar(t, rm, ventisca = 0) {
      const dt = Math.min(.05, Math.max(0, t - tPrevio)); tPrevio = t;
      const rafaga = (.6 + .4 * Math.sin(t * .37)) * (1 + ventisca * 3.5);   // la ventisca los hace correr
      vuelan.forEach((p, k) => {
        if (!rm) { p.x += p.v * rafaga * dt; p.z += Math.sin(t * .7 + p.f) * .12 * dt; p.f += dt * (2 + p.v * 3); }
        if (p.x > 8) { p.x = -8; p.z = 28 + rnd() * 14; }
        const salto = Math.abs(Math.sin(p.f)) * .22 * rafaga;   // brincos al rodar
        m4.compose(tmpV.set(p.x, .02 + salto, p.z), q.setFromEuler(e.set(-Math.PI / 2 + Math.sin(p.f) * .9, p.f * p.giro * .2, p.f * .5)), uno);
        vuelo.setMatrixAt(k, m4);
      });
      vuelo.instanceMatrix.needsUpdate = true;
      llamas.material.uniforms.uT.value = rm ? 0 : t; goteo.material.uniforms.uT.value = rm ? 0 : t; llamas.material.uniforms.uR.value = ventisca;   // la ventisca agita las llamas
    },
    escalaPuntos(v) { llamas.material.uniforms.uEsc.value = v; goteo.material.uniforms.uEsc.value = v; },
  };
}
