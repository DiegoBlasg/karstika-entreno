# App mínima, entrega 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Primera app usable de Karstika Entreno: entrar con contraseña, perfil con aviso médico, evaluación, Entrenar (contexto + chequeo + propuesta del motor + aceptar) y Hoy (registro, «No la hice», «Hice otra cosa», alta del fisio).

**Architecture:** Next.js 16 (App Router) en la raíz del repo, junto a `motor/`. El motor se ejecuta en el servidor: Server Components leen de Postgres (Neon) y Server Actions llaman al motor y escriben. Toda la traducción filas ↔ tipos del motor vive en `lib/datos/` como funciones puras probadas con vitest; el acceso a la base de datos vive en `lib/servidor/`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, `@neondatabase/serverless` 1.x, vitest 2, Playwright 1.x, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-27-app-minima-design.md`.

## Global Constraints

- Toda la interfaz, los mensajes de error y los textos, en español.
- La app **no contiene lógica de entrenamiento**: toda decisión sale del motor (`motor/index.ts`). `motor/` no se modifica; si una prueba destapa un fallo del motor, para y avísalo (no lo parchees en la app).
- `lib/datos/`, `lib/fecha.ts`, `lib/formulario.ts` y `lib/nombres.ts` son puros: sin base de datos, sin `next/*`, sin `Date.now()` ni `new Date()` sin argumentos.
- Next.js 16: el fichero de interceptación se llama `proxy.ts` (no `middleware.ts`). Antes de escribir código de Next.js, lee la guía relevante en `node_modules/next/dist/docs/` (en particular `01-app/03-api-reference/03-file-conventions/proxy.md`, `01-app/01-getting-started/07-mutating-data.md` y `01-app/02-guides/forms.md`).
- Fechas siempre como texto `'AAAA-MM-DD'`; «hoy» se calcula en la zona horaria `Europe/Madrid`. Las consultas SQL devuelven fechas con `::text`.
- Un único usuario: las tablas no llevan `user_id`. El acceso es una contraseña (`CLAVE_ACCESO`) y una cookie firmada con HMAC-SHA256 (`SECRETO_SESION`, al menos 32 caracteres) que caduca a los 90 días.
- Variables de entorno: `DATABASE_URL`, `CLAVE_ACCESO`, `SECRETO_SESION`; para pruebas, `E2E_DATABASE_URL` y `E2E_CLAVE_ACCESO`. Nunca se commitea `.env.local`.
- `next dev` puede generar `AGENTS.md` y `CLAUDE.md` en la raíz: no los commitees.
- Al final de cada tarea, `npm test` y `npm run tsc` en verde. Commits con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Imports dentro de `lib/` y `scripts/` con rutas relativas; en `app/`, `components/` y `proxy.ts` se puede usar el alias `@/`.

---

### Task 1: Andamiaje de Next.js

**Files:**
- Modify: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `next.config.ts`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/(app)/page.tsx` (provisional)

**Interfaces:**
- Produces: proyecto Next.js que compila (`npm run build`), alias `@/*` → raíz del repo, scripts npm `dev`, `build`, `start`, `test`, `tsc`, `metadatos`, `migrar`, `migrar:pruebas`, `probar-bd`, `e2e`.

- [ ] **Step 1: Instalar dependencias**

```bash
npm install next@16 react@19 react-dom@19 @neondatabase/serverless@1
npm install -D @types/react@19 @types/react-dom@19 tailwindcss@4 @tailwindcss/postcss@4 @playwright/test@1
```

- [ ] **Step 2: Scripts de `package.json`**

Deja `"scripts"` así (el resto de `package.json` lo gestiona npm):

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "tsc": "tsc --noEmit",
  "metadatos": "node scripts/generar-metadatos.ts",
  "migrar": "node --env-file-if-exists=.env.local scripts/migrar.ts",
  "migrar:pruebas": "node --env-file-if-exists=.env.local scripts/migrar.ts --pruebas",
  "probar-bd": "node --env-file-if-exists=.env.local scripts/probar-bd.ts",
  "e2e": "playwright test"
}
```

- [ ] **Step 3: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "allowImportingTsExtensions": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Si `next build` reescribe algún campo de `tsconfig.json`, acepta su cambio y menciónalo en el informe.

- [ ] **Step 4: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['**/*.test.ts'], exclude: ['**/node_modules/**', '.next/**', 'e2e/**'] },
})
```

- [ ] **Step 5: Configuración de Next.js y Tailwind**

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

const config: NextConfig = {}

export default config
```

`postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`app/globals.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 6: Layout raíz y página provisional**

`app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: 'Karstika Entreno', description: 'Entrenador personal de escalada' }
export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function LayoutRaiz({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  )
}
```

`app/(app)/page.tsx` (provisional; la Task 10 lo sustituye):

```tsx
export default function PaginaHoy() {
  return <p className="p-4">Karstika Entreno</p>
}
```

- [ ] **Step 7: `.gitignore`**

Añade al final:

```
test-results
playwright-report
.vercel
next-env.d.ts
```

- [ ] **Step 8: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: 647 pruebas en verde, tsc sin errores y build correcto (ruta `/` generada).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore next.config.ts postcss.config.mjs app
git commit -m "chore(app): andamiaje de Next.js 16 con Tailwind 4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Esquema de la base de datos y scripts

**Files:**
- Create: `migraciones/001_esquema_inicial.sql`, `scripts/migrar.ts`, `scripts/base-pruebas.ts`, `scripts/probar-bd.ts`

**Interfaces:**
- Produces: tablas `perfil`, `evaluaciones`, `sesiones`, `registros`, `chequeos`, `altas`, `consejos_mostrados`, `intentos_limite` (columnas exactas abajo; las Tasks 4 y 7 las usan). `scripts/base-pruebas.ts` exporta `sqlPruebas(): Promise<NeonQueryFunction<false, false>>` y `vaciar(sql): Promise<void>` (los usa la Task 11).

- [ ] **Step 1: Migración**

`migraciones/001_esquema_inicial.sql`:

```sql
-- Karstika Entreno: esquema inicial (un único usuario, sin user_id).

create table perfil (
  id smallint primary key default 1 check (id = 1),
  peso_kg double precision not null check (peso_kg between 30 and 200),
  anos_escalando double precision not null check (anos_escalando between 0 and 80),
  lesiones text[] not null default '{}',
  grado_actual text not null check (char_length(grado_actual) between 1 and 10),
  grado_objetivo text not null check (char_length(grado_objetivo) between 1 and 10),
  inicio_temporada date not null,
  objetivo_temporada date not null,
  aviso_aceptado_en timestamptz not null default now(),
  check (objetivo_temporada > inicio_temporada)
);

create table evaluaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  peso_corporal_kg double precision not null check (peso_corporal_kg between 30 and 200),
  lastre_kg double precision not null check (lastre_kg between -100 and 150),
  resistencia_s double precision check (resistencia_s > 0 and resistencia_s <= 3600),
  tecnica double precision check (tecnica between 1 and 7)
);

create table sesiones (
  id uuid primary key,
  fecha date not null,
  sesion jsonb not null,
  propuesta jsonb,
  origen text not null check (origen in ('propuesta', 'libre')),
  creada_en timestamptz not null default now(),
  check (jsonb_typeof(sesion) = 'object' and sesion->>'id' = id::text and sesion->>'fecha' = fecha::text),
  check (propuesta is null or jsonb_typeof(propuesta) = 'object'),
  check ((origen = 'propuesta') = (propuesta is not null))
);
create index sesiones_fecha on sesiones (fecha);

-- Molestias: [{ zona, dolor 0-10, alarma? }]. El motor las valida a fondo; aquí, rango y zona como última barrera.
create table registros (
  sesion_id uuid primary key references sesiones (id) on delete cascade,
  rpe integer not null check (rpe between 0 and 10),
  duracion_min integer not null check (duracion_min between 1 and 1440),
  molestias jsonb not null default '[]',
  registrado_en timestamptz not null default now(),
  check (jsonb_typeof(molestias) = 'array' and not jsonb_path_exists(molestias,
    '$[*] ? (!(@.dolor >= 0 && @.dolor <= 10) || !(@.zona == "dedos" || @.zona == "muneca" || @.zona == "codo" || @.zona == "hombro" || @.zona == "otra"))'))
);

create table chequeos (
  fecha date primary key,
  sueno smallint not null check (sueno between 1 and 5),
  fatiga smallint not null check (fatiga between 1 and 5),
  ganas smallint not null check (ganas between 1 and 5),
  molestias jsonb not null default '[]',
  check (jsonb_typeof(molestias) = 'array' and not jsonb_path_exists(molestias,
    '$[*] ? (!(@.dolor >= 0 && @.dolor <= 10) || !(@.zona == "dedos" || @.zona == "muneca" || @.zona == "codo" || @.zona == "hombro" || @.zona == "otra"))'))
);

create table altas (
  id uuid primary key default gen_random_uuid(),
  zona text not null check (zona in ('dedos', 'muneca', 'codo', 'hombro', 'otra')),
  fecha date not null,
  creada_en timestamptz not null default now()
);

create table consejos_mostrados (
  id uuid primary key default gen_random_uuid(),
  consejo_id text not null check (char_length(consejo_id) between 1 and 60),
  fecha date not null
);

create table intentos_limite (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones (id) on delete cascade,
  fecha date not null,
  encadenado boolean not null,
  motivo_caida text check (motivo_caida in ('bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza')),
  check (not (encadenado and motivo_caida is not null))
);
```

- [ ] **Step 2: Script de migraciones**

`scripts/migrar.ts`:

```ts
// Aplica en orden las migraciones de migraciones/*.sql que no estén en la tabla `migraciones`.
// Uso: npm run migrar (DATABASE_URL) · npm run migrar:pruebas (E2E_DATABASE_URL, y marca la base como de pruebas).
import { readdirSync, readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'

const pruebas = process.argv.includes('--pruebas')
const url = pruebas ? process.env.E2E_DATABASE_URL : process.env.DATABASE_URL
if (!url) {
  console.error(`Falta ${pruebas ? 'E2E_DATABASE_URL' : 'DATABASE_URL'}`)
  process.exit(1)
}
if (pruebas && url === process.env.DATABASE_URL) {
  console.error('E2E_DATABASE_URL es la misma que DATABASE_URL: la base de pruebas tiene que ser otra rama de Neon')
  process.exit(1)
}

const pool = new Pool({ connectionString: url })
const cliente = await pool.connect()
try {
  await cliente.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())')
  const hechas = new Set((await cliente.query('select nombre from migraciones')).rows.map((r: { nombre: string }) => r.nombre))
  const ficheros = readdirSync('migraciones').filter((f) => f.endsWith('.sql')).sort()
  for (const f of ficheros) {
    if (hechas.has(f)) continue
    await cliente.query('begin')
    try {
      await cliente.query(readFileSync(`migraciones/${f}`, 'utf8'))
      await cliente.query('insert into migraciones (nombre) values ($1)', [f])
      await cliente.query('commit')
      console.log(`aplicada ${f}`)
    } catch (e) {
      await cliente.query('rollback')
      throw e
    }
  }
  if (pruebas) await cliente.query('create table if not exists _base_de_pruebas (marcada_en timestamptz not null default now())')
  console.log('migraciones al día')
} finally {
  cliente.release()
  await pool.end()
}
```

- [ ] **Step 3: Utilidades para la base de pruebas**

`scripts/base-pruebas.ts`:

```ts
// Acceso a la base de pruebas (E2E_DATABASE_URL). Se niega a trabajar con una base sin la marca _base_de_pruebas,
// que solo pone `npm run migrar:pruebas`: así un vaciado nunca puede tocar la base de producción.
import { neon } from '@neondatabase/serverless'

export async function sqlPruebas() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error('Falta E2E_DATABASE_URL')
  const sql = neon(url)
  const [fila] = await sql`select to_regclass('_base_de_pruebas') is not null as marcada`
  if (!fila?.marcada) throw new Error('E2E_DATABASE_URL no es una base de pruebas (falta _base_de_pruebas): ejecuta npm run migrar:pruebas')
  return sql
}

export async function vaciar(sql: Awaited<ReturnType<typeof sqlPruebas>>): Promise<void> {
  await sql`truncate perfil, evaluaciones, sesiones, registros, chequeos, altas, consejos_mostrados, intentos_limite`
}
```

- [ ] **Step 4: Script que prueba las CHECK**

`scripts/probar-bd.ts`:

```ts
// Comprueba contra la base de pruebas que las restricciones rechazan datos fuera de rango y aceptan los válidos.
// Uso: npm run migrar:pruebas && npm run probar-bd
import { sqlPruebas, vaciar } from './base-pruebas.ts'

const sql = await sqlPruebas()
await vaciar(sql)
const S1 = '00000000-0000-4000-8000-000000000001'
const sesion = (id: string, fecha: string) => JSON.stringify({ id, tipo: 'tecnica', intensidad: 'suave', fecha, horaInicio: 19, duracionMin: 60 })

// Datos válidos de base (si algo de esto falla, el esquema está mal).
await sql`insert into perfil (peso_kg, anos_escalando, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada)
  values (70, 1.5, '6b', '7a', '2026-11-02', '2027-10-04')`
await sql`insert into sesiones (id, fecha, sesion, origen) values (${S1}, '2026-11-03', ${sesion(S1, '2026-11-03')}::jsonb, 'libre')`
await sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg) values ('2026-11-04', 70, 10)`
await sql`insert into chequeos (fecha, sueno, fatiga, ganas, molestias) values ('2026-11-03', 3, 3, 3, ${JSON.stringify([{ zona: 'dedos', dolor: 2 }])}::jsonb)`

const S2 = '00000000-0000-4000-8000-000000000002'
const casos: [string, () => Promise<unknown>][] = [
  ['segundo perfil', () => sql`insert into perfil (id, peso_kg, anos_escalando, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada) values (2, 70, 1, '6b', '7a', '2026-11-02', '2027-10-04')`],
  ['peso de 10 kg', () => sql`update perfil set peso_kg = 10`],
  ['objetivo antes del inicio', () => sql`update perfil set objetivo_temporada = '2026-01-01'`],
  ['evaluación repetida el mismo día', () => sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg) values ('2026-11-04', 70, 12)`],
  ['técnica 8', () => sql`insert into evaluaciones (fecha, peso_corporal_kg, lastre_kg, tecnica) values ('2026-11-05', 70, 10, 8)`],
  ['sesión cuyo JSON no lleva su id', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-03', ${sesion(S1, '2026-11-03')}::jsonb, 'libre')`],
  ['sesión cuyo JSON no lleva su fecha', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-04', ${sesion(S2, '2026-11-03')}::jsonb, 'libre')`],
  ['sesión propuesta sin propuesta', () => sql`insert into sesiones (id, fecha, sesion, origen) values (${S2}, '2026-11-03', ${sesion(S2, '2026-11-03')}::jsonb, 'propuesta')`],
  ['registro con RPE 11', () => sql`insert into registros (sesion_id, rpe, duracion_min) values (${S1}, 11, 60)`],
  ['registro de 0 minutos', () => sql`insert into registros (sesion_id, rpe, duracion_min) values (${S1}, 5, 0)`],
  ['molestia con dolor 11', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 11 }])}::jsonb)`],
  ['molestia de zona desconocida', () => sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'rodilla', dolor: 2 }])}::jsonb)`],
  ['segundo chequeo el mismo día', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-03', 4, 4, 4)`],
  ['chequeo con sueño 6', () => sql`insert into chequeos (fecha, sueno, fatiga, ganas) values ('2026-11-04', 6, 3, 3)`],
  ['alta de zona desconocida', () => sql`insert into altas (zona, fecha) values ('rodilla', '2026-11-03')`],
  ['intento encadenado con motivo', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', true, 'bombeo')`],
  ['intento con motivo desconocido', () => sql`insert into intentos_limite (sesion_id, fecha, encadenado, motivo_caida) values (${S1}, '2026-11-03', false, 'lluvia')`],
]

const aceptados: string[] = []
for (const [nombre, consulta] of casos) {
  try {
    await consulta()
    aceptados.push(nombre)
  } catch {
    // rechazado: es lo esperado
  }
}

// Un registro válido sí entra, y borrar la sesión lo borra en cascada.
await sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${S1}, 5, 60, ${JSON.stringify([{ zona: 'dedos', dolor: 2, alarma: true }])}::jsonb)`
await sql`delete from sesiones where id = ${S1}`
const [quedan] = await sql`select count(*)::int as n from registros`
await vaciar(sql)

if (aceptados.length > 0 || quedan?.n !== 0) {
  console.error('La base de datos aceptó datos que debía rechazar:', aceptados, 'registros sin sesión:', quedan?.n)
  process.exit(1)
}
console.log(`base de datos correcta: ${casos.length} casos rechazados`)
```

- [ ] **Step 5: Ejecutar contra la base de pruebas (si existe)**

Si `.env.local` tiene `E2E_DATABASE_URL`:

Run: `npm run migrar:pruebas && npm run probar-bd`
Expected: `aplicada 001_esquema_inicial.sql`, `migraciones al día` y `base de datos correcta: 17 casos rechazados`.

Si todavía no hay base de pruebas (la crea Diego, ver `docs/despliegue.md` en la Task 11), no inventes una: indica en el informe «probar-bd pendiente: falta E2E_DATABASE_URL».

- [ ] **Step 6: Comprobar y commit**

Run: `npm test && npm run tsc`
Expected: verde.

```bash
git add migraciones scripts/migrar.ts scripts/base-pruebas.ts scripts/probar-bd.ts
git commit -m "feat(bd): esquema inicial en Postgres y scripts de migración y comprobación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Utilidades puras de fecha, formularios y nombres

**Files:**
- Create: `lib/fecha.ts`, `lib/fecha.test.ts`, `lib/formulario.ts`, `lib/formulario.test.ts`, `lib/nombres.ts`, `lib/estado.ts`

**Interfaces:**
- Produces:
  - `ahoraMadrid(d: Date): { fecha: string; hora: number; hhmm: string }`, `fechaLarga(fecha: string): string`, `sumarDias(fecha: string, dias: number): string`
  - `ErrorFormulario`, `texto`, `textoOpcional`, `numero`, `numeroOpcional`, `entero`, `fecha`, `hora`, `opcion`, `contexto`, `molestias`, `intentos`, `MAX_INTENTOS`, `mensajeDe`
  - `NOMBRE_TIPO`, `NOMBRE_ZONA`, `NOMBRE_MOTIVO`, `ETIQUETA_RPE`, `TIPOS_CON_INTENTOS`, `MOTIVOS_CAIDA`
  - `type EstadoAccion = { error?: string; ok?: string; avisos?: string[] } | null`

- [ ] **Step 1: Pruebas de fecha**

`lib/fecha.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ahoraMadrid, fechaLarga, sumarDias } from './fecha'

describe('ahoraMadrid', () => {
  it('usa la hora de Madrid, también el día del cambio de hora', () => {
    expect(ahoraMadrid(new Date('2026-10-25T00:30:00Z'))).toEqual({ fecha: '2026-10-25', hora: 2.5, hhmm: '02:30' })
    expect(ahoraMadrid(new Date('2026-11-02T23:30:00Z'))).toEqual({ fecha: '2026-11-03', hora: 0.5, hhmm: '00:30' })
    expect(ahoraMadrid(new Date('2026-07-01T21:45:00Z'))).toEqual({ fecha: '2026-07-01', hora: 23.75, hhmm: '23:45' })
  })
})

describe('fechaLarga y sumarDias', () => {
  it('escribe la fecha en español', () => {
    expect(fechaLarga('2026-11-02')).toBe('lunes, 2 de noviembre')
  })
  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(sumarDias('2026-11-02', 48 * 7)).toBe('2027-10-04')
    expect(sumarDias('2026-11-02', -1)).toBe('2026-11-01')
  })
})
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run lib/fecha.test.ts`
Expected: FAIL (no existe `./fecha`).

- [ ] **Step 3: Implementar `lib/fecha.ts`**

```ts
// Fechas de la app. «Hoy» es el día natural en Madrid; las fechas viajan como 'AAAA-MM-DD'.
// Puro: el instante actual lo pasa quien llama.

const PARTES_MADRID = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function ahoraMadrid(d: Date): { fecha: string; hora: number; hhmm: string } {
  const partes = PARTES_MADRID.formatToParts(d)
  const v = (tipo: Intl.DateTimeFormatPartTypes): string => {
    const p = partes.find((x) => x.type === tipo)
    if (!p) throw new Error(`Fecha sin ${tipo}`)
    return p.value
  }
  const hh = v('hour')
  const mm = v('minute')
  return { fecha: `${v('year')}-${v('month')}-${v('day')}`, hora: Number(hh) + Number(mm) / 60, hhmm: `${hh}:${mm}` }
}

const LARGA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function fechaLarga(fecha: string): string {
  return LARGA.format(new Date(`${fecha}T12:00:00Z`))
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run lib/fecha.test.ts`
Expected: PASS.

- [ ] **Step 5: Nombres y estado de las acciones**

`lib/nombres.ts`:

```ts
import type { MotivoCaida, TipoSesion, Zona } from '../motor'

export const NOMBRE_TIPO: Record<TipoSesion, string> = {
  'multipresa-resistencia': 'Multipresa: repeaters',
  'multipresa-maxima': 'Multipresa: suspensiones máximas',
  'multipresa-resistencia-fuerza': 'Multipresa: resistencia de fuerza',
  'evaluacion-dedos': 'Test de dedos',
  board: 'Board',
  'bloque-limite': 'Bloque al límite',
  'bloque-suave': 'Bloque suave',
  'via-cuerda-limite': 'Vía con cuerda al límite',
  'via-autoasegurada': 'Vía autoasegurada',
  'pegues-proyecto': 'Pegues al proyecto',
  campus: 'Campus',
  'resistencia-4x4': 'Resistencia 4×4',
  arc: 'ARC',
  tecnica: 'Técnica',
  dominadas: 'Dominadas lastradas',
  hombro: 'Hombro',
  descanso: 'Descanso',
}

export const NOMBRE_ZONA: Record<Zona, string> = {
  dedos: 'Dedos',
  muneca: 'Muñeca / antebrazo',
  codo: 'Codo',
  hombro: 'Hombro',
  otra: 'Otra zona',
}

export const MOTIVOS_CAIDA = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza'] as const satisfies readonly MotivoCaida[]

export const NOMBRE_MOTIVO: Record<MotivoCaida, string> = {
  bombeo: 'Caí por bombeo',
  'paso-fuerza': 'Caí en un paso de fuerza',
  'tecnica-lectura': 'Caí por técnica o lectura',
  cabeza: 'Caí por la cabeza (miedo)',
}

// Escala CR-10 de esfuerzo de sesión (P-34).
export const ETIQUETA_RPE: readonly string[] = [
  'reposo', 'muy, muy fácil', 'fácil', 'moderado', 'algo duro', 'duro', 'duro +', 'muy duro', 'muy duro +', 'casi máximo', 'máximo',
]

// Sesiones en las que se apuntan los intentos al límite (alimentan el diagnóstico).
export const TIPOS_CON_INTENTOS: readonly TipoSesion[] = ['via-cuerda-limite', 'pegues-proyecto', 'bloque-limite']
```

`lib/estado.ts`:

```ts
// Lo que devuelven las Server Actions de formularios con useActionState.
export type EstadoAccion = { error?: string; ok?: string; avisos?: string[] } | null
```

- [ ] **Step 6: Pruebas de formulario**

`lib/formulario.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contexto, entero, ErrorFormulario, fecha, hora, intentos, molestias, numero, numeroOpcional } from './formulario'

const fd = (campos: Record<string, string>): FormData => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}
const sinMolestias = { dolor_dedos: '0', dolor_muneca: '0', dolor_codo: '0', dolor_hombro: '0', dolor_otra: '0' }

describe('formulario', () => {
  it('números con coma o punto y rango', () => {
    expect(numero(fd({ p: '70,5' }), 'p', 'El peso', 30, 200)).toBe(70.5)
    expect(() => numero(fd({ p: '20' }), 'p', 'El peso', 30, 200)).toThrow('El peso: debe ser un número entre 30 y 200.')
    expect(() => numero(fd({}), 'p', 'El peso', 30, 200)).toThrow(ErrorFormulario)
    expect(numeroOpcional(fd({ p: '' }), 'p', 'La técnica', 1, 7)).toBeNull()
    expect(() => entero(fd({ r: '7.5' }), 'r', 'El RPE', 0, 10)).toThrow('El RPE: debe ser un número entero.')
  })
  it('fechas y horas', () => {
    expect(fecha(fd({ f: '2026-11-03' }), 'f', 'La fecha')).toBe('2026-11-03')
    expect(() => fecha(fd({ f: '2026-02-30' }), 'f', 'La fecha')).toThrow('La fecha: fecha no válida.')
    expect(hora(fd({ h: '19:30' }), 'h', 'La hora')).toBe(19.5)
    expect(() => hora(fd({ h: '25:00' }), 'h', 'La hora')).toThrow('La hora: hora no válida.')
  })
  it('contexto', () => {
    expect(contexto(fd({ compania: 'con-gente', lugar: 'rocodromo', minutos: '120' }))).toEqual({
      compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120,
    })
    expect(() => contexto(fd({ compania: 'perro', lugar: 'rocodromo', minutos: '120' }))).toThrow('Compañía: opción no válida.')
  })
  it('molestias: solo las zonas con dolor o alarma', () => {
    expect(molestias(fd(sinMolestias))).toEqual([])
    expect(molestias(fd({ ...sinMolestias, dolor_dedos: '3', alarma_codo: 'on' }))).toEqual([
      { zona: 'dedos', dolor: 3 },
      { zona: 'codo', dolor: 0, alarma: true },
    ])
    expect(() => molestias(fd({ ...sinMolestias, dolor_hombro: '11' }))).toThrow('Dolor en Hombro: debe ser un número entre 0 y 10.')
  })
  it('intentos al límite', () => {
    expect(intentos(fd({ intento_0: 'encadenado', intento_1: '', intento_2: 'bombeo' }))).toEqual([
      { encadenado: true },
      { encadenado: false, motivoCaida: 'bombeo' },
    ])
    expect(() => intentos(fd({ intento_0: 'lluvia' }))).toThrow('Intento 1: opción no válida.')
  })
})
```

- [ ] **Step 7: Ver que falla**

Run: `npx vitest run lib/formulario.test.ts`
Expected: FAIL (no existe `./formulario`).

- [ ] **Step 8: Implementar `lib/formulario.ts`**

```ts
// Lectura y validación de campos de formulario. Los errores llevan un mensaje en español listo para mostrar.
import { ZONAS, type Contexto, type Molestia, type MotivoCaida } from '../motor'
import { MOTIVOS_CAIDA, NOMBRE_ZONA } from './nombres'

export class ErrorFormulario extends Error {}

export function textoOpcional(fd: FormData, nombre: string): string | null {
  const v = fd.get(nombre)
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

export function texto(fd: FormData, nombre: string, etiqueta: string): string {
  const v = textoOpcional(fd, nombre)
  if (v === null) throw new ErrorFormulario(`${etiqueta}: falta el dato.`)
  return v
}

export function numero(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number {
  const n = Number(texto(fd, nombre, etiqueta).replace(',', '.'))
  if (!Number.isFinite(n) || n < min || n > max) throw new ErrorFormulario(`${etiqueta}: debe ser un número entre ${min} y ${max}.`)
  return n
}

export function numeroOpcional(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number | null {
  return textoOpcional(fd, nombre) === null ? null : numero(fd, nombre, etiqueta, min, max)
}

export function entero(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number {
  const n = numero(fd, nombre, etiqueta, min, max)
  if (!Number.isInteger(n)) throw new ErrorFormulario(`${etiqueta}: debe ser un número entero.`)
  return n
}

export function fecha(fd: FormData, nombre: string, etiqueta: string): string {
  const v = texto(fd, nombre, etiqueta)
  const d = new Date(`${v}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw new ErrorFormulario(`${etiqueta}: fecha no válida.`)
  }
  return v
}

export function hora(fd: FormData, nombre: string, etiqueta: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(texto(fd, nombre, etiqueta))
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new ErrorFormulario(`${etiqueta}: hora no válida.`)
  return Number(m[1]) + Number(m[2]) / 60
}

export function opcion<T extends string>(fd: FormData, nombre: string, etiqueta: string, valores: readonly T[]): T {
  const v = texto(fd, nombre, etiqueta)
  if (!(valores as readonly string[]).includes(v)) throw new ErrorFormulario(`${etiqueta}: opción no válida.`)
  return v as T
}

export function contexto(fd: FormData): Contexto {
  return {
    compania: opcion(fd, 'compania', 'Compañía', ['solo', 'con-gente']),
    lugar: opcion(fd, 'lugar', 'Lugar', ['rocodromo', 'roca', 'casa']),
    minutosDisponibles: entero(fd, 'minutos', 'Minutos disponibles', 10, 600),
  }
}

// Campos dolor_<zona> (0-10) y alarma_<zona> (casilla). Solo se devuelven las zonas con dolor o alarma.
export function molestias(fd: FormData): Molestia[] {
  const out: Molestia[] = []
  for (const zona of ZONAS) {
    const dolor = entero(fd, `dolor_${zona}`, `Dolor en ${NOMBRE_ZONA[zona]}`, 0, 10)
    const alarma = fd.get(`alarma_${zona}`) === 'on'
    if (dolor > 0 || alarma) out.push({ zona, dolor, ...(alarma ? { alarma: true } : {}) })
  }
  return out
}

export const MAX_INTENTOS = 6

// Campos intento_0 … intento_5: '' (no hubo), 'encadenado' o un motivo de caída.
export function intentos(fd: FormData): { encadenado: boolean; motivoCaida?: MotivoCaida }[] {
  const out: { encadenado: boolean; motivoCaida?: MotivoCaida }[] = []
  for (let i = 0; i < MAX_INTENTOS; i++) {
    const v = textoOpcional(fd, `intento_${i}`)
    if (v === null) continue
    if (v === 'encadenado') out.push({ encadenado: true })
    else out.push({ encadenado: false, motivoCaida: opcion(fd, `intento_${i}`, `Intento ${i + 1}`, MOTIVOS_CAIDA) })
  }
  return out
}

export function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
```

- [ ] **Step 9: Ver que pasa todo**

Run: `npm test && npm run tsc`
Expected: verde.

- [ ] **Step 10: Commit**

```bash
git add lib
git commit -m "feat(app): utilidades puras de fecha, formularios y nombres

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Filas de la base de datos ↔ tipos del motor

**Files:**
- Create: `lib/datos/filas.ts`, `lib/datos/_fabrica.ts`, `lib/datos/mapeo.ts`, `lib/datos/mapeo.test.ts`, `lib/datos/cambios.ts`, `lib/datos/cambios.test.ts`, `lib/datos/validar.ts`, `lib/datos/validar.test.ts`

**Interfaces:**
- Consumes: tablas de la Task 2 (los nombres de campo de `Fila*` son los de las columnas).
- Produces:
  - Tipos `FilaPerfil`, `PerfilNuevo`, `FilaEvaluacion`, `FilaSesion`, `FilaRegistro`, `FilaChequeo`, `FilaAlta`, `FilaConsejo`, `FilaIntento`, `DatosAtleta`
  - `perfilMotor`, `evaluacionMotor`, `evaluacionesMotor`, `evaluacionParaFecha`, `historialMotor`, `seguimientoMotor`, `intentosMotor`, `consejosMostradosMotor`
  - `filaSesionAceptada(plan, id)`, `filaSesionLibre(l: DatosLibre)`, `conChequeo`, `conSesion`, `sinSesion`, `conRegistro`, `conEvaluacion`
  - `validarDatos(d: DatosAtleta): void`
  - Fábrica de pruebas: `PERFIL`, `datosVacios`, `sesionFila`, `uuid`

- [ ] **Step 1: Tipos de fila**

`lib/datos/filas.ts`:

```ts
// Filas tal como las devuelven las consultas de lib/servidor/consultas.ts (fechas como 'AAAA-MM-DD').
import type { MotivoCaida, Molestia, Sesion, SesionPlan, Zona } from '../../motor'

export interface FilaPerfil {
  peso_kg: number
  anos_escalando: number
  lesiones: string[]
  grado_actual: string
  grado_objetivo: string
  inicio_temporada: string
  objetivo_temporada: string
  aviso_aceptado_en: string
}
export type PerfilNuevo = Omit<FilaPerfil, 'aviso_aceptado_en'>

export interface FilaEvaluacion {
  id: string
  fecha: string
  peso_corporal_kg: number
  lastre_kg: number
  resistencia_s: number | null
  tecnica: number | null
}

export interface FilaSesion {
  id: string
  fecha: string
  sesion: Sesion
  propuesta: SesionPlan | null
  origen: 'propuesta' | 'libre'
}

export interface FilaRegistro {
  sesion_id: string
  rpe: number
  duracion_min: number
  molestias: Molestia[]
  registrado_en: string
}

export interface FilaChequeo {
  fecha: string
  sueno: number
  fatiga: number
  ganas: number
  molestias: Molestia[]
}

export interface FilaAlta {
  id: string
  zona: Zona
  fecha: string
}

export interface FilaConsejo {
  consejo_id: string
  fecha: string
}

export interface FilaIntento {
  id: string
  sesion_id: string
  fecha: string
  encadenado: boolean
  motivo_caida: MotivoCaida | null
}

export interface DatosAtleta {
  perfil: FilaPerfil
  evaluaciones: FilaEvaluacion[]
  sesiones: FilaSesion[]
  registros: FilaRegistro[]
  chequeos: FilaChequeo[]
  altas: FilaAlta[]
  consejos: FilaConsejo[]
  intentos: FilaIntento[]
}
```

- [ ] **Step 2: Fábrica de pruebas**

`lib/datos/_fabrica.ts`:

```ts
import type { Sesion } from '../../motor'
import type { DatosAtleta, FilaPerfil, FilaSesion } from './filas'

export const PERFIL: FilaPerfil = {
  peso_kg: 70,
  anos_escalando: 1.5,
  lesiones: [],
  grado_actual: '6b',
  grado_objetivo: '7a',
  inicio_temporada: '2026-11-02',
  objetivo_temporada: '2027-10-04',
  aviso_aceptado_en: '2026-10-27 10:00:00+00',
}

export function datosVacios(extra: Partial<DatosAtleta> = {}): DatosAtleta {
  return { perfil: PERFIL, evaluaciones: [], sesiones: [], registros: [], chequeos: [], altas: [], consejos: [], intentos: [], ...extra }
}

export const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export function sesionFila(id: string, fecha: string, extra: Partial<Sesion> = {}): FilaSesion {
  const sesion: Sesion = { id, tipo: 'tecnica', intensidad: 'suave', fecha, horaInicio: 19, duracionMin: 60, ...extra }
  return { id, fecha, sesion, propuesta: null, origen: 'libre' }
}
```

- [ ] **Step 3: Pruebas del mapeo**

`lib/datos/mapeo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, PERFIL, sesionFila, uuid } from './_fabrica'
import {
  consejosMostradosMotor, evaluacionesMotor, evaluacionMotor, evaluacionParaFecha, historialMotor, intentosMotor, perfilMotor, seguimientoMotor,
} from './mapeo'

describe('mapeo filas → motor', () => {
  it('perfil', () => {
    expect(perfilMotor({ ...PERFIL, lesiones: ['polea A2 (2025)'] })).toEqual({ pesoKg: 70, anosEscalando: 1.5, lesiones: ['polea A2 (2025)'] })
  })
  it('evaluación: los nulos no se pasan', () => {
    const base = { id: uuid(1), fecha: '2026-11-04', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }
    expect(evaluacionMotor(base)).toEqual({ fecha: '2026-11-04', pesoCorporalKg: 70, lastreKg: 10 })
    expect(evaluacionMotor({ ...base, resistencia_s: 95, tecnica: 4 })).toEqual({
      fecha: '2026-11-04', pesoCorporalKg: 70, lastreKg: 10, resistenciaS: 95, tecnica: 4,
    })
  })
  it('evaluaciones en orden y la vigente para una fecha es la última no posterior', () => {
    const ev = (n: number, fecha: string) => ({ id: uuid(n), fecha, peso_corporal_kg: 70, lastre_kg: n, resistencia_s: null, tecnica: null })
    const lista = evaluacionesMotor([ev(2, '2026-12-20'), ev(1, '2026-11-04')])
    expect(lista.map((e) => e.fecha)).toEqual(['2026-11-04', '2026-12-20'])
    expect(evaluacionParaFecha(lista, '2026-11-03')).toBeUndefined()
    expect(evaluacionParaFecha(lista, '2026-11-04')?.lastreKg).toBe(1)
    expect(evaluacionParaFecha(lista, '2027-01-10')?.lastreKg).toBe(2)
  })
  it('historial ordenado por fecha y hora, con el id y la fecha de la fila', () => {
    const tarde = sesionFila(uuid(1), '2026-11-03', { horaInicio: 19 })
    const manana = sesionFila(uuid(2), '2026-11-03', { horaInicio: 9 })
    const antes = sesionFila(uuid(3), '2026-11-01')
    expect(historialMotor([tarde, manana, antes]).map((s) => s.id)).toEqual([uuid(3), uuid(2), uuid(1)])
    const rara = { ...tarde, sesion: { ...tarde.sesion, id: 'otro' } }
    expect(historialMotor([rara])[0]!.id).toBe(uuid(1))
  })
  it('seguimiento: cada registro lleva la fecha de su sesión', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 6, duracion_min: 55, molestias: [{ zona: 'dedos', dolor: 2 }], registrado_en: 'x' }],
      chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 3, ganas: 5, molestias: [] }],
      altas: [{ id: uuid(9), zona: 'hombro', fecha: '2026-11-04' }],
    })
    expect(seguimientoMotor(d)).toEqual({
      registros: [{ sesionId: uuid(1), fecha: '2026-11-03', rpe: 6, duracionMin: 55, molestias: [{ zona: 'dedos', dolor: 2 }] }],
      chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 3, ganas: 5, molestias: [] }],
      altas: [{ zona: 'hombro', fecha: '2026-11-04' }],
    })
  })
  it('un registro de una sesión que no existe es un error', () => {
    const d = datosVacios({ registros: [{ sesion_id: uuid(1), rpe: 6, duracion_min: 55, molestias: [], registrado_en: 'x' }] })
    expect(() => seguimientoMotor(d)).toThrow(`El registro de la sesión ${uuid(1)} no tiene sesión`)
  })
  it('intentos y consejos', () => {
    expect(intentosMotor([
      { id: uuid(1), sesion_id: uuid(5), fecha: '2026-11-03', encadenado: true, motivo_caida: null },
      { id: uuid(2), sesion_id: uuid(5), fecha: '2026-11-03', encadenado: false, motivo_caida: 'bombeo' },
    ])).toEqual([{ fecha: '2026-11-03', encadenado: true }, { fecha: '2026-11-03', encadenado: false, motivoCaida: 'bombeo' }])
    expect(consejosMostradosMotor([{ consejo_id: 'sueno', fecha: '2026-11-03' }])).toEqual([{ id: 'sueno', fecha: '2026-11-03' }])
  })
})
```

- [ ] **Step 4: Ver que falla**

Run: `npx vitest run lib/datos/mapeo.test.ts`
Expected: FAIL (no existe `./mapeo`).

- [ ] **Step 5: Implementar `lib/datos/mapeo.ts`**

```ts
// Traducción de filas de la base de datos a los tipos del motor. Puro.
import type { EvaluacionDedos, IntentoLimite, Perfil, Seguimiento, Sesion } from '../../motor'
import type { DatosAtleta, FilaConsejo, FilaEvaluacion, FilaIntento, FilaPerfil, FilaSesion } from './filas'

export function perfilMotor(f: FilaPerfil): Perfil {
  return { pesoKg: f.peso_kg, anosEscalando: f.anos_escalando, lesiones: [...f.lesiones] }
}

export function evaluacionMotor(f: FilaEvaluacion): EvaluacionDedos {
  return {
    fecha: f.fecha,
    pesoCorporalKg: f.peso_corporal_kg,
    lastreKg: f.lastre_kg,
    ...(f.resistencia_s !== null ? { resistenciaS: f.resistencia_s } : {}),
    ...(f.tecnica !== null ? { tecnica: f.tecnica } : {}),
  }
}

export function evaluacionesMotor(filas: readonly FilaEvaluacion[]): EvaluacionDedos[] {
  return filas.map(evaluacionMotor).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// La evaluación que se pasa al motor para una fecha: la última que no sea posterior (`evaluaciones` en orden).
export function evaluacionParaFecha(evaluaciones: readonly EvaluacionDedos[], fecha: string): EvaluacionDedos | undefined {
  return evaluaciones.filter((e) => e.fecha <= fecha).at(-1)
}

// El id y la fecha de la fila mandan (un CHECK de la base de datos ya exige que coincidan con el JSON).
export function historialMotor(filas: readonly FilaSesion[]): Sesion[] {
  return filas
    .map((f) => ({ ...f.sesion, id: f.id, fecha: f.fecha }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio - b.horaInicio || a.id.localeCompare(b.id))
}

export function seguimientoMotor(d: DatosAtleta): Seguimiento {
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  return {
    registros: d.registros.map((r) => {
      const fecha = fechaDe.get(r.sesion_id)
      if (fecha === undefined) throw new Error(`El registro de la sesión ${r.sesion_id} no tiene sesión`)
      return { sesionId: r.sesion_id, fecha, rpe: r.rpe, duracionMin: r.duracion_min, molestias: r.molestias }
    }),
    chequeos: [...d.chequeos]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((c) => ({ fecha: c.fecha, sueno: c.sueno, fatiga: c.fatiga, ganas: c.ganas, molestias: c.molestias })),
    altas: d.altas.map((a) => ({ zona: a.zona, fecha: a.fecha })),
  }
}

export function intentosMotor(filas: readonly FilaIntento[]): IntentoLimite[] {
  return filas.map((f) => ({ fecha: f.fecha, encadenado: f.encadenado, ...(f.motivo_caida ? { motivoCaida: f.motivo_caida } : {}) }))
}

export function consejosMostradosMotor(filas: readonly FilaConsejo[]): { id: string; fecha: string }[] {
  return filas.map((f) => ({ id: f.consejo_id, fecha: f.fecha }))
}
```

- [ ] **Step 6: Ver que pasa**

Run: `npx vitest run lib/datos/mapeo.test.ts`
Expected: PASS.

- [ ] **Step 7: Pruebas de los cambios**

`lib/datos/cambios.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { SesionPlan } from '../../motor'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conChequeo, conRegistro, conSesion, filaSesionAceptada, filaSesionLibre, sinSesion } from './cambios'

const plan: SesionPlan = {
  sesion: { id: 'propuesta-tecnica', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-11-03', horaInicio: 19, duracionMin: 60 },
  bloques: [],
  explicaciones: [],
}
const registro = (id: string) => ({ sesion_id: id, rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' })

describe('cambios', () => {
  it('aceptar una propuesta le pone un id propio sin tocar el resto', () => {
    const f = filaSesionAceptada(plan, uuid(1))
    expect(f).toEqual({ id: uuid(1), fecha: '2026-11-03', sesion: { ...plan.sesion, id: uuid(1) }, propuesta: { ...plan, sesion: { ...plan.sesion, id: uuid(1) } }, origen: 'propuesta' })
    expect(plan.sesion.id).toBe('propuesta-tecnica')
  })
  it('sesión libre', () => {
    expect(filaSesionLibre({ id: uuid(2), tipo: 'bloque-limite', intensidad: 'alta', fecha: '2026-11-03', horaInicio: 18, duracionMin: 90 })).toEqual({
      id: uuid(2),
      fecha: '2026-11-03',
      sesion: { id: uuid(2), tipo: 'bloque-limite', intensidad: 'alta', fecha: '2026-11-03', horaInicio: 18, duracionMin: 90 },
      propuesta: null,
      origen: 'libre',
    })
  })
  it('un chequeo por día: el nuevo sustituye al del mismo día', () => {
    const c = (fecha: string, sueno: number) => ({ fecha, sueno, fatiga: 3, ganas: 3, molestias: [] })
    const d = conChequeo(conChequeo(datosVacios(), c('2026-11-03', 2)), c('2026-11-03', 4))
    expect(d.chequeos).toEqual([c('2026-11-03', 4)])
    expect(conChequeo(d, c('2026-11-02', 3)).chequeos.map((x) => x.fecha)).toEqual(['2026-11-02', '2026-11-03'])
  })
  it('añadir y quitar sesiones', () => {
    const d = conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03'))
    expect(() => conSesion(d, sesionFila(uuid(1), '2026-11-04'))).toThrow(`La sesión ${uuid(1)} ya existe`)
    const conTodo = conRegistro(d, registro(uuid(1)), [{ id: uuid(7), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: true, motivo_caida: null }])
    const sin = sinSesion(conTodo, uuid(1))
    expect([sin.sesiones, sin.registros, sin.intentos]).toEqual([[], [], []])
  })
  it('registrar: la sesión tiene que existir y solo se registra una vez', () => {
    expect(() => conRegistro(datosVacios(), registro(uuid(1)), [])).toThrow('Esa sesión ya no existe.')
    const d = conRegistro(conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03')), registro(uuid(1)), [])
    expect(() => conRegistro(d, registro(uuid(1)), [])).toThrow('Esa sesión ya está registrada.')
  })
})
```

- [ ] **Step 8: Ver que falla**

Run: `npx vitest run lib/datos/cambios.test.ts`
Expected: FAIL (no existe `./cambios`).

- [ ] **Step 9: Implementar `lib/datos/cambios.ts`**

```ts
// Cómo quedan los datos tras cada acción, antes de escribirla: se validan con validarDatos y solo entonces se
// guardan. Puro.
import type { Intensidad, Sesion, SesionPlan, TipoSesion } from '../../motor'
import type { DatosAtleta, FilaChequeo, FilaEvaluacion, FilaIntento, FilaRegistro, FilaSesion } from './filas'

// El motor devuelve ids reservados («propuesta-…»); al aceptar, la sesión recibe su id propio.
export function filaSesionAceptada(plan: SesionPlan, id: string): FilaSesion {
  const sesion: Sesion = { ...plan.sesion, id }
  return { id, fecha: sesion.fecha, sesion, propuesta: { ...plan, sesion }, origen: 'propuesta' }
}

export interface DatosLibre {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  fecha: string
  horaInicio: number
  duracionMin: number
}

export function filaSesionLibre(l: DatosLibre): FilaSesion {
  const sesion: Sesion = { id: l.id, tipo: l.tipo, intensidad: l.intensidad, fecha: l.fecha, horaInicio: l.horaInicio, duracionMin: l.duracionMin }
  return { id: l.id, fecha: l.fecha, sesion, propuesta: null, origen: 'libre' }
}

export function conChequeo(d: DatosAtleta, c: FilaChequeo): DatosAtleta {
  return { ...d, chequeos: [...d.chequeos.filter((x) => x.fecha !== c.fecha), c].sort((a, b) => a.fecha.localeCompare(b.fecha)) }
}

export function conSesion(d: DatosAtleta, f: FilaSesion): DatosAtleta {
  if (d.sesiones.some((s) => s.id === f.id)) throw new Error(`La sesión ${f.id} ya existe`)
  return { ...d, sesiones: [...d.sesiones, f] }
}

export function sinSesion(d: DatosAtleta, id: string): DatosAtleta {
  return {
    ...d,
    sesiones: d.sesiones.filter((s) => s.id !== id),
    registros: d.registros.filter((r) => r.sesion_id !== id),
    intentos: d.intentos.filter((i) => i.sesion_id !== id),
  }
}

export function conRegistro(d: DatosAtleta, r: FilaRegistro, intentos: FilaIntento[]): DatosAtleta {
  if (!d.sesiones.some((s) => s.id === r.sesion_id)) throw new Error('Esa sesión ya no existe.')
  if (d.registros.some((x) => x.sesion_id === r.sesion_id)) throw new Error('Esa sesión ya está registrada.')
  return { ...d, registros: [...d.registros, r], intentos: [...d.intentos, ...intentos] }
}

export function conEvaluacion(d: DatosAtleta, e: FilaEvaluacion): DatosAtleta {
  return { ...d, evaluaciones: [...d.evaluaciones, e].sort((a, b) => a.fecha.localeCompare(b.fecha)) }
}
```

- [ ] **Step 10: Ver que pasa**

Run: `npx vitest run lib/datos/cambios.test.ts`
Expected: PASS.

- [ ] **Step 11: Pruebas de la validación**

`lib/datos/validar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { validarDatos } from './validar'

const ev = (n: number, fecha: string) => ({ id: uuid(n), fecha, peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null })

describe('validarDatos', () => {
  it('acepta datos coherentes', () => {
    expect(() => validarDatos(datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }],
      evaluaciones: [ev(2, '2026-11-04')],
      intentos: [{ id: uuid(3), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: false, motivo_caida: 'bombeo' }],
    }))).not.toThrow()
  })
  it('rechaza un RPE fuera de rango (lo dice el motor)', () => {
    expect(() => validarDatos(datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 11, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    }))).toThrow('el RPE debe estar entre 0 y 10')
  })
  it('rechaza dos evaluaciones el mismo día', () => {
    expect(() => validarDatos(datosVacios({ evaluaciones: [ev(1, '2026-11-04'), ev(2, '2026-11-04')] }))).toThrow('Hay dos evaluaciones el mismo día')
  })
  it('rechaza un intento sin sesión o con otra fecha', () => {
    const intento = { id: uuid(3), sesion_id: uuid(1), fecha: '2026-11-04', encadenado: true, motivo_caida: null }
    expect(() => validarDatos(datosVacios({ intentos: [intento] }))).toThrow(`El intento ${uuid(3)} no tiene sesión`)
    expect(() => validarDatos(datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], intentos: [intento] }))).toThrow(
      `El intento ${uuid(3)} no tiene la fecha de su sesión`,
    )
  })
})
```

- [ ] **Step 12: Ver que falla**

Run: `npx vitest run lib/datos/validar.test.ts`
Expected: FAIL (no existe `./validar`).

- [ ] **Step 13: Implementar `lib/datos/validar.ts`**

```ts
// Valida el conjunto de datos con los validadores del motor antes de escribir nada. Lanza con el mensaje del motor.
import { diagnosticar, validarEntrada, validarSeguimiento } from '../../motor'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, historialMotor, intentosMotor, seguimientoMotor } from './mapeo'

export function validarDatos(d: DatosAtleta): void {
  const historial = historialMotor(d.sesiones)
  validarEntrada(historial)
  validarSeguimiento(historial, seguimientoMotor(d))
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  for (const i of d.intentos) {
    const fecha = fechaDe.get(i.sesion_id)
    if (fecha === undefined) throw new Error(`El intento ${i.id} no tiene sesión`)
    if (fecha !== i.fecha) throw new Error(`El intento ${i.id} no tiene la fecha de su sesión`)
  }
  // diagnosticar valida todas las evaluaciones y todos los intentos (fechas repetidas, rangos) antes de calcular;
  // la fecha solo decide qué cuenta en el cálculo, que aquí no se usa.
  const fechas = [...d.evaluaciones.map((e) => e.fecha), ...d.intentos.map((i) => i.fecha)].sort()
  const ultima = fechas.at(-1)
  if (ultima !== undefined) diagnosticar(evaluacionesMotor(d.evaluaciones), intentosMotor(d.intentos), ultima)
}
```

- [ ] **Step 14: Ver que pasa todo**

Run: `npm test && npm run tsc`
Expected: verde.

- [ ] **Step 15: Commit**

```bash
git add lib/datos
git commit -m "feat(app): traducción entre filas y tipos del motor, cambios y validación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Preparar la propuesta y la vista de Hoy

**Files:**
- Create: `lib/datos/peticion.ts`, `lib/datos/peticion.test.ts`, `lib/datos/hoy.ts`, `lib/datos/hoy.test.ts`

**Interfaces:**
- Consumes: Task 4 (`DatosAtleta`, mapeo, cambios, `validarDatos`), Task 3 (`fechaLarga`).
- Produces:
  - `interface EntradaPeticion { fecha: string; horaInicio: number; contexto: Contexto }`
  - `type Preparacion = { tipo: 'fuera-temporada'; mensaje: string } | { tipo: 'propuesta'; propuesta: Propuesta; consejos: Consejo[]; fase: Fase }`
  - `temporadaDe(d: DatosAtleta): Temporada`, `prepararPropuesta(d: DatosAtleta, e: EntradaPeticion): Preparacion`, `opcionElegida(p: Propuesta, indice: number): SesionPlan | undefined` (0 = principal, 1… = alternativas)
  - `interface Tarjeta { fila: FilaSesion; registro?: FilaRegistro }`, `interface VistaHoy { hoy: Tarjeta[]; pendientes: Tarjeta[]; proximas: Tarjeta[]; zonasRojo: Zona[]; zonasAmbar: Zona[] }`, `vistaHoy(d: DatosAtleta, fecha: string): VistaHoy`

- [ ] **Step 1: Pruebas de la petición**

`lib/datos/peticion.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, uuid } from './_fabrica'
import { conChequeo, conRegistro, conSesion, filaSesionAceptada } from './cambios'
import { opcionElegida, prepararPropuesta, temporadaDe, type EntradaPeticion, type Preparacion } from './peticion'

const MARTES: EntradaPeticion = { fecha: '2026-11-03', horaInicio: 19, contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } }
const propuestaDe = (p: Preparacion) => {
  if (p.tipo !== 'propuesta') throw new Error(`esperaba una propuesta: ${p.mensaje}`)
  return p
}

describe('prepararPropuesta', () => {
  it('antes del inicio y después del final de la temporada no propone', () => {
    const antes = prepararPropuesta(datosVacios(), { ...MARTES, fecha: '2026-10-30' })
    expect(antes).toEqual({ tipo: 'fuera-temporada', mensaje: 'La temporada empieza el lunes, 2 de noviembre.' })
    const despues = prepararPropuesta(datosVacios(), { ...MARTES, fecha: '2028-01-10' })
    expect(despues.tipo).toBe('fuera-temporada')
  })
  it('el primer martes con amigos propone vía al límite con dos alternativas, y siempre igual', () => {
    const p = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(p.propuesta.principal?.sesion.tipo).toBe('via-cuerda-limite')
    expect(p.propuesta.alternativas.map((a) => a.sesion.tipo)).toEqual(['bloque-limite', 'tecnica'])
    expect(p.fase.id).toBe('base')
    expect(p.consejos.length).toBeGreaterThan(0)
    expect(prepararPropuesta(datosVacios(), MARTES)).toEqual(p)
  })
  it('opcionElegida: 0 es la principal y 1… las alternativas', () => {
    const { propuesta } = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(opcionElegida(propuesta, 0)?.sesion.tipo).toBe('via-cuerda-limite')
    expect(opcionElegida(propuesta, 2)?.sesion.tipo).toBe('tecnica')
    expect(opcionElegida(propuesta, 3)).toBeUndefined()
  })
  it('con el chequeo de hoy bajo no propone nada intenso', () => {
    const bajo = conChequeo(datosVacios(), { fecha: '2026-11-03', sueno: 1, fatiga: 1, ganas: 1, molestias: [] })
    const p = propuestaDe(prepararPropuesta(bajo, MARTES))
    expect(p.propuesta.estado?.chequeoBajoHoy).toBe(true)
    for (const o of [p.propuesta.principal, ...p.propuesta.alternativas]) if (o) expect(o.sesion.intensidad).toBe('suave')
  })
  it('escenario: aceptar, registrar por encima del RPE objetivo y la siguiente sale frenada (P-11)', () => {
    const martes = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    const fila = filaSesionAceptada(opcionElegida(martes.propuesta, 0)!, uuid(1))
    const d = conRegistro(conSesion(datosVacios(), fila), {
      sesion_id: uuid(1), rpe: 10, duracion_min: fila.sesion.duracionMin, molestias: [], registrado_en: 'x',
    }, [])
    const jueves = propuestaDe(prepararPropuesta(d, { ...MARTES, fecha: '2026-11-05' }))
    expect(jueves.propuesta.estado?.sinSubida).toBe(true)
  })
  it('datos incoherentes: lanza con el mensaje del motor', () => {
    const d = datosVacios({ registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }] })
    expect(() => prepararPropuesta(d, MARTES)).toThrow(`El registro de la sesión ${uuid(1)} no tiene sesión`)
  })
})

describe('temporadaDe', () => {
  it('el reparto del ciclo 2 se fija con lo sabido el lunes en que empieza el ciclo 2', () => {
    const base = temporadaDe(datosVacios())
    expect(base.semanas.find((s) => s.ciclo === 2)?.lunes).toBe('2027-04-19')
    const tardia = datosVacios({
      evaluaciones: [{ id: uuid(1), fecha: '2027-05-03', peso_corporal_kg: 70, lastre_kg: 25, resistencia_s: 200, tecnica: 6 }],
    })
    expect(temporadaDe(tardia)).toEqual(base)
  })
})
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run lib/datos/peticion.test.ts`
Expected: FAIL (no existe `./peticion`).

- [ ] **Step 3: Implementar `lib/datos/peticion.ts`**

```ts
// Arma la Peticion del motor a partir de los datos guardados y devuelve la propuesta con sus consejos. Puro.
import {
  ajusteCiclo2, diagnosticar, elegirConsejos, estadoAtleta, faseEnFecha, planificarTemporada, proponerSesion,
  type Consejo, type Contexto, type Fase, type Peticion, type Propuesta, type SesionPlan, type Temporada,
} from '../../motor'
import { fechaLarga } from '../fecha'
import type { DatosAtleta } from './filas'
import {
  consejosMostradosMotor, evaluacionesMotor, evaluacionParaFecha, historialMotor, intentosMotor, perfilMotor, seguimientoMotor,
} from './mapeo'
import { validarDatos } from './validar'

export interface EntradaPeticion {
  fecha: string
  horaInicio: number
  contexto: Contexto
}

export type Preparacion =
  | { tipo: 'fuera-temporada'; mensaje: string }
  | { tipo: 'propuesta'; propuesta: Propuesta; consejos: Consejo[]; fase: Fase }

// La temporada no se guarda: se recalcula. El reparto del ciclo 2 sale del diagnóstico con lo sabido el lunes en
// que empieza el ciclo 2 (el ciclo 1 no depende del ajuste), así no cambia a mitad de ciclo cuando llegan tests nuevos.
export function temporadaDe(d: DatosAtleta): Temporada {
  const { inicio_temporada: inicio, objetivo_temporada: objetivo } = d.perfil
  const sinAjuste = planificarTemporada(inicio, objetivo)
  const ciclo2 = sinAjuste.semanas.find((s) => s.ciclo === 2)
  if (!ciclo2) return sinAjuste
  const ajuste = ajusteCiclo2(diagnosticar(evaluacionesMotor(d.evaluaciones), intentosMotor(d.intentos), ciclo2.lunes))
  return planificarTemporada(inicio, objetivo, { ajuste })
}

export function prepararPropuesta(d: DatosAtleta, e: EntradaPeticion): Preparacion {
  validarDatos(d)
  const t = temporadaDe(d)
  if (e.fecha < t.inicio) return { tipo: 'fuera-temporada', mensaje: `La temporada empieza el ${fechaLarga(t.inicio)}.` }
  const historial = historialMotor(d.sesiones)
  const seguimiento = seguimientoMotor(d)
  const { descargasAdelantadas } = estadoAtleta(historial, seguimiento, e.fecha)
  let fase: Fase
  try {
    fase = faseEnFecha(t, e.fecha, { descargasAdelantadas })
  } catch (err) {
    if (e.fecha > t.objetivo) {
      return { tipo: 'fuera-temporada', mensaje: 'La temporada ya ha terminado. Para planificar otra, cambia las fechas en Perfil.' }
    }
    throw err
  }
  const evaluaciones = evaluacionesMotor(d.evaluaciones)
  const diagnostico = diagnosticar(evaluaciones, intentosMotor(d.intentos), e.fecha)
  const evaluacion = evaluacionParaFecha(evaluaciones, e.fecha)
  const peticion: Peticion = {
    fecha: e.fecha,
    horaInicio: e.horaInicio,
    contexto: e.contexto,
    perfil: perfilMotor(d.perfil),
    historial,
    fase,
    seguimiento,
    consejosMostrados: consejosMostradosMotor(d.consejos),
    ...(diagnostico.limitantes[0] ? { limitantePrincipal: diagnostico.limitantes[0] } : {}),
    ...(evaluacion ? { evaluacion } : {}),
  }
  const propuesta = proponerSesion(peticion)
  return { tipo: 'propuesta', propuesta, consejos: elegirConsejos(peticion, propuesta), fase }
}

export function opcionElegida(p: Propuesta, indice: number): SesionPlan | undefined {
  return indice === 0 ? (p.principal ?? undefined) : p.alternativas[indice - 1]
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run lib/datos/peticion.test.ts`
Expected: PASS. Si falla una expectativa sobre lo que propone el motor (tipos de sesión, fase), no cambies el motor ni ajustes la prueba a ciegas: anota la salida real en el informe y márcalo DONE_WITH_CONCERNS.

- [ ] **Step 5: Pruebas de la vista de Hoy**

`lib/datos/hoy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { vistaHoy } from './hoy'

describe('vistaHoy', () => {
  it('separa las de hoy, las pasadas sin registrar y las próximas', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(4), '2026-11-05'), sesionFila(uuid(1), '2026-11-01'), sesionFila(uuid(2), '2026-11-02'), sesionFila(uuid(3), '2026-11-03')],
      registros: [{ sesion_id: uuid(2), rpe: 4, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    })
    const v = vistaHoy(d, '2026-11-03')
    expect(v.hoy.map((t) => t.fila.id)).toEqual([uuid(3)])
    expect(v.pendientes.map((t) => t.fila.id)).toEqual([uuid(1)])
    expect(v.proximas.map((t) => t.fila.id)).toEqual([uuid(4)])
    expect(vistaHoy(d, '2026-11-02').hoy[0]?.registro?.rpe).toBe(4)
  })
  it('zonas en rojo y en ámbar según el semáforo del motor', () => {
    const conDolor = (zona: 'hombro' | 'dedos', dolor: number) =>
      datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona, dolor }] }] })
    expect(vistaHoy(conDolor('hombro', 6), '2026-11-03')).toMatchObject({ zonasRojo: ['hombro'], zonasAmbar: [] })
    expect(vistaHoy(conDolor('dedos', 2), '2026-11-03')).toMatchObject({ zonasRojo: [], zonasAmbar: ['dedos'] })
  })
})
```

- [ ] **Step 6: Ver que falla**

Run: `npx vitest run lib/datos/hoy.test.ts`
Expected: FAIL (no existe `./hoy`).

- [ ] **Step 7: Implementar `lib/datos/hoy.ts`**

```ts
// Lo que muestra la pantalla Hoy. Puro.
import { estadoAtleta, ZONAS, type Zona } from '../../motor'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { historialMotor, seguimientoMotor } from './mapeo'

export interface Tarjeta {
  fila: FilaSesion
  registro?: FilaRegistro
}

export interface VistaHoy {
  hoy: Tarjeta[]
  pendientes: Tarjeta[]          // días anteriores sin registro
  proximas: Tarjeta[]
  zonasRojo: Zona[]
  zonasAmbar: Zona[]
}

export function vistaHoy(d: DatosAtleta, fecha: string): VistaHoy {
  const registros = new Map(d.registros.map((r) => [r.sesion_id, r]))
  const historial = historialMotor(d.sesiones)
  const porId = new Map(d.sesiones.map((s) => [s.id, s]))
  const tarjetas: Tarjeta[] = historial.map((s) => {
    const fila = porId.get(s.id)!
    const registro = registros.get(s.id)
    return registro ? { fila, registro } : { fila }
  })
  const estado = estadoAtleta(historial, seguimientoMotor(d), fecha)
  return {
    hoy: tarjetas.filter((t) => t.fila.fecha === fecha),
    pendientes: tarjetas.filter((t) => t.fila.fecha < fecha && !t.registro),
    proximas: tarjetas.filter((t) => t.fila.fecha > fecha),
    zonasRojo: ZONAS.filter((z) => estado.zonas[z] === 'rojo'),
    zonasAmbar: ZONAS.filter((z) => estado.zonas[z] === 'ambar'),
  }
}
```

- [ ] **Step 8: Ver que pasa todo**

Run: `npm test && npm run tsc`
Expected: verde.

- [ ] **Step 9: Commit**

```bash
git add lib/datos
git commit -m "feat(app): preparar la propuesta del motor con la temporada recalculada y la vista de Hoy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Acceso con contraseña

**Files:**
- Create: `lib/servidor/acceso.ts`, `lib/servidor/acceso.test.ts`, `lib/servidor/limite.ts`, `lib/servidor/limite.test.ts`, `lib/servidor/entorno.ts`, `proxy.ts`, `app/entrar/page.tsx`, `app/entrar/FormularioEntrar.tsx`, `app/entrar/acciones.ts`, `components/estilos.ts`

**Interfaces:**
- Consumes: `EstadoAccion` (Task 3).
- Produces: `NOMBRE_COOKIE`, `DURACION_SESION_S`, `firmarSesion(secreto, ahoraS): Promise<string>`, `sesionValida(valor, secreto, ahoraS): Promise<boolean>`, `claveCorrecta(recibida, esperada): Promise<boolean>`; `crearLimitador(max?, esperaMs?)`; `variable(nombre): string`. Ruta `/entrar`.

- [ ] **Step 1: Pruebas de la cookie y del limitador**

`lib/servidor/acceso.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { claveCorrecta, DURACION_SESION_S, firmarSesion, sesionValida } from './acceso'

const S = 'secreto-de-pruebas-de-al-menos-32-caracteres'

describe('cookie de sesión', () => {
  it('una cookie recién firmada vale hasta que caduca', async () => {
    const v = await firmarSesion(S, 1_000)
    expect(await sesionValida(v, S, 1_001)).toBe(true)
    expect(await sesionValida(v, S, 1_000 + DURACION_SESION_S)).toBe(false)
  })
  it('no vale manipulada, con otro secreto, vacía o mal formada', async () => {
    const v = await firmarSesion(S, 1_000)
    const [, firma] = v.split('.')
    expect(await sesionValida(`99999999999.${firma}`, S, 1_001)).toBe(false)
    expect(await sesionValida(v, `${S}-otro`, 1_001)).toBe(false)
    expect(await sesionValida(undefined, S, 1_001)).toBe(false)
    expect(await sesionValida('basura', S, 1_001)).toBe(false)
    expect(await sesionValida(`${v}.extra`, S, 1_001)).toBe(false)
  })
  it('exige un secreto largo', async () => {
    await expect(firmarSesion('corto', 1_000)).rejects.toThrow('SECRETO_SESION debe tener al menos 32 caracteres')
  })
})

describe('claveCorrecta', () => {
  it('compara la contraseña', async () => {
    expect(await claveCorrecta('pegue-largo', 'pegue-largo')).toBe(true)
    expect(await claveCorrecta('pegue-larg', 'pegue-largo')).toBe(false)
    expect(await claveCorrecta('', '')).toBe(false)
  })
})
```

`lib/servidor/limite.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { crearLimitador } from './limite'

describe('limitador de intentos', () => {
  it('bloquea un minuto tras 5 fallos seguidos y se reinicia con un acierto', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 4; i++) l.fallo('ip', 1_000)
    expect(l.bloqueado('ip', 1_000)).toBe(false)
    l.fallo('ip', 2_000)
    expect(l.bloqueado('ip', 2_000)).toBe(true)
    expect(l.bloqueado('otra', 2_000)).toBe(false)
    expect(l.bloqueado('ip', 62_001)).toBe(false)
    l.exito('ip')
    expect(l.bloqueado('ip', 2_000)).toBe(false)
  })
  it('los fallos antiguos caducan', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 4; i++) l.fallo('ip', 0)
    l.fallo('ip', 70_000)
    expect(l.bloqueado('ip', 70_000)).toBe(false)
  })
})
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run lib/servidor`
Expected: FAIL (no existen los módulos).

- [ ] **Step 3: Implementar**

`lib/servidor/acceso.ts`:

```ts
// Sesión de acceso: una cookie "<caducidad en s>.<HMAC-SHA256 de la caducidad>" en base64url. Web Crypto, para que
// funcione igual en proxy.ts y en las Server Actions.
const codificador = new TextEncoder()

export const NOMBRE_COOKIE = 'entreno_sesion'
export const DURACION_SESION_S = 90 * 24 * 3600

function comprobarSecreto(secreto: string): void {
  if (secreto.length < 32) throw new Error('SECRETO_SESION debe tener al menos 32 caracteres')
}

function clave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function aBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function desdeBase64url(s: string): Uint8Array<ArrayBuffer> {
  const binario = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

export async function firmarSesion(secreto: string, ahoraS: number): Promise<string> {
  comprobarSecreto(secreto)
  const caduca = String(Math.floor(ahoraS) + DURACION_SESION_S)
  const firma = await crypto.subtle.sign('HMAC', await clave(secreto), codificador.encode(caduca))
  return `${caduca}.${aBase64url(firma)}`
}

export async function sesionValida(valor: string | undefined, secreto: string, ahoraS: number): Promise<boolean> {
  comprobarSecreto(secreto)
  if (!valor) return false
  const partes = valor.split('.')
  const [caduca, firma] = partes
  if (partes.length !== 2 || !caduca || !firma || !/^\d+$/.test(caduca) || Number(caduca) <= ahoraS) return false
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = desdeBase64url(firma)
  } catch {
    return false
  }
  return crypto.subtle.verify('HMAC', await clave(secreto), bytes, codificador.encode(caduca))
}

// Compara los resúmenes SHA-256 byte a byte, sin cortar en el primer carácter distinto.
export async function claveCorrecta(recibida: string, esperada: string): Promise<boolean> {
  if (esperada === '') return false
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', codificador.encode(recibida)),
    crypto.subtle.digest('SHA-256', codificador.encode(esperada)),
  ])
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  let diferencia = 0
  for (let i = 0; i < x.length; i++) diferencia |= x[i]! ^ y[i]!
  return diferencia === 0
}
```

`lib/servidor/limite.ts`:

```ts
// Espera tras varios fallos seguidos de contraseña desde la misma IP. En memoria: basta para un solo usuario (se
// reinicia con cada despliegue o instancia nueva).
export function crearLimitador(max = 5, esperaMs = 60_000) {
  const fallos = new Map<string, { n: number; ultimo: number }>()
  return {
    bloqueado(ip: string, ahoraMs: number): boolean {
      const f = fallos.get(ip)
      return f !== undefined && f.n >= max && ahoraMs - f.ultimo < esperaMs
    },
    fallo(ip: string, ahoraMs: number): void {
      const f = fallos.get(ip)
      const previos = f && ahoraMs - f.ultimo < esperaMs ? f.n : 0
      fallos.set(ip, { n: previos + 1, ultimo: ahoraMs })
    },
    exito(ip: string): void {
      fallos.delete(ip)
    },
  }
}
```

`lib/servidor/entorno.ts`:

```ts
export function variable(nombre: 'DATABASE_URL' | 'CLAVE_ACCESO' | 'SECRETO_SESION'): string {
  const v = process.env[nombre]
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`)
  return v
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run lib/servidor`
Expected: PASS.

- [ ] **Step 5: `proxy.ts` (raíz del repo)**

Lee antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { NOMBRE_COOKIE, sesionValida } from '@/lib/servidor/acceso'

// Sin sesión válida, todo va a /entrar; con sesión, /entrar va a Hoy. Las Server Actions se invocan en la ruta de su
// página, así que también pasan por aquí (y además cada acceso a datos vuelve a comprobar la sesión).
export async function proxy(request: NextRequest) {
  const secreto = process.env.SECRETO_SESION
  if (!secreto) return new NextResponse('Falta SECRETO_SESION', { status: 500 })
  const valida = await sesionValida(request.cookies.get(NOMBRE_COOKIE)?.value, secreto, Date.now() / 1000)
  const enEntrar = request.nextUrl.pathname === '/entrar'
  if (!valida && !enEntrar) return NextResponse.redirect(new URL('/entrar', request.url))
  if (valida && enEntrar) return NextResponse.redirect(new URL('/', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 6: Página `/entrar`**

`app/entrar/acciones.ts`:

```ts
'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { EstadoAccion } from '@/lib/estado'
import { claveCorrecta, DURACION_SESION_S, firmarSesion, NOMBRE_COOKIE } from '@/lib/servidor/acceso'
import { variable } from '@/lib/servidor/entorno'
import { crearLimitador } from '@/lib/servidor/limite'

const limitador = crearLimitador()

export async function entrar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const ahora = Date.now()
  if (limitador.bloqueado(ip, ahora)) return { error: 'Demasiados intentos fallidos. Espera un minuto.' }
  const recibida = fd.get('clave')
  if (typeof recibida !== 'string' || !(await claveCorrecta(recibida, variable('CLAVE_ACCESO')))) {
    limitador.fallo(ip, ahora)
    return { error: 'Contraseña incorrecta.' }
  }
  limitador.exito(ip)
  ;(await cookies()).set(NOMBRE_COOKIE, await firmarSesion(variable('SECRETO_SESION'), ahora / 1000), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_SESION_S,
  })
  redirect('/')
}
```

`app/entrar/FormularioEntrar.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { entrar } from './acciones'

export function FormularioEntrar() {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(entrar, null)
  return (
    <form action={accion} className="space-y-4">
      <label className="block">
        Contraseña
        <input type="password" name="clave" required autoComplete="current-password" className={CAMPO} />
      </label>
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Entrando…' : 'Entrar'}</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
```

`app/entrar/page.tsx`:

```tsx
import { FormularioEntrar } from './FormularioEntrar'

export default function PaginaEntrar() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="mb-6 text-2xl font-semibold">Karstika Entreno</h1>
      <FormularioEntrar />
    </main>
  )
}
```

`components/estilos.ts` (lo usan esta tarea y las siguientes):

```ts
export const BOTON = 'rounded bg-stone-900 px-4 py-2 font-medium text-white disabled:opacity-50'
export const CAMPO = 'mt-1 block w-full rounded border border-stone-300 bg-white px-3 py-2'
export const TARJETA = 'space-y-3 rounded border border-stone-200 bg-white p-4'
```

- [ ] **Step 7: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde y build correcto.

Prueba manual: crea `.env.local` (si no existe) con `CLAVE_ACCESO=prueba` y `SECRETO_SESION=` seguido de 40 caracteres cualesquiera; `npm run dev`; abrir `http://localhost:3000/` lleva a `/entrar`; con la contraseña mala sale «Contraseña incorrecta.»; con la buena entra en `/` (la página provisional). No commitees `.env.local`.

- [ ] **Step 8: Commit**

```bash
git add lib/servidor proxy.ts app/entrar components/estilos.ts
git commit -m "feat(app): acceso con contraseña única y cookie firmada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Acceso a la base de datos, layout de la app y componentes comunes

**Files:**
- Create: `lib/servidor/bd.ts`, `lib/servidor/consultas.ts`, `app/(app)/layout.tsx`, `app/(app)/acciones.ts`, `components/PorQue.tsx`, `components/PlanSesion.tsx`, `components/CamposMolestias.tsx`, `components/AvisoMedico.tsx`

**Interfaces:**
- Consumes: Task 2 (tablas), Task 4 (`Fila*`, `DatosAtleta`, `PerfilNuevo`), Task 6 (`sesionValida`, `NOMBRE_COOKIE`, `variable`).
- Produces:
  - `bd(): Promise<Sql>` (comprueba la sesión; sin ella, `redirect('/entrar')`), `type Sql`
  - `cargarDatos(sql): Promise<DatosAtleta | null>` (null si no hay perfil), `requerirDatos(): Promise<{ sql: Sql; datos: DatosAtleta }>` (sin perfil, `redirect('/perfil')`)
  - Escrituras: `guardarPerfilBd(sql, PerfilNuevo)`, `insertarEvaluacion(sql, FilaEvaluacion)`, `borrarEvaluacionBd(sql, id)`, `guardarChequeo(sql, FilaChequeo)`, `insertarSesion(sql, FilaSesion, FilaConsejo[])`, `borrarSesionBd(sql, id)`, `sustituirSesion(sql, idViejo, FilaSesion)`, `insertarRegistro(sql, FilaRegistro, FilaIntento[])`, `insertarAlta(sql, { zona, fecha })`
  - Componentes: `<PorQue explicaciones titulo? />`, `<PlanSesion plan />`, `<CamposMolestias />`, `<AvisoMedico />`

- [ ] **Step 1: Conexión con comprobación de sesión**

`lib/servidor/bd.ts`:

```ts
import { neon } from '@neondatabase/serverless'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NOMBRE_COOKIE, sesionValida } from './acceso'
import { variable } from './entorno'

export type Sql = ReturnType<typeof neon<false, false>>

// Toda lectura o escritura pasa por aquí: vuelve a comprobar la cookie aunque proxy.ts ya lo haya hecho.
export async function bd(): Promise<Sql> {
  const valor = (await cookies()).get(NOMBRE_COOKIE)?.value
  if (!(await sesionValida(valor, variable('SECRETO_SESION'), Date.now() / 1000))) redirect('/entrar')
  return neon(variable('DATABASE_URL'))
}
```

Si `ReturnType<typeof neon<false, false>>` no compila con la versión instalada, usa `NeonQueryFunction<false, false>` importado de `@neondatabase/serverless` (mira `index.d.ts`).

- [ ] **Step 2: Consultas**

`lib/servidor/consultas.ts`:

```ts
import { redirect } from 'next/navigation'
import type {
  DatosAtleta, FilaAlta, FilaChequeo, FilaConsejo, FilaEvaluacion, FilaIntento, FilaPerfil, FilaRegistro, FilaSesion, PerfilNuevo,
} from '../datos/filas'
import { bd, type Sql } from './bd'

// Una sola transacción de lectura para tener una foto coherente. Fechas como texto 'AAAA-MM-DD'.
export async function cargarDatos(sql: Sql): Promise<DatosAtleta | null> {
  const [perfil, evaluaciones, sesiones, registros, chequeos, altas, consejos, intentos] = await sql.transaction(
    [
      sql`select peso_kg, anos_escalando, lesiones, grado_actual, grado_objetivo, inicio_temporada::text as inicio_temporada,
            objetivo_temporada::text as objetivo_temporada, aviso_aceptado_en::text as aviso_aceptado_en from perfil where id = 1`,
      sql`select id::text as id, fecha::text as fecha, peso_corporal_kg, lastre_kg, resistencia_s, tecnica from evaluaciones order by fecha`,
      sql`select id::text as id, fecha::text as fecha, sesion, propuesta, origen from sesiones order by fecha, creada_en`,
      sql`select sesion_id::text as sesion_id, rpe, duracion_min, molestias, registrado_en::text as registrado_en from registros`,
      sql`select fecha::text as fecha, sueno, fatiga, ganas, molestias from chequeos order by fecha`,
      sql`select id::text as id, zona, fecha::text as fecha from altas order by fecha, creada_en`,
      sql`select consejo_id, fecha::text as fecha from consejos_mostrados order by fecha`,
      sql`select id::text as id, sesion_id::text as sesion_id, fecha::text as fecha, encadenado, motivo_caida from intentos_limite order by fecha`,
    ],
    { readOnly: true },
  )
  const filaPerfil = perfil?.[0] as FilaPerfil | undefined
  if (!filaPerfil) return null
  return {
    perfil: filaPerfil,
    evaluaciones: evaluaciones as FilaEvaluacion[],
    sesiones: sesiones as FilaSesion[],
    registros: registros as FilaRegistro[],
    chequeos: chequeos as FilaChequeo[],
    altas: altas as FilaAlta[],
    consejos: consejos as FilaConsejo[],
    intentos: intentos as FilaIntento[],
  }
}

export async function requerirDatos(): Promise<{ sql: Sql; datos: DatosAtleta }> {
  const sql = await bd()
  const datos = await cargarDatos(sql)
  if (!datos) redirect('/perfil')
  return { sql, datos }
}

export async function guardarPerfilBd(sql: Sql, f: PerfilNuevo): Promise<void> {
  await sql`insert into perfil (id, peso_kg, anos_escalando, lesiones, grado_actual, grado_objetivo, inicio_temporada, objetivo_temporada)
    values (1, ${f.peso_kg}, ${f.anos_escalando}, ${f.lesiones}, ${f.grado_actual}, ${f.grado_objetivo}, ${f.inicio_temporada}, ${f.objetivo_temporada})
    on conflict (id) do update set peso_kg = excluded.peso_kg, anos_escalando = excluded.anos_escalando, lesiones = excluded.lesiones,
      grado_actual = excluded.grado_actual, grado_objetivo = excluded.grado_objetivo,
      inicio_temporada = excluded.inicio_temporada, objetivo_temporada = excluded.objetivo_temporada`
}

export async function insertarEvaluacion(sql: Sql, e: FilaEvaluacion): Promise<void> {
  await sql`insert into evaluaciones (id, fecha, peso_corporal_kg, lastre_kg, resistencia_s, tecnica)
    values (${e.id}, ${e.fecha}, ${e.peso_corporal_kg}, ${e.lastre_kg}, ${e.resistencia_s}, ${e.tecnica})`
}

export async function borrarEvaluacionBd(sql: Sql, id: string): Promise<void> {
  await sql`delete from evaluaciones where id = ${id}`
}

export async function guardarChequeo(sql: Sql, c: FilaChequeo): Promise<void> {
  await sql`insert into chequeos (fecha, sueno, fatiga, ganas, molestias)
    values (${c.fecha}, ${c.sueno}, ${c.fatiga}, ${c.ganas}, ${JSON.stringify(c.molestias)}::jsonb)
    on conflict (fecha) do update set sueno = excluded.sueno, fatiga = excluded.fatiga, ganas = excluded.ganas, molestias = excluded.molestias`
}

const consultaSesion = (sql: Sql, f: FilaSesion) =>
  sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
    values (${f.id}, ${f.fecha}, ${JSON.stringify(f.sesion)}::jsonb, ${f.propuesta === null ? null : JSON.stringify(f.propuesta)}::jsonb, ${f.origen})`

export async function insertarSesion(sql: Sql, f: FilaSesion, consejos: FilaConsejo[]): Promise<void> {
  await sql.transaction([
    consultaSesion(sql, f),
    ...consejos.map((c) => sql`insert into consejos_mostrados (consejo_id, fecha) values (${c.consejo_id}, ${c.fecha})`),
  ])
}

export async function borrarSesionBd(sql: Sql, id: string): Promise<void> {
  await sql`delete from sesiones where id = ${id}`
}

export async function sustituirSesion(sql: Sql, idViejo: string, nueva: FilaSesion): Promise<void> {
  await sql.transaction([consultaSesion(sql, nueva), sql`delete from sesiones where id = ${idViejo}`])
}

export async function insertarRegistro(sql: Sql, r: FilaRegistro, intentos: FilaIntento[]): Promise<void> {
  await sql.transaction([
    sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb)`,
    ...intentos.map(
      (i) => sql`insert into intentos_limite (id, sesion_id, fecha, encadenado, motivo_caida) values (${i.id}, ${i.sesion_id}, ${i.fecha}, ${i.encadenado}, ${i.motivo_caida})`,
    ),
  ])
}

export async function insertarAlta(sql: Sql, a: Omit<FilaAlta, 'id'>): Promise<void> {
  await sql`insert into altas (zona, fecha) values (${a.zona}, ${a.fecha})`
}
```

- [ ] **Step 3: Layout de la app y salir**

`app/(app)/acciones.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NOMBRE_COOKIE } from '@/lib/servidor/acceso'

export async function salir(): Promise<void> {
  ;(await cookies()).delete(NOMBRE_COOKIE)
  redirect('/entrar')
}
```

`app/(app)/layout.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { salir } from './acciones'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pb-16">
      <nav className="flex flex-wrap items-center gap-4 border-b border-stone-200 py-3 text-sm">
        <Link href="/" className="font-semibold">Hoy</Link>
        <Link href="/entrenar">Entrenar</Link>
        <Link href="/evaluacion">Evaluación</Link>
        <Link href="/perfil">Perfil</Link>
        <form action={salir} className="ml-auto">
          <button className="text-stone-500">Salir</button>
        </form>
      </nav>
      <main className="pt-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Componentes comunes**

`components/PorQue.tsx`:

```tsx
import type { Explicacion } from '@/motor'

export function PorQue({ explicaciones, titulo = '¿Por qué?' }: { explicaciones: Explicacion[]; titulo?: string }) {
  if (explicaciones.length === 0) return null
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-sky-800">{titulo}</summary>
      <ul className="mt-2 space-y-2">
        {explicaciones.map((x, i) => (
          <li key={`${x.regla}-${i}`}>
            <p>{x.motivo}</p>
            {x.parametros.length > 0 && (
              <p className="text-xs text-stone-500">
                {x.parametros.join(', ')} · evidencia: {x.nivelMinimo}
                {x.origen === 'diseno' ? ' · incluye decisiones de diseño' : ''}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
```

`components/PlanSesion.tsx`:

```tsx
import type { Ejercicio, SesionPlan } from '@/motor'
import { NOMBRE_TIPO } from '@/lib/nombres'
import { PorQue } from './PorQue'

function detalle(ej: Ejercicio): string {
  const partes: string[] = []
  if (ej.series) partes.push(`${ej.series} series`)
  if (ej.repeticiones) partes.push(`${ej.repeticiones} rep.`)
  if (ej.trabajoS) partes.push(`${ej.trabajoS} s`)
  if (ej.descansoS) partes.push(`descanso ${ej.descansoS} s`)
  if (ej.descansoSeriesS) partes.push(`entre series ${Math.round((ej.descansoSeriesS / 60) * 10) / 10} min`)
  partes.push(ej.cargaTexto)
  return partes.join(' · ')
}

// Las explicaciones de la sesión ya incluyen la de cada bloque (motor: «porqué de la elección + una por bloque»).
export function PlanSesion({ plan }: { plan: SesionPlan }) {
  const s = plan.sesion
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">
        {NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min{s.intensidad === 'alta' ? ' · intensa' : ''}
      </h3>
      <PorQue explicaciones={plan.explicaciones} />
      <ol className="space-y-2">
        {plan.bloques.map((b, i) => (
          <li key={`${b.nombre}-${i}`} className="rounded border border-stone-100 p-3">
            <p className="font-medium">
              {b.nombre} <span className="text-stone-500">· {b.minutos} min</span>
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {b.ejercicios.map((ej, j) => (
                <li key={`${ej.nombre}-${j}`}>
                  <span className="font-medium">{ej.nombre}</span>: {detalle(ej)}
                  {ej.notas && <span className="block text-stone-500">{ej.notas}</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

`components/CamposMolestias.tsx`:

```tsx
import { ZONAS } from '@/motor'
import { NOMBRE_ZONA } from '@/lib/nombres'

// Campos dolor_<zona> y alarma_<zona> que lee molestias() de lib/formulario.ts.
export function CamposMolestias() {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">Molestias (0 = nada, 10 = máximo)</legend>
      {ZONAS.map((z) => (
        <div key={z} className="flex items-center gap-3 text-sm">
          <label htmlFor={`dolor_${z}`} className="w-40">{NOMBRE_ZONA[z]}</label>
          <select id={`dolor_${z}`} name={`dolor_${z}`} defaultValue="0" className="rounded border border-stone-300 px-2 py-1">
            {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" name={`alarma_${z}`} /> alarma
          </label>
        </div>
      ))}
      <p className="text-xs text-stone-500">Alarma: chasquido, hinchazón, pérdida de fuerza o de movilidad.</p>
    </fieldset>
  )
}
```

`components/AvisoMedico.tsx`:

```tsx
export function AvisoMedico() {
  return (
    <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
      Esta app no sustituye a un médico ni a un fisioterapeuta. Si un dolor no mejora, va a más o notas una señal de
      alarma (chasquido, hinchazón, pérdida de fuerza o de movilidad), para y consulta a un profesional.
    </p>
  )
}
```

- [ ] **Step 5: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde y build correcto.

- [ ] **Step 6: Commit**

```bash
git add lib/servidor app/(app)/layout.tsx app/(app)/acciones.ts components
git commit -m "feat(app): consultas a Postgres, layout de la app y componentes de sesión

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Perfil con aviso médico y Evaluación

**Files:**
- Create: `app/(app)/perfil/page.tsx`, `app/(app)/perfil/FormularioPerfil.tsx`, `app/(app)/perfil/acciones.ts`, `app/(app)/evaluacion/page.tsx`, `app/(app)/evaluacion/FormularioEvaluacion.tsx`, `app/(app)/evaluacion/acciones.ts`

**Interfaces:**
- Consumes: Task 7 (`bd`, `cargarDatos`, `requerirDatos`, `guardarPerfilBd`, `insertarEvaluacion`, `borrarEvaluacionBd`, `AvisoMedico`, estilos), Task 4 (`conEvaluacion`, `evaluacionMotor`, `validarDatos`), Task 3 (formulario, `ahoraMadrid`, `fechaLarga`).
- Produces: rutas `/perfil` y `/evaluacion`. Etiquetas de campo que usa la prueba e2e (Task 11), **exactas**: «Peso (kg)», «Años escalando», «Grado actual», «Grado objetivo», «Inicio de la temporada (lunes)», «Fecha objetivo», «He leído el aviso y lo acepto», botón «Guardar perfil».

- [ ] **Step 1: Acción del perfil**

`app/(app)/perfil/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { planificarTemporada } from '@/motor'
import type { PerfilNuevo } from '@/lib/datos/filas'
import type { EstadoAccion } from '@/lib/estado'
import { fecha, mensajeDe, numero, texto, textoOpcional } from '@/lib/formulario'
import { bd } from '@/lib/servidor/bd'
import { cargarDatos, guardarPerfilBd } from '@/lib/servidor/consultas'

export async function guardarPerfil(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const sql = await bd()
  const previo = await cargarDatos(sql)
  let fila: PerfilNuevo
  try {
    fila = {
      peso_kg: numero(fd, 'peso_kg', 'El peso', 30, 200),
      anos_escalando: numero(fd, 'anos_escalando', 'Los años escalando', 0, 80),
      lesiones: (textoOpcional(fd, 'lesiones') ?? '').split('\n').map((l) => l.trim()).filter((l) => l !== ''),
      grado_actual: texto(fd, 'grado_actual', 'El grado actual'),
      grado_objetivo: texto(fd, 'grado_objetivo', 'El grado objetivo'),
      inicio_temporada: fecha(fd, 'inicio_temporada', 'El inicio de la temporada'),
      objetivo_temporada: fecha(fd, 'objetivo_temporada', 'La fecha objetivo'),
    }
    if (fila.grado_actual.length > 10 || fila.grado_objetivo.length > 10) return { error: 'Los grados tienen como mucho 10 caracteres.' }
    if (!previo && fd.get('aviso') !== 'on') return { error: 'Para empezar tienes que leer y aceptar el aviso.' }
    planificarTemporada(fila.inicio_temporada, fila.objetivo_temporada) // lanza si las fechas no dan una temporada
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await guardarPerfilBd(sql, fila)
  } catch (e) {
    return { error: `No se ha podido guardar el perfil: ${mensajeDe(e)}` }
  }
  revalidatePath('/', 'layout')
  if (!previo) redirect('/evaluacion')
  return { ok: 'Perfil guardado.' }
}
```

- [ ] **Step 2: Formulario y página del perfil**

`app/(app)/perfil/FormularioPerfil.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { AvisoMedico } from '@/components/AvisoMedico'
import { BOTON, CAMPO } from '@/components/estilos'
import type { FilaPerfil } from '@/lib/datos/filas'
import type { EstadoAccion } from '@/lib/estado'
import { guardarPerfil } from './acciones'

export function FormularioPerfil({ perfil }: { perfil: FilaPerfil | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarPerfil, null)
  return (
    <form action={accion} className="space-y-4">
      <label className="block">Peso (kg)<input name="peso_kg" inputMode="decimal" required defaultValue={perfil?.peso_kg} className={CAMPO} /></label>
      <label className="block">Años escalando<input name="anos_escalando" inputMode="decimal" required defaultValue={perfil?.anos_escalando} className={CAMPO} /></label>
      <div className="flex gap-3">
        <label className="block flex-1">Grado actual<input name="grado_actual" required maxLength={10} defaultValue={perfil?.grado_actual ?? '6b'} className={CAMPO} /></label>
        <label className="block flex-1">Grado objetivo<input name="grado_objetivo" required maxLength={10} defaultValue={perfil?.grado_objetivo ?? '7a'} className={CAMPO} /></label>
      </div>
      <label className="block">Lesiones (una por línea)<textarea name="lesiones" rows={2} defaultValue={perfil?.lesiones.join('\n')} className={CAMPO} /></label>
      <label className="block">Inicio de la temporada (lunes)<input type="date" name="inicio_temporada" required defaultValue={perfil?.inicio_temporada ?? '2026-11-02'} className={CAMPO} /></label>
      <label className="block">Fecha objetivo<input type="date" name="objetivo_temporada" required defaultValue={perfil?.objetivo_temporada ?? '2027-10-04'} className={CAMPO} /></label>
      {perfil && <p className="text-xs text-stone-500">Cambiar las fechas replanifica toda la temporada.</p>}
      {!perfil && (
        <div className="space-y-2">
          <AvisoMedico />
          <label className="flex items-center gap-2"><input type="checkbox" name="aviso" required /> He leído el aviso y lo acepto</label>
        </div>
      )}
      <button className={BOTON} disabled={pendiente}>Guardar perfil</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
    </form>
  )
}
```

`app/(app)/perfil/page.tsx`:

```tsx
import { bd } from '@/lib/servidor/bd'
import { cargarDatos } from '@/lib/servidor/consultas'
import { FormularioPerfil } from './FormularioPerfil'

export default async function PaginaPerfil() {
  const datos = await cargarDatos(await bd())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Perfil</h1>
      {!datos && <p>Antes de empezar, cuéntale al entrenador quién eres y cuándo es tu objetivo.</p>}
      <FormularioPerfil perfil={datos?.perfil ?? null} />
    </div>
  )
}
```

- [ ] **Step 3: Acciones de evaluación**

`app/(app)/evaluacion/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { validarEvaluacion } from '@/motor'
import { conEvaluacion } from '@/lib/datos/cambios'
import type { FilaEvaluacion } from '@/lib/datos/filas'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { fecha, mensajeDe, numero, numeroOpcional, texto } from '@/lib/formulario'
import { borrarEvaluacionBd, insertarEvaluacion, requerirDatos } from '@/lib/servidor/consultas'

export async function guardarEvaluacion(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql, datos } = await requerirDatos()
  let fila: FilaEvaluacion
  try {
    fila = {
      id: crypto.randomUUID(),
      fecha: fecha(fd, 'fecha', 'La fecha'),
      peso_corporal_kg: numero(fd, 'peso_corporal_kg', 'El peso', 30, 200),
      lastre_kg: numero(fd, 'lastre_kg', 'El lastre', -100, 150),
      resistencia_s: numeroOpcional(fd, 'resistencia_s', 'La resistencia', 1, 3600),
      tecnica: numeroOpcional(fd, 'tecnica', 'La técnica', 1, 7),
    }
    if (fila.fecha > ahoraMadrid(new Date()).fecha) return { error: 'La fecha del test no puede ser futura.' }
    validarEvaluacion(evaluacionMotor(fila))
    validarDatos(conEvaluacion(datos, fila))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarEvaluacion(sql, fila)
  } catch (e) {
    return { error: `No se ha podido guardar la evaluación: ${mensajeDe(e)}` }
  }
  revalidatePath('/evaluacion')
  return { ok: 'Evaluación guardada.' }
}

export async function borrarEvaluacion(fd: FormData): Promise<void> {
  const { sql } = await requerirDatos()
  await borrarEvaluacionBd(sql, texto(fd, 'id', 'La evaluación'))
  revalidatePath('/evaluacion')
}
```

- [ ] **Step 4: Formulario y página de evaluación**

`app/(app)/evaluacion/FormularioEvaluacion.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarEvaluacion } from './acciones'

export function FormularioEvaluacion({ hoy, peso }: { hoy: string; peso: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEvaluacion, null)
  return (
    <form action={accion} className="space-y-4">
      <label className="block">Fecha del test<input type="date" name="fecha" max={hoy} defaultValue={hoy} required className={CAMPO} /></label>
      <label className="block">Peso ese día (kg)<input name="peso_corporal_kg" inputMode="decimal" defaultValue={peso} required className={CAMPO} /></label>
      <label className="block">
        Lastre del mejor intento de 10 s (kg)
        <input name="lastre_kg" inputMode="decimal" required className={CAMPO} />
        <span className="text-xs text-stone-500">Negativo si usaste descarga (polea o banda).</span>
      </label>
      <label className="block">Resistencia: segundos hasta el fallo en 7:3 al 60 % (opcional)<input name="resistencia_s" inputMode="decimal" className={CAMPO} /></label>
      <label className="block">Técnica: autoevaluación del vídeo de 1 a 7 (opcional)<input name="tecnica" inputMode="decimal" className={CAMPO} /></label>
      <button className={BOTON} disabled={pendiente}>Guardar evaluación</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
    </form>
  )
}
```

`app/(app)/evaluacion/page.tsx`:

```tsx
import { fuerzaRelativa } from '@/motor'
import { TARJETA } from '@/components/estilos'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { borrarEvaluacion } from './acciones'
import { FormularioEvaluacion } from './FormularioEvaluacion'

export default async function PaginaEvaluacion() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const lista = [...datos.evaluaciones].reverse()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Evaluación</h1>
      <section className={TARJETA}>
        <h2 className="font-medium">Nuevo resultado</h2>
        <FormularioEvaluacion hoy={hoy} peso={datos.perfil.peso_kg} />
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Historial</h2>
        {lista.length === 0 && <p className="text-sm text-stone-600">Todavía no hay tests. El entrenador te propondrá el primero.</p>}
        <ul className="space-y-2">
          {lista.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded border border-stone-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(e.fecha)}</p>
                <p>
                  Lastre {e.lastre_kg} kg con {e.peso_corporal_kg} kg · {fuerzaRelativa(evaluacionMotor(e)).toFixed(1)} % del peso
                  {e.resistencia_s !== null ? ` · resistencia ${e.resistencia_s} s` : ''}
                  {e.tecnica !== null ? ` · técnica ${e.tecnica}` : ''}
                </p>
              </div>
              <form action={borrarEvaluacion}>
                <input type="hidden" name="id" value={e.id} />
                <button className="text-red-700">Borrar</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde y build correcto.

Si hay `DATABASE_URL` (de una rama de pruebas, nunca la de producción) en `.env.local` y la migración aplicada: `npm run dev`, entrar, `/` lleva a `/perfil` (la página provisional de Hoy no lo hace aún: comprueba `/evaluacion`, que sí redirige), guardar el perfil lleva a `/evaluacion`, guardar y borrar un test funciona. Si no hay base de datos, indícalo en el informe.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/perfil" "app/(app)/evaluacion"
git commit -m "feat(app): perfil con aviso médico y evaluación

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Entrenar

**Files:**
- Create: `app/(app)/entrenar/page.tsx`, `app/(app)/entrenar/FormularioEntrenar.tsx`, `app/(app)/entrenar/ResultadoPropuesta.tsx`, `app/(app)/entrenar/acciones.ts`

**Interfaces:**
- Consumes: Task 5 (`prepararPropuesta`, `opcionElegida`, `EntradaPeticion`, `Preparacion`), Task 4 (`conChequeo`, `conSesion`, `filaSesionAceptada`, `historialMotor`, `perfilMotor`, `validarDatos`), Task 7 (`requerirDatos`, `guardarChequeo`, `insertarSesion`, componentes), Task 3.
- Produces: ruta `/entrenar`. Etiquetas que usa la prueba e2e, **exactas**: «Día», «Hora», «Con gente», «Solo», «Rocódromo», «Roca», «Casa», «Minutos disponibles», botones «Preparar sesión» y «Aceptar esta sesión».

- [ ] **Step 1: Acciones**

`app/(app)/entrenar/acciones.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { validarSesion, type Consejo } from '@/motor'
import { conChequeo, conSesion, filaSesionAceptada } from '@/lib/datos/cambios'
import type { FilaChequeo, FilaSesion } from '@/lib/datos/filas'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { opcionElegida, prepararPropuesta, type EntradaPeticion, type Preparacion } from '@/lib/datos/peticion'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { contexto, entero, fecha, hora, mensajeDe, molestias, texto } from '@/lib/formulario'
import { guardarChequeo, insertarSesion, requerirDatos } from '@/lib/servidor/consultas'

export type EstadoProponer = { error: string; detalle?: string } | { entrada: EntradaPeticion; prep: Preparacion } | null

export async function proponer(_previo: EstadoProponer, fd: FormData): Promise<EstadoProponer> {
  const hoy = ahoraMadrid(new Date()).fecha
  let entrada: EntradaPeticion
  let chequeo: FilaChequeo | null = null
  try {
    entrada = { fecha: fecha(fd, 'fecha', 'El día'), horaInicio: hora(fd, 'hora', 'La hora'), contexto: contexto(fd) }
    if (entrada.fecha < hoy) return { error: 'Solo puedes pedir sesiones para hoy o para días futuros.' }
    if (entrada.fecha === hoy) {
      chequeo = {
        fecha: hoy,
        sueno: entero(fd, 'sueno', 'El sueño', 1, 5),
        fatiga: entero(fd, 'fatiga', 'La fatiga', 1, 5),
        ganas: entero(fd, 'ganas', 'Las ganas', 1, 5),
        molestias: molestias(fd),
      }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  const { sql, datos } = await requerirDatos()
  let prep: Preparacion
  try {
    // El chequeo se valida con el resto de datos (dentro de prepararPropuesta) antes de guardarlo.
    prep = prepararPropuesta(chequeo ? conChequeo(datos, chequeo) : datos, entrada)
  } catch (e) {
    return { error: 'No se ha podido preparar la sesión.', detalle: mensajeDe(e) }
  }
  if (chequeo) {
    try {
      await guardarChequeo(sql, chequeo)
    } catch (e) {
      return { error: `No se ha podido guardar el chequeo: ${mensajeDe(e)}` }
    }
  }
  return { entrada, prep }
}

// Vuelve a ejecutar el motor con los datos actuales (no se fía de lo que manda el navegador) y guarda la opción
// elegida si sigue siendo la misma y es válida.
export async function aceptar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  let entrada: EntradaPeticion
  let indice: number
  let tipo: string
  try {
    entrada = JSON.parse(texto(fd, 'entrada', 'La petición')) as EntradaPeticion
    indice = entero(fd, 'indice', 'La opción', 0, 10)
    tipo = texto(fd, 'tipo', 'El tipo de sesión')
  } catch {
    return { error: 'Petición no válida: vuelve a preparar la sesión.' }
  }
  if (typeof entrada?.fecha !== 'string' || entrada.fecha < ahoraMadrid(new Date()).fecha) {
    return { error: 'Solo puedes aceptar sesiones para hoy o para días futuros.' }
  }
  const { sql, datos } = await requerirDatos()
  let fila: FilaSesion
  let consejos: Consejo[]
  try {
    const prep = prepararPropuesta(datos, entrada)
    if (prep.tipo !== 'propuesta') return { error: prep.mensaje }
    const plan = opcionElegida(prep.propuesta, indice)
    if (!plan || plan.sesion.tipo !== tipo) return { error: 'La propuesta ha cambiado desde que la pediste: vuelve a prepararla.' }
    fila = filaSesionAceptada(plan, crypto.randomUUID())
    const violaciones = validarSesion(fila.sesion, historialMotor(datos.sesiones), perfilMotor(datos.perfil))
    if (violaciones.length > 0) return { error: `La sesión ya no es válida: ${violaciones.map((v) => v.mensaje).join(' ')}` }
    validarDatos(conSesion(datos, fila))
    consejos = prep.consejos
  } catch (e) {
    return { error: `No se ha podido aceptar la sesión: ${mensajeDe(e)}` }
  }
  try {
    await insertarSesion(sql, fila, consejos.map((c) => ({ consejo_id: c.id, fecha: entrada.fecha })))
  } catch (e) {
    return { error: `No se ha podido guardar la sesión: ${mensajeDe(e)}` }
  }
  redirect('/')
}
```

- [ ] **Step 2: Resultado de la propuesta**

`app/(app)/entrenar/ResultadoPropuesta.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { ZONAS, type SesionPlan } from '@/motor'
import { AvisoMedico } from '@/components/AvisoMedico'
import { BOTON, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import { PorQue } from '@/components/PorQue'
import type { EntradaPeticion, Preparacion } from '@/lib/datos/peticion'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { aceptar } from './acciones'

function Opcion({ plan, indice, titulo, entrada }: { plan: SesionPlan; indice: number; titulo: string; entrada: EntradaPeticion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(aceptar, null)
  return (
    <section className={TARJETA}>
      <p className="text-xs uppercase tracking-wide text-stone-500">{titulo}</p>
      <PlanSesion plan={plan} />
      <form action={accion}>
        <input type="hidden" name="entrada" value={JSON.stringify(entrada)} />
        <input type="hidden" name="indice" value={indice} />
        <input type="hidden" name="tipo" value={plan.sesion.tipo} />
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Aceptar esta sesión'}</button>
      </form>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </section>
  )
}

export function ResultadoPropuesta({ entrada, prep }: { entrada: EntradaPeticion; prep: Preparacion }) {
  if (prep.tipo === 'fuera-temporada') return <p className="rounded bg-amber-50 p-3">{prep.mensaje}</p>
  const { propuesta, consejos, fase } = prep
  const estado = propuesta.estado
  const noVerdes = estado ? ZONAS.filter((z) => estado.zonas[z] !== 'verde') : []
  const opciones = [
    ...(propuesta.principal ? [{ plan: propuesta.principal, indice: 0, titulo: 'Propuesta' }] : []),
    ...propuesta.alternativas.map((plan, i) => ({ plan, indice: i + 1, titulo: `Alternativa ${i + 1}` })),
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {fechaLarga(entrada.fecha)} · fase {fase.nombre}{fase.descarga ? ' · semana de descarga' : ''}
      </p>
      {noVerdes.length > 0 && (
        <section className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <ul>
            {noVerdes.map((z) => <li key={z}>{NOMBRE_ZONA[z]}: {estado!.zonas[z] === 'rojo' ? 'rojo' : 'ámbar'}</li>)}
          </ul>
          {noVerdes.some((z) => estado!.zonas[z] === 'rojo') && <AvisoMedico />}
        </section>
      )}
      {estado && <PorQue titulo="Cómo te ve el entrenador hoy" explicaciones={estado.explicaciones} />}
      {propuesta.descanso && (
        <section className={TARJETA}>
          <h2 className="font-semibold">Toca descansar</h2>
          <p className="text-sm">{propuesta.descanso.motivo}</p>
          {propuesta.proximaVentanaIntensa && (
            <p className="text-sm">Próximo día con sesión intensa de dedos posible: {fechaLarga(propuesta.proximaVentanaIntensa.fecha)}.</p>
          )}
          <PorQue explicaciones={[propuesta.descanso]} />
        </section>
      )}
      {opciones.length === 0 && !propuesta.descanso && (
        <p role="alert" className="rounded bg-red-50 p-3">El entrenador no encuentra ninguna sesión posible con este contexto.</p>
      )}
      {opciones.map((o) => <Opcion key={o.indice} {...o} entrada={entrada} />)}
      {consejos.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Consejos</h2>
          <ul className="space-y-2">
            {consejos.map((c) => (
              <li key={c.id} className="rounded border border-stone-200 bg-white p-3 text-sm">
                <p>{c.texto}</p>
                <PorQue explicaciones={[c.explicacion]} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Formulario y página**

`app/(app)/entrenar/FormularioEntrenar.tsx`:

```tsx
'use client'

import { useActionState, useState } from 'react'
import { CamposMolestias } from '@/components/CamposMolestias'
import { BOTON, CAMPO } from '@/components/estilos'
import { proponer, type EstadoProponer } from './acciones'
import { ResultadoPropuesta } from './ResultadoPropuesta'

const ESCALAS = [
  { nombre: 'sueno', etiqueta: 'Sueño', bajo: 'muy mal', alto: 'muy bien' },
  { nombre: 'fatiga', etiqueta: 'Fatiga', bajo: 'muy cansado', alto: 'nada cansado' },
  { nombre: 'ganas', etiqueta: 'Ganas', bajo: 'ninguna', alto: 'muchas' },
] as const

function Radio({ nombre, valor, texto, marcado = false }: { nombre: string; valor: string; texto: string; marcado?: boolean }) {
  return (
    <label className="mr-4 inline-flex items-center gap-1">
      <input type="radio" name={nombre} value={valor} defaultChecked={marcado} required /> {texto}
    </label>
  )
}

export function FormularioEntrenar({ hoy, hora }: { hoy: string; hora: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoProponer, FormData>(proponer, null)
  const [dia, setDia] = useState(hoy)
  return (
    <div className="space-y-6">
      <form action={accion} className="space-y-4">
        <div className="flex gap-3">
          <label className="block flex-1">Día<input type="date" name="fecha" min={hoy} value={dia} onChange={(e) => setDia(e.target.value)} required className={CAMPO} /></label>
          <label className="block w-32">Hora<input type="time" name="hora" defaultValue={hora} required className={CAMPO} /></label>
        </div>
        <fieldset>
          <legend className="font-medium">¿Con quién?</legend>
          <Radio nombre="compania" valor="con-gente" texto="Con gente" marcado />
          <Radio nombre="compania" valor="solo" texto="Solo" />
        </fieldset>
        <fieldset>
          <legend className="font-medium">¿Dónde?</legend>
          <Radio nombre="lugar" valor="rocodromo" texto="Rocódromo" marcado />
          <Radio nombre="lugar" valor="roca" texto="Roca" />
          <Radio nombre="lugar" valor="casa" texto="Casa" />
        </fieldset>
        <label className="block">Minutos disponibles<input type="number" name="minutos" min={10} max={600} step={5} defaultValue={90} required className={CAMPO} /></label>
        {dia === hoy && (
          <fieldset className="space-y-3">
            <legend className="font-medium">¿Cómo llegas hoy?</legend>
            {ESCALAS.map((e) => (
              <label key={e.nombre} className="block">
                {e.etiqueta} <span className="text-xs text-stone-500">(1 = {e.bajo}, 5 = {e.alto})</span>
                <select name={e.nombre} defaultValue="3" className={CAMPO}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
            <CamposMolestias />
          </fieldset>
        )}
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Preparando…' : 'Preparar sesión'}</button>
      </form>
      {estado && 'error' in estado && (
        <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm">
          <p>{estado.error}</p>
          {estado.detalle && (
            <details>
              <summary className="cursor-pointer">Detalle</summary>
              <p className="mt-1 whitespace-pre-wrap">{estado.detalle}</p>
            </details>
          )}
        </div>
      )}
      {estado && 'prep' in estado && <ResultadoPropuesta entrada={estado.entrada} prep={estado.prep} />}
    </div>
  )
}
```

`app/(app)/entrenar/page.tsx`:

```tsx
import { ahoraMadrid } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { FormularioEntrenar } from './FormularioEntrenar'

export default async function PaginaEntrenar() {
  await requerirDatos() // sin perfil, al perfil
  const ahora = ahoraMadrid(new Date())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Entrenar</h1>
      <FormularioEntrenar hoy={ahora.fecha} hora={ahora.hhmm} />
    </div>
  )
}
```

- [ ] **Step 4: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde y build correcto.

Con base de datos de pruebas: preparar una sesión para el primer martes de la temporada muestra propuesta y alternativas con su «¿Por qué?»; aceptar lleva a `/`. Sin base de datos, indícalo en el informe.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/entrenar"
git commit -m "feat(app): Entrenar: contexto, chequeo, propuesta del motor y aceptar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Hoy

**Files:**
- Modify: `app/(app)/page.tsx` (sustituye la provisional)
- Create: `app/(app)/_hoy/acciones.ts`, `app/(app)/_hoy/TarjetaSesion.tsx`, `app/(app)/_hoy/BotonAlta.tsx`

**Interfaces:**
- Consumes: Task 5 (`vistaHoy`, `Tarjeta`), Task 4 (`conRegistro`, `conSesion`, `sinSesion`, `filaSesionLibre`, `historialMotor`, `perfilMotor`, `validarDatos`), Task 7 (`requerirDatos`, `insertarRegistro`, `borrarSesionBd`, `sustituirSesion`, `insertarAlta`, componentes), Task 3.
- Produces: ruta `/`. Etiquetas que usa la prueba e2e, **exactas**: «Esfuerzo (RPE 0-10)», «Minutos reales», botón «Registrar», texto «Hecha · RPE <n>».

- [ ] **Step 1: Acciones**

`app/(app)/_hoy/acciones.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { TIPOS_SESION, validarSesion, ZONAS, type TipoSesion } from '@/motor'
import { conRegistro, conSesion, filaSesionLibre, sinSesion } from '@/lib/datos/cambios'
import type { FilaIntento, FilaRegistro, FilaSesion } from '@/lib/datos/filas'
import { historialMotor, perfilMotor } from '@/lib/datos/mapeo'
import { validarDatos } from '@/lib/datos/validar'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid } from '@/lib/fecha'
import { entero, hora, intentos, mensajeDe, molestias, opcion, texto } from '@/lib/formulario'
import { TIPOS_CON_INTENTOS } from '@/lib/nombres'
import { borrarSesionBd, insertarAlta, insertarRegistro, requerirDatos, sustituirSesion } from '@/lib/servidor/consultas'

const TIPOS_LIBRES = TIPOS_SESION.filter((t): t is Exclude<TipoSesion, 'descanso'> => t !== 'descanso')

export async function registrar(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let registro: FilaRegistro
  let filasIntentos: FilaIntento[]
  try {
    const sesionId = texto(fd, 'sesion_id', 'La sesión')
    const fila = datos.sesiones.find((s) => s.id === sesionId)
    if (!fila) return { error: 'Esa sesión ya no existe.' }
    if (fila.fecha > hoy) return { error: 'No puedes registrar una sesión de un día futuro.' }
    registro = {
      sesion_id: sesionId,
      rpe: entero(fd, 'rpe', 'El esfuerzo', 0, 10),
      duracion_min: entero(fd, 'minutos', 'Los minutos', 1, 1440),
      molestias: molestias(fd),
      registrado_en: new Date().toISOString(),
    }
    filasIntentos = TIPOS_CON_INTENTOS.includes(fila.sesion.tipo)
      ? intentos(fd).map((i) => ({
          id: crypto.randomUUID(), sesion_id: sesionId, fecha: fila.fecha, encadenado: i.encadenado, motivo_caida: i.motivoCaida ?? null,
        }))
      : []
    validarDatos(conRegistro(datos, registro, filasIntentos))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await insertarRegistro(sql, registro, filasIntentos)
  } catch (e) {
    return { error: `No se ha podido guardar el registro: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Sesión registrada.' }
}

export async function noLaHice(fd: FormData): Promise<void> {
  const { sql } = await requerirDatos()
  await borrarSesionBd(sql, texto(fd, 'sesion_id', 'La sesión'))
  revalidatePath('/')
}

// Sustituye la sesión por lo que se hizo de verdad. Las reglas de seguridad solo avisan (lo hecho, hecho está): si
// hay avisos, se muestran y hace falta confirmarlos para guardar.
export async function otraCosa(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let libre: FilaSesion
  let idViejo: string
  try {
    idViejo = texto(fd, 'sesion_id', 'La sesión')
    const vieja = datos.sesiones.find((s) => s.id === idViejo)
    if (!vieja) return { error: 'Esa sesión ya no existe.' }
    if (vieja.fecha > hoy) return { error: 'Solo puedes cambiar sesiones de hoy o de días pasados.' }
    libre = filaSesionLibre({
      id: crypto.randomUUID(),
      tipo: opcion(fd, 'tipo', 'Lo que hiciste', TIPOS_LIBRES),
      intensidad: opcion(fd, 'intensidad', 'La intensidad', ['alta', 'suave']),
      fecha: vieja.fecha,
      horaInicio: hora(fd, 'hora', 'La hora'),
      duracionMin: entero(fd, 'minutos', 'Los minutos', 1, 1440),
    })
    const sinVieja = sinSesion(datos, idViejo)
    validarDatos(conSesion(sinVieja, libre))
    const avisos = validarSesion(libre.sesion, historialMotor(sinVieja.sesiones), perfilMotor(datos.perfil)).map((v) => v.mensaje)
    if (avisos.length > 0 && fd.get('confirmar') !== 'on') {
      return { error: 'El entrenador no habría propuesto esto. Revisa los avisos y confirma si lo hiciste así.', avisos }
    }
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await sustituirSesion(sql, idViejo, libre)
  } catch (e) {
    return { error: `No se ha podido guardar: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Guardado. Ahora registra cómo fue.' }
}

export async function alta(fd: FormData): Promise<void> {
  const { sql } = await requerirDatos()
  const zona = opcion(fd, 'zona', 'La zona', ZONAS)
  await insertarAlta(sql, { zona, fecha: ahoraMadrid(new Date()).fecha })
  revalidatePath('/')
}
```

- [ ] **Step 2: Tarjeta de sesión y botón de alta**

`app/(app)/_hoy/TarjetaSesion.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { TIPOS_SESION, type Sesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { BOTON, CAMPO, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import type { Tarjeta } from '@/lib/datos/hoy'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MAX_INTENTOS } from '@/lib/formulario'
import { ETIQUETA_RPE, MOTIVOS_CAIDA, NOMBRE_MOTIVO, NOMBRE_TIPO, NOMBRE_ZONA, TIPOS_CON_INTENTOS } from '@/lib/nombres'
import { noLaHice, otraCosa, registrar } from './acciones'

const hhmm = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

function FormularioRegistro({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(registrar, null)
  return (
    <form action={accion} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        Esfuerzo (RPE 0-10)
        <select name="rpe" defaultValue="" required className={CAMPO}>
          <option value="" disabled>Elige</option>
          {ETIQUETA_RPE.map((t, n) => <option key={n} value={n}>{n} · {t}</option>)}
        </select>
      </label>
      <label className="block">Minutos reales<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
      <CamposMolestias />
      {TIPOS_CON_INTENTOS.includes(sesion.tipo) && (
        <fieldset className="space-y-2">
          <legend className="font-medium">Intentos al límite</legend>
          {Array.from({ length: MAX_INTENTOS }, (_, i) => (
            <label key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20">Intento {i + 1}</span>
              <select name={`intento_${i}`} defaultValue="" className="flex-1 rounded border border-stone-300 px-2 py-1">
                <option value="">—</option>
                <option value="encadenado">Encadenado</option>
                {MOTIVOS_CAIDA.map((m) => <option key={m} value={m}>{NOMBRE_MOTIVO[m]}</option>)}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Registrar'}</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

function FormularioOtraCosa({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraCosa, null)
  return (
    <form action={accion} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        ¿Qué hiciste?
        <select name="tipo" defaultValue={sesion.tipo} className={CAMPO}>
          {TIPOS_SESION.filter((t) => t !== 'descanso').map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
        </select>
      </label>
      <label className="block">
        Intensidad
        <select name="intensidad" defaultValue={sesion.intensidad} className={CAMPO}>
          <option value="alta">Alta</option>
          <option value="suave">Suave</option>
        </select>
      </label>
      <div className="flex gap-3">
        <label className="block flex-1">Hora de inicio<input type="time" name="hora" defaultValue={hhmm(sesion.horaInicio)} required className={CAMPO} /></label>
        <label className="block flex-1">Minutos<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
      </div>
      {estado?.avisos && (
        <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <ul className="list-disc pl-5">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" /> Lo hice así de todos modos</label>
        </div>
      )}
      <button className={BOTON} disabled={pendiente}>Guardar lo que hice</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

export function TarjetaSesion({ tarjeta, hoy }: { tarjeta: Tarjeta; hoy: string }) {
  const { fila, registro } = tarjeta
  const s = fila.sesion
  const pasada = fila.fecha <= hoy
  const [cambiando, setCambiando] = useState(false)
  return (
    <article className={TARJETA}>
      {fila.fecha !== hoy && <p className="text-sm text-stone-500">{fechaLarga(fila.fecha)}</p>}
      {fila.propuesta ? (
        <PlanSesion plan={fila.propuesta} />
      ) : (
        <h3 className="font-semibold">{NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min (lo que hiciste)</h3>
      )}
      {s.tipo === 'evaluacion-dedos' && (
        <p className="text-sm">Al terminar el test, apunta el resultado en <Link href="/evaluacion" className="underline">Evaluación</Link>.</p>
      )}
      {registro ? (
        <p className="text-sm text-emerald-700">
          Hecha · RPE {registro.rpe} · {registro.duracion_min} min
          {registro.molestias.length > 0 ? ` · molestias: ${registro.molestias.map((m) => `${NOMBRE_ZONA[m.zona]} ${m.dolor}`).join(', ')}` : ''}
        </p>
      ) : (
        <>
          {pasada && !cambiando && <FormularioRegistro sesion={s} />}
          <div className="flex gap-4 text-sm">
            <form action={noLaHice} onSubmit={(e) => { if (!confirm('¿Borrar esta sesión?')) e.preventDefault() }}>
              <input type="hidden" name="sesion_id" value={s.id} />
              <button className="text-red-700">No la hice</button>
            </form>
            {pasada && (
              <button type="button" onClick={() => setCambiando(!cambiando)} className="underline">
                {cambiando ? 'Cancelar' : 'Hice otra cosa'}
              </button>
            )}
          </div>
          {cambiando && <FormularioOtraCosa sesion={s} />}
        </>
      )}
    </article>
  )
}
```

`app/(app)/_hoy/BotonAlta.tsx`:

```tsx
'use client'

import type { Zona } from '@/motor'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { alta } from './acciones'

export function BotonAlta({ zona }: { zona: Zona }) {
  return (
    <form
      action={alta}
      onSubmit={(e) => {
        if (!confirm(`¿Confirmas que el fisioterapeuta te ha dado el alta de ${NOMBRE_ZONA[zona].toLowerCase()}?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="zona" value={zona} />
      <button className="rounded border border-red-300 bg-white px-3 py-1 text-sm">Me ha dado el alta el fisio ({NOMBRE_ZONA[zona]})</button>
    </form>
  )
}
```

- [ ] **Step 3: Página Hoy**

`app/(app)/page.tsx`:

```tsx
import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { vistaHoy } from '@/lib/datos/hoy'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonAlta } from './_hoy/BotonAlta'
import { TarjetaSesion } from './_hoy/TarjetaSesion'

export default async function PaginaHoy() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const v = vistaHoy(datos, hoy)
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Hoy, {fechaLarga(hoy)}</h1>
      {v.zonasRojo.length > 0 && (
        <section className="space-y-2 rounded border border-red-300 bg-red-50 p-3">
          <p className="font-medium">En rojo: {v.zonasRojo.map((z) => NOMBRE_ZONA[z]).join(', ')}. No cargues esas zonas.</p>
          <AvisoMedico />
          {v.zonasRojo.map((z) => <BotonAlta key={z} zona={z} />)}
        </section>
      )}
      {v.zonasAmbar.length > 0 && (
        <p className="rounded bg-amber-50 p-3 text-sm">En ámbar: {v.zonasAmbar.map((z) => NOMBRE_ZONA[z]).join(', ')}. No subas la carga de esas zonas.</p>
      )}
      {v.pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Sin registrar</h2>
          <p className="text-sm text-stone-600">Las sesiones sin registro no cuentan para progresar: apunta cómo fueron.</p>
          {v.pendientes.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)}
        </section>
      )}
      {v.hoy.length === 0 ? (
        <p>No tienes ninguna sesión para hoy. <Link href="/entrenar" className="underline">Prepara una</Link>.</p>
      ) : (
        v.hoy.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)
      )}
      {v.proximas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Próximas</h2>
          {v.proximas.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)}
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Comprobar**

Run: `npm test && npm run tsc && npm run build`
Expected: verde y build correcto.

Con base de datos de pruebas: tras aceptar en Entrenar, Hoy muestra la sesión; registrar enseña «Hecha · RPE …»; «Hice otra cosa» con un bloque al límite al día siguiente de un día de dedos intenso pide confirmación con avisos; «No la hice» borra; un chequeo con hombro 6 muestra el rojo y el botón de alta, y el alta lo quita. Sin base de datos, indícalo en el informe.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/page.tsx" "app/(app)/_hoy"
git commit -m "feat(app): Hoy: sesiones del día, registro, no la hice, hice otra cosa y alta del fisio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Prueba de extremo a extremo y guía de despliegue

**Files:**
- Create: `playwright.config.ts`, `e2e/flujo.spec.ts`, `docs/despliegue.md`

**Interfaces:**
- Consumes: `sqlPruebas`, `vaciar` (Task 2), `ahoraMadrid`, `sumarDias` (Task 3), etiquetas exactas de las Tasks 8, 9 y 10.

- [ ] **Step 1: Configuración de Playwright**

`playwright.config.ts`:

```ts
import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const base = process.env.E2E_DATABASE_URL
const clave = process.env.E2E_CLAVE_ACCESO
if (!base || !clave) throw new Error('Faltan E2E_DATABASE_URL y E2E_CLAVE_ACCESO (ver docs/despliegue.md)')

const PUERTO = 3100

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PUERTO}`, locale: 'es-ES', timezoneId: 'Europe/Madrid' },
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/entrar`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Las variables del proceso mandan sobre .env.local en Next.js: el servidor de pruebas usa la base de pruebas.
    env: { DATABASE_URL: base, CLAVE_ACCESO: clave, SECRETO_SESION: 'secreto-de-pruebas-e2e-de-al-menos-32-caracteres' },
  },
})
```

- [ ] **Step 2: Prueba del flujo**

`e2e/flujo.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { ahoraMadrid, sumarDias } from '../lib/fecha.ts'
import { sqlPruebas, vaciar } from '../scripts/base-pruebas.ts'

test.beforeAll(async () => {
  await vaciar(await sqlPruebas())
})

// Lunes de esta semana en Madrid, para que hoy caiga dentro de la temporada.
function lunesDeEstaSemana(): string {
  const hoy = ahoraMadrid(new Date()).fecha
  const diaSemana = (new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(hoy, -diaSemana)
}

test('primera vez: perfil, entrenar, aceptar y registrar', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByLabel('Contraseña').fill('mala')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Contraseña incorrecta.')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Sin perfil, Hoy manda al perfil.
  await expect(page).toHaveURL(/\/perfil$/)
  const inicio = lunesDeEstaSemana()
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByLabel('Años escalando').fill('1.5')
  await page.getByLabel('Inicio de la temporada (lunes)').fill(inicio)
  await page.getByLabel('Fecha objetivo').fill(sumarDias(inicio, 48 * 7))
  await page.getByLabel('He leído el aviso y lo acepto').check()
  await page.getByRole('button', { name: 'Guardar perfil' }).click()
  await expect(page).toHaveURL(/\/evaluacion$/)

  await page.goto('/entrenar')
  await page.getByLabel('Hora').fill('10:00')
  await page.getByLabel('Con gente').check()
  await page.getByLabel('Rocódromo').check()
  await page.getByLabel('Minutos disponibles').fill('120')
  await page.getByRole('button', { name: 'Preparar sesión' }).click()
  const aceptar = page.getByRole('button', { name: 'Aceptar esta sesión' }).first()
  await expect(aceptar).toBeVisible()
  await aceptar.click()

  await expect(page).toHaveURL(/\/$/)
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('7')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText(/Hecha · RPE 7/)).toBeVisible()
})
```

- [ ] **Step 3: Guía de despliegue**

`docs/despliegue.md`:

```markdown
# Despliegue de Karstika Entreno

Pasos que hace Diego a mano (una vez). La base de datos es Postgres de Neon; Supabase no se usa.

## 1. Base de datos (Neon)

1. Crea el proyecto en Vercel (paso 3) y, en su pestaña **Storage**, añade **Neon** (plan gratuito, región
   Frankfurt). Vercel crea `DATABASE_URL` en las variables del proyecto. También vale crear el proyecto directamente
   en neon.tech y copiar la cadena de conexión.
2. En la consola de Neon, crea una **rama** llamada `pruebas` a partir de `main`. Su cadena de conexión es
   `E2E_DATABASE_URL`. Las pruebas vacían esa rama; nunca uses la de `main` para pruebas.

## 2. `.env.local` (en tu ordenador, nunca en git)

    DATABASE_URL=postgresql://…(rama main)…
    E2E_DATABASE_URL=postgresql://…(rama pruebas)…
    CLAVE_ACCESO=<tu contraseña de la app>
    E2E_CLAVE_ACCESO=<otra contraseña, solo para pruebas>
    SECRETO_SESION=<40 caracteres aleatorios>

Para generar el secreto: `node -e "console.log(crypto.randomBytes(30).toString('base64url'))"`.

Después:

    npm run migrar           # aplica el esquema en main
    npm run migrar:pruebas   # aplica el esquema en pruebas y la marca como base de pruebas
    npm run probar-bd        # comprueba las restricciones en pruebas
    npx playwright install chromium
    npm run e2e              # flujo completo contra pruebas

## 3. Vercel

1. El repo necesita estar en GitHub para conectarlo a Vercel (o se despliega con `npx vercel` desde el ordenador).
2. Nuevo proyecto en Vercel con este repo. Variables de entorno (Production): `CLAVE_ACCESO` y `SECRETO_SESION` (las
   mismas que en `.env.local` o nuevas); `DATABASE_URL` la pone Neon.
3. Antes de cada despliegue que traiga una migración nueva: `npm run migrar` con la `DATABASE_URL` de producción.
```

- [ ] **Step 4: Ejecutar (si hay base de pruebas)**

Si `.env.local` tiene `E2E_DATABASE_URL` y `E2E_CLAVE_ACCESO`:

Run: `npm run migrar:pruebas && npx playwright install chromium && npm run e2e`
Expected: 1 passed.

Si no, no inventes una base: indica en el informe «e2e pendiente: falta la base de pruebas».

- [ ] **Step 5: Comprobar y commit**

Run: `npm test && npm run tsc && npm run build`
Expected: verde.

```bash
git add playwright.config.ts e2e docs/despliegue.md
git commit -m "test(app): flujo de extremo a extremo con Playwright y guía de despliegue

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
