# Propone un inicio PROVISIONAL de preescucha por canción: la ventana de 30 s
# más repetida dentro del tema (similitud de croma) con energía alta.
# Es una heurística (suele caer en el estribillo), no una escucha: revisar a oído.
# Uso: python tools/fragmentos.py tools/ffmpeg.exe audio/01.m4a ...
import subprocess, sys, json
import numpy as np

SR, N, HOP, L = 11025, 4096, 2048, 30

def leer(ff, ruta):
    raw = subprocess.run([ff, '-v', 'error', '-i', ruta, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def analizar(x):
    win = np.hanning(N)
    nfr = (len(x) - N) // HOP
    frames = np.lib.stride_tricks.as_strided(x, (nfr, N), (x.strides[0] * HOP, x.strides[0]))
    S = np.abs(np.fft.rfft(frames * win, axis=1))
    f = np.fft.rfftfreq(N, 1 / SR)
    ok = (f > 60) & (f < 4000)
    pc = np.round(12 * np.log2(f[ok] / 440)).astype(int) % 12
    C = np.zeros((nfr, 12))
    for k in range(12):
        C[:, k] = S[:, ok][:, pc == k].sum(1)
    rms = np.sqrt((frames ** 2).mean(1))
    # a 1 s por paso
    per = SR / HOP
    n = int(nfr / per)
    C1 = np.array([C[int(i * per):int((i + 1) * per)].mean(0) for i in range(n)])
    E1 = np.array([rms[int(i * per):int((i + 1) * per)].mean() for i in range(n)])
    C1 /= np.linalg.norm(C1, axis=1, keepdims=True) + 1e-9
    sim = C1 @ C1.T
    rep = np.zeros(n)
    for t in range(n - L):
        mejor = 0
        for u in range(n - L):
            if abs(u - t) < L: continue
            mejor = max(mejor, np.mean([sim[t + k, u + k] for k in range(0, L, 2)]))
        rep[t] = mejor
    e = 20 * np.log10(np.array([E1[t:t + L].mean() for t in range(n - L)] + [1e-9] * L) + 1e-9)
    score = (rep - rep.max()) * 40 + (e - e.max()) * .5  # repetición manda; energía desempata
    validos = np.arange(n)
    score[(validos < 12) | (validos > n - L - 6)] = -1e9
    t = int(np.argmax(score))
    return {'inicio': t, 'duracion': round(len(x) / SR, 1), 'repeticion': round(float(rep[t]), 3)}

if __name__ == '__main__':
    import os; ff = os.path.abspath(sys.argv[1])
    out = {}
    for ruta in sys.argv[2:]:
        out[ruta] = analizar(leer(ff, ruta))
        print(ruta, out[ruta], flush=True)
    json.dump(out, open('tools/fragmentos.json', 'w'), indent=1)
