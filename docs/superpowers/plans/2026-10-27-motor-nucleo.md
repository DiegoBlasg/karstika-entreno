# Motor, tramo 2a: núcleo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir `motor/`: registro de parámetros trazable a la evidencia, explicación automática, restricciones de contexto y validación de seguridad de una sesión propuesta frente al historial.

**Architecture:** TypeScript puro y determinista. Los metadatos de los 62 parámetros se generan desde `docs/evidencia/parametros.md` (con test de deriva). Los valores usados por el tramo viven en `motor/parametros.ts`. Cada decisión devuelve una `Explicacion` derivada de los parámetros que usa. La seguridad se evalúa contra el historial con fechas reales.

**Tech Stack:** TypeScript 5 (strict, `noUncheckedIndexedAccess`), vitest, Node 24 (type stripping para el script generador).

Spec: `docs/superpowers/specs/2026-10-27-motor-nucleo-design.md` (léelo; define reglas, tipos y casos).

## Global Constraints

- `motor/` no importa React, Supabase ni nada de `node:*`: el acceso a ficheros vive solo en `scripts/` y en los tests. No usa `Date.now()`, `Math.random()` ni `new Date()` sin argumentos (lo vigila `motor/pureza.test.ts`).
- Mensajes, motivos y comentarios en español. Identificadores sin tildes ni eñes.
- Imports internos de `motor/` sin extensión, salvo el script `scripts/generar-metadatos.ts`, que importa `../motor/generador.ts` con extensión (lo ejecuta Node directamente).
- No escribas ficheros con expresiones regulares o barras invertidas mediante heredocs de bash (el shell las colapsa): usa las herramientas Write/Edit.
- Las entradas nunca se mutan. Mismas entradas, misma salida.
- Cada commit termina con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Ejecuta siempre `npx tsc --noEmit` y `npx vitest run` antes de commitear.

## File Structure

```
motor/niveles.ts           NivelMinimo, MetadatoParametro, nivelMasBajo
motor/generador.ts         parsearParametros(md), generarFuente(params)
motor/metadatos.ts         GENERADO (PARAMETRO_IDS, ParametroId, METADATOS)
motor/parametros.ts        VALORES usados por el tramo
motor/explicacion.ts       Explicacion, explicar(), explicarContexto()
motor/tipos.ts             tipos del dominio
motor/tiempo.ts            fechas, horas absolutas, validarEntrada()
motor/contexto.ts          tiposPosibles(), validarContexto()
motor/seguridad.ts         validarSesion(), esIntensaDedos()
motor/_fabrica.ts          ayudas de prueba (perfiles y sesiones)
motor/index.ts             API pública
motor/*.test.ts            pruebas
scripts/generar-metadatos.ts
```

---

### Task 1: Metadatos de parámetros (generador y test de deriva)

**Files:**
- Create: `motor/niveles.ts`, `motor/niveles.test.ts`, `motor/generador.ts`, `motor/generador.test.ts`, `motor/metadatos.test.ts`, `scripts/generar-metadatos.ts`
- Generate: `motor/metadatos.ts`
- Modify: `tsconfig.json` (añadir `"allowImportingTsExtensions": true`), `package.json` (script `metadatos`)

**Interfaces:**
- Produces (`motor/niveles.ts`):
  ```ts
  export type NivelMinimo = 'sinEvidencia' | 'C' | 'B' | 'A'
  export const ORDEN_NIVEL: readonly NivelMinimo[]
  export interface MetadatoParametro<Id extends string = string> {
    id: Id; titulo: string; origen: 'evidencia' | 'diseno'; evidencia: string[]; nivelMinimo: NivelMinimo
  }
  export function nivelMasBajo(niveles: readonly NivelMinimo[]): NivelMinimo   // lanza si está vacío
  ```
- Produces (`motor/generador.ts`):
  ```ts
  export function parsearParametros(md: string): MetadatoParametro[]
  export function generarFuente(params: MetadatoParametro[]): string
  ```
- Produces (`motor/metadatos.ts`, generado): `PARAMETRO_IDS` (tupla `as const` con 'P-01'…'P-62'), `type ParametroId`, `METADATOS: Record<ParametroId, MetadatoParametro<ParametroId>>`.

- [ ] **Step 1: Escribir `motor/niveles.test.ts` (falla: no existe el módulo)**

```ts
import { describe, expect, it } from 'vitest'
import { nivelMasBajo, ORDEN_NIVEL } from './niveles'

describe('nivelMasBajo', () => {
  it('devuelve el peor nivel', () => {
    expect(nivelMasBajo(['A', 'C', 'B'])).toBe('C')
    expect(nivelMasBajo(['A', 'sinEvidencia', 'B'])).toBe('sinEvidencia')
    expect(nivelMasBajo(['B'])).toBe('B')
  })
  it('lanza con lista vacía', () => {
    expect(() => nivelMasBajo([])).toThrow()
  })
  it('el orden va de menos a más evidencia', () => {
    expect(ORDEN_NIVEL).toEqual(['sinEvidencia', 'C', 'B', 'A'])
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/niveles.test.ts`
Expected: FAIL (`Cannot find module './niveles'`).

- [ ] **Step 3: Implementar `motor/niveles.ts`**

```ts
export type NivelMinimo = 'sinEvidencia' | 'C' | 'B' | 'A'

export const ORDEN_NIVEL: readonly NivelMinimo[] = ['sinEvidencia', 'C', 'B', 'A']

export interface MetadatoParametro<Id extends string = string> {
  id: Id
  titulo: string
  origen: 'evidencia' | 'diseno'
  evidencia: string[]
  nivelMinimo: NivelMinimo
}

export function nivelMasBajo(niveles: readonly NivelMinimo[]): NivelMinimo {
  if (niveles.length === 0) throw new Error('nivelMasBajo necesita al menos un nivel')
  return niveles.reduce((a, b) => (ORDEN_NIVEL.indexOf(b) < ORDEN_NIVEL.indexOf(a) ? b : a))
}
```

- [ ] **Step 4: Ejecutar y comprobar que pasa**

Run: `npx vitest run motor/niveles.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Escribir `motor/generador.test.ts` (falla: no existe el módulo)**

```ts
import { describe, expect, it } from 'vitest'
import { generarFuente, parsearParametros } from './generador'

const MUESTRA = [
  '| id | parámetro | valor | ids EV | nivel mínimo | notas |',
  '|---|---|---|---|---|---|',
  '| P-01 | Modalidad | Repeaters | EV-DEDOS-005, EV-DEDOS-004, EV-DEDOS-005 | A | nota |',
  '| P-02 | Descanso mínimo | 48 h | sinEvidencia | sinEvidencia (indirecta B) | nota |',
  '| P-03 | Otro | valor | EV-LESION-007 | C | nota |',
].join('\n')

describe('parsearParametros', () => {
  it('lee las filas P-xx e ignora cabecera y separador', () => {
    expect(parsearParametros(MUESTRA).map((p) => p.id)).toEqual(['P-01', 'P-02', 'P-03'])
  })
  it('deduplica y ordena los ids de evidencia', () => {
    const p = parsearParametros(MUESTRA)[0]!
    expect(p.evidencia).toEqual(['EV-DEDOS-004', 'EV-DEDOS-005'])
    expect(p.origen).toBe('evidencia')
    expect(p.nivelMinimo).toBe('A')
  })
  it('una fila sinEvidencia es de diseño, sin ids y nivel sinEvidencia', () => {
    const p = parsearParametros(MUESTRA)[1]!
    expect(p.origen).toBe('diseno')
    expect(p.evidencia).toEqual([])
    expect(p.nivelMinimo).toBe('sinEvidencia')
    expect(p.titulo).toBe('Descanso mínimo')
  })
  it('acepta saltos de línea CRLF', () => {
    expect(parsearParametros(MUESTRA.replace(/\n/g, '\r\n'))).toHaveLength(3)
  })
  it('lanza si una fila no tiene 6 columnas', () => {
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | A |')).toThrow(/6/)
  })
  it('lanza si el nivel no se reconoce', () => {
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | Z | n |')).toThrow(/Nivel/)
  })
  it('lanza si origen y nivel son incoherentes', () => {
    expect(() => parsearParametros('| P-01 | a | b | sinEvidencia | A | n |')).toThrow(/incoherentes/)
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | sinEvidencia | n |')).toThrow(/incoherentes/)
  })
})

describe('generarFuente', () => {
  it('genera un módulo con ids, tipo y metadatos, y es determinista', () => {
    const fuente = generarFuente(parsearParametros(MUESTRA))
    expect(fuente).toContain('GENERADO')
    expect(fuente).toContain('export const PARAMETRO_IDS = ["P-01","P-02","P-03"] as const')
    expect(fuente).toContain('export type ParametroId')
    expect(fuente).toContain('"P-02": {"id":"P-02"')
    expect(fuente.endsWith('\n')).toBe(true)
    expect(generarFuente(parsearParametros(MUESTRA))).toBe(fuente)
  })
})
```

- [ ] **Step 6: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/generador.test.ts`
Expected: FAIL (`Cannot find module './generador'`).

- [ ] **Step 7: Implementar `motor/generador.ts`**

```ts
import type { MetadatoParametro, NivelMinimo } from './niveles'

const FILA = /^\|\s*P-\d{2}\s*\|/
const ID_EV = /EV-[A-Z]{5,6}-\d{3}/g
const NIVEL = /^(sinEvidencia|A|B|C)(?![A-Za-z])/

export function parsearParametros(md: string): MetadatoParametro[] {
  const filas = md.split(/\r?\n/).filter((l) => FILA.test(l))
  return filas.map((fila) => {
    const c = fila.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim())
    if (c.length !== 6) throw new Error(`Fila con ${c.length} columnas en lugar de 6: ${c[0]}`)
    const id = c[0]!
    const titulo = c[1]!
    const ids = c[3]!
    const nivel = c[4]!
    const m = NIVEL.exec(nivel)
    if (!m) throw new Error(`Nivel no reconocido en ${id}: ${nivel}`)
    const nivelMinimo = m[1] as NivelMinimo
    const origen = ids.includes('sinEvidencia') ? 'diseno' : 'evidencia'
    if ((origen === 'diseno') !== (nivelMinimo === 'sinEvidencia')) {
      throw new Error(`Origen y nivel incoherentes en ${id}`)
    }
    const evidencia = [...new Set(ids.match(ID_EV) ?? [])].sort()
    return { id, titulo, origen, evidencia, nivelMinimo }
  })
}

export function generarFuente(params: MetadatoParametro[]): string {
  const ids = params.map((p) => p.id)
  const entradas = params.map((p) => `  ${JSON.stringify(p.id)}: ${JSON.stringify(p)},`).join('\n')
  return [
    '// GENERADO por scripts/generar-metadatos.ts desde docs/evidencia/parametros.md. No editar a mano.',
    "import type { MetadatoParametro } from './niveles'",
    '',
    `export const PARAMETRO_IDS = ${JSON.stringify(ids)} as const`,
    'export type ParametroId = (typeof PARAMETRO_IDS)[number]',
    '',
    'export const METADATOS: Record<ParametroId, MetadatoParametro<ParametroId>> = {',
    entradas,
    '}',
    '',
  ].join('\n')
}
```

- [ ] **Step 8: Ejecutar y comprobar que pasa**

Run: `npx vitest run motor/generador.test.ts`
Expected: PASS.

- [ ] **Step 9: Script generador y configuración**

Create `scripts/generar-metadatos.ts`:

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { generarFuente, parsearParametros } from '../motor/generador.ts'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')
const params = parsearParametros(md)
writeFileSync('motor/metadatos.ts', generarFuente(params))
console.log(`motor/metadatos.ts generado con ${params.length} parámetros`)
```

Edit `tsconfig.json`: dentro de `compilerOptions` añadir `"allowImportingTsExtensions": true`. Edit `package.json`: en `scripts` añadir `"metadatos": "node scripts/generar-metadatos.ts"`.

Run: `npm run metadatos`
Expected: `motor/metadatos.ts generado con 62 parámetros` (un aviso de ExperimentalWarning es aceptable). Si lanza `Origen y nivel incoherentes en P-xx`, el documento tiene una fila incoherente: repórtalo, no lo ocultes.

- [ ] **Step 10: Escribir `motor/metadatos.test.ts`**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { porId } from '../evidencia'
import { generarFuente, parsearParametros } from './generador'
import { METADATOS, PARAMETRO_IDS } from './metadatos'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')

describe('metadatos de parámetros', () => {
  it('motor/metadatos.ts está al día con parametros.md (ejecuta npm run metadatos si falla)', () => {
    const esperado = generarFuente(parsearParametros(md))
    const actual = readFileSync('motor/metadatos.ts', 'utf8').replace(/\r\n/g, '\n')
    expect(actual).toBe(esperado)
  })
  it('hay 62 parámetros consecutivos P-01…P-62', () => {
    expect(PARAMETRO_IDS).toHaveLength(62)
    PARAMETRO_IDS.forEach((id, i) => expect(id).toBe(`P-${String(i + 1).padStart(2, '0')}`))
  })
  it('todos los ids de evidencia citados existen', () => {
    for (const id of PARAMETRO_IDS) {
      for (const ev of METADATOS[id].evidencia) expect(porId(ev), `${id} cita ${ev}`).toBeDefined()
    }
  })
  it('origen diseno equivale a nivel sinEvidencia y a no citar ids', () => {
    for (const id of PARAMETRO_IDS) {
      const m = METADATOS[id]
      expect(m.origen === 'diseno').toBe(m.nivelMinimo === 'sinEvidencia')
      if (m.origen === 'diseno') expect(m.evidencia).toEqual([])
    }
  })
})
```

- [ ] **Step 11: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa (los 178 anteriores más los nuevos).

```bash
git add -A
git commit -m "feat(motor): parameter metadata generated from parametros.md

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Explicación

**Files:**
- Create: `motor/explicacion.ts`, `motor/explicacion.test.ts`

**Interfaces:**
- Consumes: `METADATOS`, `ParametroId` (`./metadatos`); `nivelMasBajo`, `NivelMinimo` (`./niveles`).
- Produces:
  ```ts
  export interface Explicacion {
    regla: string; parametros: ParametroId[]; evidencias: string[]
    nivelMinimo: NivelMinimo; origen: 'evidencia' | 'diseno' | 'contexto'; motivo: string
  }
  export function explicar(regla: string, parametros: ParametroId[], motivo: string): Explicacion
  export function explicarContexto(regla: string, motivo: string): Explicacion
  ```

- [ ] **Step 1: Escribir `motor/explicacion.test.ts` (falla)**

```ts
import { describe, expect, it } from 'vitest'
import { explicar, explicarContexto } from './explicacion'
import { METADATOS, type ParametroId } from './metadatos'

describe('explicar', () => {
  it('deriva evidencias, nivel y origen de los parámetros', () => {
    const e = explicar('regla.prueba', ['P-02'], 'porque sí')
    expect(e.parametros).toEqual(['P-02'])
    expect(e.evidencias).toEqual(METADATOS['P-02'].evidencia)
    expect(e.nivelMinimo).toBe(METADATOS['P-02'].nivelMinimo)
    expect(e.origen).toBe('evidencia')
    expect(e.motivo).toBe('porque sí')
  })
  it('un parámetro de diseño rebaja el nivel a sinEvidencia y el origen a diseno', () => {
    const e = explicar('regla.prueba', ['P-02', 'P-14'], 'm')
    expect(METADATOS['P-14'].origen).toBe('diseno')
    expect(e.nivelMinimo).toBe('sinEvidencia')
    expect(e.origen).toBe('diseno')
  })
  it('une evidencias sin duplicados y ordenadas, y ordena los parámetros', () => {
    const e = explicar('regla.prueba', ['P-05', 'P-02', 'P-02'], 'm')
    expect(e.parametros).toEqual(['P-02', 'P-05'])
    expect(e.evidencias).toEqual([...new Set(e.evidencias)].sort())
    expect(e.evidencias.length).toBeGreaterThan(0)
  })
  it('lanza sin parámetros', () => {
    expect(() => explicar('regla.prueba', [], 'm')).toThrow(/ningún parámetro/)
  })
  it('lanza con un parámetro desconocido', () => {
    expect(() => explicar('regla.prueba', ['P-99' as ParametroId], 'm')).toThrow(/desconocido/)
  })
  it('lanza con regla o motivo vacíos', () => {
    expect(() => explicar('', ['P-02'], 'm')).toThrow()
    expect(() => explicar('regla.prueba', ['P-02'], '  ')).toThrow()
  })
})

describe('explicarContexto', () => {
  it('no cita parámetros ni evidencia', () => {
    const e = explicarContexto('contexto.sin-cuerda', 'Sin compañero no hay cuerda.')
    expect(e).toEqual({
      regla: 'contexto.sin-cuerda',
      parametros: [],
      evidencias: [],
      nivelMinimo: 'sinEvidencia',
      origen: 'contexto',
      motivo: 'Sin compañero no hay cuerda.',
    })
  })
  it('exige que la regla empiece por contexto.', () => {
    expect(() => explicarContexto('seguridad.x', 'm')).toThrow(/contexto\./)
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/explicacion.test.ts`
Expected: FAIL (`Cannot find module './explicacion'`).

- [ ] **Step 3: Implementar `motor/explicacion.ts`**

```ts
import { METADATOS, type ParametroId } from './metadatos'
import { nivelMasBajo, type MetadatoParametro, type NivelMinimo } from './niveles'

export interface Explicacion {
  regla: string
  parametros: ParametroId[]
  evidencias: string[]
  nivelMinimo: NivelMinimo
  origen: 'evidencia' | 'diseno' | 'contexto'
  motivo: string
}

function comprobarTexto(nombre: string, valor: string): void {
  if (valor.trim() === '') throw new Error(`${nombre} no puede estar vacío`)
}

export function explicar(regla: string, parametros: ParametroId[], motivo: string): Explicacion {
  comprobarTexto('La regla', regla)
  comprobarTexto('El motivo', motivo)
  if (parametros.length === 0) throw new Error(`La regla ${regla} no cita ningún parámetro`)
  const tabla = METADATOS as Record<string, MetadatoParametro<ParametroId> | undefined>
  const metas = parametros.map((id) => {
    const m = tabla[id]
    if (!m) throw new Error(`Parámetro desconocido: ${id}`)
    return m
  })
  return {
    regla,
    parametros: [...new Set(parametros)].sort(),
    evidencias: [...new Set(metas.flatMap((m) => m.evidencia))].sort(),
    nivelMinimo: nivelMasBajo(metas.map((m) => m.nivelMinimo)),
    origen: metas.some((m) => m.origen === 'diseno') ? 'diseno' : 'evidencia',
    motivo,
  }
}

export function explicarContexto(regla: string, motivo: string): Explicacion {
  comprobarTexto('El motivo', motivo)
  if (!regla.startsWith('contexto.')) throw new Error(`La regla de contexto debe empezar por contexto.: ${regla}`)
  return { regla, parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'contexto', motivo }
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run motor/explicacion.test.ts`
Expected: PASS.

```bash
git add motor/explicacion.ts motor/explicacion.test.ts
git commit -m "feat(motor): automatic explanation derived from parameters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tipos, tiempo y ayudas de prueba

**Files:**
- Create: `motor/tipos.ts`, `motor/tiempo.ts`, `motor/tiempo.test.ts`, `motor/_fabrica.ts`

**Interfaces:**
- Consumes: `Explicacion` (`./explicacion`).
- Produces (`motor/tipos.ts`): `TIPOS_SESION` (tupla `as const`), `TipoSesion`, `Intensidad`, `Agarre`, `Compania`, `Lugar`, `Perfil`, `Contexto`, `Sesion`, `Violacion` exactamente como en el spec §1 (con `TIPOS_SESION` añadido).
- Produces (`motor/tiempo.ts`):
  ```ts
  export function diaNumero(fecha: string): number            // días desde 1970-01-01; lanza si la fecha no existe
  export function inicioHoras(s: Sesion): number               // diaNumero*24 + horaInicio
  export function finHoras(s: Sesion): number                  // inicioHoras + duracionMin/60
  export function validarEntrada(sesiones: readonly Sesion[]): void   // lanza ante datos inválidos
  ```
- Produces (`motor/_fabrica.ts`): `perfilNovel` (1,5 años), `perfilExperto` (5 años), `ses(id, fecha, horaInicio, extra?)` que crea una `Sesion` de tipo `bloque-limite`, intensidad `alta`, 90 min.

- [ ] **Step 1: Crear `motor/tipos.ts`**

```ts
import type { Explicacion } from './explicacion'

export const TIPOS_SESION = [
  'multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite',
  'bloque-suave', 'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto',
  'campus', 'resistencia-4x4', 'arc', 'tecnica', 'dominadas', 'hombro', 'descanso',
] as const
export type TipoSesion = (typeof TIPOS_SESION)[number]

export type Intensidad = 'alta' | 'suave'
export type Agarre = 'abierto' | 'semiarqueado' | 'arqueado'
export type Compania = 'solo' | 'con-gente'
export type Lugar = 'rocodromo' | 'roca' | 'casa'

export interface Perfil {
  pesoKg: number
  anosEscalando: number
  lesiones: string[]
}

export interface Contexto {
  compania: Compania
  lugar: Lugar
  minutosDisponibles: number
}

export interface Sesion {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  fecha: string            // 'AAAA-MM-DD', día natural local del usuario
  horaInicio: number       // 0 <= h < 24, hora local (puede tener decimales)
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre; conCarga?: boolean }
}

export interface Violacion {
  regla: string
  sesionIds: string[]
  mensaje: string
  explicacion: Explicacion
}
```

- [ ] **Step 2: Crear `motor/_fabrica.ts`**

```ts
import type { Perfil, Sesion } from './tipos'

export const perfilNovel: Perfil = { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }
export const perfilExperto: Perfil = { pesoKg: 70, anosEscalando: 5, lesiones: [] }

export function ses(id: string, fecha: string, horaInicio: number, extra: Partial<Sesion> = {}): Sesion {
  return { id, tipo: 'bloque-limite', intensidad: 'alta', fecha, horaInicio, duracionMin: 90, ...extra }
}
```

- [ ] **Step 3: Escribir `motor/tiempo.test.ts` (falla)**

```ts
import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { diaNumero, finHoras, inicioHoras, validarEntrada } from './tiempo'

describe('diaNumero', () => {
  it('cuenta días desde 1970-01-01', () => {
    expect(diaNumero('1970-01-01')).toBe(0)
    expect(diaNumero('1970-01-02')).toBe(1)
  })
  it('días consecutivos difieren en 1 también al cambiar de mes, año y bisiesto', () => {
    expect(diaNumero('2026-11-01') - diaNumero('2026-10-31')).toBe(1)
    expect(diaNumero('2027-01-01') - diaNumero('2026-12-31')).toBe(1)
    expect(diaNumero('2024-03-01') - diaNumero('2024-02-29')).toBe(1)
  })
  it('lanza con fechas inexistentes o mal formadas', () => {
    expect(() => diaNumero('2026-02-30')).toThrow()
    expect(() => diaNumero('2026-13-01')).toThrow()
    expect(() => diaNumero('26-10-01')).toThrow()
    expect(() => diaNumero('2026-10-1')).toThrow()
  })
})

describe('inicioHoras y finHoras', () => {
  it('suma hora de inicio y duración', () => {
    const s = ses('a', '1970-01-02', 18, { duracionMin: 90 })
    expect(inicioHoras(s)).toBe(24 + 18)
    expect(finHoras(s)).toBe(24 + 18 + 1.5)
  })
})

describe('validarEntrada', () => {
  it('acepta sesiones válidas', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('b', '2026-10-27', 0)])).not.toThrow()
  })
  it('lanza con ids duplicados', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('a', '2026-10-27', 18)])).toThrow(/duplicado/)
  })
  it('lanza con hora fuera de [0, 24)', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 24)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', -1)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', Number.NaN)])).toThrow(/horaInicio/)
  })
  it('lanza con duración no positiva o no finita', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: 0 })])).toThrow(/duracionMin/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: Infinity })])).toThrow(/duracionMin/)
  })
  it('lanza con tipo o intensidad desconocidos', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { tipo: 'zumba' as never })])).toThrow(/tipo/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { intensidad: 'media' as never })])).toThrow(/intensidad/)
  })
  it('lanza con una fecha inexistente', () => {
    expect(() => validarEntrada([ses('a', '2026-02-30', 18)])).toThrow()
  })
})
```

- [ ] **Step 4: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/tiempo.test.ts`
Expected: FAIL (`Cannot find module './tiempo'`).

- [ ] **Step 5: Implementar `motor/tiempo.ts`**

```ts
import { TIPOS_SESION, type Sesion } from './tipos'

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_POR_DIA = 86_400_000

export function diaNumero(fecha: string): number {
  const m = FECHA.exec(fecha)
  if (!m) throw new Error(`Fecha mal formada (se espera AAAA-MM-DD): ${fecha}`)
  const año = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const ms = Date.UTC(año, mes - 1, dia)
  const d = new Date(ms)
  if (d.getUTCFullYear() !== año || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    throw new Error(`La fecha no existe: ${fecha}`)
  }
  return ms / MS_POR_DIA
}

export function inicioHoras(s: Sesion): number {
  return diaNumero(s.fecha) * 24 + s.horaInicio
}

export function finHoras(s: Sesion): number {
  return inicioHoras(s) + s.duracionMin / 60
}

export function validarEntrada(sesiones: readonly Sesion[]): void {
  const vistos = new Set<string>()
  for (const s of sesiones) {
    if (vistos.has(s.id)) throw new Error(`Id de sesión duplicado: ${s.id}`)
    vistos.add(s.id)
    diaNumero(s.fecha)
    if (!Number.isFinite(s.horaInicio) || s.horaInicio < 0 || s.horaInicio >= 24) {
      throw new Error(`horaInicio fuera de [0, 24) en ${s.id}: ${s.horaInicio}`)
    }
    if (!Number.isFinite(s.duracionMin) || s.duracionMin <= 0) {
      throw new Error(`duracionMin debe ser positiva y finita en ${s.id}: ${s.duracionMin}`)
    }
    if (!(TIPOS_SESION as readonly string[]).includes(s.tipo)) throw new Error(`tipo desconocido en ${s.id}: ${s.tipo}`)
    if (s.intensidad !== 'alta' && s.intensidad !== 'suave') {
      throw new Error(`intensidad desconocida en ${s.id}: ${s.intensidad}`)
    }
  }
}
```

- [ ] **Step 6: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run motor/tiempo.test.ts`
Expected: PASS.

```bash
git add motor/tipos.ts motor/tiempo.ts motor/tiempo.test.ts motor/_fabrica.ts
git commit -m "feat(motor): domain types, absolute time and input validation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Valores de los parámetros

**Files:**
- Create: `motor/parametros.ts`, `motor/parametros.test.ts`
- Modify: `docs/evidencia/parametros.md` (fila P-15, columna "valor y unidad")

**Interfaces:**
- Consumes: `ParametroId`, `METADATOS` (`./metadatos`).
- Produces: `VALORES` con exactamente las claves `P-12`, `P-13`, `P-14`, `P-15`, `P-16` y la forma del spec §3.

- [ ] **Step 1: Alinear el documento con el spec (P-15)**

El spec amplía "qué cuenta como sesión intensa" a las vías cerca del límite. En `docs/evidencia/parametros.md`, fila P-15, cambiar el texto de la columna de valor: sustituir
`Multipresa (fuerza o resistencia), board, bloque cerca del límite y pegues a un proyecto`
por
`Multipresa (fuerza o resistencia), board, bloque cerca del límite, vías (con cuerda o autoasegurada) cerca del límite y pegues a un proyecto`.
Comprobar antes con `grep -c "bloque cerca del límite y pegues a un proyecto" docs/evidencia/parametros.md` (debe dar 1). Añadir al final de las notas de esa fila: ` Ampliación de diseño: las vías cerca del límite cargan los dedos como el bloque.`

Run: `npm run metadatos && git status --short`
Expected: `motor/metadatos.ts` no cambia (solo cambió una columna que no es metadato).

- [ ] **Step 2: Escribir `motor/parametros.test.ts` (falla)**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { METADATOS, type ParametroId } from './metadatos'
import { VALORES } from './parametros'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')

function columnas(id: string): string[] {
  const fila = md.split(/\r?\n/).find((l) => l.startsWith(`| ${id} |`))
  if (!fila) throw new Error(`No hay fila ${id}`)
  return fila.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim())
}

describe('VALORES', () => {
  it('cada clave es un parámetro conocido', () => {
    for (const id of Object.keys(VALORES)) expect(METADATOS[id as ParametroId], id).toBeDefined()
  })
  it('P-12 coincide con el documento', () => {
    expect(columnas('P-12')[1]).toMatch(/< 2 años/)
    expect(columnas('P-12')[2]).toMatch(/20 mm/)
    expect(columnas('P-12')[2]).toMatch(/2 sesiones de multipresa/)
    expect(VALORES['P-12']).toEqual({ anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, regletaMinimaMm: 20 })
  })
  it('P-13 coincide con el documento', () => {
    expect(columnas('P-13')[2]).toMatch(/^0 sesiones/)
    expect(VALORES['P-13'].maxSesionesCampus).toBe(0)
  })
  it('P-14 coincide con el documento', () => {
    expect(columnas('P-14')[2]).toMatch(/^48 h/)
    expect(VALORES['P-14'].horasMinimasEntreSesionesIntensasDedos).toBe(48)
  })
  it('P-15 coincide con el documento', () => {
    const texto = columnas('P-15')[2]!.toLowerCase()
    for (const palabra of ['multipresa', 'board', 'bloque', 'vías', 'pegues']) expect(texto).toContain(palabra)
    expect([...VALORES['P-15'].tiposIntensosDedos].sort()).toEqual([
      'board', 'bloque-limite', 'multipresa-maxima', 'multipresa-resistencia',
      'pegues-proyecto', 'via-autoasegurada', 'via-cuerda-limite',
    ].sort())
  })
  it('P-16 coincide con el documento', () => {
    expect(columnas('P-16')[2]).toMatch(/^2 días/)
    expect(VALORES['P-16'].maxDiasSeguidosCargaAlta).toBe(2)
  })
})
```

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/parametros.test.ts`
Expected: FAIL (`Cannot find module './parametros'`).

- [ ] **Step 4: Implementar `motor/parametros.ts`**

```ts
import type { ParametroId } from './metadatos'

// Valores numéricos que usa el motor. Cada clave es un parámetro de docs/evidencia/parametros.md;
// motor/parametros.test.ts comprueba que coinciden con el documento. Los tramos siguientes añaden los suyos.
export const VALORES = {
  'P-12': { anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, regletaMinimaMm: 20 },
  'P-13': { maxSesionesCampus: 0 },
  'P-14': { horasMinimasEntreSesionesIntensasDedos: 48 },
  'P-15': {
    tiposIntensosDedos: [
      'multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite',
      'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto',
    ],
  },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
} as const satisfies Partial<Record<ParametroId, object>>
```

- [ ] **Step 5: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. Si la columna de P-12/P-13/P-14/P-16 del documento no coincide con el patrón del test, no cambies el valor para que encaje: repórtalo.

```bash
git add motor/parametros.ts motor/parametros.test.ts docs/evidencia/parametros.md
git commit -m "feat(motor): parameter values used by the safety core

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Contexto

**Files:**
- Create: `motor/contexto.ts`, `motor/contexto.test.ts`

**Interfaces:**
- Consumes: `explicarContexto` (`./explicacion`); `TIPOS_SESION`, `Contexto`, `Lugar`, `Sesion`, `TipoSesion`, `Violacion` (`./tipos`).
- Produces:
  ```ts
  export function tiposPosibles(ctx: Contexto): TipoSesion[]               // ordenada alfabéticamente, siempre incluye 'descanso'
  export function validarContexto(sesion: Sesion, ctx: Contexto): Violacion[]   // reglas contexto.lugar, contexto.sin-cuerda, contexto.tiempo (en ese orden)
  ```
  Ambas lanzan si `ctx.minutosDisponibles` no es un número positivo y finito.

- [ ] **Step 1: Escribir `motor/contexto.test.ts` (falla)**

```ts
import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { tiposPosibles, validarContexto } from './contexto'
import type { Contexto } from './tipos'

const ctx = (c: Partial<Contexto> = {}): Contexto => ({
  compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120, ...c,
})

describe('tiposPosibles', () => {
  it('solo en rocódromo: bloque, autoasegurada, board y técnica; nunca cuerda ni pegues', () => {
    const t = tiposPosibles(ctx())
    for (const ok of ['bloque-limite', 'bloque-suave', 'via-autoasegurada', 'board', 'tecnica', 'arc', 'resistencia-4x4', 'descanso']) {
      expect(t).toContain(ok)
    }
    expect(t).not.toContain('via-cuerda-limite')
    expect(t).not.toContain('pegues-proyecto')
  })
  it('con gente en rocódromo: vías con cuerda sí, pegues no (solo en roca)', () => {
    const t = tiposPosibles(ctx({ compania: 'con-gente' }))
    expect(t).toContain('via-cuerda-limite')
    expect(t).not.toContain('pegues-proyecto')
  })
  it('con gente en roca: cuerda y pegues, sin bloque ni autoasegurada', () => {
    const t = tiposPosibles(ctx({ compania: 'con-gente', lugar: 'roca' }))
    expect(t).toContain('via-cuerda-limite')
    expect(t).toContain('pegues-proyecto')
    expect(t).not.toContain('bloque-limite')
    expect(t).not.toContain('via-autoasegurada')
  })
  it('solo en roca: únicamente descanso', () => {
    expect(tiposPosibles(ctx({ lugar: 'roca' }))).toEqual(['descanso'])
  })
  it('en casa: multipresa, board, dominadas, hombro, campus y descanso', () => {
    expect(tiposPosibles(ctx({ lugar: 'casa' }))).toEqual(
      ['board', 'campus', 'descanso', 'dominadas', 'hombro', 'multipresa-maxima', 'multipresa-resistencia'],
    )
  })
  it('siempre incluye descanso y está ordenada', () => {
    for (const compania of ['solo', 'con-gente'] as const) {
      for (const lugar of ['rocodromo', 'roca', 'casa'] as const) {
        const t = tiposPosibles(ctx({ compania, lugar }))
        expect(t).toContain('descanso')
        expect(t).toEqual([...t].sort())
      }
    }
  })
  it('lanza con minutos no positivos', () => {
    expect(() => tiposPosibles(ctx({ minutosDisponibles: 0 }))).toThrow(/minutosDisponibles/)
    expect(() => tiposPosibles(ctx({ minutosDisponibles: Number.NaN }))).toThrow(/minutosDisponibles/)
  })
})

describe('validarContexto', () => {
  it('sin violaciones cuando todo encaja', () => {
    expect(validarContexto(ses('a', '2026-10-27', 18, { tipo: 'bloque-limite' }), ctx())).toEqual([])
  })
  it('vía con cuerda estando solo: contexto.sin-cuerda', () => {
    const v = validarContexto(ses('a', '2026-10-27', 18, { tipo: 'via-cuerda-limite' }), ctx())
    expect(v.map((x) => x.regla)).toEqual(['contexto.sin-cuerda'])
    expect(v[0]!.sesionIds).toEqual(['a'])
    expect(v[0]!.explicacion.origen).toBe('contexto')
  })
  it('tipo imposible en el lugar: contexto.lugar', () => {
    const v = validarContexto(ses('a', '2026-10-27', 18, { tipo: 'bloque-limite' }), ctx({ lugar: 'casa' }))
    expect(v.map((x) => x.regla)).toEqual(['contexto.lugar'])
  })
  it('más duración que tiempo disponible: contexto.tiempo (el límite exacto pasa)', () => {
    expect(validarContexto(ses('a', '2026-10-27', 18, { duracionMin: 120 }), ctx())).toEqual([])
    const v = validarContexto(ses('a', '2026-10-27', 18, { duracionMin: 121 }), ctx())
    expect(v.map((x) => x.regla)).toEqual(['contexto.tiempo'])
  })
  it('varias violaciones salen ordenadas por regla', () => {
    const v = validarContexto(
      ses('a', '2026-10-27', 18, { tipo: 'pegues-proyecto', duracionMin: 300 }),
      ctx({ compania: 'solo', lugar: 'rocodromo' }),
    )
    expect(v.map((x) => x.regla)).toEqual(['contexto.lugar', 'contexto.sin-cuerda', 'contexto.tiempo'])
  })
  it('no muta sus entradas', () => {
    const s = ses('a', '2026-10-27', 18, { tipo: 'via-cuerda-limite' })
    const c = ctx()
    const antes = structuredClone({ s, c })
    validarContexto(s, c)
    expect({ s, c }).toEqual(antes)
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/contexto.test.ts`
Expected: FAIL (`Cannot find module './contexto'`).

- [ ] **Step 3: Implementar `motor/contexto.ts`**

```ts
import { explicarContexto } from './explicacion'
import { TIPOS_SESION, type Contexto, type Lugar, type Sesion, type TipoSesion, type Violacion } from './tipos'

const NECESITA_COMPANIA: ReadonlySet<TipoSesion> = new Set<TipoSesion>(['via-cuerda-limite', 'pegues-proyecto'])
const CASA_O_ROCODROMO: readonly Lugar[] = ['casa', 'rocodromo']

const LUGARES: Record<TipoSesion, readonly Lugar[]> = {
  'via-cuerda-limite': ['rocodromo', 'roca'],
  'pegues-proyecto': ['roca'],
  'via-autoasegurada': ['rocodromo'],
  'bloque-limite': ['rocodromo'],
  'bloque-suave': ['rocodromo'],
  board: ['rocodromo', 'casa'],
  tecnica: ['rocodromo'],
  arc: ['rocodromo'],
  'resistencia-4x4': ['rocodromo'],
  'multipresa-resistencia': CASA_O_ROCODROMO,
  'multipresa-maxima': CASA_O_ROCODROMO,
  dominadas: CASA_O_ROCODROMO,
  hombro: CASA_O_ROCODROMO,
  campus: CASA_O_ROCODROMO,
  descanso: ['rocodromo', 'roca', 'casa'],
}

function comprobarContexto(ctx: Contexto): void {
  if (!Number.isFinite(ctx.minutosDisponibles) || ctx.minutosDisponibles <= 0) {
    throw new Error(`minutosDisponibles debe ser un número positivo: ${ctx.minutosDisponibles}`)
  }
}

export function tiposPosibles(ctx: Contexto): TipoSesion[] {
  comprobarContexto(ctx)
  return TIPOS_SESION.filter(
    (t) => LUGARES[t].includes(ctx.lugar) && (!NECESITA_COMPANIA.has(t) || ctx.compania === 'con-gente'),
  ).sort()
}

export function validarContexto(sesion: Sesion, ctx: Contexto): Violacion[] {
  comprobarContexto(ctx)
  const out: Violacion[] = []
  if (!LUGARES[sesion.tipo].includes(ctx.lugar)) {
    const motivo = `La sesión ${sesion.tipo} no se puede hacer en este lugar (${ctx.lugar}).`
    out.push({
      regla: 'contexto.lugar',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.lugar', motivo),
    })
  }
  if (NECESITA_COMPANIA.has(sesion.tipo) && ctx.compania === 'solo') {
    const motivo = `Sin compañero no se puede hacer ${sesion.tipo}: hace falta alguien que asegure.`
    out.push({
      regla: 'contexto.sin-cuerda',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.sin-cuerda', motivo),
    })
  }
  if (sesion.duracionMin > ctx.minutosDisponibles) {
    const motivo = `La sesión dura ${sesion.duracionMin} min y solo hay ${ctx.minutosDisponibles} min disponibles.`
    out.push({
      regla: 'contexto.tiempo',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.tiempo', motivo),
    })
  }
  return out
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run motor/contexto.test.ts`
Expected: PASS.

```bash
git add motor/contexto.ts motor/contexto.test.ts
git commit -m "feat(motor): context rules (partner and place constraints)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Seguridad, reglas temporales (48 h y carga alta seguida)

**Files:**
- Create: `motor/seguridad.ts`, `motor/seguridad.test.ts`

**Interfaces:**
- Consumes: `explicar` (`./explicacion`); `VALORES` (`./parametros`); `diaNumero`, `finHoras`, `inicioHoras`, `validarEntrada` (`./tiempo`); tipos (`./tipos`); `ses`, `perfilNovel` (`./_fabrica`, solo en tests).
- Produces:
  ```ts
  export const esIntensaDedos: (s: Sesion) => boolean          // intensidad 'alta' y tipo en VALORES['P-15'].tiposIntensosDedos
  export function validarSesion(propuesta: Sesion, historial: Sesion[], perfil: Perfil): Violacion[]
  ```
  Orden de salida: por `regla` y luego por `sesionIds.join(',')`, con comparación estricta de cadenas. Solo devuelve violaciones en las que interviene la propuesta. Llama a `validarEntrada([propuesta, ...historial])`, de modo que un id repetido entre propuesta e historial lanza.
  Esta tarea implementa `seguridad.dedos-48h` y `seguridad.carga-alta-seguida`. La tarea 7 añade las demás.

- [ ] **Step 1: Escribir `motor/seguridad.test.ts` (falla)**

Fechas de referencia: lunes 2026-10-26 y martes 2026-10-27. La sesión `ses()` dura 90 min.

```ts
import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, ses } from './_fabrica'
import { esIntensaDedos, validarSesion } from './seguridad'

const reglas = (v: { regla: string }[]) => v.map((x) => x.regla)

describe('esIntensaDedos', () => {
  it('requiere intensidad alta y un tipo que cargue los dedos', () => {
    expect(esIntensaDedos(ses('a', '2026-10-26', 18))).toBe(true)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { intensidad: 'suave' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'resistencia-4x4' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'via-autoasegurada' }))).toBe(true)
  })
})

describe('seguridad.dedos-48h', () => {
  // Lunes 18:00 + 90 min termina a las 19:30.
  const lunes = ses('lunes', '2026-10-26', 18)

  it('exactamente 48 h entre el fin y el inicio pasa', () => {
    expect(validarSesion(ses('miercoles', '2026-10-28', 19.5), [lunes], perfilExperto)).toEqual([])
  })
  it('47,9 h viola', () => {
    const v = validarSesion(ses('miercoles', '2026-10-28', 19.4), [lunes], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.dedos-48h'])
    expect(v[0]!.sesionIds).toEqual(['lunes', 'miercoles'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-14', 'P-15'])
    expect(v[0]!.explicacion.origen).toBe('diseno')
  })
  it('vale también cuando la sesión del historial es posterior a la propuesta', () => {
    const futura = ses('futura', '2026-10-28', 19.4)
    expect(reglas(validarSesion(lunes, [futura], perfilExperto))).toEqual(['seguridad.dedos-48h'])
    expect(validarSesion(lunes, [ses('futura', '2026-10-28', 19.5)], perfilExperto)).toEqual([])
  })
  it('cruza el fin de mes', () => {
    const sabado = ses('sabado', '2026-10-31', 20) // termina 21:30
    expect(validarSesion(ses('lunes2', '2026-11-02', 21.5), [sabado], perfilExperto)).toEqual([])
    expect(reglas(validarSesion(ses('lunes2', '2026-11-02', 21), [sabado], perfilExperto))).toEqual(['seguridad.dedos-48h'])
  })
  it('sesiones solapadas violan', () => {
    expect(reglas(validarSesion(ses('b', '2026-10-26', 19), [lunes], perfilExperto))).toEqual(['seguridad.dedos-48h'])
  })
  it('una sesión suave o de un tipo que no carga los dedos no cuenta', () => {
    const manana = ses('manana', '2026-10-27', 18, { intensidad: 'suave' })
    expect(validarSesion(manana, [lunes], perfilExperto)).toEqual([])
    const cuatro = ses('cuatro', '2026-10-27', 18, { tipo: 'resistencia-4x4' })
    expect(validarSesion(cuatro, [lunes], perfilExperto)).toEqual([])
    expect(validarSesion(ses('b', '2026-10-27', 18), [ses('suave', '2026-10-26', 18, { intensidad: 'suave' })], perfilExperto)).toEqual([])
  })
  it('una violación por cada sesión del historial en conflicto, ordenadas', () => {
    const v = validarSesion(
      ses('m', '2026-10-27', 18),
      [ses('z', '2026-10-26', 8), ses('a', '2026-10-28', 8)],
      perfilExperto,
    )
    expect(v.filter((x) => x.regla === 'seguridad.dedos-48h').map((x) => x.sesionIds)).toEqual([['a', 'm'], ['m', 'z']])
  })
})

describe('seguridad.carga-alta-seguida', () => {
  const alta = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'resistencia-4x4' })

  it('dos días seguidos pasan y el tercero viola', () => {
    expect(validarSesion(alta('b', '2026-10-27'), [alta('a', '2026-10-26')], perfilExperto)).toEqual([])
    const v = validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
    expect(v[0]!.sesionIds).toEqual(['a', 'b', 'c'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-16'])
  })
  it('un hueco de un día rompe la racha', () => {
    expect(validarSesion(alta('d', '2026-10-29'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)).toEqual([])
  })
  it('la propuesta puede unir dos tramos del historial', () => {
    const v = validarSesion(alta('b', '2026-10-27'), [alta('a', '2026-10-26'), alta('c', '2026-10-28')], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
  })
  it('cruza el fin de semana y el fin de mes', () => {
    expect(reglas(validarSesion(alta('c', '2026-11-01'), [alta('a', '2026-10-30'), alta('b', '2026-10-31')], perfilExperto))).toEqual(['seguridad.carga-alta-seguida'])
    expect(reglas(validarSesion(alta('c', '2026-12-31'), [alta('a', '2026-12-29'), alta('b', '2026-12-30')], perfilExperto))).toEqual(['seguridad.carga-alta-seguida'])
  })
  it('dos sesiones altas el mismo día cuentan como un día', () => {
    const v = validarSesion(alta('c', '2026-10-27'), [alta('a', '2026-10-26'), ses('b', '2026-10-27', 20, { tipo: 'resistencia-4x4' })], perfilExperto)
    expect(v).toEqual([])
  })
  it('una propuesta suave nunca viola esta regla', () => {
    const suave = ses('c', '2026-10-28', 8, { intensidad: 'suave' })
    expect(validarSesion(suave, [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)).toEqual([])
  })
  it('se aplica igual con perfil novel', () => {
    const v = validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
  })
})

describe('validarSesion: entrada', () => {
  it('lanza si el id de la propuesta ya está en el historial', () => {
    expect(() => validarSesion(ses('a', '2026-10-27', 18), [ses('a', '2026-10-26', 18)], perfilExperto)).toThrow(/duplicado/)
  })
  it('lanza con horas inválidas', () => {
    expect(() => validarSesion(ses('a', '2026-10-27', 24), [], perfilExperto)).toThrow(/horaInicio/)
  })
  it('sin historial no hay violaciones temporales', () => {
    expect(validarSesion(ses('a', '2026-10-27', 18), [], perfilExperto)).toEqual([])
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/seguridad.test.ts`
Expected: FAIL (`Cannot find module './seguridad'`).

- [ ] **Step 3: Implementar `motor/seguridad.ts`**

```ts
import { explicar } from './explicacion'
import { VALORES } from './parametros'
import { diaNumero, finHoras, inicioHoras, validarEntrada } from './tiempo'
import type { Perfil, Sesion, TipoSesion, Violacion } from './tipos'

const EPS = 1e-9
const TIPOS_DEDOS: readonly TipoSesion[] = VALORES['P-15'].tiposIntensosDedos

export const esIntensaDedos = (s: Sesion): boolean => s.intensidad === 'alta' && TIPOS_DEDOS.includes(s.tipo)

type Regla = (propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil) => Violacion[]

const redondear = (x: number): number => Math.round(x * 10) / 10

function reglaDedos48h(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (!esIntensaDedos(propuesta)) return []
  const minimo = VALORES['P-14'].horasMinimasEntreSesionesIntensasDedos
  const out: Violacion[] = []
  for (const h of historial) {
    if (!esIntensaDedos(h)) continue
    const hueco =
      inicioHoras(propuesta) >= inicioHoras(h)
        ? inicioHoras(propuesta) - finHoras(h)
        : inicioHoras(h) - finHoras(propuesta)
    if (hueco < minimo - EPS) {
      out.push({
        regla: 'seguridad.dedos-48h',
        sesionIds: [h.id, propuesta.id].sort(),
        mensaje: `Solo hay ${redondear(Math.max(0, hueco))} h entre ${h.id} y ${propuesta.id}; las sesiones intensas de dedos necesitan al menos ${minimo} h.`,
        explicacion: explicar(
          'seguridad.dedos-48h',
          ['P-14', 'P-15'],
          `Dos sesiones intensas de dedos necesitan al menos ${minimo} h de descanso entre el fin de una y el inicio de la siguiente.`,
        ),
      })
    }
  }
  return out
}

function reglaCargaAltaSeguida(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (propuesta.intensidad !== 'alta') return []
  const max = VALORES['P-16'].maxDiasSeguidosCargaAlta
  const altas = [...historial, propuesta].filter((s) => s.intensidad === 'alta')
  const dias = new Set(altas.map((s) => diaNumero(s.fecha)))
  const d = diaNumero(propuesta.fecha)
  let inicio = d
  while (dias.has(inicio - 1)) inicio--
  let fin = d
  while (dias.has(fin + 1)) fin++
  const racha = fin - inicio + 1
  if (racha <= max) return []
  const ids = altas
    .filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= inicio && x <= fin
    })
    .map((s) => s.id)
    .sort()
  return [
    {
      regla: 'seguridad.carga-alta-seguida',
      sesionIds: ids,
      mensaje: `Con esta sesión habría ${racha} días seguidos de carga alta; el máximo es ${max}.`,
      explicacion: explicar(
        'seguridad.carga-alta-seguida',
        ['P-16'],
        `No se encadenan más de ${max} días naturales seguidos con sesiones de intensidad alta; después toca descanso o carga suave.`,
      ),
    },
  ]
}

const REGLAS: Regla[] = [reglaDedos48h, reglaCargaAltaSeguida]

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function validarSesion(propuesta: Sesion, historial: Sesion[], perfil: Perfil): Violacion[] {
  validarEntrada([propuesta, ...historial])
  return REGLAS.flatMap((regla) => regla(propuesta, historial, perfil)).sort(
    (a, b) => comparar(a.regla, b.regla) || comparar(a.sesionIds.join(','), b.sesionIds.join(',')),
  )
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run motor/seguridad.test.ts`
Expected: PASS.

```bash
git add motor/seguridad.ts motor/seguridad.test.ts
git commit -m "feat(motor): safety rules for 48h between finger sessions and consecutive high-load days

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Seguridad, reglas de perfil (campus, máxima, multipresa, regleta, arqueado)

**Files:**
- Modify: `motor/seguridad.ts`, `motor/seguridad.test.ts`

**Interfaces:**
- Consumes: lo de la tarea 6.
- Produces: las reglas `seguridad.campus` (P-13, P-12), `seguridad.maxima-novel` (P-01, P-12), `seguridad.multipresa-7dias` (P-12), `seguridad.regleta` (P-12) y `seguridad.arqueado` (P-10, P-12), todas registradas en `REGLAS`. Condiciones exactas en el spec §6. «Novel» significa `perfil.anosEscalando < VALORES['P-12'].anosMaximosPerfilNovel`. `arqueado` se aplica siempre; las demás solo a perfiles novel.

- [ ] **Step 1: Añadir las pruebas al final de `motor/seguridad.test.ts`**

```ts
describe('seguridad.campus y seguridad.maxima-novel', () => {
  it('campus viola en perfil novel y pasa en experto', () => {
    const c = ses('c', '2026-10-27', 18, { tipo: 'campus' })
    const v = validarSesion(c, [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.campus'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12', 'P-13'])
    expect(validarSesion(c, [], perfilExperto)).toEqual([])
  })
  it('el límite de años: 2 años ya no es novel, 1,99 sí', () => {
    const c = ses('c', '2026-10-27', 18, { tipo: 'campus' })
    expect(reglas(validarSesion(c, [], { ...perfilNovel, anosEscalando: 1.99 }))).toEqual(['seguridad.campus'])
    expect(validarSesion(c, [], { ...perfilNovel, anosEscalando: 2 })).toEqual([])
  })
  it('multipresa máxima viola en novel y pasa en experto', () => {
    const m = ses('m', '2026-10-27', 18, { tipo: 'multipresa-maxima' })
    const v = validarSesion(m, [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.maxima-novel'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-01', 'P-12'])
    expect(validarSesion(m, [], perfilExperto)).toEqual([])
  })
})

describe('seguridad.multipresa-7dias', () => {
  const mp = (id: string, fecha: string) =>
    ses(id, fecha, 8, { tipo: 'multipresa-resistencia', intensidad: 'suave' })

  it('dos multipresas en 7 días pasan y tres violan', () => {
    expect(validarSesion(mp('c', '2026-10-31'), [mp('a', '2026-10-26')], perfilNovel)).toEqual([])
    const v = validarSesion(mp('c', '2026-10-31'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.multipresa-7dias'])
    expect(v[0]!.sesionIds).toEqual(['a', 'b', 'c'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12'])
  })
  it('la tercera a 7 días de la primera no cae en la misma ventana', () => {
    expect(validarSesion(mp('c', '2026-11-02'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)).toEqual([])
  })
  it('cuenta también sesiones futuras ya confirmadas', () => {
    const v = validarSesion(mp('b', '2026-10-28'), [mp('a', '2026-10-26'), mp('c', '2026-10-31')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.multipresa-7dias'])
  })
  it('no se aplica a perfiles con experiencia ni a otros tipos', () => {
    expect(validarSesion(mp('c', '2026-10-31'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilExperto)).toEqual([])
    const otro = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'tecnica', intensidad: 'suave' })
    expect(validarSesion(otro('c', '2026-10-31'), [otro('a', '2026-10-26'), otro('b', '2026-10-28')], perfilNovel)).toEqual([])
  })
})

describe('seguridad.regleta', () => {
  const conRegleta = (mm: number, tipo: 'multipresa-resistencia' | 'tecnica' = 'multipresa-resistencia') =>
    ses('r', '2026-10-27', 18, { tipo, intensidad: 'suave', detalle: { regletaMm: mm } })

  it('19 mm viola y 20 mm pasa en novel', () => {
    const v = validarSesion(conRegleta(19), [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.regleta'])
    expect(validarSesion(conRegleta(20), [], perfilNovel)).toEqual([])
  })
  it('no se aplica a perfiles con experiencia ni fuera de la multipresa', () => {
    expect(validarSesion(conRegleta(10), [], perfilExperto)).toEqual([])
    expect(validarSesion(conRegleta(10, 'tecnica'), [], perfilNovel)).toEqual([])
  })
})

describe('seguridad.arqueado', () => {
  const arq = (conCarga: boolean) =>
    ses('q', '2026-10-27', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { agarre: 'arqueado', conCarga } })

  it('arqueado con carga viola siempre, también con experiencia', () => {
    for (const perfil of [perfilNovel, perfilExperto]) {
      const v = validarSesion(arq(true), [], perfil)
      expect(reglas(v)).toEqual(['seguridad.arqueado'])
      expect(v[0]!.explicacion.parametros).toEqual(['P-10', 'P-12'])
    }
  })
  it('arqueado sin carga o semiarqueado con carga pasan', () => {
    expect(validarSesion(arq(false), [], perfilExperto)).toEqual([])
    const semi = ses('q', '2026-10-27', 18, { intensidad: 'suave', detalle: { agarre: 'semiarqueado', conCarga: true } })
    expect(validarSesion(semi, [], perfilExperto)).toEqual([])
  })
})

describe('validarSesion: varias reglas a la vez', () => {
  it('las violaciones salen ordenadas por regla', () => {
    // Bloque intenso el lunes 18:00 (termina 19:30); la propuesta es el martes 18:00: 22,5 h de hueco.
    const lunes = ses('lunes', '2026-10-26', 18)
    const peligrosa = ses('p', '2026-10-27', 18, {
      tipo: 'multipresa-maxima',
      detalle: { regletaMm: 15 },
    })
    const v = validarSesion(peligrosa, [lunes], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.dedos-48h', 'seguridad.maxima-novel', 'seguridad.regleta'])
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que fallan las pruebas nuevas**

Run: `npx vitest run motor/seguridad.test.ts`
Expected: FAIL en las describes nuevas (las reglas aún no existen); las de la tarea 6 siguen pasando.

- [ ] **Step 3: Implementar las reglas en `motor/seguridad.ts`**

Añadir antes de `const REGLAS`:

```ts
const MULTIPRESA: readonly TipoSesion[] = ['multipresa-resistencia', 'multipresa-maxima']
const esMultipresa = (s: Sesion): boolean => MULTIPRESA.includes(s.tipo)
const esNovel = (p: Perfil): boolean => p.anosEscalando < VALORES['P-12'].anosMaximosPerfilNovel

function reglaCampus(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'campus' || !esNovel(perfil)) return []
  const max = VALORES['P-13'].maxSesionesCampus
  const hechas = historial.filter((s) => s.tipo === 'campus').length
  if (hechas + 1 <= max) return []
  return [
    {
      regla: 'seguridad.campus',
      sesionIds: [propuesta.id],
      mensaje: `El campus no entra en el plan con menos de ${VALORES['P-12'].anosMaximosPerfilNovel} años de experiencia (máximo ${max} sesiones).`,
      explicacion: explicar(
        'seguridad.campus',
        ['P-13', 'P-12'],
        'El campus board no se prescribe a escaladores con poca experiencia: la guía lo reserva a adultos experimentados y se asocia a más lesión.',
      ),
    },
  ]
}

function reglaMaximaNovel(propuesta: Sesion, _historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'multipresa-maxima' || !esNovel(perfil)) return []
  return [
    {
      regla: 'seguridad.maxima-novel',
      sesionIds: [propuesta.id],
      mensaje: 'Las suspensiones máximas quedan excluidas con poca experiencia; usa repeaters submáximos.',
      explicacion: explicar(
        'seguridad.maxima-novel',
        ['P-01', 'P-12'],
        'Con menos de 2 años de experiencia no hay evidencia de que las suspensiones máximas sean seguras; se usan repeaters submáximos.',
      ),
    },
  ]
}

function reglaMultipresa7Dias(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (!esMultipresa(propuesta) || !esNovel(perfil)) return []
  const max = VALORES['P-12'].maxSesionesMultipresa7Dias
  const todas = [...historial, propuesta].filter(esMultipresa)
  const d = diaNumero(propuesta.fecha)
  for (let inicio = d - 6; inicio <= d; inicio++) {
    const ventana = todas.filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= inicio && x <= inicio + 6
    })
    if (ventana.length > max) {
      return [
        {
          regla: 'seguridad.multipresa-7dias',
          sesionIds: ventana.map((s) => s.id).sort(),
          mensaje: `Habría ${ventana.length} sesiones de multipresa en 7 días; el máximo es ${max}.`,
          explicacion: explicar(
            'seguridad.multipresa-7dias',
            ['P-12'],
            `Con poca experiencia no se superan ${max} sesiones de multipresa en cualquier ventana de 7 días.`,
          ),
        },
      ]
    }
  }
  return []
}

function reglaRegleta(propuesta: Sesion, _historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  const mm = propuesta.detalle?.regletaMm
  const minimo = VALORES['P-12'].regletaMinimaMm
  if (!esMultipresa(propuesta) || !esNovel(perfil) || mm === undefined || mm >= minimo) return []
  return [
    {
      regla: 'seguridad.regleta',
      sesionIds: [propuesta.id],
      mensaje: `Una regleta de ${mm} mm es demasiado pequeña; el mínimo es ${minimo} mm.`,
      explicacion: explicar(
        'seguridad.regleta',
        ['P-12'],
        `Con poca experiencia no se usan regletas de menos de ${minimo} mm.`,
      ),
    },
  ]
}

function reglaArqueado(propuesta: Sesion): Violacion[] {
  if (propuesta.detalle?.agarre !== 'arqueado' || propuesta.detalle.conCarga !== true) return []
  return [
    {
      regla: 'seguridad.arqueado',
      sesionIds: [propuesta.id],
      mensaje: 'No se cuelga con carga en agarre arqueado completo.',
      explicacion: explicar(
        'seguridad.arqueado',
        ['P-10', 'P-12'],
        'El agarre arqueado completo con carga concentra tensión en las poleas; se usa semiarqueado estandarizado.',
      ),
    },
  ]
}
```

Y sustituir la definición de `REGLAS` por:

```ts
const REGLAS: Regla[] = [
  reglaDedos48h, reglaCargaAltaSeguida, reglaCampus, reglaMaximaNovel,
  reglaMultipresa7Dias, reglaRegleta, reglaArqueado,
]
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. Si `reglaMaximaNovel` o `reglaRegleta` no compilan por parámetros no usados, no cambies `tsconfig`; el prefijo `_` ya los marca como intencionados.

```bash
git add motor/seguridad.ts motor/seguridad.test.ts
git commit -m "feat(motor): profile-based safety rules (campus, max hangs, multipresa volume, edge depth, full crimp)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: API pública, propiedades, pureza y escenario real

**Files:**
- Create: `motor/index.ts`, `motor/propiedades.test.ts`, `motor/pureza.test.ts`, `motor/escenario.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces (`motor/index.ts`): reexporta `explicar`, `explicarContexto`, `type Explicacion`; `tiposPosibles`, `validarContexto`; `validarSesion`, `esIntensaDedos`; `VALORES`; `METADATOS`, `PARAMETRO_IDS`, `type ParametroId`; `nivelMasBajo`, tipos de `./niveles`; todos los tipos de `./tipos` y `TIPOS_SESION`; `diaNumero`, `inicioHoras`, `finHoras`, `validarEntrada`.

- [ ] **Step 1: Crear `motor/index.ts`**

```ts
export { explicar, explicarContexto, type Explicacion } from './explicacion'
export { tiposPosibles, validarContexto } from './contexto'
export { validarSesion, esIntensaDedos } from './seguridad'
export { VALORES } from './parametros'
export { METADATOS, PARAMETRO_IDS, type ParametroId } from './metadatos'
export { nivelMasBajo, ORDEN_NIVEL, type MetadatoParametro, type NivelMinimo } from './niveles'
export { diaNumero, inicioHoras, finHoras, validarEntrada } from './tiempo'
export {
  TIPOS_SESION,
  type Agarre, type Compania, type Contexto, type Intensidad, type Lugar,
  type Perfil, type Sesion, type TipoSesion, type Violacion,
} from './tipos'
```

- [ ] **Step 2: Escribir `motor/propiedades.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, ses } from './_fabrica'
import { validarContexto, validarSesion } from './index'

const historial = [
  ses('a', '2026-10-26', 18),
  ses('b', '2026-10-27', 18, { tipo: 'multipresa-resistencia' }),
  ses('c', '2026-10-28', 8, { tipo: 'resistencia-4x4' }),
  ses('d', '2026-10-30', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave' }),
]
const propuestas = [
  ses('p1', '2026-10-29', 18, { tipo: 'campus' }),
  ses('p2', '2026-10-27', 20, { tipo: 'multipresa-maxima', detalle: { regletaMm: 15, agarre: 'arqueado', conCarga: true } }),
  ses('p3', '2026-10-31', 18, { tipo: 'multipresa-resistencia' }),
]

describe('propiedades de validarSesion', () => {
  it('es determinista', () => {
    for (const p of propuestas) {
      expect(validarSesion(p, historial, perfilNovel)).toEqual(validarSesion(p, historial, perfilNovel))
    }
  })
  it('no muta sus entradas', () => {
    for (const p of propuestas) {
      const antes = structuredClone({ p, historial, perfilNovel })
      validarSesion(p, historial, perfilNovel)
      expect({ p, historial, perfilNovel }).toEqual(antes)
    }
  })
  it('el orden del historial no cambia el resultado', () => {
    for (const p of propuestas) {
      expect(validarSesion(p, [...historial].reverse(), perfilNovel)).toEqual(validarSesion(p, historial, perfilNovel))
    }
  })
  it('toda violación trae sesiones, mensaje y una explicación con parámetros', () => {
    for (const p of propuestas) {
      for (const perfil of [perfilNovel, perfilExperto]) {
        for (const v of validarSesion(p, historial, perfil)) {
          expect(v.sesionIds).toContain(p.id)
          expect(v.mensaje.length).toBeGreaterThan(10)
          expect(v.explicacion.parametros.length).toBeGreaterThan(0)
          expect(v.explicacion.regla).toBe(v.regla)
        }
      }
    }
  })
  it('varias reglas a la vez salen ordenadas por regla', () => {
    const v = validarSesion(propuestas[1]!, historial, perfilNovel)
    const reglas = v.map((x) => x.regla)
    expect(reglas.length).toBeGreaterThan(2)
    expect(reglas).toEqual([...reglas].sort())
  })
})

describe('propiedades de validarContexto', () => {
  it('toda violación de contexto se explica sin evidencia', () => {
    const v = validarContexto(propuestas[0]!, { compania: 'solo', lugar: 'roca', minutosDisponibles: 30 })
    expect(v.length).toBeGreaterThan(0)
    for (const x of v) expect(x.explicacion.origen).toBe('contexto')
  })
})
```

- [ ] **Step 3: Escribir `motor/pureza.test.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fuentes = readdirSync('motor').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

describe('pureza de motor/', () => {
  it('hay ficheros que comprobar', () => {
    expect(fuentes.length).toBeGreaterThan(5)
  })
  it.each(fuentes)('%s no usa reloj, azar ni dependencias de entorno', (f) => {
    const src = readFileSync(`motor/${f}`, 'utf8')
    expect(src).not.toMatch(/Date\.now\(|Math\.random\(|new Date\(\)/)
    expect(src).not.toMatch(/from ['"](react|next|@supabase)/)
    expect(src).not.toMatch(/from ['"]node:/)
  })
})
```

- [ ] **Step 4: Escribir `motor/escenario.test.ts` (los casos reales del usuario)**

```ts
import { describe, expect, it } from 'vitest'
import { perfilNovel, ses } from './_fabrica'
import { tiposPosibles, validarContexto, validarSesion } from './index'

// Semana del usuario: los martes va con amigos (vías con cuerda) y los jueves va solo (bloque y autoasegurada).
const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite' }) // termina 20:30
const contextoMartes = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const contextoJueves = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const

describe('escenario real: martes con gente y jueves solo', () => {
  it('el martes se pueden hacer vías con cuerda', () => {
    expect(tiposPosibles(contextoMartes)).toContain('via-cuerda-limite')
    expect(validarContexto(martes, contextoMartes)).toEqual([])
  })
  it('el jueves solo no se pueden hacer vías con cuerda, sí bloque, autoasegurada y board', () => {
    const t = tiposPosibles(contextoJueves)
    expect(t).not.toContain('via-cuerda-limite')
    for (const ok of ['bloque-limite', 'via-autoasegurada', 'board']) expect(t).toContain(ok)
    const jueves = ses('jueves', '2026-10-29', 19, { tipo: 'via-cuerda-limite' })
    expect(validarContexto(jueves, contextoJueves).map((v) => v.regla)).toEqual(['contexto.sin-cuerda'])
  })
  it('un jueves a las 18:00 tras el martes: solo hay 45,5 h, así que no se puede forzar bloque al límite', () => {
    const bloque = ses('jueves', '2026-10-29', 18, { tipo: 'bloque-limite' })
    expect(validarSesion(bloque, [martes], perfilNovel).map((v) => v.regla)).toEqual(['seguridad.dedos-48h'])
  })
  it('ese mismo jueves, una sesión suave de técnica sí es posible', () => {
    const tecnica = ses('jueves', '2026-10-29', 18, { tipo: 'tecnica', intensidad: 'suave' })
    expect(validarContexto(tecnica, contextoJueves)).toEqual([])
    expect(validarSesion(tecnica, [martes], perfilNovel)).toEqual([])
  })
  it('pasadas 48 h desde el final del martes (jueves 20:30) el bloque al límite ya es posible', () => {
    const bloque = ses('jueves', '2026-10-29', 20.5, { tipo: 'bloque-limite' })
    expect(validarSesion(bloque, [martes], perfilNovel)).toEqual([])
  })
})
```

- [ ] **Step 5: Verificar todo**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. Si `pureza.test.ts` marca `motor/tiempo.ts` por `new Date(ms)`, comprueba que la regex solo prohíbe `new Date()` sin argumentos; si marca `generador.ts` o `metadatos.ts`, revisa que no importen `node:`.

- [ ] **Step 6: Commit**

```bash
git add motor/index.ts motor/propiedades.test.ts motor/pureza.test.ts motor/escenario.test.ts
git commit -m "feat(motor): public API, property tests, purity guard and real-user scenario

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Cobertura del spec 2a:** §1 tipos (Task 3), §2 metadatos generados y tests de deriva/integridad (Task 1), §3 valores y cruce con el documento (Task 4), §4 explicación (Task 2), §5 contexto (Task 5), §6 reglas de seguridad (Tasks 6–7, las 7 reglas del spec), §7 pruebas incluidas propiedades, pureza y caso real (Task 8), §8 estructura de ficheros.
- **Cambios acordados al spec durante el plan:** `via-autoasegurada` en `tiposIntensosDedos` y ventana móvil de 7 días (ya reflejados en el spec); P-15 del documento ampliado en Task 4.
- **Consistencia de tipos:** `Explicacion`, `Violacion`, `Sesion`, `Perfil`, `Contexto`, `validarSesion`, `validarContexto`, `tiposPosibles`, `esIntensaDedos`, `VALORES` y `METADATOS` se usan con los mismos nombres y firmas en todas las tareas.
- **Marcadores pendientes:** ninguno. Se revisó a mano que cada expectativa de las pruebas coincide con lo que el código de la tarea correspondiente produce (reglas que saltan a la vez, ventanas de 7 días, límites de 48 h).
