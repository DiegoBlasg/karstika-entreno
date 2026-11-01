# Biblioteca ampliada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fichas nuevas del informe por cualidad y lugar, y que el entrenador use las de técnica, cabeza y movilidad.

**Architecture:** `lib/biblioteca/fichas.ts` (fichas, grupos por cualidad, `lugares`, `uso`); `ListaBiblioteca` con filtro por lugar; motor: rotación técnica, bloque de caídas (P-76), `fichasExtra` en los intentos al límite, movilidad ampliada; `lib/cronometro/pasos.ts` junta `ficha` y `fichasExtra`.

**Spec:** `docs/superpowers/specs/2026-11-02-biblioteca-ampliada-design.md`

## Global Constraints

- Rama `biblioteca-ampliada`; español; commits con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos con la fuente o el motivo (nunca «decisión de diseño»). Sin migración.

### Task 1: Fichas y Biblioteca
- [ ] Fichas nuevas, `lugares`, `uso`, grupos por cualidad; filtro por lugar; tests de fichas.

### Task 2: Motor
- [ ] `fichasExtra` en `Ejercicio` y en pasos; rotación técnica; P-76 y bloque de caídas; respiración/táctica en intentos al límite; paso alto y tobillo; tests.

### Task 3: Verificación y publicación
- [ ] tsc, tests, lint, build, e2e en worktree; revisión independiente; merge y push.
