# Test de dedos guiado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En el cronómetro de un test de dedos, apuntar el lastre de cada intento, calcular la carga del 7:3 con el mejor intento de hoy y guardar la evaluación al acabar.

**Architecture:** Lógica pura en `lib/cronometro/test.ts` (más un campo `intento` en los pasos); la pantalla `Cronometro` gana un modo test y un `FormularioResultadoTest` que reutiliza la acción `guardarEvaluacion`.

**Tech Stack:** Next.js 16.4, React 19, Tailwind 4, vitest 2, Playwright.

Spec: `docs/superpowers/specs/2026-10-28-app-test-guiado-design.md`. Rama: `test-guiado`. Repo: `D:\karstika-entreno`.

## Global Constraints

- Solo en sesiones `evaluacion-dedos`; el resto de sesiones se comportan exactamente igual que antes.
- Carga del 7:3 con la fórmula del motor: `lastreRepeaters(e, VALORES['P-24'].fraccion)` (60 %), nunca una fórmula propia.
- Guardar el resultado con la acción existente `guardarEvaluacion` (`app/(app)/evaluacion/acciones.ts`), con sus validaciones; no duplicarla.
- Lastre negativo = descarga. En iPhone el teclado decimal no tiene signo menos: el signo se elige con «Lastre / Descarga», nunca escribiendo «-».
- `localStorage` con la clave `cronometro:<id>:test`, siempre con try/catch; se borra al registrar.
- Todo el texto en español. No tocar `motor/`.
- `npm test`, `npm run tsc` (y en la Task 2 `npm run build`) en verde. El e2e se escribe pero no se ejecuta (sin base de datos).
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Intentos en los pasos y lógica pura del test

**Files:**
- Modify: `lib/cronometro/pasos.ts`, `lib/cronometro/pasos.test.ts`
- Create: `lib/cronometro/test.ts`, `lib/cronometro/test.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // pasos.ts: el colgado gana `intento?: { n: number; de: number }` (solo en series sin repeticiones)
  // test.ts
  export interface Intento { lastreKg: number; completado: boolean }
  export interface DatosTest { pesoKg: number; intentos: (Intento | null)[] }   // intentos[n - 1]
  export function mejorLastre(intentos: readonly (Intento | null)[]): number | null
  export function lastre73(fecha: string, pesoKg: number, mejor: number): number | null
  export function textoLastre(kg: number): string
  export function intentoAbierto(pasos: readonly Paso[], indice: number): { n: number; de: number } | null
  export function leerDatosTest(x: unknown, nIntentos: number): DatosTest | null
  ```

- [ ] **Step 1: Test del campo `intento`** (añadir dentro de `describe('pasosDeSesion', …)` en `lib/cronometro/pasos.test.ts`)

```ts
  it('los intentos del test llevan su número; las repeticiones de los repeaters, no', () => {
    const ps = pasosDeSesion(plan('evaluacion-dedos', CASA))
    expect(ps.filter((p) => p.tipo === 'colgado').map((p) => (p.tipo === 'colgado' ? p.intento : undefined))).toEqual([
      { n: 1, de: 3 }, { n: 2, de: 3 }, { n: 3, de: 3 },
    ])
    const rep = pasosDeSesion(plan('multipresa-resistencia', CASA)).filter((p) => p.tipo === 'colgado')
    expect(rep.every((p) => p.tipo === 'colgado' && p.intento === undefined)).toBe(true)
  })
```

Run: `npx vitest run lib/cronometro/pasos.test.ts` → FAIL.

- [ ] **Step 2: Implementar en `pasos.ts`**

En el tipo `Paso`, el colgado pasa a `{ tipo: 'colgado'; segundos: number; titulo: string; carga?: string; intento?: { n: number; de: number } }`. En la rama de series sin repeticiones:

```ts
      out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Intento ${s} de ${series}`, carga, intento: { n: s, de: series } })
```

Run: `npx vitest run lib/cronometro/pasos.test.ts` → PASS.

- [ ] **Step 3: Tests `lib/cronometro/test.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { construirSesion, FASES } from '../../motor'
import { pasosDeSesion } from './pasos'
import { intentoAbierto, lastre73, leerDatosTest, mejorLastre, textoLastre } from './test'

describe('mejorLastre', () => {
  it('el mayor lastre de los intentos completados', () => {
    expect(mejorLastre([{ lastreKg: 10, completado: true }, { lastreKg: 15, completado: false }, { lastreKg: 12.5, completado: true }])).toBe(12.5)
    expect(mejorLastre([{ lastreKg: -5, completado: true }, null])).toBe(-5)
    expect(mejorLastre([{ lastreKg: 15, completado: false }, null])).toBeNull()
    expect(mejorLastre([])).toBeNull()
  })
})

describe('lastre73', () => {
  it('60 % de (peso + mejor) menos el peso, hacia abajo a 0,5 kg (fórmula del motor)', () => {
    expect(lastre73('2026-11-02', 72, 15)).toBe(-20)   // 0,6 × 87 = 52,2 → −19,8 → −20
    expect(lastre73('2026-11-02', 70, 10)).toBe(-22)   // 0,6 × 80 = 48 → −22
  })
  it('si el cálculo no vale devuelve null', () => {
    expect(lastre73('2026-11-02', Number.NaN, 15)).toBeNull()
  })
})

describe('textoLastre', () => {
  it('lastre, descarga o nada, con coma decimal', () => {
    expect(textoLastre(2.5)).toBe('+2,5 kg de lastre')
    expect(textoLastre(-20)).toBe('descarga de 20 kg')
    expect(textoLastre(0)).toBe('sin lastre ni descarga')
  })
})

describe('intentoAbierto', () => {
  const pasos = pasosDeSesion(construirSesion('evaluacion-dedos', {
    fecha: '2026-11-02', horaInicio: 9, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 90 },
    perfil: { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }, historial: [], fase: FASES.fuerza,
    evaluacion: { fecha: '2026-10-01', pesoCorporalKg: 72, lastreKg: 15 },
  })!)
  // 0 bloque, 1 bloque, 2 prepárate, 3 intento 1, 4 descanso, 5 intento 2, 6 descanso, 7 intento 3, 8 bloque, 9 prepárate, 10 fallo
  it('el formulario del último intento se ve hasta el siguiente colgado o el fallo', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => intentoAbierto(pasos, i)?.n ?? null)).toEqual([
      null, null, 1, null, 2, null, 3, 3, null, null,
    ])
  })
})

describe('leerDatosTest', () => {
  it('acepta lo bien formado y descarta lo demás', () => {
    const ok = { pesoKg: 72, intentos: [{ lastreKg: 10, completado: true }, null] }
    expect(leerDatosTest(JSON.parse(JSON.stringify(ok)), 3)).toEqual(ok)
    expect(leerDatosTest(null, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 10, intentos: [] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [null, null, null, null] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [{ lastreKg: 'x', completado: true }] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [{ lastreKg: 200, completado: true }] }, 3)).toBeNull()
  })
})
```

Run: `npx vitest run lib/cronometro/test.test.ts` → FAIL (módulo no existe).

- [ ] **Step 4: Implementar `lib/cronometro/test.ts`**

```ts
// Test de dedos guiado: intentos de fuerza máxima, carga del 7:3 y lo guardado al recargar. Puro.
import { lastreRepeaters, VALORES } from '../../motor'
import type { Paso } from './pasos'

export interface Intento {
  lastreKg: number            // negativo = descarga
  completado: boolean         // aguantó los 10 s
}

export interface DatosTest {
  pesoKg: number
  intentos: (Intento | null)[] // intentos[n - 1]; null = sin apuntar
}

const PESO = { min: 30, max: 200 } as const       // los mismos rangos que guardarEvaluacion
const LASTRE = { min: -100, max: 150 } as const

export function mejorLastre(intentos: readonly (Intento | null)[]): number | null {
  const completados = intentos.filter((i): i is Intento => i !== null && i.completado).map((i) => i.lastreKg)
  return completados.length > 0 ? Math.max(...completados) : null
}

// La carga del 7:3 al 60 % del mejor intento de hoy, con la misma fórmula del motor que los repeaters (P-24).
export function lastre73(fecha: string, pesoKg: number, mejor: number): number | null {
  try {
    const kg = lastreRepeaters({ fecha, pesoCorporalKg: pesoKg, lastreKg: mejor }, VALORES['P-24'].fraccion)
    return Number.isFinite(kg) ? kg : null
  } catch {
    return null
  }
}

const fmt = (kg: number): string => String(kg).replace('.', ',')

export function textoLastre(kg: number): string {
  if (kg > 0) return `+${fmt(kg)} kg de lastre`
  if (kg < 0) return `descarga de ${fmt(-kg)} kg`
  return 'sin lastre ni descarga'
}

// El intento cuyo formulario se muestra en el paso `indice`: el último intento ya hecho, hasta que empiece otro
// colgado o el fallo.
export function intentoAbierto(pasos: readonly Paso[], indice: number): { n: number; de: number } | null {
  const actual = pasos[indice]
  if (actual?.tipo === 'colgado' || actual?.tipo === 'fallo') return null
  for (let k = Math.min(indice, pasos.length) - 1; k >= 0; k--) {
    const p = pasos[k]!
    if (p.tipo === 'colgado') return p.intento ?? null
    if (p.tipo === 'fallo') return null
  }
  return null
}

export function leerDatosTest(x: unknown, nIntentos: number): DatosTest | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const enRango = (v: unknown, r: { min: number; max: number }): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= r.min && v <= r.max
  if (!enRango(o.pesoKg, PESO) || !Array.isArray(o.intentos) || o.intentos.length > nIntentos) return null
  const intentos: (Intento | null)[] = []
  for (const i of o.intentos as unknown[]) {
    if (i === null) {
      intentos.push(null)
      continue
    }
    if (typeof i !== 'object') return null
    const { lastreKg, completado } = i as Record<string, unknown>
    if (!enRango(lastreKg, LASTRE) || typeof completado !== 'boolean') return null
    intentos.push({ lastreKg, completado })
  }
  return { pesoKg: o.pesoKg, intentos }
}
```

- [ ] **Step 5: Comprobar y commit**

Run: `npx vitest run lib/cronometro` → PASS; `npm test` y `npm run tsc` → en verde.

```bash
git add lib/cronometro/pasos.ts lib/cronometro/pasos.test.ts lib/cronometro/test.ts lib/cronometro/test.test.ts
git commit -m "feat(test-guiado): intentos en los pasos, mejor intento y carga del 7:3"
```

---

### Task 2: Modo test en la pantalla del cronómetro y e2e

**Files:**
- Create: `app/(app)/sesion/[id]/FormularioIntento.tsx`, `app/(app)/sesion/[id]/FormularioResultadoTest.tsx`
- Modify: `app/(app)/sesion/[id]/page.tsx`, `app/(app)/sesion/[id]/Cronometro.tsx`, `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: Task 1 (`DatosTest`, `Intento`, `mejorLastre`, `lastre73`, `textoLastre`, `intentoAbierto`, `leerDatosTest`; `Paso` colgado con `intento`); `guardarEvaluacion` de `app/(app)/evaluacion/acciones.ts` (lee `fecha`, `peso_corporal_kg`, `lastre_kg`, `resistencia_s` opcional ≥ 1, `tecnica` opcional 1–7; devuelve `EstadoAccion` con `ok: 'Evaluación guardada.'`).

- [ ] **Step 1: La página pasa el peso inicial y hoy**

En `page.tsx`, antes del `return` final:

```tsx
  // Peso del test: el de la última evaluación o, si no hay, el del perfil.
  const pesoInicial = datos.evaluaciones.at(-1)?.peso_corporal_kg ?? datos.perfil.peso_kg
  return <Cronometro plan={fila.propuesta} pasos={pasosDeSesion(fila.propuesta)} molestiasChequeo={molestias} hoy={hoy} pesoInicial={pesoInicial} />
```

(`cargarDatos` devuelve las evaluaciones ordenadas por fecha.)

- [ ] **Step 2: `FormularioIntento.tsx`** (controlado; sin acción de servidor)

```tsx
'use client'

import type { Intento } from '@/lib/cronometro/test'

// Lo apuntado en un intento de fuerza máxima. El signo se elige con «Lastre / Descarga»: en iPhone el teclado decimal
// no tiene signo menos.
export function FormularioIntento({ n, de, valor, alCambiar }: {
  n: number; de: number; valor: Intento | null; alCambiar: (i: Intento) => void
}) {
  const descarga = (valor?.lastreKg ?? 0) < 0
  const kg = Math.abs(valor?.lastreKg ?? 0)
  const poner = (cambios: Partial<{ kg: number; descarga: boolean; completado: boolean }>): void => {
    const k = cambios.kg ?? kg
    const d = cambios.descarga ?? descarga
    alCambiar({ lastreKg: d ? -k : k, completado: cambios.completado ?? valor?.completado ?? true })
  }
  return (
    <fieldset className="space-y-2 rounded border border-stone-200 bg-white p-3">
      <legend className="font-medium">Intento {n} de {de}</legend>
      <div className="flex gap-4 text-sm">
        <label className="inline-flex items-center gap-1"><input type="radio" checked={!descarga} onChange={() => poner({ descarga: false })} /> Lastre</label>
        <label className="inline-flex items-center gap-1"><input type="radio" checked={descarga} onChange={() => poner({ descarga: true })} /> Descarga</label>
      </div>
      <label className="block text-sm">
        Kilos
        <input
          type="number" inputMode="decimal" min={0} max={150} step={0.5} value={kg}
          onChange={(e) => poner({ kg: Math.max(0, Number(e.target.value.replace(',', '.')) || 0) })}
          className="mt-1 block w-full rounded border border-stone-300 px-3 py-2"
        />
      </label>
      <p className="text-sm">¿Aguantaste los 10 s?</p>
      <div className="flex gap-3">
        <button type="button" aria-pressed={valor?.completado === true} onClick={() => poner({ completado: true })}
          className={`rounded px-4 py-2 ${valor?.completado === true ? 'bg-emerald-700 text-white' : 'border border-stone-300'}`}>Sí</button>
        <button type="button" aria-pressed={valor?.completado === false} onClick={() => poner({ completado: false })}
          className={`rounded px-4 py-2 ${valor?.completado === false ? 'bg-red-700 text-white' : 'border border-stone-300'}`}>No</button>
      </div>
    </fieldset>
  )
}
```

- [ ] **Step 3: `FormularioResultadoTest.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarEvaluacion } from '../../evaluacion/acciones'

// Guarda la evaluación de hoy con la misma acción (y las mismas validaciones) que la pantalla Evaluación.
export function FormularioResultadoTest({ hoy, pesoKg, lastreKg, resistenciaS }: {
  hoy: string; pesoKg: number; lastreKg: number; resistenciaS: number | null
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEvaluacion, null)
  const fmt = (n: number): string => String(n).replace('.', ',')
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-sky-200 bg-sky-50 p-4">
      <h2 className="font-semibold">Resultado del test</h2>
      <input type="hidden" name="fecha" value={hoy} />
      <label className="block">Peso hoy (kg)<input name="peso_corporal_kg" type="text" defaultValue={fmt(pesoKg)} required className={CAMPO} /></label>
      <label className="block">Lastre del mejor intento (kg, negativo = descarga)<input name="lastre_kg" type="text" defaultValue={fmt(lastreKg)} required className={CAMPO} /></label>
      <label className="block">Resistencia: segundos colgado en el 7:3<input name="resistencia_s" type="text" defaultValue={resistenciaS ?? ''} className={CAMPO} /></label>
      <label className="block">
        Técnica de 1 a 7 (opcional)
        <select name="tecnica" defaultValue="" className={CAMPO}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {estado?.ok ? (
        <p className="text-sm text-emerald-700">{estado.ok}</p>
      ) : (
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar resultado'}</button>
      )}
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
```

(El campo de lastre es de texto normal, no decimal, para que en iPhone se pueda escribir el signo menos al corregirlo.)

- [ ] **Step 4: Modo test en `Cronometro.tsx`**

Cambios, sin tocar el comportamiento de las demás sesiones:

1. Props nuevas `hoy: string; pesoInicial: number`. Constantes:
   ```tsx
   const esTest = plan.sesion.tipo === 'evaluacion-dedos'
   const claveTest = `${clave}:test`
   const nIntentos = useMemo(() => pasos.filter((p) => p.tipo === 'colgado' && p.intento).length, [pasos])
   const [test, setTest] = useState<DatosTest>({ pesoKg: pesoInicial, intentos: [] })
   ```
2. Al montar (en el mismo efecto que lee el reloj o en otro), si `esTest`, leer `claveTest` con `leerDatosTest(JSON.parse(…), nIntentos)` dentro de try/catch y, si vale, `setTest`. Guardar `test` en `claveTest` cada vez que cambie mientras `empezado && !registrado.current` (try/catch). En `alRegistrar`, borrar también `claveTest`.
3. Pantalla de inicio: si `esTest`, encima del botón un campo controlado «Peso hoy (kg)» (`type="number" inputMode="decimal" step={0.1}`) que actualiza `test.pesoKg` (ignorar valores no numéricos).
4. Pantalla en marcha, si `esTest`:
   - `const abierto = intentoAbierto(pasos, estado.indice)`; si no es null, debajo de la tarjeta grande `<FormularioIntento n={abierto.n} de={abierto.de} valor={test.intentos[abierto.n - 1] ?? null} alCambiar={(i) => setTest((t) => { const intentos = [...t.intentos]; intentos[abierto.n - 1] = i; return { ...t, intentos } })} />` (rellenar con `null` los huecos anteriores para que el array no tenga agujeros: `Array.from({ length: Math.max(t.intentos.length, abierto.n) }, (_, k) => t.intentos[k] ?? null)`).
   - `const mejor = mejorLastre(test.intentos)`; si no es null, `<p>Mejor hasta ahora: {textoLastre(mejor)}</p>`.
   - Carga del 7:3: si el paso actual es `fallo`, o es `preparate` y el siguiente es `fallo`, y `mejor !== null` y `lastre73(hoy, test.pesoKg, mejor)` no es null, mostrar `Lastre para el 7:3: {textoLastre(l73)}` **en lugar** de `paso.carga`.
5. Pantalla final, si `esTest`: en lugar del párrafo «Resistencia: N s. Apúntalo en Evaluación…», si `mejor !== null` mostrar `<FormularioResultadoTest hoy={hoy} pesoKg={test.pesoKg} lastreKg={mejor} resistenciaS={estado.colgadoFalloS && estado.colgadoFalloS >= 1 ? estado.colgadoFalloS : null} />`; si no, `<p className="rounded bg-amber-50 p-3 text-sm">Sin un intento completado no hay resultado: apúntalo en Evaluación si quieres.</p>`. El registro sigue debajo, igual que ahora. Para las sesiones que no son test, el párrafo de resistencia actual se queda como está.

- [ ] **Step 5: e2e** (añadir al final de `e2e/flujo.spec.ts`)

```ts
test('test guiado: apuntar el intento, ver la carga del 7:3 y guardar el resultado', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c002'
  const sesion = { id, tipo: 'evaluacion-dedos', intensidad: 'alta', fecha: hoy, horaInicio: 22, duracionMin: 10 }
  const explicacion = { regla: 'e2e', parametros: [], evidencias: [], nivelMinimo: 'C', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [
      { nombre: 'Test máx', minutos: 5, explicacion, ejercicios: [{ nombre: 'Suspensión máxima', series: 1, trabajoS: 10, descansoSeriesS: 180, cargaTexto: 'Máximo' }] },
      { nombre: 'Resistencia', minutos: 5, explicacion, ejercicios: [{ nombre: '7:3', trabajoS: 7, descansoS: 3, cargaTexto: 'Al 60 %' }] },
    ],
    explicaciones: [],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen) values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto(`/sesion/${id}`)
  await page.getByLabel('Peso hoy (kg)').fill('70')
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate
  await page.getByRole('button', { name: 'Saltar' }).click() // intento 1
  await page.getByLabel('Kilos').fill('10')
  await page.getByRole('button', { name: 'Sí' }).click()
  await expect(page.getByText('Lastre para el 7:3: descarga de 22 kg')).toBeVisible()
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate del 7:3
  await page.getByRole('button', { name: 'No puedo más' }).click()
  await expect(page.getByText('Resultado del test')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar resultado' }).click()
  await expect(page.getByText('Evaluación guardada.')).toBeVisible()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('8')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})
```

Comprobar que `nivelMinimo: 'C'` es un `NivelMinimo` válido en `motor/niveles.ts` (si no, usar uno válido) y que los selectores coinciden con los textos reales del cronómetro (por ejemplo, si el test anterior usó `exact: true` en «Empezar»). Ajustar la hora (22) si chocara con otra sesión de hoy del archivo de e2e.

- [ ] **Step 6: Comprobar y commit**

Run: `npm test`, `npm run tsc`, `npm run build` → en verde.

```bash
git add "app/(app)/sesion" e2e/flujo.spec.ts
git commit -m "feat(test-guiado): intentos, carga del 7:3 y resultado del test en el cronómetro"
```
