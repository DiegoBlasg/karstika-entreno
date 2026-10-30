# Rediseño móvil · Tanda 1: navegación por pestañas y Hoy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Barra inferior de 5 pestañas (Hoy · Vía · Semana · Progreso · Yo), sesión en curso a pantalla completa, pantalla Hoy nueva con la mini-vía del largo actual y chequeo de un toque, y todas las zonas táctiles a ≥ 44 px.

**Architecture:** Lógica pura nueva en `lib/datos/largo.ts` (avance del largo) y `lib/ui/pestanas.ts` (pestaña activa), ambas con tests vitest. El layout de `app/(app)` pasa a tener la barra inferior; la sesión en curso se mueve a un grupo de rutas propio `app/(enfoque)` sin barra. `/plan` y `/evaluacion` se mueven a `/via` y `/progreso` (mismo contenido por ahora; las tandas 2 y 3 los rehacen) con redirecciones desde las rutas viejas. Hoy se recompone con los componentes de la tanda 0.

**Tech Stack:** Next.js 16.4 (App Router, route groups, `redirects` en `next.config.ts`, `usePathname`), React 19, Tailwind 4 (tokens de la tanda 0), lucide-react 1.65, vitest 2, Playwright 1.64.

Spec: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md` (secciones «Navegación y arquitectura de información», «Hoy», «Calidad UI/UX»). Rama: `rediseno-1`, desde `master` fbb508b.

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone (app instalada, `viewportFit: 'cover'`, barra de estado translúcida).
- Solo tema oscuro y solo los tokens de la tanda 0 (`fondo`, `fondo-hundido`, `superficie`, `superficie-2`, `borde`, `pista`, `texto`, `texto-2`, `texto-3`, `progreso`, `cima`, `ambar`, `rojo`); nada de colores nuevos ni de las paletas de Tailwind (stone, sky…).
- Reutilizar `components/estilos.ts` (BOTON, BOTON_SECUNDARIO, CAMPO, TARJETA, TARJETA_DESTACADA, ETIQUETA, CHIP, ENLACE) y `components/ui/*` (Tarjeta, Boton, Chip, Etiqueta, BarraProgreso, CifraGrande, EstadoVacio, Aviso, Hoja), `components/FondoTopo.tsx`, `components/iconos/Escalada.tsx`. `Boton` es `type="button"` por defecto: en formularios que envían, `type="submit"`.
- Zonas táctiles ≥ 44 × 44 px (`min-h-11`, `size-11`); una sola acción principal por pantalla; foco visible; nada de animaciones nuevas salvo transiciones de color.
- Márgenes seguros: arriba `env(safe-area-inset-top)`; la barra inferior respeta `env(safe-area-inset-bottom)`.
- No tocar `motor/`, ni `lib/` salvo `lib/datos/largo.ts`, `lib/ui/pestanas.ts` (nuevos) y sus tests. No tocar el worktree `D:/karstika-entreno-escaladas`.
- Antes de escribir código de Next, leer la guía correspondiente en `node_modules/next/dist/docs/` (AGENTS.md). Si `next dev` genera un `AGENTS.md` sin seguimiento, borrarlo; nunca commitearlo.
- Pruebas en navegador y e2e solo contra la base de PRUEBAS (`E2E_DATABASE_URL`), nunca producción.
- En cada tarea: `npm test`, `npm run tsc`, `npm run build` y `npm run e2e` en verde.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `lib/datos/largo.ts` (+ `.test.ts`) | `progresoLargo`, `textoReunion`, `tituloLargo` |
| `lib/ui/pestanas.ts` (+ `.test.ts`) | Definición de las 5 pestañas y `pestanaActiva(pathname)` |
| `components/BarraPestanas.tsx` | Barra inferior (cliente) |
| `app/(app)/layout.tsx` | Contenido + barra inferior |
| `app/(enfoque)/layout.tsx`, `app/(enfoque)/sesion/[id]/*` | Sesión en curso a pantalla completa (movida desde `app/(app)/sesion`) |
| `app/(app)/via/*`, `app/(app)/progreso/*` | Movidos desde `plan/` y `evaluacion/` |
| `next.config.ts` | Redirecciones `/plan` → `/via`, `/evaluacion` → `/progreso` |
| `app/(app)/perfil/page.tsx` | Gana «Biblioteca de ejercicios» y «Salir» |
| `components/MiniVia.tsx` | Tarjeta de la mini-vía (servidor) |
| `app/(app)/page.tsx` | Hoy recompuesto |
| `components/CamposChequeo.tsx` | Escalas de un toque |

---

### Task 1: Avance del largo (`lib/datos/largo.ts`)

**Files:**
- Create: `lib/datos/largo.ts`, `lib/datos/largo.test.ts`

**Interfaces:**
- Consumes: `temporadaDe(d)` de `lib/datos/peticion.ts` (devuelve `Temporada` con `semanas: SemanaPlan[]` — `{ lunes, ciclo, faseId, semanaDeFase, descarga, reevaluar }` — y `objetivo`, lunes de la semana objetivo); `posicionSiSePuede(d, fecha)` de `lib/datos/temporada.ts` (`PosicionTemporada | null` con `ciclo, faseId, fase, semanaDeFase, semanasDeFase, descarga, semanaObjetivo`); `lunesDe`, `sumarDias` de `lib/fecha.ts`; `FASES`, `FASE_OBJETIVO`, `type FaseId` de `motor`.
- Produces:

```ts
export interface ProgresoLargo {
  largo: number                  // 1..totalLargos: tramo de fase seguida (mismo ciclo y fase) que contiene hoy
  totalLargos: number            // tramos de fase de la temporada (sin la semana objetivo)
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  semanaDeFase: number
  semanasDeFase: number
  descarga: boolean
  sesionesHechas: number         // registradas, sin descansos, desde el lunes del largo hasta hoy (ambos incluidos)
  proximaReunion: { lunes: string; enSemanas: number } | null  // próxima semana de test (incluida la actual); null si no queda
  enCima: boolean                // semana objetivo
}
export function progresoLargo(d: DatosAtleta, hoy: string): ProgresoLargo | null
export function textoReunion(p: ProgresoLargo): string
export function tituloLargo(p: ProgresoLargo): string
```

Decisión (desviación consciente del spec, que decía «sesiones hechas y planeadas del largo»): las sesiones futuras no se guardan hasta aceptarlas, así que no hay un «planeadas» fiable. La barra mide **semanas del largo** (`semanaDeFase / semanasDeFase`) y el texto da las **sesiones hechas**.

Temporada de los datos de prueba (`datosVacios()`: inicio 2026-11-02, objetivo 2027-10-04). Tramos del ciclo 1: base desde 2026-11-02 (4 semanas, sin test), fuerza desde 2026-11-30 (8, test la semana del 2027-01-18), resistencia desde 2027-01-25 (test 2027-03-01), rendimiento desde 2027-03-08 (test 2027-03-29), transición desde 2027-04-05; ciclo 2: fuerza desde 2027-04-19, resistencia, rendimiento → 8 largos. Si al ejecutar `temporadaDe(datosVacios())` el número de tramos no es 8 (el ciclo 2 depende del diagnóstico), **no ajustar el test a ciegas**: comprobar con un `console.log` temporal los tramos reales, poner ese número y explicarlo en el informe.

- [ ] **Step 1: Test que falla `lib/datos/largo.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaRegistro } from './filas'
import { progresoLargo, textoReunion, tituloLargo } from './largo'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-12-01 20:00:00+00' })

describe('progresoLargo', () => {
  it('fuera de temporada devuelve null', () => {
    expect(progresoLargo(datosVacios(), '2026-10-20')).toBeNull()
  })

  it('primer miércoles de base: largo 1 de 8 y el primer test en la fuerza', () => {
    expect(progresoLargo(datosVacios(), '2026-11-04')).toEqual({
      largo: 1, totalLargos: 8, ciclo: 1, faseId: 'base', fase: 'Base técnica y adaptación', semanaDeFase: 1, semanasDeFase: 4,
      descarga: false, sesionesHechas: 0, proximaReunion: { lunes: '2027-01-18', enSemanas: 11 }, enCima: false,
    })
  })

  it('en fuerza cuenta solo las registradas del largo, sin descansos ni futuras', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-28'),                       // antes del largo
      sesionFila(uuid(2), '2026-11-30'),                       // primer día del largo
      sesionFila(uuid(3), '2026-12-02'),
      sesionFila(uuid(4), '2026-12-03'),                       // sin registrar
      sesionFila(uuid(5), '2026-12-05', { tipo: 'descanso' }), // descanso
      sesionFila(uuid(6), '2026-12-10'),                       // después de hoy
    ]
    const registros = [uuid(1), uuid(2), uuid(3), uuid(5), uuid(6)].map(registro)
    const p = progresoLargo(datosVacios({ sesiones, registros }), '2026-12-09')
    expect(p).toMatchObject({ largo: 2, faseId: 'fuerza', semanaDeFase: 2, semanasDeFase: 8, sesionesHechas: 2 })
    expect(p?.proximaReunion).toEqual({ lunes: '2027-01-18', enSemanas: 6 })
  })

  it('la semana del test tiene la reunión «esta semana»', () => {
    expect(progresoLargo(datosVacios(), '2027-01-20')?.proximaReunion).toEqual({ lunes: '2027-01-18', enSemanas: 0 })
  })

  it('la semana objetivo es la cima, sin más reuniones', () => {
    expect(progresoLargo(datosVacios(), '2027-10-06')).toMatchObject({ enCima: true, proximaReunion: null, largo: 8, totalLargos: 8 })
  })
})

describe('textos', () => {
  const base = progresoLargo(datosVacios(), '2026-11-04')!
  it('reunión', () => {
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 0 } })).toBe('Test esta semana')
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 1 } })).toBe('Test la semana que viene')
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 11 } })).toBe('Test en 11 semanas')
    expect(textoReunion({ ...base, proximaReunion: null })).toBe('No quedan tests en la temporada')
    expect(textoReunion({ ...base, enCima: true, proximaReunion: null })).toBe('Semana objetivo: a por la cima')
  })
  it('título', () => {
    expect(tituloLargo(base)).toBe('Base técnica y adaptación')
    expect(tituloLargo({ ...base, descarga: true })).toBe('Base técnica y adaptación · descarga')
    expect(tituloLargo({ ...base, enCima: true })).toBe('Semana objetivo')
  })
})
```

Run: `npx vitest run lib/datos/largo.test.ts` → FAIL (no existe `./largo`).

- [ ] **Step 2: Implementar `lib/datos/largo.ts`**

```ts
// El largo de la temporada en el que estás (fase seguida de un ciclo) y cuánto llevas. Puro.
import { FASE_OBJETIVO, type FaseId, type SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { temporadaDe } from './peticion'
import { posicionSiSePuede } from './temporada'

export interface ProgresoLargo {
  largo: number
  totalLargos: number
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  semanaDeFase: number
  semanasDeFase: number
  descarga: boolean
  sesionesHechas: number
  proximaReunion: { lunes: string; enSemanas: number } | null
  enCima: boolean
}

// Tramos de semanas seguidas con el mismo ciclo y fase, en orden.
function largosDe(semanas: readonly SemanaPlan[]): SemanaPlan[][] {
  const largos: SemanaPlan[][] = []
  for (const s of semanas) {
    const ultimo = largos.at(-1)
    if (ultimo && ultimo[0]!.ciclo === s.ciclo && ultimo[0]!.faseId === s.faseId) ultimo.push(s)
    else largos.push([s])
  }
  return largos
}

const semanasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / (7 * 86_400_000))

export function progresoLargo(d: DatosAtleta, hoy: string): ProgresoLargo | null {
  const posicion = posicionSiSePuede(d, hoy)
  if (!posicion) return null
  try {
    const t = temporadaDe(d)
    const largos = largosDe(t.semanas)
    const lunes = lunesDe(hoy)
    const indice = posicion.semanaObjetivo ? largos.length - 1 : largos.findIndex((l) => l.some((s) => s.lunes === lunes))
    if (indice < 0) return null
    const inicio = posicion.semanaObjetivo ? t.objetivo : largos[indice]![0]!.lunes
    const registradas = new Set(d.registros.map((r) => r.sesion_id))
    const sesionesHechas = d.sesiones.filter(
      (s) => s.fecha >= inicio && s.fecha <= hoy && s.sesion.tipo !== 'descanso' && registradas.has(s.id),
    ).length
    const test = posicion.semanaObjetivo ? undefined : t.semanas.find((s) => s.reevaluar && s.lunes >= lunes)
    return {
      largo: indice + 1,
      totalLargos: largos.length,
      ciclo: posicion.ciclo,
      faseId: posicion.faseId,
      fase: posicion.fase,
      semanaDeFase: posicion.semanaDeFase,
      semanasDeFase: posicion.semanasDeFase,
      descarga: posicion.descarga,
      sesionesHechas,
      proximaReunion: test ? { lunes: test.lunes, enSemanas: semanasEntre(lunes, test.lunes) } : null,
      enCima: posicion.semanaObjetivo,
    }
  } catch {
    return null
  }
}

export function textoReunion(p: ProgresoLargo): string {
  if (p.enCima) return 'Semana objetivo: a por la cima'
  if (!p.proximaReunion) return 'No quedan tests en la temporada'
  const n = p.proximaReunion.enSemanas
  if (n === 0) return 'Test esta semana'
  if (n === 1) return 'Test la semana que viene'
  return `Test en ${n} semanas`
}

export function tituloLargo(p: ProgresoLargo): string {
  if (p.enCima) return FASE_OBJETIVO.nombre
  return p.descarga ? `${p.fase} · descarga` : p.fase
}
```

Comprobar que `SemanaPlan` y `FASE_OBJETIVO` se exportan desde `motor/index.ts` (si `SemanaPlan` no, importarlo como tipo desde `../../motor/temporada`). `sumarDias` solo si hace falta; si no se usa, no importarlo.

Run: `npx vitest run lib/datos/largo.test.ts` → PASS.

- [ ] **Step 3: Verificar y commit**

Run: `npm test && npm run tsc && npm run build` → verde (sin UI aún, no hace falta e2e en esta tarea).

```bash
git add lib/datos/largo.ts lib/datos/largo.test.ts
git commit -m "feat(datos): avance del largo actual de la temporada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Navegación por pestañas y sesión a pantalla completa

**Files:**
- Create: `lib/ui/pestanas.ts`, `lib/ui/pestanas.test.ts`, `components/BarraPestanas.tsx`, `app/(enfoque)/layout.tsx`
- Move (con `git mv`): `app/(app)/sesion` → `app/(enfoque)/sesion`; `app/(app)/plan` → `app/(app)/via`; `app/(app)/evaluacion` → `app/(app)/progreso`
- Modify: `app/(app)/layout.tsx`, `next.config.ts`, `app/(app)/perfil/page.tsx`, imports relativos de los ficheros movidos, enlaces y `revalidatePath` a `/plan` y `/evaluacion`, `e2e/flujo.spec.ts`
- Test: `e2e/navegacion.spec.ts`

**Interfaces:**
- Produces (`lib/ui/pestanas.ts`):

```ts
export type PestanaId = 'hoy' | 'via' | 'semana' | 'progreso' | 'yo'
export const PESTANAS: readonly { id: PestanaId; href: string; etiqueta: string }[]
export function pestanaActiva(pathname: string): PestanaId | null
```

- [ ] **Step 1: Leer las guías** — route groups y layouts (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` y `layout.md`), `redirects` (`.../05-config/01-next-config-js/redirects.md`), `usePathname` (`.../04-functions/use-pathname.md`). Si alguna ruta no existe con ese nombre, buscarla con Grep en `node_modules/next/dist/docs`.

- [ ] **Step 2: Test que falla `lib/ui/pestanas.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { PESTANAS, pestanaActiva } from './pestanas'

describe('pestañas', () => {
  it('son cinco y en este orden', () => {
    expect(PESTANAS.map((p) => [p.id, p.href, p.etiqueta])).toEqual([
      ['hoy', '/', 'Hoy'], ['via', '/via', 'Vía'], ['semana', '/semana', 'Semana'], ['progreso', '/progreso', 'Progreso'], ['yo', '/perfil', 'Yo'],
    ])
  })
  it.each([
    ['/', 'hoy'], ['/via', 'via'], ['/semana', 'semana'], ['/semana?lunes=2026-11-02', 'semana'], ['/entrenar', 'semana'],
    ['/progreso', 'progreso'], ['/perfil', 'yo'], ['/biblioteca', 'yo'], ['/biblioteca/hombro-a', 'yo'], ['/fuentes/x', 'yo'],
  ])('%s → %s', (ruta, id) => {
    expect(pestanaActiva(ruta)).toBe(id)
  })
  it('rutas que solo empiezan igual no cuentan', () => {
    expect(pestanaActiva('/viajes')).toBeNull()
    expect(pestanaActiva('/semanal')).toBeNull()
    expect(pestanaActiva('/muestrario')).toBeNull()
  })
})
```

Run: `npx vitest run lib/ui/pestanas.test.ts` → FAIL.

- [ ] **Step 3: `lib/ui/pestanas.ts`**

```ts
// Las cinco pestañas de la barra inferior y cuál se marca en cada ruta. Puro.
export type PestanaId = 'hoy' | 'via' | 'semana' | 'progreso' | 'yo'

export const PESTANAS: readonly { id: PestanaId; href: string; etiqueta: string }[] = [
  { id: 'hoy', href: '/', etiqueta: 'Hoy' },
  { id: 'via', href: '/via', etiqueta: 'Vía' },
  { id: 'semana', href: '/semana', etiqueta: 'Semana' },
  { id: 'progreso', href: '/progreso', etiqueta: 'Progreso' },
  { id: 'yo', href: '/perfil', etiqueta: 'Yo' },
]

// Rutas de detalle que cuelgan de una pestaña: Entrenar de Semana; Biblioteca y Fuentes de Yo.
const PREFIJOS: readonly [string, PestanaId][] = [
  ['/via', 'via'], ['/semana', 'semana'], ['/entrenar', 'semana'], ['/progreso', 'progreso'],
  ['/perfil', 'yo'], ['/biblioteca', 'yo'], ['/fuentes', 'yo'],
]

export function pestanaActiva(pathname: string): PestanaId | null {
  const ruta = pathname.split('?')[0]!
  if (ruta === '/') return 'hoy'
  for (const [prefijo, id] of PREFIJOS) if (ruta === prefijo || ruta.startsWith(`${prefijo}/`)) return id
  return null
}
```

Run: `npx vitest run lib/ui/pestanas.test.ts` → PASS.

- [ ] **Step 4: `components/BarraPestanas.tsx`**

Comprobar en `node_modules/lucide-react` que existen `House`, `CalendarDays`, `TrendingUp` y `CircleUser` (si alguno cambió de nombre, usar el equivalente y anotarlo).

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CircleUser, House, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { IconoCima } from './iconos/Escalada'
import { PESTANAS, pestanaActiva, type PestanaId } from '@/lib/ui/pestanas'

const ICONO: Record<PestanaId, ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  hoy: House, via: IconoCima, semana: CalendarDays, progreso: TrendingUp, yo: CircleUser,
}

export function BarraPestanas() {
  const activa = pestanaActiva(usePathname())
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-fondo-hundido/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {PESTANAS.map((p) => {
          const Icono = ICONO[p.id]
          const actual = p.id === activa
          return (
            <li key={p.id} className="flex-1">
              <Link
                href={p.href}
                aria-current={actual ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${actual ? 'text-progreso' : 'text-texto-2'}`}
              >
                <Icono size={22} aria-hidden />
                {p.etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

Si el tipo de `ICONO` no encaja con los props de lucide o de `IconoCima`, simplificarlo a `ComponentType<{ size?: number }>` y pasar `aria-hidden` solo donde lo acepte (los iconos propios ya son `aria-hidden` sin `titulo`); `npm run tsc` manda.

- [ ] **Step 5: Layouts**

`app/(app)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { BarraPestanas } from '@/components/BarraPestanas'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BarraPestanas />
    </>
  )
}
```

`git mv "app/(app)/sesion" "app/(enfoque)/sesion"` y crear `app/(enfoque)/layout.tsx` (sin barra; una cabecera con «Cerrar» que vuelve a Hoy — la sesión del cronómetro se guarda en localStorage, así que salir no pierde nada):

```tsx
import Link from 'next/link'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export default function LayoutEnfoque({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex justify-end py-2">
        <Link href="/" aria-label="Cerrar y volver a Hoy" className="flex size-11 items-center justify-center rounded-full text-texto-2">
          <X size={22} aria-hidden />
        </Link>
      </header>
      <main>{children}</main>
    </div>
  )
}
```

Arreglar los imports relativos de los ficheros movidos: `Cronometro.tsx` importa `'../../_hoy/FormularioRegistro'` y `FormularioResultadoTest.tsx` `'../../evaluacion/acciones'`; cambiarlos a `@/app/(app)/_hoy/FormularioRegistro` y `@/app/(app)/progreso/acciones` (el alias `@/*` apunta a la raíz). Buscar con Grep `from '\.\.` en `app/(enfoque)`, `app/(app)/via` y `app/(app)/progreso` por si hay más.

- [ ] **Step 6: Mover Plan y Evaluación, redirecciones y enlaces**

`git mv "app/(app)/plan" "app/(app)/via"` y `git mv "app/(app)/evaluacion" "app/(app)/progreso"`. En esta tanda el contenido no cambia salvo:
- `via/page.tsx`: el `<h1>` pasa de «Plan» a «Vía».
- `progreso/page.tsx`: el `<h1>` pasa de «Evaluación» a «Progreso» y el enlace «Ir a Entrenar» se queda.
- `revalidatePath('/evaluacion')` → `revalidatePath('/progreso')` (en `progreso/acciones.ts`, 2 sitios). Buscar con Grep todo `'/plan'`, `"/plan"`, `'/evaluacion'`, `"/evaluacion"` y `Evaluación</Link>` en `app/` y `components/` y actualizar enlaces y textos (p. ej. `Cronometro.tsx` «hazlo en Evaluación» → «hazlo en Progreso» con `href="/progreso"`; `TarjetaSesion.tsx` «apunta el resultado en Evaluación» → «en Progreso»; Hoy «Apuntarlo en Evaluación» → «Apuntarlo en Progreso»).

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Rutas de antes del rediseño: los enlaces guardados siguen funcionando.
  async redirects() {
    return [
      { source: '/plan', destination: '/via', permanent: false },
      { source: '/evaluacion', destination: '/progreso', permanent: false },
    ]
  },
}

export default config
```

- [ ] **Step 7: Yo (Perfil) gana Biblioteca y Salir**

En `app/(app)/perfil/page.tsx`, debajo del formulario:

```tsx
<section className="space-y-2 border-t border-borde pt-4">
  <Link href="/biblioteca" className={`${BOTON_SECUNDARIO} w-full`}>Biblioteca de ejercicios</Link>
  <form action={salir}>
    <button type="submit" className={`${BOTON_SECUNDARIO} w-full text-rojo`}>Salir</button>
  </form>
</section>
```

con `import Link from 'next/link'`, `import { BOTON_SECUNDARIO } from '@/components/estilos'` y `import { salir } from '../acciones'`. El `<h1>` pasa a «Yo» solo si el e2e no depende de «Perfil» (comprobar con Grep en `e2e/`); si depende, dejarlo en «Perfil».

- [ ] **Step 8: e2e**

Actualizar `e2e/flujo.spec.ts`:
- `getByRole('link', { name: 'Mi semana' })` → `getByRole('link', { name: 'Semana', exact: true })`.
- El test «Plan: próximos días…»: el enlace pasa a `getByRole('link', { name: 'Vía', exact: true })` y la URL esperada a `/\/via$/`; el resto de aserciones (encabezados «Próximos días», «El año», «Qué ha cambiado por tus resultados», `li[aria-current="date"]`) siguen igual porque el contenido no cambia.
- Cualquier `goto('/evaluacion')` o texto «Evaluación» → `/progreso`.

Crear `e2e/navegacion.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('la barra inferior lleva a las cinco secciones y marca la actual', async ({ page }) => {
  const barra = page.getByRole('navigation', { name: 'Secciones' })
  for (const [nombre, url] of [['Vía', /\/via$/], ['Semana', /\/semana$/], ['Progreso', /\/progreso$/], ['Yo', /\/perfil$/], ['Hoy', /\/$/]] as const) {
    await barra.getByRole('link', { name: nombre, exact: true }).click()
    await expect(page).toHaveURL(url)
    await expect(barra.getByRole('link', { name: nombre, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('las rutas antiguas redirigen', async ({ page }) => {
  await page.goto('/plan')
  await expect(page).toHaveURL(/\/via$/)
  await page.goto('/evaluacion')
  await expect(page).toHaveURL(/\/progreso$/)
})

test('Yo tiene la biblioteca y salir', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByRole('link', { name: 'Biblioteca de ejercicios' }).click()
  await expect(page).toHaveURL(/\/biblioteca$/)
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
})
```

(`e2e/flujo.spec.ts` deja perfil y datos en la base de pruebas; si `navegacion.spec.ts` corre antes y no hay perfil, `/` redirige a `/perfil` y el `toHaveURL(/\/$/)` del `beforeEach` falla: en ese caso nombrar el fichero para que corra después, p. ej. `e2e/zz-navegacion.spec.ts`, o quitar esa aserción y explicar la decisión en el informe.)

- [ ] **Step 9: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e` → verde. Captura en 390 × 844 (base de pruebas) de Hoy, Vía y una sesión (`/sesion/<id>` sin barra), guardadas en `.superpowers/sdd/tanda1-task2-*.png`.

```bash
git add -A app components lib/ui next.config.ts e2e
git commit -m "feat(app): barra inferior de pestañas, sesión a pantalla completa, Vía y Progreso con redirecciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Antes de `git add -A`, `git status` para confirmar que no entra nada ajeno: ni `AGENTS.md`, ni capturas, ni scripts temporales.)

---

### Task 3: Pantalla Hoy

**Files:**
- Create: `components/MiniVia.tsx`
- Modify: `app/(app)/page.tsx`, `app/(app)/_hoy/TarjetaSesion.tsx`, `app/(app)/_hoy/TarjetaChequeo.tsx`, `components/CamposChequeo.tsx`, `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: `progresoLargo`, `textoReunion`, `tituloLargo`, `type ProgresoLargo` (Task 1); `/via` (Task 2); `TARJETA`, `TARJETA_DESTACADA`, `BOTON` de `components/estilos.ts`; `Etiqueta`, `BarraProgreso`, `EstadoVacio`, `Aviso` de `components/ui`; `FondoTopo`.
- Produces: `MiniVia({ largo }: { largo: ProgresoLargo })`; `TarjetaSesion` gana la prop opcional `destacada?: boolean`.

- [ ] **Step 1: `components/MiniVia.tsx`**

```tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { TARJETA } from './estilos'
import { BarraProgreso } from './ui/BarraProgreso'
import { Etiqueta } from './ui/Etiqueta'
import { textoReunion, type ProgresoLargo } from '@/lib/datos/largo'

// Tramo de vía del largo actual: hecho en lima hasta tu posición, por hacer en gris, cima en naranja. Lleva a Vía.
export function MiniVia({ largo }: { largo: ProgresoLargo }) {
  const hechas = largo.sesionesHechas === 1 ? '1 sesión hecha' : `${largo.sesionesHechas} sesiones hechas`
  return (
    <Link href="/via" className={`${TARJETA} flex items-center gap-4`}>
      <svg aria-hidden="true" width="28" height="76" viewBox="0 0 28 76" className="shrink-0">
        <line x1="14" y1="12" x2="14" y2="70" className="stroke-pista" strokeWidth="3" />
        <line x1="14" y1="40" x2="14" y2="70" className="stroke-progreso" strokeWidth="3" />
        <path d="M6 13 L14 1 L22 13 Z" className="fill-cima" />
        <circle cx="14" cy="66" r="4" className="fill-progreso" />
        <circle cx="14" cy="40" r="7" className="fill-fondo stroke-progreso" strokeWidth="3" />
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Etiqueta as="p">Largo {largo.largo} de {largo.totalLargos} · ciclo {largo.ciclo}</Etiqueta>
        <p>
          {largo.enCima ? 'Semana objetivo' : `Semana ${largo.semanaDeFase} de ${largo.semanasDeFase}`} · {hechas}
        </p>
        <BarraProgreso valor={largo.semanaDeFase / largo.semanasDeFase} etiqueta="Semanas del largo" />
        <p className="flex items-center gap-1 text-sm text-texto-2">
          {textoReunion(largo)} <ChevronRight size={16} aria-hidden />
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Chequeo de un toque (`components/CamposChequeo.tsx`)**

Sustituir el `<select>` de cada escala por un grupo de 5 radios con el mismo `name` (las acciones leen `FormData` igual). Antes, Grep de `sueno`, `fatiga`, `ganas` en `app/` y `components/` para confirmar que nadie lee el `<select>` desde el cliente.

```tsx
{ESCALAS.map((e) => (
  <fieldset key={e.nombre} className="space-y-1.5">
    <legend>
      {e.etiqueta} <span className="text-xs text-texto-2">(1 = {e.bajo}, 5 = {e.alto})</span>
    </legend>
    <div className="grid grid-cols-5 gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="block">
          <input
            type="radio" name={e.nombre} value={n} defaultChecked={n === (inicial?.[e.nombre] ?? 3)}
            aria-label={`${e.etiqueta} ${n}`} className="peer sr-only"
          />
          <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-borde bg-superficie-2 font-titular text-lg font-bold transition-colors peer-checked:border-progreso peer-checked:bg-progreso peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
            {n}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
))}
```

Quitar el import de `CAMPO` si deja de usarse.

- [ ] **Step 3: `TarjetaSesion` destacada y botón principal**

En `app/(app)/_hoy/TarjetaSesion.tsx`:
- Nueva prop `destacada?: boolean` → `<article className={destacada ? TARJETA_DESTACADA : TARJETA}>`.
- El enlace al cronómetro pasa a ser la acción principal: `<Link href={`/sesion/${fila.id}`} className={`${BOTON} w-full`}><Play size={18} aria-hidden /> Empezar sesión</Link>` (import `Play` de lucide-react).
- Cuando hay ese enlace (hoy, con propuesta), «Terminar» pasa a `BOTON_SECUNDARIO` (una sola acción principal por tarjeta); si no hay enlace, «Terminar» sigue con `BOTON`.
- «Al terminar el test, apunta el resultado en Progreso» con `href="/progreso"` (si la Task 2 no lo cambió ya).

En `TarjetaChequeo.tsx`, el botón «Ahora no» gana `min-h-11 px-2`.

- [ ] **Step 4: `app/(app)/page.tsx` (Hoy)**

Mantener los mismos datos (`vistaHoy`, `proximoHueco`, `testsSinResultado`, `posicionDe`) y componer:

```tsx
import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { FondoTopo } from '@/components/FondoTopo'
import { MiniVia } from '@/components/MiniVia'
import { Aviso } from '@/components/ui/Aviso'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { testsSinResultado, vistaHoy } from '@/lib/datos/hoy'
import { progresoLargo, tituloLargo } from '@/lib/datos/largo'
import { proximoHueco } from '@/lib/datos/semana'
import { posicionSiSePuede, type PosicionTemporada } from '@/lib/datos/temporada'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import { NOMBRE_ZONA, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonAlta } from './_hoy/BotonAlta'
import { FormularioEntrenamientoLibre } from './_hoy/FormularioEntrenamientoLibre'
import { TarjetaChequeo } from './_hoy/TarjetaChequeo'
import { TarjetaSesion } from './_hoy/TarjetaSesion'

const PLEGABLE = 'rounded-2xl border border-borde bg-superficie'
const RESUMEN = 'flex min-h-11 cursor-pointer items-center justify-between px-4 py-2 font-titular text-lg font-bold uppercase'

export default async function PaginaHoy() {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const proximo = proximoHueco(datos, { fecha: hoy, minutos: Math.round(ahora.hora * 60) })
  const v = vistaHoy(datos, hoy)
  const sinResultado = testsSinResultado(datos, hoy)
  const largo = progresoLargo(datos, hoy)
  const posiciones = new Map<string, PosicionTemporada | null>()
  const posicionDe = (fecha: string): PosicionTemporada | null => {
    if (!posiciones.has(fecha)) posiciones.set(fecha, posicionSiSePuede(datos, fecha))
    return posiciones.get(fecha)!
  }
  return (
    <div className="space-y-5">
      <header className="relative -mx-4 overflow-hidden px-4 pb-1 pt-2">
        <FondoTopo />
        <div className="relative">
          <Etiqueta as="p">{fechaLarga(hoy)}</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none text-progreso">{largo ? tituloLargo(largo) : 'Hoy'}</h1>
        </div>
      </header>

      {largo && <MiniVia largo={largo} />}

      {v.zonasRojo.length > 0 && (
        <Aviso tono="rojo" className="space-y-2">
          <p className="font-medium">En rojo: {v.zonasRojo.map((z) => NOMBRE_ZONA[z]).join(', ')}. No cargues esas zonas.</p>
          <AvisoMedico />
          {v.zonasRojo.map((z) => <BotonAlta key={z} zona={z} />)}
        </Aviso>
      )}
      {v.zonasAmbar.length > 0 && (
        <Aviso tono="ambar">En ámbar: {v.zonasAmbar.map((z) => NOMBRE_ZONA[z]).join(', ')}. No subas la carga de esas zonas.</Aviso>
      )}
      {sinResultado.map((f) => (
        <Aviso key={f} tono="info">
          Te falta apuntar el resultado del test del {fechaLarga(f)}. <Link href="/progreso" className="text-progreso underline">Apuntarlo en Progreso</Link>
        </Aviso>
      ))}

      {v.pedirChequeo && <TarjetaChequeo hoy={hoy} />}

      {v.hoy.length === 0 ? (
        <EstadoVacio titulo="Nada para hoy" texto="No tienes ninguna sesión para hoy." accion={{ href: '/entrenar', texto: 'Preparar una' }} />
      ) : (
        v.hoy.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} destacada={!t.registro} />)
      )}

      {proximo && (
        <p className="text-sm text-texto-2">
          Próximo hueco: {fechaLarga(proximo.fila.fecha)} {hhmmDeMinutos(proximo.fila.inicio_min)} ·{' '}
          {proximo.estado.tipo === 'planeado'
            ? `${nombreSesion(proximo.estado.sesion)}${proximo.estado.cargaAlta ? ' ★' : ''}`
            : proximo.estado.tipo === 'libre' ? 'libre' : 'sin plan'}
          {' · '}<Link href="/semana" className="text-progreso underline">Semana</Link>
        </p>
      )}

      {v.pendientes.length > 0 && (
        <details className="rounded-2xl border border-ambar/40 bg-ambar/10">
          <summary className={`${RESUMEN} text-ambar`}>
            <span>{v.pendientes.length === 1 ? '1 sesión sin registrar' : `${v.pendientes.length} sesiones sin registrar`}</span>
            <span className="text-sm">Apuntar ›</span>
          </summary>
          <div className="space-y-3 p-3 pt-0">
            <p className="text-sm text-texto-2">Las sesiones sin registro no cuentan para progresar: apunta cómo fueron.</p>
            {v.pendientes.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}

      {v.proximas.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>Próximas</summary>
          <div className="space-y-3 p-3 pt-0">
            {v.proximas.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}
      {v.recientes.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>Últimos 7 días</summary>
          <div className="space-y-3 p-3 pt-0">
            {[...v.recientes].reverse().map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}

      <FormularioEntrenamientoLibre hoy={hoy} hora={ahora.hhmm} />
    </div>
  )
}
```

Comprobar las firmas reales antes de copiar (p. ej. `BotonAlta`, `FormularioEntrenamientoLibre`, `proximoHueco`): la página actual (`git show HEAD:"app/(app)/page.tsx"`) es la referencia de los datos. Si «Próximas» o «Sin registrar» se usan en e2e como encabezados visibles (Grep en `e2e/`), abrir el `<details>` correspondiente en el test antes de buscar dentro.

- [ ] **Step 5: e2e**

Actualizar `e2e/flujo.spec.ts`:
- `getByRole('link', { name: 'Empezar con cronómetro' })` → `getByRole('link', { name: 'Empezar sesión' })`.
- Chequeo: `getByLabel('Sueño').selectOption('1')` → `getByLabel('Sueño 1').check()` (igual Fatiga, Ganas). Si Playwright no puede marcar el radio oculto (`sr-only`), usar `getByLabel('Sueño 1').check({ force: true })` y explicarlo.
- Entrenar con el chequeo ya guardado: `expect(getByLabel('Sueño')).toHaveValue('1')` → `expect(getByLabel('Sueño 1')).toBeChecked()` (igual Fatiga, Ganas).
- Cualquier sesión pendiente o próxima que el test busque dentro de un `<details>` cerrado: abrirlo antes con `page.locator('summary', { hasText: '…' }).click()`.

Añadir al final de `e2e/flujo.spec.ts` (después de los tests que crean perfil y sesiones), un test de Hoy:

```ts
test('Hoy: mini-vía con el largo actual que lleva a Vía', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  const mini = page.getByRole('link', { name: /Largo \d+ de \d+/ })
  await expect(mini).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Semanas del largo' })).toBeVisible()
  await mini.click()
  await expect(page).toHaveURL(/\/via$/)
})
```

(El perfil de los e2e empieza la temporada este lunes —`lunesDeEstaSemana()`—, así que hoy siempre cae dentro.)

- [ ] **Step 6: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e` → verde. Capturas 390 × 844 de Hoy (con sesión de hoy, con chequeo y sin sesión si se puede) en `.superpowers/sdd/tanda1-task3-*.png`; mirarlas y corregir lo ilegible.

```bash
git add components/MiniVia.tsx components/CamposChequeo.tsx "app/(app)/page.tsx" "app/(app)/_hoy" e2e
git commit -m "feat(hoy): cabecera del largo, mini-vía, chequeo de un toque y una sola acción principal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Zonas táctiles y jerarquía de texto

**Files:**
- Modify: `app/(enfoque)/sesion/[id]/Cronometro.tsx`, `app/(app)/semana/page.tsx` (o el componente que pinta «Preparar»), `app/(app)/via/page.tsx` («Preparar» de `FilaHueco`), `app/(app)/semana/BotonBorrarHueco.tsx`, `app/(app)/_hoy/TarjetaSesion.tsx` (botones de texto: «No la hice», «Quitar», «Hice otra cosa», «Corregir», «Cancelar»), `components/ContextoTemporada.tsx`

- [ ] **Step 1: Inventario**

Grep en `app/` y `components/` de `<button`, `<Link` y `<a ` con clases `text-sm underline`, `px-3 py-1`, `px-2 py-1` o sin padding; listar en el informe cada control y su altura aproximada. Objetivo: todo control táctil ≥ 44 px de alto (y ≥ 44 px de ancho los de solo icono).

- [ ] **Step 2: Arreglos**

- `Cronometro.tsx`: el `BOTON_SECUNDARIO` local (≈ 40 px) se sustituye por el de `components/estilos.ts` (`min-h-11`); si el local tenía colores propios necesarios para el contraste, conservarlos añadiendo `min-h-11`.
- «Preparar» en Semana y Vía: `className={BOTON}` (o `${BOTON_SECUNDARIO}` si en esa tarjeta ya hay otra acción principal) en lugar de `rounded bg-progreso px-3 py-1 text-sm`.
- `BotonBorrarHueco.tsx`: el «✕» pasa a `flex size-11 items-center justify-center` con `aria-label` descriptivo (si ya lo tiene, mantenerlo).
- Botones de texto de `TarjetaSesion` («No la hice», «Quitar», «Quitarla», «Hice otra cosa», «Corregir», «Cancelar») y «Cambiarla por otra»: añadir `inline-flex min-h-11 items-center` (sin cambiar su texto: el e2e los busca por nombre).
- `ContextoTemporada.tsx`: la primera línea vuelve a destacar sobre la segunda: `font-medium text-texto` para la posición y `text-texto-2` para el objetivo.

- [ ] **Step 3: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e` → verde. Captura 390 × 844 del cronómetro en marcha y de Semana con un hueco en `.superpowers/sdd/tanda1-task4-*.png`.

```bash
git add app components
git commit -m "fix(ui): zonas táctiles de 44 px en cronómetro, Semana, Vía y tarjetas; jerarquía del contexto de temporada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cierre de la tanda

- [ ] Revisión final de la rama (subagent-driven-development, modelo más capaz): navegación en las tres capas (proxy, layout, rutas movidas), redirecciones, e2e, accesibilidad (pestañas con `aria-current`, radios con nombre, 44 px), nada fuera de lo previsto en los commits.
- [ ] Fusionar en `master` y `npm test` sobre el resultado; subir a GitHub solo cuando Diego lo confirme.
