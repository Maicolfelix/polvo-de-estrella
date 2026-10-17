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
