# Modo sesión con cronómetro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un cronómetro en el navegador que guía una sesión aceptada paso a paso con pitidos y al acabar abre el registro con los minutos reales.

**Architecture:** Dos módulos puros con pruebas: `lib/cronometro/pasos.ts` (plan → lista de pasos) y `lib/cronometro/reloj.ts` (estado del reloj, recibe el instante como dato). Una página `app/(app)/sesion/[id]/` que comprueba la sesión en el servidor y un componente de cliente que ejecuta el reloj, pita, mantiene la pantalla encendida y muestra el registro al final.

**Tech Stack:** Next.js 16.4 (App Router; `params` de página es una `Promise`), React 19, Tailwind 4, Web Audio, Screen Wake Lock, vitest 2, Playwright.

Spec: `docs/superpowers/specs/2026-10-28-app-cronometro-design.md`. Rama: `cronometro`. Repo: `D:\karstika-entreno`.

## Global Constraints

- Todo el texto de la interfaz en español.
- Solo pitidos (sin voz ni vibración). Tres cortos en los 3 últimos segundos de cada paso con tiempo; uno largo y agudo al empezar un `colgado`; uno grave al empezar un `descanso`; botón para silenciar.
- «Prepárate» de 10 s antes de cada ejercicio colgado (no antes de cada repetición).
- El tiempo sale siempre de restar instantes (`Date.now()`), nunca de sumar ticks.
- Minutos reales = `ceil(total / 60 s)`, mínimo 1; cuentan también los descansos.
- Estado guardado en `localStorage` con la clave `cronometro:<id>`, siempre envuelto en try/catch; la página funciona sin él. Se borra al registrar.
- Cronómetro solo para sesiones de **hoy**, con `propuesta` y sin registrar; la página lo comprueba en el servidor con `requerirDatos()`.
- Sin tablas nuevas ni escrituras durante la sesión; el registro usa la acción `registrar` existente.
- No tocar `motor/`.
- Cada tarea termina con `npm test` y `npm run tsc` en verde (las de UI, también `npm run build`). No hay base de datos: el e2e se escribe pero no se ejecuta.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Pasos de la sesión

**Files:**
- Create: `lib/cronometro/pasos.ts`, `lib/cronometro/pasos.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Paso = (
    | { tipo: 'preparate'; segundos: number; titulo: string; carga?: string }
    | { tipo: 'colgado'; segundos: number; titulo: string; carga?: string }
    | { tipo: 'descanso'; segundos: number; titulo: string }
    | { tipo: 'manual'; titulo: string; carga?: string; notas?: string }
    | { tipo: 'bloque'; segundos: number; titulo: string; detalle: string[] }
    | { tipo: 'fallo'; trabajoS: number; descansoS: number; titulo: string; carga?: string }
  ) & { bloque: string }
  export const SEGUNDOS_PREPARATE = 10
  export function pasosDeSesion(plan: SesionPlan): Paso[]
  export function segundosDe(p: Paso): number | null   // null en manual y fallo
  ```

- [ ] **Step 1: Tests `lib/cronometro/pasos.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { construirSesion, descargar, FASES, type Contexto, type Peticion, type SesionPlan, type TipoSesion } from '../../motor'
import { pasosDeSesion, segundosDe, SEGUNDOS_PREPARATE, type Paso } from './pasos'

const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 90 }
const ROCO: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const peticion = (contexto: Contexto, fase = FASES.fuerza): Peticion => ({
  fecha: '2026-11-02', horaInicio: 9, contexto, perfil: { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }, historial: [], fase,
  evaluacion: { fecha: '2026-10-01', pesoCorporalKg: 72, lastreKg: 15 },
})
const plan = (tipo: TipoSesion, contexto: Contexto, fase = FASES.fuerza): SesionPlan => {
  const p = construirSesion(tipo, peticion(contexto, fase))
  if (!p) throw new Error(`sin plan para ${tipo}`)
  return p
}
const tipos = (ps: Paso[]) => ps.map((p) => p.tipo)

describe('pasosDeSesion', () => {
  it('repeaters: prepárate, colgado/descanso por repetición, sin descanso corto tras la última, descanso entre series', () => {
    const pl = plan('multipresa-resistencia', CASA)
    const ej = pl.bloques.flatMap((b) => b.ejercicios).find((e) => e.repeticiones !== undefined)!
    const ps = pasosDeSesion(pl)
    const del = ps.filter((p) => p.bloque !== pl.bloques[0]!.nombre)
    expect(del[0]).toMatchObject({ tipo: 'preparate', segundos: SEGUNDOS_PREPARATE })
    expect(del.filter((p) => p.tipo === 'colgado').length).toBe(ej.series! * ej.repeticiones!)
    expect(del.filter((p) => p.tipo === 'descanso' && p.segundos === ej.descansoS).length).toBe(ej.series! * (ej.repeticiones! - 1))
    expect(del.filter((p) => p.tipo === 'descanso' && p.segundos === ej.descansoSeriesS).length).toBe(ej.series! - 1)
    expect(del[1]).toMatchObject({ tipo: 'colgado', segundos: ej.trabajoS, titulo: `Serie 1 de ${ej.series} · rep 1 de ${ej.repeticiones}` })
    expect(ps[0]).toMatchObject({ tipo: 'bloque', segundos: pl.bloques[0]!.minutos * 60 })
  })
  it('descarga: la mitad de series se refleja en los pasos', () => {
    const normal = pasosDeSesion(plan('multipresa-resistencia', CASA)).filter((p) => p.tipo === 'colgado').length
    const pl = plan('multipresa-resistencia', CASA, descargar(FASES.fuerza))
    const ej = pl.bloques.flatMap((b) => b.ejercicios).find((e) => e.repeticiones !== undefined)!
    const colgados = pasosDeSesion(pl).filter((p) => p.tipo === 'colgado').length
    expect(colgados).toBe(ej.series! * ej.repeticiones!)
    expect(colgados).toBeLessThan(normal)
  })
  it('4x4: una vuelta manual por serie con 4 min entre vueltas', () => {
    const pl = plan('resistencia-4x4', ROCO)
    const ps = pasosDeSesion(pl).filter((p) => p.bloque === '4x4')
    expect(tipos(ps)).toEqual(['manual', 'descanso', 'manual', 'descanso', 'manual', 'descanso', 'manual'])
    expect(ps[0]).toMatchObject({ titulo: 'Vuelta 1 de 4' })
    expect(ps[1]).toMatchObject({ segundos: 240 })
  })
  it('ARC y hombro: un paso bloque por bloque, con sus minutos y su detalle', () => {
    for (const [tipo, ctx] of [['arc', ROCO], ['hombro', CASA]] as const) {
      const pl = plan(tipo, ctx)
      const ps = pasosDeSesion(pl)
      expect(tipos(ps).every((t) => t === 'bloque')).toBe(true)
      expect(ps.map((p) => segundosDe(p))).toEqual(pl.bloques.map((b) => b.minutos * 60))
      expect(ps[0]).toMatchObject({ titulo: pl.bloques[0]!.nombre })
      if (ps[0]!.tipo === 'bloque') expect(ps[0]!.detalle[0]).toContain(pl.bloques[0]!.ejercicios[0]!.nombre)
    }
  })
  it('test de dedos: 3 intentos de 10 s con 3 min entre ellos y el 7:3 hasta el fallo', () => {
    const ps = pasosDeSesion(plan('evaluacion-dedos', CASA))
    expect(tipos(ps)).toEqual([
      'bloque', 'bloque',
      'preparate', 'colgado', 'descanso', 'colgado', 'descanso', 'colgado',
      'bloque',
      'preparate', 'fallo',
    ])
    expect(ps[3]).toMatchObject({ segundos: 10, titulo: 'Intento 1 de 3' })
    expect(ps[4]).toMatchObject({ segundos: 180 })
    expect(ps[10]).toMatchObject({ tipo: 'fallo', trabajoS: 7, descansoS: 3 })
  })
  it('los segundos con tiempo de cada bloque no superan sus minutos', () => {
    const casos: [TipoSesion, Contexto][] = [
      ['multipresa-resistencia', CASA], ['multipresa-resistencia-fuerza', CASA], ['resistencia-4x4', ROCO],
      ['arc', ROCO], ['hombro', CASA], ['evaluacion-dedos', CASA],
    ]
    for (const [tipo, ctx] of casos) {
      const pl = plan(tipo, ctx)
      const ps = pasosDeSesion(pl)
      for (const b of pl.bloques) {
        const s = ps.filter((p) => p.bloque === b.nombre).reduce((a, p) => a + (segundosDe(p) ?? 0), 0)
        expect(s, `${tipo} · ${b.nombre}`).toBeLessThanOrEqual(b.minutos * 60)
      }
    }
  })
})
```

Nota: si el bloque del 4×4 no se llama exactamente `'4x4'` o algún tipo no produce plan con esta petición, imprimir `pl.bloques` y ajustar **solo el dato de entrada o el nombre del bloque** del test, explicándolo en el informe; nunca relajar las aserciones.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/cronometro/pasos.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar `lib/cronometro/pasos.ts`**

```ts
// Convierte el plan de una sesión en la lista de pasos que guía el cronómetro. Puro.
import type { Ejercicio, SesionPlan } from '../../motor'

export type Paso = (
  | { tipo: 'preparate'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'colgado'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'descanso'; segundos: number; titulo: string }
  | { tipo: 'manual'; titulo: string; carga?: string; notas?: string }
  | { tipo: 'bloque'; segundos: number; titulo: string; detalle: string[] }
  | { tipo: 'fallo'; trabajoS: number; descansoS: number; titulo: string; carga?: string }
) & { bloque: string }

export const SEGUNDOS_PREPARATE = 10

const conTiempo = (e: Ejercicio): boolean => e.trabajoS !== undefined || e.series !== undefined
const detalleDe = (e: Ejercicio): string => [e.nombre, e.cargaTexto, e.notas].filter(Boolean).join(' · ')

export function segundosDe(p: Paso): number | null {
  return p.tipo === 'manual' || p.tipo === 'fallo' ? null : p.segundos
}

export function pasosDeSesion(plan: SesionPlan): Paso[] {
  const out: Paso[] = []
  for (const b of plan.bloques) {
    if (!b.ejercicios.some(conTiempo)) {
      out.push({ tipo: 'bloque', bloque: b.nombre, segundos: b.minutos * 60, titulo: b.nombre, detalle: b.ejercicios.map(detalleDe) })
      continue
    }
    for (const e of b.ejercicios) out.push(...pasosDeEjercicio(b.nombre, e))
  }
  return out
}

function pasosDeEjercicio(bloque: string, e: Ejercicio): Paso[] {
  const { series, repeticiones, trabajoS, descansoS, descansoSeriesS } = e
  const carga = e.cargaTexto
  const manual = (titulo: string): Paso => ({ tipo: 'manual', bloque, titulo, carga, ...(e.notas ? { notas: e.notas } : {}) })
  if (series === undefined && trabajoS === undefined) return [manual(e.nombre)]
  const preparate: Paso = { tipo: 'preparate', bloque, segundos: SEGUNDOS_PREPARATE, titulo: e.nombre, carga }
  if (series === undefined) {
    // Sin series: hasta el fallo si hay descanso entre repeticiones (7:3 del test), si no una sola suspensión.
    if (descansoS !== undefined) return [preparate, { tipo: 'fallo', bloque, trabajoS: trabajoS!, descansoS, titulo: e.nombre, carga }]
    return [preparate, { tipo: 'colgado', bloque, segundos: trabajoS!, titulo: e.nombre, carga }]
  }
  const out: Paso[] = []
  const entreSeries = (s: number): void => {
    if (s < series && descansoSeriesS !== undefined) out.push({ tipo: 'descanso', bloque, segundos: descansoSeriesS, titulo: 'Descanso entre series' })
  }
  if (trabajoS === undefined) {
    // Series sin tiempo de trabajo (4×4): cada vuelta dura lo que se tarde; se pasa con «Hecho».
    for (let s = 1; s <= series; s++) {
      out.push(manual(`Vuelta ${s} de ${series}`))
      entreSeries(s)
    }
    return out
  }
  out.push(preparate)
  for (let s = 1; s <= series; s++) {
    if (repeticiones !== undefined) {
      for (let r = 1; r <= repeticiones; r++) {
        out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Serie ${s} de ${series} · rep ${r} de ${repeticiones}`, carga })
        if (r < repeticiones && descansoS !== undefined) out.push({ tipo: 'descanso', bloque, segundos: descansoS, titulo: 'Descanso' })
      }
    } else {
      out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Intento ${s} de ${series}`, carga })
    }
    entreSeries(s)
  }
  return out
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run lib/cronometro/pasos.test.ts` → PASS. Después `npm test` y `npm run tsc`.

- [ ] **Step 5: Commit**

```bash
git add lib/cronometro/pasos.ts lib/cronometro/pasos.test.ts
git commit -m "feat(cronometro): pasos de la sesión a partir del plan"
```

---

### Task 2: Reloj

**Files:**
- Create: `lib/cronometro/reloj.ts`, `lib/cronometro/reloj.test.ts`

**Interfaces:**
- Consumes: `Paso`, `segundosDe` (Task 1).
- Produces:
  ```ts
  export interface EstadoReloj {
    indice: number              // paso actual (=== pasos.length cuando ha terminado)
    enMarcha: boolean
    desdeMs: number | null      // instante desde el que corre el paso actual (solo en marcha)
    acumuladoMs: number         // ms del paso actual corridos antes de desdeMs
    totalMs: number             // ms de sesión de los pasos anteriores
    colgadoFalloS: number | null // segundos colgado del último paso «fallo» (resistencia del test)
    terminado: boolean
  }
  export const ESTADO_INICIAL: EstadoReloj
  export function transcurridoMs(e: EstadoReloj, ahoraMs: number): number
  export function empezar(e: EstadoReloj, ahoraMs: number): EstadoReloj   // también «Seguir»
  export function pausar(e: EstadoReloj, ahoraMs: number): EstadoReloj
  export function tick(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj
  export function siguiente(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj // Saltar y Hecho
  export function atras(e: EstadoReloj, ahoraMs: number): EstadoReloj
  export function noPuedoMas(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj
  export function terminar(e: EstadoReloj, ahoraMs: number): EstadoReloj
  export function restanteS(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): number | null
  export function faseFallo(paso: { trabajoS: number; descansoS: number }, ms: number): { fase: 'colgado' | 'descanso'; restanteS: number; colgadoS: number }
  export function minutosReales(e: EstadoReloj, ahoraMs: number): number
  export function leerGuardado(x: unknown, nPasos: number): EstadoReloj | null   // valida lo leído de localStorage; siempre en pausa
  ```

- [ ] **Step 1: Tests `lib/cronometro/reloj.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import type { Paso } from './pasos'
import {
  atras, empezar, ESTADO_INICIAL, faseFallo, leerGuardado, minutosReales, noPuedoMas, pausar, restanteS, siguiente, terminar,
  tick, transcurridoMs,
} from './reloj'

const B = { bloque: 'b' }
const PASOS: Paso[] = [
  { ...B, tipo: 'preparate', segundos: 10, titulo: 'p' },
  { ...B, tipo: 'colgado', segundos: 7, titulo: 'c' },
  { ...B, tipo: 'descanso', segundos: 3, titulo: 'd' },
  { ...B, tipo: 'manual', titulo: 'm' },
  { ...B, tipo: 'fallo', trabajoS: 7, descansoS: 3, titulo: 'f' },
]
const T0 = 1_000_000

describe('reloj', () => {
  it('avanza solo al llegar a cero y conserva el sobrante', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = tick(PASOS, e, T0 + 9_999)
    expect(e.indice).toBe(0)
    expect(restanteS(PASOS, e, T0 + 9_999)).toBe(1)
    e = tick(PASOS, e, T0 + 10_500)
    expect(e.indice).toBe(1)
    expect(transcurridoMs(e, T0 + 10_500)).toBe(500)
  })
  it('tras un salto de tiempo avanza varios pasos de golpe y se para en el manual', () => {
    const e = tick(PASOS, empezar(ESTADO_INICIAL, T0), T0 + 60_000)
    expect(e.indice).toBe(3)
    expect(e.totalMs).toBe(20_000)
    expect(transcurridoMs(e, T0 + 60_000)).toBe(40_000) // el manual lleva corriendo desde que llegó
  })
  it('la pausa no cuenta', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = pausar(e, T0 + 4_000)
    e = tick(PASOS, e, T0 + 100_000)
    expect(e.indice).toBe(0)
    e = empezar(e, T0 + 100_000)
    expect(restanteS(PASOS, e, T0 + 101_000)).toBe(5)
  })
  it('saltar, hecho y atrás', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = siguiente(PASOS, e, T0 + 2_000)
    expect(e.indice).toBe(1)
    expect(e.totalMs).toBe(2_000)
    e = atras(e, T0 + 3_000)
    expect(e.indice).toBe(0)
    expect(transcurridoMs(e, T0 + 3_000)).toBe(0)
    expect(e.totalMs).toBe(3_000) // el tiempo vivido cuenta
    expect(atras(e, T0 + 3_500).indice).toBe(0)
  })
  it('fallo: alterna colgado y descanso y guarda los segundos colgado al pulsar «No puedo más»', () => {
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 0)).toEqual({ fase: 'colgado', restanteS: 7, colgadoS: 0 })
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 8_000)).toEqual({ fase: 'descanso', restanteS: 2, colgadoS: 7 })
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 24_500)).toEqual({ fase: 'colgado', restanteS: 3, colgadoS: 18 })
    let e = { ...empezar(ESTADO_INICIAL, T0), indice: 4 }
    e = tick(PASOS, e, T0 + 500_000)
    expect(e.indice).toBe(4) // el fallo no termina solo
    e = noPuedoMas(PASOS, e, T0 + 24_500)
    expect(e.colgadoFalloS).toBe(18)
    expect(e.terminado).toBe(true)
  })
  it('terminar y minutos reales (redondeo hacia arriba, mínimo 1)', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    expect(minutosReales(terminar(e, T0 + 5_000), T0 + 5_000)).toBe(1)
    e = terminar(tick(PASOS, e, T0 + 61_000), T0 + 61_000)
    expect(e.terminado).toBe(true)
    expect(e.enMarcha).toBe(false)
    expect(minutosReales(e, T0 + 999_999)).toBe(2)
  })
  it('lo guardado se recupera en pausa y lo que no vale se descarta', () => {
    const e = tick(PASOS, empezar(ESTADO_INICIAL, T0), T0 + 12_000)
    const guardado = JSON.parse(JSON.stringify(pausar(e, T0 + 12_000)))
    const r = leerGuardado(guardado, PASOS.length)!
    expect(r).toMatchObject({ indice: 1, enMarcha: false, desdeMs: null, acumuladoMs: 2_000, totalMs: 10_000 })
    expect(leerGuardado(null, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, indice: 99 }, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, totalMs: 'x' }, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, enMarcha: true, desdeMs: T0 }, PASOS.length)).toMatchObject({ enMarcha: false, desdeMs: null })
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/cronometro/reloj.test.ts` → FAIL.

- [ ] **Step 3: Implementar `lib/cronometro/reloj.ts`**

```ts
// Estado del cronómetro. Puro: el instante (Date.now()) lo pasa quien llama, y el tiempo sale siempre de restar
// instantes, nunca de sumar ticks, así no se desfasa aunque el navegador duerma la pestaña.
import { segundosDe, type Paso } from './pasos'

export interface EstadoReloj {
  indice: number
  enMarcha: boolean
  desdeMs: number | null
  acumuladoMs: number
  totalMs: number
  colgadoFalloS: number | null
  terminado: boolean
}

export const ESTADO_INICIAL: EstadoReloj = {
  indice: 0, enMarcha: false, desdeMs: null, acumuladoMs: 0, totalMs: 0, colgadoFalloS: null, terminado: false,
}

export function transcurridoMs(e: EstadoReloj, ahoraMs: number): number {
  return e.acumuladoMs + (e.enMarcha && e.desdeMs !== null ? Math.max(0, ahoraMs - e.desdeMs) : 0)
}

export function empezar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado || e.enMarcha) return e
  return { ...e, enMarcha: true, desdeMs: ahoraMs }
}

export function pausar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (!e.enMarcha) return e
  return { ...e, enMarcha: false, desdeMs: null, acumuladoMs: transcurridoMs(e, ahoraMs) }
}

// Pasa al paso siguiente con `sobranteMs` ya corridos en él; al pasar del último, termina.
function avanzar(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number, usadoMs: number, sobranteMs: number): EstadoReloj {
  const indice = e.indice + 1
  const totalMs = e.totalMs + usadoMs
  if (indice >= pasos.length) return { ...e, indice: pasos.length, totalMs, acumuladoMs: 0, enMarcha: false, desdeMs: null, terminado: true }
  return { ...e, indice, totalMs, acumuladoMs: e.enMarcha ? 0 : sobranteMs, desdeMs: e.enMarcha ? ahoraMs - sobranteMs : null }
}

export function tick(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  let r = e
  while (r.enMarcha && !r.terminado) {
    const paso = pasos[r.indice]
    const s = paso ? segundosDe(paso) : null
    if (s === null) return r
    const t = transcurridoMs(r, ahoraMs)
    if (t < s * 1000) return r
    r = avanzar(pasos, r, ahoraMs, s * 1000, t - s * 1000)
  }
  return r
}

export function siguiente(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  return avanzar(pasos, e, ahoraMs, transcurridoMs(e, ahoraMs), 0)
}

export function atras(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  const vivido = transcurridoMs(e, ahoraMs)
  return {
    ...e,
    indice: Math.max(0, e.indice - 1),
    totalMs: e.totalMs + vivido,
    acumuladoMs: 0,
    desdeMs: e.enMarcha ? ahoraMs : null,
  }
}

export function faseFallo(paso: { trabajoS: number; descansoS: number }, ms: number): { fase: 'colgado' | 'descanso'; restanteS: number; colgadoS: number } {
  const t = paso.trabajoS * 1000
  const ciclo = t + paso.descansoS * 1000
  const completos = Math.floor(ms / ciclo)
  const resto = ms - completos * ciclo
  const colgadoS = Math.floor((completos * t + Math.min(resto, t)) / 1000)
  if (resto < t) return { fase: 'colgado', restanteS: Math.ceil((t - resto) / 1000), colgadoS }
  return { fase: 'descanso', restanteS: Math.ceil((ciclo - resto) / 1000), colgadoS }
}

export function noPuedoMas(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  const paso = pasos[e.indice]
  if (e.terminado || !paso || paso.tipo !== 'fallo') return e
  const { colgadoS } = faseFallo(paso, transcurridoMs(e, ahoraMs))
  return siguiente(pasos, { ...e, colgadoFalloS: colgadoS }, ahoraMs)
}

export function terminar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  return { ...e, totalMs: e.totalMs + transcurridoMs(e, ahoraMs), acumuladoMs: 0, enMarcha: false, desdeMs: null, terminado: true }
}

export function restanteS(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): number | null {
  const paso = pasos[e.indice]
  const s = paso ? segundosDe(paso) : null
  if (s === null || e.terminado) return null
  return Math.max(0, Math.ceil((s * 1000 - transcurridoMs(e, ahoraMs)) / 1000))
}

export function minutosReales(e: EstadoReloj, ahoraMs: number): number {
  const total = e.totalMs + (e.terminado ? 0 : transcurridoMs(e, ahoraMs))
  return Math.max(1, Math.ceil(total / 60_000))
}

// Lo guardado en localStorage: se valida campo a campo y siempre vuelve en pausa (el tiempo con la página cerrada no
// cuenta).
export function leerGuardado(x: unknown, nPasos: number): EstadoReloj | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  if (!num(o.indice) || !Number.isInteger(o.indice) || o.indice > nPasos) return null
  if (!num(o.acumuladoMs) || !num(o.totalMs) || typeof o.terminado !== 'boolean') return null
  if (o.colgadoFalloS !== null && !num(o.colgadoFalloS)) return null
  return {
    indice: o.indice, enMarcha: false, desdeMs: null, acumuladoMs: o.acumuladoMs, totalMs: o.totalMs,
    colgadoFalloS: (o.colgadoFalloS as number | null) ?? null, terminado: o.terminado,
  }
}
```

Nota sobre el último test: `leerGuardado({ ...guardado, enMarcha: true, desdeMs: T0 })` devuelve el estado en pausa conservando `acumuladoMs` tal cual (el tiempo transcurrido desde `desdeMs` no se suma: lo guardado es la foto en pausa que el componente escribe cada segundo).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run lib/cronometro/reloj.test.ts` → PASS. Después `npm test` y `npm run tsc`.

- [ ] **Step 5: Commit**

```bash
git add lib/cronometro/reloj.ts lib/cronometro/reloj.test.ts
git commit -m "feat(cronometro): reloj puro con pausa, saltos, fallo y recuperación"
```

---

### Task 3: `FormularioRegistro` en su propio archivo

**Files:**
- Create: `app/(app)/_hoy/FormularioRegistro.tsx`
- Modify: `app/(app)/_hoy/TarjetaSesion.tsx`

**Interfaces:**
- Produces: `export function FormularioRegistro(props: { sesion: Sesion; previo?: { registro: FilaRegistro; intentos: FilaIntento[] }; iniciales?: readonly Molestia[]; minutosIniciales?: number; alTerminar?: () => void })`.

- [ ] **Step 1: Mover el componente**

Mover la función `FormularioRegistro` de `app/(app)/_hoy/TarjetaSesion.tsx` (tal cual, con su comentario) a `app/(app)/_hoy/FormularioRegistro.tsx`, que empieza por `'use client'` y lleva los imports que usa (`useActionState`, `useEffect` de react; `type Molestia, type Sesion` de `@/motor`; `CamposMolestias`; `enviarSinVaciar`; `BOTON, CAMPO`; `type FilaIntento, type FilaRegistro`; `type EstadoAccion`; `MAX_INTENTOS`; `ETIQUETA_RPE, MOTIVOS_CAIDA, NOMBRE_MOTIVO, TIPOS_CON_INTENTOS`; `corregirRegistro, registrar` de `./acciones`). Exportarla.

Añadir la prop `minutosIniciales?: number` y usarla en el campo de minutos:

```tsx
<input type="number" name="minutos" min={1} max={1440} defaultValue={previo?.registro.duracion_min ?? minutosIniciales ?? sesion.duracionMin} required className={CAMPO} />
```

En `TarjetaSesion.tsx`: borrar la función movida, importar `{ FormularioRegistro } from './FormularioRegistro'` y quitar los imports que ya no use (dejar los que siguen usando `FormularioOtraCosa`, `Registrada`, `BotonNoLaHice` y `TarjetaSesion`; `npm run tsc` no avisa de imports sin usar, así que revisarlos a mano).

- [ ] **Step 2: Enlace al cronómetro en `TarjetaSesion`**

En la rama sin registro de `TarjetaSesion`, encima de `{pasada && !cambiando && <FormularioRegistro … />}`:

```tsx
          {fila.fecha === hoy && fila.propuesta && (
            <Link href={`/sesion/${fila.id}`} className="inline-block rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white">
              Empezar con cronómetro
            </Link>
          )}
```

- [ ] **Step 3: Comprobar y commit**

Run: `npm test`, `npm run tsc` y `npm run build` → en verde.

```bash
git add "app/(app)/_hoy/FormularioRegistro.tsx" "app/(app)/_hoy/TarjetaSesion.tsx"
git commit -m "refactor(hoy): FormularioRegistro en su archivo, con minutos iniciales, y enlace al cronómetro"
```

---

### Task 4: Pantalla del cronómetro, pitidos y e2e

**Files:**
- Create: `lib/cronometro/pitidos.ts`, `app/(app)/sesion/[id]/page.tsx`, `app/(app)/sesion/[id]/Cronometro.tsx`
- Modify: `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: `pasosDeSesion`, `Paso`, `segundosDe` (Task 1); todo `reloj.ts` (Task 2); `FormularioRegistro` (Task 3); `requerirDatos`, `ahoraMadrid`.

- [ ] **Step 1: `lib/cronometro/pitidos.ts`** (solo navegador; sin pruebas unitarias)

```ts
// Pitidos con Web Audio, sin archivos. El navegador solo deja sonar tras una pulsación: `desbloquear` se llama desde
// el botón «Empezar».
export interface Pitidos {
  desbloquear(): void
  corto(): void
  colgado(): void
  descanso(): void
}

export function crearPitidos(): Pitidos {
  let ctx: AudioContext | null = null
  const sonar = (frecuencia: number, ms: number): void => {
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gan = ctx.createGain()
    osc.frequency.value = frecuencia
    gan.gain.value = 0.3
    osc.connect(gan).connect(ctx.destination)
    const t = ctx.currentTime
    gan.gain.setValueAtTime(0.3, t)
    gan.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000)
    osc.start(t)
    osc.stop(t + ms / 1000)
  }
  return {
    desbloquear() {
      try {
        ctx ??= new AudioContext()
        void ctx.resume()
      } catch {
        ctx = null
      }
    },
    corto: () => sonar(880, 120),
    colgado: () => sonar(1320, 600),
    descanso: () => sonar(440, 600),
  }
}
```

- [ ] **Step 2: Página `app/(app)/sesion/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { pasosDeSesion } from '@/lib/cronometro/pasos'
import { ahoraMadrid } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { Cronometro } from './Cronometro'

export default async function PaginaSesion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const fila = datos.sesiones.find((s) => s.id === id)
  const motivo = !fila
    ? 'Esa sesión no existe.'
    : fila.fecha !== hoy
      ? 'El cronómetro solo está disponible para las sesiones de hoy.'
      : !fila.propuesta
        ? 'Esta sesión no tiene plan: es lo que apuntaste que hiciste.'
        : datos.registros.some((r) => r.sesion_id === id)
          ? 'Esta sesión ya está registrada.'
          : null
  if (motivo || !fila?.propuesta) {
    return (
      <div className="space-y-3">
        <p>{motivo}</p>
        <Link href="/" className="underline">Volver a Hoy</Link>
      </div>
    )
  }
  const molestias = datos.chequeos.find((c) => c.fecha === hoy)?.molestias ?? []
  return <Cronometro plan={fila.propuesta} pasos={pasosDeSesion(fila.propuesta)} molestiasChequeo={molestias} />
}
```

- [ ] **Step 3: Componente `app/(app)/sesion/[id]/Cronometro.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Molestia, SesionPlan } from '@/motor'
import { BOTON } from '@/components/estilos'
import type { Paso } from '@/lib/cronometro/pasos'
import { crearPitidos } from '@/lib/cronometro/pitidos'
import {
  atras, empezar, ESTADO_INICIAL, faseFallo, leerGuardado, minutosReales, noPuedoMas, pausar, restanteS, siguiente, terminar,
  tick, transcurridoMs, type EstadoReloj,
} from '@/lib/cronometro/reloj'
import { NOMBRE_TIPO } from '@/lib/nombres'
import { FormularioRegistro } from '../../_hoy/FormularioRegistro'

const FONDO: Record<Paso['tipo'], string> = {
  colgado: 'bg-emerald-600 text-white',
  descanso: 'bg-sky-600 text-white',
  preparate: 'bg-amber-400 text-stone-900',
  bloque: 'bg-stone-200 text-stone-900',
  manual: 'bg-stone-200 text-stone-900',
  fallo: 'bg-emerald-600 text-white',
}

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function leer(clave: string, nPasos: number): EstadoReloj | null {
  try {
    const v = localStorage.getItem(clave)
    return v ? leerGuardado(JSON.parse(v), nPasos) : null
  } catch {
    return null
  }
}
function escribir(clave: string, e: EstadoReloj | null): void {
  try {
    if (e) localStorage.setItem(clave, JSON.stringify(e))
    else localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento (ventana privada…): el cronómetro funciona igual, solo no se recupera al recargar.
  }
}

export function Cronometro({ plan, pasos, molestiasChequeo }: { plan: SesionPlan; pasos: Paso[]; molestiasChequeo: Molestia[] }) {
  const router = useRouter()
  const clave = `cronometro:${plan.sesion.id}`
  const pitidos = useMemo(() => crearPitidos(), [])
  const [estado, setEstado] = useState<EstadoReloj>(ESTADO_INICIAL)
  const [guardado, setGuardado] = useState<EstadoReloj | null>(null)
  const [empezado, setEmpezado] = useState(false)
  const [silencio, setSilencio] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const ultimoPitido = useRef('')

  useEffect(() => setGuardado(leer(clave, pasos.length)), [clave, pasos.length])

  // Un tick cada 200 ms: el estado avanza con la hora real.
  useEffect(() => {
    if (!estado.enMarcha) return
    const id = setInterval(() => {
      const t = Date.now()
      setAhora(t)
      setEstado((e) => tick(pasos, e, t))
    }, 200)
    return () => clearInterval(id)
  }, [estado.enMarcha, pasos])

  // Se guarda la foto en pausa cada vez que cambia algo y cada segundo de marcha.
  useEffect(() => {
    if (empezado && !estado.terminado) escribir(clave, pausar(estado, ahora))
  }, [clave, empezado, estado, Math.floor(ahora / 1000)]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pantalla encendida mientras corre.
  useEffect(() => {
    if (!estado.enMarcha || !('wakeLock' in navigator)) return
    let bloqueo: WakeLockSentinel | null = null
    const pedir = (): void => {
      navigator.wakeLock.request('screen').then((b) => { bloqueo = b }).catch(() => {})
    }
    const alVolver = (): void => { if (document.visibilityState === 'visible') pedir() }
    pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      void bloqueo?.release()
    }
  }, [estado.enMarcha])

  const paso = pasos[estado.indice]
  const ms = transcurridoMs(estado, ahora)
  const fallo = paso?.tipo === 'fallo' ? faseFallo(paso, ms) : null
  const restante = fallo ? fallo.restanteS : restanteS(pasos, estado, ahora)
  const faseActual = fallo ? fallo.fase : paso?.tipo

  // Pitidos: uno al empezar colgado o descanso (también dentro del fallo) y tres cortos en los 3 últimos segundos.
  useEffect(() => {
    if (!estado.enMarcha || silencio || !paso) return
    const ciclo = fallo && paso.tipo === 'fallo' ? Math.floor(ms / ((paso.trabajoS + paso.descansoS) * 1000)) : 0
    const base = `${estado.indice}:${ciclo}:${faseActual}`
    if (!ultimoPitido.current.startsWith(`${base}|`)) {
      ultimoPitido.current = `${base}|inicio`
      if (faseActual === 'colgado') pitidos.colgado()
      if (faseActual === 'descanso') pitidos.descanso()
      return
    }
    if (restante !== null && restante >= 1 && restante <= 3) {
      const k = `${base}|${restante}`
      if (ultimoPitido.current !== k) {
        ultimoPitido.current = k
        pitidos.corto()
      }
    }
  }, [estado.enMarcha, estado.indice, faseActual, restante, silencio, paso, fallo, ms, pitidos])

  const actuar = useCallback((f: (e: EstadoReloj, t: number) => EstadoReloj) => {
    const t = Date.now()
    setAhora(t)
    setEstado((e) => f(e, t))
  }, [])

  const arrancar = (desde: EstadoReloj): void => {
    pitidos.desbloquear()
    setEmpezado(true)
    setGuardado(null)
    const t = Date.now()
    setAhora(t)
    setEstado(empezar(desde, t))
  }

  if (!empezado) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{NOMBRE_TIPO[plan.sesion.tipo]} · {plan.sesion.duracionMin} min</h1>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {plan.bloques.map((b, i) => <li key={`${b.nombre}-${i}`}>{b.nombre} · {b.minutos} min</li>)}
        </ol>
        {guardado && !guardado.terminado ? (
          <div className="flex gap-3">
            <button className={BOTON} onClick={() => arrancar(guardado)}>Continuar donde ibas</button>
            <button className="underline" onClick={() => { escribir(clave, null); arrancar(ESTADO_INICIAL) }}>Empezar de nuevo</button>
          </div>
        ) : (
          <button className={BOTON} onClick={() => arrancar(ESTADO_INICIAL)}>Empezar</button>
        )}
      </div>
    )
  }

  if (estado.terminado || !paso) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Sesión terminada</h1>
        {estado.colgadoFalloS !== null && (
          <p className="rounded bg-sky-50 p-3 text-sm">Resistencia: {estado.colgadoFalloS} s. Apúntalo en Evaluación junto con el lastre de tu mejor intento.</p>
        )}
        <FormularioRegistro
          sesion={plan.sesion}
          iniciales={molestiasChequeo}
          minutosIniciales={minutosReales(estado, ahora)}
          alTerminar={() => { escribir(clave, null); router.push('/') }}
        />
      </div>
    )
  }

  const siguientePaso = pasos[estado.indice + 1]
  return (
    <div className="space-y-4">
      <section className={`space-y-2 rounded p-6 text-center ${FONDO[fallo ? (fallo.fase === 'colgado' ? 'colgado' : 'descanso') : paso.tipo]}`}>
        <p className="text-sm opacity-80">{paso.bloque} · paso {estado.indice + 1} de {pasos.length}</p>
        <p className="text-lg font-semibold">
          {paso.tipo === 'preparate' ? `Prepárate: ${paso.titulo}` : paso.titulo}
          {fallo ? ` · ${fallo.fase === 'colgado' ? 'COLGADO' : 'DESCANSO'}` : paso.tipo === 'colgado' ? ' · COLGADO' : ''}
        </p>
        {restante !== null && <p className="font-mono text-7xl font-bold tabular-nums">{mmss(restante)}</p>}
        {fallo && <p className="text-xl">Colgado: {fallo.colgadoS} s</p>}
        {'carga' in paso && paso.carga && <p>{paso.carga}</p>}
        {paso.tipo === 'manual' && paso.notas && <p className="text-sm">{paso.notas}</p>}
        {paso.tipo === 'bloque' && <ul className="text-sm">{paso.detalle.map((d) => <li key={d}>{d}</li>)}</ul>}
      </section>
      {siguientePaso && <p className="text-sm text-stone-500">Después: {siguientePaso.titulo}</p>}
      <div className="flex flex-wrap gap-3">
        {paso.tipo === 'manual' && <button className={BOTON} onClick={() => actuar((e, t) => siguiente(pasos, e, t))}>Hecho</button>}
        {paso.tipo === 'fallo' && <button className={BOTON} onClick={() => actuar((e, t) => noPuedoMas(pasos, e, t))}>No puedo más</button>}
        {estado.enMarcha
          ? <button className="rounded border px-4 py-2" onClick={() => actuar(pausar)}>Pausa</button>
          : <button className="rounded border px-4 py-2" onClick={() => actuar(empezar)}>Seguir</button>}
        <button className="rounded border px-4 py-2" onClick={() => actuar(atras)}>Atrás</button>
        <button className="rounded border px-4 py-2" onClick={() => actuar((e, t) => siguiente(pasos, e, t))}>Saltar</button>
        <button className="rounded border px-4 py-2" onClick={() => { if (confirm('¿Terminar la sesión ahora?')) actuar(terminar) }}>Terminar</button>
        <button className="text-sm underline" onClick={() => setSilencio(!silencio)}>{silencio ? 'Activar pitidos' : 'Silenciar'}</button>
      </div>
    </div>
  )
}
```

Notas para quien implementa:
- Si `WakeLockSentinel` o `navigator.wakeLock` no existen en los tipos de `lib: ["dom"]` del `tsconfig`, tiparlos localmente con una interfaz mínima en vez de `any`.
- El proyecto no tiene ESLint: quitar el comentario `eslint-disable-line` si no aporta, pero mantener la dependencia por segundo (`Math.floor(ahora / 1000)`) calculada antes en una constante (`const segundo = Math.floor(ahora / 1000)`) y usada en la lista de dependencias.
- La importación de `FormularioRegistro` desde `../../_hoy/FormularioRegistro` es válida (las carpetas `_` son privadas pero importables).

- [ ] **Step 4: e2e** (añadir al final de `e2e/flujo.spec.ts`; importar `sqlPruebas` ya está importado)

```ts
test('cronómetro: abrir una sesión aceptada de hoy, terminarla y registrarla', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c001'
  const sesion = { id, tipo: 'tecnica', intensidad: 'suave', fecha: hoy, horaInicio: 21, duracionMin: 30 }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Técnica', minutos: 30, ejercicios: [{ nombre: 'Pies precisos', cargaTexto: 'Suave' }], explicacion: { regla: 'e2e', parametros: [], motivo: 'e2e' } }],
    explicaciones: [],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen) values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Empezar con cronómetro' }).click()
  await expect(page).toHaveURL(new RegExp(`/sesion/${id}$`))
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByText('Pies precisos · Suave')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Terminar' }).click()
  await expect(page.getByText('Sesión terminada')).toBeVisible()
  await expect(page.getByLabel('Minutos reales')).toHaveValue('1')
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('4')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})
```

Comprobar la forma real de `Explicacion` en `motor/explicacion.ts` y ajustar el objeto `explicacion` del bloque a sus campos obligatorios (el CHECK de la tabla solo exige que `propuesta` sea un objeto, pero la UI lee `plan.bloques` y `plan.sesion`). Si la sesión del primer test (hoy a las 10:00, 120 min) chocara en el tiempo con esta, cambiar `horaInicio` a una hora libre (21 es libre).

- [ ] **Step 5: Comprobar y commit**

Run: `npm test`, `npm run tsc` y `npm run build` → en verde (el e2e se ejecutará cuando exista la base de Neon).

```bash
git add lib/cronometro/pitidos.ts "app/(app)/sesion" e2e/flujo.spec.ts
git commit -m "feat(cronometro): pantalla del cronómetro con pitidos, pantalla encendida y registro al acabar"
```
