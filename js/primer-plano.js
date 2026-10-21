// Llegada: lo que hay entre el visitante y la capilla, en tres planos.
//   Primer plano: una corona caída, rosas, pétalos, ataduras de hierro y destellos minerales.
//   Plano medio: tumbas y cruces a los lados, la escalinata en el centro.
// Interpretación artística (no es un significado oficial): la corona de quien se creyó dueño del mundo,
// pequeña ante la tormenta; las rosas, los vínculos y su fragilidad; los destellos, el polvo de estrella.
// Todo es estático salvo el centelleo: geometría fusionada o instanciada, pocos materiales.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, V2 = THREE.Vector2;

export function crearPrimerPlano({ add, poner, M, MOVIL }) {
  let semilla = 23;
  const rnd = () => (semilla = semilla * 16807 % 2147483647) / 2147483647;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const fijo = (g, mat, sombra = true) => { const m = new THREE.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; add(m); return m; };

  /* ---------- corona ---------- */
  { const partes = [], gemas = [];
    const perfil = [[.4, 0], [.445, 0], [.455, .03], [.435, .055], [.435, .19], [.455, .215], [.445, .245], [.4, .245], [.395, .12]].map(([x, y]) => new V2(x, y));
    partes.push(new THREE.LatheGeometry(perfil, 40));
    const punta = new THREE.Shape([new V2(-.11, 0), new V2(.11, 0), new V2(.03, .2), new V2(0, .32), new V2(-.03, .2)]);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, alto = k % 2 ? .8 : 1;
      const g = new THREE.ExtrudeGeometry(punta, { depth: .025, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1 });
      g.scale(1, alto, 1).translate(0, .23, .425).rotateY(a); partes.push(g);
      partes.push(new THREE.SphereGeometry(.032, 10, 8).translate(0, .23 + .32 * alto + .02, .44).rotateY(a));
      gemas.push(new THREE.OctahedronGeometry(.04, 0).scale(1, 1.3, .5).translate(0, .12, .458).rotateY(a + Math.PI / 8));
    }
    const corona = new THREE.Group();
    const oro = new THREE.Mesh(mergeGeometries(partes.map(g => g.toNonIndexed()), false), M.oro); oro.castShadow = true;
    const rubi = new THREE.Mesh(mergeGeometries(gemas), new THREE.MeshStandardMaterial({ color: 0x6a0610, roughness: .12, metalness: .3, emissive: 0x3a0306, emissiveIntensity: .6, flatShading: true }));
    corona.add(oro, rubi);
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
    for (let k = 0; k < 20; k++) {
      const f = k / 19, a0 = k * 2.399, span = 1.9 + f * 1.1;
      const r0 = .006 + f * .036, alto = .045 + f * .045, abre = .12 + f * .65, base = -f * .03;
      const g = new THREE.PlaneGeometry(1, 1, 8, 6), p = g.attributes.position;
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
  const matRosa = new THREE.MeshStandardMaterial({ color: 0x6e0a12, roughness: .5, side: THREE.DoubleSide, emissive: 0x1c0204, emissiveIntensity: .7 });
  const matHoja = new THREE.MeshStandardMaterial({ color: 0x0f150c, roughness: .6, side: THREE.DoubleSide });
  const matTallo = new THREE.MeshStandardMaterial({ color: 0x10120c, roughness: .8 });
  const ARBUSTOS = [   // [x, z, nº de rosas, escala]
    [-2.9, 38.2, 3, 2], [-5.4, 35.2, 4, 2.1], [3.2, 37.8, 3, 1.9], [6.1, 33.5, 3, 2], [-1.4, 36.6, 3, 1.5], [1.05, 39.4, 2, 1.3],
    [-4.2, 25, 2, 1.3], [4.6, 23.5, 2, 1.3], [-6.4, 9.2, 3, 1.5], [6.8, 8.4, 3, 1.5], [-7.6, 15, 2, 1.4], [8, 14.5, 2, 1.4],
  ];
  const nRosas = ARBUSTOS.reduce((a, b) => a + b[2], 0);
  const rosas = new THREE.InstancedMesh(cabeza(), matRosa, nRosas);
  const hojaG = (() => { const g = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, 0).quadraticCurveTo(.05, .06, 0, .15).quadraticCurveTo(-.05, .06, 0, 0), 4); g.rotateX(-.6); return g; })();
  const nHojas = nRosas * 7, hojas = new THREE.InstancedMesh(hojaG, matHoja, nHojas);
  const tallos = [], espinas = [];
  let kr = 0, kh = 0;
  for (const [x, z, n, esc] of ARBUSTOS) for (let j = 0; j < n; j++) {
    const alto = (.16 + rnd() * .3) * esc, base = new V3(x + (rnd() - .5) * .5 * esc, 0, z + (rnd() - .5) * .4 * esc);
    const tope = base.clone().add(new V3((rnd() - .5) * .3, alto, (rnd() - .5) * .3));
    const curva = new THREE.QuadraticBezierCurve3(base, base.clone().lerp(tope, .5).add(new V3((rnd() - .5) * .25, 0, (rnd() - .5) * .25)), tope);
    tallos.push(new THREE.TubeGeometry(curva, 8, .008 * esc, 4, false));
    for (let k = 0; k < 4; k++) { const p = curva.getPoint(.2 + k * .18); espinas.push(new THREE.ConeGeometry(.006 * esc, .03 * esc, 4).rotateZ(Math.PI / 2 * (k % 2 ? 1 : -1)).translate(p.x, p.y, p.z)); }
    const sc = (1.35 + rnd() * .5) * esc;   // cabezas grandes y llenas, como en la referencia
    m4.compose(tope, q.setFromEuler(e.set((rnd() - .5) * .7, rnd() * 6, (rnd() - .5) * .7)), new V3(sc, sc, sc)); rosas.setMatrixAt(kr++, m4);
    for (let k = 0; k < 7; k++) {
      const p = curva.getPoint(.25 + rnd() * .65), s2 = esc * (.9 + rnd() * .6);
      m4.compose(p, q.setFromEuler(e.set(rnd() * .6, rnd() * 6.3, rnd() * .6)), new V3(s2, s2, s2)); hojas.setMatrixAt(kh++, m4);
    }
  }
  rosas.castShadow = true; hojas.castShadow = true; add(rosas, hojas);
  fijo(mergeGeometries([...tallos, ...espinas].map(g => g.index ? g.toNonIndexed() : g)), matTallo);

  // pétalos caídos alrededor de la corona y por la plaza
  { const n = MOVIL ? 40 : 70, pet = new THREE.InstancedMesh(petalo(.09, .06, .35, .01), matRosa, n);
    for (let k = 0; k < n; k++) {
      const cerca = k < n * .45, x = cerca ? (rnd() - .5) * 3.2 : (rnd() - .5) * 9, z = cerca ? 35.5 + rnd() * 3.5 : 18 + rnd() * 18;
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
    const vid = (a, b, n) => {
      const pts = [];
      for (let k = 0; k <= n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.x += Math.sin(t * 9 + a.x) * .35; p.z += Math.cos(t * 7 + a.z) * .35; p.y = .02 + Math.abs(Math.sin(t * 5)) * .05; pts.push(p); }
      const c = new THREE.CatmullRomCurve3(pts); zarza.push(new THREE.TubeGeometry(c, n * 4, .012, 4, false));
      for (let k = 0; k < n * 3; k++) { const t = k / (n * 3), p = c.getPoint(t); pinchos.push(new THREE.ConeGeometry(.007, .045, 4).rotateZ(Math.PI / 2).rotateY(rnd() * 6.3).translate(p.x, p.y + .01, p.z)); }
    };
    vid(new V3(-3.1, 0, 38.6), new V3(-.9, 0, 38.9), 6); vid(new V3(3.4, 0, 38.2), new V3(1.4, 0, 36.3), 6);
    vid(new V3(-5.6, 0, 35.2), new V3(-3, 0, 31), 7); vid(new V3(6.1, 0, 33.5), new V3(3.2, 0, 30.2), 7);
    vid(new V3(-6.4, 0, 9.2), new V3(-4.4, 0, 6.6), 5); vid(new V3(6.8, 0, 8.4), new V3(4.5, 0, 6.4), 5);
    fijo(mergeGeometries(hierro), M.hierro);
    fijo(mergeGeometries([...zarza, ...pinchos.map(g => g.toNonIndexed())].map(g => g.index ? g.toNonIndexed() : g)), matTallo); }

  /* ---------- destellos minerales ---------- */
  const DIAMANTES = [[1.25, 38.7, .11], [-.95, 39.7, .09], [2.6, 35.2, .13], [-2.3, 31.4, .1], [.8, 28.4, .08], [-4.4, 40.2, .1], [4.7, 36.6, .12], [-1.6, 12.3, .09], [2.3, 10.6, .1], [-.4, 33.6, .07]];
  const talla = new THREE.LatheGeometry([new V2(0, -.9), new V2(1, 0), new V2(1, .1), new V2(.58, .45), new V2(0, .45)], 8);
  const matDiamante = new THREE.MeshStandardMaterial({ color: 0xeef4ff, metalness: 1, roughness: .04, envMapIntensity: 3, flatShading: true, emissive: 0x3a4a66, emissiveIntensity: .45 });
  const diam = new THREE.InstancedMesh(talla, matDiamante, DIAMANTES.length);
  const brillos = [];
  DIAMANTES.forEach(([x, z, s], k) => {
    const p = new V3(x, s * .55, z);
    m4.compose(p, q.setFromEuler(e.set((rnd() - .5) * 1.4, rnd() * 6, (rnd() - .5) * 1.4)), new V3(s, s, s)); diam.setMatrixAt(k, m4);
    brillos.push(p.clone().add(new V3(0, s * .4, 0)));
  });
  diam.castShadow = true; add(diam);
  // centelleo: una estrella de cuatro puntas por diamante, aditiva, que parpadea a destiempo
  const estrellaTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(220,235,255,.5)'); g.addColorStop(1, 'rgba(200,220,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(31, 2, 2, 60); x.fillRect(2, 31, 60, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const gb = new THREE.BufferGeometry().setFromPoints(brillos);
  const fase = brillos.map(() => rnd() * 10);
  gb.setAttribute('a', new THREE.BufferAttribute(new Float32Array(brillos.length), 1));
  const puntos = new THREE.Points(gb, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: estrellaTex }, uEsc: { value: 1 } },
    vertexShader: 'attribute float a; varying float vA; uniform float uEsc; void main(){ vA = a; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = uEsc * (12. + 26. * a) / -mv.z * 6.; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = texture2D(uMap, gl_PointCoord) * vA; }',
  }));
  puntos.renderOrder = 3; add(puntos);

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

  /* ---------- animación: solo el centelleo ---------- */
  const a = gb.attributes.a;
  return {
    actualizar(t, rm) {
      for (let k = 0; k < fase.length; k++) {
        const v = rm ? .5 : Math.max(0, Math.sin(t * (1.1 + k % 3 * .4) + fase[k])) ** 6;
        a.array[k] = .25 + v * .95;
      }
      a.needsUpdate = true;
    },
    escalaPuntos(v) { puntos.material.uniforms.uEsc.value = v; },
  };
}
