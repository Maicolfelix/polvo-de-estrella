// Cuervos que vuelan en círculos sobre la capilla: una sola malla instanciada (una llamada de dibujo).
// El aleteo va en el sombreador de vértices (las puntas de las alas van con retraso, como las plumas); la CPU solo
// mueve 14 matrices. Se ven desde abajo y ladeados hacia el centro del giro, así que nunca quedan de canto (los
// murciélagos de antes, vistos de perfil, parecían cables).
import * as THREE from 'three';

function cuerpoCuervo() {
  // pico hacia +z, alas a lo largo de x; atributo `ala`: 0 en el cuerpo, ±1 en la punta
  const P = [], A = [];
  const tri = (a, b, c, wa = 0, wb = 0, wc = 0) => { P.push(...a, ...b, ...c); A.push(wa, wb, wc); };
  // cuerpo: rombo alargado (pico, lomo, vientre, cola)
  const pico = [0, 0, .46], cabeza = [0, .05, .3], lomo = [0, .08, 0], vientre = [0, -.07, .02], cola = [0, 0, -.28], l = [-.09, 0, .05], r = [.09, 0, .05];
  for (const [x, y] of [[lomo, l], [lomo, r], [vientre, l], [vientre, r]]) { tri(pico, x, y); tri(cola, x, y); }
  tri(pico, cabeza, l); tri(pico, cabeza, r);
  // cola en abanico
  tri([0, 0, -.22], [-.15, -.01, -.62], [.15, -.01, -.62]);
  // alas: tramo interior y exterior, con dedos (primarias separadas) en la punta
  for (const s of [-1, 1]) {
    const w = x => s * x / .98;
    const a0 = [s * .06, 0, .14], b0 = [s * .06, 0, -.12], a1 = [s * .48, .02, .17], b1 = [s * .48, .02, -.22];
    tri(a0, a1, b0, 0, w(.48), 0); tri(a1, b1, b0, w(.48), w(.48), 0);
    const a2 = [s * .82, .01, .08], b2 = [s * .74, .01, -.2];
    tri(a1, a2, b1, w(.48), w(.82), w(.48)); tri(a2, b2, b1, w(.82), w(.74), w(.48));
    for (let k = 0; k < 4; k++) {   // cuatro primarias abiertas
      const z0 = .06 - k * .07, z1 = z0 - .05;
      tri([s * .78, .01, z0], [s * .78, .01, z1], [s * (.98 + k * .015), .01, (z0 + z1) / 2 - .03], w(.8), w(.8), w(.98));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('ala', new THREE.Float32BufferAttribute(A, 1));
  return g;
}

export function crearCuervos({ centro, cuantos = 14 }) {
  const geo = cuerpoCuervo();
  const fase = new Float32Array(cuantos).map(() => Math.random() * 100);
  geo.setAttribute('fase', new THREE.InstancedBufferAttribute(fase, 1));
  const uT = { value: 0 };
  const mat = new THREE.MeshBasicMaterial({ color: 0x07050a, side: THREE.DoubleSide, fog: true });
  mat.onBeforeCompile = s => {
    s.uniforms.uT = uT;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float ala; attribute float fase; uniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float a = abs(ala);
        // ratos de aleteo y ratos planeando (alas algo alzadas en V)
        float bate = smoothstep(-.3, .5, sin(uT * .32 + fase * 2.1));
        float fl = sin(uT * 7.5 + fase - a * 1.3);
        transformed.y += (fl * .55 * bate + .16 * (1. - bate)) * a * a + fl * .03 * bate;
        transformed.x *= 1. - .12 * bate * max(0., fl) * a;`);
  };
  const malla = new THREE.InstancedMesh(geo, mat, cuantos);
  malla.frustumCulled = false;   // se mueven por todo el cielo; son pocos triángulos
  const aves = Array.from({ length: cuantos }, (_, i) => ({
    r: 6 + Math.random() * 10, h: 7 + Math.random() * 8, v: (.11 + Math.random() * .09) * (i % 4 ? 1 : -1),
    a: Math.random() * Math.PI * 2, dr: Math.random() * 6, esc: 1.1 + Math.random() * .7,
  }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  function actualizar(t, dt) {
    uT.value = t;
    for (let i = 0; i < cuantos; i++) {
      const b = aves[i];
      b.a += b.v * dt;
      const r = b.r + Math.sin(t * .13 + b.dr) * 2.5, y = b.h + Math.sin(t * .21 + b.dr * 2) * 1.6;
      p.set(centro.x + Math.cos(b.a) * r, centro.y + y, centro.z + Math.sin(b.a) * r);
      // mira en la dirección del vuelo y se ladea hacia dentro del giro
      const dir = Math.sign(b.v);
      e.set(Math.cos(t * .21 + b.dr * 2) * .12, -b.a - (dir > 0 ? 0 : Math.PI), -dir * .42, 'YXZ');
      q.setFromEuler(e); s.setScalar(b.esc);
      malla.setMatrixAt(i, m.compose(p, q, s));
    }
    malla.instanceMatrix.needsUpdate = true;
  }
  return { malla, actualizar };
}
