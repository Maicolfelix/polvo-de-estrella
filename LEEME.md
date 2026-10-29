# Polvo de estrella — experiencia web (versión local)

## Abrir
Necesita un servidor con soporte de rangos (para buscar dentro de las canciones):

```bash
npx http-server@14.1.1 -p 8765 -c-1
```

Luego abrir http://localhost:8765. Parámetros de revisión: `?rm` fuerza movimiento reducido; `?captura` activa las herramientas de captura (`tools/receptor-capturas.mjs`).

## Estructura
| Ruta | Qué es |
|---|---|
| `index.html`, `estilos.css` | Página, interfaz, habitación y reproductor |
| `js/datos.js` | Títulos y letras **exactamente como las entregó el artista**; inicios provisionales de fragmentos |
| `js/escena.js` | Mundo 3D (Three.js): paisaje, capilla, portal, nave, nueve puertas, tormenta, cámara, transiciones |
| `js/primer-plano.js` | Llegada: corona, rosas, pétalos, ataduras, destellos minerales, tumbas y cruces |
| `js/audio.js` | Preescucha "tras la puerta", canción, ambiente de lluvia (`audio/ambiente.m4a`), viento y trueno; pulso de graves para el fondo |
| `js/habitaciones.js` | Fondo vivo de las nueve habitaciones: la imagen del artista (`img/hab/`) animada por zonas con un sombreador WebGL |
| `js/cuervos.js` | Cuervos que vuelan en círculo sobre la torre (una malla instanciada) |
| `js/app.js` | Recorrido por desplazamiento, estados, puertas accesibles, teclado, índice |
| `audio/` | Copias web AAC 160 kbps de los nueve masters (`01`…`09`), fragmentos de 30 s (`NN-pre`); `instrumental.m4a` se conserva pero la página ya no la carga |
| `tex/` | Texturas PBR generadas por `tools/texturas.py` |
| `tools/` | `codificar.sh`, `preescuchas.sh`, `fragmentos.py`, `texturas.py`, prototipo anterior |

`tools/ffmpeg.exe` no está en el repositorio (87 MB). Para volver a codificar audio: `pip install imageio-ffmpeg` y copiar su binario a `tools/ffmpeg.exe`, o usar cualquier ffmpeg instalado.
| `capturas/` | Capturas de la revisión |

Los WAV originales en `Downloads/ALBUM MAVO POLVO DE ESTRELLA` no se modificaron. Los masters se copian sin procesar (solo codificación). Desde el 2026-10-21 no hay instrumental de fondo: el ambiente es solo viento y truenos sintetizados.

## Por qué 3D en tiempo real con texturas procedurales
- Lo pedido —entrada profunda, escalones, perspectiva real, sombras de contacto, rayos que iluminan la arquitectura, puertas con espesor que se abren y una cámara que entra— necesita geometría y luz reales; imágenes planas en capas no permiten abrir una puerta ni cruzarla de forma creíble.
- No dispongo de generación de imágenes fotográficas ni de escaneos PBR, así que las texturas (sillería envejecida, losas mojadas, tierra, pizarra, madera con herrajes, mármol negro con vetas doradas) se generan con `tools/texturas.py`: son mapas de color, relieve y rugosidad reales, pero **no fotográficos**. Es el límite principal de realismo de esta versión.
- La portada aparece sin alterar en la llegada y en el tímpano del portal, donde los relámpagos la iluminan al acercarse.

## Recursos que elevarían el acabado (no los puedo producir aquí)
1. **Portada en alta resolución** — mínimo 3000×3000 px, PNG o TIFF, sin compresión. La actual mide 426×416 y se ve blanda en el tímpano y en pantallas grandes.
2. **Texturas PBR escaneadas** (licencia CC0, p. ej. Poly Haven), 2K, mapas *diffuse/normal GL/roughness* (+AO): piedra caliza o basalto oscuro en sillería, losas de piedra mojadas, tierra húmeda con hierba seca, pizarra de tejado, madera vieja de puerta, mármol negro con vetas (Nero Marquina). Sustituyen los archivos de `tex/` con el mismo nombre.
3. **Placa de fondo del paisaje** (matte painting) en capas PNG con alfa, 4096×1536, para sustituir `tex/arboles_*.png`. Prompt sugerido:
   > *Panorámica nocturna de un bosque de abetos oscuros bajo un cielo de tormenta rojizo, siluetas de árboles a tres distancias separadas en capas, niebla baja entre los troncos, sin edificios, sin figuras, sin luna, estilo fotográfico, tonos negro, carbón y rojo oscuro, 4096×1536, fondo transparente por capa.*
4. **Grabaciones de ambiente**: viento suave en exterior (estéreo, 60 s, sin ráfagas fuertes) y trueno lejano (3–4 tomas). Hoy ambos se sintetizan.

## Fragmentos de preescucha — PROVISIONALES
Inicios en segundos (ventana de 30 s): 01: 24 · 02: 55 · 03: 73 · 04: 82 · 05: 114 · 06: 40 · 07: 68 · 08: 101 · 09: 50.
Se eligieron con `tools/fragmentos.py` (la ventana más repetida dentro de cada tema, por similitud armónica, desempatada por energía). Las puntuaciones de repetición salieron muy parecidas en todos los temas (0,93–0,98), así que **no son fiables**: hay que revisarlos a oído. Para cambiarlos, editar los valores en `tools/preescuchas.sh` y `js/datos.js` y ejecutar `sh tools/preescuchas.sh`.

## Letras
Se muestran completas y sin sincronizar, con su texto original (espacios iniciales y saltos incluidos). No hay tiempos de sincronización todavía.

## Mezcla medida (histórico: la instrumental se retiró el 2026-10-21; ver `docs/estado-proyecto.md`)
- Reverb: pre-delay 24 ms, cola 2,6 s que se oscurece al decaer, envío filtrado 240 Hz–6,2 kHz, seco 0,86 / húmedo 0,45.
- Señal húmeda ≈ 11 dB por debajo de la seca (RMS −26,2 vs −14,8 dB); sonoridad total casi igual (−14,3 vs −13,5 dB).
- La instrumental decodificada tiene picos de +3,6 dBFS; con el nivel de ambiente (0,5 = −6 dB) la salida queda por debajo de 0 dBFS.
- Niveles: ambiente 0,5 · durante preescucha 0,14 · canción 1,0 (sin procesar) · viento ≤ 0,16 · trueno ≤ 0,5 y filtrado bajo 190 Hz.
- **Nada de esto se ha escuchado**: son medidas. Los valores están en `REVERB` y `NIVEL` de `js/audio.js` para ajustarlos a oído.

## Registro de pruebas (navegador integrado de Claude, Chromium de escritorio)
Probado en navegador; **ninguna prueba en dispositivos físicos**.
- Carga progresiva de texturas con indicador; los botones de entrada se habilitan al terminar.
- Recorrido por desplazamiento: paisaje → acercamiento → portal → nave → estaciones de las nueve puertas (1440×900 y 375×812 emulado).
- Preescucha con cursor (retardo 260 ms): la puerta se entreabre, sube su luz, la instrumental baja a 0,14 y se recupera a 0,5 al salir.
- Táctil simulado con eventos de puntero: pulsación larga → preescucha, y **al soltar no entra**; arrastre → nada; toque corto → entra.
- Entrada: giro de cámara, apertura de hojas, avance, viento, relevo con la habitación 2D sin destello.
- Habitaciones: título y letra correctos; siguiente/anterior (incluso dos clics seguidos) cambian canción, letra y atmósfera; volver pausa la canción y devuelve el ambiente. En ningún paso quedaron dos fuentes sonando.
- Teclado: Tab llega a las puertas y las acerca; flechas cambian de puerta; mantener Espacio = preescucha; Intro = entrar; Escape = volver con el foco en la misma puerta; Espacio en la habitación = reproducir/pausa.
- Movimiento reducido (`?rm`): estaciones fijas con fundido, sin rayos visibles (resplandor lento), sin avance de cámara, apertura breve.
- Rendimiento medido en este equipo (GPU dedicada): ~4 ms por fotograma a 1440×900. Sin medir en teléfonos.

## Limitaciones reales
- Realismo limitado por texturas procedurales y geometría modelada en código; ver recursos pendientes.
- Sin pruebas en iPhone/Android reales: el desbloqueo de audio de iOS y el rendimiento en gama media están implementados pero no verificados.
- Las capturas de `capturas/` muestran solo el lienzo 3D o el de la atmósfera; los rótulos HTML se verificaron por inspección del DOM.
- La pestaña de revisión estaba oculta durante parte de las pruebas; las animaciones se comprobaron por estado y tiempos, no viéndolas en movimiento.
