// Atmósferas de las nueve habitaciones. Cada una se dibuja entera (fondo incluido) para poder fundirse
// con la siguiente; `p` es el progreso de la canción (0..1) y hace que la escena cambie con ella.
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
function radial(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function vertical(g, w, h, stops) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
const mezclar = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lado = w => w > 900 ? .74 : .5; // en pantallas anchas el foco de luz se aparta de la columna de texto

export const ATMOSFERAS = [
  // 01 · el sol se esfuma sobre un mar celeste; las ataduras se tensan con la canción
  { iniciar: () => ({}), dibujar(g, w, h, t, p) {
    const hy = h * .66;
    vertical(g, w, h, [[0, '#03060a'], [.45, '#0a1520'], [.66, '#23435a'], [1, '#03060a']]);
    const sx = w * lado(w), sy = hy - h * .05 + p * h * .14, r = Math.min(w, h) * .26;
    g.globalAlpha = 1 - p * .9;
    radial(g, sx, sy, r, [[0, 'rgba(255,236,196,.95)'], [.16, 'rgba(255,214,150,.55)'], [.45, 'rgba(255,170,110,.12)'], [1, 'rgba(255,160,100,0)']]);
    g.globalAlpha = 1;
    const mar = g.createLinearGradient(0, hy, 0, h);
    mar.addColorStop(0, 'rgba(110,172,206,.75)'); mar.addColorStop(.12, 'rgba(48,98,130,.9)'); mar.addColorStop(.6, '#081621'); mar.addColorStop(1, '#03060a');
    g.fillStyle = mar; g.fillRect(0, hy, w, h - hy);
    g.globalAlpha = (1 - p) * .55;
    for (let k = 0; k < 26; k++) { const y = hy + 4 + k * k * .55, a = (Math.sin(t * 1.3 + k * 1.7) * .5 + .5); g.fillStyle = `rgba(255,220,170,${a * .5})`; const lw = (60 - k * 1.6) * (.6 + a * .5); g.fillRect(sx - lw / 2 + Math.sin(t + k) * 4, y, lw, 1.2); }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(200,232,246,.55)'; g.fillRect(0, hy, w, 1);
    g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const y = h * (.14 + k * .09), amp = h * .045 * (1 - p * .85) * (k % 2 ? -1 : 1), osc = Math.sin(t * .35 + k) * h * .008;
      g.strokeStyle = k === 2 || k === 5 ? 'rgba(201,162,74,.38)' : 'rgba(236,230,220,.14)';
      g.beginPath(); g.moveTo(-20, y + osc); g.bezierCurveTo(w * .3, y - amp + osc, w * .7, y + amp - osc, w + 20, y - osc); g.stroke();
    }
  } },
  // 02 · la luna a un lado, el sol al otro; las nubes cubren el sol ("se está nublando mi corazón")
  { iniciar: () => ({ nubes: Array.from({ length: 14 }, (_, i) => ({ x: Math.random(), y: rnd(.42, .78), r: rnd(.12, .28), v: rnd(.004, .012), u: i / 14 })) }),
    dibujar(g, w, h, t, p, s) {
    vertical(g, w, h, [[0, '#06050f'], [.55, '#151026'], [.78, '#2a1720'], [1, '#07050a']]);
    const m = Math.min(w, h);
    radial(g, w * .2, h * .24, m * .22, [[0, 'rgba(210,220,255,.35)'], [1, 'rgba(160,170,220,0)']]);
    g.fillStyle = 'rgba(232,236,250,.92)'; g.beginPath(); g.arc(w * .2, h * .24, m * .045, 0, TAU); g.fill();
    g.fillStyle = 'rgba(6,5,15,.9)'; g.beginPath(); g.arc(w * .2 + m * .018, h * .24 - m * .008, m * .04, 0, TAU); g.fill();
    const sx = w * (w > 900 ? .78 : .62), sy = h * .64;
    radial(g, sx, sy, m * .3, [[0, 'rgba(255,214,170,.85)'], [.2, 'rgba(255,170,120,.35)'], [1, 'rgba(255,140,100,0)']]);
    g.fillStyle = 'rgba(179,36,42,.55)'; g.fillRect(0, h * .74, w, 1.2);
    radial(g, w * .5, h * .74, w * .45, [[0, 'rgba(179,36,42,.16)'], [1, 'rgba(179,36,42,0)']]);
    const cubre = .2 + p * .8;
    for (const n of s.nubes) {
      if (n.u > cubre) continue;
      n.x -= n.v * .016; if (n.x < -.3) n.x = 1.3;
      const cx = n.x * w, cy = n.y * h, r = n.r * m * 1.6;
      g.globalAlpha = .55 * Math.min(1, (cubre - n.u) * 6);
      radial(g, cx, cy, r, [[0, 'rgba(46,38,58,.95)'], [.6, 'rgba(30,24,40,.5)'], [1, 'rgba(20,16,28,0)']]);
    }
    g.globalAlpha = 1;
  } },
  // 03 · brasas: las cartas que se queman, rabia contenida en rojo
  { iniciar: () => ({ e: Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(.03, .1), r: rnd(.6, 2.6), f: rnd(0, TAU) })), c: Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(.01, .03), r: rnd(1, 3) })) }),
    dibujar(g, w, h, t, p, s) {
    vertical(g, w, h, [[0, '#050102'], [.6, '#1a0405'], [1, '#3c0907']]);
    radial(g, w * .5, h * 1.05, Math.max(w, h) * .7, [[0, `rgba(210,60,30,${.42 + .08 * Math.sin(t * .9)})`], [.5, 'rgba(120,20,15,.18)'], [1, 'rgba(60,8,8,0)']]);
    g.globalCompositeOperation = 'lighter';
    for (const e of s.e) {
      e.y -= e.v * .016 * (1 + p); e.f += .05; if (e.y < -.05) { e.y = 1.05; e.x = Math.random(); }
      const x = e.x * w + Math.sin(e.f) * 14, y = e.y * h, a = (.4 + .6 * Math.abs(Math.sin(e.f * .7))) * Math.min(1, e.y * 1.4);
      radial(g, x, y, e.r * 5, [[0, `rgba(255,170,90,${a})`], [.3, `rgba(255,80,40,${a * .4})`], [1, 'rgba(255,40,20,0)']]);
    }
    g.globalCompositeOperation = 'source-over';
    for (const c of s.c) { c.y += c.v * .016; if (c.y > 1.05) { c.y = -.05; c.x = Math.random(); } g.fillStyle = 'rgba(120,110,110,.35)'; g.fillRect(c.x * w + Math.sin(t + c.y * 9) * 20, c.y * h, c.r, c.r); }
    const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  } },
  // 04 · el verano se apaga en lluvia de diciembre, gotas sobre el cristal
  { iniciar: () => ({ gotas: [], l: Array.from({ length: 320 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(.6, 1.2), k: Math.random() })) }),
    dibujar(g, w, h, t, p, s) {
    const top = mezclar([58, 30, 16], [5, 8, 13], p), mid = mezclar([200, 120, 60], [26, 42, 56], p), bot = mezclar([40, 18, 10], [3, 5, 8], p);
    vertical(g, w, h, [[0, rgb(top)], [.62, rgb(mid)], [1, rgb(bot)]]);
    radial(g, w * lado(w), h * .6, Math.min(w, h) * .45, [[0, `rgba(255,200,140,${.7 * (1 - p)})`], [1, 'rgba(255,160,100,0)']]);
    const lluvia = Math.max(0, p - .08) / .92;
    g.strokeStyle = `rgba(205,220,235,${.18 + .32 * lluvia})`; g.lineWidth = 1.3;
    g.beginPath();
    for (const r of s.l) {
      if (r.k > lluvia) continue;
      r.y += r.v * .016 * 1.4; if (r.y > 1) { r.y = 0; r.x = Math.random(); }
      const x = r.x * w, y = r.y * h; g.moveTo(x, y); g.lineTo(x - 6, y + 34);
    }
    g.stroke();
    if (s.gotas.length < 140 * lluvia && Math.random() < .5) s.gotas.push({ x: Math.random() * w, y: Math.random() * h, r: rnd(2, 6), v: rnd(0, 8) });
    for (const d of s.gotas) {
      d.y += d.v * .016 * (d.r > 4.5 ? 3 : .2);
      radial(g, d.x, d.y, d.r * 1.6, [[0, 'rgba(0,0,0,0)'], [.55, 'rgba(255,255,255,.04)'], [.8, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(d.x - d.r * .35, d.y - d.r * .45, 1.4, 1.4);
    }
    s.gotas = s.gotas.filter(d => d.y < h + 10);
  } },
  // 05 · TODOLOLO: la habitación más abierta y cálida; luz que flota como una invitación
  { iniciar: () => ({ b: Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(.02, .09), v: rnd(.004, .014), a: rnd(.05, .16), f: rnd(0, TAU), c: Math.random() < .5 })) }),
    dibujar(g, w, h, t, p, s) {
    vertical(g, w, h, [[0, '#1e0e0b'], [.5, '#4a2418'], [1, '#a3593a']]);
    radial(g, w * .15, -h * .1, Math.max(w, h) * .9, [[0, 'rgba(255,214,170,.35)'], [1, 'rgba(255,190,140,0)']]);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a = .045 + .02 * Math.sin(t * .3 + k);
      g.fillStyle = `rgba(255,220,180,${a})`; g.beginPath();
      g.moveTo(w * (.05 + k * .12), 0); g.lineTo(w * (.12 + k * .12), 0); g.lineTo(w * (.6 + k * .2), h); g.lineTo(w * (.4 + k * .2), h); g.fill();
    }
    const m = Math.min(w, h);
    for (const b of s.b) {
      b.y -= b.v * .016; b.f += .01; if (b.y < -.15) { b.y = 1.15; b.x = Math.random(); }
      const r = b.r * m * (1 + .08 * Math.sin(b.f * 3));
      radial(g, b.x * w + Math.sin(b.f) * 20, b.y * h, r, [[0, b.c ? `rgba(255,205,140,${b.a})` : `rgba(255,170,160,${b.a})`], [.7, b.c ? `rgba(255,205,140,${b.a * .6})` : `rgba(255,170,160,${b.a * .6})`], [1, 'rgba(255,200,150,0)']]);
    }
    g.globalCompositeOperation = 'source-over';
  } },
  // 06 · la jaula de oro: barrotes de luz que convergen arriba y se derriten con la canción
  { iniciar: () => ({}), dibujar(g, w, h, t, p) {
    vertical(g, w, h, [[0, '#090706'], [.6, '#18110a'], [1, '#0a0705']]);
    radial(g, w * (.4 + .1 * Math.sin(t * .1)), h * .45, Math.max(w, h) * .6, [[0, 'rgba(190,150,220,.10)'], [1, 'rgba(120,90,160,0)']]);
    const cx = w / 2, n = 15, top = h * .06;
    g.lineWidth = 1.6; g.shadowColor = 'rgba(226,181,83,.9)'; g.shadowBlur = 14;
    for (let i = 0; i < n; i++) {
      const fx = (i + .5) / n, x0 = fx * w * 1.1 - w * .05;
      g.strokeStyle = `rgba(226,181,83,${.35 + .25 * Math.sin(t * .6 + i)})`;
      g.beginPath();
      for (let k = 0; k <= 40; k++) {
        const v = k / 40, y = top + v * (h - top);
        const conv = 1 - Math.pow(1 - v, 3) * .8;           // los barrotes se juntan arriba (cúpula)
        let x = cx + (x0 - cx) * conv;
        x += Math.sin(v * 7 + t * .5 + i) * p * 22 * v;      // ondulan
        const caida = Math.pow(v, 4) * p * h * .08;          // y se derriten hacia abajo
        k ? g.lineTo(x, y + caida) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(226,181,83,.45)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(cx, h * .985, w * .58, h * .03, 0, 0, TAU); g.stroke();
    const bruma = g.createLinearGradient(0, 0, 0, h); bruma.addColorStop(0, 'rgba(10,7,5,.4)'); bruma.addColorStop(.5, 'rgba(10,7,5,0)'); bruma.addColorStop(1, 'rgba(10,7,5,.5)');
    g.fillStyle = bruma; g.fillRect(0, 0, w, h);
  } },
  // 07 · una puerta que se abre poco a poco y vuelve a cerrarse
  { iniciar: () => ({}), dibujar(g, w, h, t, p) {
    vertical(g, w, h, [[0, '#06050b'], [.7, '#110e1b'], [1, '#07060b']]);
    const dw = Math.min(w * .2, h * .26), dh = dw * 2.1, dx = w * (w > 900 ? .72 : .5) - dw / 2, dy = h * .62 - dh;
    const abre = .04 + .42 * (.5 - .5 * Math.cos(t * .32));
    const gap = dw * abre;
    g.strokeStyle = 'rgba(182,169,234,.18)'; g.lineWidth = 1; g.strokeRect(dx, dy, dw, dh);
    const luz = g.createLinearGradient(dx, 0, dx + gap, 0); luz.addColorStop(0, 'rgba(240,232,255,.95)'); luz.addColorStop(1, 'rgba(182,169,234,.6)');
    g.fillStyle = luz; g.fillRect(dx, dy, gap, dh);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(182,169,234,.12)';
    g.beginPath(); g.moveTo(dx, dy + dh); g.lineTo(dx + gap, dy + dh); g.lineTo(dx + gap * 3.2 + w * .1, h); g.lineTo(dx - w * .12, h); g.fill();
    radial(g, dx + gap / 2, dy + dh * .5, dh * .9, [[0, `rgba(182,169,234,${.18 * abre * 2})`], [1, 'rgba(182,169,234,0)']]);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(182,169,234,.25)'; g.fillRect(0, dy + dh, w, 1);
  } },
  // 08 · ESTO ES REAL: amanece; lo contrario del sol que se iba en la primera habitación
  { iniciar: () => ({}), dibujar(g, w, h, t, p) {
    const e = Math.min(1, p * 1.25);
    const top = mezclar([5, 8, 21], [44, 62, 104], e), mid = mezclar([16, 18, 36], [230, 170, 150], e), hor = mezclar([30, 22, 32], [255, 196, 150], e);
    vertical(g, w, h, [[0, rgb(top)], [.55, rgb(mid)], [.7, rgb(hor)], [1, rgb(mezclar([8, 8, 12], [60, 40, 44], e))]]);
    const hy = h * .7, sy = hy + h * .1 - e * h * .2;
    radial(g, w * lado(w), sy, Math.min(w, h) * .5, [[0, `rgba(255,248,232,${.3 + .65 * e})`], [.12, `rgba(255,226,190,${.2 + .4 * e})`], [1, 'rgba(255,200,170,0)']]);
    g.fillStyle = rgb(mezclar([6, 6, 10], [40, 28, 34], e)); g.fillRect(0, hy, w, h - hy);
    for (let k = 0; k < 4; k++) {
      const y = h * (.32 + k * .08), x = ((t * 6 * (k + 1) + k * 300) % (w + 600)) - 300;
      g.fillStyle = `rgba(255,${200 + k * 10},${180 + k * 10},${.06 + .12 * e})`;
      g.beginPath(); g.ellipse(x, y, 260 + k * 40, 7 + k * 2, 0, 0, TAU); g.fill();
    }
  } },
  // 09 · polvo que sube y se vuelve estrella; las del norte se encienden y se unen
  { iniciar: () => ({
      est: Array.from({ length: 420 }, () => ({ x: Math.random(), y: Math.pow(Math.random(), 1.6), r: rnd(.8, 2.2), u: Math.random(), f: rnd(0, TAU) })),
      norte: [[.38, .12], [.44, .08], [.5, .1], [.56, .07], [.62, .11], [.47, .17], [.55, .16]],
      polvo: Array.from({ length: 80 }, () => ({ x: Math.random(), y: rnd(.6, 1.1), v: rnd(.006, .018), f: rnd(0, TAU) })) }),
    dibujar(g, w, h, t, p, s) {
    vertical(g, w, h, [[0, '#02030a'], [.7, '#0a1024'], [1, '#05060c']]);
    for (const e of s.est) {
      if (e.u > .4 + p * .6) continue;
      const a = (.45 + .55 * Math.abs(Math.sin(t * .6 + e.f))) * Math.min(1, (.4 + p * .6 - e.u) * 5);
      g.fillStyle = `rgba(225,234,255,${a})`; g.fillRect(e.x * w, e.y * h, e.r, e.r);
    }
    const prog = Math.min(1, p * 1.4);
    g.strokeStyle = `rgba(207,224,255,${.25 * prog})`; g.lineWidth = .8; g.beginPath();
    s.norte.forEach(([x, y], k) => { if (k < s.norte.length * prog) k ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h); }); g.stroke();
    s.norte.forEach(([x, y], k) => radial(g, x * w, y * h, 10 + 6 * Math.sin(t + k), [[0, `rgba(235,242,255,${.55 + .4 * prog})`], [.3, 'rgba(207,224,255,.25)'], [1, 'rgba(207,224,255,0)']]));
    g.globalCompositeOperation = 'lighter';
    for (const d of s.polvo) {
      d.y -= d.v * .016; d.f += .02; if (d.y < .05) { d.y = rnd(.95, 1.1); d.x = Math.random(); }
      const a = Math.min(1, (1 - d.y) * 2) * Math.min(1, d.y * 3), oro = d.y > .4;
      g.fillStyle = oro ? `rgba(230,190,120,${a * .5})` : `rgba(225,234,255,${a * .7})`;
      g.fillRect(d.x * w + Math.sin(d.f) * 10, d.y * h, 2.4, 2.4);
    }
    g.globalCompositeOperation = 'source-over';
  } },
];

export function crearAtmosfera(canvas) {
  const g = canvas.getContext('2d');
  let actual = -1, anterior = -1, mezcla = 1, t = 0, w = 0, h = 0;
  const estados = [];
  const off = document.createElement('canvas'), og = off.getContext('2d');
  function medir() {
    const k = Math.min(devicePixelRatio || 1, 1);   // atmósfera suave: más resolución no se nota y cuesta en cada fotograma
    w = canvas.width = off.width = Math.round(innerWidth * k);
    h = canvas.height = off.height = Math.round(innerHeight * k);
  }
  addEventListener('resize', medir); medir();
  return {
    // fundir solo al cambiar de canción dentro de una habitación; al entrar desde la nave no debe asomar la anterior
    poner(i, fundir = false) {
      if (i === actual) return;
      anterior = actual; actual = i; mezcla = fundir && anterior >= 0 ? 0 : 1;
      estados[i] = ATMOSFERAS[i].iniciar();
    },
    dibujar(dt, p, rm) {
      if (actual < 0) return;
      t += rm ? 0 : dt;
      mezcla = Math.min(1, mezcla + dt / 1.2);
      ATMOSFERAS[actual].dibujar(g, w, h, t, p, estados[actual]);
      if (mezcla < 1 && anterior >= 0) {
        og.globalAlpha = 1; ATMOSFERAS[anterior].dibujar(og, w, h, t, 1, estados[anterior] ||= ATMOSFERAS[anterior].iniciar());
        g.globalAlpha = 1 - mezcla; g.drawImage(off, 0, 0); g.globalAlpha = 1;
      }
    },
  };
}
