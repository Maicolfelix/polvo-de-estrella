# Graph Report - js  (2026-10-17)

## Corpus Check
- 5 files · ~16,926 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 158 nodes · 273 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4e0ed67`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- audio.js
- crearEscena
- pintarPanel
- entrarCancion
- habitaciones.js
- abrirPre
- rampa
- entrar
- pararPre
- activar
- crear
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
- `entrar()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 8_
- `tick()` --calls--> `pararPre()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 9 → community 13_
- `abrirHabitacion()` --calls--> `pintarHabitacion()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 12 → community 8_
- `pintarPanel()` --calls--> `pintarRango()`  [EXTRACTED]
  js/app.js → js/app.js  _Bridges community 12 → community 3_
- `verificarCancion()` --calls--> `cadenaCancion()`  [EXTRACTED]
  js/audio.js → js/audio.js  _Bridges community 11 → community 10_

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.08
Nodes (24): atmos, aviso, ayuda, botones, btnIndice, btnPanel, capa, CAPTURA (+16 more)

### Community 1 - "audio.js"
Cohesion: 0.09
Nodes (12): activo, avisos, elementos, EQ, ESPACIO, inst, NIVEL, pre (+4 more)

### Community 2 - "crearEscena"
Cohesion: 0.09
Nodes (28): CANCIONES, altoArco(), anillo(), arco(), B, caja(), cl(), contorno() (+20 more)

### Community 3 - "pintarPanel"
Cohesion: 0.40
Nodes (5): abrirPanel(), cargarPrefs(), conSigno(), leer(), pintarPanel()

### Community 4 - "entrarCancion"
Cohesion: 0.29
Nodes (13): ambiente(), avisar(), cambiarCancion(), cargarCancion(), detenerPreYa(), entrarCancion(), marcar(), pausar() (+5 more)

### Community 7 - "rampa"
Cohesion: 0.25
Nodes (9): cerrarPre(), detenerPre(), nivelInst(), ponerPreferencias(), rampa(), setMudo(), setVolumen(), silencioTotal() (+1 more)

### Community 8 - "entrar"
Cohesion: 0.40
Nodes (5): abrirHabitacion(), cerrarIndice(), entrar(), espera(), pintarPlay()

### Community 9 - "pararPre"
Cohesion: 0.40
Nodes (5): alternarMudo(), avisar(), iniciarPre(), pararPre(), pintarSonido()

### Community 10 - "activar"
Cohesion: 0.40
Nodes (5): activar(), fuentePre(), fuenteSong(), prepararPre(), verificarCancion()

### Community 11 - "crear"
Cohesion: 0.29
Nodes (7): cadenaCancion(), cadenaReverb(), crear(), impulso(), irEspacio(), sala(), verificarReverb()

### Community 12 - "pintarHabitacion"
Cohesion: 0.50
Nodes (4): cambiar(), irAPuerta(), pintarHabitacion(), pintarRango()

### Community 13 - "tick"
Cohesion: 0.67
Nodes (4): cl(), colocarPuertas(), progreso(), tick()

## Knowledge Gaps
- **35 isolated node(s):** `hab`, `llegada`, `capa`, `velo`, `escena` (+30 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 63 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `crearEscena()` connect `crearEscena` to `app.js`?**
  _High betweenness centrality (0.256) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `crearEscena()` (e.g. with `actualizar()` and `entrar()`) actually correct?**
  _`crearEscena()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `hab`, `llegada`, `capa` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07977207977207977 - nodes in this community are weakly interconnected._
- **Why does `CANCIONES` connect `crearEscena` to `app.js`, `audio.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `audio.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Why does `crearAtmosfera()` connect `habitaciones.js` to `app.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._