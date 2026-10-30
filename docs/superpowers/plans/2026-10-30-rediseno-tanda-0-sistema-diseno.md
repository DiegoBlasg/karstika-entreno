# Rediseño móvil · Tanda 0: sistema de diseño — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la base visual del estilo «Topo nocturno» (tokens, fuentes, componentes, iconos, fondo topográfico, app instalable) y toda la app actual ya en tema oscuro y legible, sin cambiar todavía la estructura de pantallas.

**Architecture:** Los colores viven una sola vez en `app/globals.css` (`@theme static` de Tailwind 4) y un test los lee para comprobar el contraste WCAG. Los componentes base van en `components/ui/` y usan las clases de `components/estilos.ts`, que se reescribe (las pantallas actuales que ya usan `BOTON`, `CAMPO` y `TARJETA` se restilizan solas). Un barrido mecánico cambia las clases de color claras (stone, sky, amber…) por las de los tokens, para que nada quede blanco sobre negro hasta que las tandas 1–4 rehagan cada pantalla.

**Tech Stack:** Next.js 16.4 (App Router, `next/font/google`, `app/manifest.ts`), React 19, Tailwind CSS 4.3, vitest 2, Playwright 1.64, `lucide-react` (nuevo).

Spec: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md`. Rama: `rediseno-0`, creada desde `master` 7d3b84c (ya incluye mananas-casa, pulido y biblioteca).

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone.
- Solo tema oscuro. Colores exactos (no inventar otros):
  `fondo #0E1417`, `fondo-hundido #0B1013`, `superficie #172024`, `superficie-2 #22303A`, `borde #26333A`, `pista #2A3539`,
  `texto #E8EDEA`, `texto-2 #9FB0A8`, `texto-3 #6E7F78`, `progreso #C6F24E`, `cima #FF7A45`, `ambar #F5B83D`, `rojo #FF5A5A`.
- Texto de cuerpo con contraste ≥ 4,5:1 (WCAG AA) sobre `fondo` y `superficie`. `texto-3` solo en texto grande o decorativo (≥ 3:1).
- Fuentes: Barlow (400/500/600/700) para cuerpo y Barlow Condensed (500/700/800) para titulares, etiquetas y cifras, con `next/font/google`.
- Zonas táctiles ≥ 44 × 44 px (`min-h-11`); foco visible; animaciones desactivadas con `prefers-reduced-motion`.
- No tocar `lib/` salvo `lib/ui/` (nuevo), ni el motor (`motor/`). Hay otra rama en pausa (`escaladas`, worktree `D:/karstika-entreno-escaladas`): no tocarla.
- Antes de escribir código de Next, leer la guía correspondiente en `node_modules/next/dist/docs/` (AGENTS.md).
- Si `next dev` genera un `AGENTS.md` sin seguimiento en git, borrarlo; nunca commitearlo.
- En cada tarea: `npm test`, `npm run tsc` y `npm run build` en verde. En la tarea 4 y la 6, también `npm run e2e`.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

`BarraPestanas` (del spec) no está en esta tanda: va con el layout nuevo en la tanda 1.

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `app/globals.css` | Tokens (`@theme static`), fuentes (`@theme inline`), estilos base, foco, movimiento reducido |
| `lib/ui/contraste.ts` (+ `.test.ts`) | Luminancia y relación de contraste WCAG; lectura de tokens de `globals.css` |
| `lib/ui/progreso.ts` (+ `.test.ts`) | `fraccionSegura` y `porcentaje` para barras |
| `app/layout.tsx` | Fuentes, clases del `body`, `viewport` con `themeColor` y `viewportFit` |
| `components/estilos.ts` | Clases compartidas (botones, campo, tarjeta, etiqueta, chip, enlace) |
| `components/ui/*.tsx` | `Tarjeta`, `Boton`, `Chip`, `Etiqueta`, `BarraProgreso`, `CifraGrande`, `EstadoVacio`, `Aviso`, `Hoja` |
| `components/iconos/Escalada.tsx` | Iconos propios SVG: `IconoMultipresa`, `IconoChapa`, `IconoReunion`, `IconoCima`, `IconoPresa`, `IconoCuerda` |
| `components/FondoTopo.tsx` | Curvas de nivel decorativas |
| `app/(app)/muestrario/page.tsx` | Muestrario de componentes (solo fuera de producción) |
| `scripts/generar-iconos.ts` + `public/icono-*.png` | PNG del icono de la app a partir de un SVG |
| `app/icon.svg`, `app/manifest.ts`, `proxy.ts` | Favicon, manifest y excluir ambos del control de acceso |

---

### Task 1: Tokens, contraste y fuentes

**Files:**
- Modify: `app/globals.css`
- Create: `lib/ui/contraste.ts`, `lib/ui/contraste.test.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: utilidades de Tailwind `bg-fondo`, `bg-fondo-hundido`, `bg-superficie`, `bg-superficie-2`, `border-borde`, `bg-pista`, `text-texto`, `text-texto-2`, `text-texto-3`, `*-progreso`, `*-cima`, `*-ambar`, `*-rojo` (con modificador de opacidad, p. ej. `bg-ambar/10`); `font-sans` (Barlow) y `font-titular` (Barlow Condensed). Variables CSS `--color-<token>` siempre emitidas.
- Produces: `luminancia(hex: string): number`, `contraste(a: string, b: string): number`, `tokensDeCss(css: string): Record<string, string>` en `lib/ui/contraste.ts`.

- [ ] **Step 1: Leer la guía de fuentes**

Leer `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` y la sección `variable` de `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`.

- [ ] **Step 2: Escribir el test que falla**

`lib/ui/contraste.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contraste, luminancia, tokensDeCss } from './contraste'

const tokens = tokensDeCss(readFileSync('app/globals.css', 'utf8'))
const c = (nombre: string): string => {
  const v = tokens[nombre]
  if (!v) throw new Error(`Falta el token --color-${nombre} en app/globals.css`)
  return v
}

describe('contraste', () => {
  it('calcula la luminancia y la relación de WCAG', () => {
    expect(luminancia('#000000')).toBe(0)
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 5)
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('lee los tokens de color del CSS', () => {
    expect(tokensDeCss('@theme static {\n  --color-fondo: #0E1417;\n  --color-texto-2: #9FB0A8;\n}')).toEqual({
      fondo: '#0E1417',
      'texto-2': '#9FB0A8',
    })
  })

  it('tiene todos los tokens del spec con su valor exacto', () => {
    expect(tokens).toMatchObject({
      fondo: '#0E1417', 'fondo-hundido': '#0B1013', superficie: '#172024', 'superficie-2': '#22303A',
      borde: '#26333A', pista: '#2A3539', texto: '#E8EDEA', 'texto-2': '#9FB0A8', 'texto-3': '#6E7F78',
      progreso: '#C6F24E', cima: '#FF7A45', ambar: '#F5B83D', rojo: '#FF5A5A',
    })
  })

  it.each(['texto', 'texto-2', 'progreso', 'cima', 'ambar', 'rojo'])('%s se lee como texto (AA) sobre fondo y superficie', (t) => {
    expect(contraste(c(t), c('fondo'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(c(t), c('superficie'))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['texto', 'texto-2'])('%s se lee sobre superficie-2 (chips)', (t) => {
    expect(contraste(c(t), c('superficie-2'))).toBeGreaterThanOrEqual(4.5)
  })

  it('texto-3 solo llega para texto grande (≥ 3:1)', () => {
    expect(contraste(c('texto-3'), c('fondo'))).toBeGreaterThanOrEqual(3)
    expect(contraste(c('texto-3'), c('superficie'))).toBeGreaterThanOrEqual(3)
  })

  it.each(['progreso', 'rojo', 'ambar', 'cima'])('el texto oscuro (fondo) se lee sobre un botón %s', (t) => {
    expect(contraste(c('fondo'), c(t))).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [ ] **Step 3: Comprobar que falla**

Run: `npx vitest run lib/ui/contraste.test.ts`
Expected: FAIL («Failed to resolve import "./contraste"»).

- [ ] **Step 4: Implementar `lib/ui/contraste.ts`**

```ts
// Contraste WCAG 2.x entre dos colores #RRGGBB y lectura de los tokens de color de app/globals.css.

function canal(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`Color no válido: ${hex}`)
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => canal(parseInt(x!, 16))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (oscuro + 0.05)
}

// Solo las declaraciones `--color-<nombre>: #RRGGBB;`.
export function tokensDeCss(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[m[1]!] = m[2]!
  return tokens
}
```

- [ ] **Step 5: Escribir `app/globals.css`**

```css
@import "tailwindcss";

/* Estilo «Topo nocturno». Única fuente de los colores: lib/ui/contraste.test.ts comprueba valores y contraste. */
@theme static {
  --color-fondo: #0E1417;
  --color-fondo-hundido: #0B1013;
  --color-superficie: #172024;
  --color-superficie-2: #22303A;
  --color-borde: #26333A;
  --color-pista: #2A3539;
  --color-texto: #E8EDEA;
  --color-texto-2: #9FB0A8;
  --color-texto-3: #6E7F78;
  --color-progreso: #C6F24E;
  --color-cima: #FF7A45;
  --color-ambar: #F5B83D;
  --color-rojo: #FF5A5A;
}

/* Las variables las declara next/font en <html> (app/layout.tsx). */
@theme inline {
  --font-sans: var(--font-barlow), ui-sans-serif, system-ui, sans-serif;
  --font-titular: var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif;
}

:root {
  color-scheme: dark;
}

html {
  -webkit-tap-highlight-color: transparent;
}

body {
  background-color: var(--color-fondo);
  color: var(--color-texto);
}

:focus-visible {
  outline: 2px solid var(--color-progreso);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 6: Comprobar que el test pasa**

Run: `npx vitest run lib/ui/contraste.test.ts`
Expected: PASS (todas). Si alguna relación no llega, **no** cambiar el umbral: avisar al controlador con el par y el valor.

- [ ] **Step 7: Fuentes y viewport en `app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-barlow', display: 'swap' })
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const metadata: Metadata = { title: 'Karstika Entreno', description: 'Entrenador personal de escalada' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0E1417', viewportFit: 'cover' }

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh bg-fondo font-sans text-texto antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: Verificar**

Run: `npm test && npm run tsc && npm run build`
Expected: todo en verde. (Las pantallas se verán mezcladas, oscuro con tarjetas blancas, hasta la tarea 4: es lo esperado.)

- [ ] **Step 9: Commit**

```bash
git add app/globals.css app/layout.tsx lib/ui/contraste.ts lib/ui/contraste.test.ts
git commit -m "feat(ui): tokens del estilo Topo nocturno, contraste comprobado y fuentes Barlow

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Clases compartidas y componentes base

**Files:**
- Modify: `components/estilos.ts`
- Create: `lib/ui/progreso.ts`, `lib/ui/progreso.test.ts`
- Create: `components/ui/Tarjeta.tsx`, `components/ui/Boton.tsx`, `components/ui/Chip.tsx`, `components/ui/Etiqueta.tsx`, `components/ui/BarraProgreso.tsx`, `components/ui/CifraGrande.tsx`, `components/ui/EstadoVacio.tsx`, `components/ui/Aviso.tsx`, `components/ui/Hoja.tsx`

**Interfaces:**
- Consumes: utilidades de color y `font-titular` de la tarea 1.
- Produces (`components/estilos.ts`): `BOTON`, `BOTON_SECUNDARIO`, `BOTON_PELIGRO`, `CAMPO`, `TARJETA`, `TARJETA_DESTACADA`, `ETIQUETA`, `CHIP`, `ENLACE` (strings de clases). Los nombres `BOTON`, `CAMPO`, `TARJETA` ya se usan en la app y se mantienen.
- Produces (`lib/ui/progreso.ts`): `fraccionSegura(valor: number): number` (0–1, `NaN` → 0) y `porcentaje(valor: number): number` (entero 0–100).
- Produces (componentes):
  - `Tarjeta({ destacada?: boolean, className?: string, ...props de <section> })`
  - `Boton({ variante?: 'principal' | 'secundario' | 'peligro', className?: string, ...props de <button> })`
  - `Chip({ tono?: 'neutro' | 'cima' | 'ambar' | 'rojo' | 'progreso', children })`
  - `Etiqueta({ children, className?, as?: 'span' | 'p' | 'h2' | 'h3' })`
  - `BarraProgreso({ valor: number, etiqueta: string })` (valor 0–1; `etiqueta` es el nombre accesible)
  - `CifraGrande({ valor: string, unidad?: string, delta?: { texto: string, sentido: 'sube' | 'baja' | 'igual' } })`
  - `EstadoVacio({ titulo: string, texto: string, accion?: { href: string, texto: string } })`
  - `Aviso({ tono: 'info' | 'ok' | 'ambar' | 'rojo', children, className? })`
  - `Hoja({ disparador: ReactNode, titulo: string, children, claseDisparador?: string })` (cliente)

- [ ] **Step 1: Test que falla de `lib/ui/progreso.ts`**

`lib/ui/progreso.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fraccionSegura, porcentaje } from './progreso'

describe('progreso', () => {
  it('recorta la fracción a 0–1', () => {
    expect(fraccionSegura(0.4)).toBe(0.4)
    expect(fraccionSegura(-1)).toBe(0)
    expect(fraccionSegura(3)).toBe(1)
    expect(fraccionSegura(Number.NaN)).toBe(0)
    expect(fraccionSegura(Number.POSITIVE_INFINITY)).toBe(1)
  })
  it('da el porcentaje entero', () => {
    expect(porcentaje(0.756)).toBe(76)
    expect(porcentaje(2)).toBe(100)
    expect(porcentaje(Number.NaN)).toBe(0)
  })
})
```

Run: `npx vitest run lib/ui/progreso.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 2: Implementar `lib/ui/progreso.ts`**

```ts
export function fraccionSegura(valor: number): number {
  if (Number.isNaN(valor)) return 0
  return Math.min(1, Math.max(0, valor))
}

export const porcentaje = (valor: number): number => Math.round(fraccionSegura(valor) * 100)
```

Run: `npx vitest run lib/ui/progreso.test.ts` → PASS.

- [ ] **Step 3: Reescribir `components/estilos.ts`**

```ts
// Clases compartidas del estilo «Topo nocturno». Los componentes de components/ui las usan; las pantallas antiguas
// usan BOTON, CAMPO y TARJETA directamente hasta que se rehagan.
const BOTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-titular text-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50'
export const BOTON = `${BOTON_BASE} bg-progreso text-fondo hover:bg-progreso/90`
export const BOTON_SECUNDARIO = `${BOTON_BASE} border border-borde text-texto hover:bg-superficie-2`
export const BOTON_PELIGRO = `${BOTON_BASE} bg-rojo text-fondo hover:bg-rojo/90`
export const CAMPO =
  'mt-1 block min-h-11 w-full rounded-xl border border-borde bg-superficie-2 px-3 py-2 text-texto placeholder:text-texto-3'
export const TARJETA = 'space-y-3 rounded-2xl border border-borde bg-superficie p-4'
export const TARJETA_DESTACADA = 'space-y-3 rounded-2xl border border-progreso bg-superficie p-4'
export const ETIQUETA = 'font-titular text-xs font-medium uppercase tracking-[0.08em] text-texto-2'
export const CHIP = 'inline-flex items-center rounded-full bg-superficie-2 px-2.5 py-1 text-xs text-texto'
export const ENLACE = 'text-progreso underline underline-offset-2'
```

- [ ] **Step 4: Componentes de servidor**

`components/ui/Tarjeta.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from 'react'
import { TARJETA, TARJETA_DESTACADA } from '../estilos'

export function Tarjeta({ destacada = false, className = '', ...resto }: ComponentPropsWithoutRef<'section'> & { destacada?: boolean }) {
  return <section className={`${destacada ? TARJETA_DESTACADA : TARJETA} ${className}`} {...resto} />
}
```

`components/ui/Boton.tsx`:

```tsx
import type { ComponentPropsWithoutRef } from 'react'
import { BOTON, BOTON_PELIGRO, BOTON_SECUNDARIO } from '../estilos'

const VARIANTE = { principal: BOTON, secundario: BOTON_SECUNDARIO, peligro: BOTON_PELIGRO } as const

export function Boton({
  variante = 'principal',
  className = '',
  type = 'button',
  ...resto
}: ComponentPropsWithoutRef<'button'> & { variante?: keyof typeof VARIANTE }) {
  return <button type={type} className={`${VARIANTE[variante]} ${className}`} {...resto} />
}
```

Nota: en formularios con Server Actions hay que pasar `type="submit"` explícito.

`components/ui/Chip.tsx`:

```tsx
import type { ReactNode } from 'react'
import { CHIP } from '../estilos'

const TONO = {
  neutro: '',
  progreso: 'text-progreso',
  cima: 'bg-cima/15 text-cima',
  ambar: 'bg-ambar/15 text-ambar',
  rojo: 'bg-rojo/15 text-rojo',
} as const

export function Chip({ tono = 'neutro', children }: { tono?: keyof typeof TONO; children: ReactNode }) {
  return <span className={`${CHIP} ${TONO[tono]}`}>{children}</span>
}
```

`components/ui/Etiqueta.tsx`:

```tsx
import type { ReactNode } from 'react'
import { ETIQUETA } from '../estilos'

export function Etiqueta({ children, className = '', as: Elemento = 'span' }: { children: ReactNode; className?: string; as?: 'span' | 'p' | 'h2' | 'h3' }) {
  return <Elemento className={`${ETIQUETA} ${className}`}>{children}</Elemento>
}
```

`components/ui/BarraProgreso.tsx`:

```tsx
import { porcentaje } from '@/lib/ui/progreso'

export function BarraProgreso({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const p = porcentaje(valor)
  return (
    <div role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} className="h-1.5 w-full rounded-full bg-pista">
      <div className="h-1.5 rounded-full bg-progreso transition-[width] duration-300" style={{ width: `${p}%` }} />
    </div>
  )
}
```

`components/ui/CifraGrande.tsx`:

```tsx
const SENTIDO = { sube: { simbolo: '▲', clase: 'text-progreso' }, baja: { simbolo: '▼', clase: 'text-ambar' }, igual: { simbolo: '=', clase: 'text-texto-2' } } as const

export function CifraGrande({ valor, unidad, delta }: { valor: string; unidad?: string; delta?: { texto: string; sentido: keyof typeof SENTIDO } }) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-titular text-5xl font-extrabold leading-none tabular-nums">{valor}</span>
      {unidad && <span className="font-titular text-lg text-texto-2">{unidad}</span>}
      {delta && (
        <span className={`font-titular text-lg ${SENTIDO[delta.sentido].clase}`}>
          <span aria-hidden="true">{SENTIDO[delta.sentido].simbolo} </span>
          {delta.texto}
        </span>
      )}
    </p>
  )
}
```

`components/ui/EstadoVacio.tsx`:

```tsx
import Link from 'next/link'
import { BOTON, TARJETA } from '../estilos'

export function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: { href: string; texto: string } }) {
  return (
    <div className={`${TARJETA} text-center`}>
      <p className="font-titular text-xl font-bold uppercase">{titulo}</p>
      <p className="text-sm text-texto-2">{texto}</p>
      {accion && <Link href={accion.href} className={BOTON}>{accion.texto}</Link>}
    </div>
  )
}
```

`components/ui/Aviso.tsx`:

```tsx
import type { ReactNode } from 'react'

const TONO = {
  info: 'border-borde bg-superficie-2',
  ok: 'border-progreso/40 bg-progreso/10',
  ambar: 'border-ambar/40 bg-ambar/10',
  rojo: 'border-rojo/50 bg-rojo/10',
} as const

export function Aviso({ tono, children, className = '' }: { tono: keyof typeof TONO; children: ReactNode; className?: string }) {
  return <div role={tono === 'rojo' ? 'alert' : undefined} className={`rounded-2xl border p-3 text-sm ${TONO[tono]} ${className}`}>{children}</div>
}
```

- [ ] **Step 5: `Hoja` (componente de cliente con `<dialog>` nativo)**

`<dialog>` con `showModal()` ya atrapa el foco, cierra con Escape y devuelve el foco al disparador.

`components/ui/Hoja.tsx`:

```tsx
'use client'
import { X } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'

// Hoja inferior: «¿Por qué?», fuentes y detalles. Cierra con Escape, con la X y al tocar fuera.
export function Hoja({ disparador, titulo, children, claseDisparador = 'text-progreso underline underline-offset-2' }: {
  disparador: ReactNode
  titulo: string
  children: ReactNode
  claseDisparador?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  return (
    <>
      <button type="button" className={claseDisparador} onClick={() => ref.current?.showModal()}>
        {disparador}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close() }}
        className="mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-3xl border border-borde bg-superficie p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-texto backdrop:bg-black/60"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={idTitulo} className="font-titular text-xl font-bold uppercase">{titulo}</h2>
          <button type="button" aria-label="Cerrar" className="-m-2 flex size-11 items-center justify-center rounded-full text-texto-2" onClick={() => ref.current?.close()}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  )
}
```

`Hoja` importa `lucide-react`, que todavía no está instalado. Instalarlo ahora (la tarea 3 también lo usa):

Run: `npm install lucide-react`
Expected: se añade a `dependencies` de `package.json`. Anotar la versión instalada en el informe.

- [ ] **Step 6: Verificar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add components/estilos.ts components/ui lib/ui/progreso.ts lib/ui/progreso.test.ts package.json package-lock.json
git commit -m "feat(ui): componentes base (tarjeta, botón, chip, barra, cifra, estado vacío, aviso, hoja)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Iconos de escalada, fondo topográfico y muestrario

**Files:**
- Create: `components/iconos/Escalada.tsx`, `components/FondoTopo.tsx`, `app/(app)/muestrario/page.tsx`

**Interfaces:**
- Consumes: todo lo de las tareas 1 y 2.
- Produces: `IconoMultipresa`, `IconoChapa`, `IconoReunion`, `IconoCima`, `IconoPresa`, `IconoCuerda` con props `{ size?: number; className?: string; titulo?: string }` (sin `titulo` → `aria-hidden`; con `titulo` → `role="img"` y `<title>`), dibujados con `currentColor` en una caja `0 0 24 24`, trazo 2 px y extremos redondeados (mismo lenguaje que lucide). `FondoTopo({ className?: string })`, siempre `aria-hidden`.

- [ ] **Step 1: `components/iconos/Escalada.tsx`**

```tsx
import type { ReactNode } from 'react'

type PropsIcono = { size?: number; className?: string; titulo?: string }

// Mismo lenguaje que lucide-react: caja 24×24, trazo 2, extremos redondeados, currentColor.
function Svg({ size = 24, className, titulo, children }: PropsIcono & { children: ReactNode }) {
  const accesible = titulo ? { role: 'img' as const } : { 'aria-hidden': true as const }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} {...accesible}>
      {titulo && <title>{titulo}</title>}
      {children}
    </svg>
  )
}

export const IconoMultipresa = (p: PropsIcono) => (
  <Svg {...p}>
    <rect x="2" y="6" width="20" height="8" rx="2" />
    <path d="M6 10h3M15 10h3" />
    <path d="M12 2v4" />
  </Svg>
)

export const IconoChapa = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M8 3h8l-1 7h-6z" />
    <circle cx="12" cy="6.5" r="1" />
    <path d="M10 10c0 5 4 5 4 10" />
    <path d="M14 10c0 5-4 5-4 10" />
  </Svg>
)

export const IconoReunion = (p: PropsIcono) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="2" />
    <circle cx="17" cy="7" r="2" />
    <path d="M7 9l5 7 5-7" />
    <circle cx="12" cy="18" r="2" />
  </Svg>
)

export const IconoCima = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M3 20l7-12 4 6 2-3 5 9z" />
    <path d="M10 8V3l4 2-4 2" />
  </Svg>
)

export const IconoPresa = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M4 15c0-5 4-9 9-9 4 0 7 2 7 5 0 4-5 7-10 7-4 0-6-1-6-3z" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
)

export const IconoCuerda = (p: PropsIcono) => (
  <Svg {...p}>
    <path d="M12 2c-4 3 4 5 0 8s4 5 0 8" />
    <path d="M12 18v4" />
  </Svg>
)
```

- [ ] **Step 2: `components/FondoTopo.tsx`**

```tsx
// Curvas de nivel decorativas para las cabeceras de Hoy y Vía. El padre debe ser `relative`.
export function FondoTopo({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full text-progreso opacity-15 ${className}`} fill="none" stroke="currentColor" strokeWidth={1}>
      <path d="M-20 60 C70 20 150 100 240 50 S380 30 420 70" />
      <path d="M-20 90 C70 50 150 130 240 80 S380 60 420 100" />
      <path d="M-20 120 C80 80 150 160 240 110 S380 90 420 130" />
      <path d="M-20 150 C80 110 160 190 250 140 S380 120 420 160" />
      <path d="M-20 180 C90 140 160 220 250 170 S380 150 420 190" />
    </svg>
  )
}
```

- [ ] **Step 3: Muestrario `app/(app)/muestrario/page.tsx`**

Solo fuera de producción (para revisar los componentes en el móvil con `next dev`). Leer antes `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`.

```tsx
import { notFound } from 'next/navigation'
import { House, Play } from 'lucide-react'
import { FondoTopo } from '@/components/FondoTopo'
import { IconoChapa, IconoCima, IconoCuerda, IconoMultipresa, IconoPresa, IconoReunion } from '@/components/iconos/Escalada'
import { Aviso } from '@/components/ui/Aviso'
import { BarraProgreso } from '@/components/ui/BarraProgreso'
import { Boton } from '@/components/ui/Boton'
import { Chip } from '@/components/ui/Chip'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { CAMPO } from '@/components/estilos'

export default function PaginaMuestrario() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="space-y-6">
      <header className="relative -mx-4 overflow-hidden px-4 py-6">
        <FondoTopo />
        <div className="relative">
          <Etiqueta>Ciclo 1 · Semana 7 de 22</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Fase de <span className="text-progreso">fuerza</span></h1>
        </div>
      </header>
      <Tarjeta destacada>
        <Etiqueta as="p">Hoy · 18:30 · Rocódromo</Etiqueta>
        <h2 className="font-titular text-2xl font-bold uppercase">Multipresa · Repeaters</h2>
        <div className="flex flex-wrap gap-1"><Chip>45 min</Chip><Chip>+4 kg</Chip><Chip tono="cima">Carga alta</Chip></div>
        <Boton className="w-full"><Play aria-hidden="true" size={18} /> Empezar sesión</Boton>
      </Tarjeta>
      <Tarjeta>
        <Etiqueta as="p">L2 · Fuerza · semana 3/4</Etiqueta>
        <p>5 de 6 sesiones del largo</p>
        <BarraProgreso valor={5 / 6} etiqueta="Sesiones del largo" />
      </Tarjeta>
      <Tarjeta>
        <Etiqueta as="p">Fuerza de dedos · % del peso</Etiqueta>
        <CifraGrande valor="118" unidad="%" delta={{ texto: '6 desde R1', sentido: 'sube' }} />
      </Tarjeta>
      <div className="flex flex-wrap gap-2">
        <Boton>Principal</Boton><Boton variante="secundario">Secundario</Boton><Boton variante="peligro">Peligro</Boton><Boton disabled>Desactivado</Boton>
      </div>
      <label className="block text-sm">Campo<input className={CAMPO} placeholder="Escribe algo" /></label>
      <Aviso tono="info">Aviso informativo.</Aviso>
      <Aviso tono="ok">Todo en verde.</Aviso>
      <Aviso tono="ambar">En ámbar: no subas la carga de los dedos.</Aviso>
      <Aviso tono="rojo">En rojo: no cargues el hombro.</Aviso>
      <EstadoVacio titulo="Sin sesión hoy" texto="No tienes nada planeado para hoy." accion={{ href: '/entrenar', texto: 'Preparar una' }} />
      <Hoja disparador="¿Por qué?" titulo="¿Por qué esta sesión?"><p className="text-sm text-texto-2">Contenido de la hoja.</p></Hoja>
      <div className="flex gap-4 text-texto-2">
        <House aria-hidden="true" /><IconoMultipresa /><IconoChapa /><IconoReunion /><IconoCima className="text-cima" /><IconoPresa /><IconoCuerda />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar en el navegador**

Run: `npm test && npm run tsc && npm run build`, después `npx next dev -p 3200`, entrar con la clave de `.env.local` y abrir `http://localhost:3200/muestrario` con un viewport de 390 × 844 (Playwright o DevTools). Comprobar: fuentes Barlow cargadas, hoja que sube desde abajo y cierra con Escape, con la X y al tocar fuera, foco visible con el teclado, iconos legibles a 24 px. Adjuntar una captura al informe. Borrar el `AGENTS.md` si `next dev` lo genera.

- [ ] **Step 5: Commit**

```bash
git add components/iconos components/FondoTopo.tsx "app/(app)/muestrario"
git commit -m "feat(ui): iconos de escalada, fondo topográfico y muestrario de componentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Barrido de colores de la app actual

Objetivo: que todas las pantallas actuales se vean bien en oscuro sin rehacerlas (eso es de las tandas 1–4).

**Files:**
- Modify: todos los `.tsx` de `app/` y `components/` que tengan clases de color claras (≈ 33 ficheros), `components/AvisoMedico.tsx`, `components/PorQue.tsx`.
- Script temporal: `C:\Users\diego\AppData\Local\Temp\barrido-colores.mjs` (fuera del repo; **no se commitea**).

**Interfaces:**
- Consumes: utilidades de color de la tarea 1.
- Produces: ninguna clase de color de las paletas `stone`, `sky`, `amber`, `red`, `emerald`, ni `bg-white`/`text-white`, en `app/` ni `components/`.

- [ ] **Step 1: Escribir el script de barrido**

Tabla (clase clara → clase de token). Se aplica también con variantes (`hover:`, `disabled:`…) porque solo se mira que no haya letra, número o guion pegado delante ni detrás.

```js
// barrido-colores.mjs — uso: node barrido-colores.mjs <raíz del repo>
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MAPA = {
  'text-stone-500': 'text-texto-2', 'text-stone-600': 'text-texto-2', 'text-stone-700': 'text-texto-2',
  'text-stone-800': 'text-texto', 'text-stone-900': 'text-texto',
  'text-red-700': 'text-rojo', 'text-sky-800': 'text-progreso', 'text-emerald-700': 'text-progreso', 'text-amber-700': 'text-ambar',
  'text-white': 'text-fondo',
  'bg-white': 'bg-superficie', 'bg-stone-50': 'bg-fondo', 'bg-stone-200': 'bg-superficie-2', 'bg-stone-900': 'bg-progreso',
  'bg-amber-50': 'bg-ambar/10', 'bg-amber-100': 'bg-ambar/20', 'bg-amber-400': 'bg-ambar',
  'bg-sky-50': 'bg-superficie-2', 'bg-sky-600': 'bg-progreso',
  'bg-red-50': 'bg-rojo/10', 'bg-red-700': 'bg-rojo',
  'bg-emerald-600': 'bg-progreso', 'bg-emerald-700': 'bg-progreso',
  'border-stone-100': 'border-borde', 'border-stone-200': 'border-borde', 'border-stone-300': 'border-borde',
  'border-amber-300': 'border-ambar/40', 'border-red-300': 'border-rojo/50',
  'border-sky-200': 'border-borde', 'border-sky-300': 'border-borde',
  'divide-stone-100': 'divide-borde',
}

const raiz = process.argv[2]
const ficheros = []
const recorrer = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) recorrer(p)
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) ficheros.push(p)
  }
}
recorrer(join(raiz, 'app'))
recorrer(join(raiz, 'components'))

let cambios = 0
for (const f of ficheros) {
  const antes = readFileSync(f, 'utf8')
  let despues = antes
  for (const [de, a] of Object.entries(MAPA)) {
    despues = despues.replace(new RegExp(`(?<![\\w-])${de}(?![\\w-])`, 'g'), () => { cambios++; return a })
  }
  if (despues !== antes) writeFileSync(f, despues)
}
console.log(`${cambios} sustituciones`)
```

- [ ] **Step 2: Ejecutarlo y comprobar que no queda nada**

Run: `node C:/Users/diego/AppData/Local/Temp/barrido-colores.mjs D:/karstika-entreno`
Expected: «≈ 180 sustituciones».

Run (Grep): patrón `\b(bg|text|border|divide|ring|outline|accent|from|to)-(stone|sky|amber|red|emerald|green|white|black)\b` en `app/` y `components/`.
Expected: sin resultados. Si queda alguna clase que la tabla no cubre, añadirla al `MAPA` con el token más cercano por significado (texto secundario → `text-texto-2`, superficie → `bg-superficie`, aviso → `ambar`/`rojo`) y volver a ejecutar. Anotar en el informe cada clase añadida.

- [ ] **Step 3: Revisar a mano los casos con contexto**

- `components/AvisoMedico.tsx`: debe quedar `rounded-2xl border border-ambar/40 bg-ambar/10 p-3 text-sm`.
- `components/PorQue.tsx`: el `summary` queda `cursor-pointer text-progreso` y los enlaces `text-progreso underline`; el texto de «En qué se basa» `text-texto-2`.
- Botones que eran `bg-stone-900 text-white` → `bg-progreso text-fondo`: comprobar que siguen con texto legible (lima con texto oscuro).
- Barras de semáforo o colores condicionales construidos con plantillas (`${...}`): buscar `red-`, `amber-`, `emerald-` sueltos en strings y tratarlos igual.
- `app/(app)/layout.tsx` (barra de navegación actual): solo colores; la estructura se rehace en la tanda 1.

- [ ] **Step 4: Verificar**

Run: `npm test && npm run tsc && npm run build && npm run e2e`
Expected: todo en verde. Los e2e localizan por texto y rol, no por color: si alguno falla, investigar la causa antes de tocar nada.

Abrir con `next dev` (viewport 390 × 844) Hoy, Mi semana, Plan, Entrenar, Evaluación, Perfil, una sesión con cronómetro y `/entrar`, y adjuntar capturas al informe. Criterio: nada blanco sobre negro, ningún texto ilegible y campos de formulario y selectores de fecha nativos en oscuro (`color-scheme: dark`).

- [ ] **Step 5: Commit**

```bash
git add app components
git commit -m "style: la app actual pasa al tema oscuro con los tokens (barrido de colores)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(El script queda fuera del repo, en la carpeta temporal.)

---

### Task 5: App instalable (manifest, iconos y acceso)

**Files:**
- Create: `scripts/icono-app.svg`, `scripts/generar-iconos.ts`, `public/icono-192.png`, `public/icono-512.png`, `public/icono-maskable-512.png`, `app/apple-icon.png`, `app/icon.svg`, `app/manifest.ts`
- Modify: `proxy.ts`, `package.json` (script `iconos`)
- Test: `e2e/instalable.spec.ts`

**Interfaces:**
- Produces: `/manifest.webmanifest` accesible sin sesión, `/icon.svg`, `/apple-icon.png`, `/icono-*.png`.

- [ ] **Step 1: Leer las guías**

`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md` y `.../app-icons.md`.

- [ ] **Step 2: Dibujo del icono `scripts/icono-app.svg`**

La vía con su cima: fondo `#0E1417`, línea vertical lima con dos reuniones y cima naranja. Se usa tal cual como `app/icon.svg`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E1417"/>
  <g fill="none" stroke="#C6F24E" stroke-opacity="0.18" stroke-width="6">
    <path d="M-20 150 C120 90 260 220 532 130"/>
    <path d="M-20 380 C140 320 280 450 532 360"/>
  </g>
  <line x1="256" y1="170" x2="256" y2="430" stroke="#2A3539" stroke-width="22" stroke-linecap="round"/>
  <line x1="256" y1="280" x2="256" y2="430" stroke="#C6F24E" stroke-width="22" stroke-linecap="round"/>
  <circle cx="256" cy="400" r="22" fill="#C6F24E"/>
  <circle cx="256" cy="280" r="30" fill="#0E1417" stroke="#C6F24E" stroke-width="16"/>
  <path d="M196 170 L256 70 L316 170 Z" fill="#FF7A45"/>
</svg>
```

Copiar el fichero a `app/icon.svg`.

- [ ] **Step 3: Script `scripts/generar-iconos.ts`**

Renderiza el SVG a PNG con el Chromium de Playwright (ya instalado para los e2e). La versión maskable deja un 20 % de margen de seguridad en cada lado.

```ts
// Genera los PNG del icono de la app a partir de scripts/icono-app.svg. Uso: npm run iconos
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('scripts/icono-app.svg', 'utf8')
const SALIDAS: { ruta: string; lado: number; margen: number }[] = [
  { ruta: 'public/icono-192.png', lado: 192, margen: 0 },
  { ruta: 'public/icono-512.png', lado: 512, margen: 0 },
  { ruta: 'public/icono-maskable-512.png', lado: 512, margen: 0.2 },
  { ruta: 'app/apple-icon.png', lado: 180, margen: 0 },
]

const navegador = await chromium.launch()
try {
  for (const { ruta, lado, margen } of SALIDAS) {
    const pagina = await navegador.newPage({ viewport: { width: lado, height: lado } })
    const interior = Math.round(lado * (1 - 2 * margen))
    await pagina.setContent(
      `<html><body style="margin:0;background:#0E1417;display:flex;align-items:center;justify-content:center;width:${lado}px;height:${lado}px">` +
        `<div style="width:${interior}px;height:${interior}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
    )
    await pagina.screenshot({ path: ruta, omitBackground: false })
    await pagina.close()
    console.log(`${ruta} (${lado}×${lado})`)
  }
} finally {
  await navegador.close()
}
```

Añadir a `package.json` → `scripts`: `"iconos": "node scripts/generar-iconos.ts"` (el proyecto ya ejecuta `.ts` con node, como `scripts/migrar.ts`).

Run: `npm run iconos`
Expected: cuatro líneas con las rutas y los PNG creados. Abrir `public/icono-512.png` y `public/icono-maskable-512.png` (Read) y comprobar el dibujo.

- [ ] **Step 4: `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Karstika Entreno',
    short_name: 'Entreno',
    description: 'Entrenador personal de escalada',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E1417',
    theme_color: '#0E1417',
    icons: [
      { src: '/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

En `app/layout.tsx`, ampliar `metadata` con `appleWebApp: { capable: true, title: 'Entreno', statusBarStyle: 'black-translucent' }` (comprobar el nombre exacto del campo en el tipo `Metadata` de la versión instalada).

- [ ] **Step 5: El e2e que falla `e2e/instalable.spec.ts`**

El navegador pide el manifest **sin cookies**, así que ahora `proxy.ts` lo redirige a `/entrar`. Hay que comprobarlo sin sesión:

```ts
import { expect, test } from '@playwright/test'

test('el manifest y los iconos se sirven sin sesión', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest', { maxRedirects: 0 })
  expect(manifest.status()).toBe(200)
  const json = await manifest.json()
  expect(json.display).toBe('standalone')
  expect(json.theme_color).toBe('#0E1417')
  for (const ruta of ['/icono-192.png', '/icono-512.png', '/icono-maskable-512.png', '/apple-icon.png', '/icon.svg']) {
    const r = await request.get(ruta, { maxRedirects: 0 })
    expect(r.status(), ruta).toBe(200)
  }
})

test('las páginas siguen exigiendo sesión', async ({ request }) => {
  const r = await request.get('/', { maxRedirects: 0 })
  expect(r.status()).toBe(307)
  expect(r.headers().location).toContain('/entrar')
})
```

Run: `npx playwright test e2e/instalable.spec.ts`
Expected: FAIL en el primer test (estado 307 en `/manifest.webmanifest`).

- [ ] **Step 6: Excluir los ficheros públicos del control de acceso en `proxy.ts`**

Cambiar solo el `matcher`:

```ts
export const config = {
  // Fuera del control de acceso: estáticos de Next, favicon, manifest e iconos (el navegador los pide sin cookies).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|apple-icon.png|icono-[a-z0-9-]+\\.png).*)'],
}
```

Antes de cambiarlo, leer la guía del `matcher` del proxy en `node_modules/next/dist/docs/` (buscar «matcher») para confirmar la sintaxis en esta versión. Si Next sirve `apple-icon.png` con un sufijo (`/apple-icon.png?<hash>`), la ruta sigue siendo la misma y el matcher vale.

Run: `npx playwright test e2e/instalable.spec.ts`
Expected: PASS (los dos tests).

- [ ] **Step 7: Verificar todo**

Run: `npm test && npm run tsc && npm run build && npm run e2e`
Expected: verde.

- [ ] **Step 8: Commit**

```bash
git add scripts/icono-app.svg scripts/generar-iconos.ts public app/icon.svg app/apple-icon.png app/manifest.ts app/layout.tsx proxy.ts package.json e2e/instalable.spec.ts
git commit -m "feat(app): instalable en el móvil (manifest, iconos de la vía) y acceso libre a esos ficheros

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cierre de la tanda

- [ ] Revisión final de toda la rama (subagent-driven-development): estilo coherente con el spec, contraste, `proxy.ts` sin abrir más rutas de las previstas, nada fuera de lo previsto ni `AGENTS.md` en los commits.
- [ ] Prueba en el iPhone de Diego tras desplegar la rama en una preview de Vercel: añadir a la pantalla de inicio, abrir a pantalla completa, icono correcto y barra de estado oscura.
