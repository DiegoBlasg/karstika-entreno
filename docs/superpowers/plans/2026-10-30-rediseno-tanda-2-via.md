# Rediseño móvil · Tanda 2: la Vía — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La pestaña Vía dibuja la temporada como una vía de varios largos (fase = largo, semana = chapa, test = reunión, semana objetivo = cima) que se lee de abajo arriba, con hojas de detalle por largo y por reunión, y «Qué ha cambiado por tus resultados» debajo.

**Architecture:** Una función pura `vistaVia(d, hoy)` en `lib/datos/via.ts` (con tests) construye los largos, chapas, reuniones con su resultado y la cima a partir de `temporadaDe`, `evaluaciones`, `sesiones` y `registros`. La UI son componentes de servidor en `components/via/` que usan `Hoja` (tanda 0) para el detalle, más un pequeño componente de cliente que lleva la vista al largo actual. «Próximos días» sale de Vía y pasa a Semana tal cual. De paso, `progresoLargo` deja de anunciar un test que ya está hecho.

**Tech Stack:** Next.js 16.4, React 19, Tailwind 4 (tokens de la tanda 0), lucide-react 1.65, vitest 2, Playwright 1.64.

Spec: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md` (sección «Vía»). Rama: `rediseno-2`, desde `master` 7c49aeb.

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone (app instalada).
- Solo tema oscuro y solo los tokens de la tanda 0 (`fondo`, `fondo-hundido`, `superficie`, `superficie-2`, `borde`, `pista`, `texto`, `texto-2`, `texto-3`, `progreso`, `cima`, `ambar`, `rojo`). Lima = hecho/actual; gris (`pista`) = por hacer; naranja (`cima`) = cima.
- Reutilizar `components/estilos.ts`, `components/ui/*` (en especial `Hoja`, `Etiqueta`, `BarraProgreso`, `Aviso`), `components/iconos/Escalada.tsx` (`IconoCima`, `IconoReunion`, `IconoChapa`), `components/FondoTopo.tsx`.
- Zonas táctiles ≥ 44 px; foco visible; animaciones solo de color o el desplazamiento inicial, y este con `behavior: 'auto'` si el usuario pide reducir movimiento.
- No tocar `motor/`. En `lib/` solo `lib/datos/via.ts` (nuevo), `lib/datos/largo.ts` y sus tests.
- Leer la guía correspondiente en `node_modules/next/dist/docs/` antes de escribir código de Next. Borrar cualquier `AGENTS.md` sin seguimiento; nunca commitearlo.
- Navegador y e2e solo contra la base de PRUEBAS (`E2E_DATABASE_URL`), nunca producción.
- En cada tarea: `npm test`, `npm run tsc`, `npm run build` y (tarea 2) `npm run e2e` en verde.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Datos de la vía (`lib/datos/via.ts`) y test ya hecho en `progresoLargo`

**Files:**
- Create: `lib/datos/via.ts`, `lib/datos/via.test.ts`
- Modify: `lib/datos/largo.ts`, `lib/datos/largo.test.ts`

**Interfaces:**
- Consumes: `temporadaDe(d)` (`lib/datos/peticion.ts`), `lunesDe`, `sumarDias` (`lib/fecha.ts`), `FASES`, `FASE_OBJETIVO`, `fuerzaRelativa`, `type FaseId`, `type SemanaPlan` (`motor`), `evaluacionMotor` (`lib/datos/mapeo.ts`), `OBJETIVO_FASE`, `OBJETIVO_SEMANA_OBJETIVO` (`lib/nombres.ts`).
- Produces:

```ts
export type EstadoTramo = 'hecho' | 'actual' | 'futuro'

export interface ChapaVia {
  lunes: string
  estado: EstadoTramo
  descarga: boolean
  sesionesHechas: number      // registradas, sin descansos, en esa semana (solo hasta hoy)
}

export interface ResultadoTest {
  fecha: string
  lastreKg: number
  fuerzaRelativa: number      // % del peso
}

export interface ReunionVia {
  lunes: string               // lunes de la semana de test
  estado: 'hecha' | 'proxima' | 'futura' | 'sin-hacer'   // sin-hacer: la semana pasó sin resultado
  resultado: ResultadoTest | null                         // la última evaluación con fecha dentro de esa semana
}

export interface LargoVia {
  numero: number              // 1..n
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  objetivo: string            // OBJETIVO_FASE[faseId]
  estado: EstadoTramo
  chapas: ChapaVia[]
  sesionesHechas: number      // suma de las chapas
  reunion: ReunionVia | null  // la semana con reevaluar del largo, si la tiene
}

export interface VistaVia {
  largos: LargoVia[]
  cima: { lunes: string; actual: boolean; objetivo: string; grado: string }   // grado = perfil.grado_objetivo
  tests: ResultadoTest[]      // todas las evaluaciones, de la más antigua a la más reciente (evolución)
  aviso?: string              // si la temporada no se puede calcular
}

export function vistaVia(d: DatosAtleta, hoy: string): VistaVia
```

Reglas:
- Largos = tramos de semanas seguidas con el mismo `ciclo` y `faseId` de `temporadaDe(d).semanas`.
- Estado de una chapa: `hecho` si `lunes < lunesDe(hoy)`, `actual` si es igual, `futuro` si es mayor. Estado de un largo: `actual` si alguna chapa es `actual`; `hecho` si todas son `hecho`; si no, `futuro`. En la semana objetivo, todos los largos están `hecho`.
- Reunión: estado `hecha` si tiene resultado; si no, la primera reunión (en orden) sin resultado cuya semana termina hoy o después (`sumarDias(lunes, 6) >= hoy`) es `proxima` y las siguientes `futura`; las que terminaron antes de hoy sin resultado son `sin-hacer`.
- Cima: `lunes = temporada.objetivo`, `actual` si `lunesDe(hoy) === objetivo`, `objetivo = OBJETIVO_SEMANA_OBJETIVO`, `grado = d.perfil.grado_objetivo`.
- Si `temporadaDe` lanza: `{ largos: [], cima: { lunes: d.perfil.objetivo_temporada, actual: false, objetivo: OBJETIVO_SEMANA_OBJETIVO, grado: d.perfil.grado_objetivo }, tests, aviso: 'No se ha podido calcular la temporada: <mensaje>' }`.

Cambio en `progresoLargo` (`lib/datos/largo.ts`): la próxima reunión salta las semanas de test que ya tienen una evaluación con fecha dentro de esa semana y `<= hoy` (así «Test esta semana» desaparece al apuntar el resultado).

Temporada de prueba (`datosVacios()`: inicio 2026-11-02, objetivo 2027-10-04): 8 largos — base desde 2026-11-02 (4 semanas, sin test), fuerza desde 2026-11-30 (8 semanas; descargas 2026-12-21 y 2027-01-18; test 2027-01-18), resistencia desde 2027-01-25 (test 2027-03-01), rendimiento desde 2027-03-08 (test 2027-03-29), transición desde 2027-04-05, y el ciclo 2.

- [ ] **Step 1: Tests que fallan `lib/datos/via.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaRegistro } from './filas'
import { vistaVia } from './via'

const evaluacion = (n: number, fecha: string, lastre: number): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, tecnica: null })
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-12-01 20:00:00+00' })

describe('vistaVia', () => {
  it('8 largos; base sin reunión; fuerza con 8 chapas, dos descargas y la reunión del 18 de enero', () => {
    const v = vistaVia(datosVacios(), '2026-12-09')
    expect(v.aviso).toBeUndefined()
    expect(v.largos).toHaveLength(8)
    const [base, fuerza] = v.largos
    expect(base).toMatchObject({ numero: 1, faseId: 'base', estado: 'hecho', reunion: null })
    expect(base!.chapas).toHaveLength(4)
    expect(fuerza).toMatchObject({ numero: 2, faseId: 'fuerza', estado: 'actual', ciclo: 1 })
    expect(fuerza!.chapas.map((c) => c.estado)).toEqual(['hecho', 'actual', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro'])
    expect(fuerza!.chapas.filter((c) => c.descarga).map((c) => c.lunes)).toEqual(['2026-12-21', '2027-01-18'])
    expect(fuerza!.reunion).toEqual({ lunes: '2027-01-18', estado: 'proxima', resultado: null })
    expect(v.largos[2]!.reunion).toMatchObject({ lunes: '2027-03-01', estado: 'futura' })
    expect(v.largos.slice(2).every((l) => l.estado === 'futuro')).toBe(true)
    expect(v.cima).toEqual(expect.objectContaining({ lunes: '2027-10-04', actual: false, grado: '7a' }))
  })

  it('la reunión hecha lleva el último test de su semana y la siguiente pasa a ser la próxima', () => {
    const evaluaciones = [evaluacion(1, '2026-10-20', 5), evaluacion(2, '2027-01-19', 8), evaluacion(3, '2027-01-21', 10)]
    const v = vistaVia(datosVacios({ evaluaciones }), '2027-01-27')
    const fuerza = v.largos[1]!
    expect(fuerza.estado).toBe('hecho')
    expect(fuerza.reunion?.estado).toBe('hecha')
    expect(fuerza.reunion?.resultado).toMatchObject({ fecha: '2027-01-21', lastreKg: 10 })
    expect(fuerza.reunion?.resultado?.fuerzaRelativa).toBeCloseTo(114.29, 2)
    expect(v.largos[2]!.reunion?.estado).toBe('proxima')
    expect(v.tests.map((t) => t.fecha)).toEqual(['2026-10-20', '2027-01-19', '2027-01-21'])
  })

  it('una semana de test que pasó sin resultado queda «sin-hacer»', () => {
    const v = vistaVia(datosVacios(), '2027-01-27')
    expect(v.largos[1]!.reunion?.estado).toBe('sin-hacer')
    expect(v.largos[2]!.reunion?.estado).toBe('proxima')
  })

  it('cuenta en cada chapa las sesiones registradas de esa semana, sin descansos ni futuras', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-30'),
      sesionFila(uuid(2), '2026-12-02'),
      sesionFila(uuid(3), '2026-12-03'),                       // sin registrar
      sesionFila(uuid(4), '2026-12-07', { tipo: 'descanso' }),
      sesionFila(uuid(5), '2026-12-08'),
      sesionFila(uuid(6), '2026-12-10'),                       // después de hoy
    ]
    const registros = [uuid(1), uuid(2), uuid(4), uuid(5), uuid(6)].map(registro)
    const fuerza = vistaVia(datosVacios({ sesiones, registros }), '2026-12-09').largos[1]!
    expect(fuerza.chapas[0]!.sesionesHechas).toBe(2)
    expect(fuerza.chapas[1]!.sesionesHechas).toBe(1)
    expect(fuerza.sesionesHechas).toBe(3)
  })

  it('en la semana objetivo todo está hecho y la cima es la actual', () => {
    const v = vistaVia(datosVacios(), '2027-10-06')
    expect(v.largos.every((l) => l.estado === 'hecho')).toBe(true)
    expect(v.cima.actual).toBe(true)
  })

  it('si la temporada no se puede calcular avisa y no rompe', () => {
    const d = datosVacios()
    const v = vistaVia({ ...d, perfil: { ...d.perfil, objetivo_temporada: 'no-es-fecha' } }, '2026-12-09')
    expect(v.largos).toEqual([])
    expect(v.aviso).toMatch(/^No se ha podido calcular la temporada/)
  })
})
```

Añadir a `lib/datos/largo.test.ts`:

```ts
it('con el test de la semana ya apuntado, la próxima reunión es la siguiente', () => {
  const evaluaciones = [{ id: uuid(100), fecha: '2027-01-19', peso_corporal_kg: 70, lastre_kg: 8, resistencia_s: null, tecnica: null }]
  expect(progresoLargo(datosVacios({ evaluaciones }), '2027-01-20')?.proximaReunion).toEqual({ lunes: '2027-03-01', enSemanas: 6 })
})
```

(2027-01-18 → 2027-03-01 son 6 semanas. Si `planificarTemporada` lanza con un objetivo no válido de otra forma que la esperada en el último test de `via`, usar el error real y explicarlo; lo que importa es que `vistaVia` no lance.)

Run: `npx vitest run lib/datos/via.test.ts lib/datos/largo.test.ts` → FAIL.

- [ ] **Step 2: Implementar `lib/datos/via.ts`**

```ts
// La temporada como una vía de largos: fase = largo, semana = chapa, test = reunión, semana objetivo = cima. Puro.
import { FASES, fuerzaRelativa, type FaseId, type SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { OBJETIVO_FASE, OBJETIVO_SEMANA_OBJETIVO } from '../nombres'
import type { DatosAtleta } from './filas'
import { evaluacionMotor } from './mapeo'
import { temporadaDe } from './peticion'

// (interfaces de «Produces» arriba, exportadas tal cual)

const mensajeDe = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function vistaVia(d: DatosAtleta, hoy: string): VistaVia {
  const tests: ResultadoTest[] = [...d.evaluaciones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({ fecha: e.fecha, lastreKg: e.lastre_kg, fuerzaRelativa: fuerzaRelativa(evaluacionMotor(e)) }))
  const cimaBase = { objetivo: OBJETIVO_SEMANA_OBJETIVO, grado: d.perfil.grado_objetivo }
  let semanas: SemanaPlan[]
  let objetivo: string
  try {
    const t = temporadaDe(d)
    semanas = t.semanas
    objetivo = t.objetivo
  } catch (e) {
    return { largos: [], cima: { lunes: d.perfil.objetivo_temporada, actual: false, ...cimaBase }, tests, aviso: `No se ha podido calcular la temporada: ${mensajeDe(e)}` }
  }
  const lunesHoy = lunesDe(hoy)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const hechasEn = (lunes: string): number =>
    d.sesiones.filter((s) => s.fecha >= lunes && s.fecha <= sumarDias(lunes, 6) && s.fecha <= hoy && s.sesion.tipo !== 'descanso' && registradas.has(s.id)).length
  const resultadoEn = (lunes: string): ResultadoTest | null =>
    tests.filter((t) => t.fecha >= lunes && t.fecha <= sumarDias(lunes, 6) && t.fecha <= hoy).at(-1) ?? null

  const tramos: SemanaPlan[][] = []
  for (const s of semanas) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo[0]!.ciclo === s.ciclo && ultimo[0]!.faseId === s.faseId) ultimo.push(s)
    else tramos.push([s])
  }

  let proximaAsignada = false
  const largos: LargoVia[] = tramos.map((tramo, i) => {
    const chapas: ChapaVia[] = tramo.map((s) => ({
      lunes: s.lunes,
      estado: s.lunes < lunesHoy ? 'hecho' : s.lunes === lunesHoy ? 'actual' : 'futuro',
      descarga: s.descarga,
      sesionesHechas: s.lunes <= lunesHoy ? hechasEn(s.lunes) : 0,
    }))
    const estado: EstadoTramo = chapas.some((c) => c.estado === 'actual') ? 'actual' : chapas.every((c) => c.estado === 'hecho') ? 'hecho' : 'futuro'
    const semanaTest = tramo.find((s) => s.reevaluar)
    let reunion: ReunionVia | null = null
    if (semanaTest) {
      const resultado = resultadoEn(semanaTest.lunes)
      let estadoReunion: ReunionVia['estado']
      if (resultado) estadoReunion = 'hecha'
      else if (sumarDias(semanaTest.lunes, 6) < hoy) estadoReunion = 'sin-hacer'
      else if (!proximaAsignada) { estadoReunion = 'proxima'; proximaAsignada = true }
      else estadoReunion = 'futura'
      reunion = { lunes: semanaTest.lunes, estado: estadoReunion, resultado }
    }
    const primera = tramo[0]!
    return {
      numero: i + 1, ciclo: primera.ciclo, faseId: primera.faseId, fase: FASES[primera.faseId].nombre,
      objetivo: OBJETIVO_FASE[primera.faseId], estado, chapas,
      sesionesHechas: chapas.reduce((n, c) => n + c.sesionesHechas, 0), reunion,
    }
  })
  return { largos, cima: { lunes: objetivo, actual: lunesHoy === objetivo, ...cimaBase }, tests }
}
```

(`FaseId` se usa en las interfaces exportadas; si `OBJETIVO_FASE` no tiene la clave `transicion` o similar, el tipo `Record<FaseId, string>` ya lo garantiza.)

- [ ] **Step 3: `progresoLargo` salta el test ya hecho**

En `lib/datos/largo.ts`, sustituir la búsqueda de `test` por:

```ts
const hecho = (lunes: string): boolean => d.evaluaciones.some((e) => e.fecha >= lunes && e.fecha <= sumarDias(lunes, 6) && e.fecha <= hoy)
const test = posicion.semanaObjetivo ? undefined : t.semanas.find((s) => s.reevaluar && s.lunes >= lunes && !hecho(s.lunes))
```

e importar `sumarDias` de `../fecha`.

Run: `npx vitest run lib/datos/via.test.ts lib/datos/largo.test.ts` → PASS.

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run tsc && npm run build` → verde.

```bash
git add lib/datos/via.ts lib/datos/via.test.ts lib/datos/largo.ts lib/datos/largo.test.ts
git commit -m "feat(datos): la temporada como vía de largos, chapas y reuniones; el test ya hecho deja de anunciarse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pantalla Vía

**Files:**
- Create: `components/via/Via.tsx`, `components/via/Largo.tsx`, `components/via/Reunion.tsx`, `components/via/IrAlActual.tsx`, `app/(app)/semana/ProximosDias.tsx`
- Modify: `app/(app)/via/page.tsx`, `app/(app)/semana/page.tsx`, `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: `vistaVia`, tipos `VistaVia`, `LargoVia`, `ReunionVia`, `ChapaVia`, `ResultadoTest` (Task 1); `Hoja`, `Etiqueta`, `BarraProgreso`, `Aviso` (`components/ui`); `IconoCima`, `IconoReunion` (`components/iconos/Escalada.tsx`); `FondoTopo`; `TARJETA`, `TARJETA_DESTACADA`, `ETIQUETA`, `ENLACE` (`components/estilos.ts`).

Diseño (de abajo arriba, como se escala; se pinta en orden inverso con la cima arriba):

```
 ▲ CIMA · semana objetivo · 4 oct 2027 · 7a          (naranja)
 │
 ○ R · test · en 6 semanas / 114 % / sin hacer        (reunión: círculo; lima si hecha, borde gris si futura)
 ┃ L3 · Resistencia · 6 semanas                       (gris: futuro)
 ○ R2 …
 ┃ L2 · Fuerza · semana 2 de 8 · 3 sesiones           (largo actual: tarjeta con borde lima, BarraProgreso)
 ┃ L1 · Base ✓ · 4 semanas · 9 sesiones               (lima: hecho)
 ● Pie de vía · 2 nov 2026
```

- Raíl a la izquierda (columna de ~40 px): línea vertical de 4 px, `bg-progreso` en tramos hechos y en la parte hecha del actual, `bg-pista` en los futuros; una chapa (marca horizontal de 10 × 3 px) por semana, lima si `hecho`/`actual`, `pista` si `futuro`; las de descarga con un hueco o más finas (`opacity-60`). Reuniones como círculo de 20 px (`IconoReunion` o un círculo dibujado): relleno lima si `hecha`, borde lima si `proxima`, borde `texto-3` si `futura`, borde `ambar` si `sin-hacer`.
- Cada largo es un botón disparador de `Hoja` (el contenido de la fila es el disparador; toda la fila ≥ 44 px). El actual lleva `TARJETA_DESTACADA` y `aria-current="step"`, con «Semana X de Y · N sesiones» y `BarraProgreso` (`valor = semanas hechas / semanas`, `etiqueta = 'Semanas del largo'`). Los hechos llevan «✓» y «N sesiones»; los futuros, «N semanas».
- La hoja de un largo: `objetivo` del largo y la lista de sus chapas: «Semana del 30 nov» · «descarga» · «test» · «2 sesiones» (las pasadas) / «esta semana» / nada (futuras).
- Cada reunión es un disparador de `Hoja` con texto: `hecha` → «R{n} · {resultado.fuerzaRelativa redondeado} % del peso»; `proxima` → «Test · semana del 18 ene» (+ «esta semana» si toca); `futura` → «Test · semana del 1 mar»; `sin-hacer` → «Test sin hacer · semana del 18 ene». La hoja: el resultado («+10 kg de lastre · 114 % de tu peso» o «Pendiente»), la evolución con todos los `tests` (fecha · % del peso, el de esta reunión marcado) y un enlace «Apuntar un resultado» a `/progreso`. `n` = posición de esa reunión entre las que tienen semana de test (R1, R2…).
- Cima: fila con `IconoCima` naranja, «Cima · semana objetivo», fecha larga y «Grado objetivo: 7a»; si `actual`, destacada con borde `cima`.
- Pie de vía: un punto lima y «Pie de vía · {fecha de inicio}».
- `IrAlActual` (cliente): al montar, `document.getElementById('largo-actual')?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })` con `reduce = matchMedia('(prefers-reduced-motion: reduce)').matches`. No renderiza nada.

- [ ] **Step 1: Componentes**

`components/via/IrAlActual.tsx`:

```tsx
'use client'
import { useEffect } from 'react'

// Al entrar en Vía, el largo actual queda a la vista (la vía es larga y se lee de abajo arriba).
export function IrAlActual() {
  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('largo-actual')?.scrollIntoView({ block: 'center', behavior: reducir ? 'auto' : 'smooth' })
  }, [])
  return null
}
```

`components/via/Reunion.tsx`, `components/via/Largo.tsx` y `components/via/Via.tsx`: escribirlos según el diseño de arriba (componentes de servidor salvo `Hoja`, que ya es de cliente). Requisitos concretos:
- `Via({ vista, inicio }: { vista: VistaVia; inicio: string })` pinta `<ol aria-label="Tu vía, de la cima al pie">` con, en este orden: cima, y para cada largo de último a primero: su reunión (si la tiene) y el largo; al final, el pie de vía.
- El `<li>` del largo actual lleva `id="largo-actual"`.
- Fechas cortas con `Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })` sobre `${fecha}T12:00:00Z` (igual que la página Vía actual); fechas largas con `fechaLarga` de `lib/fecha.ts`.
- Nada de colores fuera de los tokens; textos de estado también en texto (no solo color): «✓», «actual», «sin hacer».

- [ ] **Step 2: Página `/via`**

`app/(app)/via/page.tsx` queda:
- Cabecera con `FondoTopo`: `Etiqueta` «Temporada · objetivo {fechaLarga(cima.lunes)}» y `<h1>` «Tu vía» (`font-titular text-4xl font-extrabold uppercase`, «vía» en `text-progreso`).
- `vista.aviso` → `<Aviso tono="ambar">`.
- `<Via vista={vista} inicio={datos.perfil.inicio_temporada} />` y `<IrAlActual />`.
- Debajo, la sección «Qué ha cambiado por tus resultados» (el componente `Cambios` actual, sin cambios de contenido; sus `<ul>` con `TARJETA` ya están en tokens).
- Se quitan «Próximos días» (pasa a Semana) y «El año» (lo sustituye la vía).

- [ ] **Step 3: «Próximos días» pasa a Semana**

Mover `FilaHueco` y `Semana` (el componente de la semana del plan) de `app/(app)/via/page.tsx` a `app/(app)/semana/ProximosDias.tsx`, exportando `ProximosDias({ datos, ahora })` que llama a `proximosDias(datos, ahora)` y pinta `<section>` con `<h2>` «Próximos días», «Esta semana» y «Semana siguiente» y la leyenda «★ = carga alta.», exactamente como estaban. Renderizarlo al final de `app/(app)/semana/page.tsx`. En el aviso «Orientativo…», el enlace «Mi semana» pasa a decir «Semana» (sigue apuntando a `/semana`).

- [ ] **Step 4: e2e**

En `e2e/flujo.spec.ts`, el test «Vía: próximos días, el año y una fuente desde «¿Por qué?»» pasa a:

```ts
test('Vía: la vía con el largo actual, una reunión y una fuente desde «¿Por qué?»', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Vía', exact: true }).click()
  await expect(page).toHaveURL(/\/via$/)
  await expect(page.getByRole('heading', { name: 'Tu vía' })).toBeVisible()
  await expect(page.locator('[aria-current="step"]')).toHaveCount(1)
  // El largo actual abre su hoja con el objetivo de la fase.
  await page.locator('[aria-current="step"]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('heading', { name: 'Qué ha cambiado por tus resultados' })).toBeVisible()
  await page.locator('summary', { hasText: '¿Por qué?' }).first().click()
  await page.getByRole('link', { name: 'detalle' }).first().click()
  await expect(page).toHaveURL(/\/fuentes\//)
  await expect(page.getByRole('heading', { name: 'Limitaciones' })).toBeVisible()
})
```

(Si `aria-current="step"` está en el `<li>` y el disparador es el `<button>` de dentro, hacer clic en `page.locator('[aria-current="step"] button').first()`; ajustar y explicarlo.) Y en el test de «Mi semana» añadir, tras entrar en Semana: `await expect(page.getByRole('heading', { name: 'Próximos días' })).toBeVisible()`.

- [ ] **Step 5: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e` → verde. Capturas a 390 × 844 contra la base de pruebas (servidor en el puerto 3200 con `DATABASE_URL` = `E2E_DATABASE_URL`, `CLAVE_ACCESO` = `E2E_CLAVE_ACCESO`, `SECRETO_SESION` de pruebas; script de Playwright en la carpeta temporal del sistema): Vía completa (página entera), Vía con la hoja de un largo abierta y con la de una reunión abierta, y Semana con «Próximos días», en `.superpowers/sdd/tanda2-*.png`. Mirarlas y corregir lo ilegible.

```bash
git add components/via "app/(app)/via" "app/(app)/semana" e2e
git commit -m "feat(via): la temporada como vía de largos con reuniones y cima; Próximos días pasa a Semana

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cierre de la tanda

- [ ] Revisión final de la rama (modelo más capaz): datos de la vía frente a la temporada real, estados de reuniones, accesibilidad de la lista y las hojas, nada perdido de «Qué ha cambiado» ni de «Próximos días».
- [ ] Fusionar en `master`, `npm test` sobre el resultado y subir a GitHub (Diego lo pide en cada tanda).
