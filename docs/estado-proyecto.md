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
