# «Generar entreno y ya» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir los «ratos» por un botón «Generar entreno» por día (mañana/tarde, sin hora), ofrecer «Core y movilidad» cuando toca descansar, poder borrar lo registrado y compactar «Próximas».

**Architecture:** Motor puro: tipo nuevo `core-movilidad` (plantilla propia, nunca carga alta, fuera de cupos) que `proponerSesion` añade como alternativa cuando la propuesta es descanso y no hay rojo. Capa `lib/datos`: `agenda.ts` (vista de 7 días, franja mañana/tarde, valores iniciales), `generar.ts` (elegir la opción y la «otra opción»); `prepararPropuesta` deja de pasar huecos. UI: componente `GenerarEntreno` (hoja) en Hoy y Semana, `FilaSesion` compacta, «Borrar» en lo registrado.

**Tech Stack:** Next.js (App Router, Server Actions), TypeScript, Neon Postgres, Vitest, Playwright, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-10-31-generar-entreno-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `generar-entreno` (encima de `diagnostico-freno`). Español en UI, comentarios y commits.
- AGENTS.md: Next.js con cambios; no se usan APIs nuevas de Next en este plan.
- Mañana = `horaInicio` 9, tarde = 18. `franja(h) = h < 14 ? 'manana' : 'tarde'`. La hora nunca se muestra en Semana ni en Próximas.
- Valores por defecto de la hoja: Solo · Rocódromo · 90 · Tarde.
- `core-movilidad`: suave, 20-30 min, casa/rocódromo/roca, sin compañía; nunca carga alta; no está en cupos; P-72 `sinEvidencia`; no se ofrece con zona en rojo.
- «Borrar» solo en sesiones registradas con `corregible(fecha, hoy)` (hoy-7 … hoy).
- Sin migraciones. El contexto de la generación se guarda en `propuesta.contexto` (jsonb).
- Cada tarea termina con `npm run tsc` y `npm test` en verde y un commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- e2e: el `next dev` de PID 7204 bloquea la carpeta: ejecutar Playwright en un worktree temporal con `npm ci` real (no junction).

---

### Task 1: Motor — «Core y movilidad» (P-72) y fichas

**Files:**
- Modify: `motor/tipos.ts` (`TIPOS_SESION`), `motor/contexto.ts` (`LUGARES`), `motor/nombres.ts` (`NOMBRE_TIPO`), `motor/plantillas.ts` (`construirCoreMovilidad`, `construirSesion`), `motor/parametros.ts` (`P-72`), `motor/propuesta.ts` (`proponerSesion`)
- Modify: `docs/evidencia/parametros.md` (P-72), regenerar `motor/metadatos.ts`, `motor/metadatos.test.ts` (71→72 ids, 36→37 de diseño)
- Modify: `lib/biblioteca/fichas.ts` (8 fichas, grupo «Movilidad y core»)
- Test: `motor/core-movilidad.test.ts` (nuevo), `motor/parametros.test.ts`

**Interfaces:**
- Produces: `TipoSesion` incluye `'core-movilidad'`; `NOMBRE_TIPO['core-movilidad'] = 'Core y movilidad'`; `VALORES['P-72'] = { minutosMin: 20, minutosMax: 30 }`; `proponerSesion` devuelve `core-movilidad` como **primera alternativa** cuando `principal === null`, hay `descanso` y ninguna zona del `estado` está en rojo.

- [ ] **Step 1: Tests que fallan** — `motor/core-movilidad.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { esCargaAlta, FASES, proponerSesion, type Peticion } from '.'

const base = (extra: Partial<Peticion> = {}): Peticion => ({
  fecha: '2026-11-04', horaInicio: 9,
  contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 45, multipresaEnCasa: false },
  perfil: { pesoKg: 70, anosEscalando: 1.5, lesiones: [] },
  historial: [], fase: FASES.base, ...extra,
})
// Lunes, martes y miércoles con sesiones: el jueves los cupos de base en casa están cubiertos → descanso recomendado.
const cargado = (lugar: 'casa' | 'rocodromo' | 'roca') => {
  const p = base({ fecha: '2026-11-05', contexto: { compania: 'solo', lugar, minutosDisponibles: 45, multipresaEnCasa: false } })
  // Se busca un historial que provoque descanso pidiendo días sucesivos con lo que el propio motor propone.
  let historial: Peticion['historial'] = []
  for (const fecha of ['2026-11-02', '2026-11-03', '2026-11-04']) {
    const r = proponerSesion({ ...p, fecha, historial })
    const s = r.principal ?? r.alternativas[0]
    if (s) historial = [...historial, { ...s.sesion, id: `h-${fecha}` }]
  }
  return { ...p, historial }
}

describe('core-movilidad (P-72)', () => {
  it('cuando la propuesta es descanso, sale como primera alternativa en casa, rocódromo y roca', () => {
    for (const lugar of ['casa', 'rocodromo', 'roca'] as const) {
      const r = proponerSesion(cargado(lugar))
      if (r.principal !== null || !r.descanso) continue // si ese día hay principal, no aplica
      expect(r.alternativas[0]?.sesion.tipo, lugar).toBe('core-movilidad')
    }
  })
  it('nunca es carga alta, dura 20-30 min y respeta los minutos disponibles', () => {
    const r = proponerSesion(cargado('casa'))
    const core = [r.principal, ...r.alternativas].find((o) => o?.sesion.tipo === 'core-movilidad')
    expect(core).toBeDefined()
    expect(esCargaAlta(core!.sesion)).toBe(false)
    expect(core!.sesion.intensidad).toBe('suave')
    expect(core!.sesion.duracionMin).toBe(30)
    const corto = proponerSesion({ ...cargado('casa'), contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 25, multipresaEnCasa: false } })
    const c2 = corto.alternativas.find((o) => o.sesion.tipo === 'core-movilidad')
    if (c2) expect(c2.sesion.duracionMin).toBe(20)
  })
  it('en roca no hay colgado de barra: elevaciones tumbado', () => {
    const r = proponerSesion(cargado('roca'))
    const core = r.alternativas.find((o) => o.sesion.tipo === 'core-movilidad')
    if (!core) return
    const nombres = core.bloques.flatMap((b) => b.ejercicios.map((e) => e.nombre))
    expect(nombres).toContain('Elevaciones de piernas tumbado')
    expect(nombres).not.toContain('Elevaciones de piernas colgado')
  })
  it('con una zona en rojo no se ofrece', () => {
    const p = { ...cargado('casa'), seguimiento: {
      registros: [], altas: [],
      chequeos: [{ fecha: '2026-11-05', sueno: 3, fatiga: 3, ganas: 3, molestias: [{ zona: 'dedos' as const, dolor: 5 }] }],
    } }
    const r = proponerSesion(p)
    expect(r.principal).toBeNull()
    expect([...r.alternativas].some((o) => o.sesion.tipo === 'core-movilidad')).toBe(false)
  })
  it('no está en los cupos de ninguna fase', () => {
    for (const f of Object.values(FASES)) expect(f.cupos['core-movilidad']).toBeUndefined()
  })
})
```

Si el historial construido no da descanso en algún lugar (el test lo salta con `continue`), añadir un caso fijo con `fase: FASES.transicion` en casa, donde el motor ya da descanso habitualmente; comprobar con un `console.log` puntual y fijar el caso que sí lo da (al menos uno de los tres lugares debe comprobarse de verdad: añadir `expect(comprobados).toBeGreaterThan(0)` contando las iteraciones no saltadas).

En `motor/parametros.test.ts` (bloque «VALORES del diagnóstico»):
```ts
  it('P-72 coincide con el documento', () => {
    expect(columnas('P-72')[2]).toMatch(/^Sesión suave de core y movilidad de 20-30 min/)
    expect(VALORES['P-72']).toEqual({ minutosMin: 20, minutosMax: 30 })
  })
```

- [ ] **Step 2: Ejecutar** `npx vitest run motor/core-movilidad.test.ts motor/parametros.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`docs/evidencia/parametros.md`, tras P-71:
```markdown
| P-72 | Core y movilidad cuando toca descansar | Sesión suave de core y movilidad de 20-30 min (core ~60 %: plancha, hollow, elevaciones de piernas colgado o tumbado, plancha lateral; movilidad ~40 %: rana, 90/90 de cadera, dislocaciones de hombro). Nunca es carga alta ni cuenta en los cupos; se ofrece como alternativa cuando la propuesta es descanso y ninguna zona está en rojo | sinEvidencia | sinEvidencia | Decisión de Diego (2026-10-31): «por lo menos abdominales». No hay estudios de core ni de tensión corporal en escaladores (informe 2026-10-31: sin fiabilidad ni validez publicadas); las dosis son decisión de diseño. |
```
`motor/parametros.ts`: `'P-72': { minutosMin: 20, minutosMax: 30 },`. `npm run metadatos`; en `motor/metadatos.test.ts` 71→72 y 36→37.

`motor/tipos.ts`: añadir `'core-movilidad'` antes de `'descanso'` en `TIPOS_SESION`.
`motor/nombres.ts`: `'core-movilidad': 'Core y movilidad'`.
`motor/contexto.ts` `LUGARES`: `'core-movilidad': ['casa', 'rocodromo', 'roca']`. (Cualquier otro `Record<TipoSesion, …>` que marque `tsc` se completa con el valor neutro de un tipo suave, p. ej. el de `hombro`.)

`motor/plantillas.ts`, antes de `construirSesion`:
```ts
// Core y movilidad (P-72): la alternativa suave cuando toca descansar. Dosis = decisión de diseño. Sin barra (roca) o
// sin poder colgarse (P-64, P-65), las elevaciones van tumbado.
const EJERCICIOS_CORE = (colgado: boolean): Ejercicio[] => [
  { nombre: 'Plancha frontal', cargaTexto: '3 × 30-45 s · descanso 45-60 s', ficha: 'plancha-frontal' },
  { nombre: 'Hollow', cargaTexto: '3 × 20-30 s · descanso 45-60 s', ficha: 'hollow' },
  colgado
    ? { nombre: 'Elevaciones de piernas colgado', cargaTexto: '3 × 6-10 · descanso 60 s', ficha: 'elevaciones-colgado' }
    : { nombre: 'Elevaciones de piernas tumbado', cargaTexto: '3 × 10-12 · descanso 45 s', ficha: 'elevaciones-tumbado' },
  { nombre: 'Plancha lateral', cargaTexto: '2 × 30 s por lado', ficha: 'plancha-lateral' },
]
const EJERCICIOS_MOVILIDAD: Ejercicio[] = [
  { nombre: 'Rana', cargaTexto: '2 × 45 s', ficha: 'rana' },
  { nombre: '90/90 de cadera', cargaTexto: '2 × 5 por lado', ficha: 'cadera-90-90' },
  { nombre: 'Dislocaciones de hombro con cinta o palo', cargaTexto: '2 × 10', ficha: 'dislocaciones-hombro' },
]

function construirCoreMovilidad(p: Peticion): SesionPlan | null {
  const { minutosMin, minutosMax } = VALORES['P-72']
  if (p.contexto.minutosDisponibles < minutosMin) return null
  const total = p.contexto.minutosDisponibles >= minutosMax ? minutosMax : minutosMin
  const core = total === minutosMax ? 18 : 12
  const colgado = p.contexto.lugar !== 'roca' && !sinColgarse(p)
  const explicacion = explicar(
    'plantilla.core-movilidad',
    ['P-72'],
    'Hoy toca descansar de escalar: si quieres moverte, core y movilidad suaves no cargan los dedos. Los ejercicios y las dosis son decisión de diseño: no hay estudios de core en escaladores.',
  )
  return plan(sesionDe('core-movilidad', p, total, 'suave'), [
    { nombre: 'Core', minutos: core, ejercicios: EJERCICIOS_CORE(colgado), explicacion },
    { nombre: 'Movilidad', minutos: total - core, ejercicios: EJERCICIOS_MOVILIDAD, explicacion },
  ])
}
```
y en `construirSesion`: `case 'core-movilidad': return construirCoreMovilidad(p)`.

`motor/propuesta.ts`: renombrar el cuerpo actual de `proponerSesion` a `function proponerSesionBase(p: Peticion): Propuesta` y añadir:
```ts
export function proponerSesion(p: Peticion): Propuesta {
  return conCoreMovilidad(p, proponerSesionBase(p))
}

// P-72: cuando la propuesta es descanso y no hay rojo, «Core y movilidad» como primera alternativa (si cabe y es válida).
function conCoreMovilidad(p: Peticion, r: Propuesta): Propuesta {
  if (r.principal !== null || !r.descanso) return r
  if (r.estado && Object.values(r.estado.zonas).includes('rojo')) return r
  if (r.alternativas.some((a) => a.sesion.tipo === 'core-movilidad')) return r
  const { huecos: _h, ...sinHuecos } = p
  const q: Peticion = r.estado ? { ...sinHuecos, estado: r.estado } : sinHuecos
  const c = evaluar('core-movilidad', q)
  if (!c || c.violaciones.length > 0) return r
  return { ...r, alternativas: [c.plan, ...r.alternativas] }
}
```
(`evaluar` con `q.estado` para que `sinColgarse` vea el estado; `proponer` ya calcula `estado` y lo devuelve en `r.estado`.)

`lib/biblioteca/fichas.ts`: añadir a `FICHA_IDS` y a las fichas: `plancha-frontal`, `hollow`, `elevaciones-colgado`, `elevaciones-tumbado`, `plancha-lateral`, `rana`, `cadera-90-90`, `dislocaciones-hombro` (formato de `plancha-toques-hombro`: título, paraQue, material, 3-7 pasos, errores, `paraSi: PARA_SI` (+ uno específico si hace falta), `parametros: ['P-72', ...SEGURIDAD]`; `dibujo: 'plancha'` en las dos planchas, `dibujo: 'dominada'` no: el colgado sin dibujo). Grupo `movilidad` pasa a título «Movilidad y core» y lista también estas 8 fichas.

- [ ] **Step 4:** `npm run tsc && npm test` → PASS (arreglar los `Record<TipoSesion>` que marque tsc y los tests de biblioteca/plantillas que cuentan fichas).
- [ ] **Step 5: Commit** `feat(motor): «Core y movilidad» como alternativa cuando toca descansar (P-72)`.

---

### Task 2: Datos — sin huecos, franja, agenda, contexto guardado, generar y otra opción

**Files:**
- Modify: `lib/datos/peticion.ts` (quitar `huecosPosteriores`), `lib/datos/filas.ts` (`FilaSesion.propuesta` con `contexto?`), `lib/datos/cambios.ts` (`filaSesionAceptada(plan, id, contexto?)`), `lib/datos/hoy.ts` (exportar `tarjetasDe`), `lib/datos/arranque.ts` (`generado` en lugar de `huecos`)
- Create: `lib/datos/agenda.ts`, `lib/datos/agenda.test.ts`, `lib/datos/generar.ts`, `lib/datos/generar.test.ts`
- Delete: `lib/datos/semana.ts`, `lib/datos/huecos.ts` y sus tests; `proximosDias` y lo que solo use él en `lib/datos/plan.ts` (+ tests)

**Interfaces:**
- Produces:
  ```ts
  // agenda.ts
  export type Franja = 'manana' | 'tarde'
  export const HORA_FRANJA: Record<Franja, number> = { manana: 9, tarde: 18 }
  export function franja(horaInicio: number): Franja
  export interface InicialGenerar { compania: Compania; lugar: Lugar; minutos: number; franja: Franja }
  export function inicialGenerar(d: DatosAtleta, fecha: string): InicialGenerar
  export interface DiaAgenda { fecha: string; tarjetas: Tarjeta[]; generable: boolean; inicial: InicialGenerar }
  export interface VistaAgenda { lunes: string; domingo: string; fase: { nombre: string; descarga: boolean } | null; dias: DiaAgenda[] }
  export function vistaAgenda(d: DatosAtleta, lunes: string, hoy: string): VistaAgenda
  // generar.ts
  export type ResultadoGenerar =
    | { tipo: 'sesion'; plan: SesionPlan }
    | { tipo: 'descanso'; motivo: Explicacion; alternativas: SesionPlan[] }
    | { tipo: 'error'; mensaje: string }
  export function elegirGenerado(prep: Preparacion, tipo?: TipoSesion): ResultadoGenerar
  export function otraOpcion(prep: Preparacion, actual: TipoSesion): SesionPlan | null
  export function conflictoFranja(d: DatosAtleta, fecha: string, f: Franja, sinId?: string): string | null
  // hoy.ts
  export function tarjetasDe(d: DatosAtleta, hoy: string): Tarjeta[]
  // cambios.ts
  export function filaSesionAceptada(plan: SesionPlan, id: string, contexto?: Contexto): FilaSesion
  // arranque.ts
  export interface PasosArranque { generado: boolean; sesion: boolean; test: boolean; completo: boolean }
  ```

- [ ] **Step 1: Tests que fallan** (`lib/datos/agenda.test.ts`):
```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { filaSesionAceptada } from './cambios'
import { franja, inicialGenerar, vistaAgenda } from './agenda'

describe('agenda', () => {
  it('franja: antes de las 14 mañana, si no tarde', () => {
    expect(franja(9)).toBe('manana'); expect(franja(13.9)).toBe('manana'); expect(franja(18)).toBe('tarde'); expect(franja(14)).toBe('tarde')
  })
  it('7 días con sus sesiones ordenadas por hora; generables solo desde hoy y dentro de la temporada', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(2), '2026-11-04', { horaInicio: 18 }), sesionFila(uuid(1), '2026-11-04', { horaInicio: 9 })] })
    const v = vistaAgenda(d, '2026-11-02', '2026-11-03')
    expect(v.dias.map((x) => x.fecha)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
    expect(v.dias[2]!.tarjetas.map((t) => t.fila.id)).toEqual([uuid(1), uuid(2)])
    expect(v.dias.map((x) => x.generable)).toEqual([false, true, true, true, true, true, true])
    expect(vistaAgenda(d, '2026-10-26', '2026-10-27').dias.every((x) => !x.generable)).toBe(true) // antes del inicio (2026-11-02)
  })
  it('valores iniciales: los de la última generada ese día de la semana; si no, por defecto', () => {
    expect(inicialGenerar(datosVacios(), '2026-11-05')).toEqual({ compania: 'solo', lugar: 'rocodromo', minutos: 90, franja: 'tarde' })
    const s = sesionFila(uuid(1), '2026-10-29', { horaInicio: 9 })
    const fila = filaSesionAceptada({ sesion: s.sesion, bloques: [], explicaciones: [] }, uuid(1),
      { compania: 'con-gente', lugar: 'casa', minutosDisponibles: 45, multipresaEnCasa: false })
    expect(inicialGenerar(datosVacios({ sesiones: [fila] }), '2026-11-05')).toEqual({ compania: 'con-gente', lugar: 'casa', minutos: 45, franja: 'manana' })
  })
})
```
`lib/datos/generar.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conflictoFranja, elegirGenerado, otraOpcion } from './generar'
import { prepararPropuesta } from './peticion'

const entrada = (lugar: 'casa' | 'rocodromo') => ({ fecha: '2026-11-04', horaInicio: 18, contexto: { compania: 'solo' as const, lugar, minutosDisponibles: 90 } })

describe('generar', () => {
  it('elige la principal; con tipo, la opción de ese tipo', () => {
    const prep = prepararPropuesta(datosVacios(), entrada('rocodromo'))
    const r = elegirGenerado(prep)
    expect(r.tipo).toBe('sesion')
    if (prep.tipo === 'propuesta' && prep.propuesta.alternativas[0]) {
      const t = prep.propuesta.alternativas[0].sesion.tipo
      const r2 = elegirGenerado(prep, t)
      expect(r2.tipo === 'sesion' && r2.plan.sesion.tipo).toBe(t)
    }
  })
  it('otra opción rota: siguiente tipo de la lista, distinto del actual', () => {
    const prep = prepararPropuesta(datosVacios(), entrada('rocodromo'))
    if (prep.tipo !== 'propuesta' || !prep.propuesta.principal) throw new Error('sin principal')
    const tipos = [prep.propuesta.principal, ...prep.propuesta.alternativas].map((o) => o.sesion.tipo)
    expect(otraOpcion(prep, tipos[0]!)?.sesion.tipo).toBe(tipos[1])
    expect(otraOpcion(prep, tipos.at(-1)!)?.sesion.tipo).toBe(tipos[0])
  })
  it('conflicto de franja el mismo día', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-04', { horaInicio: 18 })] })
    expect(conflictoFranja(d, '2026-11-04', 'tarde')).toBe('Ya tienes una sesión ese día por la tarde.')
    expect(conflictoFranja(d, '2026-11-04', 'manana')).toBeNull()
    expect(conflictoFranja(d, '2026-11-04', 'tarde', uuid(1))).toBeNull()
  })
})
```
Ajustar `lib/datos/arranque.test.ts`: `huecos` → `generado` (true si hay alguna sesión con `origen: 'propuesta'`).

- [ ] **Step 2:** `npx vitest run lib/datos/agenda.test.ts lib/datos/generar.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

`lib/datos/filas.ts`: `propuesta: (SesionPlan & { contexto?: Contexto }) | null` (importar `Contexto`).

`lib/datos/cambios.ts`:
```ts
export function filaSesionAceptada(plan: SesionPlan, id: string, contexto?: Contexto): FilaSesion {
  const sesion: Sesion = { ...plan.sesion, id }
  return { id, fecha: sesion.fecha, sesion, propuesta: { ...plan, sesion, ...(contexto ? { contexto } : {}) }, origen: 'propuesta' }
}
```

`lib/datos/peticion.ts`: quitar el import y el uso de `huecosPosteriores` (la `Peticion` ya no lleva `huecos`).

`lib/datos/hoy.ts`: extraer el `map` de `vistaHoy` a `export function tarjetasDe(d, fecha): Tarjeta[]` (mismo código) y usarlo dentro de `vistaHoy`.

`lib/datos/agenda.ts`:
```ts
// «Semana»: 7 días con sus sesiones y si se puede generar entreno; franja mañana/tarde y valores iniciales. Puro.
import { FASES, semanaEnFecha, type Compania, type Lugar } from '../../motor'
import { sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { tarjetasDe, type Tarjeta } from './hoy'
import { temporadaDe } from './peticion'

export type Franja = 'manana' | 'tarde'
export const HORA_FRANJA: Record<Franja, number> = { manana: 9, tarde: 18 }
export const franja = (horaInicio: number): Franja => (horaInicio < 14 ? 'manana' : 'tarde')

export interface InicialGenerar { compania: Compania; lugar: Lugar; minutos: number; franja: Franja }
const POR_DEFECTO: InicialGenerar = { compania: 'solo', lugar: 'rocodromo', minutos: 90, franja: 'tarde' }
const diaSemana = (fecha: string): number => new Date(`${fecha}T12:00:00Z`).getUTCDay()

// Lo de la última sesión generada (con contexto guardado) del mismo día de la semana.
export function inicialGenerar(d: DatosAtleta, fecha: string): InicialGenerar {
  const ultima = d.sesiones
    .filter((s) => s.propuesta?.contexto && diaSemana(s.fecha) === diaSemana(fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .at(-1)
  const c = ultima?.propuesta?.contexto
  return c ? { compania: c.compania, lugar: c.lugar, minutos: c.minutosDisponibles, franja: franja(ultima!.sesion.horaInicio) } : { ...POR_DEFECTO }
}

export interface DiaAgenda { fecha: string; tarjetas: Tarjeta[]; generable: boolean; inicial: InicialGenerar }
export interface VistaAgenda { lunes: string; domingo: string; fase: { nombre: string; descarga: boolean } | null; dias: DiaAgenda[] }

export function vistaAgenda(d: DatosAtleta, lunes: string, hoy: string): VistaAgenda {
  let fase: VistaAgenda['fase'] = null
  try {
    const s = semanaEnFecha(temporadaDe(d), lunes)
    fase = s ? { nombre: FASES[s.faseId].nombre, descarga: s.descarga } : null
  } catch { fase = null }
  const todas = tarjetasDe(d, hoy)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((fecha) => ({
    fecha,
    tarjetas: todas.filter((t) => t.fila.fecha === fecha).sort((a, b) => a.fila.sesion.horaInicio - b.fila.sesion.horaInicio),
    generable: fecha >= hoy && fecha >= d.perfil.inicio_temporada && fecha <= d.perfil.objetivo_temporada,
    inicial: inicialGenerar(d, fecha),
  }))
  return { lunes, domingo: sumarDias(lunes, 6), fase, dias }
}
```

`lib/datos/generar.ts`:
```ts
// Generar un entreno: qué opción se guarda, la «otra opción» y el choque de franja. Puro.
import { NOMBRE_TIPO, type Explicacion, type SesionPlan, type TipoSesion } from '../../motor'
import { franja, type Franja } from './agenda'
import type { DatosAtleta } from './filas'
import type { Preparacion } from './peticion'

export type ResultadoGenerar =
  | { tipo: 'sesion'; plan: SesionPlan }
  | { tipo: 'descanso'; motivo: Explicacion; alternativas: SesionPlan[] }
  | { tipo: 'error'; mensaje: string }

const opciones = (prep: Extract<Preparacion, { tipo: 'propuesta' }>): SesionPlan[] =>
  [prep.propuesta.principal, ...prep.propuesta.alternativas].filter((o): o is SesionPlan => o !== null)

export function elegirGenerado(prep: Preparacion, tipo?: TipoSesion): ResultadoGenerar {
  if (prep.tipo !== 'propuesta') return { tipo: 'error', mensaje: prep.mensaje }
  if (tipo) {
    const plan = opciones(prep).find((o) => o.sesion.tipo === tipo)
    return plan ? { tipo: 'sesion', plan } : { tipo: 'error', mensaje: `${NOMBRE_TIPO[tipo]} ya no es posible ese día: vuelve a generar.` }
  }
  const { principal, alternativas, descanso } = prep.propuesta
  if (principal) return { tipo: 'sesion', plan: principal }
  if (descanso) return { tipo: 'descanso', motivo: descanso, alternativas }
  return { tipo: 'error', mensaje: 'El entrenador no encuentra ninguna sesión posible con este contexto.' }
}

// La siguiente opción de la lista tras el tipo actual (principal → alternativa 1 → alternativa 2 → principal).
export function otraOpcion(prep: Preparacion, actual: TipoSesion): SesionPlan | null {
  if (prep.tipo !== 'propuesta') return null
  const lista = opciones(prep)
  const i = lista.findIndex((o) => o.sesion.tipo === actual)
  for (let k = 1; k <= lista.length; k++) {
    const o = lista[(Math.max(i, -1) + k + lista.length) % lista.length]!
    if (o.sesion.tipo !== actual) return o
  }
  return null
}

const NOMBRE_FRANJA: Record<Franja, string> = { manana: 'por la mañana', tarde: 'por la tarde' }

export function conflictoFranja(d: DatosAtleta, fecha: string, f: Franja, sinId?: string): string | null {
  const choca = d.sesiones.some((s) => s.fecha === fecha && s.id !== sinId && s.sesion.tipo !== 'descanso' && franja(s.sesion.horaInicio) === f)
  return choca ? `Ya tienes una sesión ese día ${NOMBRE_FRANJA[f]}.` : null
}
```

`lib/datos/arranque.ts`: `generado = d.sesiones.some((s) => s.origen === 'propuesta')`, sustituye a `huecos`.

Borrar `lib/datos/semana.ts`, `lib/datos/huecos.ts`, sus tests y `proximosDias` (+ tipos y tests que solo lo usan) de `lib/datos/plan.ts`. Si `tsc` marca otros usos (Semana, Hoy), se arreglan en las Tasks 4-5: para dejar esta tarea en verde, en `app/(app)/page.tsx` quitar «Próximo rato» y en `app/(app)/semana/page.tsx` sustituir el cuerpo por un `<p>` provisional que la Task 5 reemplaza; borrar `app/(app)/semana/{AnadirRato,FormularioHueco,BotonBorrarHueco,Confirmacion,ratos,acciones}.tsx/ts` y sus tests.

- [ ] **Step 4:** `npm run tsc && npm test` → PASS.
- [ ] **Step 5: Commit** `feat(datos): sin ratos — franja mañana/tarde, agenda de 7 días, generar y otra opción`.

---

### Task 3: Acciones — generar, otra opción y borrar lo registrado

**Files:**
- Create: `app/(app)/_generar/acciones.ts`
- Modify: `lib/servidor/consultas.ts` (`borrarSesionRegistradaBd`), `app/(app)/_hoy/acciones.ts` (`borrarRegistrada`)
- Test: lógica pura ya cubierta en Task 2; e2e en Task 6.

**Interfaces:**
- Produces:
  ```ts
  export type EstadoGenerar =
    | null
    | { error: string }
    | { ok: string }   // «Listo: Bloque al límite · tarde · 90 min»
    | { descanso: { motivo: Explicacion; alternativas: { tipo: TipoSesion; nombre: string; minutos: number }[] } }
  export async function generar(previo: EstadoGenerar, fd: FormData): Promise<EstadoGenerar>   // campos: fecha, franja, compania, lugar, minutos, [tipo], [sueno, fatiga, ganas, dolor_*, alarma_*]
  export async function otraOpcionAccion(previo: EstadoAccion, fd: FormData): Promise<EstadoAccion>  // campo: sesion_id
  export async function borrarRegistrada(previo: EstadoAccion, fd: FormData): Promise<EstadoAccion>  // campo: sesion_id
  ```

- [ ] **Step 1: Implementar** `app/(app)/_generar/acciones.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { NOMBRE_TIPO, TIPOS_SESION, validarSesion, type Explicacion, type TipoSesion } from '@/motor'
import { HORA_FRANJA, type Franja } from '@/lib/datos/agenda'
import { conChequeo, conSesion, filaSesionAceptada, sinSesion } from '@/lib/datos/cambios'
import type { DatosAtleta, FilaChequeo } from '@/lib/datos/filas'
import { conflictoFranja, elegirGenerado, otraOpcion } from '@/lib/datos/generar'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { prepararPropuesta, type EntradaPeticion } from '@/lib/datos/peticion'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { contexto, entero, fecha, mensajeDe, molestias, opcion, opcionOpcional, texto } from '@/lib/formulario'
import { guardarChequeo, insertarSesion, requerirDatos, sustituirSesion } from '@/lib/servidor/consultas'

export type EstadoGenerar =
  | null
  | { error: string }
  | { ok: string }
  | { descanso: { motivo: Explicacion; alternativas: { tipo: TipoSesion; nombre: string; minutos: number }[] } }

const FRANJAS = ['manana', 'tarde'] as const satisfies readonly Franja[]
const TEXTO_FRANJA: Record<Franja, string> = { manana: 'mañana', tarde: 'tarde' }

export async function generar(_previo: EstadoGenerar, fd: FormData): Promise<EstadoGenerar> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let entrada: EntradaPeticion
  let f: Franja
  let tipo: TipoSesion | null
  let chequeo: FilaChequeo | null = null
  try {
    f = opcion(fd, 'franja', 'Cuándo', FRANJAS)
    entrada = { fecha: fecha(fd, 'fecha', 'El día'), horaInicio: HORA_FRANJA[f], contexto: contexto(fd) }
    tipo = opcionOpcional(fd, 'tipo', 'El tipo', TIPOS_SESION)
    if (entrada.fecha < hoy) return { error: 'Solo puedes generar entrenos para hoy o días futuros.' }
    const choque = conflictoFranja(datos, entrada.fecha, f)
    if (choque) return { error: choque }
    // Hoy sin chequeo guardado: la hoja lo pide (P-65) y se guarda con la sesión.
    if (entrada.fecha === hoy && fd.has('sueno')) {
      chequeo = { fecha: hoy, sueno: entero(fd, 'sueno', 'El sueño', 1, 5), fatiga: entero(fd, 'fatiga', 'La fatiga', 1, 5), ganas: entero(fd, 'ganas', 'Las ganas', 1, 5), molestias: molestias(fd) }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  const base: DatosAtleta = chequeo ? conChequeo(datos, chequeo) : datos
  let fila
  try {
    const r = elegirGenerado(prepararPropuesta(base, entrada), tipo ?? undefined)
    if (r.tipo === 'error') return { error: r.mensaje }
    if (r.tipo === 'descanso') {
      return { descanso: { motivo: r.motivo, alternativas: r.alternativas.map((a) => ({ tipo: a.sesion.tipo, nombre: NOMBRE_TIPO[a.sesion.tipo], minutos: a.sesion.duracionMin })) } }
    }
    fila = filaSesionAceptada(r.plan, crypto.randomUUID(), entrada.contexto)
    const violaciones = validarSesion(fila.sesion, historialMotor(base.sesiones), perfilMotor(base.perfil))
    if (violaciones.length > 0) return { error: `La sesión no es válida: ${violaciones.map((v) => v.mensaje).join(' ')}` }
    validarDatos(conSesion(base, fila), fila.id)
  } catch (e) {
    return { error: `No se ha podido generar: ${mensajeDe(e)}` }
  }
  try {
    if (chequeo) await guardarChequeo(sql, chequeo)
    await insertarSesion(sql, fila, [])
  } catch (e) {
    return { error: `No se ha podido guardar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  revalidatePath('/semana')
  return { ok: `Listo: ${NOMBRE_TIPO[fila.sesion.tipo]} · ${TEXTO_FRANJA[f]} · ${fila.sesion.duracionMin} min` }
}

// Cambia una sesión aceptada, sin registrar, de hoy o futura, por la siguiente opción del motor con su mismo contexto.
export async function otraOpcionAccion(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let nueva
  let idViejo: string
  try {
    idViejo = texto(fd, 'sesion_id', 'La sesión')
    const vieja = datos.sesiones.find((s) => s.id === idViejo)
    if (!vieja || !vieja.propuesta?.contexto) return { error: 'Esa sesión no se puede cambiar desde aquí.' }
    if (vieja.fecha < hoy) return { error: 'Solo puedes cambiar sesiones de hoy o de días futuros.' }
    if (datos.registros.some((r) => r.sesion_id === idViejo)) return { error: 'Esa sesión ya está registrada.' }
    const base = sinSesion(datos, idViejo)
    const entrada: EntradaPeticion = { fecha: vieja.fecha, horaInicio: vieja.sesion.horaInicio, contexto: vieja.propuesta.contexto }
    const plan = otraOpcion(prepararPropuesta(base, entrada), vieja.sesion.tipo)
    if (!plan) return { error: 'No hay otra opción para ese día.' }
    nueva = filaSesionAceptada(plan, crypto.randomUUID(), vieja.propuesta.contexto)
    validarDatos(conSesion(base, nueva), nueva.id)
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    if (!(await sustituirSesion(sql, idViejo, nueva))) return { error: 'Esa sesión ya está registrada o ya no existe.' }
  } catch (e) {
    return { error: `No se ha podido cambiar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  revalidatePath('/semana')
  return { ok: `Cambiada por ${NOMBRE_TIPO[nueva.sesion.tipo]}.` }
}
```
(Comprobar la firma real de `insertarSesion(sql, fila, consejos)` en `consultas.ts` y de `contexto(fd)` en `lib/formulario.ts` — lee `compania`, `lugar`, `minutos`; si devuelve también `multipresaEnCasa`, quitarlo antes de guardarlo como contexto o dejarlo: `Contexto` es el tipo del motor.)

`lib/servidor/consultas.ts`:
```ts
// Borra una sesión registrada (su registro e intentos caen en cascada). La ventana de 7 días se comprueba en la acción.
export async function borrarSesionRegistradaBd(sql: Sql, id: string): Promise<boolean> {
  const filas = await sql`delete from sesiones where id = ${id} and exists (select 1 from registros where sesion_id = ${id}) returning id`
  return filas.length > 0
}
```
`app/(app)/_hoy/acciones.ts`:
```ts
export async function borrarRegistrada(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let id: string
  try {
    id = texto(fd, 'sesion_id', 'La sesión')
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  const s = datos.sesiones.find((x) => x.id === id)
  if (!s || !datos.registros.some((r) => r.sesion_id === id)) return { error: 'Esa sesión no está registrada.' }
  if (!corregible(s.fecha, hoy)) return { error: 'Solo puedes borrar lo registrado en los últimos 7 días.' }
  try {
    if (!(await borrarSesionRegistradaBd(sql, id))) return { error: 'Esa sesión ya no existe.' }
  } catch (e) {
    return { error: `No se ha podido borrar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Sesión borrada.' }
}
```
- [ ] **Step 2:** `npm run tsc && npm test` → PASS. **Commit** `feat(acciones): generar entreno, otra opción y borrar lo registrado`.

---

### Task 4: UI — `GenerarEntreno`, `FilaSesion`, «Borrar»

**Files:**
- Modify: `components/ui/Hoja.tsx` (prop `cerrar?: boolean`: al pasar a true, cierra el diálogo)
- Create: `components/GenerarEntreno.tsx`, `components/FilaSesion.tsx`
- Modify: `app/(app)/_hoy/TarjetaSesion.tsx` (exportar `Registrada`, `BotonNoLaHice`; «Borrar» en `Registrada`)

**Interfaces:**
- Consumes: `generar`, `otraOpcionAccion`, `borrarRegistrada`, `InicialGenerar`, `franja`, `Tarjeta`.
- Produces: `GenerarEntreno({ fecha, titulo, inicial, pedirChequeo, chequeoInicial?, principal })`; `FilaSesion({ tarjeta, hoy })`.

- [ ] **Step 1:** `Hoja`: añadir `cerrar?: boolean` y `useEffect(() => { if (cerrar) ref.current?.close() }, [cerrar])`.

- [ ] **Step 2:** `components/GenerarEntreno.tsx` (cliente): botón disparador «Generar entreno» (`BOTON` si `principal`, si no `BOTON_SECUNDARIO`, `w-full`), dentro de `Hoja` con título `Generar entreno · ${titulo}` un formulario con `useActionState(generar)` y `enviarSinVaciar`:
  - hidden `fecha`; `Opciones` `compania` (Solo/Con gente, 2 col), `lugar` (Rocódromo/Roca/Casa), `franja` (Mañana/Tarde, 2 col), input numérico `minutos` (10-600) con los valores de `inicial`;
  - si `pedirChequeo`: `<fieldset>` «¿Cómo llegas hoy?» con `CamposChequeo inicial={chequeoInicial}`;
  - botón «Generar» (`Generando…` mientras `pendiente`);
  - `estado.error` → `<p role="alert" className="text-sm text-rojo">`;
  - `estado.ok` → `Hoja cerrar` = true (se cierra; la página ya está revalidada);
  - `estado.descanso` → bloque «Toca descansar» con `motivo.motivo`, `<PorQue explicaciones={[motivo]} />` y, por cada alternativa, un `<button name="tipo" value={a.tipo}>` «Generar {a.nombre} · {a.minutos} min» (el primero, `core-movilidad`, como `BOTON`; el resto `BOTON_SECUNDARIO`), enviado con el mismo formulario.

- [ ] **Step 3:** `components/FilaSesion.tsx` (cliente): `<details className="rounded-2xl border border-borde bg-superficie">` con `summary` de ≥ 44 px: `Jue 6` (`Intl` `weekday: 'short'` + día) · `Mañana/Tarde` · nombre (`nombreSesion`) + `★` (`esCargaAlta`) · `N min` · chevron (`lucide-react` `ChevronDown` que rota con `group-open`). Contenido:
  - registrada: `<Registrada tarjeta={…} hoy={hoy} />` (lleva Corregir y Borrar);
  - sin registrar y `fecha >= hoy`: `PlanSesion` si hay `propuesta`; si `fecha === hoy` y hay propuesta, enlace «Empezar sesión» a `/sesion/{id}`; botón «Otra opción» (formulario con `otraOpcionAccion`, solo si `propuesta?.contexto`); `BotonNoLaHice` etiqueta «Quitar»;
  - sin registrar y pasada: «Regístrala en Hoy» (enlace a `/`).

- [ ] **Step 4:** En `TarjetaSesion.tsx`: `export function Registrada` y `export function BotonNoLaHice`; en `Registrada`, junto a «Corregir» (si `corregible`), un formulario `borrarRegistrada` con `onSubmit` que confirma `window.confirm('¿Borrar esta sesión? Se borra con lo que apuntaste.')` y botón «Borrar» (`text-rojo underline`, `min-h-11`).

- [ ] **Step 5:** `npm run tsc && npm test` → PASS. **Commit** `feat(ui): hoja «Generar entreno», filas compactas y «Borrar» lo registrado`.

---

### Task 5: Pantallas — Semana, Hoy, arranque

**Files:**
- Modify: `app/(app)/semana/page.tsx` (reescritura), `app/(app)/page.tsx`, `components/PieDeVia.tsx`, `components/ui/EstadoVacio.tsx` si hace falta un hijo en lugar de `accion`

- [ ] **Step 1: Semana** — mantener cabecera, rango, fase y navegación esta/siguiente semana. Cuerpo: `vistaAgenda(datos, lunes, hoy)`; una `<ol>` de 7 días: nombre del día (`lunes 2`, «Hoy» si es hoy), sus `FilaSesion`, y si `generable` un `GenerarEntreno` con `principal` en el primer día generable sin sesiones. `pedirChequeo` = `fecha === hoy && !datos.chequeos.some(c => c.fecha === hoy)`. Días pasados atenuados (`opacity-50`).
- [ ] **Step 2: Hoy** — sin «Próximo rato»; si `v.hoy.length === 0`: `EstadoVacio` «Nada para hoy» + `GenerarEntreno` para hoy (`principal`); «Próximas»: `v.proximas.slice(0, 5)` con `FilaSesion` + enlace «Ver la semana» (`/semana`); «Últimos 7 días»: `FilaSesion`.
- [ ] **Step 3: Arranque** — `PieDeVia` primer paso: `hecho: pasos.generado`, título «Genera tu primer entreno», acción enlace a `/semana` «Generar un entreno».
- [ ] **Step 4:** `npm run tsc && npm test && npm run build` → PASS. **Commit** `feat(semana): agenda de 7 días con «Generar entreno»; Hoy con Próximas compactas`.

---

### Task 6: e2e y spec

**Files:**
- Modify: `e2e/flujo.spec.ts` (sustituir «Mi semana: añadir un rato…»), `e2e/zz-navegacion.spec.ts` (test «con huecos…»), spec (§2: sin la regla de `validarSesion` con rojo; §1.3: sesiones antiguas sin contexto no tienen «Otra opción»)

- [ ] **Step 1:** Sustituir el e2e de «Mi semana» por:
```ts
test('Semana: generar un entreno para mañana, otra opción y en casa core y movilidad', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto('/semana')
  const manana = sumarDias(ahoraMadrid(new Date()).fecha, 1)
  // Si mañana es la semana siguiente, se va a ella.
  if (lunesDeEstaSemana() !== lunesDe(manana)) await page.getByRole('link', { name: 'Siguiente ›' }).click()
  const dia = page.getByRole('listitem').filter({ has: page.locator(`[data-fecha="${manana}"]`) })
  await dia.getByRole('button', { name: 'Generar entreno' }).click()
  await page.getByLabel('Rocódromo').check()
  await page.getByLabel('Mañana').check()
  await page.getByRole('button', { name: 'Generar', exact: true }).click()
  await expect(dia.locator('summary')).toContainText('Mañana')
  await expect(dia.getByRole('link', { name: 'Empezar sesión' })).toHaveCount(0)
  const antes = await dia.locator('summary').first().textContent()
  await dia.locator('summary').first().click()
  await dia.getByRole('button', { name: 'Otra opción' }).click()
  await expect(dia.locator('summary').first()).not.toHaveText(antes!)
})
```
(Cada día de Semana lleva `data-fecha` en su `<li>`; añadirlo en la Task 5 si no está. `lunesDe` de `lib/fecha`.) Añadir otro e2e: «Hoy: borrar un entrenamiento no planeado» (apuntar uno con el formulario existente, abrir su fila en «Últimos 7 días» o su tarjeta de hoy, «Borrar», aceptar el `confirm`, desaparece). El de «core y movilidad» se cubre con los tests del motor (provocar descanso en e2e depende de demasiado estado).
- [ ] **Step 2:** `zz-navegacion` «con huecos, sesión registrada…»: quitar la inserción de huecos y comprobar que el pie de vía no aparece con una sesión generada + registrada + test.
- [ ] **Step 3:** Worktree temporal + `npm ci` + `npx playwright test` → todo verde. `npm run build` verde.
- [ ] **Step 4: Commit** `test(e2e): generar entreno, otra opción y borrar`.
