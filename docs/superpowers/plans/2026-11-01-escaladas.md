# Escaladas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apuntar encadenes y proyectos (registro de sesiones al límite y Progreso), «Tu nivel» en Progreso y la pista de lectura/táctica (P-75).

**Architecture:** Tabla `escaladas` (migración 008); `lib/escaladas/grados.ts` (escala, ya hecha) y `lib/escaladas/nivel.ts` (puro: nivel, proyectos, pista); acciones en `_hoy/acciones.ts` (registro) y `progreso/acciones.ts` (sueltas); UI `CamposEscaladas`, `TuNivel`, `FormularioEscalada`.

**Tech Stack:** TypeScript, Next.js Server Actions, Neon, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-01-escaladas-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `escaladas-2`; español; commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Ventana 90 días; pista con 4 escalones (2 grados); objetivo desde roca, si no rocódromo, si no perfil; fecha suelta hasta 30 días atrás; como mucho 5 encadenes por registro; pegues 1-50; nombre 1-80.
- Textos con la fuente o el motivo (nunca «decisión de diseño»). El motor no cambia.
- Migración 008 en TEST antes de e2e y en PROD antes del push.

---

### Task 1: Datos
- [ ] `migraciones/008_escaladas.sql`; `FilaEscalada` y `DatosAtleta.escaladas?`; `cargarDatos`; `insertarEscaladas`, `reemplazarEscaladasDeSesion`, `borrarEscaladaBd`; `_fabrica` con `escaladas: []`; `base-pruebas` trunca `escaladas`; casos en `probar-bd`; test de que el check coincide con `GRADOS_VIA`/`GRADOS_BLOQUE`; `npm run migrar:pruebas && npm run probar-bd`.

### Task 2: Nivel, proyectos y pista (TDD)
- [ ] `lib/escaladas/nivel.ts`: `vistaNivel(escaladas, perfil, hoy)`, `proyectos(escaladas, hoy)`, `pistaLectura(escaladas, hoy)`; P-75 en `parametros.md` + `VALORES['P-75'] = { ventanaDias: 90, escalones: 4 }`; metadatos 74 → 75, diseño 39 → 40; tests.

### Task 3: Apuntar
- [ ] `lib/formulario.ts` `escaladasDelRegistro(fd, sesion)`; registro guarda/reemplaza escaladas; `CamposEscaladas` dentro de `CamposFreno` (encadenes) y bloque de proyecto en `pegues-proyecto`; `guardarEscalada`/`borrarEscalada` en Progreso; tests de parseo.

### Task 4: Progreso
- [ ] `TuNivel` sustituye a la tarjeta «Grado»; proyectos; últimas escaladas con borrar; «+ Apuntar escalada»; pista en `Perfil`; logro «Primer encadene» con escaladas.

### Task 5: Verificación y publicación
- [ ] tsc, tests, lint, build, e2e en worktree (nuevos casos); revisión independiente; migrar PROD; merge y push.
