# Graph Report - js  (2026-10-17)

## Corpus Check
- 5 files · ~15,631 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 133 nodes · 232 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da7d5f2e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- audio.js
- escena.js
- crearEscena
- entrarCancion
- habitaciones.js
- actualizar
- rampa
- entrar
- pararPre
- activar
- cadenaReverb
- pintarHabitacion
- tick

## God Nodes (most connected - your core abstractions)
1. `crearEscena()` - 31 edges
2. `rampa()` - 12 edges
3. `entrarCancion()` - 8 edges
4. `entrar()` - 7 edges
5. `tick()` - 7 edges
6. `actualizar()` - 7 edges
7. `avisar()` - 6 edges
8. `marcar()` - 6 edges
9. `cambiarCancion()` - 6 edges
10. `cl()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `crearEscena()` --indirect_call--> `actualizar()`  [INFERRED]
  js/escena.js → js/escena.js  _Bridges community 3 → community 6_
- `entrar()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 8_
- `tick()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 13_
- `abrirHabitacion()` --calls--> `pintarHabitacion()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 12 → community 8_
- `activar()` --calls--> `crear()`  [EXTRACTED]
  js/audio.js → js/audio.js  _Bridges community 11 → community 10_

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.10
Nodes (14): atmos, aviso, ayuda, botones, btnIndice, capa, CAPTURA, escena (+6 more)

### Community 1 - "audio.js"
Cohesion: 0.12
Nodes (9): activo, avisos, elementos, inst, NIVEL, pre, REVERB, song (+1 more)

### Community 2 - "escena.js"
Cohesion: 0.16
Nodes (13): altoArco(), anillo(), arco(), B, caja(), contorno(), extruir(), formaU() (+5 more)

### Community 3 - "crearEscena"
Cohesion: 0.18
Nodes (5): crearEscena(), entrar(), quitarVentana(), render(), salir()

### Community 4 - "entrarCancion"
Cohesion: 0.32
Nodes (12): ambiente(), avisar(), cambiarCancion(), detenerPreYa(), entrarCancion(), marcar(), pausar(), playPausa() (+4 more)

### Community 6 - "actualizar"
Cohesion: 0.36
Nodes (9): cl(), actualizar(), actualizarRayo(), dibujarRayo(), estacion(), moverParticulas(), poseScroll(), eio() (+1 more)

### Community 7 - "rampa"
Cohesion: 0.25
Nodes (8): abrirPre(), cerrarPre(), detenerPre(), rampa(), setMudo(), setVolumen(), silencioTotal(), viento()

### Community 8 - "entrar"
Cohesion: 0.40
Nodes (5): abrirHabitacion(), cerrarIndice(), entrar(), espera(), pintarPlay()

### Community 9 - "pararPre"
Cohesion: 0.40
Nodes (5): alternarMudo(), avisar(), iniciarPre(), pararPre(), pintarSonido()

### Community 10 - "activar"
Cohesion: 0.40
Nodes (5): activar(), cargarCancion(), fuentePre(), fuenteSong(), prepararPre()

### Community 11 - "cadenaReverb"
Cohesion: 0.40
Nodes (5): cadenaReverb(), crear(), impulso(), sala(), verificarReverb()

### Community 12 - "pintarHabitacion"
Cohesion: 0.50
Nodes (4): cambiar(), irAPuerta(), pintarHabitacion(), pintarRango()

### Community 13 - "tick"
Cohesion: 0.67
Nodes (4): cl(), colocarPuertas(), progreso(), tick()

## Knowledge Gaps
- **25 isolated node(s):** `hab`, `llegada`, `capa`, `velo`, `escena` (+20 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 53 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `crearEscena()` connect `crearEscena` to `app.js`, `escena.js`, `actualizar`?**
  _High betweenness centrality (0.298) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `crearEscena()` (e.g. with `actualizar()` and `entrar()`) actually correct?**
  _`crearEscena()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `hab`, `llegada`, `capa` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `CANCIONES` connect `audio.js` to `app.js`, `escena.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `audio.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `crearAtmosfera()` connect `habitaciones.js` to `app.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._