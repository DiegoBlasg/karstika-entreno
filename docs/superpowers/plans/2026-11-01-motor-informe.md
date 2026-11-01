# El informe de ejercicios en el motor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resistencia 10:6 al 60 % hasta 24, ARC alterno (continuo / on-offs), subida de carga en dedos con 2 sesiones válidas y +1,25 kg/semana, dominadas alternas (lastradas / potencia) y técnica con vía de práctica.

**Architecture:** Cambios localizados en `motor/plantillas.ts` (plantillas y `progresionMultipresa`), `motor/parametros.ts` + `docs/evidencia/parametros.md` (P-11, P-35, P-36, P-54, P-73 nuevo), `lib/cronometro/{pasos,reloj}.ts` (fallo con máximo de repeticiones) y `lib/biblioteca/fichas.ts` (fichas nuevas). Alternancias por recuento en el historial, como `rutinaHombro`.

**Tech Stack:** TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-motor-informe-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `motor-informe`. Español en textos, comentarios y commits; commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Cada número del motor sale de `VALORES` y cita su parámetro; lo que no tiene fuente se marca «decisión de diseño».
- La base sigue sin multipresa. Los cupos de fase no cambian.
- `npm run tsc` y `npm test` en verde al final de cada tarea; si cambia un texto de `parametros.md`, `npm run metadatos`.

---

### Task 1: Cronómetro — `fallo` con máximo de repeticiones

**Files:** `motor/propuesta-tipos.ts` (Ejercicio `hastaFallo?: boolean`), `lib/cronometro/pasos.ts`, `lib/cronometro/pasos.test.ts`, `lib/cronometro/reloj.test.ts`.

- [ ] Test (`pasos.test.ts`):
```ts
it('series hasta el fallo con máximo: un paso «fallo» por serie con maxRepeticiones y descanso entre series', () => {
  const e = { nombre: 'Susp 10:6', series: 2, repeticiones: 24, trabajoS: 10, descansoS: 6, descansoSeriesS: 360, hastaFallo: true, cargaTexto: 'x' }
  const pasos = pasosDeSesion({ sesion: SESION, bloques: [{ nombre: 'R', minutos: 25, ejercicios: [e], explicacion: EXP }], explicaciones: [] })
  expect(pasos.map((p) => p.tipo)).toEqual(['preparate', 'fallo', 'descanso', 'fallo'])
  expect(pasos[1]).toMatchObject({ tipo: 'fallo', trabajoS: 10, descansoS: 6, maxRepeticiones: 24, titulo: 'Serie 1 de 2 · hasta 24 repeticiones' })
  expect(segundosDe(pasos[1]!)).toBe(24 * 16 - 6)
})
```
(`SESION`, `EXP`: los fixtures que ya use el archivo.) En `reloj.test.ts`: con un `fallo` de máximo 2 (10:6), `tick` a 26 s avanza al paso siguiente.
- [ ] Implementar: `Paso` `fallo` gana `maxRepeticiones?: number`; `segundosDe`: `p.tipo === 'fallo' ? (p.maxRepeticiones ? p.maxRepeticiones * (p.trabajoS + p.descansoS) - p.descansoS : null)`; en `pasosDeEjercicio`, si `e.hastaFallo && series && repeticiones && trabajoS && descansoS !== undefined`: preparate + por serie `{ tipo: 'fallo', trabajoS, descansoS, maxRepeticiones: repeticiones, titulo: \`Serie ${s} de ${series} · hasta ${repeticiones} repeticiones\`, carga }` + `entreSeries(s)`.
- [ ] Revisar `Cronometro.tsx`: `restante` de un `fallo` sigue saliendo de `faseFallo`; el texto «hasta el fallo» vale. Sin cambios salvo que tsc lo pida.
- [ ] `npm run tsc && npm test`. Commit `feat(cronometro): series hasta el fallo con máximo de repeticiones`.

### Task 2: Resistencia 10:6 al 60 % (P-36)

**Files:** `docs/evidencia/parametros.md` (P-36), `motor/parametros.ts`, `motor/parametros.test.ts`, `motor/plantillas.ts` (`construirMultipresaResistenciaFuerza`), `motor/plantillas.test.ts`, `lib/biblioteca/fichas.ts` (+`resistencia-10-6`), `lib/biblioteca/fichas.test.ts`, `lib/biblioteca/plantillas.test.ts`.

- [ ] `parametros.md` P-36, valor: `10 s colgado : 6 s descanso al 60 % de la fuerza máxima, hasta 24 repeticiones por serie, 2 series, 6 min entre series, 2 sesiones por semana` (Devise 2022 F60, A); notas: F80 (10:6 al 80 %, hasta 12, 3 series, 8 min) y el 10:5 de EV-RESIST-003 quedan como alternativas no usadas; la carga es fija al 60 % del test vigente (el ensayo no la reajustó); sin test, «la carga con la que completas casi toda la primera serie» (diseño). `VALORES['P-36'] = { trabajoS: 10, descansoS: 6, repeticiones: 24, series: 2, descansoSeriesS: 360, fraccion: 0.6 }`. Test de `parametros.test.ts` actualizado.
- [ ] Plantilla: series = descarga ? 1 : 2; `kg = evaluacionVigente(...) ? lastreRepeaters(e, VALORES['P-36'].fraccion) : undefined`; ejercicio con `hastaFallo: true`, `ficha: 'resistencia-10-6'`; minutos = ceil((series·(24·16−6) + (series−1)·360)/60/5)·5; explicación con el protocolo y «60 % fijo del test vigente». Test de `plantillas.test.ts`: 10:6, 24, 2 series, 360 s, 60 %, descarga 1 serie, cita P-36.
- [ ] Ficha `resistencia-10-6` (P-36, P-09, P-10 + SEGURIDAD): pasos con 10 s/6 s, hasta 24, 2 series, 6 min, 60 %. Quitar `resistencia-fuerza-10-5` si nada la usa (ajustar los tests que la listan).
- [ ] `npm run metadatos && npm run tsc && npm test`. Commit `feat(motor): resistencia en multipresa 10:6 al 60 % hasta 24 (P-36, Devise 2022)`.

### Task 3: ARC alterno (P-35)

**Files:** `parametros.md` (P-35), `motor/parametros.ts`, tests, `motor/plantillas.ts` (`construirArc`, `rutinaArc`), `motor/plantillas.test.ts`, ficha `on-offs`.

- [ ] P-35 valor: `1 sesión por semana alternando: A) escalada continua sin bombeo marcado, 2-3 series de 15 min (2 × 10 si no hay tiempo) con 10 min de descanso; B) on-offs, 10 × (1 min escalando / 1 min de descanso) unos 2 grados por debajo del a vista`; nivel C (Lattice, Anderson) + diseño. `VALORES['P-35'] = { minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10, seriesMax: 3, seriesMin: 2, onOffs: 10 }`.
- [ ] `export function rutinaArc(p): 'A' | 'B'` = previas ARC antes de hoy % 2 (0 → A). `construirArc`: B si `rutinaArc === 'B'` y caben `CALENTAMIENTO_MIN + 2·onOffs` min (descarga: 5 repeticiones); si no, A: 3 series de 15 si caben (75), si no 2 de 15 (50), si no 2 de 10 (40); descarga: 2 series. Tests: alternancia A/B por historial, 3 series con 90 min, 2 con 60, B con 30 min, B en descarga con 5.
- [ ] Ficha `on-offs`. `npm run metadatos && npm run tsc && npm test`. Commit `feat(motor): ARC alterno continuo / on-offs (P-35)`.

### Task 4: Subir carga despacio (P-11)

**Files:** `parametros.md` (P-11), `motor/parametros.ts`, `motor/plantillas.ts` (`progresionMultipresa`), `motor/plantillas.test.ts` o el test de progresión existente.

- [ ] P-11 valor: `Solo se sube tras 2 sesiones de multipresa seguidas completadas con RPE dentro del objetivo y dolor 0-1, como mucho una vez por semana y como mucho +1,25 kg; nunca bajando de regleta` (A, Mundry 2021; C, Lattice). `VALORES['P-11'] = { sesionesValidasParaSubir: 2, kgMaxSemana: 1.25 }`.
- [ ] En `progresionMultipresa`: al pasar de la fracción inicial (70 %) a la máxima (80 %), la carga es `min(kg80, kg70 + 1,25 × k)`, con `k` = semanas naturales (desde el cambio) en las que hubo una sesión válida precedida de otra válida (como mucho 1 por semana). Devolver `kg` ya con la rampa y `porcentaje` real (redondeado). Tests: justo tras el cambio con 1 válida → kg70 + 0 o +1,25 según la regla; 2 válidas seguidas en dos semanas → +2,5; una no válida en medio → no sube esa semana; nunca pasa de kg80.
- [ ] `npm run metadatos && npm run tsc && npm test` (la simulación de temporada en verde). Commit `feat(motor): la carga de dedos sube como mucho 1,25 kg por semana y tras 2 sesiones válidas (P-11, Mundry 2021)`.

### Task 5: Dominadas alternas (P-39 + P-73)

**Files:** `parametros.md` (P-73 nuevo), `motor/parametros.ts`, metadatos test (72→73, diseño 37→38), `motor/plantillas.ts` (`construirDominadas`, `rutinaDominadas`), tests, fichas `dominadas-explosivas`, `dominadas-excentricas`.

- [ ] P-73: `Dominadas de potencia (alternando con las lastradas de P-39): explosivas 4 × 3-5 lejos del fallo con 3 min de descanso y excéntricas 3 × 3-5 bajadas de 3-5 s con 2 min; mismas reglas que P-39` | sinEvidencia | sinEvidencia (indirecta A) | Vigouroux y Devise 2024 (avanzados, 2/semana, 5 semanas) fija el tipo; series y repeticiones son decisión de diseño. `VALORES['P-73'] = { explosivas: { series: 4, repeticiones: '3-5', descansoMin: 3 }, excentricas: { series: 3, repeticiones: '3-5', bajadaS: '3-5', descansoMin: 2 } }`.
- [ ] `rutinaDominadas(p)` = previas dominadas % 2. B: calentamiento 10 + bloque «Potencia en barra» 15 (dos ejercicios, fichas nuevas) + vuelta a la calma 5 = 30. Tests: alterna, B cita P-73 y dura 30.
- [ ] `npm run metadatos && npm run tsc && npm test`. Commit `feat(motor): dominadas alternas lastradas / potencia (P-73, Vigouroux 2024)`.

### Task 6: Técnica con vía de práctica (P-54)

**Files:** `parametros.md` (P-54), tests de parámetros, `motor/plantillas.ts` (`construirTecnica`), `motor/plantillas.test.ts`, ficha `via-de-practica`.

- [ ] P-54 valor: `En cada sesión técnica, una vía de práctica repetida hasta que fluya (como mucho unas 7 sesiones; después, otra) y 1-2 vías nuevas parecidas` + Hacques 2022 (A) en notas.
- [ ] Plantilla: ejercicios «Tu vía de práctica: 2-3 pegues buscando que salga fluida…» (`via-de-practica`), «1-2 vías nuevas parecidas, a vista» (`practica-tecnica`), previsualización y vídeo. Test.
- [ ] `npm run metadatos && npm run tsc && npm test`. Commit `feat(motor): técnica con vía de práctica y vías nuevas (P-54, Hacques 2022)`.

### Task 7: Verificación

- [ ] `npm run build`; e2e en worktree temporal con `npm ci` (no junction); todo verde.
- [ ] Dos revisiones independientes (motor y uso real) antes de publicar.
