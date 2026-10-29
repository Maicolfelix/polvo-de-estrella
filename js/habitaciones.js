// Fondo vivo de cada habitación: la imagen del artista (img/hab/NN.webp) animada por zonas con un sombreador.
// Cada zona anima lo que hay en ese sitio de la imagen (el agua ondula, el cielo se mueve, las velas titilan,
// la cortina se mece…); las velas y los brillos laten además con los graves de la canción.
// Zonas: [tipo, x0, y0, x1, y1, fuerza] en fracciones de la imagen (x a la derecha, y hacia abajo).
const AGUA = 1, TELA = 2, LLAMA = 3, CIELO = 4, MAR = 5, BRILLO = 6, LLUVIA = 7, CHISPAS = 8, ESTRELLAS = 9, RAYO = 10, NIEBLA = 11, PARED = 12, PASO = 13, POLVO = 14;
const ZONAS = [
  // 01 · la habitación inundada: el mar tras la ventana, la tela roja al viento, el agua alrededor de ella
  [[CIELO, .65, 0, .85, .24, 1], [RAYO, .7, 0, .85, .26, 1], [MAR, .64, .22, .86, .34, 1], [TELA, .44, .24, .93, .46, 1],
   [AGUA, .3, .44, 1, 1, 1.2], [NIEBLA, 0, .36, .65, .62, 1]],
  // 02 · el espejo y la luna: nubes, luna que respira, camino de luz en el mar, cortina, lluvia en el cristal
  [[CIELO, .85, .17, .96, .4, 1], [BRILLO, .87, .02, .95, .18, 1.2], [MAR, .85, .38, .97, .6, 1.2], [TELA, .92, 0, 1, .68, 1],
   [LLAMA, .585, .42, .635, .52, 1.2], [LLUVIA, .79, 0, .86, .62, 1], [LLUVIA, .58, .05, .75, .75, .5], [AGUA, .5, .8, 1, 1, .8]],
  // 03 · las cartas quemadas: velas, brasas que suben, el mar por la ventana, el charco
  [[LLAMA, .8, .24, .87, .34, 1.3], [LLAMA, .89, .34, 1, .56, 1.1], [CHISPAS, .76, .6, .9, .86, 1], [LLAMA, .77, .7, .9, .84, 1],
   [CIELO, .39, 0, .49, .26, 1], [MAR, .39, .26, .49, .39, 1], [BRILLO, .65, .18, .73, .32, .9], [AGUA, .37, .58, .47, 1, 1], [TELA, .45, .62, .54, 1, .6]],
  // 04 · fin del verano: nubes, sol, mar, gotas que caen de la ventana y el charco que las recibe
  [[CIELO, .71, 0, .91, .31, 1], [BRILLO, .8, .28, .92, .37, 1.2], [MAR, .69, .37, .91, .6, 1.1], [LLUVIA, .6, 0, .73, .8, 1.2],
   [AGUA, .52, .76, .92, 1, 1.3], [TELA, .34, 0, .5, .72, .6]],
  // 05 · la rosa: la vela invisible hace temblar la sombra de la rosa en la pared; luna y mar por la ventana
  [[PARED, .44, 0, .72, .72, 1], [BRILLO, .87, .08, .94, .17, 1.2], [MAR, .86, .37, 1, .55, 1], [LLAMA, .95, .52, 1, .72, 1.2],
   [LLAMA, .66, .58, .78, .7, .5], [CIELO, .86, 0, 1, .3, .7]],
  // 06 · la reja de luz: cielo, sol, rayo de polvo, velas, la luz en el suelo que cambia con las nubes, cortina
  [[CIELO, .71, 0, .88, .26, 1], [BRILLO, .79, .21, .85, .29, 1.2], [POLVO, .54, 0, .7, .62, 1], [LLAMA, .42, .25, .51, .34, 1.3],
   [PASO, .48, .68, .87, .97, 1], [TELA, .85, 0, 1, .8, .8]],
  // 07 · la puerta abierta: el fuego del pasillo, la tormenta y su rayo en la ventana, el suelo mojado, la tela
  [[LLAMA, .67, .1, .81, .74, 1], [CIELO, .93, .04, 1, .56, 1], [RAYO, .92, .02, 1, .6, 1.2], [AGUA, .58, .74, .82, 1, 1],
   [TELA, .66, .68, 1, 1, .8], [NIEBLA, .45, .58, 1, .82, .8]],
  // 08 · el atardecer: nubes, sol, mar con oleaje, vasos que brillan, el reflejo dorado en el suelo, cortinas
  [[CIELO, .66, 0, .96, .31, 1], [BRILLO, .77, .24, .83, .34, 1.4], [MAR, .66, .32, .96, .49, 1.3], [BRILLO, .7, .45, .75, .54, .8],
   [BRILLO, .83, .45, .88, .54, .8], [AGUA, .58, .64, .96, 1, 1.3], [TELA, .47, 0, .57, .62, .7], [TELA, .94, 0, 1, .72, .7]],
  // 09 · el libro: estrellas que titilan, polvo mágico que sube del libro, luna y su reflejo, la brújula
  [[ESTRELLAS, .64, 0, .92, .44, 1], [CHISPAS, .6, .08, .76, .64, 1.3], [BRILLO, .84, .29, .89, .35, 1.3], [MAR, .83, .42, .9, .62, 1.2],
   [CIELO, .74, .14, .96, .4, .8], [BRILLO, .5, .58, .86, .79, .7], [BRILLO, .83, .73, .89, .84, 1.2], [TELA, .89, 0, 1, 1, .7]],
];
// punto horizontal (0..1) que sigue a la vista cuando la pantalla es más estrecha que la imagen (teléfono de pie)
const FOCO = [.72, .76, .8, .76, .66, .74, .72, .78, .72];
const N = 10;

const VERT = 'attribute vec2 p; varying vec2 vS; void main(){ vS = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
const FRAG = `precision highp float;
varying vec2 vS;
uniform sampler2D uImg; uniform vec4 uCover; uniform float uT, uPulso, uRayo, uN;
uniform vec4 uR[${N}]; uniform vec2 uP[${N}];
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * ruido(p); p *= 2.03; a *= .5; } return v; }
float zona(vec2 q, vec4 r){ vec2 f = max((r.zw - r.xy) * .2, vec2(.012));
  vec2 a = smoothstep(r.xy, r.xy + f, q) * (1. - smoothstep(r.zw - f, r.zw, q)); return a.x * a.y; }
// puntos de luz que suben por una rejilla (brasas, polvo mágico, motas en el rayo de luz)
float subir(vec2 q, float dens, float vel, float t, float tam){
  vec2 g = vec2(q.x * dens * 1.78, q.y * dens + t * vel); vec2 id = floor(g), f = fract(g) - .5;
  float r = h1(id); if (r < .62) return 0.;
  vec2 o = vec2(h1(id + 3.1), h1(id + 7.7)) - .5; o.x += sin(t * 1.3 + r * 20.) * .18;
  float d = length(f - o * .7); return smoothstep(tam, 0., d) * (.5 + .5 * sin(t * (2. + r * 4.) + r * 40.));
}
void main(){
  vec2 q = vS * uCover.xy + uCover.zw; q.y = 1. - q.y;   // q: coordenadas de la imagen, y hacia abajo
  float t = uT; vec2 d = vec2(0.); float mul = 1., brillo = 0.; vec3 suma = vec3(0.);
  for (int i = 0; i < ${N}; i++) {
    if (float(i) >= uN) break;
    vec4 r = uR[i]; float tipo = uP[i].x, k = uP[i].y, m = zona(q, r) * k;
    if (m <= 0.) continue;
    float s = float(i) * 1.7;
    if (tipo == 1.) {          // agua: reflejo que ondula y destella
      d += m * vec2(sin(q.y * 150. + t * 1.7 + sin(q.x * 26. + t * .7) * 2.5) * .0016, sin(q.x * 70. - t * 1.3 + q.y * 40.) * .0022);
      brillo += m * pow(ruido(q * vec2(90., 260.) + vec2(t * .3, -t * .9)), 5.) * 1.6;
    } else if (tipo == 2.) {   // tela al viento
      float fa = q.x * 11. + q.y * 4. - t * 1.2 + s;
      d += m * vec2(sin(q.y * 7. + t * .9 + s) * .0035, sin(fa) * .005);
      mul *= 1. + m * cos(fa) * .1;
    } else if (tipo == 3.) {   // llama: titila (y late con la música)
      float fl = ruido(vec2(t * 9., s)) * .6 + ruido(vec2(t * 23., s + 4.)) * .4;
      mul *= 1. + m * ((fl - .45) * .9 + uPulso * .45);
      d.x += m * sin(q.y * 500. + t * 16.) * .0006;
      suma += m * fl * vec3(1., .5, .2) * .035;
    } else if (tipo == 4.) {   // cielo: las nubes se deforman y avanzan
      vec2 w = vec2(fbm(q * 7. + vec2(t * .05, 0.)), fbm(q * 7. + vec2(3., t * .04))) - .5;
      d += m * w * .014;
      mul *= 1. + m * (fbm(q * 4. + vec2(t * .035, t * .01)) - .5) * .45;
    } else if (tipo == 5.) {   // mar: oleaje y destellos
      d += m * vec2(sin(q.y * 320. - t * 2.4 + sin(q.x * 50.) * 2.) * .0011, sin(q.x * 90. + t * 1.6) * .0018);
      brillo += m * pow(ruido(q * vec2(160., 420.) + vec2(t * .7, 0.)), 6.) * 2.2;
    } else if (tipo == 6.) {   // brillo que respira (luna, sol, vidrio)
      mul *= 1. + m * (.13 * sin(t * 1.1 + s * 3.) + .07 * sin(t * 2.9 + s) + uPulso * .3);
    } else if (tipo == 7.) {   // gotas que caen
      vec2 g = vec2(q.x * 90., q.y * 5. - t * 1.6); float col = floor(g.x), hc = h1(vec2(col, s));
      float c = fract(g.y + hc * 7.), fx = abs(fract(g.x) - .5) * 2.;
      float gota = step(.7, hc) * smoothstep(.0, .03, c) * smoothstep(.16, .03, c) * pow(1. - fx, 3.);
      suma += m * gota * vec3(.85, .88, .95) * .4;
    } else if (tipo == 8.) {   // brasas o polvo mágico que sube
      float p1 = subir(q, 34., 1.1, t, .16), p2 = subir(q + .37, 60., 1.7, t, .2);
      suma += m * (p1 + p2 * .6) * mix(vec3(1., .45, .15), vec3(1., .86, .6), step(.5, fract(s * .37))) * .9;
    } else if (tipo == 9.) {   // estrellas que titilan
      brillo += m * (.5 + .5 * sin(t * 3. + h1(floor(q * 260.)) * 60.)) * .9;
    } else if (tipo == 10.) {  // relámpago
      mul *= 1. + m * uRayo * 1.6; suma += m * uRayo * vec3(.55, .6, .75) * .12;
    } else if (tipo == 11.) {  // niebla que pasa
      suma += m * fbm(q * vec2(3., 9.) + vec2(t * .04, 0.)) * vec3(.42, .36, .4) * .16;
    } else if (tipo == 12.) {  // pared con la sombra de la rosa: la luz de la vela tiembla y la sombra se mece
      float fl = ruido(vec2(t * 6., s)) * .7 + ruido(vec2(t * 17., s)) * .3;
      d.x += m * (sin(t * .9) * .003 + (fl - .5) * .002) * (1. - q.y);
      mul *= 1. + m * ((fl - .5) * .5 + uPulso * .25);
    } else if (tipo == 13.) {  // luz en el suelo: sube y baja al pasar las nubes
      mul *= 1. + m * (fbm(q * 2.5 + vec2(t * .06, t * .02)) - .5) * .9;
    } else if (tipo == 14.) {  // rayo de luz con motas suspendidas
      mul *= 1. + m * (fbm(q * vec2(2., 6.) + vec2(0., t * .05)) - .5) * .35;
      suma += m * subir(q, 70., .25, t, .14) * vec3(1., .85, .7) * .55;
    }
  }
  vec3 c = texture2D(uImg, vec2(q.x + d.x, 1. - (q.y + d.y))).rgb;
  float lum = dot(c, vec3(.299, .587, .114));
  c = c * mul + c * brillo * smoothstep(.15, .7, lum) + suma;
  c += (h1(vS * 913. + fract(t) * 17.) - .5) * .018;   // grano fino: la imagen nunca queda quieta del todo
  gl_FragColor = vec4(c, 1.);
}`;

export function crearFondo(lienzo, rm) {
  const gl = lienzo.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' });
  let actual = -1, activo = false, t = 0, rayo = 0, proximoRayo = 3, pulso = 0, aspecto = 1672 / 941;
  const ruta = i => `img/hab/${String(i + 1).padStart(2, '0')}.webp`;
  const medir = () => {
    const k = Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.25 : 1);
    lienzo.width = Math.round(innerWidth * k); lienzo.height = Math.round(innerHeight * k);
    if (gl) gl.viewport(0, 0, lienzo.width, lienzo.height);
  };
  addEventListener('resize', medir); medir();
  // sin WebGL (o mientras sube la textura): la imagen quieta como fondo
  const fondoCSS = i => { lienzo.style.background = `#050405 url(${ruta(i)}) ${FOCO[i] * 100}% 50% / cover no-repeat`; };
  if (!gl) return { poner(i) { activo = true; fondoCSS(i); }, parar() { activo = false; }, dibujar() {} };

  const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uCover = U('uCover'), uT = U('uT'), uPulso = U('uPulso'), uRayo = U('uRayo'), uN = U('uN'), uR = U('uR'), uP = U('uP');
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  for (const [p, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, p, v);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([5, 4, 5]));
  const imagenes = [];
  const cargar = i => imagenes[i] ||= Object.assign(new Image(), { src: ruta(i), decoding: 'async' });
  let texLista = false;
  function subirImagen(i) {
    const im = cargar(i);
    texLista = false; fondoCSS(i);   // mientras la textura sube, la imagen quieta (nunca un hueco negro)
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const listo = () => {
      if (actual !== i) return;
      aspecto = im.naturalWidth / im.naturalHeight;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      texLista = true;
    };
    if (im.complete && im.naturalWidth) listo(); else im.addEventListener('load', listo, { once: true });
  }
  // las imágenes se piden al terminar la carga, una tras otra: entrar en cualquier puerta ya no espera a la red
  addEventListener('load', () => setTimeout(() => ZONAS.forEach((_, i) => setTimeout(() => cargar(i), i * 400)), 2500), { once: true });

  function zonas(i) {
    const R = new Float32Array(N * 4), P = new Float32Array(N * 2);
    ZONAS[i].forEach(([tipo, x0, y0, x1, y1, k], j) => { R.set([x0, y0, x1, y1], j * 4); P.set([tipo, k], j * 2); });
    gl.uniform4fv(uR, R); gl.uniform2fv(uP, P); gl.uniform1f(uN, ZONAS[i].length);
  }
  return {
    poner(i) {
      activo = true;
      if (i === actual) return;
      actual = i; zonas(i); subirImagen(i);
    },
    parar() { activo = false; },
    dibujar(dt, golpe) {
      if (!activo || actual < 0 || !texLista) return;
      if (lienzo.style.background) lienzo.style.background = '';
      if (!rm) t += dt;
      pulso += (golpe - pulso) * Math.min(1, dt * (golpe > pulso ? 16 : 3.5));   // sube con el golpe, cae despacio
      // relámpagos: cada 6–14 s, un destello doble que se apaga
      proximoRayo -= dt;
      if (proximoRayo <= 0 && !rm) { rayo = 1; proximoRayo = 6 + Math.random() * 8; setTimeout(() => { rayo = .8; }, 140); }
      rayo = Math.max(0, rayo - dt * 3.2);
      // encuadre «cover» con el foco de la habitación y una respiración lenta de cámara
      const ap = lienzo.width / lienzo.height, z = rm ? 1 : 1.035 + .025 * Math.sin(t * .11);
      let sx = 1 / z, sy = 1 / z;
      if (ap < aspecto) sx *= ap / aspecto; else sy *= aspecto / ap;
      const fx = FOCO[actual] + (rm ? 0 : Math.sin(t * .07) * .01), fy = .5 + (rm ? 0 : Math.sin(t * .09) * .008);
      gl.uniform4f(uCover, sx, sy, Math.min(1 - sx, Math.max(0, fx - sx / 2)), Math.min(1 - sy, Math.max(0, fy - sy / 2)));
      gl.uniform1f(uT, t); gl.uniform1f(uPulso, rm ? 0 : pulso); gl.uniform1f(uRayo, rayo);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
