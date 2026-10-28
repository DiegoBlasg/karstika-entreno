# «Mi semana» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diego declara los huecos de cada semana, la app se los pasa al motor (plan semanal, P-67) y la pantalla «Mi semana» muestra el plan; el registro sale con las molestias del chequeo.

**Architecture:** Tabla nueva `huecos` (migración 002). Lógica pura en `lib/datos/huecos.ts` (reglas, ocupación, huecos posteriores) y `lib/datos/semana.ts` (vista de la semana); `prepararPropuesta` añade `huecos` a la `Peticion`. UI nueva en `app/(app)/semana/`; Entrenar acepta parámetros de URL; Hoy muestra el próximo hueco.

**Tech Stack:** Next.js 16.4 (App Router, `searchParams` es una `Promise`), React 19, Tailwind 4, Neon (`@neondatabase/serverless`, `sql\`…\`` y `sql.transaction([...])`), vitest 2, Playwright.

Spec: `docs/superpowers/specs/2026-10-28-app-mi-semana-design.md`. Rama: `mi-semana`. Repo: `D:\karstika-entreno`.

## Global Constraints

- Todo el texto de la interfaz y de los errores en español.
- Fechas `'AAAA-MM-DD'`, día natural en Madrid (`ahoraMadrid`). La semana es natural: de lunes a domingo.
- Hora del hueco en minutos enteros desde las 00:00 (`inicio_min`, 0–1439); para el motor `horaInicio = inicio_min / 60`. `inicio_min + minutos <= 1440`.
- Minutos del hueco: enteros entre `MINUTOS_DISPONIBLES.min` (10) y `MINUTOS_DISPONIBLES.max` (600).
- Como mucho **9 huecos por semana natural** (`VALORES['P-67'].maxHuecos + 1`) y **2 por día** (`MAX_POR_DIA` del motor); sin solapes; nunca en un día pasado; solo en la semana actual o la siguiente.
- Borrar un hueco nunca borra sesiones.
- Semana sin ningún hueco declarado → `huecos: undefined` (el motor decide día a día como antes). Semana con huecos pero ninguno posterior → `huecos: []`.
- Toda escritura valida antes con las funciones puras de `lib/datos` y pasa por `requerirDatos()`/`bd()` (re-comprueban la cookie).
- No tocar `motor/` salvo exportar `MAX_POR_DIA` (Task 2).
- Cada tarea termina con `npm test` y `npm run tsc` en verde. No hay base de datos todavía: `probar-bd` y `e2e` se escriben pero no se ejecutan.
- Commits con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Tabla `huecos`, filas, carga y consultas

**Files:**
- Create: `migraciones/002_huecos.sql`
- Modify: `lib/datos/filas.ts`, `lib/datos/_fabrica.ts`, `lib/servidor/consultas.ts`, `scripts/base-pruebas.ts`, `scripts/probar-bd.ts`, `lib/fecha.ts`
- Test: `lib/fecha.test.ts`

**Interfaces:**
- Produces: `FilaHueco` (`id, fecha, inicio_min, compania, lugar, minutos`), `DatosAtleta.huecos: FilaHueco[]`, `huecoFila(id, fecha, 'HH:MM', extra?)` (fábrica de tests), `insertarHueco(sql, f: FilaHueco, lunes: string, topes: { semana: number; dia: number }): Promise<boolean>`, `borrarHuecoBd(sql, id): Promise<void>`, `lunesDe(fecha): string`, `hhmmDeMinutos(min): string`. Los topes (9 y 2) se definen en Task 2; la consulta los recibe como parámetro.

- [ ] **Step 1: Test de `lunesDe` y `hhmmDeMinutos`**

Añadir al final de `lib/fecha.test.ts` (importando `lunesDe, hhmmDeMinutos` junto a lo que ya importa):

```ts
describe('lunesDe', () => {
  it('devuelve el lunes de la semana natural', () => {
    expect(lunesDe('2026-11-02')).toBe('2026-11-02') // lunes
    expect(lunesDe('2026-11-05')).toBe('2026-11-02') // jueves
    expect(lunesDe('2026-11-08')).toBe('2026-11-02') // domingo
    expect(lunesDe('2026-11-01')).toBe('2026-10-26') // domingo anterior, cruza de mes
  })
})

describe('hhmmDeMinutos', () => {
  it('formatea minutos desde las 00:00', () => {
    expect(hhmmDeMinutos(0)).toBe('00:00')
    expect(hhmmDeMinutos(9 * 60)).toBe('09:00')
    expect(hhmmDeMinutos(19 * 60 + 5)).toBe('19:05')
  })
})
```

Si `lib/fecha.test.ts` no importa `describe`, añadirlo al import de `vitest`.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/fecha.test.ts`
Expected: FAIL (`lunesDe` no exportada).

- [ ] **Step 3: Implementar en `lib/fecha.ts`** (al final)

```ts
// Lunes de la semana natural (lunes a domingo) de una fecha.
export function lunesDe(fecha: string): string {
  const diaSemana = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(fecha, -diaSemana)
}

export function hhmmDeMinutos(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run lib/fecha.test.ts` → PASS.

- [ ] **Step 5: Migración `migraciones/002_huecos.sql`**

```sql
-- Huecos de la semana que declara Diego (Mi semana). La hora va en minutos enteros desde las 00:00.
create table huecos (
  id uuid primary key,
  fecha date not null,
  inicio_min integer not null check (inicio_min between 0 and 1439),
  compania text not null check (compania in ('solo', 'con-gente')),
  lugar text not null check (lugar in ('casa', 'rocodromo', 'roca')),
  minutos integer not null check (minutos between 10 and 600),
  creado_en timestamptz not null default now(),
  check (inicio_min + minutos <= 1440)
);
create index huecos_fecha on huecos (fecha);
```

- [ ] **Step 6: Filas, fábrica, carga y consultas**

En `lib/datos/filas.ts`: importar `Compania, Lugar` del motor junto a los demás tipos y añadir antes de `DatosAtleta`:

```ts
export interface FilaHueco {
  id: string
  fecha: string
  inicio_min: number             // minutos desde las 00:00
  compania: Compania
  lugar: Lugar
  minutos: number
}
```

y en `DatosAtleta` añadir al final `huecos: FilaHueco[]`.

En `lib/datos/_fabrica.ts`, `datosVacios` añade `huecos: []` (antes de `...extra`), y añadir:

```ts
import type { DatosAtleta, FilaHueco, FilaPerfil, FilaSesion } from './filas'

export function huecoFila(id: string, fecha: string, hhmm: string, extra: Partial<FilaHueco> = {}): FilaHueco {
  const [h, m] = hhmm.split(':').map(Number)
  return { id, fecha, inicio_min: h! * 60 + m!, compania: 'solo', lugar: 'casa', minutos: 60, ...extra }
}
```

En `lib/servidor/consultas.ts`:
- Importar `FilaHueco`.
- En `cargarDatos`, añadir una novena consulta a la transacción y al resultado:

```ts
      sql`select id::text as id, fecha::text as fecha, inicio_min, compania, lugar, minutos from huecos order by fecha, inicio_min`,
```

desestructurando `huecos` al final del array y devolviendo `huecos: huecos as FilaHueco[]`.
- Añadir al final:

```ts
// Una transacción con la tabla bloqueada frente a otras escrituras: los topes por semana y por día y el no solaparse
// se comprueban en la propia sentencia, así dos envíos a la vez no se los saltan. Devuelve si se ha insertado.
export async function insertarHueco(
  sql: Sql, f: FilaHueco, lunes: string, topes: { semana: number; dia: number },
): Promise<boolean> {
  const [, filas] = await sql.transaction([
    sql`lock table huecos in share row exclusive mode`,
    sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos)
      select ${f.id}::uuid, ${f.fecha}::date, ${f.inicio_min}::int, ${f.compania}::text, ${f.lugar}::text, ${f.minutos}::int
      where (select count(*) from huecos where fecha between ${lunes}::date and ${lunes}::date + 6) < ${topes.semana}
        and (select count(*) from huecos where fecha = ${f.fecha}::date) < ${topes.dia}
        and not exists (select 1 from huecos where fecha = ${f.fecha}::date
          and inicio_min < ${f.inicio_min + f.minutos}::int and ${f.inicio_min}::int < inicio_min + minutos)
      returning id`,
  ])
  return (filas as unknown[]).length > 0
}

export async function borrarHuecoBd(sql: Sql, id: string): Promise<void> {
  await sql`delete from huecos where id = ${id}`
}
```

En `scripts/base-pruebas.ts`, `vaciar` trunca también `huecos` (añadirlo a la lista).

En `scripts/probar-bd.ts`, añadir al array `casos` (antes del cierre `]`):

```ts
  ['hueco a las 24:00', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 1440, 'solo', 'casa', 60)`],
  ['hueco de 5 minutos', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'solo', 'casa', 5)`],
  ['hueco de 601 minutos', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 0, 'solo', 'casa', 601)`],
  ['hueco que cruza la medianoche', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 1400, 'solo', 'casa', 60)`],
  ['hueco con compañía desconocida', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'pareja', 'casa', 60)`],
  ['hueco con lugar desconocido', () => sql`insert into huecos (id, fecha, inicio_min, compania, lugar, minutos) values (${S2}, '2026-11-03', 540, 'solo', 'playa', 60)`],
```

Y actualizar `docs/despliegue.md`: la salida esperada pasa a `base de datos correcta: 25 casos rechazados`.

- [ ] **Step 7: Comprobar**

Run: `npm test` → PASS; `npm run tsc` → sin errores (si algún test construye `DatosAtleta` a mano sin `huecos`, añadirle `huecos: []`).

- [ ] **Step 8: Commit**

```bash
git add migraciones/002_huecos.sql lib/datos/filas.ts lib/datos/_fabrica.ts lib/servidor/consultas.ts scripts/base-pruebas.ts scripts/probar-bd.ts lib/fecha.ts lib/fecha.test.ts docs/despliegue.md
git commit -m "feat(datos): tabla huecos, carga y consultas con topes atómicos"
```

---

### Task 2: Reglas de huecos y huecos posteriores en la petición

**Files:**
- Create: `lib/datos/huecos.ts`, `lib/datos/huecos.test.ts`
- Modify: `motor/semana.ts` (exportar `MAX_POR_DIA`), `motor/index.ts`, `lib/datos/peticion.ts`, `lib/datos/peticion.test.ts`

**Interfaces:**
- Consumes: `FilaHueco`, `DatosAtleta.huecos`, `huecoFila`, `lunesDe`, `sumarDias` (Task 1).
- Produces:
  - `MAX_HUECOS_SEMANA: number` (= 9), `MAX_HUECOS_DIA: number` (= 2)
  - `huecoMotor(f: FilaHueco): Hueco`
  - `sesionEnHueco(d: DatosAtleta, f: FilaHueco): FilaSesion | undefined`
  - `huecosPosteriores(d: DatosAtleta, e: EntradaPeticion): Hueco[] | undefined`
  - `validarHuecoNuevo(d: DatosAtleta, f: FilaHueco, hoy: string): void` (lanza `Error` con mensaje en español)
  - `entradaDeHueco(f: FilaHueco): EntradaPeticion`

- [ ] **Step 1: Exportar el tope por día del motor**

En `motor/semana.ts` cambiar `const MAX_POR_DIA = 2` por `export const MAX_POR_DIA = 2`. En `motor/index.ts` cambiar
`export { planificarSemana, validarHuecos } from './semana'` por
`export { MAX_POR_DIA as MAX_HUECOS_POR_DIA, planificarSemana, validarHuecos } from './semana'`.

- [ ] **Step 2: Tests `lib/datos/huecos.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import { entradaDeHueco, huecoMotor, huecosPosteriores, MAX_HUECOS_SEMANA, sesionEnHueco, validarHuecoNuevo } from './huecos'
import type { EntradaPeticion } from './peticion'

// Semana del lunes 2026-11-02 al domingo 2026-11-08.
const LUN_M = huecoFila(uuid(101), '2026-11-02', '09:00')
const LUN_T = huecoFila(uuid(102), '2026-11-02', '19:00', { lugar: 'rocodromo', minutos: 90 })
const MAR_T = huecoFila(uuid(103), '2026-11-03', '19:00', { lugar: 'rocodromo', compania: 'con-gente', minutos: 120 })
const JUE_T = huecoFila(uuid(104), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 })
const OTRA_SEMANA = huecoFila(uuid(105), '2026-11-09', '09:00')

describe('huecoMotor y entradaDeHueco', () => {
  it('pasan los minutos a horas y copian el contexto', () => {
    expect(huecoMotor(LUN_T)).toEqual({ fecha: '2026-11-02', horaInicio: 19, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 } })
    expect(entradaDeHueco(huecoFila(uuid(1), '2026-11-02', '09:30'))).toEqual({
      fecha: '2026-11-02', horaInicio: 9.5, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 },
    })
  })
})

describe('sesionEnHueco', () => {
  it('una sesión que se solapa con el hueco lo ocupa; una que acaba justo al empezar, no', () => {
    const solapa = sesionFila(uuid(1), '2026-11-02', { horaInicio: 19.5, duracionMin: 60 })
    const antes = sesionFila(uuid(2), '2026-11-02', { horaInicio: 18, duracionMin: 60 })
    expect(sesionEnHueco(datosVacios({ sesiones: [solapa] }), LUN_T)?.id).toBe(uuid(1))
    expect(sesionEnHueco(datosVacios({ sesiones: [antes] }), LUN_T)).toBeUndefined()
  })
})

describe('huecosPosteriores', () => {
  const d = datosVacios({ huecos: [JUE_T, LUN_M, MAR_T, LUN_T, OTRA_SEMANA] })
  it('sin huecos declarados en la semana devuelve undefined', () => {
    expect(huecosPosteriores(datosVacios({ huecos: [OTRA_SEMANA] }), entradaDeHueco(LUN_M))).toBeUndefined()
  })
  it('desde un hueco: los de después en la misma semana, en orden', () => {
    expect(huecosPosteriores(d, entradaDeHueco(LUN_M))?.map((h) => `${h.fecha} ${h.horaInicio}`)).toEqual([
      '2026-11-02 19', '2026-11-03 19', '2026-11-05 19',
    ])
  })
  it('el último hueco de la semana: lista vacía', () => {
    expect(huecosPosteriores(d, entradaDeHueco(JUE_T))).toEqual([])
  })
  it('quita los ocupados por una sesión y los que se solapan con la sesión pedida', () => {
    const ocupado = datosVacios({ huecos: d.huecos, sesiones: [sesionFila(uuid(1), '2026-11-03', { horaInicio: 19, duracionMin: 120 })] })
    expect(huecosPosteriores(ocupado, entradaDeHueco(LUN_M))?.map((h) => h.fecha)).toEqual(['2026-11-02', '2026-11-05'])
    const larga: EntradaPeticion = { fecha: '2026-11-02', horaInicio: 18, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } }
    expect(huecosPosteriores(d, larga)?.map((h) => h.fecha)).toEqual(['2026-11-03', '2026-11-05'])
  })
  it('una sesión improvisada no supera los topes del motor (8 huecos, 2 por día contando la pedida)', () => {
    const dias = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
    const muchos = dias.flatMap((f, i) => [huecoFila(uuid(200 + 2 * i), f, '09:00'), huecoFila(uuid(201 + 2 * i), f, '19:00')])
    const mismoDia = [huecoFila(uuid(300), '2026-11-02', '12:00'), huecoFila(uuid(301), '2026-11-02', '19:00')]
    const improvisada: EntradaPeticion = { fecha: '2026-11-02', horaInicio: 8, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 } }
    const r = huecosPosteriores(datosVacios({ huecos: [...muchos, ...mismoDia] }), improvisada)!
    expect(r.length).toBe(8)
    expect(r.filter((h) => h.fecha === '2026-11-02').length).toBe(1)
  })
})

describe('validarHuecoNuevo', () => {
  const HOY = '2026-11-02'
  it('acepta un hueco válido', () => {
    expect(() => validarHuecoNuevo(datosVacios(), LUN_T, HOY)).not.toThrow()
  })
  it('rechaza días pasados y fuera de esta semana o la siguiente', () => {
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), '2026-11-01', '09:00'), HOY)).toThrow('No puedes añadir huecos en días pasados.')
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), '2026-11-16', '09:00'), HOY)).toThrow('Solo puedes declarar huecos de esta semana y de la siguiente.')
  })
  it('rechaza el 10.º de la semana, el 3.º del día y los solapes', () => {
    const nueve = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].flatMap((f, i) => [
      huecoFila(uuid(10 + 2 * i), f, '09:00'), huecoFila(uuid(11 + 2 * i), f, '19:00'),
    ]).concat(huecoFila(uuid(30), '2026-11-06', '09:00'))
    expect(nueve.length).toBe(MAX_HUECOS_SEMANA)
    expect(() => validarHuecoNuevo(datosVacios({ huecos: nueve }), huecoFila(uuid(1), '2026-11-07', '09:00'), HOY)).toThrow('Como mucho 9 huecos por semana.')
    const dos = datosVacios({ huecos: [LUN_M, LUN_T] })
    expect(() => validarHuecoNuevo(dos, huecoFila(uuid(1), '2026-11-02', '14:00'), HOY)).toThrow('Como mucho 2 huecos por día.')
    const uno = datosVacios({ huecos: [LUN_T] })
    expect(() => validarHuecoNuevo(uno, huecoFila(uuid(1), '2026-11-02', '20:00'), HOY)).toThrow('Se solapa con otro hueco de ese día.')
    expect(() => validarHuecoNuevo(uno, huecoFila(uuid(1), '2026-11-02', '20:30'), HOY)).not.toThrow() // 19:00 + 90 min = 20:30
  })
  it('rechaza horas y minutos fuera de rango', () => {
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), HOY, '23:30', { minutos: 60 }), HOY)).toThrow('El hueco no puede pasar de la medianoche.')
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), HOY, '09:00', { minutos: 5 }), HOY)).toThrow('Minutos disponibles: entre 10 y 600.')
  })
})
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npx vitest run lib/datos/huecos.test.ts` → FAIL (módulo no existe).

- [ ] **Step 4: Implementar `lib/datos/huecos.ts`**

```ts
// Huecos de la semana: reglas al declararlos, cuándo los ocupa una sesión y cuáles se pasan al motor. Puro.
import { diaNumero, finHoras, inicioHoras, MAX_HUECOS_POR_DIA, VALORES, type Hueco } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { MINUTOS_DISPONIBLES } from '../formulario'
import type { DatosAtleta, FilaHueco, FilaSesion } from './filas'
import { historialMotor } from './mapeo'
import type { EntradaPeticion } from './peticion'

// El motor admite 8 huecos por delante del que se prepara (P-67): con el preparado, 9 por semana.
export const MAX_HUECOS_SEMANA = VALORES['P-67'].maxHuecos + 1
export const MAX_HUECOS_DIA = MAX_HUECOS_POR_DIA

const absoluto = (fecha: string, minutos: number): number => diaNumero(fecha) * 1440 + minutos
const inicioAbs = (f: FilaHueco): number => absoluto(f.fecha, f.inicio_min)
const ordenHuecos = (a: FilaHueco, b: FilaHueco): number => a.fecha.localeCompare(b.fecha) || a.inicio_min - b.inicio_min

export function huecoMotor(f: FilaHueco): Hueco {
  return { fecha: f.fecha, horaInicio: f.inicio_min / 60, contexto: { compania: f.compania, lugar: f.lugar, minutosDisponibles: f.minutos } }
}

export function entradaDeHueco(f: FilaHueco): EntradaPeticion {
  return huecoMotor(f)
}

// La sesión guardada (aceptada o libre) que se solapa con el hueco, si la hay. Acabar justo cuando empieza no cuenta.
export function sesionEnHueco(d: DatosAtleta, f: FilaHueco): FilaSesion | undefined {
  const ini = inicioAbs(f)
  const fin = ini + f.minutos
  const s = historialMotor(d.sesiones).find((x) => Math.round(inicioHoras(x) * 60) < fin && ini < Math.round(finHoras(x) * 60))
  return s ? d.sesiones.find((x) => x.id === s.id) : undefined
}

// Los huecos que se pasan al motor con una petición: los de su semana que empiezan después de que acabe la sesión
// pedida y que no ocupa ninguna sesión. Sin huecos declarados en esa semana, undefined (el motor decide día a día).
// Una sesión improvisada fuera de los huecos puede dejar más de los que admite el motor: se quedan los primeros.
export function huecosPosteriores(d: DatosAtleta, e: EntradaPeticion): Hueco[] | undefined {
  const lunes = lunesDe(e.fecha)
  const domingo = sumarDias(lunes, 6)
  const deLaSemana = d.huecos.filter((h) => h.fecha >= lunes && h.fecha <= domingo)
  if (deLaSemana.length === 0) return undefined
  const finPedida = absoluto(e.fecha, Math.round(e.horaInicio * 60)) + e.contexto.minutosDisponibles
  const libres = deLaSemana.filter((h) => inicioAbs(h) >= finPedida && !sesionEnHueco(d, h)).sort(ordenHuecos)
  const elegidos: FilaHueco[] = []
  for (const h of libres) {
    if (elegidos.length >= MAX_HUECOS_SEMANA - 1) break
    const mismoDia = elegidos.filter((x) => x.fecha === h.fecha).length + (h.fecha === e.fecha ? 1 : 0)
    if (mismoDia < MAX_HUECOS_DIA) elegidos.push(h)
  }
  return elegidos.map(huecoMotor)
}

// Reglas al declarar un hueco. Lanza con un mensaje listo para mostrar.
export function validarHuecoNuevo(d: DatosAtleta, f: FilaHueco, hoy: string): void {
  if (f.fecha < hoy) throw new Error('No puedes añadir huecos en días pasados.')
  if (f.fecha > sumarDias(lunesDe(hoy), 13)) throw new Error('Solo puedes declarar huecos de esta semana y de la siguiente.')
  if (!Number.isInteger(f.inicio_min) || f.inicio_min < 0 || f.inicio_min > 1439) throw new Error('La hora no es válida.')
  if (!Number.isInteger(f.minutos) || f.minutos < MINUTOS_DISPONIBLES.min || f.minutos > MINUTOS_DISPONIBLES.max) {
    throw new Error(`Minutos disponibles: entre ${MINUTOS_DISPONIBLES.min} y ${MINUTOS_DISPONIBLES.max}.`)
  }
  if (f.inicio_min + f.minutos > 1440) throw new Error('El hueco no puede pasar de la medianoche.')
  const lunes = lunesDe(f.fecha)
  const domingo = sumarDias(lunes, 6)
  if (d.huecos.filter((h) => h.fecha >= lunes && h.fecha <= domingo).length >= MAX_HUECOS_SEMANA) {
    throw new Error(`Como mucho ${MAX_HUECOS_SEMANA} huecos por semana.`)
  }
  const delDia = d.huecos.filter((h) => h.fecha === f.fecha)
  if (delDia.length >= MAX_HUECOS_DIA) throw new Error(`Como mucho ${MAX_HUECOS_DIA} huecos por día.`)
  if (delDia.some((h) => h.inicio_min < f.inicio_min + f.minutos && f.inicio_min < h.inicio_min + h.minutos)) {
    throw new Error('Se solapa con otro hueco de ese día.')
  }
}
```

Nota: `lib/formulario.ts` importa un tipo de `lib/datos/peticion` y `huecos.ts` importa un valor de `lib/formulario`; es un ciclo solo de tipos (`import type`), sin problema en ejecución.

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run lib/datos/huecos.test.ts` → PASS.

- [ ] **Step 6: `prepararPropuesta` pasa los huecos — test primero**

Añadir en `lib/datos/peticion.test.ts` (importando `huecoFila` de `./_fabrica`):

```ts
describe('prepararPropuesta con huecos', () => {
  it('sin huecos declarados en la semana no hay plan semanal', () => {
    const p = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(p.propuesta.semana).toBeUndefined()
  })
  it('con huecos declarados devuelve el plan del resto de la semana', () => {
    const d = datosVacios({
      huecos: [
        huecoFila(uuid(101), '2026-11-03', '19:00', { compania: 'con-gente', lugar: 'rocodromo', minutos: 120 }),
        huecoFila(uuid(102), '2026-11-04', '09:00'),
        huecoFila(uuid(103), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 }),
      ],
    })
    const p = propuestaDe(prepararPropuesta(d, MARTES))
    expect(p.propuesta.semana?.map((x) => x.hueco.fecha)).toEqual(['2026-11-04', '2026-11-05'])
    expect(prepararPropuesta(d, MARTES)).toEqual(p) // determinista: aceptar ve lo mismo
  })
})
```

Run: `npx vitest run lib/datos/peticion.test.ts` → FAIL en el segundo caso (`semana` undefined).

- [ ] **Step 7: Implementar**

En `lib/datos/peticion.ts`: `import { huecosPosteriores } from './huecos'` y, al construir `peticion`, añadir tras `consejosMostrados`:

```ts
    ...(() => {
      const huecos = huecosPosteriores(d, e)
      return huecos ? { huecos } : {}
    })(),
```

(o, más legible, calcular `const huecos = huecosPosteriores(d, e)` antes del objeto y usar `...(huecos ? { huecos } : {})`; preferir esta segunda forma).

Run: `npx vitest run lib/datos/peticion.test.ts` → PASS. Luego `npm test` y `npm run tsc` → en verde.

- [ ] **Step 8: Commit**

```bash
git add motor/semana.ts motor/index.ts lib/datos/huecos.ts lib/datos/huecos.test.ts lib/datos/peticion.ts lib/datos/peticion.test.ts
git commit -m "feat(datos): reglas de huecos y huecos posteriores en la petición del motor"
```

---

### Task 3: Vista de la semana

**Files:**
- Create: `lib/datos/semana.ts`, `lib/datos/semana.test.ts`
- Modify: `lib/nombres.ts`

**Interfaces:**
- Consumes: `huecoFila`, `entradaDeHueco`, `sesionEnHueco`, `prepararPropuesta`, `temporadaDe`, `lunesDe`, `sumarDias`.
- Produces:
  ```ts
  export type EstadoHueco =
    | { tipo: 'pasado'; sesion?: FilaSesion }
    | { tipo: 'ocupado'; sesion: FilaSesion; registrada: boolean }
    | { tipo: 'planeado'; sesion: Sesion; cargaAlta: boolean }
    | { tipo: 'libre' }
    | { tipo: 'sin-plan' }
  export interface HuecoVista { fila: FilaHueco; estado: EstadoHueco }
  export interface VistaSemana {
    lunes: string
    domingo: string
    fase: { nombre: string; descarga: boolean } | null
    huecos: HuecoVista[]
    aviso?: string
  }
  export function vistaSemana(d: DatosAtleta, lunes: string, ahora: { fecha: string; minutos: number }): VistaSemana
  export function proximoHueco(d: DatosAtleta, ahora: { fecha: string; minutos: number }): HuecoVista | undefined
  export const AVISO_ROJO: string
  ```
  y en `lib/nombres.ts`: `nombreSesion(s: Sesion): string`.

- [ ] **Step 1: Tests `lib/datos/semana.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import { AVISO_ROJO, proximoHueco, vistaSemana } from './semana'

const LUNES = '2026-11-02'
const LUN_M = huecoFila(uuid(101), '2026-11-02', '09:00')
const MAR_T = huecoFila(uuid(102), '2026-11-03', '19:00', { compania: 'con-gente', lugar: 'rocodromo', minutos: 120 })
const JUE_T = huecoFila(uuid(103), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 })
const ANTES = { fecha: '2026-11-01', minutos: 12 * 60 }

describe('vistaSemana', () => {
  it('semana vacía: sin huecos ni aviso, con la fase', () => {
    const v = vistaSemana(datosVacios(), LUNES, ANTES)
    expect(v).toMatchObject({ lunes: LUNES, domingo: '2026-11-08', huecos: [], fase: { nombre: expect.any(String), descarga: false } })
    expect(v.aviso).toBeUndefined()
  })
  it('planea cada hueco pendiente: el primero con la propuesta y el resto con el plan', () => {
    const v = vistaSemana(datosVacios({ huecos: [JUE_T, LUN_M, MAR_T] }), LUNES, ANTES)
    expect(v.huecos.map((h) => h.fila.id)).toEqual([uuid(101), uuid(102), uuid(103)])
    for (const h of v.huecos) expect(['planeado', 'libre']).toContain(h.estado.tipo)
    expect(v.huecos.some((h) => h.estado.tipo === 'planeado')).toBe(true)
    expect(v.aviso).toBeUndefined()
  })
  it('pasado y ocupado', () => {
    const sesion = sesionFila(uuid(1), '2026-11-03', { horaInicio: 19, duracionMin: 120 })
    const d = datosVacios({ huecos: [LUN_M, MAR_T, JUE_T], sesiones: [sesion] })
    const v = vistaSemana(d, LUNES, { fecha: '2026-11-02', minutos: 10 * 60 }) // lunes a las 10:00: el de las 9 ya acabó
    expect(v.huecos.map((h) => h.estado.tipo)).toEqual(['pasado', 'ocupado', expect.stringMatching(/planeado|libre/)])
    expect(v.huecos[1]?.estado).toMatchObject({ tipo: 'ocupado', registrada: false })
  })
  it('sin huecos pendientes: aviso', () => {
    const v = vistaSemana(datosVacios({ huecos: [LUN_M] }), LUNES, { fecha: '2026-11-09', minutos: 0 })
    expect(v.huecos[0]?.estado.tipo).toBe('pasado')
    expect(v.aviso).toBe('No te quedan huecos pendientes esta semana.')
  })
  it('fuera de temporada: aviso y sin plan', () => {
    const v = vistaSemana(datosVacios({ huecos: [huecoFila(uuid(1), '2026-10-29', '19:00')] }), '2026-10-26', { fecha: '2026-10-26', minutos: 0 })
    expect(v.aviso).toBe('La temporada empieza el lunes, 2 de noviembre.')
    expect(v.huecos[0]?.estado.tipo).toBe('sin-plan')
    expect(v.fase).toBeNull()
  })
  it('con una zona en rojo no hay plan de la semana', () => {
    const d = datosVacios({
      huecos: [LUN_M, MAR_T, JUE_T],
      chequeos: [{ fecha: '2026-11-01', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 7 }] }],
    })
    const v = vistaSemana(d, LUNES, ANTES)
    expect(v.aviso).toBe(AVISO_ROJO)
    expect(v.huecos.slice(1).map((h) => h.estado.tipo)).toEqual(['sin-plan', 'sin-plan'])
  })
})

describe('proximoHueco', () => {
  it('el primer hueco ni pasado ni ocupado de la semana actual', () => {
    const d = datosVacios({ huecos: [LUN_M, MAR_T] })
    expect(proximoHueco(d, { fecha: '2026-11-02', minutos: 11 * 60 })?.fila.id).toBe(uuid(102))
    expect(proximoHueco(d, { fecha: '2026-11-04', minutos: 0 })).toBeUndefined()
  })
})
```

Nota para quien implementa: si el caso de la zona en rojo no produce rojo con `dolor: 7` en un chequeo del día anterior, mirar `motor/autorregulacion.ts` (umbral de rojo) y usar el valor que lo produzca; el test de `hoy.test.ts` usa `hombro` con dolor 6 en el chequeo del mismo día.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/datos/semana.test.ts` → FAIL (módulo no existe).

- [ ] **Step 3: `nombreSesion` en `lib/nombres.ts`**

```ts
import type { Sesion } from '../motor'
// (añadir `Sesion` al import de tipos existente)

// «Técnica + ARC»: el tipo y sus complementos.
export function nombreSesion(s: Sesion): string {
  return [s.tipo, ...(s.incluye ?? [])].map((t) => NOMBRE_TIPO[t]).join(' + ')
}
```

`NOMBRE_TIPO` está re-exportado en ese archivo desde `../motor/nombres`; para usarlo dentro hay que importarlo además de re-exportarlo: `import { NOMBRE_TIPO } from '../motor/nombres'` y mantener `export { NOMBRE_TIPO }`.

- [ ] **Step 4: Implementar `lib/datos/semana.ts`**

```ts
// Lo que muestra «Mi semana»: los huecos declarados con lo que el motor planea en cada uno. Puro: no guarda nada.
import { esCargaAlta, FASES, semanaEnFecha, ZONAS, type Sesion } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta, FilaHueco, FilaSesion } from './filas'
import { entradaDeHueco, sesionEnHueco } from './huecos'
import { prepararPropuesta, temporadaDe } from './peticion'

export type EstadoHueco =
  | { tipo: 'pasado'; sesion?: FilaSesion }
  | { tipo: 'ocupado'; sesion: FilaSesion; registrada: boolean }
  | { tipo: 'planeado'; sesion: Sesion; cargaAlta: boolean }
  | { tipo: 'libre' }
  | { tipo: 'sin-plan' }

export interface HuecoVista {
  fila: FilaHueco
  estado: EstadoHueco
}

export interface VistaSemana {
  lunes: string
  domingo: string
  fase: { nombre: string; descarga: boolean } | null
  huecos: HuecoVista[]
  aviso?: string
}

export const AVISO_ROJO = 'Tienes alguna zona en rojo: no hay plan de la semana, cada día se decide con el estado de ese día.'

const clave = (fecha: string, minutos: number): string => `${fecha}|${minutos}`

export function vistaSemana(d: DatosAtleta, lunes: string, ahora: { fecha: string; minutos: number }): VistaSemana {
  const domingo = sumarDias(lunes, 6)
  const filas = d.huecos
    .filter((h) => h.fecha >= lunes && h.fecha <= domingo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio_min - b.inicio_min)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const huecos: HuecoVista[] = filas.map((fila) => {
    const sesion = sesionEnHueco(d, fila)
    const pasado = fila.fecha < ahora.fecha || (fila.fecha === ahora.fecha && fila.inicio_min + fila.minutos <= ahora.minutos)
    if (pasado) return { fila, estado: sesion ? { tipo: 'pasado', sesion } : { tipo: 'pasado' } }
    if (sesion) return { fila, estado: { tipo: 'ocupado', sesion, registrada: registradas.has(sesion.id) } }
    return { fila, estado: { tipo: 'sin-plan' } }
  })
  const semanaPlan = semanaEnFecha(temporadaDe(d), lunes)
  let fase = semanaPlan ? { nombre: FASES[semanaPlan.faseId].nombre, descarga: semanaPlan.descarga } : null
  const pendientes = huecos.filter((h) => h.estado.tipo === 'sin-plan')
  const primero = pendientes[0]
  if (!primero) {
    return { lunes, domingo, fase, huecos, ...(filas.length > 0 ? { aviso: 'No te quedan huecos pendientes esta semana.' } : {}) }
  }
  const prep = prepararPropuesta(d, entradaDeHueco(primero.fila))
  if (prep.tipo !== 'propuesta') return { lunes, domingo, fase: null, huecos, aviso: prep.mensaje }
  const { propuesta } = prep
  fase = { nombre: prep.fase.nombre, descarga: prep.fase.descarga === true }
  const principal = propuesta.principal
  primero.estado = principal ? { tipo: 'planeado', sesion: principal.sesion, cargaAlta: esCargaAlta(principal.sesion) } : { tipo: 'libre' }
  if (!propuesta.semana) {
    const rojo = propuesta.estado ? ZONAS.some((z) => propuesta.estado!.zonas[z] === 'rojo') : false
    return { lunes, domingo, fase, huecos, ...(rojo ? { aviso: AVISO_ROJO } : {}) }
  }
  const plan = new Map(propuesta.semana.map((x) => [clave(x.hueco.fecha, Math.round(x.hueco.horaInicio * 60)), x.sesion]))
  for (const h of pendientes.slice(1)) {
    const k = clave(h.fila.fecha, h.fila.inicio_min)
    if (!plan.has(k)) continue
    const s = plan.get(k)!
    h.estado = s ? { tipo: 'planeado', sesion: s, cargaAlta: esCargaAlta(s) } : { tipo: 'libre' }
  }
  return { lunes, domingo, fase, huecos }
}

// El próximo hueco pendiente de la semana actual (para la pantalla Hoy).
export function proximoHueco(d: DatosAtleta, ahora: { fecha: string; minutos: number }): HuecoVista | undefined {
  return vistaSemana(d, lunesDe(ahora.fecha), ahora).huecos.find((h) => h.estado.tipo !== 'pasado' && h.estado.tipo !== 'ocupado')
}
```

Comprobar que `FASES` y `semanaEnFecha` se exportan desde `motor/index.ts` (sí: líneas `export { descargar, FASES, … } from './fases'` y `export { planificarTemporada, semanaEnFecha, … } from './temporada'`) y que `Fase` tiene `nombre` y `descarga?` (`motor/propuesta-tipos.ts`).

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run lib/datos/semana.test.ts` → PASS. Luego `npm test` y `npm run tsc`.

- [ ] **Step 6: Commit**

```bash
git add lib/datos/semana.ts lib/datos/semana.test.ts lib/nombres.ts
git commit -m "feat(datos): vista de la semana con el plan del motor"
```

---

### Task 4: Molestias del chequeo en el registro

**Files:**
- Modify: `lib/datos/hoy.ts`, `lib/datos/hoy.test.ts`, `app/(app)/_hoy/TarjetaSesion.tsx`

**Interfaces:**
- Produces: `Tarjeta.molestiasChequeo: Molestia[]` (las del chequeo de la fecha de la sesión, `[]` si no hay).

- [ ] **Step 1: Test** (añadir dentro de `describe('vistaHoy', …)` en `lib/datos/hoy.test.ts`)

```ts
  it('cada tarjeta lleva las molestias del chequeo de su día', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-04')],
      chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'dedos', dolor: 2 }] }],
    })
    const v = vistaHoy(d, '2026-11-03')
    expect(v.hoy[0]?.molestiasChequeo).toEqual([{ zona: 'dedos', dolor: 2 }])
    expect(v.proximas[0]?.molestiasChequeo).toEqual([])
  })
```

Run: `npx vitest run lib/datos/hoy.test.ts` → FAIL.

- [ ] **Step 2: Implementar en `lib/datos/hoy.ts`**

- Importar `type Molestia` del motor.
- `Tarjeta` gana `molestiasChequeo: Molestia[]   // las del chequeo de su día: el registro sale con ellas`.
- En `vistaHoy`, antes de `tarjetas`: `const chequeo = new Map(d.chequeos.map((c) => [c.fecha, c.molestias]))`, y en el `map`:

```ts
    const molestiasChequeo = chequeo.get(s.fecha) ?? []
    return registro ? { fila, registro, intentos, molestiasChequeo } : { fila, intentos, molestiasChequeo }
```

Run: `npx vitest run lib/datos/hoy.test.ts` → PASS.

- [ ] **Step 3: UI en `app/(app)/_hoy/TarjetaSesion.tsx`**

- `FormularioRegistro` gana la prop `iniciales?: readonly Molestia[]` (importar `type Molestia` de `@/motor`) y usa
  `<CamposMolestias iniciales={previo?.registro.molestias ?? iniciales} />`.
- En `TarjetaSesion`, la llamada sin `previo` pasa a `<FormularioRegistro sesion={s} iniciales={tarjeta.molestiasChequeo} />`.

- [ ] **Step 4: Comprobar y commit**

Run: `npm test` y `npm run tsc` → en verde.

```bash
git add lib/datos/hoy.ts lib/datos/hoy.test.ts "app/(app)/_hoy/TarjetaSesion.tsx"
git commit -m "feat(hoy): el registro sale con las molestias del chequeo del día"
```

---

### Task 5: Entrenar relleno desde la URL y «Así queda tu semana»

**Files:**
- Modify: `lib/formulario.ts`, `lib/formulario.test.ts`, `app/(app)/entrenar/page.tsx`, `app/(app)/entrenar/FormularioEntrenar.tsx`, `app/(app)/entrenar/ResultadoPropuesta.tsx`

**Interfaces:**
- Consumes: `nombreSesion` (Task 3), `hhmmDeMinutos` (Task 1).
- Produces:
  ```ts
  export interface InicialEntrenar { fecha?: string; hora?: string; compania?: Compania; lugar?: Lugar; minutos?: number }
  export function inicialEntrenar(p: Record<string, string | string[] | undefined>): InicialEntrenar
  ```

- [ ] **Step 1: Test** (añadir en `lib/formulario.test.ts`, importando `inicialEntrenar`)

```ts
describe('inicialEntrenar', () => {
  it('toma los parámetros válidos', () => {
    expect(inicialEntrenar({ fecha: '2026-11-03', hora: '19:00', compania: 'con-gente', lugar: 'rocodromo', minutos: '120' })).toEqual({
      fecha: '2026-11-03', hora: '19:00', compania: 'con-gente', lugar: 'rocodromo', minutos: 120,
    })
  })
  it('ignora los que no valen, uno a uno', () => {
    expect(inicialEntrenar({ fecha: '2026-02-30', hora: '25:00', compania: 'pareja', lugar: ['casa', 'roca'], minutos: '5' })).toEqual({})
    expect(inicialEntrenar({ minutos: '90.5', lugar: 'casa' })).toEqual({ lugar: 'casa' })
    expect(inicialEntrenar({})).toEqual({})
  })
})
```

Run: `npx vitest run lib/formulario.test.ts` → FAIL.

- [ ] **Step 2: Implementar en `lib/formulario.ts`** (tras `contexto`)

```ts
// Valores iniciales del formulario de Entrenar desde la URL (botón «Preparar» de Mi semana). Lo que no vale se ignora.
export interface InicialEntrenar { fecha?: string; hora?: string; compania?: Compania; lugar?: Lugar; minutos?: number }

export function inicialEntrenar(p: Record<string, string | string[] | undefined>): InicialEntrenar {
  const v = (k: string): string | undefined => (typeof p[k] === 'string' ? (p[k] as string) : undefined)
  const out: InicialEntrenar = {}
  const f = v('fecha')
  if (f !== undefined && esFechaValida(f)) out.fecha = f
  const h = v('hora')
  const m = h === undefined ? null : /^(\d{2}):(\d{2})$/.exec(h)
  if (h !== undefined && m && Number(m[1]) <= 23 && Number(m[2]) <= 59) out.hora = h
  const c = v('compania')
  if (c !== undefined && (COMPANIAS as readonly string[]).includes(c)) out.compania = c as Compania
  const l = v('lugar')
  if (l !== undefined && (LUGARES as readonly string[]).includes(l)) out.lugar = l as Lugar
  const n = Number(v('minutos'))
  if (Number.isInteger(n) && n >= MINUTOS_DISPONIBLES.min && n <= MINUTOS_DISPONIBLES.max) out.minutos = n
  return out
}
```

Run: `npx vitest run lib/formulario.test.ts` → PASS.

- [ ] **Step 3: Página y formulario**

`app/(app)/entrenar/page.tsx`:

```tsx
import { ahoraMadrid } from '@/lib/fecha'
import { inicialEntrenar } from '@/lib/formulario'
import { requerirDatos } from '@/lib/servidor/consultas'
import { FormularioEntrenar } from './FormularioEntrenar'

export default async function PaginaEntrenar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos() // sin perfil, al perfil
  const ahora = ahoraMadrid(new Date())
  const inicial = inicialEntrenar(await searchParams)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Entrenar</h1>
      <FormularioEntrenar hoy={ahora.fecha} hora={ahora.hhmm} inicioTemporada={datos.perfil.inicio_temporada} inicial={inicial} />
    </div>
  )
}
```

`FormularioEntrenar.tsx`:
- Importar `type InicialEntrenar` junto a `MINUTOS_DISPONIBLES`.
- Firma: `export function FormularioEntrenar({ hoy, hora, inicioTemporada, inicial = {} }: { hoy: string; hora: string; inicioTemporada: string; inicial?: InicialEntrenar })`.
- `const [dia, setDia] = useState(inicial.fecha && inicial.fecha >= primerDia ? inicial.fecha : primerDia)`.
- Hora: `defaultValue={inicial.hora ?? hora}`.
- Radios: `marcado={(inicial.compania ?? 'con-gente') === 'con-gente'}` en «Con gente» y `marcado={inicial.compania === 'solo'}` en «Solo»; lugar igual con `(inicial.lugar ?? 'rocodromo')` para Rocódromo y `inicial.lugar === 'roca'` / `inicial.lugar === 'casa'`.
- Minutos: `defaultValue={inicial.minutos ?? 90}`.

- [ ] **Step 4: «Así queda tu semana» en `ResultadoPropuesta.tsx`**

Importar `esCargaAlta` de `@/motor`, `nombreSesion` de `@/lib/nombres` y `hhmmDeMinutos` de `@/lib/fecha`. Tras el bloque de `opciones.map(...)` y antes de los consejos:

```tsx
      {propuesta.semana && propuesta.semana.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Así queda tu semana</h2>
          <ul className="space-y-1 text-sm">
            {propuesta.semana.map(({ hueco, sesion }) => (
              <li key={`${hueco.fecha}-${hueco.horaInicio}`} className="rounded border border-stone-200 bg-white px-3 py-2">
                {fechaLarga(hueco.fecha)} · {hhmmDeMinutos(Math.round(hueco.horaInicio * 60))} ·{' '}
                {sesion ? `${nombreSesion(sesion)}${esCargaAlta(sesion) ? ' ★' : ''}` : 'Libre'}
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-500">★ = carga alta. El plan se recalcula cada vez que preparas una sesión.</p>
        </section>
      )}
```

- [ ] **Step 5: Comprobar y commit**

Run: `npm test`, `npm run tsc` y `npm run build` → en verde.

```bash
git add lib/formulario.ts lib/formulario.test.ts "app/(app)/entrenar"
git commit -m "feat(entrenar): formulario relleno desde Mi semana y plan del resto de la semana"
```

---

### Task 6: Pantalla «Mi semana», acciones, menú, Hoy y e2e

**Files:**
- Create: `app/(app)/semana/page.tsx`, `app/(app)/semana/acciones.ts`, `app/(app)/semana/FormularioHueco.tsx`, `app/(app)/semana/BotonBorrarHueco.tsx`
- Modify: `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: `vistaSemana`, `proximoHueco`, `HuecoVista`, `AVISO_ROJO` (Task 3); `validarHuecoNuevo`, `MAX_HUECOS_SEMANA`, `MAX_HUECOS_DIA` (Task 2); `insertarHueco`, `borrarHuecoBd`, `lunesDe`, `hhmmDeMinutos` (Task 1); `nombreSesion` (Task 3).
- Produces: acciones `anadirHueco(_: EstadoAccion, fd: FormData): Promise<EstadoAccion>` y `borrarHueco(_: EstadoAccion, fd: FormData): Promise<EstadoAccion>`.

- [ ] **Step 1: Acciones `app/(app)/semana/acciones.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import type { FilaHueco } from '@/lib/datos/filas'
import { MAX_HUECOS_DIA, MAX_HUECOS_SEMANA, validarHuecoNuevo } from '@/lib/datos/huecos'
import type { EstadoAccion } from '@/lib/estado'
import { ahoraMadrid, lunesDe } from '@/lib/fecha'
import { contexto, fecha, hora, mensajeDe, texto } from '@/lib/formulario'
import { borrarHuecoBd, insertarHueco, requerirDatos } from '@/lib/servidor/consultas'

export async function anadirHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let fila: FilaHueco
  try {
    const c = contexto(fd)
    fila = {
      id: crypto.randomUUID(),
      fecha: fecha(fd, 'fecha', 'El día'),
      inicio_min: Math.round(hora(fd, 'hora', 'La hora') * 60),
      compania: c.compania,
      lugar: c.lugar,
      minutos: c.minutosDisponibles,
    }
    validarHuecoNuevo(datos, fila, hoy)
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    const hecho = await insertarHueco(sql, fila, lunesDe(fila.fecha), { semana: MAX_HUECOS_SEMANA, dia: MAX_HUECOS_DIA })
    if (!hecho) return { error: 'Ese hueco ya no cabe: vuelve a cargar la página.' }
  } catch (e) {
    return { error: `No se ha podido guardar el hueco: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Hueco añadido.' }
}

// Borrar un hueco no borra la sesión que haya en él.
export async function borrarHueco(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const { sql } = await requerirDatos()
  try {
    await borrarHuecoBd(sql, texto(fd, 'hueco_id', 'El hueco'))
  } catch (e) {
    return { error: `No se ha podido borrar el hueco: ${mensajeDe(e)}` }
  }
  revalidatePath('/semana')
  revalidatePath('/')
  return { ok: 'Hueco borrado.' }
}
```

- [ ] **Step 2: `BotonBorrarHueco.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { borrarHueco } from './acciones'

export function BotonBorrarHueco({ id, conSesion }: { id: string; conSesion: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarHueco, null)
  const pregunta = conSesion ? '¿Borrar este hueco? La sesión que tiene se queda.' : null
  return (
    <form action={accion} onSubmit={(e) => { if (pregunta && !confirm(pregunta)) e.preventDefault() }}>
      <input type="hidden" name="hueco_id" value={id} />
      <button aria-label="Borrar hueco" className="text-stone-500" disabled={pendiente}>✕</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
```

- [ ] **Step 3: `FormularioHueco.tsx`**

```tsx
'use client'

import { useActionState, useState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MINUTOS_DISPONIBLES } from '@/lib/formulario'
import { anadirHueco } from './acciones'

// Se envía sin vaciar: añadir varios huecos seguidos solo cambia el día o la hora.
export function FormularioHueco({ dias }: { dias: string[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(anadirHueco, null)
  const [minutos, setMinutos] = useState(60)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-stone-200 bg-white p-4">
      <h2 className="font-medium">Añadir hueco</h2>
      <div className="flex gap-3">
        <label className="block flex-1">
          Día
          <select name="fecha" className={CAMPO} defaultValue={dias[0]}>
            {dias.map((d) => <option key={d} value={d}>{fechaLarga(d)}</option>)}
          </select>
        </label>
        <label className="block w-32">Hora<input type="time" name="hora" defaultValue="09:00" required className={CAMPO} /></label>
      </div>
      <fieldset>
        <legend className="font-medium">¿Con quién?</legend>
        <label className="mr-4 inline-flex items-center gap-1"><input type="radio" name="compania" value="solo" defaultChecked required /> Solo</label>
        <label className="mr-4 inline-flex items-center gap-1"><input type="radio" name="compania" value="con-gente" /> Con gente</label>
      </fieldset>
      <fieldset>
        <legend className="font-medium">¿Dónde?</legend>
        {([['casa', 'Casa'], ['rocodromo', 'Rocódromo'], ['roca', 'Roca']] as const).map(([v, t]) => (
          <label key={v} className="mr-4 inline-flex items-center gap-1">
            <input type="radio" name="lugar" value={v} defaultChecked={v === 'casa'} required onChange={() => setMinutos(v === 'casa' ? 60 : 90)} /> {t}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Minutos disponibles
        <input
          type="number" name="minutos" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={5}
          value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} required className={CAMPO}
        />
      </label>
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Añadir hueco'}</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-emerald-700">{estado.ok}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Página `app/(app)/semana/page.tsx`**

```tsx
import Link from 'next/link'
import { TARJETA } from '@/components/estilos'
import type { HuecoVista } from '@/lib/datos/semana'
import { vistaSemana } from '@/lib/datos/semana'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos, lunesDe, sumarDias } from '@/lib/fecha'
import { nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarHueco } from './BotonBorrarHueco'
import { FormularioHueco } from './FormularioHueco'

const LUGAR = { casa: 'casa', rocodromo: 'rocódromo', roca: 'roca' } as const
const COMPANIA = { solo: 'solo', 'con-gente': 'con gente' } as const

function enlacePreparar({ fila }: HuecoVista): string {
  const q = new URLSearchParams({
    fecha: fila.fecha, hora: hhmmDeMinutos(fila.inicio_min), compania: fila.compania, lugar: fila.lugar, minutos: String(fila.minutos),
  })
  return `/entrenar?${q.toString()}`
}

function Fila({ h }: { h: HuecoVista }) {
  const { fila, estado } = h
  const pasado = estado.tipo === 'pasado'
  return (
    <li className={`${TARJETA} ${pasado ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          {fechaLarga(fila.fecha)} · {hhmmDeMinutos(fila.inicio_min)} · {LUGAR[fila.lugar]} · {COMPANIA[fila.compania]} · {fila.minutos} min
        </p>
        {!pasado && <BotonBorrarHueco id={fila.id} conSesion={estado.tipo === 'ocupado'} />}
      </div>
      {estado.tipo === 'planeado' && <p className="font-medium">{nombreSesion(estado.sesion)}{estado.cargaAlta ? ' ★' : ''}</p>}
      {estado.tipo === 'libre' && <p className="text-stone-600">Libre: no hace falta entrenar.</p>}
      {estado.tipo === 'ocupado' && (
        <p>
          {nombreSesion(estado.sesion.sesion)} · {estado.registrada ? 'Registrada' : 'Aceptada'} · <Link href="/" className="underline">Ver en Hoy</Link>
        </p>
      )}
      {pasado && estado.sesion && <p className="text-sm">{nombreSesion(estado.sesion.sesion)}</p>}
      {(estado.tipo === 'planeado' || estado.tipo === 'libre' || estado.tipo === 'sin-plan') && (
        <Link href={enlacePreparar(h)} className="inline-block rounded bg-stone-900 px-3 py-1 text-sm font-medium text-white">Preparar</Link>
      )}
    </li>
  )
}

export default async function PaginaSemana({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const estaSemana = lunesDe(ahora.fecha)
  const siguiente = sumarDias(estaSemana, 7)
  const pedido = (await searchParams).lunes
  const lunes = pedido === siguiente ? siguiente : estaSemana
  const v = vistaSemana(datos, lunes, { fecha: ahora.fecha, minutos: Math.round(ahora.hora * 60) })
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d >= ahora.fecha)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mi semana</h1>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p>
          {fechaLarga(v.lunes)} – {fechaLarga(v.domingo)}
          {v.fase ? ` · ${v.fase.nombre}${v.fase.descarga ? ' (descarga)' : ''}` : ''}
        </p>
        {lunes === estaSemana
          ? <Link href={`/semana?lunes=${siguiente}`} className="underline">Semana siguiente →</Link>
          : <Link href="/semana" className="underline">← Esta semana</Link>}
      </div>
      {v.huecos.length === 0 && (
        <p className="rounded bg-sky-50 p-3 text-sm">
          Declara los huecos que tienes esta semana. Cuantos más declares, mejor reparte el motor los días intensos.
        </p>
      )}
      {v.aviso && <p className="rounded bg-amber-50 p-3 text-sm">{v.aviso}</p>}
      <ul className="space-y-3">{v.huecos.map((h) => <Fila key={h.fila.id} h={h} />)}</ul>
      {v.huecos.some((h) => h.estado.tipo === 'planeado' && h.estado.cargaAlta) && <p className="text-xs text-stone-500">★ = carga alta.</p>}
      {dias.length > 0 && <FormularioHueco dias={dias} />}
    </div>
  )
}
```

- [ ] **Step 5: Menú y Hoy**

`app/(app)/layout.tsx`: tras el enlace «Hoy», añadir `<Link href="/semana">Mi semana</Link>`.

`app/(app)/page.tsx`:
- Importar `proximoHueco` de `@/lib/datos/semana`, `hhmmDeMinutos` de `@/lib/fecha` (junto a `ahoraMadrid, fechaLarga`) y `nombreSesion` de `@/lib/nombres` (junto a `NOMBRE_ZONA`).
- Sustituir `const hoy = ahoraMadrid(new Date()).fecha` por:

```tsx
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const proximo = proximoHueco(datos, { fecha: hoy, minutos: Math.round(ahora.hora * 60) })
```

- Tras el `<h1>`:

```tsx
      {proximo && (
        <p className="text-sm">
          Próximo hueco: {fechaLarga(proximo.fila.fecha)} {hhmmDeMinutos(proximo.fila.inicio_min)} ·{' '}
          {proximo.estado.tipo === 'planeado'
            ? `${nombreSesion(proximo.estado.sesion)}${proximo.estado.cargaAlta ? ' ★' : ''}`
            : proximo.estado.tipo === 'libre' ? 'libre' : 'sin plan'}
          {' · '}<Link href="/semana" className="underline">Mi semana</Link>
        </p>
      )}
```

- [ ] **Step 6: e2e** (añadir al final de `e2e/flujo.spec.ts`; corre después del primer test, con el perfil ya creado)

```ts
test('Mi semana: declarar un hueco, prepararlo y aceptarlo', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Mi semana' }).first().click()
  await page.getByRole('link', { name: 'Semana siguiente →' }).click()
  await page.getByLabel('Hora').fill('19:00')
  await page.getByLabel('Rocódromo').check()
  await page.getByRole('button', { name: 'Añadir hueco' }).click()
  await expect(page.getByText('Hueco añadido.')).toBeVisible()
  await page.getByRole('link', { name: 'Preparar' }).first().click()
  await expect(page).toHaveURL(/\/entrenar\?/)
  await page.getByRole('button', { name: 'Preparar sesión' }).click()
  await page.getByRole('button', { name: 'Aceptar esta sesión' }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto(`/semana?lunes=${sumarDias(lunesDeEstaSemana(), 7)}`)
  await expect(page.getByText(/Aceptada/)).toBeVisible()
})
```

- [ ] **Step 7: Comprobar y commit**

Run: `npm test`, `npm run tsc` y `npm run build` → en verde. (`npm run e2e` se ejecutará cuando exista la base de Neon.)

```bash
git add "app/(app)/semana" "app/(app)/layout.tsx" "app/(app)/page.tsx" e2e/flujo.spec.ts
git commit -m "feat(semana): pantalla Mi semana, próximo hueco en Hoy y prueba e2e"
```
