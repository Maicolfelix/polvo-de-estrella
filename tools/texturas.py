# Texturas PBR procedurales (color, normal, rugosidad[, metal]) para la escena.
# Todas las que se repiten son periódicas (síntesis espectral + distancias envueltas).
# Uso: python tools/texturas.py   (requiere numpy y pillow) -> tex/*.jpg|png
import numpy as np
from PIL import Image

rng = np.random.default_rng(7)
OUT = 'tex/'

def fbm(n, beta=1.8, seed=0, ax=1.0, ay=1.0, m=None):
    r = np.random.default_rng(seed)
    m = m or n
    F = np.fft.fft2(r.normal(size=(m, n)))
    fy = np.fft.fftfreq(m)[:, None] * ay * m / n
    fx = np.fft.fftfreq(n)[None, :] * ax
    k = np.sqrt(fx ** 2 + fy ** 2); k[0, 0] = 1
    a = k ** -beta; a[0, 0] = 0
    x = np.real(np.fft.ifft2(F * a))
    return (x - x.min()) / (x.max() - x.min())

def normal(h, fuerza):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5 * fuerza
    gy = (np.roll(h, 1, 0) - np.roll(h, -1, 0)) * .5 * fuerza  # v hacia arriba
    n = np.dstack([-gx, -gy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * .5 + .5

def guardar(nombre, arr, png=False):
    a = np.clip(arr, 0, 1)
    img = Image.fromarray((a * 255 + .5).astype(np.uint8))
    if png: img.save(OUT + nombre + '.png', optimize=True)
    else: img.save(OUT + nombre + '.jpg', quality=88)

def srgb(c):  # lineal -> sRGB aproximado
    return np.clip(c, 0, 1) ** (1 / 2.2)

# ---------- sillería de piedra envejecida ----------
def silleria(n=1024, filas=8, semilla=1, nombre='piedra'):
    r = np.random.default_rng(semilla)
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    h_fila = n / filas
    alto = np.zeros((n, n), np.float32); d = np.zeros((n, n), np.float32)
    tinte = np.zeros((n, n, 3), np.float32); bloque_off = np.zeros((n, n), np.float32)
    for f in range(filas):
        anchos = r.uniform(1.1, 2.3, 12) * h_fila
        cs = np.cumsum(anchos); k = np.searchsorted(cs, n); anchos = anchos[:k + 1]
        anchos *= n / anchos.sum()
        bordes = np.concatenate([[0], np.cumsum(anchos)]) + r.uniform(0, h_fila)
        y0, y1 = int(f * h_fila), int((f + 1) * h_fila)
        xs = x[y0:y1] % n
        xx = np.where(xs < bordes[0], xs + n, xs)
        idx = np.clip(np.searchsorted(bordes, xx) - 1, 0, len(anchos) - 1)
        izq = bordes[idx]; der = bordes[idx + 1]
        dx = np.minimum(xx - izq, der - xx)
        dy = np.minimum(y[y0:y1] - y0, y1 - y[y0:y1])
        d[y0:y1] = np.minimum(dx, dy)
        cols = r.uniform(.97, 1.03, (len(anchos), 3)) * r.uniform(.72, 1.25, (len(anchos), 1))
        tinte[y0:y1] = cols[idx]
        bloque_off[y0:y1] = r.uniform(-.06, .06, len(anchos))[idx]
    detalle = fbm(n, 2.0, semilla + 10)
    fino = fbm(n, 1.2, semilla + 11)
    vetas = fbm(n, 2.2, semilla + 12, ax=1, ay=.22)       # chorreones verticales
    golpes = fbm(n, 1.6, semilla + 13)
    bisel = 10.0
    cuerpo = np.clip(d / bisel, 0, 1) ** .6
    mortero = d < 3.2
    astilla = (d < bisel * 2.2) & (golpes > .62)
    alto = cuerpo * (.75 + bloque_off) + detalle * .35 + fino * .08
    alto = np.where(astilla, alto - (golpes - .62) * 1.6, alto)
    alto = np.where(mortero, .05 + fino * .1, alto)
    base = np.array([.075, .07, .072])
    col = base * tinte * (.62 + .7 * detalle[..., None]) * (.85 + .3 * fino[..., None])
    col *= (1 - .45 * np.clip((vetas[..., None] - .45) * 2.4, 0, 1))      # suciedad
    liquen = np.clip((fbm(n, 2.4, semilla + 14) - .72) * 5, 0, 1)[..., None] * (d[..., None] > 6)
    col = col * (1 - liquen * .4) + liquen * .4 * np.array([.07, .075, .05])
    col = np.where(mortero[..., None], np.array([.05, .048, .047]) * (.7 + .6 * fino[..., None]), col)
    col = np.where(astilla[..., None], col * 1.35, col)
    rug = .82 + .12 * fino - .3 * np.clip((vetas - .6) * 3, 0, 1)
    rug = np.where(mortero, .97, rug)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 9))
    guardar(nombre + '_rug', np.dstack([rug] * 3))

# ---------- losas de suelo mojado ----------
def losas(n=1024, puntos=34, nombre='suelo'):
    r = np.random.default_rng(3)
    P = r.uniform(0, n, (puntos, 2))
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    f1 = np.full((n, n), 1e9, np.float32); f2 = f1.copy(); ident = np.zeros((n, n), np.int32)
    for i, (px, py) in enumerate(P):
        dxa = np.abs(x - px); dxa = np.minimum(dxa, n - dxa)
        dya = np.abs(y - py); dya = np.minimum(dya, n - dya)
        dd = np.sqrt(dxa ** 2 + dya ** 2)
        nuevo = dd < f1
        f2 = np.where(nuevo, f1, np.minimum(f2, dd)); f1 = np.where(nuevo, dd, f1)
        ident = np.where(nuevo, i, ident)
    borde = f2 - f1
    det = fbm(n, 2.0, 21); fino = fbm(n, 1.3, 22); charco = fbm(n, 2.6, 23)
    junta = borde < 9 + det * 8
    alto = np.clip(borde / 22, 0, 1) ** .5 * .8 + det * .3 + fino * .06
    alto = np.where(junta, .05 + det * .1, alto)
    agua = charco > .76
    nivel = .35
    alto = np.where(agua, np.maximum(alto, nivel) * .0 + nivel, alto)
    tint = r.uniform(.8, 1.2, (puntos, 1))[ident]
    col = np.array([.06, .055, .052]) * tint * (.6 + .8 * det[..., None])
    col = np.where(junta[..., None], np.array([.035, .028, .022]) * (.6 + .8 * fino[..., None]), col)
    col = np.where(agua[..., None], col * .8, col)
    rug = np.where(junta, .95, .62 + .2 * fino)
    rug = np.where(agua, .18, rug)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 7))
    guardar(nombre + '_rug', np.dstack([rug] * 3))

# ---------- tejado de pizarra ----------
def pizarra(n=512, filas=10, nombre='pizarra'):
    r = np.random.default_rng(5)
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    h = n / filas
    fila = (y // h).astype(int); v = (y % h) / h
    ancho = n / 8
    off = (fila % 2) * ancho / 2 + r.uniform(-6, 6, filas)[fila]
    u = ((x + off) % ancho) / ancho
    teja = ((x + off) // ancho).astype(int) % 8
    det = fbm(n, 1.9, 31)
    alto = (1 - v) * .6 + det * .2
    alto = np.where(np.minimum(u, 1 - u) < .03, 0, alto)
    tint = r.uniform(.75, 1.25, (filas, 8))[fila, teja]
    col = np.array([.035, .04, .05]) * tint[..., None] * (.7 + .6 * det[..., None]) * (.7 + .5 * (1 - v)[..., None])
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 6))
    guardar(nombre + '_rug', np.dstack([.7 + .2 * det] * 3))

# ---------- puerta: tablones con herrajes ----------
def puerta(w=512, h=1024, nombre='puerta'):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    grano = fbm(w, 1.7, 41, ax=1, ay=.04, m=h)
    nudos = fbm(w, 2.4, 42, m=h)
    tablon = (x // (w / 5)).astype(int)
    u = (x % (w / 5)) / (w / 5)
    junta = np.minimum(u, 1 - u) < .025
    alto = .6 + grano * .25 - np.abs(u - .5) * .1
    alto = np.where(junta, .1, alto)
    tint = np.array([.9, 1.1, .95, 1.05, .92])[tablon]
    col = np.array([.05, .032, .022]) * tint[..., None] * (.55 + .9 * grano[..., None]) * (.85 + .3 * nudos[..., None])
    col = np.where(junta[..., None], col * .4, col)
    rug = .7 + .15 * grano; metal = np.zeros_like(rug)
    oxido = fbm(w, 1.8, 43, m=h)
    for cy in (.16, .5, .84):
        banda = np.abs(y / h - cy) < .022
        alto = np.where(banda, .95 + oxido * .05, alto)
        hierro = np.array([.03, .028, .027]) + np.clip(oxido - .55, 0, 1)[..., None] * np.array([.12, .05, .02])
        col = np.where(banda[..., None], hierro, col)
        rug = np.where(banda, .45 + .4 * oxido, rug); metal = np.where(banda, .85, metal)
        for cx in np.linspace(.1, .9, 6):
            dd = np.hypot(x / w - cx, (y / h - cy) * 2) * w
            clavo = dd < 9
            alto = np.where(clavo, 1 + np.sqrt(np.clip(1 - (dd / 9) ** 2, 0, 1)) * .4, alto)
            col = np.where(clavo[..., None], np.array([.05, .045, .04]), col)
            metal = np.where(clavo, .9, metal); rug = np.where(clavo, .35, rug)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 10))
    guardar(nombre + '_rug', np.dstack([rug, rug, rug]))
    guardar(nombre + '_met', np.dstack([metal] * 3))

# ---------- mármol negro con vetas doradas (de la portada) ----------
def marmol(n=1024, nombre='marmol'):
    a = fbm(n, 2.1, 51); b = fbm(n, 1.9, 52); c = fbm(n, 2.3, 53)
    w = fbm(n, 2.0, 54)
    def veta(f, ancho):
        return np.clip(1 - np.abs(f - .5) / ancho, 0, 1) ** 3
    warp = (a + .35 * w)
    oro = veta(warp, .012) * (b > .45)
    blanca = veta(fbm(n, 2.2, 55) + .3 * c, .008) * .5
    nube = .6 + .8 * c
    col = np.array([.012, .011, .012]) * nube[..., None]
    col = col + blanca[..., None] * np.array([.12, .12, .12]) + oro[..., None] * np.array([.42, .28, .08])
    y, x = np.mgrid[0:n, 0:n]
    junta = (np.minimum(x % (n // 2), n // 2 - x % (n // 2)) < 2) | (np.minimum(y % (n // 2), n // 2 - y % (n // 2)) < 2)
    alto = np.where(junta, 0, 1.0) + c * .02
    col = np.where(junta[..., None], col * .3, col)
    rug = .14 + .1 * c + oro * .2
    rug = np.where(junta, .8, rug)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 2))
    guardar(nombre + '_rug', np.dstack([rug] * 3))

# ---------- siluetas de árboles (capas lejanas) y niebla ----------
def arboles(nombre, semilla, w=2048, h=512, num=34, hmin=.45, hmax=.95):
    r = np.random.default_rng(semilla)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    m = np.zeros((h, w), np.float32)
    ruido = fbm(w, 1.1, semilla, m=h)
    for _ in range(num):
        cx = r.uniform(0, w); H = r.uniform(hmin, hmax) * h; top = h - H
        t = np.clip((y - top) / H, 0, 1)
        tier = (t * r.uniform(7, 11)) % 1
        ancho = H * .22 * t * (.55 + .45 * tier) + 2
        dx = np.abs(((x - cx + w / 2) % w) - w / 2)
        m = np.maximum(m, ((dx < ancho * (.75 + .5 * ruido)) & (y > top)).astype(np.float32))
    m = np.maximum(m, (y > h * .93).astype(np.float32))
    k = np.ones(5) / 5
    m = np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 1, m)
    m = np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 0, m)
    rgba = np.dstack([np.full_like(m, .02), np.full_like(m, .015), np.full_like(m, .02), m])
    guardar(nombre, rgba, png=True)

def niebla(n=512):
    f = fbm(n, 1.9, 61) * .7 + fbm(n, 1.4, 62) * .3
    f = np.clip((f - .35) / .5, 0, 1)
    guardar('niebla', np.dstack([f] * 3))

# ---------- tierra húmeda con hierba seca ----------
def tierra(n=1024, nombre='tierra'):
    a = fbm(n, 2.2, 81); b = fbm(n, 1.4, 82); c = fbm(n, .9, 83); hierba = fbm(n, 1.0, 84, ax=1, ay=.5)
    charco = fbm(n, 2.8, 85) > .83
    piedras = (c > .78)
    alto = a * .6 + b * .25 + piedras * (c - .78) * 3
    alto = np.where(charco, .3, alto)
    col = np.array([.045, .036, .03]) * (.6 + .8 * a[..., None]) * (.8 + .4 * b[..., None])
    mh = np.clip((hierba - .55) * 4, 0, 1)[..., None] * (1 - charco[..., None])
    col = col * (1 - mh) + mh * np.array([.05, .048, .03]) * (.7 + .6 * b[..., None])
    col = np.where(piedras[..., None], np.array([.07, .066, .064]) * (.7 + .5 * b[..., None]), col)
    col = np.where(charco[..., None], col * .82, col)
    rug = np.where(charco, .32, .85 + .1 * b)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 6))
    guardar(nombre + '_rug', np.dstack([rug] * 3))

# ---------- matas de hierba seca (RGBA, para tarjetas cruzadas) ----------
def hierba(nombre='hierba', w=256, h=256, briznas=70, semilla=91):
    r = np.random.default_rng(semilla)
    a = np.zeros((h, w), np.float32); col = np.zeros((h, w, 3), np.float32)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    for _ in range(briznas):
        x0 = r.uniform(w * .15, w * .85); alto = r.uniform(.45, .98) * h; curva = r.uniform(-.5, .5) * w * .35
        t = np.clip((h - y) / alto, 0, 1)
        cx = x0 + curva * t ** 2
        ancho = (1 - t) * r.uniform(2.2, 4.2) + .5
        m = (np.abs(x - cx) < ancho) & (y > h - alto)
        tono = r.uniform(.75, 1.25)
        c = np.array([.11, .1, .055]) * tono * (.6 + .5 * t[..., None])
        a = np.where(m, 1, a); col = np.where(m[..., None], c, col)
    guardar(nombre, np.dstack([srgb(col * 2.2), a]), png=True)

# ---------- tierra agrietada (plaza de la llegada) ----------
def voronoi(n, puntos, semilla, dx=0, dy=0):
    r = np.random.default_rng(semilla)
    P = r.uniform(0, n, (puntos, 2))
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    x = x + dx; y = y + dy                                        # dominio deformado: bordes irregulares
    f1 = np.full((n, n), 1e9, np.float32); f2 = f1.copy(); ident = np.zeros((n, n), np.int32)
    for i, (px, py) in enumerate(P):
        dxa = np.abs(x - px); dxa = np.minimum(dxa, n - dxa)
        dya = np.abs(y - py); dya = np.minimum(dya, n - dya)
        dd = np.sqrt(dxa ** 2 + dya ** 2)
        nuevo = dd < f1
        f2 = np.where(nuevo, f1, np.minimum(f2, dd)); f1 = np.where(nuevo, dd, f1)
        ident = np.where(nuevo, i, ident)
    return f1, f2 - f1, ident

def grieta(n=1024, nombre='grieta'):
    r = np.random.default_rng(41)
    det = fbm(n, 2.0, 42); fino = fbm(n, 1.2, 43); manchas = fbm(n, 2.6, 44)
    w1 = (fbm(n, 1.9, 45) - .5) * 60; w2 = (fbm(n, 1.9, 46) - .5) * 60     # deforma las celdas: grietas irregulares
    f1, b1, id1 = voronoi(n, 70, 47, w1, w2)
    _, b2, _ = voronoi(n, 360, 48, w1 * .6 + (fino - .5) * 10, w2 * .6)
    grande = b1 < 3 + det * 6 * (manchas > .35)
    peque = (b2 < 1.2 + fino * 1.4) & (fbm(n, 1.6, 49) > .45)        # grietas finas solo en parte de las placas
    # cada placa se abomba y se curva en los bordes, como barro seco
    abombado = np.clip(b1 / 40, 0, 1) ** .45
    alto = abombado * .7 + det * .25 + fino * .08 - peque * .18
    alto = np.where(grande, -.15 + det * .05, alto)
    tint = r.uniform(.78, 1.2, (70, 1))[id1]
    base = np.array([.055, .044, .038])
    col = base * tint * (.62 + .7 * det[..., None]) * (.85 + .3 * fino[..., None])
    col *= 1 - .35 * np.clip((manchas[..., None] - .6) * 3, 0, 1)           # humedad oscura
    col = np.where(peque[..., None], col * .55, col)
    col = col * (1 + .5 * np.clip((abombado[..., None] - .85) * 4, 0, 1) * (1 - grande[..., None]))  # bordes secos más claros
    col = np.where(grande[..., None], np.array([.012, .009, .008]), col)
    rug = np.where(grande, 1., .78 + .15 * fino)
    guardar(nombre + '_col', srgb(col * 2.2))
    guardar(nombre + '_nor', normal(alto, 9))
    guardar(nombre + '_rug', np.dstack([rug] * 3))

if __name__ == '__main__':
    if __import__('sys').argv[1:] == ['grieta']: grieta(); raise SystemExit
    hierba(); arboles('arboles_lejos2', 73, num=52, hmin=.25, hmax=.6); arboles('arboles_cerca2', 74, num=15, hmin=.6, hmax=1.0); print('hierba y bosques extra', flush=True)
    if __import__('sys').argv[1:] == ['extra']: raise SystemExit
    tierra(); print('tierra', flush=True)
    silleria(); print('piedra', flush=True)
    silleria(filas=12, semilla=4, nombre='muro'); print('muro', flush=True)
    losas(); print('suelo', flush=True)
    pizarra(); print('pizarra', flush=True)
    puerta(); print('puerta', flush=True)
    marmol(); print('marmol', flush=True)
    arboles('arboles_lejos', 71, num=46, hmin=.3, hmax=.65)
    arboles('arboles_cerca', 72, num=18, hmin=.55, hmax=1.0); print('arboles', flush=True)
    niebla(); print('niebla', flush=True)
