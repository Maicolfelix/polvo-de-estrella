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

## 2026-10-17 · Letras fieles y sincronizadas (rama `feat/letras`, desde `fix/volumen`)

**Fuente y presentación.** `js/datos.js` (letras del artista) no se modifica. `js/letras.js` aplica ediciones mínimas —tildes, separación y puntuación inequívocas— y esa lista es el registro editorial (42 ediciones). `node tools/validar-letras.mjs` exige, línea a línea, las mismas letras que el original sin contar tildes, mayúsculas, signos ni espacios: ninguna palabra añadida, quitada o sustituida. Se conservan «cora», «pa», «to», «pesao», «mami», «todololo», «Nonono», vocalizaciones y mayúsculas originales.
**Dudas reales (sin aplicar, en `DUDAS` de `js/letras.js`):** 01 «La razones», «la archivé»/«las archivé», «Si no estoy lo a tu ladoooo» · 02 «si/sí tu mirada de decepción», «tu mitad que va» · 03 «Donde tú estabas» (¿pregunta?), «después dejarme» · 04 «si yo te las cuenta» · 07 «Porque ahora estás dispuesta» (¿«¿Por qué…?»?), «todos los día», «el día hoy» · 08 «si esto real» · 09 «y otra gritan».

**Sincronización — método reproducible.** `tools/alinear.py`: Demucs `htdemucs` separa la voz del WAV → torchaudio `MMS_FA` hace alineamiento forzado de la letra del artista (no transcribe; un comodín entre líneas absorbe música y ad-libs sin inventar texto) → inicio/fin por línea. Estado `incierto` si confianza < 0,35, poca voz en el tramo, ritmo > 22 letras/s o línea > 14 s. WAV y copias web: desfase 0 muestras en las nueve (correlación cruzada), por lo que los tiempos del WAV valen para el audio de la página. `node tools/tiempos.mjs` genera `js/tiempos.js`; `node tools/resumen-alineamiento.mjs` resume. Entorno (fuera del repo): `uv venv ~/.cache/pde-alinear` + `torch==2.5.1 torchaudio==2.5.1` (CPU) + `demucs==4.0.1 soundfile`; modelos en `~/.cache/torch`, voces en `~/.cache/pde-alinear-stems`.

| Canción | Líneas | auto | inciertas |
|---|---|---|---|
| 01 SI NO ESTOY A TU LADO | 39 | 29 | 10 |
| 02 TU SILUETA NO ME DAÑA | 20 | 17 | 3 |
| 03 POR QUE ESTAS TAN BIEN… | 24 | 16 | 8 |
| 04 SE ACABA EL VERANO | 23 | 19 | 4 |
| 05 TODOLOLO | 33 | 26 | 7 |
| 06 DEBERIA SER UN SUEÑO MAS | 19 | 18 | 1 |
| 07 QUE PASARíA? | 29 | 23 | 6 |
| 08 ESTO ES REAL | 38 | 32 | 6 |
| 09 THE LAST OF US (MAVO) | 15 | 13 | 2 |

Las inciertas se concentran en repeticiones («No voy a decir…», «Todololo», «Fuck» ×3, «Otras/Otros gritan tu nombre»), vocalizaciones largas y la línea larga de 02 (22,8 s). Detalle por línea: `tools/alineamiento/NN.json`.

**Presentación.** Línea activa por contraste y una barra fina del color de la canción (sin cambio de tamaño); vecinas legibles; seguimiento suave al 36 % de la altura; desplazamiento manual → «Seguir canción»; nunca se resalta una línea futura; tras 1,2 s del final de una línea se apaga; margen inferior para que el reproductor no tape el final; letra difuminada bajo los botones superiores; sin anuncios automáticos para lectores de pantalla. Reloj único: `song.currentTime`.

**Pruebas (navegador, emulación 375×812).** `validar-letras.mjs`: presentación fiel y tiempos ordenados, sin solapes, dentro de la duración, uno por línea. `correrNueve()` 9/9: audio, título y nº de líneas correctos; línea activa correcta al inicio, medio y final; sin línea futura tras el final. `correrLetra('01')` 13/13 en `?rm` (pausa congela, reanuda, búsqueda adelante/atrás, silencio no detiene, manual + «Seguir canción», cambio de canción limpia, volver cancela); con desplazamiento suave, las comprobaciones de posición dependen del tiempo de animación en la pestaña de pruebas. Regresión: `correr()` + `correrVolumen()` 39/39.

**No validado.** Exactitud auditiva de los tiempos (nada se ha escuchado): **todas** las líneas son alineamiento automático; las 47 inciertas son prioridad de revisión. Teléfono físico.

**Siguiente paso.** Revisión a oído del artista (empezando por las inciertas) y corrección de tiempos en `tools/alineamiento/NN.json` → `node tools/tiempos.mjs`.

**Corrección de cifras (2026-10-17).** Recontado desde `tools/alineamiento/*.json` sin repetir el alineamiento: **240 líneas con texto = 193 `auto` + 47 `incierto`**. La tabla anterior suma 47 inciertas y es correcta; el error estaba en el mensaje del commit 1fac70f («147 líneas auto»): son 193. Ninguna línea está revisada a oído.

## 2026-10-17 · Acabado visual: fachada, puerta 1 y habitación 1 (rama `feat/acabado-visual`, desde `feat/letras`)

**Decisiones.**
- Piedra envejecida en el sombreador (`envejecer` en `js/escena.js`, ruido 3D en coordenadas de mundo): humedad y suciedad que suben del suelo, chorreones verticales, musgo en la base y variación tonal amplia. Sin texturas nuevas ni coste extra notable en teléfono.
- Fachada: cornisa bajo el gablete, imposta, alféizares, labio del zócalo; pernios, bisagras y aro de hierro en las hojas del portal.
- Paisaje con intención: 8 árboles secos en 3D cerca del camino (proyectan sombra), 1500 matas de hierba (700 en teléfono) en bordes del camino, verja y zócalo, 70 rocas; bosques de fondo con dos semillas, espejados y desplazados para que no se repitan.
- Puerta 1 (muestra): pernios en relieve, bisagras, clave en el arco, umbral de piedra, farol de hierro en la columna con luz cálida; abre hacia la nave hasta quedar contra el derrame. Rótulos de todas las puertas como placa de bronce unida al pie de su puerta (títulos sin cambios).
- Habitación 1 (`js/sala-mar.js`): cámara de piedra del mismo edificio que se abre por un arco apuntado a un mar celeste; silla vacía de espaldas mirando al agua (ausencia); seis cuerdas que cruzan el espacio y se tensan con la canción (ataduras); el sol baja y se pierde bajo el horizonte con el progreso del tema. Mar y cielo con sombreadores propios.
- Continuidad: la puerta 1 es un **portal**: la sala se dibuja con la pose real de la cámara trasladada al espacio de la sala; al cruzar el umbral se dibuja la sala directamente desde esa misma pose (sin destello ni fondo genérico). En la habitación 1 la sala 3D queda detrás de la letra; las demás habitaciones conservan su atmósfera 2D hasta extender el acabado.
- Robustez: `terminarEntrada()` deja la cámara dentro de la habitación si la entrada se completó por el temporizador de respaldo (pantalla bloqueada o pestaña oculta). La instrumental se retira al ritmo de la entrada (más rápido con movimiento reducido).

**Pruebas (navegador, emulación 1440×900 y 375×812).** Capturas comparables antes/después en `capturas/12-antes-despues-escritorio.jpg` y `capturas/13-antes-despues-habitacion1-movil.jpg` (mismas posiciones de cámara). `correrNueve()` 9/9; `correrLetra('01')` 13/13 con `?rm` (en modo normal fallan 2 comprobaciones de posición por la animación de desplazamiento en la pestaña de pruebas, igual que antes); `correr()` 22/22; `correrVolumen()` 17/17. Detectado y corregido en las pruebas: con movimiento reducido la instrumental seguía sonando al abrir la habitación (fundido de 1,8 s frente a entrada de 0,5 s).

**Limitaciones reales.** Las texturas siguen siendo procedurales (la sillería mantiene un patrón regular visible de cerca); las matas de hierba son tarjetas planas que de lejos leen como setos oscuros; sin oclusión ambiental de pantalla. No probado en teléfono físico: el portal añade un render extra mientras la puerta 1 está abierta (a 0,6 de resolución). No se ha escuchado nada.

**Recursos que elevarían el acabado** (especificación; no se usan provisionales como definitivos): texturas PBR escaneadas 2K (sillería de basalto o caliza oscura con juntas irregulares; piedra de umbral desgastada; madera vieja de roble; hierro forjado oxidado), modelos glTF ligeros (< 5 k triángulos) de matorral seco y hiedra para la fachada, y la portada en alta resolución (≥ 3000 px) para el tímpano.

**Siguiente paso.** Revisión del artista de fachada, puerta 1 y habitación 1; si aprueba, extender herrajes y portal a las otras ocho puertas y crear sus salas.

## 2026-10-21 · Entrada reconstruida, fluidez, transiciones y sin instrumental (rama `feat/acabado-visual`)

**Rama.** El encargo pedía una rama nueva; al proponerla, el artista eligió seguir en la rama actual (`feat/acabado-visual`, sobre `b8474d9`). `main` y la página publicada siguen sin cambios.

**Diagnóstico (medido, no supuesto).** Equipo de pruebas: GTX 1650 (ANGLE/D3D11), Chrome 152, pantalla de 144 Hz, vista 1440×900 con devicePixelRatio 1,25. Métodos en `tools/medir-rendimiento.js`: `medir()` = coste por fotograma con espera a la GPU (incluye ~6 ms de sincronización); `fluidez()` / `fluidezEntrada()` = intervalo real entre fotogramas de `requestAnimationFrame` con la pestaña visible.
- Todo el coste era de **relleno de píxeles** en la GPU (la CPU gastaba 0,3–3,5 ms). La nave: 82 ms solo la pasada principal a 1440×900.
- Culpables, quitándolos uno a uno: el sombreador de envejecimiento (16 ruidos por píxel, ~47 ms en la nave), 11 luces puntuales activas en cada píxel (~24 ms), tres luces direccionales calculadas dentro de la nave aunque valían 0 (~10 ms), mapa de entorno en piedra/madera/suelo, resplandor de posproceso (en la llegada, la diferencia entre 72 y 48 fps), sombras dibujadas en cada fotograma, 1500 matas de hierba con transparencia, el cielo y el exterior dibujados detrás de los muros, y la resolución hasta 1,75×.
- Tirones: la primera apertura de la puerta 1 compilaba la sala del mar (fotograma de 1,6 s); en las puertas 2–9 el lienzo 2D se subía a la GPU en cada fotograma.
- Transiciones (fotogramas intermedios en `capturas/15-transiciones-antes.jpg`): en 2–9 la cámara entraba en una caja de piedra plana, la habitación era un rectángulo negro y el final quedaba negro; la puerta 1 saltaba de golpe a la sala; al entrar desde la nave podía asomar la atmósfera de la habitación anterior (fundido entre habitaciones).

**Estrategia visual elegida: 3D estilizado compuesto como un cuadro**, no imágenes planas por capas. Motivos: (1) no dispongo de arte ilustrado del nivel de la referencia ni puedo producirlo, y recortar la referencia en capas dejaría huecos al moverlas y se pixelaría al acercarse a la puerta; (2) la puerta, la escalinata y el cruce del umbral necesitan profundidad real para que la transición sea coherente; (3) el coste no estaba en la geometría sino en la luz y los sombreadores, así que se podía tener más objetos y más fluidez a la vez. La referencia orienta paleta, composición y objetos; la portada oficial sigue siendo la de destellos blancos (llegada y tímpano).

**Llegada (`js/escena.js`, `js/primer-plano.js`, `tools/texturas.py`).**
- Tres planos: delante, corona dorada caída, rosas (cabezas en copa con capullo y pétalos vueltos), pétalos, rollos de hierro y zarzas (ataduras), diez destellos minerales que centellean; en medio, la plaza de barro agrietado (`tex/grieta_*`, nueva), dos hileras de tumbas y cruces que bordean el camino y la escalinata; al fondo, la capilla entera con estrella dorada en el óculo y campanario corto con cruz, pinos oscuros pegados a ella y cielo carmesí con rayos más frecuentes.
- Cámara: recorrido corto y bajo (de 44 m a la escalinata) en vez de 82 m de llanura vacía. En vertical la capilla ocupa la mitad superior y portada, título y botones van abajo; en escritorio van en una columna a la izquierda. Verja solo a los lados.
- Interpretación artística, sin texto ni interacción en los objetos (comentario en `js/primer-plano.js`): corona = creerse dueño del mundo y ser diminuto ante la tormenta; rosas = vínculos y fragilidad; destellos = polvo de estrella. No son hechos oficiales.

**Fluidez.** Zonas exterior/nave que se ocultan cuando no se ven; 3 luces reales repartidas cada fotograma entre 19 «focos» (sin recompilar); luces de exterior apagadas al cruzar el portal, con los dos estados compilados al cargar; sombras estáticas (la de la sala solo cuando su sol o sus cuerdas cambian); ruido de envejecimiento solo para los efectos que cada material usa; entorno solo en lo que refleja; sin resplandor de posproceso (halos con sprites); resolución máx. 1× en escritorio y 1,25× en teléfono, y **escala adaptativa** (baja en pasos de 0,15 hasta 0,55 si el intervalo medio supera 23 ms; empieza a medir 2 s después de cargar y no oscila); sala del mar a 30 fps detrás de la letra; lienzo de habitación subido uno de cada dos fotogramas y a 1× píxel; sala precompilada y dibujada una vez al cargar.

| Fluidez real (rAF, 1440×900, escala fija) | Antes (búfer 1800×1125) | Ahora, mismo búfer 1800×1125 | Ahora, búfer por defecto 1440×900 |
|---|---|---|---|
| Llegada | 29 fps (34,4 ms) | 48 fps | 72 fps |
| Desplazamiento | 24 fps (41,6 ms) | 48 fps | 72 fps |
| Umbral | 10 fps (97,2 ms) | 36 fps | 48 fps |
| Nave | 10 fps (97,2 ms) | 36 fps | 48 fps |
| Apertura puerta 1 (mediana / peor) | 27,8 ms / 1590 ms | — | 13,9 ms / 63 ms |
| Apertura puerta 4 (mediana) | 132 ms | — | 13,7 ms |
| Habitación 1 (mediana) | 27,9 ms | — | 6,9 ms |

Con la escala adaptativa a 0,85 (1224×765) la nave también llegó a 72 fps. Los valores están cuantizados por la sincronía de 144 Hz (6,9 / 13,9 / 20,8 / 27,8 ms). Emulación 375×812 en este mismo PC: 143 fps (no representa un teléfono). **No medido en el PC del artista ni en teléfonos.**

**Transiciones de las nueve puertas.** Todas las hojas se abren hacia la nave hasta el derrame del muro: el hueco queda libre. En 2–9, el hueco es un **portal alineado con la pantalla** que muestra la atmósfera de la canción ya preparada (el mismo lienzo que luego ocupa la pantalla); el sombreador deshace el tono ACES de la salida para que los colores coincidan. La cámara hace un solo movimiento (Bézier: se alinea con la puerta, acelera y frena en el umbral, 2,3 s); cuando el hueco llena la pantalla, la habitación 2D toma el relevo (diferencia media medida entre el último fotograma y la habitación: 0,00 sobre 255) y la letra y los controles aparecen 0,65 s después. La puerta 1 conserva el portal 3D a la sala del mar. Salida inversa: se parte del umbral (igual que la habitación que se desvanece), se retrocede entre las hojas y la puerta se cierra después. Sin cajas de piedra, sin rectángulos negros, sin destellos. Sin fundido de la habitación anterior al entrar desde la nave. Fotogramas: `capturas/16-transiciones-despues.jpg` (0–2,1 s cada 0,3 s, la habitación y la salida, en las nueve). Los pocos píxeles negros detectados en el centro durante la apertura son el fondo oscuro tras la rendija de la puerta antes de abrirse, no fotogramas vacíos.

**Instrumental retirada (`js/audio.js`).** Sin elemento de audio, sin carga ni precarga, sin reverb, fundidos ni ducking de instrumental. `audio/instrumental.m4a` se conserva en su sitio, sin referencias. Ambiente = viento y truenos ya existentes: el viento cede a 0,3 ante la preescucha, calla al entrar en una habitación (la ráfaga del cruce sigue) y vuelve al salir. Silencio, volumen y «Sin sonido» sin cambios.

**Pruebas (navegador integrado, 375×812 emulado salvo indicación).** `correrAmbiente()` 10/10 (la instrumental nunca se pide al servidor). `correr()` 22/22 (pausa). `correrVolumen()` 17/17. `correrTransiciones()` 21/21 con sonido y 21/21 en `?rm` sin sonido: nueve entradas y regresos (una transición por toque, letra oculta al empezar y visible al estabilizarse), 6 toques seguidos = 1 transición, dos toques en «Puertas» = un regreso, entrada sin fotogramas (escena congelada a mitad, como con la pantalla bloqueada) termina en la habitación con la cámara en su sitio. `correrNueve()` 9/9. `correrLetra('01')` 13/13 en `?rm`. `correrSinSonido()` 6/6. `node tools/validar-letras.mjs`: OK. Letras, títulos, tiempos y audio sin cambios en git. Fotogramas de la entrada: `tools/fotogramas-entrada.js`.

**Limitaciones reales.** Todo es geometría y texturas generadas por código: la escena se acerca a la referencia en paleta y composición, pero no tiene su detalle ilustrado (piedra con grietas finas, rosas pintadas, textura de grabado). Los cambios de pestaña reales no se pueden simular en la prueba: se cubrieron congelando la escena. Sin teléfono físico ni PC del artista. Las habitaciones 2–9 siguen siendo atmósferas 2D (no se rediseñaron). Nada escuchado. La imagen de referencia no se ha subido al repositorio.

**Recursos que elevarían el acabado** (no puedo producirlos; no se usan sustitutos como definitivos):
1. *Cielo pintado* (equirectangular 8192×4096, PNG): «Cielo nocturno de tormenta, masas de nubes carmesí iluminadas desde abajo sobre negro profundo, rayos ramificados blancos, salpicaduras de tinta negra, textura de grabado fino, sin edificios, sin árboles, sin horizonte terrestre, proyección equirectangular». Sustituiría el sombreador del cielo (y costaría menos).
2. *Pinos en capas* (3 PNG con alfa, 4096×1024): «Siluetas de abetos negros a contraluz de un cielo rojo, tres franjas de distancia por separado, bordes nítidos, sin suelo, fondo transparente». Sustituyen `tex/arboles_*`.
3. *Modelos glTF ligeros* (< 15 k triángulos cada uno, PBR 2K): corona de oro gastada con gemas rojas; rosa roja oscura abierta con tallo y hojas (3 variantes); diamante talla brillante; cruz celta de piedra y lápida desgastada. Sustituyen las piezas de `js/primer-plano.js`.
4. *Texturas PBR escaneadas CC0* 2K (Poly Haven o similar): sillería de piedra oscura, barro seco agrietado, madera vieja de puerta, hierro forjado oxidado.
5. Portada en alta resolución (≥ 3000 px) para el tímpano.

**Siguiente paso.** Que el artista lo abra en su PC (enlace local) y en su teléfono; si la llegada y las transiciones le convencen, decidir si se encargan los recursos anteriores y, después, fusionar en `main`.

## 2026-10-21 · Universo vivo y más primer plano (misma rama; se añade al PR #1)

**Pedido del artista.** Más rosas y detalle en el suelo como en la referencia, todo animado (árboles, nubes, flores) y quitar el borde que se veía al acercarse.

**Cambios.**
- Borde: la capa del título se encogía y subía al desplazarse y su fondo dejaba de cubrir la pantalla. Ahora la capa queda fija a pantalla completa y solo sube su contenido (`--sube` en `js/app.js` / `estilos.css`).
- Viento en el sombreador (`mecer` y `VIENTO` en `js/escena.js`), sin coste de CPU: las capas de pinos se doblan por arriba en una onda que recorre el bosque; rosas, hojas y tallos se mecen según su altura, con ráfagas, y cada flor se mueve con la misma fase que su tallo. Con movimiento reducido todo queda quieto.
- Cielo: las nubes avanzan a la vista en dos capas a distinta velocidad y su deformación cambia con el tiempo (se arremolinan).
- Primer plano (`js/primer-plano.js`): de 14 a 34 matas de rosas (unas 100 flores), 190 pétalos en el suelo (100 en teléfono), 140 hojas secas fuera del camino, 8 rollos de hierro, 14 zarzas, 18 destellos y 26 pétalos que el viento arrastra a brincos por la plaza (14 en teléfono). El camino central sigue libre.
- Rendimiento: las nuevas rosas bajaban la llegada a 48 fps; con cabezas más ligeras (15 pétalos de 5×4) y 5 hojas por flor vuelve a **72 fps** a 1440×900 (desplazamiento 71 fps; 180 k triángulos en la llegada). GTX 1650, mismo método que arriba.

**Pruebas.** `correrTransiciones()` 21/21 tras los cambios. Captura actualizada: `capturas/14-llegada-acercamiento-umbral.jpg`. Sin teléfono físico.

## 2026-10-21 · Capilla completa, suelo con más vida y nave más realista (misma rama; PR #1)

**Pedido del artista.** El suelo exterior seguía pobre; a la capilla le faltaba un pedazo a los lados y no le gustaba la parte de arriba de la puerta; dentro, cambiar el piso, que las lámparas iluminen abajo, que la puerta del fondo se vea y que las dos ventanas muestren el cielo y no un color fijo.

**Cambios (`js/escena.js`, `js/primer-plano.js`, `tools/texturas.py`).**
- Capilla: naves laterales bajas a cada lado (tejado de pizarra a un agua, lancetas, contrafuertes y alero), como en la referencia; la silueta ya no se ve cortada. Tímpano de piedra labrada con una estrella dorada y rayos en relieve en lugar de la imagen de la portada (de lejos se leía como un destello raro). La portada sigue en la llegada.
- Suelo exterior: barro agrietado con más contraste, polvo y manchas; 8 charcos que reflejan el cielo real (nubes que se mueven y relámpagos) con onditas; 640 piedrecillas (320 en teléfono) y 46 cascotes de piedra junto a tumbas y escalinata.
- Cielo compartido: el sombreador del cielo es ahora una función (`CIELO_GLSL`) que usan el cielo, las vidrieras y los charcos.
- Nave: losas de piedra gastadas en lugar del mármol con vetas, alfombra carmesí con cenefa dorada hasta la puerta del fondo, charco de luz cálida bajo cada lámpara (y lámparas más intensas), dos apliques con llama junto a la puerta 9 y su luz sobre el muro del fondo, y vidrieras emplomadas que dejan ver la tormenta de detrás.

**Medido (GTX 1650, 1440×900, rAF).** Llegada 72 fps, desplazamiento 72, umbral 48, nave 48: igual que antes de estos cambios. `correrTransiciones()` 21/21. Captura: `capturas/17-capilla-suelo-nave.jpg`. Sin teléfono físico.

## 2026-10-21 · Puertas reales, vidrieras, rojo y negro, ventiscas, entrada decorada, diamantes y estrellas fugaces (misma rama; PR #1)

**Pedidos del artista.** Lo que asomaba al abrir una puerta se veía feo; la puerta 9 parecía falsa de lejos; ventanas más realistas; quitar todo el amarillo (la paleta es rojo y negro); ventiscas fuertes de vez en cuando; más decoración en la entrada; diamantes con más detalle; estrellas fugaces.

**Cambios.**
- Tras cada puerta 2–9 hay un pasillo corto de piedra iluminado desde dentro con el color de la canción; la luz de la puerta está dentro y sale por el hueco al suelo de la nave. Sustituye al fondo negro plano y al resplandor plano.
- Las nueve puertas llevan el acabado de la puerta 1 (pernios, puntas y bisagras de hierro, clave, umbral); el hierro va fusionado en una malla por hoja.
- Puerta 9: una de las 3 luces reales queda reservada para el fondo mientras se está en la nave (luz de apliques que cae sobre madera, moldura y muro), con un resto leve de luz horneada. Se quitó el velo naranja plano.
- Una capa de niebla atravesaba la nave (z −12) y se veía su borde desde dentro: movida detrás de la capilla.
- Vidrieras exteriores: rombos emplomados carmesí, vino y brasa, una vela que parpadea detrás, el cielo reflejado y el destello de los relámpagos. Vidrieras interiores: la tormenta real a través de cristal antiguo teñido. Todas en rojo y negro.
- Paleta de la interfaz: el dorado (MAVO, números, bordes, botones, barras, placas de las puertas, alfombra, cordón de la habitación 1) pasa a rojo oscuro. Se conservan dorados la corona y la estrella porque lo son en la referencia.
- Ventisca cada 20–45 s (4–7 s): rosas, hojas, tallos y pinos se agitan y se doblan hacia un lado, los pétalos y el polvo corren, las velas se agitan y el viento sube de volumen y de tono. Con movimiento reducido no hay ventisca.
- Entrada: urnas de piedra con rosas a los dos lados del pie de la escalinata, unas 70 velas en los peldaños y junto a las urnas (llamas que parpadean, una sola llamada de dibujo), zarzas con espinas trepando por las columnas del pórtico, los pináculos y los faroles, rosas pequeñas entre ellas y pétalos sobre los peldaños.
- Diamantes: talla brillante con más facetas y sombreador propio (facetas por derivadas, fuego de colores en los bordes y brillos blancos agudos); el centelleo tiene borde irisado.
- Estrellas fugaces cada 5–15 s en la parte del cielo que se mira, dibujadas dentro de la función del cielo: también se ven en las vidrieras y en los charcos.

**Medido (GTX 1650, 1440×900, rAF).** Llegada 71 fps, desplazamiento 71, escalinata 48, umbral 48, nave 48. `correrTransiciones()` 21/21. Captura: `capturas/18-entrada-viva-puertas-diamantes.jpg`. Sin teléfono físico. `escena.provocar.ventisca()` y `escena.provocar.fugaz()` sirven para revisarlos sin esperar.

## 2026-10-21 · Lluvia, suelo mojado, corona y diamantes más reales (misma rama; PR #1)

**Pedidos del artista.** Lluvia ligera con animación en el suelo y suelo húmedo; diamantes más realistas y sin el efecto que molestaba; corona más realista; gotas sobre las rosas; sonido de lluvia suave (no ruido blanco).

**Cambios.**
- Lluvia: 2600 trazos (1400 en teléfono) en una caja que acompaña a la cámara, todo en el sombreador; se inclina con el viento y más en la ventisca, se ilumina con los relámpagos y no entra en la capilla ni bajo el pórtico. Salpicaduras sutiles en el suelo. Con movimiento reducido no llueve.
- Suelo mojado (`mojar` en `js/escena.js`): barro más oscuro y brillante en zonas encharcadas y ondas de gotas que se abren y se apagan (solo cerca de la cámara). Los charcos tienen anillos de gotas.
- Rosas: pétalos mojados (rugosidad baja), gotas en el borde de los pétalos que se mecen con su flor, gotas que caen de ellas y la flor que se hunde y rebota al recibir gotas.
- Corona: aro con molduras y dos hileras de perlas, ocho puntas curvadas sobre el aro (flor de lis y lanza), cabujones de rubí en bisel, oro gastado (rayas, suciedad, rugosidad variable) y gotas de lluvia.
- Diamantes: sin destellos que parpadeen ni arcoíris (se quitó el centelleo). Cada faceta refleja y refracta un entorno de tormenta con una dispersión leve: facetas negras, rojas y blancas como una piedra tallada.
- Sonido de lluvia: ruido rosa muy filtrado (220 Hz–2,6 kHz) con un repiqueteo de gotas sueltas; cede como el viento ante la preescucha y calla en las habitaciones; respeta silencio y volumen.

**Medido (GTX 1650, 1440×900, rAF, pantalla de 144 Hz).** Con escala 1: 48 fps en llegada, escalinata y nave (el fotograma queda algo por encima de 13,9 ms y la sincronía lo lleva al siguiente escalón). Con la escala adaptativa a 0,85: 72 fps en llegada, escalinata y nave. Pruebas: `correrAmbiente()` 11/11 (incluye lluvia en la nave y silencio en la habitación), `correrTransiciones()` 21/21, `correr()` 22/22. Sin teléfono físico; nada escuchado.

## 2026-10-22 · Sonido sin elegir, transiciones de puertas para cualquier dispositivo, luna, mirar alrededor y rosales en la capilla (rama `feat/acabado-visual`)

**Pedidos del artista.** Que no haya que elegir el sonido al entrar (ya solo hay ambiente); arreglar las transiciones de las puertas con las imágenes de fondo, que salían mal en dos dispositivos; una luna; que al mover el ratón o el teléfono se vea alrededor; más lianas de rosas en la capilla.

**Cambios.**
- Sonido: se quitaron «Entrar con sonido» y «Sin sonido». El ambiente arranca con el primer gesto real en cualquier parte (los navegadores no dejan sonar antes); un aviso discreto lo indica y desaparece. Si la persona silenció en otra visita (`pde-mudo`), se respeta. Los mandos de sonido gestionan su propio primer toque.
- Transiciones 2–9: ya no se copia el lienzo de la habitación a la GPU ni se convierten colores (era la parte que dependía del dispositivo). La habitación 2D se muestra en la página recortada (`clip-path`) con el contorno del hueco de la puerta proyectado en pantalla (`huecoPantalla` en `js/escena.js`, `recortarHueco` en `js/app.js`); aparece a medida que la puerta se abre y la cámara se alinea, y llena la pantalla en el umbral. La salida hace lo inverso. Además es más ligero en teléfono (sin subir un lienzo a pantalla completa en cada fotograma).
- Luna en el cielo (función del cielo): disco con mares y borde en penumbra, halo rojo, y las nubes la tapan al pasar; se ve también en vidrieras y charcos.
- Mirar alrededor: con el ratón (ordenador) o inclinando el teléfono (giroscopio; en iOS se pide permiso en el primer toque) la vista gira hasta ~19° a los lados y ~8° arriba/abajo, menos dentro de la nave. Sobre una puerta la vista se queda quieta; en las transiciones y con movimiento reducido, al frente.
- Rosales trepadores por la fachada, los contrafuertes, las naves laterales, los costados del pórtico y en guirnalda por el arco, con hojas, ramitas y rosas (sin balanceo: están sujetos al muro). Siete murciélagos rodean el campanario.
- Corrección: tras visitar una habitación antes de que arrancase el sonido, el viento quedaba en silencio para siempre (`salirCancion` sin audio no restauraba su nivel).
- Pruebas: el modo `?captura` arranca su bucle por temporizador (con el panel oculto no arrancaba); la comprobación de la letra usa la clase `listo`; la de la preescucha mira el factor del viento (las ventiscas al azar la hacían inestable).

**Pruebas (navegador integrado, 375×812).** `correrTransiciones()` 21/21; `correrSinSonido()` 6/6; `correrAmbiente()` 11/11 (sonido activado con un clic real en el texto de la llegada); `correr()` y `correrVolumen()` en la misma tanda: todo OK salvo la preescucha antes de corregir su comprobación. Fotogramas compuestos de las ocho puertas (escena + habitación recortada): coherentes de principio a fin.

**Rendimiento.** Con el panel oculto no se puede medir la fluidez real (el navegador pinta una vez por segundo). Coste sincronizado con la GPU (mismo método que `medir()`, 1440×900, escala 1): llegada 22,6 ms frente a 19,9 ms antes de estos añadidos (incluye ~6 ms de sincronización). La escala adaptativa compensa en equipos más lentos. Sin probar en teléfono físico tras estos cambios.

## 2026-10-22 · Sin botones arriba, sonido desde el principio, sin rayas oscuras en el cielo (rama `feat/acabado-visual`)

**Pedido del artista.** Quitar «Canciones» y «Sin sonido»; que quien entre tenga sonido de una; quitar las líneas negras que parecían cables.

**Cambios.**
- Cabecera: solo la marca MAVO. Se quitaron el índice de canciones y el botón general de sonido (con su CSS). En las habitaciones siguen el altavoz y la barra de volumen del reproductor; el silencio ya no se recuerda entre visitas.
- Sonido: al cargar se intenta arrancar el ambiente sin gesto (`intentarActivar` en `js/audio.js`); si el navegador lo permite, suena desde el principio. Si lo bloquea (todos los teléfonos y muchos ordenadores en la primera visita: es una regla del navegador, no se puede saltar), arranca con el primer toque, clic o tecla en cualquier parte, y solo entonces se ve el aviso. En el navegador de pruebas arrancó solo.
- Cielo: las rayas negras eran los murciélagos vistos de canto; se quitaron. La lluvia pasa a mezcla aditiva: solo aclara, nunca se ve como una raya oscura sobre las nubes rojas.

**Pruebas (navegador integrado, 375×812).** `correrAmbiente()`, `correrTransiciones()`, `correr()` y `correrVolumen()` en una tanda: 71/71. Sin teléfono físico.
