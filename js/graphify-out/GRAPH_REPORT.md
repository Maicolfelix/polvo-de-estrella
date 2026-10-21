# Graph Report - js  (2026-10-21)

## Corpus Check
- 9 files · ~32,804 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 178 nodes · 341 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `28cb330b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- audio.js
- letras.js
- crearEscena
- entrarCancion
- habitaciones.js
- crearSalaMar
- rampa
- mostrarHueco
- alGirar
- escena.js
- actualizar
- entrar
- tick
- alternarMudo
- arco
- activar

## God Nodes (most connected - your core abstractions)
1. `crearEscena()` - 44 edges
2. `crearSalaMar()` - 12 edges
3. `actualizar()` - 11 edges
4. `rampa()` - 10 edges
5. `tick()` - 9 edges
6. `entrar()` - 8 edges
7. `entrarCancion()` - 8 edges
8. `contorno()` - 8 edges
9. `cl()` - 7 edges
10. `arco()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `pintarLetra()` --calls--> `lineasPresentacion()`  [EXTRACTED]
  js/app.js → js/letras.js
- `crearSalaMar()` --calls--> `arco()`  [EXTRACTED]
  js/sala-mar.js → js/escena.js
- `crearEscena()` --calls--> `crearPrimerPlano()`  [EXTRACTED]
  js/escena.js → js/primer-plano.js
- `crearEscena()` --calls--> `crearSalaMar()`  [EXTRACTED]
  js/escena.js → js/sala-mar.js
- `crearSalaMar()` --calls--> `tex()`  [EXTRACTED]
  js/sala-mar.js → js/escena.js

## Import Cycles
- None detected.

## Communities (17 total, 1 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.09
Nodes (18): atmos, aviso, ayuda, botones, btnSeguir, capa, CAPTURA, escena (+10 more)

### Community 1 - "audio.js"
Cohesion: 0.12
Nodes (8): activo, avisos, elementos, FUNDIDO, NIVEL, pre, song, ultimoViento

### Community 2 - "letras.js"
Cohesion: 0.40
Nodes (4): CANCIONES, DUDAS, EDICIONES, lineasPresentacion()

### Community 3 - "crearEscena"
Cohesion: 0.17
Nodes (7): crearEscena(), aplicarResolucion(), camaraSala(), medirFotograma(), precompilar(), render(), tamano()

### Community 4 - "entrarCancion"
Cohesion: 0.30
Nodes (12): avisar(), cambiarCancion(), cargarCancion(), detenerPreYa(), entrarCancion(), fuenteSong(), marcar(), pausar() (+4 more)

### Community 6 - "crearSalaMar"
Cohesion: 0.27
Nodes (11): anillo(), contorno(), huecoPantalla(), tex(), envejecer(), extruir(), formaU(), uvMundo() (+3 more)

### Community 7 - "rampa"
Cohesion: 0.33
Nodes (9): abrirPre(), ceder(), cerrarPre(), detenerPre(), lluvia(), rampa(), salirCancion(), silencioTotal() (+1 more)

### Community 8 - "mostrarHueco"
Cohesion: 0.50
Nodes (4): mostrarHueco(), quitarHueco(), recortarHueco(), volver()

### Community 9 - "alGirar"
Cohesion: 0.50
Nodes (4): alGirar(), anguloPantalla(), despertarSonido(), pedirGiro()

### Community 10 - "escena.js"
Cohesion: 0.15
Nodes (12): altoArco(), B, caja(), LLUVIA_T, mojar(), MOVIL, RAFAGA, texturaAlfombra() (+4 more)

### Community 11 - "actualizar"
Cohesion: 0.27
Nodes (11): cl(), actualizar(), actualizarRayo(), actualizarSala(), dibujarRayo(), estacion(), moverParticulas(), orientar() (+3 more)

### Community 12 - "entrar"
Cohesion: 0.25
Nodes (9): abrirHabitacion(), cambiar(), entrar(), espera(), irAPuerta(), pintarHabitacion(), pintarLetra(), pintarPlay() (+1 more)

### Community 13 - "tick"
Cohesion: 0.33
Nodes (7): actualizarLetra(), centrar(), cl(), colocarPuertas(), lineaActiva(), progreso(), tick()

### Community 14 - "alternarMudo"
Cohesion: 0.29
Nodes (8): alternarMudo(), avisar(), guardar(), iniciarPre(), pararPre(), pintarSonido(), ponerVol(), silenciado()

### Community 15 - "arco"
Cohesion: 0.43
Nodes (5): arco(), mecer(), crearPrimerPlano(), cabeza(), petalo()

### Community 16 - "activar"
Cohesion: 0.25
Nodes (9): activar(), crear(), fuentePre(), fundir(), intentarActivar(), prepararPre(), sala(), setMudo() (+1 more)

## Knowledge Gaps
- **33 isolated node(s):** `CAPTURA`, `hab`, `llegada`, `capa`, `velo` (+28 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 61 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `crearEscena()` connect `crearEscena` to `app.js`, `crearSalaMar`, `escena.js`, `actualizar`, `arco`?**
  _High betweenness centrality (0.324) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `crearEscena()` (e.g. with `actualizar()` and `actualizarSala()`) actually correct?**
  _`crearEscena()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CAPTURA`, `hab`, `llegada` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `CANCIONES` connect `letras.js` to `app.js`, `audio.js`, `escena.js`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `audio.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `crearSalaMar()` connect `crearSalaMar` to `escena.js`, `crearEscena`, `arco`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._