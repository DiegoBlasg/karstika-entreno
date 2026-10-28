# Mejoras de Hoy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoy pide el chequeo del día, avisa si una sesión aceptada ya no encaja y deja cambiarla sin perder nada, se acorta (registro tras «Terminar», molestias plegables, «+ intento») y permite apuntar un entrenamiento no planeado.

**Architecture:** Una función nueva del motor (`motivosNoEncaja`) y funciones puras en `lib/datos` (`vistaHoy` ampliada, `datosSinReemplazada`, día permitido del entrenamiento libre); acciones de servidor nuevas en `app/(app)/_hoy/acciones.ts` y un reemplazo en `app/(app)/entrenar/acciones.ts`; componentes de cliente reutilizables (`CamposChequeo`, `CamposMolestias` plegable).

**Tech Stack:** Next.js 16.4, React 19, Tailwind 4, Neon, vitest 2, Playwright.

Spec: `docs/superpowers/specs/2026-10-28-app-mejoras-hoy-design.md`. Rama: `mejoras-hoy`. Repo: `D:\karstika-entreno`.

## Global Constraints

- Todo el texto en español. Diego usa iPhone.
- En `motor/` solo se añade `motivosNoEncaja` (y su export en `motor/index.ts`); `bloqueadaPorEstado` no cambia.
- Toda escritura valida antes con las funciones puras de `lib/datos` y pasa por `requerirDatos()`.
- Una sesión reemplazada no se borra hasta aceptar la nueva, y solo si sigue sin registrar: `sustituirSesion` en una sola sentencia.
- Entrenamiento libre: día entre hoy − 7 y hoy (`corregible`); sesión, registro e intentos en una sola transacción.
- `localStorage` siempre con try/catch.
- Los nombres de campo del servidor no cambian: `dolor_<zona>`, `alarma_<zona>`, `intento_<n>`, `sueno`, `fatiga`, `ganas`.
- Cada tarea termina con `npm test` y `npm run tsc` en verde (las de UI también `npm run build`). El e2e se escribe pero no se ejecuta (sin base de datos).
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Motor `motivosNoEncaja` y `vistaHoy` ampliada

**Files:**
- Modify: `motor/propuesta.ts`, `motor/index.ts`, `lib/datos/hoy.ts`, `lib/datos/hoy.test.ts`
- Create: `motor/no-encaja.test.ts`

**Interfaces:**
- Produces: `motivosNoEncaja(s: Sesion, e: EstadoAtleta): string[]` (export de `@/motor`); `Tarjeta.noEncaja: string[]`; `VistaHoy.pedirChequeo: boolean`.

- [ ] **Step 1: Test del motor `motor/no-encaja.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { motivosNoEncaja } from './propuesta'
import { TIPOS_SESION, type Sesion, type TipoSesion } from './tipos'
import type { EstadoAtleta, Semaforo, Zona } from './autorregulacion-tipos'

const zonas = (z: Partial<Record<Zona, Semaforo>> = {}): Record<Zona, Semaforo> =>
  ({ dedos: 'verde', muneca: 'verde', codo: 'verde', hombro: 'verde', otra: 'verde', ...z })
const estado = (z: Partial<Record<Zona, Semaforo>> = {}, chequeoBajoHoy = false): EstadoAtleta =>
  ({ zonas: zonas(z), chequeoBajoHoy } as unknown as EstadoAtleta)
const sesion = (tipo: TipoSesion, extra: Partial<Sesion> = {}): Sesion =>
  ({ id: 'x', tipo, intensidad: 'alta', fecha: '2026-11-05', horaInicio: 19, duracionMin: 60, ...extra })

describe('motivosNoEncaja', () => {
  it('en verde y sin chequeo bajo, todo encaja', () => {
    for (const t of TIPOS_SESION) expect(motivosNoEncaja(sesion(t), estado()), t).toEqual([])
  })
  it('chequeo bajo: la carga alta no encaja', () => {
    expect(motivosNoEncaja(sesion('bloque-limite'), estado({}, true))).toEqual(['Tu chequeo de hoy es bajo: hoy nada de carga alta.'])
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave' }), estado({}, true))).toEqual([])
  })
  it('una zona de carga en ámbar: sin carga alta', () => {
    expect(motivosNoEncaja(sesion('multipresa-maxima'), estado({ dedos: 'ambar' }))).toEqual(['Tienes una zona de carga en ámbar: hoy nada de carga alta.'])
  })
  it('hombro u otra zona en rojo: solo descanso', () => {
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave' }), estado({ hombro: 'rojo' }))).toEqual(['Tienes el hombro u otra zona en rojo: hoy toca descansar.'])
  })
  it('dedos en rojo: solo hombro', () => {
    expect(motivosNoEncaja(sesion('arc', { intensidad: 'suave' }), estado({ dedos: 'rojo' }))).toEqual(['Tienes dedos, muñeca o codo en rojo: hoy solo trabajo de hombro.'])
    expect(motivosNoEncaja(sesion('hombro', { intensidad: 'suave' }), estado({ dedos: 'rojo' }))).not.toContain('Tienes dedos, muñeca o codo en rojo: hoy solo trabajo de hombro.')
  })
  it('«otra zona» en ámbar: nada al límite', () => {
    expect(motivosNoEncaja(sesion('via-cuerda-limite'), estado({ otra: 'ambar' }))).toContain('Tienes «otra zona» en ámbar: hoy nada al límite.')
  })
  it('dominadas incluidas cuando hoy no tocan', () => {
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave', incluye: ['dominadas'] }), estado({ dedos: 'ambar' })))
      .toContain('Hoy no tocan dominadas: sáltate ese complemento.')
  })
})
```

Notas: comprobar los nombres reales de los tipos (`Semaforo`, `Zona`, `EstadoAtleta`) y su archivo (`motor/autorregulacion-tipos.ts`); si `EstadoAtleta` tiene más campos obligatorios, el `as unknown as EstadoAtleta` del test basta porque `restriccionesDe` solo lee `zonas` y `chequeoBajoHoy` (comprobarlo). Comprobar que `'dominadas'` es un `TipoComplemento` válido para `incluye`.

- [ ] **Step 2: Ejecutar y ver que falla** → `npx vitest run motor/no-encaja.test.ts` FAIL.

- [ ] **Step 3: Implementar en `motor/propuesta.ts`** (justo después de `bloqueadaPorEstado`; importar `type EstadoAtleta` de `./autorregulacion-tipos` si hace falta)

```ts
// Por qué una sesión ya aceptada no encajaría con el estado de hoy: la misma regla que `bloqueadaPorEstado` (P-65,
// P-45) y además las dominadas incluidas cuando hoy no tocan (P-39). Vacía si encaja.
export function motivosNoEncaja(s: Sesion, e: EstadoAtleta): string[] {
  const r = restriccionesDe(e)
  const out: string[] = []
  if (r.soloDescanso) out.push('Tienes el hombro u otra zona en rojo: hoy toca descansar.')
  else if (r.soloHombro && s.tipo !== 'hombro') out.push('Tienes dedos, muñeca o codo en rojo: hoy solo trabajo de hombro.')
  if (r.sinCargaAlta && esCargaAlta(s)) {
    out.push(e.chequeoBajoHoy ? 'Tu chequeo de hoy es bajo: hoy nada de carga alta.' : 'Tienes una zona de carga en ámbar: hoy nada de carga alta.')
  }
  if (r.sinLimite && AL_LIMITE.includes(s.tipo)) out.push('Tienes «otra zona» en ámbar: hoy nada al límite.')
  if (r.sinDominadas && (s.incluye ?? []).includes('dominadas')) out.push('Hoy no tocan dominadas: sáltate ese complemento.')
  return out
}
```

Añadir a `motor/index.ts` el export de `motivosNoEncaja` junto a `proponerSesion` (`export { motivosNoEncaja, proponerSesion } from './propuesta'`).

Añadir al test un caso de coherencia: para cada tipo de `TIPOS_SESION` y cada estado de una lista (verde, chequeo bajo, cada zona en ámbar, cada zona en rojo), si `bloqueadaPorEstado` bloquearía la sesión, `motivosNoEncaja` no está vacía. Como `bloqueadaPorEstado` no se exporta, expresarlo así: con las mismas condiciones copiadas en el test (`soloDescanso` → bloquea; `soloHombro && tipo !== 'hombro'`; `sinCargaAlta && esCargaAlta`; `sinLimite && AL_LIMITE`), usando `restriccionesDe` y `esCargaAlta` exportados.

- [ ] **Step 4: `vistaHoy` — test primero** (en `lib/datos/hoy.test.ts`)

```ts
  it('noEncaja solo en las de hoy aceptadas sin registrar; pedirChequeo si hay una sin registrar y no hay chequeo', () => {
    const aceptada = (n: number, fecha: string): FilaSesion => {
      const f = sesionFila(uuid(n), fecha, { tipo: 'bloque-limite', intensidad: 'alta' })
      return { ...f, origen: 'propuesta', propuesta: { sesion: f.sesion, bloques: [], explicaciones: [] } }
    }
    const bajo = { fecha: '2026-11-05', sueno: 1, fatiga: 1, ganas: 1, molestias: [] }
    const d = datosVacios({ sesiones: [aceptada(1, '2026-11-05'), aceptada(2, '2026-11-06')], chequeos: [bajo] })
    const v = vistaHoy(d, '2026-11-05')
    expect(v.hoy[0]?.noEncaja).toEqual(['Tu chequeo de hoy es bajo: hoy nada de carga alta.'])
    expect(v.proximas[0]?.noEncaja).toEqual([])
    expect(v.pedirChequeo).toBe(false)
    expect(vistaHoy(datosVacios({ sesiones: [aceptada(1, '2026-11-05')] }), '2026-11-05').pedirChequeo).toBe(true)
    expect(vistaHoy(datosVacios(), '2026-11-05').pedirChequeo).toBe(false)
  })
```

(Importar `type FilaSesion` de `./filas`.) Run → FAIL.

- [ ] **Step 5: Implementar en `lib/datos/hoy.ts`**

- Importar `motivosNoEncaja` del motor.
- `Tarjeta` gana `noEncaja: string[]   // con cómo llega hoy, por qué el entrenador ya no la propondría (solo hoy, aceptadas, sin registrar)`.
- `VistaHoy` gana `pedirChequeo: boolean   // hay una sesión de hoy sin registrar y aún no hay chequeo de hoy`.
- Calcular `estado` antes de las tarjetas (ya se calcula; moverlo arriba) y en cada tarjeta:
  `const noEncaja = s.fecha === fecha && fila.propuesta && !registro ? motivosNoEncaja(s, estado) : []`.
- `pedirChequeo: tarjetas.some((t) => t.fila.fecha === fecha && !t.registro) && !d.chequeos.some((c) => c.fecha === fecha)`.

Run `npx vitest run lib/datos/hoy.test.ts motor/no-encaja.test.ts` → PASS; `npm test`, `npm run tsc`.

- [ ] **Step 6: Commit**

```bash
git add motor/propuesta.ts motor/index.ts motor/no-encaja.test.ts lib/datos/hoy.ts lib/datos/hoy.test.ts
git commit -m "feat(hoy): motivos por los que una sesión aceptada ya no encaja y cuándo pedir el chequeo"
```

---

### Task 2: Reemplazar una sesión desde Entrenar

**Files:**
- Modify: `lib/datos/cambios.ts`, `lib/datos/cambios.test.ts`, `lib/formulario.ts`, `lib/formulario.test.ts`, `app/(app)/entrenar/acciones.ts`, `app/(app)/entrenar/FormularioEntrenar.tsx`, `app/(app)/entrenar/ResultadoPropuesta.tsx`, `app/(app)/entrenar/page.tsx`

**Interfaces:**
- Produces: `datosSinReemplazada(d: DatosAtleta, id: string, hoy: string): DatosAtleta`; `InicialEntrenar.reemplaza?: string`; `EstadoProponer` con `reemplaza?: string`; el formulario de aceptar lleva `reemplaza` oculto.

- [ ] **Step 1: Test** (en `lib/datos/cambios.test.ts`)

```ts
describe('datosSinReemplazada', () => {
  const HOY = '2026-11-05'
  it('quita la sesión de hoy sin registrar', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), HOY), sesionFila(uuid(2), HOY, { horaInicio: 9 })] })
    expect(datosSinReemplazada(d, uuid(1), HOY).sesiones.map((s) => s.id)).toEqual([uuid(2)])
  })
  it('rechaza la que no existe, la de otro día y la registrada', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(1), HOY), sesionFila(uuid(2), '2026-11-06')],
      registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    })
    expect(() => datosSinReemplazada(d, uuid(9), HOY)).toThrow('La sesión que querías cambiar ya no existe.')
    expect(() => datosSinReemplazada(d, uuid(2), HOY)).toThrow('Solo puedes cambiar sesiones de hoy.')
    expect(() => datosSinReemplazada(d, uuid(1), HOY)).toThrow('Esa sesión ya está registrada: no se puede cambiar.')
  })
})
```

Y en `lib/formulario.test.ts`, dentro de `describe('inicialEntrenar', …)`:

```ts
  it('reemplaza: solo un uuid', () => {
    expect(inicialEntrenar({ reemplaza: '00000000-0000-4000-8000-000000000001' }).reemplaza).toBe('00000000-0000-4000-8000-000000000001')
    expect(inicialEntrenar({ reemplaza: 'x; drop' }).reemplaza).toBeUndefined()
  })
```

Run → FAIL.

- [ ] **Step 2: Implementar**

`lib/datos/cambios.ts`:

```ts
// La sesión que se va a cambiar por otra desde Entrenar: tiene que ser de hoy y seguir sin registrar. Devuelve los
// datos sin ella para preparar la nueva como si no existiera (la vieja no se borra hasta aceptar la nueva).
export function datosSinReemplazada(d: DatosAtleta, id: string, hoy: string): DatosAtleta {
  const s = d.sesiones.find((x) => x.id === id)
  if (!s) throw new Error('La sesión que querías cambiar ya no existe.')
  if (s.fecha !== hoy) throw new Error('Solo puedes cambiar sesiones de hoy.')
  if (d.registros.some((r) => r.sesion_id === id)) throw new Error('Esa sesión ya está registrada: no se puede cambiar.')
  return sinSesion(d, id)
}
```

`lib/formulario.ts`: `InicialEntrenar` gana `reemplaza?: string`; en `inicialEntrenar`, `const r = v('reemplaza'); if (r !== undefined && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r)) out.reemplaza = r`.

`app/(app)/entrenar/acciones.ts`:
- `EstadoProponer` pasa a `{ error: string; detalle?: string } | { entrada: EntradaPeticion; prep: Preparacion; reemplaza?: string } | null`.
- En `proponer`: `const reemplaza = textoOpcional(fd, 'reemplaza')` (importar `textoOpcional`). Tras `requerirDatos()`, si hay `reemplaza`: `base = datosSinReemplazada(datos, reemplaza, hoy)` dentro de try/catch (devolver `{ error: mensajeDe(e) }`), y si no, `base = datos`. Usar `base` en lugar de `datos` en `prepararPropuesta` (con el chequeo aplicado igual que ahora). Devolver `{ entrada, prep, ...(reemplaza ? { reemplaza } : {}) }`.
- En `aceptar`: leer `reemplaza` igual; `base = reemplaza ? datosSinReemplazada(datos, reemplaza, hoy) : datos` dentro del try; usar `base` en `prepararPropuesta`, `historialMotor(base.sesiones)` y `validarDatos(conSesion(base, fila))`. Al guardar: si hay `reemplaza`, `if (!(await sustituirSesion(sql, reemplaza, fila))) return { error: 'Esa sesión ya está registrada o ya no existe: no se ha cambiado nada.' }` y después insertar los consejos con una consulta nueva o reutilizando la de `insertarSesion` (añadir en `consultas.ts` `insertarConsejos(sql, consejos: FilaConsejo[])` si hace falta); si no hay `reemplaza`, `insertarSesion` como ahora.
- `ResultadoPropuesta` recibe `reemplaza?: string` y lo pone como `<input type="hidden" name="reemplaza" value={reemplaza} />` en cada formulario de aceptar. `FormularioEntrenar` lo pasa desde `estado.reemplaza`.
- `FormularioEntrenar`: si `inicial.reemplaza`, input oculto `reemplaza` y un aviso arriba: «Vas a cambiar la sesión de hoy a las {inicial.hora}: no se borrará hasta que aceptes la nueva.».

- [ ] **Step 3: Comprobar y commit**

Run: `npm test`, `npm run tsc`, `npm run build`.

```bash
git add lib/datos/cambios.ts lib/datos/cambios.test.ts lib/formulario.ts lib/formulario.test.ts "app/(app)/entrenar" lib/servidor/consultas.ts
git commit -m "feat(entrenar): cambiar una sesión de hoy por otra sin borrarla hasta aceptar la nueva"
```

---

### Task 3: Chequeo en Hoy, aviso y «Cambiarla por otra»

**Files:**
- Create: `components/CamposChequeo.tsx`, `app/(app)/_hoy/TarjetaChequeo.tsx`
- Modify: `components/CamposMolestias.tsx`, `app/(app)/entrenar/FormularioEntrenar.tsx`, `app/(app)/_hoy/acciones.ts`, `app/(app)/_hoy/TarjetaSesion.tsx`, `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `Tarjeta.noEncaja`, `VistaHoy.pedirChequeo` (Task 1); `reemplaza` en Entrenar (Task 2).
- Produces: `CamposChequeo({ iniciales?: Molestia[] })`; `CamposMolestias({ iniciales?, plegable? })`; acción `guardarChequeoHoy(_: EstadoAccion, fd: FormData): Promise<EstadoAccion>`.

- [ ] **Step 1: `CamposMolestias` plegable**

Añadir la prop `plegable?: boolean`. Con `plegable`, un estado `abierto` que arranca en `iniciales.length > 0`; arriba, «¿Alguna molestia?» con dos radios **No** / **Sí** (sin `name`, controlados). Si `!abierto`, renderizar en su lugar `ZONAS.map((z) => <input key={z} type="hidden" name={`dolor_${z}`} value="0" />)` (sin `alarma_*`), para que `molestias(fd)` lea lo mismo que con todo a 0. Sin `plegable`, exactamente como ahora.

- [ ] **Step 2: `components/CamposChequeo.tsx`**

Mover `ESCALAS` y el bloque de selects de sueño/fatiga/ganas de `FormularioEntrenar.tsx` a este componente de cliente, que renderiza esos tres selects (mismos `name`, `defaultValue="3"`, mismas etiquetas) y `<CamposMolestias iniciales={iniciales} plegable />`. `FormularioEntrenar` lo usa dentro de su `fieldset` «¿Cómo llegas hoy?».

- [ ] **Step 3: Acción `guardarChequeoHoy`** (en `app/(app)/_hoy/acciones.ts`)

```ts
export async function guardarChequeoHoy(_previo: EstadoAccion, fd: FormData): Promise<EstadoAccion> {
  const hoy = ahoraMadrid(new Date()).fecha
  const { sql, datos } = await requerirDatos()
  let chequeo: FilaChequeo
  try {
    chequeo = {
      fecha: hoy,
      sueno: entero(fd, 'sueno', 'El sueño', 1, 5),
      fatiga: entero(fd, 'fatiga', 'La fatiga', 1, 5),
      ganas: entero(fd, 'ganas', 'Las ganas', 1, 5),
      molestias: molestias(fd),
    }
    validarDatos(conChequeo(datos, chequeo))
  } catch (e) {
    return { error: mensajeDe(e) }
  }
  try {
    await guardarChequeo(sql, chequeo)
  } catch (e) {
    return { error: `No se ha podido guardar el chequeo: ${mensajeDe(e)}` }
  }
  revalidatePath('/')
  return { ok: 'Chequeo guardado.' }
}
```

(Importar `conChequeo`, `FilaChequeo`, `guardarChequeo`.)

- [ ] **Step 4: `TarjetaChequeo.tsx`**

Componente de cliente con `useActionState(guardarChequeoHoy)` y `enviarSinVaciar`: título «¿Cómo llegas hoy?», `<CamposChequeo />`, botón **Guardar chequeo** y botón **Ahora no**. «Ahora no» oculta la tarjeta y guarda `chequeo-saltado:<hoy>` en `localStorage` (try/catch); al montar, si esa clave existe, no se muestra (leer en `useEffect` para no romper la hidratación: empezar visible y ocultar tras leer, o empezar oculto y mostrar tras leer — elegir empezar oculto para que no parpadee). Recibe `hoy` por props.

- [ ] **Step 5: Aviso en `TarjetaSesion`**

Si `tarjeta.noEncaja.length > 0`, encima del plan:

```tsx
        <div className="space-y-1 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium">Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:</p>
          <ul className="list-disc pl-5">{tarjeta.noEncaja.map((m) => <li key={m}>{m}</li>)}</ul>
          <Link href={enlaceCambiar(fila)} className="inline-block underline">Cambiarla por otra</Link>
        </div>
```

con `enlaceCambiar = (f) => \`/entrenar?${new URLSearchParams({ fecha: f.fecha, hora: hhmm(f.sesion.horaInicio), minutos: String(f.sesion.duracionMin), reemplaza: f.id })}\`` (`hhmm` ya existe en el archivo; comprobar que da `HH:MM` con dos dígitos).

- [ ] **Step 6: Hoy**

En `app/(app)/page.tsx`, si `v.pedirChequeo`, renderizar `<TarjetaChequeo hoy={hoy} />` justo debajo del `<h1>`.

- [ ] **Step 7: Comprobar y commit**

Run: `npm test`, `npm run tsc`, `npm run build`.

```bash
git add components "app/(app)/_hoy" "app/(app)/entrenar/FormularioEntrenar.tsx" "app/(app)/page.tsx"
git commit -m "feat(hoy): chequeo del día en Hoy, aviso de sesión que no encaja y cambiarla por otra"
```

---

### Task 4: Hoy más corto

**Files:**
- Modify: `app/(app)/_hoy/TarjetaSesion.tsx`, `app/(app)/_hoy/FormularioRegistro.tsx`

- [ ] **Step 1: Registro tras «Terminar»**

En `TarjetaSesion`, rama sin registro: en lugar de `{pasada && !cambiando && <FormularioRegistro … />}`, un estado `terminando` y un botón **Terminar** (estilo `BOTON`) que lo abre; con `terminando`, el formulario y un botón «Cancelar». «Hice otra cosa» y «No la hice» siguen igual. Al registrar (`alTerminar`), cerrar.

- [ ] **Step 2: Molestias plegables y «+ intento» en `FormularioRegistro`**

- `<CamposMolestias iniciales={…} plegable />` (sigue precargando las del registro previo o las del chequeo; con iniciales, arranca abierto).
- Intentos: un estado `filas` que arranca en `previo?.intentos.length ?? 0`; se pintan `filas` selects `intento_0 … intento_{filas-1}` (con el `defaultValue` de `intentoPrevio(i)`), y un botón **+ intento** (deshabilitado al llegar a `MAX_INTENTOS`). Mantener la leyenda «Intentos al límite». El servidor ya ignora los que faltan.

- [ ] **Step 3: Comprobar y commit**

Run: `npm test`, `npm run tsc`, `npm run build`. Revisar que el e2e existente sigue encontrando sus elementos: el primer test pulsa «Registrar» directamente en Hoy; ahora hay que pulsar antes **Terminar**. Actualizar en `e2e/flujo.spec.ts` los tests que registran desde Hoy (añadir `await page.getByRole('button', { name: 'Terminar' }).click()` antes de rellenar el RPE). El cronómetro tiene su propio formulario (no pasa por `TarjetaSesion`) y no cambia.

```bash
git add "app/(app)/_hoy" e2e/flujo.spec.ts
git commit -m "feat(hoy): registro tras Terminar, molestias plegables y + intento"
```

---

### Task 5: Entrenamiento no planeado y e2e

**Files:**
- Create: `app/(app)/_hoy/FormularioEntrenamientoLibre.tsx`
- Modify: `app/(app)/_hoy/acciones.ts`, `lib/servidor/consultas.ts`, `app/(app)/page.tsx`, `e2e/flujo.spec.ts`

**Interfaces:**
- Produces: acción `apuntarEntrenamiento(_: EstadoAccion, fd: FormData): Promise<EstadoAccion>`; `insertarSesionRegistrada(sql, f: FilaSesion, r: FilaRegistro, intentos: FilaIntento[]): Promise<void>`.

- [ ] **Step 1: Consulta** (en `consultas.ts`)

```ts
// Un entrenamiento no planeado: la sesión, su registro y sus intentos en una transacción.
export async function insertarSesionRegistrada(sql: Sql, f: FilaSesion, r: FilaRegistro, intentos: FilaIntento[]): Promise<void> {
  await sql.transaction([
    consultaSesion(sql, f),
    sql`insert into registros (sesion_id, rpe, duracion_min, molestias) values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb)`,
    ...intentos.map(
      (i) => sql`insert into intentos_limite (id, sesion_id, fecha, encadenado, motivo_caida) values (${i.id}, ${i.sesion_id}, ${i.fecha}, ${i.encadenado}, ${i.motivo_caida})`,
    ),
  ])
}
```

- [ ] **Step 2: Acción `apuntarEntrenamiento`** (en `_hoy/acciones.ts`)

Leer `fecha` (`fecha(fd, 'fecha', 'El día')`; si `!corregible(fecha, hoy)` → `{ error: 'Solo puedes apuntar entrenamientos de hoy o de los 7 días anteriores.' }`), `tipo`, `intensidad`, `hora`, `minutos` y el detalle de regleta como en `otraCosa`; construir `libre = filaSesionLibre({...})`; el registro con `leerRegistro(fd, libre)` (ya existe: lee `rpe`, `minutos`… **ojo**: `leerRegistro` lee los minutos reales del campo `minutos`; en este formulario la duración de la sesión y los minutos reales son el mismo dato, así que usar un solo campo `minutos` para ambos); `validarDatos(conRegistro(conSesion(datos, libre), registro, filasIntentos))`; avisos de `validarSesion(libre.sesion, historialMotor(datos.sesiones), perfilMotor(datos.perfil))` con la casilla `confirmar` igual que `otraCosa`; guardar con `insertarSesionRegistrada`; `revalidatePath('/')` y `{ ok: 'Entrenamiento apuntado.' }`.

- [ ] **Step 3: `FormularioEntrenamientoLibre.tsx`**

Plegado tras un botón «Apuntar un entrenamiento que no estaba planeado». Campos: día (`type="date"`, `min` = hoy − 7, `max` = hoy, por defecto hoy), qué hiciste (tipos sin `descanso`, como `FormularioOtraCosa`), intensidad, hora, minutos, regleta/agarre si el tipo los lleva, RPE, `<CamposMolestias plegable />` y, si el tipo lleva intentos, las filas con «+ intento» (reutilizar el mismo patrón de Task 4; si conviene, extraer un pequeño componente `CamposIntentos` compartido con `FormularioRegistro`). Avisos con «Lo hice así de todos modos» como en `FormularioOtraCosa`. Enviar con `enviarSinVaciar`. En `page.tsx`, al final de Hoy.

- [ ] **Step 4: e2e** (añadir al final de `e2e/flujo.spec.ts`)

Dos tests:
1. **Cambiar por otra:** insertar con `sqlPruebas` una sesión aceptada de hoy (`tipo: 'bloque-limite'`, `intensidad: 'alta'`, 23:00, 30 min, con una `propuesta` mínima válida como en el test del cronómetro) y borrar el chequeo de hoy (`delete from chequeos where fecha = ${hoy}`); entrar; en Hoy rellenar «¿Cómo llegas hoy?» con 1/1/1 y **Guardar chequeo**; esperar el texto «Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:»; pulsar **Cambiarla por otra**; comprobar la URL `/entrenar?…reemplaza=<id>` y el aviso «Vas a cambiar la sesión»; «Casa», **Preparar sesión**; aceptar la primera opción (`.first()`); comprobar con `sqlPruebas` que la sesión vieja ya no existe.
2. **Entrenamiento no planeado:** en Hoy, abrir el formulario, elegir «Técnica», suave, 08:00, 30 min, RPE 4, **Guardar**; esperar «Entrenamiento apuntado.».

- [ ] **Step 5: Comprobar y commit**

Run: `npm test`, `npm run tsc`, `npm run build`.

```bash
git add "app/(app)/_hoy" lib/servidor/consultas.ts "app/(app)/page.tsx" e2e/flujo.spec.ts
git commit -m "feat(hoy): apuntar un entrenamiento no planeado y e2e de las mejoras de Hoy"
```
