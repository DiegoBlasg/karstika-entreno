# Plan semanal por huecos (tramo 2e) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando se pide una sesión con los huecos que quedan de la semana, el motor elige el reparto semanal que mejor cubre los cupos de la fase y devuelve la sesión de hoy y el plan del resto.

**Architecture:**
- `motor/semana.ts` (nuevo) hace dos cosas:
  - Valida los huecos.
  - Busca el reparto en profundidad. En cada hueco abre dos ramas, la mejor opción de carga alta y la mejor suave, y la opción de cada hueco la calcula el generador actual con el historial más lo ya elegido.
- `proponerSesion` delega en él cuando hay `huecos`. Para no crear un import circular, el generador se le pasa como función.
- Regla de seguridad nueva: una sola sesión de carga alta por día (P-68).

**Tech Stack:** TypeScript puro, vitest, vite-node.

**Spec:** `docs/superpowers/specs/2026-10-27-motor-plan-semanal-design.md`.

## Global Constraints

- `motor/` sigue puro: sin `Date.now()`, sin `Math.random()`, sin `new Date()` sin argumentos y sin `node:*` (lo comprueba `pureza.test.ts`).
- Sin `huecos`, o con `huecos: []`, `proponerSesion` devuelve exactamente lo mismo que ahora. Las 710 pruebas actuales siguen en verde salvo las que cambie la regla P-68, que hay que justificar una a una.
- Parámetros nuevos:
  - P-67, «Plan semanal por huecos»: `{ maxHuecos: 8 }`.
  - P-68, «Una sesión de carga alta por día»: `{ maxCargaAltaPorDia: 1 }`.
  - Los dos son de diseño, nivel sinEvidencia. Van en `docs/evidencia/parametros.md`, que tiene finales de línea CRLF: edítalo con python usando `newline=''`. Después, `npm run metadatos`.
- Textos y explicaciones en español. Cada explicación cita sus parámetros con `explicar()`.
- Commits con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Parámetros P-67 y P-68 y regla `seguridad.carga-alta-mismo-dia`

**Files:**
- Modify: `docs/evidencia/parametros.md`, `motor/parametros.ts`, `motor/metadatos.ts` (generado), `motor/seguridad.ts`, `motor/metadatos.test.ts`, `motor/parametros.test.ts`, `motor/seguridad.test.ts`

- [ ] **Step 1:** Añade dos filas tras P-66 en `parametros.md`, con el mismo formato de columnas que P-66:

```
| P-67 | Plan semanal por huecos | Con los huecos que quedan hasta el domingo (como mucho 8), se elige el reparto que mejor cubre los cupos de la fase, comparando en el orden de prioridad de la fase; un hueco donde se recomienda descanso queda vacío | sinEvidencia | sinEvidencia | Decisión de diseño, no basada en evidencia: evita que una sesión intensa de hoy bloquee una más prioritaria de otro día de la semana (P-14). |
| P-68 | Una sesión de carga alta por día | Como mucho 1 sesión de carga alta por día natural; con mañana y tarde, una de las dos es suave | sinEvidencia | sinEvidencia | Decisión de diseño del usuario (2026-10-27), no basada en evidencia. |
```

- [ ] **Step 2:** `npm run metadatos`. En `parametros.ts`, añade `'P-67': { maxHuecos: 8 }` y `'P-68': { maxCargaAltaPorDia: 1 }`. En `metadatos.test.ts`, las cuentas pasan a 68 parámetros y 33 de diseño. En `parametros.test.ts`, añade aserciones de la columna valor y de `VALORES`, siguiendo el patrón de P-66.

- [ ] **Step 3: Prueba de la regla** (en `seguridad.test.ts`, con la fábrica `ses` de `_fabrica.ts`):

```ts
it('P-68: como mucho una sesión de carga alta por día', () => {
  const manana = ses('m', '2026-11-10', 9, { tipo: 'multipresa-resistencia', intensidad: 'alta', duracionMin: 45, detalle: { regletaMm: 20, agarre: 'semiarqueado' } })
  const tarde = ses('t', '2026-11-10', 19, { tipo: 'via-cuerda-limite', intensidad: 'alta', duracionMin: 120 })
  const suave = ses('s', '2026-11-10', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
  expect(validarSesion(tarde, [manana], perfilExperto).map((v) => v.regla)).toContain('seguridad.carga-alta-mismo-dia')
  expect(validarSesion(suave, [manana], perfilExperto).map((v) => v.regla)).not.toContain('seguridad.carga-alta-mismo-dia')
  expect(validarSesion(tarde, [{ ...manana, fecha: '2026-11-09' }], perfilExperto).map((v) => v.regla)).not.toContain('seguridad.carga-alta-mismo-dia')
})
```

- [ ] **Step 4:** Implementa la regla en `seguridad.ts` y añádela a `REGLAS`:

```ts
// P-68: como mucho una sesión de carga alta por día natural (con mañana y tarde, una de las dos es suave).
function reglaCargaAltaMismoDia(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (!esCargaAlta(propuesta)) return []
  const otras = historial.filter((h) => h.id !== propuesta.id && h.fecha === propuesta.fecha && esCargaAlta(h))
  if (otras.length < VALORES['P-68'].maxCargaAltaPorDia) return []
  return [
    {
      regla: 'seguridad.carga-alta-mismo-dia',
      sesionIds: [propuesta.id, ...otras.map((s) => s.id)].sort(),
      mensaje: 'Ya hay una sesión de carga alta ese día: la otra tiene que ser suave.',
      explicacion: explicar('seguridad.carga-alta-mismo-dia', ['P-68'], 'Como mucho una sesión de carga alta por día; con mañana y tarde, una de las dos es suave.'),
    },
  ]
}
```

- [ ] **Step 5:** `npm test && npm run tsc`. Si falla alguna prueba antigua por P-68, compruébala: solo vale cambiarla si tenía dos sesiones de carga alta el mismo día sin que eso fuera lo que se probaba. Commit `feat(motor): una sola sesión de carga alta por día (P-68) y parámetro del plan semanal (P-67)`.

### Task 2: `motor/semana.ts`, la validación de huecos y el reparto

**Files:** Create `motor/semana.ts`, `motor/semana.test.ts`; Modify `motor/propuesta-tipos.ts`, `motor/propuesta.ts`, `motor/temporada.ts` (exportar `desdeLunes`), `motor/index.ts`.

**Interfaces:**
- `interface Hueco { fecha: string; horaInicio: number; contexto: Contexto }` en propuesta-tipos.ts
- `Peticion.huecos?: Hueco[]`
- `Propuesta.semana?: { hueco: Hueco; sesion: Sesion | null }[]`
- `validarHuecos(p: Peticion): void`
- `planificarSemana(p: Peticion, proponerEn: (q: Peticion) => Propuesta): { ranuras: Hueco[]; elegidas: (SesionPlan | null)[] }`

- [ ] **Step 1: Pruebas** (`semana.test.ts`):
  - **Validación.** Rechaza un hueco anterior a la petición, otro después del domingo de esa semana, dos huecos solapados, un hueco que pisa la petición, 3 sesiones el mismo día contando la petición, un contexto inválido y más de 8 huecos.
  - **Comportamiento sin huecos.** `huecos: []` y sin `huecos` dan lo mismo que la petición sin el campo (`toEqual`).
  - **Escenario de fuerza** con evaluación vigente y una base previa que deja el test hecho:
    - Se pide el lunes 2026-11-30 a las 9:00, en casa, 60 min.
    - Huecos: martes 19:00 con gente en el rocódromo, 120 min; miércoles 9:00 en casa, 60 min; jueves 19:00 solo en el rocódromo, 90 min.
    - Esperado: la principal del lunes no es intensa de dedos y `semana` lleva `via-cuerda-limite` el martes.
    - Sin huecos, ese mismo lunes propone multipresa intensa. Esto demuestra que el plan cambia la decisión.
  - **Determinismo.** Dos llamadas iguales dan resultados iguales.
  - **Seguridad del plan.** Con la sesión de hoy y las de `semana` metidas a la vez en el historial, `validarSesion` de cada una no da violaciones.

- [ ] **Step 2: Implementación**:

```ts
// motor/semana.ts
import { explicar, type Explicacion } from './explicacion'
import { tiposPosibles } from './contexto'
import { VALORES } from './parametros'
import type { Hueco, Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { esCargaAlta } from './seguridad'
import { desdeLunes } from './temporada'
import { diaNumero, fechaDesdeDia } from './tiempo'
import type { Sesion, TipoSesion } from './tipos'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const franja = (h: Hueco): string => `${DIAS[desdeLunes(diaNumero(h.fecha))]} por la ${h.horaInicio < 14 ? 'mañana' : 'tarde'}`
const minutosDe = (h: Hueco): number => Math.round(h.horaInicio * 60)

export function validarHuecos(p: Peticion): void { /* reglas del Step 1; mensajes en español con el hueco */ }

const cuentaPara = (s: Sesion, t: TipoSesion): boolean => s.tipo === t || (s.incluye ?? []).includes(t)

interface Candidata { elegidas: (SesionPlan | null)[]; vector: number[]; minutos: number; orden: number[]; tipos: string }

function puntuar(p: Peticion, ranuras: Hueco[], elegidas: (SesionPlan | null)[]): Candidata {
  const ultima = diaNumero(ranuras[ranuras.length - 1]!.fecha)
  const plan = elegidas.flatMap((o) => (o ? [o.sesion] : []))
  const ventana = [...p.historial, ...plan].filter((s) => { const x = diaNumero(s.fecha); return x >= ultima - 6 && x <= ultima })
  const vector = p.fase.prioridad.map((t) => Math.min(ventana.filter((s) => cuentaPara(s, t)).length, p.fase.cupos[t] ?? 0))
  const indice = (o: SesionPlan | null): number => (o ? (p.fase.prioridad.indexOf(o.sesion.tipo) + p.fase.prioridad.length + 1) % (p.fase.prioridad.length + 1) : p.fase.prioridad.length + 1)
  return {
    elegidas, vector,
    minutos: plan.reduce((a, s) => a + s.duracionMin, 0),
    orden: elegidas.map(indice),
    tipos: elegidas.map((o) => o?.sesion.tipo ?? '-').join(','),
  }
}

const lex = (a: number[], b: number[]): number => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!; return 0 }
function mejor(a: Candidata, b: Candidata): boolean {
  const v = lex(a.vector, b.vector)
  if (v !== 0) return v > 0
  if (a.minutos !== b.minutos) return a.minutos > b.minutos
  const o = lex(a.orden, b.orden)
  if (o !== 0) return o < 0
  return a.tipos < b.tipos
}

export function planificarSemana(p: Peticion, proponerEn: (q: Peticion) => Propuesta) {
  const ranuras: Hueco[] = [{ fecha: p.fecha, horaInicio: p.horaInicio, contexto: p.contexto },
    ...[...(p.huecos ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio - b.horaInicio)]
  let elegida: Candidata | undefined
  const visitar = (i: number, elegidas: (SesionPlan | null)[], historial: Sesion[]): void => {
    if (i === ranuras.length) { const c = puntuar(p, ranuras, elegidas); if (!elegida || mejor(c, elegida)) elegida = c; return }
    const h = ranuras[i]!
    const { huecos: _h, ...base } = p
    const r = proponerEn({ ...base, fecha: h.fecha, horaInicio: h.horaInicio, contexto: h.contexto, historial })
    const opciones = r.principal ? [r.principal, ...r.alternativas] : []
    const alta = opciones.find((o) => esCargaAlta(o.sesion))
    const suave = opciones.find((o) => !esCargaAlta(o.sesion))
    const ramas = opciones.length === 0 ? [null] : [alta, suave].filter((o): o is SesionPlan => o !== undefined)
    for (const o of ramas) visitar(i + 1, [...elegidas, o], o ? [...historial, { ...o.sesion, id: `semana-${i}` }] : historial)
  }
  visitar(0, [], [...p.historial])
  return { ranuras, elegidas: elegida!.elegidas }
}

export function explicacionSemana(ranuras: Hueco[], elegidas: (SesionPlan | null)[], hoySinPlan: SesionPlan | null): Explicacion { /* lista «martes por la tarde: via-cuerda-limite», nota «hoy va suave para dejar sitio a …» si hoySinPlan era de carga alta y la elegida no, y «se recalcula cada vez que pides una sesión» */ }
```

  - En `propuesta.ts`, `proponerSesion` queda así:
    1. `validarPeticion(p)`.
    2. Si no hay huecos, `return proponer(p, true)`.
    3. Si los hay: `validarHuecos(p)`; `const { ranuras, elegidas } = planificarSemana(p, (q) => proponer(q, false))`; `const r0 = proponer(p, true)`.
  - Con `const hoy = elegidas[0]`:
    - Si es `null`, devuelve `r0` con `semana`.
    - Si no, `principal = hoy` con `explicacionSemana(...)` al principio de sus explicaciones, y `alternativas` = las opciones de `r0` de tipo distinto a `hoy`, como mucho 2.
  - `semana` = `ranuras.slice(1).map((hueco, i) => ({ hueco, sesion: elegidas[i + 1]?.sesion ? { ...elegidas[i + 1]!.sesion, id: \`semana-${i + 1}\` } : null }))`.

- [ ] **Step 3:** Exporta `desdeLunes` de `temporada.ts`, y `planificarSemana`, `validarHuecos` y `Hueco` desde `index.ts`. Después, `npm test && npm run tsc`, mide el tiempo del escenario de 4 huecos con `console.time` en una prueba temporal (no se commitea) y haz commit.

### Task 3: Simulación de 16 semanas con huecos

**Files:** Create `motor/semana-simulacion.test.ts`.

- [ ] Sigue el patrón de `autorregulacion-simulacion.test.ts`, con la temporada real y `faseEnFecha`.
- [ ] **Huecos semanales:**
  - Lunes, martes, miércoles y jueves a las 9:00, en casa, 60 min.
  - Lunes y jueves a las 19:00, solo en el rocódromo, 90 min.
  - Martes a las 19:00, con gente en el rocódromo, 120 min.
- [ ] **Bucle:** para cada hueco de la semana, en orden, `proponerSesion` recibe los huecos que quedan. Se acepta la principal si existe y se registra con el RPE objetivo (`objetivoRpe`) y los minutos completos.
- [ ] **Aserciones:**
  - En las semanas de fuerza sin descarga y sin test esa semana, el martes por la tarde es `via-cuerda-limite`.
  - Ningún día tiene dos sesiones de carga alta.
  - El total de días intensos de dedos por semana no pasa del tope de novel.
  - Nada lanza.
- [ ] Imprime con `console.log`, solo si `process.env.SIMULACION` está definida, una línea por semana para la revisión de producto.
- [ ] Commit.
