# Ambiente de la llegada grabado como archivo: lluvia suave, gotas sueltas y viento con oleadas, en bucle sin costura.
# Se reproduce con un elemento <audio> (no solo sintetizado): en iPhone suena aunque el interruptor de silencio
# esté puesto y, al sonar, deja oír también el viento y los truenos que se generan en vivo.
# Uso: python tools/ambiente.py   → audio/ambiente.m4a (necesita tools/ffmpeg.exe o ffmpeg en el PATH)
import os, shutil, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR, DUR, CRUCE = 44100, 52.0, 4.0          # se generan 52 s y los últimos 4 s se funden con los primeros: bucle de 48 s
rng = np.random.default_rng(7)
n = int(SR * DUR)

def banda(x, lo, hi, orden=3):
    return sosfilt(butter(orden, [lo, hi], btype='band', fs=SR, output='sos'), x)

def rosa(n):  # ruido rosa (filtro de Paul Kellet)
    w = rng.standard_normal(n); b = np.zeros(7); out = np.empty(n)
    for i in range(n):
        x = w[i]
        b[0] = .99886 * b[0] + x * .0555179; b[1] = .99332 * b[1] + x * .0750759; b[2] = .969 * b[2] + x * .153852
        b[3] = .8665 * b[3] + x * .3104856; b[4] = .55 * b[4] + x * .5329522; b[5] = -.7616 * b[5] - x * .016898
        out[i] = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + x * .5362; b[6] = x * .115926
    return out / np.abs(out).max()

t = np.arange(n) / SR
canales = []
for ch in range(2):
    # lluvia: rumor de ruido rosa en 220 Hz–2,6 kHz, con una respiración lenta de intensidad
    lluvia = banda(rosa(n), 220, 2600) * (1 + .12 * np.sin(2 * np.pi * (.07 + ch * .013) * t + ch))
    # gotas sueltas: golpecitos breves y apagados a distinto volumen (algunas sobre piedra, más graves)
    gotas = np.zeros(n)
    for _ in range(int(DUR * 9)):
        i0 = rng.integers(0, n - 3000); amp = .02 + rng.random() ** 3 * .18; grave = rng.random() < .15
        f = rng.uniform(600, 1300) if grave else rng.uniform(1800, 4200); d = int(rng.uniform(300, 1400) * (1.6 if grave else 1))
        k = np.arange(d); gotas[i0:i0 + d] += np.sin(2 * np.pi * f * k / SR) * amp * np.exp(-k / (d * .18))
    # viento: ruido grave en 180–700 Hz con oleadas lentas que suben y bajan
    ola = .55 + .45 * np.clip(np.sin(2 * np.pi * .045 * t + ch * .7) * .6 + np.sin(2 * np.pi * .11 * t + 1.3) * .4, -1, 1)
    viento = banda(rng.standard_normal(n), 180, 700, 2) * ola
    viento /= np.abs(viento).max()
    canales.append(lluvia * .55 + gotas * .9 + viento * .3)
x = np.stack(canales, 1)

# bucle sin costura: los últimos CRUCE s se funden sobre los primeros
c = int(SR * CRUCE); f = np.linspace(0, 1, c)[:, None]
x[:c] = x[:c] * f + x[-c:] * (1 - f)
x = x[:-c]
x *= 10 ** (-20 / 20) / np.sqrt(np.mean(x ** 2))          # RMS −20 dBFS: fondo discreto
x = np.clip(x, -.89, .89)                                  # pico por debajo de −1 dBFS

tmp = os.path.join(tempfile.gettempdir(), 'pde-ambiente.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
ffmpeg = os.path.abspath('tools/ffmpeg.exe') if os.path.exists('tools/ffmpeg.exe') else shutil.which('ffmpeg')
subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'aac', '-b:a', '96k', 'audio/ambiente.m4a'], check=True)
os.remove(tmp)
print('audio/ambiente.m4a', os.path.getsize('audio/ambiente.m4a') // 1024, 'KB,', round(len(x) / SR, 1), 's')
