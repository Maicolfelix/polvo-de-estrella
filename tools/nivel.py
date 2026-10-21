# Compara un WAV fuente con su copia web decodificada: picos, muestras > 0 dBFS, rachas
# (recorte efectivo = muestras consecutivas en el tope), duración y alineación temporal.
# Uso: python tools/nivel.py tools/ffmpeg.exe <fuente.wav> <copia.m4a> [<copia2.m4a> ...]
import os, subprocess, sys
import numpy as np

SR = 44100

def leer(ff, ruta):
    raw = subprocess.run([ff, '-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)

def informe(x):
    a = np.abs(x)
    sobre = a > 1.0
    # racha más larga de muestras seguidas por encima del tope (en cualquier canal)
    s = sobre.any(1).astype(np.int8)
    d = np.diff(np.concatenate([[0], s, [0]]))
    rachas = np.flatnonzero(d == -1) - np.flatnonzero(d == 1)
    pos = np.flatnonzero(sobre.any(1))
    return {
        'pico_dbfs': round(20 * np.log10(a.max()), 2),
        'muestras_sobre_0': int(sobre.sum()),
        'racha_max': int(rachas.max()) if len(rachas) else 0,
        'instantes_s': sorted({round(p / SR, 2) for p in pos})[:6],
        'duracion_s': round(len(x) / SR, 4),
    }

def desfase(a, b, n=SR * 20):
    # correlación cruzada de los primeros 20 s (canal izquierdo) para medir el retardo de b respecto a a
    a, b = a[:n, 0], b[:n, 0]
    N = 1 << int(np.ceil(np.log2(len(a) + len(b))))
    c = np.fft.irfft(np.fft.rfft(b, N) * np.conj(np.fft.rfft(a, N)), N)
    k = int(np.argmax(c)); k = k - N if k > N // 2 else k
    return k

if __name__ == '__main__':
    ff = os.path.abspath(sys.argv[1])
    fuente = leer(ff, sys.argv[2])
    print('fuente', informe(fuente))
    for ruta in sys.argv[3:]:
        x = leer(ff, ruta)
        k = desfase(fuente, x)
        n = min(len(fuente), len(x) - max(k, 0))
        dif = x[max(k, 0):max(k, 0) + n] - fuente[:n]
        print(ruta, informe(x), {'desfase_muestras': k, 'error_rms_db': round(10 * np.log10(np.mean(dif ** 2) + 1e-20), 1)})
