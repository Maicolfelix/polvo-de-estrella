# Graph Report - js  (2026-10-17)

## Corpus Check
- 5 files · ~15,990 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 138 nodes · 242 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3006e01`
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
- alternarMudo
- contorno

## God Nodes (most connected - your core abstractions)
1. `crearEscena()` - 31 edges
2. `rampa()` - 9 edges
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
- `alternarMudo()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 14_
- `entrar()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 8_
- `tick()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 13_
- `abrirHabitacion()` --calls--> `pintarHabitacion()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 12 → community 8_

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.11
Nodes (14): atmos, aviso, ayuda, botones, btnIndice, capa, CAPTURA, escena (+6 more)

### Community 1 - "audio.js"
Cohesion: 0.11
Nodes (9): activo, avisos, elementos, FUNDIDO, inst, NIVEL, pre, REVERB (+1 more)

### Community 2 - "escena.js"
Cohesion: 0.17
Nodes (10): CANCIONES, altoArco(), B, caja(), extruir(), MOVIL, texturaGradiente(), texturaPlaca() (+2 more)

### Community 3 - "crearEscena"
Cohesion: 0.18
Nodes (5): crearEscena(), entrar(), quitarVentana(), render(), salir()

### Community 4 - "entrarCancion"
Cohesion: 0.29
Nodes (13): ambiente(), avisar(), cambiarCancion(), cargarCancion(), detenerPreYa(), entrarCancion(), marcar(), pausar() (+5 more)

### Community 6 - "actualizar"
Cohesion: 0.36
Nodes (9): cl(), actualizar(), actualizarRayo(), dibujarRayo(), estacion(), moverParticulas(), poseScroll(), eio() (+1 more)

### Community 7 - "rampa"
Cohesion: 0.33
Nodes (6): abrirPre(), cerrarPre(), detenerPre(), rampa(), silencioTotal(), viento()

### Community 8 - "entrar"
Cohesion: 0.40
Nodes (5): abrirHabitacion(), cerrarIndice(), entrar(), espera(), pintarPlay()

### Community 9 - "pararPre"
Cohesion: 0.67
Nodes (3): avisar(), iniciarPre(), pararPre()

### Community 10 - "activar"
Cohesion: 0.29
Nodes (7): activar(), fuentePre(), fuenteSong(), fundir(), prepararPre(), setMudo(), setVolumen()

### Community 11 - "cadenaReverb"
Cohesion: 0.40
Nodes (5): cadenaReverb(), crear(), impulso(), sala(), verificarReverb()

### Community 12 - "pintarHabitacion"
Cohesion: 0.50
Nodes (4): cambiar(), irAPuerta(), pintarHabitacion(), pintarRango()

### Community 13 - "tick"
Cohesion: 0.67
Nodes (4): cl(), colocarPuertas(), progreso(), tick()

### Community 14 - "alternarMudo"
Cohesion: 0.50
Nodes (5): alternarMudo(), guardar(), pintarSonido(), ponerVol(), silenciado()

### Community 15 - "contorno"
Cohesion: 0.50
Nodes (4): anillo(), arco(), contorno(), formaU()

## Knowledge Gaps
- **26 isolated node(s):** `hab`, `llegada`, `capa`, `velo`, `escena` (+21 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 54 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `crearEscena()` connect `crearEscena` to `app.js`, `escena.js`, `actualizar`, `contorno`?**
  _High betweenness centrality (0.289) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `crearEscena()` (e.g. with `actualizar()` and `entrar()`) actually correct?**
  _`crearEscena()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `hab`, `llegada`, `capa` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `CANCIONES` connect `escena.js` to `app.js`, `audio.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `audio.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `crearAtmosfera()` connect `habitaciones.js` to `app.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._