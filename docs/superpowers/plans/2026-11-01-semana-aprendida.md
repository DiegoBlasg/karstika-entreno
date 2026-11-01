# La semana que la app aprende — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preguntar en Yo cuántos días se entrena por semana, aprender de las sesiones registradas qué días/franja/contexto, y pasar al motor los huecos supuestos del resto de la semana al generar; mostrarlo en Semana.

**Architecture:** `lib/datos/semana-supuesta.ts` (puro): `habitos`, `diasObjetivo`, `semanaSupuesta`, `lineaSemanaSupuesta`. `prepararPropuesta` calcula los huecos con `semanaSupuesta`. Perfil gana `dias_semana` (migración 006). P-74 en `parametros.md`.

**Tech Stack:** TypeScript, Next.js Server Actions, Neon, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-semana-aprendida-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `semana-aprendida`; español; commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Valores: historial 6 semanas, mínimo 3 semanas con sesión para usar la media, `3-4`/`5-6` sin historial → mínimo del rango, tope 8 huecos (P-67).
- Textos: citan el motivo (prudencia), nunca «decisión de diseño».
- Migración 006 en TEST antes de los e2e; en PROD antes del push.

---

### Task 1: Dato y Yo
- [ ] `migraciones/006_dias_semana.sql`; `FilaPerfil.dias_semana?: DiasSemana | null`; select/upsert en `lib/servidor/consultas.ts`; `FormularioPerfil` con `Opciones` («¿Cuántos días sueles entrenar por semana?», 1 · 2 · 3–4 · 5–6 · Todos, opcional); `app/(app)/perfil/acciones.ts` lee `dias_semana` con `opcionOpcional`; `probar-bd` + caso «perfil con días desconocidos»; `npm run migrar:pruebas && npm run probar-bd`.

### Task 2: Lo aprendido y los huecos supuestos (TDD)
- [ ] Tests `lib/datos/semana-supuesta.test.ts`: sin respuesta → []; `3-4` sin historial → 3 objetivo, huecos espaciados con el contexto de la entrada; con 3+ semanas de historial (martes tarde con gente 120, jueves tarde solo 90) → esos días con su franja y contexto; días con sesión fuera; objetivo cubierto → []; tope 8; fuera de temporada fuera; `diasObjetivo` para cada respuesta.
- [ ] Implementar `lib/datos/semana-supuesta.ts`; `prepararPropuesta` usa `semanaSupuesta` (solo si hay huecos); test en `peticion.test.ts`: con respuesta e historial, `propuesta.semana` presente.
- [ ] P-74 en `parametros.md` + `VALORES['P-74'] = { semanasHistorial: 6, semanasMinimas: 3 }`; metadatos 73 → 74, diseño 38 → 39; test de parámetros.

### Task 3: Semana
- [ ] `lineaSemanaSupuesta(d, hoy): string | null` y la línea en `app/(app)/semana/page.tsx` (solo esta semana).
- [ ] e2e: contestar «3–4» en Yo y ver la línea en Semana.
- [ ] `npm run tsc && npm test && npm run build`; e2e en worktree temporal.
