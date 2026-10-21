# Graph Report - js  (2026-10-21)

## Corpus Check
- 9 files · ~23,892 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 163 nodes · 306 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8474d95`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- audio.js
- letras.js
- crearEscena
- entrarCancion
- habitaciones.js
- escena.js
- rampa
- entrar
- pararPre
- activar
- crearPrimerPlano
- pintarHabitacion
- tick
- alternarMudo
- crearSalaMar
- actualizar

## God Nodes (most connected - your core abstractions)
1. `crearEscena()` - 40 edges
2. `crearSalaMar()` - 12 edges
3. `actualizar()` - 11 edges
4. `tick()` - 8 edges
5. `rampa()` - 8 edges
6. `contorno()` - 8 edges
7. `entrar()` - 7 edges
8. `entrarCancion()` - 7 edges
9. `render()` - 7 edges
10. `avisar()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `crearSalaMar()` --calls--> `tex()`  [EXTRACTED]
  js/sala-mar.js → js/escena.js
- `crearEscena()` --calls--> `crearPrimerPlano()`  [EXTRACTED]
  js/escena.js → js/primer-plano.js
- `crearEscena()` --calls--> `crearSalaMar()`  [EXTRACTED]
  js/escena.js → js/sala-mar.js
- `pintarLetra()` --calls--> `lineasPresentacion()`  [EXTRACTED]
  js/app.js → js/letras.js
- `crearSalaMar()` --calls--> `arco()`  [EXTRACTED]
  js/sala-mar.js → js/escena.js

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.08
Nodes (18): atmos, aviso, ayuda, botones, btnIndice, btnSeguir, capa, CAPTURA (+10 more)

### Community 1 - "audio.js"
Cohesion: 0.11
Nodes (11): activo, avisos, elementos, FUNDIDO, fundir(), NIVEL, pre, setMudo() (+3 more)

### Community 2 - "letras.js"
Cohesion: 0.50
Nodes (3): CANCIONES, DUDAS, EDICIONES

### Community 3 - "crearEscena"
Cohesion: 0.16
Nodes (12): crearEscena(), aplicarResolucion(), camaraSala(), entrar(), medirFotograma(), ponerEnPuerta(), ponerPortal(), precompilar() (+4 more)

### Community 4 - "entrarCancion"
Cohesion: 0.38
Nodes (10): avisar(), cambiarCancion(), detenerPreYa(), entrarCancion(), marcar(), pausar(), playPausa(), reproducir() (+2 more)

### Community 6 - "escena.js"
Cohesion: 0.20
Nodes (8): altoArco(), anillo(), B, caja(), MOVIL, texturaGradiente(), texturaPlaca(), texturaRadial()

### Community 7 - "rampa"
Cohesion: 0.36
Nodes (8): abrirPre(), ceder(), cerrarPre(), detenerPre(), rampa(), salirCancion(), silencioTotal(), viento()

### Community 8 - "entrar"
Cohesion: 0.40
Nodes (5): abrirHabitacion(), cerrarIndice(), entrar(), espera(), pintarPlay()

### Community 9 - "pararPre"
Cohesion: 0.67
Nodes (3): avisar(), iniciarPre(), pararPre()

### Community 10 - "activar"
Cohesion: 0.29
Nodes (7): activar(), cargarCancion(), crear(), fuentePre(), fuenteSong(), prepararPre(), sala()

### Community 11 - "crearPrimerPlano"
Cohesion: 1.00
Nodes (3): crearPrimerPlano(), cabeza(), petalo()

### Community 12 - "pintarHabitacion"
Cohesion: 0.33
Nodes (6): cambiar(), irAPuerta(), pintarHabitacion(), pintarLetra(), pintarRango(), lineasPresentacion()

### Community 13 - "tick"
Cohesion: 0.33
Nodes (7): actualizarLetra(), centrar(), cl(), colocarPuertas(), lineaActiva(), progreso(), tick()

### Community 14 - "alternarMudo"
Cohesion: 0.50
Nodes (5): alternarMudo(), guardar(), pintarSonido(), ponerVol(), silenciado()

### Community 15 - "crearSalaMar"
Cohesion: 0.40
Nodes (9): arco(), contorno(), envejecer(), extruir(), formaU(), uvMundo(), crearSalaMar(), actualizar() (+1 more)

### Community 16 - "actualizar"
Cohesion: 0.31
Nodes (10): cl(), actualizar(), actualizarRayo(), actualizarSala(), dibujarRayo(), estacion(), moverParticulas(), poseScroll() (+2 more)

## Knowledge Gaps
- **30 isolated node(s):** `CAPTURA`, `hab`, `llegada`, `capa`, `velo` (+25 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 56 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `crearEscena()` connect `crearEscena` to `app.js`, `escena.js`, `crearPrimerPlano`, `crearSalaMar`, `actualizar`?**
  _High betweenness centrality (0.331) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `crearEscena()` (e.g. with `actualizar()` and `actualizarSala()`) actually correct?**
  _`crearEscena()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CAPTURA`, `hab`, `llegada` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `CANCIONES` connect `letras.js` to `app.js`, `audio.js`, `escena.js`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `audio.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._
- **Why does `crearSalaMar()` connect `crearSalaMar` to `crearEscena`, `escena.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._