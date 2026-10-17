# Estado del proyecto — MAVO · Polvo de estrella

Registro breve de continuidad: decisiones y resultados verificables. Contexto de código: `js/graphify-out/GRAPH_REPORT.md` (regenerar con `graphify update js`).

## 2026-10-17 · Rama `fix/pausa-movil` (no publicada; Pages sirve `main`)

**Objetivo.** En teléfono, al pausar, la canción no se detenía bien y parecía sonar superpuesta. Además: bajar la instrumental (sonaba fuerte y cansaba).

**Causa encontrada (reproducida en emulación).**
- Pulsar *siguiente* y luego *pausa* dentro de ~0,5 s anulaba el cambio pendiente: el título pasaba a la canción nueva pero seguía cargada la anterior; al reanudar sonaba la vieja bajo el título nuevo. Prueba `siguiente + pausa en carga`: FALLA con el código anterior, OK con el nuevo.
- El botón dependía de `audio.paused`, que es transitorio mientras `play()` está pendiente; la pausa detenía el elemento pero no silenciaba al instante su salida.
- El desbloqueo de audio de iOS (`play()`→`pause()` en el primer gesto) podía pausar la canción que el usuario acababa de pedir al tocar *Reproducir* tras entrar «Sin sonido».
- La entrada dependía solo de `requestAnimationFrame`: si el navegador deja de pintar a mitad (pantalla bloqueada) la interfaz quedaba en «entrando».
- La superposición literal no se reprodujo en Chromium; las protecciones de abajo cubren las rutas que podían causarla en un dispositivo, pero eso está **sin verificar en un teléfono físico**.

**Cambios.**
- `js/audio.js`: controlador único de canción. `quiere` (lo pedido) es la verdad; `reproducir()` / `pausar()` / `playPausa()`. Pausar = ganancia a 0 y `pause()` en el mismo instante (conserva posición). Cualquier `play` tardío que no coincida con `quiere` se corta. Cambio de canción con token propio: la pausa ya no lo cancela; otro cambio o salir sí. Preescucha bloqueada mientras hay habitación. Pausas ajenas (llamada, auriculares) actualizan el botón. Contexto de audio reanudado en el siguiente toque (iOS). Instrumental `NIVEL.inst` 0,5 → 0,3 (≈ −4,4 dB) y durante preescucha 0,14 → 0,08.
- `js/app.js`: el botón se pinta desde `A.estaSonando()`; toques repetidos durante el desbloqueo se ignoran; entrar/cambiar sin sonido pasan por el mismo controlador.
- `js/escena.js`: respaldo por temporizador para terminar la entrada aunque no haya fotogramas.
- `tools/prueba-audio.js`: pruebas de aceptación reutilizables.

**Pruebas (navegador integrado, Chromium, emulación 375×812 con eventos táctiles sintéticos; `?captura`).**
22/22 OK con sonido: entrar→pausar→esperar→reanudar (posición conservada); 10 y 9 toques rápidos; siguiente+pausa en carga; navegación rápida entre canciones; salir durante la carga; preescucha→entrar→pausar→volver; mantener→soltar sin entrar; arrastrar cancela; controles reciben el toque y las puertas quedan inertes. 6/6 OK «Sin sonido» en tres habitaciones. Tocar *Reproducir* tras «Sin sonido» suena una sola vez.

**Pendiente.**
- Probar en iPhone y Android reales (pausa, reanudar, bloquear pantalla y volver, llamada entrante).
- Escuchar el nuevo nivel de la instrumental; ajustar `NIVEL.inst` si hace falta.
- Revisar a oído los inicios provisionales de preescucha.

**Siguiente paso.** Probar la rama en el teléfono (ver instrucciones en la respuesta / PR) y, si va bien, fusionar en `main` para publicarla.

## 2026-10-17 · Rama `feat/tu-sonido` (parte de `fix/pausa-movil`; no publicada)

**Objetivo.** Panel «Tu sonido» en el reproductor: volumen de canción, EQ de 3 bandas, espacio, ambiente, comparar con original y restablecer.

**Decisiones de procesamiento (`js/audio.js`, `cadenaCancion`).**
- Una sola cadena, creada una vez: compensación → graves (estante 150 Hz) → medios (campana 1,4 kHz, Q 0,9) → agudos (estante 6 kHz) → seco + envío a espacio → volumen de canción → compuerta de pausa → master.
- Espacio: cola 1,5 s, pre-delay 28 ms, envío filtrado 350 Hz–5,5 kHz; 100 % = envío 0,28 (≈ −11 dB). La convolución solo se conecta con espacio > 0 (ahorro en teléfono).
- Margen: la compensación baja `max(realce de bandas) + 1,5 dB × espacio`. Sin compresor: el `DynamicsCompressor` del navegador añadía +0,17 dB en posición neutra (alteraba el master).
- Pausa: la compuerta va después de la reverb y la cola se descarta (convolución nueva); reanudar no recupera reverb vieja.
- El volumen del reproductor es ahora el de la canción (100 % = nivel base). Ambiente escala la instrumental y su ducking (0,3 / 0,08 al 100 %).
- Solo la canción completa recibe EQ/espacio; preescucha e instrumental conservan su tratamiento.

**Mediciones (render offline, 25 s por canción, las 9).** Neutro = original exacto (mismo pico y RMS). Todo +6 dB y todo +6 dB + espacio 100 %: picos entre −0,9 y −4,6 dBFS, 0 muestras saturadas. La copia web de la 05 ya trae +1,47 dBFS (2 muestras) desde la codificación AAC, independiente del panel.

**Pruebas (navegador, emulación 375×812).** `tools/prueba-audio.js`: `correr()` 22/22 y `correrPanel()` 25/25 en la misma sesión; recarga recupera preferencias sin crear audio; con almacenamiento bloqueado el panel sigue funcionando; foco en bucle con Tab/Mayús+Tab; en escritorio el panel no tapa la columna de letra.

**No validado.** Calidad sonora a oído (nada se ha escuchado) y teléfono físico. Para comparar: abrir una canción, «Tu sonido», ajustar y alternar «Comparar con original».

**Siguiente paso.** Escucha del artista en su teléfono; si aprueba, fusionar `fix/pausa-movil` y `feat/tu-sonido` en `main`.

## 2026-10-17 · Cierre de validación técnica de «Tu sonido» (rama `feat/tu-sonido`)

**TODOLOLO y copias web.** Comparado con el WAV fuente (`tools/nivel.py`):
- WAV 05: pico −1,14 dBFS, true peak −1,1 dBTP, ninguna muestra en el tope. El master está limpio.
- Copia web 05 (aac 160k): +1,47 dBFS, true peak +2,1 dBTP; 2 muestras aisladas > 0 dBFS (racha máx. 1) en 0:59,1. Sobreimpulso del códec en un transitorio, no recorte del master; el navegador las recorta al sacarlas.
- Revisión completa del álbum: también 02 (+0,93, en el arranque 0:00,01), 03 (+0,87), 07 (+0,46) y el fragmento 07-pre (+0,73). Los WAV de todas: −1,13 a −1,55 dBFS.
- Bajar 1,5 dB a 160k no lo resolvía (+0,68). Recodificadas solo esas copias con `aac_mf` (Media Foundation) a 256k, sin cambio de nivel: picos −0,97 a −1,05 dBFS, 0 muestras > 0, desfase 0 muestras respecto al WAV (correlación cruzada), duración igual, residuo frente al WAV −44 a −46 dB (antes −34). Verificado también con el decodificador del navegador. `tools/codificar.sh` y `tools/preescuchas.sh` documentan la excepción. WAV originales intactos.

**Procesamiento — qué se verificó (render offline en Chromium, `tools/prueba-audio.js`).**
- Prueba nula: EQ 0 y espacio 0 frente a la señal directa, alineadas al mismo instante: diferencia máxima 0 en las 9 canciones completas (≈63 M muestras por canal). Válido para el motor de Chromium; Safari/Firefox no medidos.
- 14 combinaciones intermedias y mixtas × 9 canciones completas: 0 muestras saturadas; peor pico −1,33 dBFS (03, medios +3).
- 200 cambios aleatorios de parámetros en 10 s (05 y 02): sin saturación ni NaN; salto máximo entre muestras inferior al de la señal sin cambios (indicador indirecto de chasquidos; no detecta clics menores que los transitorios naturales).
- Regresión: `correr()` 22/22 (pausa, cambios, salida) y `correrPanel()` 25/25 (incluye pausa con espacio alto y cambio de canción con ajustes).

**Pendiente — requiere escucha y teléfono del artista.**
- Validar en teléfono físico: pausa/reanudar, siguiente + pausa, espacio alto, comparar, bloqueo de pantalla (lista en la respuesta del encargo).
- Escuchar: transparencia y carácter del EQ/espacio, ausencia de clics al mover controles, nivel de la instrumental, y que las copias 02/03/05/07 a 256k suenen igual que las demás.
- Inicios provisionales de preescucha, sin revisar a oído.

**Siguiente paso.** Resultado de la prueba en el teléfono; con aprobación, fusionar en `main`.

## 2026-10-17 · Corrección de alcance: solo volumen (rama `fix/volumen`, desde `feat/tu-sonido`)

**Alcance confirmado por el artista: únicamente volumen**, como en un reproductor normal. El panel «Tu sonido» fue una interpretación incorrecta y se **retiró por completo**: botón, panel, EQ, espacio, ambiente, comparar, restablecer, su cadena de procesamiento (`cadenaCancion`, compensación, convolución) y sus preferencias. Al cargar se borra la clave `pde-tu-sonido`; ningún ajuste antiguo altera las canciones. Las secciones anteriores sobre «Tu sonido» quedan como historial, no como funcionalidad vigente.

**Ahora.** Canción → ganancia de volumen (0–100 %, suavizado ~100 ms) → compuerta de pausa → master. Sin efectos sobre las canciones completas. Altavoz: silenciar/reactivar; al reactivar recupera el último volumen distinto de cero (también si se bajó la barra a 0). Mover la barra no inicia ni reanuda una canción. Se guardan `pde-vol` y `pde-vol-ultimo`. La barra es visible también en teléfono, junto al altavoz.

**Se conserva.** Controlador único y corrección de pausa; copias web corregidas (02, 03, 05, 07, 07-pre); WAV intactos; tratamiento de preescucha e instrumental (nivel base 0,3, ducking 0,08).

**Pruebas (emulación 375×812).** `correrVolumen()` 15/15: sin rastro del panel ni de sus ajustes tras recargar; volumen mientras suena sin reinicio ni duplicado; silenciar/reactivar recupera 50 %; barra a 0 + altavoz recupera el último nivel; en pausa la barra y el altavoz no reanudan; cambio de canción conserva el volumen sin crear fuentes; volumen guardado. `correr()` 22/22 (pausa). Retiradas las pruebas del panel y de su cadena.

**Pendiente.** Prueba en teléfono físico (pausa y volumen) y escucha del artista.

## 2026-10-17 · Cierre exacto del silencio (rama `fix/volumen`)

**Causa.** Silencio y volumen usaban `setTargetAtTime` (aproximación exponencial): nunca llegan al valor final; quedaba ≈ 0,008 a los 400 ms y la prueba anterior se había relajado para aceptarlo.

**Cambio.** `fundir()` en `js/audio.js`: rampa lineal que termina exactamente en el objetivo en un plazo fijo (`FUNDIDO.silencio` 0,25 s, `FUNDIDO.volumen` 0,1 s). Cada llamada cancela lo programado y parte del valor actual: alternar rápido no deja operaciones pendientes. `niveles()` informa master y volumen sin redondear.

**Pruebas (emulación 375×812, sin tolerancia).** `correrVolumen()` 17/17: silenciar → master 0 exacto; reactivar → 1 y volumen 50 %; 7 toques rápidos → 0 exacto; toques rápidos terminando en sonido → 1 y sigue en 1 a los 800 ms; barra a 0 → ganancia de canción 0 exacta; altavoz tras barra a 0 recupera el último nivel; en pausa barra y altavoz (también alternando rápido) no reanudan. `correr()` 22/22.

**Pendiente.** Teléfono físico y escucha del artista (clics al silenciar o mover el volumen).
