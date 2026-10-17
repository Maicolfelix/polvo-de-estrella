# Alineamiento forzado de la letra del artista con su canción (no transcribe: la letra es la referencia).
#  1. Separa la voz del WAV con Demucs (htdemucs).
#  2. Calcula emisiones con torchaudio MMS_FA (wav2vec2 multilingüe, 16 kHz, tramas de 20 ms).
#  3. Fuerza la alineación de las palabras de la letra; entre líneas se admite un comodín (*) que absorbe
#     música, ad-libs o repeticiones no escritas sin inventar texto.
#  4. Marca cada línea como 'auto' o 'incierto' según confianza del alineador, energía vocal y ritmo.
# Uso: python tools/alinear.py NN [NN ...]   (entorno con torch, torchaudio, demucs; ver docs/estado-proyecto.md)
# Salida: tools/alineamiento/NN.json (palabras y medidas) — luego tools/tiempos.mjs genera js/tiempos.js.
import json, os, subprocess, sys, unicodedata
import numpy as np, soundfile as sf, torch, torchaudio

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WAV = os.environ.get('PDE_WAV', r'C:\Users\57300\Downloads\ALBUM MAVO POLVO DE ESTRELLA')
STEMS = os.path.expanduser('~/.cache/pde-alinear-stems')
ARCH = {'01': 'SI_NO_ESTOY_A_TU_LADO_MAVO', '02': 'TU_SILUETA_NO_ME_DANA_MAVO', '03': 'POR_QUE_ESTAS_TAN_BIEN',
        '04': 'SE_ACABA_EL_VERANO_MAVO', '05': 'TODOLOLO_MAVO', '06': 'DEBERIA_SER_UN_SUENO_MAS', '07': 'QUE_PASARIA_MAVO',
        '08': 'ESTO_ES_REAL_DESDE_EL_DIA_UNO_MAVO', '09': 'THE_LAST_OF_MAVO'}
SR, SEG = 16000, 320 / 16000   # MMS_FA: una trama cada 320 muestras = 20 ms

def letras():
    js = subprocess.run(['node', '-e', "import('./js/datos.js').then(m=>console.log(JSON.stringify(m.CANCIONES.map(c=>({n:c.n,titulo:c.titulo,letra:c.letra})))))"],
                        cwd=RAIZ, capture_output=True, text=True, check=True, encoding='utf-8').stdout
    return {c['n']: c for c in json.loads(js)}

def palabras(linea):
    s = unicodedata.normalize('NFD', linea.lower())
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').replace('ñ', 'n')
    s = ''.join(ch if 'a' <= ch <= 'z' else ' ' for ch in s)
    return s.split()

def voz(n):
    nombre = ARCH[n] + '_MASTER_ESTUDIO_V2'
    destino = os.path.join(STEMS, 'htdemucs', nombre, 'vocals.wav')
    if not os.path.exists(destino):
        subprocess.run([sys.executable, '-m', 'demucs.separate', '-n', 'htdemucs', '--two-stems=vocals', '-o', STEMS,
                        os.path.join(WAV, nombre + '.wav')], check=True)
    x, sr = sf.read(destino, dtype='float32')
    x = torch.from_numpy(x.mean(1) if x.ndim > 1 else x)[None]
    return torchaudio.functional.resample(x, sr, SR)

def emisiones(modelo, x, trozo=30):
    out = []
    with torch.inference_mode():
        for i in range(0, x.shape[1], trozo * SR):
            e, _ = modelo(x[:, i:i + trozo * SR])
            out.append(e)
    return torch.cat(out, 1)

def alinear(n, c, bundle, modelo, dic):
    x = voz(n)
    em = emisiones(modelo, x)
    lineas = c['letra'].split('\n')
    # secuencia: * palabras(línea1) * palabras(línea2) * … *
    tokens, mapa = [dic['*']], []   # mapa: por token, (índice de línea, índice de palabra) o None
    mapa.append(None)
    for li, l in enumerate(lineas):
        for wi, w in enumerate(palabras(l)):
            for ch in w:
                tokens.append(dic[ch]); mapa.append((li, wi))
        if palabras(l):
            tokens.append(dic['*']); mapa.append(None)
    alin, puntos = torchaudio.functional.forced_align(em, torch.tensor([tokens], dtype=torch.int32), blank=0)
    alin, puntos = alin[0], puntos[0].exp()
    spans = torchaudio.functional.merge_tokens(alin, puntos)
    assert len(spans) == len(tokens), (len(spans), len(tokens))
    # energía vocal por trama (para comprobar que hay voz donde se ubica cada línea)
    v = x[0].numpy(); rms = np.sqrt(np.convolve(v ** 2, np.ones(320) / 320, 'same')[::320] + 1e-12)
    ref = np.median(rms[rms > np.percentile(rms, 60)])
    res = []
    for li, l in enumerate(lineas):
        ws = [(s, m) for s, m in zip(spans, mapa) if m and m[0] == li]
        if not ws:
            res.append(None); continue
        a, b = ws[0][0].start * SEG, ws[-1][0].end * SEG
        conf = float(np.mean([s.score for s, _ in ws]))
        ener = float(np.mean(rms[int(a / SEG):max(int(b / SEG), int(a / SEG) + 1)]) / ref)
        ritmo = len(''.join(palabras(l))) / max(b - a, 1e-3)   # letras por segundo
        motivos = []
        if conf < .35: motivos.append(f'confianza {conf:.2f}')
        if ener < .3: motivos.append(f'poca voz ({ener:.2f})')
        if ritmo > 22: motivos.append(f'demasiado rápido ({ritmo:.0f} letras/s)')
        if b - a > 14: motivos.append(f'demasiado larga ({b - a:.1f} s)')
        res.append({'linea': l, 'inicio': round(a, 2), 'fin': round(b, 2), 'confianza': round(conf, 3),
                    'energia': round(ener, 2), 'ritmo': round(ritmo, 1), 'estado': 'incierto' if motivos else 'auto', 'motivos': motivos,
                    })
    dur = x.shape[1] / SR
    return {'n': n, 'titulo': c['titulo'], 'duracion': round(dur, 2), 'metodo': 'demucs htdemucs + torchaudio MMS_FA (forced_align)', 'lineas': res}

if __name__ == '__main__':
    bundle = torchaudio.pipelines.MMS_FA
    modelo = bundle.get_model(with_star=True).eval()
    dic = bundle.get_dict(star='*')
    L = letras()
    os.makedirs(os.path.join(RAIZ, 'tools', 'alineamiento'), exist_ok=True)
    for n in sys.argv[1:]:
        r = alinear(n, L[n], bundle, modelo, dic)
        with open(os.path.join(RAIZ, 'tools', 'alineamiento', n + '.json'), 'w', encoding='utf-8') as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
        ok = sum(1 for x in r['lineas'] if x and x['estado'] == 'auto'); inc = sum(1 for x in r['lineas'] if x and x['estado'] == 'incierto')
        print(f"{n} {r['titulo']}: {ok} auto, {inc} inciertas, duración {r['duracion']} s", flush=True)
