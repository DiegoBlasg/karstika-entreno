# Batería de tests sin dinamómetro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Test de dedos con colgado continuo 30 mm y power slap, «test en casa» (dominadas máximas y cadera), cambio real por prueba y tarjeta «Tus tests» en Progreso.

**Architecture:** Motor: plantilla del test, tipo `test-casa` (plantilla, lugar casa, propuesto como principal tras un test de dedos), `EvaluacionDedos` con `colgado30S`/`powerSlapCm`, P-19 con umbrales y `diagnosticar` con ellos. Cronómetro: `fallo` continuo. Datos: migración 007, `pruebasCasa`, acciones de guardado. UI: resultado del test, resultado del test en casa, formularios de Progreso y tarjeta «Tus tests».

**Tech Stack:** TypeScript, Next.js Server Actions, Neon, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-bateria-tests-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `bateria-tests`; español; commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Umbrales (P-19): fuerza 10 %, colgado 25 %, power slap 10 cm, dominadas 2, cadera 3 cm (menos es mejor), técnica 1 punto; o la misma dirección en 3 tests seguidos.
- Textos con la fuente o el motivo (nunca «decisión de diseño»).
- Migración 007 en TEST antes de e2e y en PROD antes del push.

---

### Task 1: Datos — migración 007, filas, consultas y probar-bd
- [ ] `migraciones/007_bateria_tests.sql`; `FilaEvaluacion` + `colgado_30_s`, `power_slap_cm`; `FilaPruebaCasa`; `DatosAtleta.pruebasCasa`; `cargarDatos`, `insertarEvaluacion`, `insertarPruebaCasa`, `borrarPruebaCasaBd`; `_fabrica.datosVacios` con `pruebasCasa: []`; casos en `probar-bd`; `npm run migrar:pruebas && npm run probar-bd`.

### Task 2: Motor — evaluación, P-19 y diagnóstico
- [ ] `EvaluacionDedos` + `colgado30S?`, `powerSlapCm?` (validados); `mapeo.evaluacionMotor`; `VALORES['P-19']` con los umbrales; `progreso()` con umbral relativo/absoluto y «3 en la misma dirección»; `diagnosticar` usa fuerza 10 % y la serie de `colgado30S` para resistencia; P-19 en `parametros.md`; tests.

### Task 3: Motor — plantilla del test y `test-casa`
- [ ] Plantilla de `evaluacion-dedos`: colgado continuo 30 mm (`trabajoS` 600, `continuo: true`, `hastaFallo`) y power slap (manual); `test-casa` (tipo, nombre, lugar casa, plantilla 15 min, cuándo: evaluación de dedos en los 10 días anteriores sin `test-casa` después → principal en casa); fichas `colgado-30mm`, `power-slap`, `dominadas-maximas`, `apertura-cadera`; tests.

### Task 4: Cronómetro y resultados
- [ ] `pasos`: `fallo` continuo (sin descanso, con `continuo`); `Cronometro`: cuenta hacia arriba, sin «Cuelga: n s», sin carga del 7:3; `FormularioResultadoTest` con colgado y power slap; `FormularioResultadoCasa` y acción `guardarPruebaCasa`; tests.

### Task 5: Progreso
- [ ] `lib/datos/tests.ts` `vistaTests(d, hoy)` (filas por prueba con último valor, cambio, cambio real); tarjeta `TusTests`; formulario de evaluación con colgado y power slap; formulario «Test en casa»; tests.

### Task 6: Verificación y publicación
- [ ] tsc, tests, build, e2e en worktree; revisión independiente; migrar PROD; merge y push.
