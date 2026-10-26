# Motor, tramo 2b: generador de sesión a demanda — Implementation Plan

> **Nota (2026-10-28):** las tareas 6 y 7 de este plan se sustituyeron por una implementación directa tras la revisión del producto (sesiones al límite, sesiones compuestas, P-14 por días naturales, carga inicial al 70 %). El estado real está en la sección «Revisión del 2026-10-28» del spec y en el código de la rama `motor-generador`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir `proponerSesion`: dado un día, una hora, un contexto, el perfil, el historial y la fase, devolver una sesión principal y dos alternativas completas (bloques, series, descansos y cargas), cada decisión con su explicación, o la recomendación de descansar.

**Architecture:** Capa nueva sobre el núcleo 2a. `plantillas.ts` construye sesiones por tipo a partir de `VALORES` (parámetros del documento); `propuesta.ts` genera candidatos, los valida con `validarContexto` y `validarSesion`, los puntúa por cupos de la fase y elige. TypeScript puro y determinista.

**Tech Stack:** TypeScript 5 (strict, `noUncheckedIndexedAccess`), vitest, Node 24.

Spec: `docs/superpowers/specs/2026-10-28-motor-generador-sesion-design.md` (léelo). Núcleo: `docs/superpowers/specs/2026-10-27-motor-nucleo-design.md`.

## Global Constraints

- `motor/` no importa React, Supabase ni `node:*`; no usa `Date.now()`, `Math.random()` ni `new Date()` sin argumentos (lo vigila `motor/pureza.test.ts`, que lee todos los ficheros de `motor/`).
- Mensajes, motivos y comentarios en español; identificadores sin tildes ni eñes.
- Imports internos sin extensión. No escribas ficheros con expresiones regulares o barras invertidas mediante heredocs de bash (el shell las colapsa): usa Write/Edit. Tampoco ejecutes scripts de Python desde `/tmp` con rutas mezcladas: usa las herramientas Edit/Write.
- Las entradas nunca se mutan. Mismas entradas, misma salida.
- Cada decisión devuelve `Explicacion` creada con `explicar(...)` (≥ 1 parámetro) o `explicarContexto(...)`.
- Si una celda de `docs/evidencia/parametros.md` no coincide con el patrón de su test, NO cambies el valor ni el documento para que encaje: para y repórtalo.
- Cada commit termina con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Antes de commitear: `npx tsc --noEmit` y `npx vitest run` deben pasar.

## File Structure

```
motor/tipos.ts              (modifica) + 'evaluacion-dedos'
motor/contexto.ts           (modifica) lugares de evaluacion-dedos
motor/seguridad.ts          (modifica) + reglaEvaluacionPrematura, evaluacion-dedos siempre intensa
motor/parametros.ts         (modifica) + P-15, P-32 y los valores de las plantillas
motor/tiempo.ts             (modifica) + fechaDesdeDia
motor/propuesta-tipos.ts    Fase, EvaluacionDedos, Ejercicio, Bloque, SesionPlan, Peticion, Propuesta
motor/fases.ts              FASE_BASE, FASE_FUERZA
motor/evaluacion.ts         fuerzaRelativa, evaluacionVigente, lastreRepeaters
motor/plantillas.ts         construirSesion, TIPOS_CON_PLANTILLA
motor/propuesta.ts          proponerSesion
motor/_fabrica.ts           (modifica) + peticion()
motor/index.ts              (modifica) exporta la API nueva
motor/*.test.ts             pruebas
docs/evidencia/parametros.md (modifica) fila P-15
docs/superpowers/specs/2026-10-28-motor-generador-sesion-design.md (modifica) ARC dura 50 min
```

---

### Task 1: Núcleo — `evaluacion-dedos` y la regla `seguridad.evaluacion-prematura`

**Files:**
- Modify: `motor/tipos.ts`, `motor/contexto.ts`, `motor/seguridad.ts`, `motor/parametros.ts`, `docs/evidencia/parametros.md` (fila P-15), `docs/superpowers/specs/2026-10-28-motor-generador-sesion-design.md`
- Modify tests: `motor/contexto.test.ts`, `motor/parametros.test.ts`, `motor/seguridad.test.ts`

**Interfaces:**
- Produces: `TipoSesion` incluye `'evaluacion-dedos'`; `VALORES['P-15'].tiposIntensosDedos` lo incluye; `VALORES['P-32'] = { diasBaseMinimos: 28 }`; regla `seguridad.evaluacion-prematura` con parámetros `P-12` y `P-32`.

- [ ] **Step 1: Escribir las pruebas nuevas de seguridad (fallan)**

Añadir al final de `motor/seguridad.test.ts`:

```ts
describe('seguridad.evaluacion-prematura', () => {
  const evaluacion = (fecha: string) => ses('e', fecha, 18, { tipo: 'evaluacion-dedos', duracionMin: 30 })
  const primera = (fecha: string) => ses('p', fecha, 18, { tipo: 'tecnica', intensidad: 'suave' })

  it('28 días desde la primera sesión pasa y 27 viola, en perfil novel', () => {
    expect(validarSesion(evaluacion('2026-10-27'), [primera('2026-09-29')], perfilNovel)).toEqual([])
    const v = validarSesion(evaluacion('2026-10-27'), [primera('2026-09-30')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.evaluacion-prematura'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12', 'P-32'])
    expect(v[0]!.sesionIds).toEqual(['e'])
  })
  it('sin historial viola en perfil novel', () => {
    expect(reglas(validarSesion(evaluacion('2026-10-27'), [], perfilNovel))).toEqual(['seguridad.evaluacion-prematura'])
  })
  it('la primera sesión es la más antigua, no la última del historial', () => {
    const historial = [primera('2026-10-20'), ses('q', '2026-09-01', 18, { tipo: 'tecnica', intensidad: 'suave' })]
    expect(validarSesion(evaluacion('2026-10-27'), historial, perfilNovel)).toEqual([])
  })
  it('no se aplica a perfiles con experiencia', () => {
    expect(validarSesion(evaluacion('2026-10-27'), [], perfilExperto)).toEqual([])
  })
  it('la evaluación cuenta como sesión intensa de dedos aunque se etiquete suave', () => {
    const ayer = ses('ayer', '2026-10-26', 18, { tipo: 'evaluacion-dedos', intensidad: 'suave' })
    const v = validarSesion(ses('hoy', '2026-10-27', 18, { tipo: 'board' }), [ayer], perfilExperto)
    expect(reglas(v)).toContain('seguridad.dedos-48h')
  })
  it('no dispara maxima-novel: es el tipo de excepción', () => {
    const v = validarSesion(evaluacion('2026-10-27'), [primera('2026-09-01')], perfilNovel)
    expect(reglas(v)).not.toContain('seguridad.maxima-novel')
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/seguridad.test.ts`
Expected: FAIL (TypeScript no reconoce `'evaluacion-dedos'`; las reglas no existen).

- [ ] **Step 3: Implementar**

1. `motor/tipos.ts`: añadir `'evaluacion-dedos'` a `TIPOS_SESION`, después de `'multipresa-maxima'`.
2. `motor/contexto.ts`: en `LUGARES` añadir `'evaluacion-dedos': CASA_O_ROCODROMO,`.
3. `motor/parametros.ts`: en `'P-15'.tiposIntensosDedos` añadir `'evaluacion-dedos'` al final; añadir `'P-32': { diasBaseMinimos: 28 },` después de `'P-16'`.
4. `docs/evidencia/parametros.md`, fila P-15: lee la celda de valor y añade «test de fuerza de dedos» a la lista de lo que cuenta como sesión intensa (conserva el resto del texto, incluidas las palabras multipresa, board, bloque, vías, pegues y campus), y añade al final de las notas ` Ampliación de diseño: el test de fuerza de dedos (evaluacion-dedos) también cuenta.` Después ejecuta `npm run metadatos` y comprueba que `git status` no muestra cambios en `motor/metadatos.ts`.
5. `motor/seguridad.ts`: añadir `'evaluacion-dedos'` al array `SIEMPRE_INTENSOS`, y antes de `const REGLAS` esta regla:

```ts
function reglaEvaluacionPrematura(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'evaluacion-dedos' || !esNovel(perfil)) return []
  const minimo = VALORES['P-32'].diasBaseMinimos
  const dias = historial.map((s) => diaNumero(s.fecha))
  if (dias.length > 0 && diaNumero(propuesta.fecha) - Math.min(...dias) >= minimo) return []
  return [
    {
      regla: 'seguridad.evaluacion-prematura',
      sesionIds: [propuesta.id],
      mensaje: `El test máximo de dedos exige al menos ${minimo} días de base desde tu primera sesión registrada.`,
      explicacion: explicar(
        'seguridad.evaluacion-prematura',
        ['P-32', 'P-12'],
        `Con poca experiencia el único esfuerzo máximo de dedos es el test, y solo tras ${minimo} días (4 semanas) de base técnica y adaptación.`,
      ),
    },
  ]
}
```

y añadir `reglaEvaluacionPrematura` al array `REGLAS`.
6. Spec 2b: en la tabla de plantillas, la fila de `arc` pasa a «calentamiento 10 min; 2 series de 15 min (10 min si hay poco tiempo) de escalada continua sin bombeo marcado, 10 min de descanso | 50 min (40 con series de 10)».

- [ ] **Step 4: Actualizar las pruebas existentes que dependen de las listas**

- `motor/contexto.test.ts`: en la tabla de las 6 combinaciones, `sinCuerda` gana `'evaluacion-dedos'` entre `'dominadas'` y `'hombro'` (queda: `'arc', 'bloque-limite', 'bloque-suave', 'board', 'campus', 'descanso', 'dominadas', 'evaluacion-dedos', 'hombro', 'multipresa-maxima', 'multipresa-resistencia', 'resistencia-4x4', 'tecnica', 'via-autoasegurada'`) y `enCasa` también (`'board', 'campus', 'descanso', 'dominadas', 'evaluacion-dedos', 'hombro', 'multipresa-maxima', 'multipresa-resistencia'`).
- `motor/parametros.test.ts`: en el test de P-15 añadir `'test de fuerza'` a `palabrasDoc`, `'evaluacion-dedos': 'test de fuerza'` a `palabraDe`, `'test de fuerza': 'evaluacion'` a `prefijoDe`, y `'evaluacion-dedos'` a la lista ordenada esperada. Añadir el test:

```ts
  it('P-32 coincide con el documento', () => {
    expect(columnas('P-32')[2]).toMatch(/^4 semanas como mínimo/)
    expect(VALORES['P-32'].diasBaseMinimos).toBe(28)
  })
```

- [ ] **Step 5: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa.

```bash
git add -A
git commit -m "feat(motor): evaluacion-dedos type and premature-evaluation safety rule

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Valores de las plantillas

**Files:**
- Modify: `motor/parametros.ts`, `motor/parametros.test.ts`

**Interfaces:**
- Produces en `VALORES` (todos `as const`):
  ```ts
  'P-02': { trabajoS: 7, descansoS: 3 }
  'P-03': { repeticionesPorSerie: 7, seriesPorBloque: 6 }
  'P-04': { semanasConUnBloque: 2, bloquesIniciales: 1, bloquesDespues: 2 }
  'P-05': { descansoEntreSeriesS: 150 }
  'P-06': { fraccionMaximaRepeaters: 0.8 }
  'P-07': { sesionesPorSemana: 2 }
  'P-08': { semanasMaximasSinReevaluar: 10 }
  'P-18': { duracionS: 10, intentos: 3, descansoS: 180 }
  'P-35': { series: 2, minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10 }
  'P-41': { minutos: 15 }
  'P-49': { minutos: 10 }
  'P-53': { minutosPrevisualizacion: 3 }
  ```

- [ ] **Step 1: Escribir los tests contra el documento (fallan)**

Añadir al final de `describe('VALORES', ...)` en `motor/parametros.test.ts`:

```ts
  it('los valores de las plantillas coinciden con el documento', () => {
    expect(columnas('P-02')[2]).toMatch(/^7 s colgado : 3 s descanso/)
    expect(VALORES['P-02']).toEqual({ trabajoS: 7, descansoS: 3 })
    expect(columnas('P-03')[2]).toMatch(/^7 repeticiones por serie, 6 series por bloque, 2 bloques/)
    expect(VALORES['P-03']).toEqual({ repeticionesPorSerie: 7, seriesPorBloque: 6 })
    expect(columnas('P-04')[2]).toMatch(/^1 bloque \(6 series × 7 repeticiones\) en las primeras 2 semanas/)
    expect(VALORES['P-04']).toEqual({ semanasConUnBloque: 2, bloquesIniciales: 1, bloquesDespues: 2 })
    expect(columnas('P-05')[2]).toMatch(/^2,5 min/)
    expect(VALORES['P-05'].descansoEntreSeriesS).toBe(150)
    expect(columnas('P-06')[2]).toMatch(/80 %/)
    expect(VALORES['P-06'].fraccionMaximaRepeaters).toBe(0.8)
    expect(columnas('P-07')[2]).toMatch(/^2 sesiones por semana/)
    expect(VALORES['P-07'].sesionesPorSemana).toBe(2)
    expect(columnas('P-08')[2]).toMatch(/nunca más de 10 seguidas/)
    expect(VALORES['P-08'].semanasMaximasSinReevaluar).toBe(10)
    expect(columnas('P-18')[2]).toMatch(/^Suspensión de 10 s; hasta 3 intentos con 3 min de descanso/)
    expect(VALORES['P-18']).toEqual({ duracionS: 10, intentos: 3, descansoS: 180 })
    expect(columnas('P-35')[2]).toMatch(/2 series de 10-15 min/)
    expect(columnas('P-35')[2]).toMatch(/10 min de descanso/)
    expect(VALORES['P-35']).toEqual({ series: 2, minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10 })
    expect(columnas('P-41')[2]).toMatch(/2 veces por semana, 15 min/)
    expect(VALORES['P-41'].minutos).toBe(15)
    expect(columnas('P-49')[2]).toMatch(/^Unos 10 min/)
    expect(VALORES['P-49'].minutos).toBe(10)
    expect(columnas('P-53')[2]).toMatch(/^Hasta 3 min/)
    expect(VALORES['P-53'].minutosPrevisualizacion).toBe(3)
  })
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/parametros.test.ts`
Expected: FAIL (propiedades inexistentes). Si falla por un patrón que no encaja con la celda real, para y repórtalo con el texto de la celda.

- [ ] **Step 3: Añadir los valores a `motor/parametros.ts`** dentro de `VALORES`, tras `'P-16'` y `'P-32'`:

```ts
  'P-02': { trabajoS: 7, descansoS: 3 },
  'P-03': { repeticionesPorSerie: 7, seriesPorBloque: 6 },
  'P-04': { semanasConUnBloque: 2, bloquesIniciales: 1, bloquesDespues: 2 },
  'P-05': { descansoEntreSeriesS: 150 },
  'P-06': { fraccionMaximaRepeaters: 0.8 },
  'P-07': { sesionesPorSemana: 2 },
  'P-08': { semanasMaximasSinReevaluar: 10 },
  'P-18': { duracionS: 10, intentos: 3, descansoS: 180 },
  'P-35': { series: 2, minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10 },
  'P-41': { minutos: 15 },
  'P-49': { minutos: 10 },
  'P-53': { minutosPrevisualizacion: 3 },
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

```bash
git add motor/parametros.ts motor/parametros.test.ts
git commit -m "feat(motor): parameter values used by session templates

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tipos de propuesta, fases, evaluación y `fechaDesdeDia`

**Files:**
- Create: `motor/propuesta-tipos.ts`, `motor/fases.ts`, `motor/fases.test.ts`, `motor/evaluacion.ts`, `motor/evaluacion.test.ts`
- Modify: `motor/tiempo.ts`, `motor/tiempo.test.ts`, `motor/_fabrica.ts`

**Interfaces:**
- Produces (`motor/propuesta-tipos.ts`):
  ```ts
  export interface Fase { id: string; nombre: string; cupos: Partial<Record<TipoSesion, number>>; prioridad: TipoSesion[]; prohibidos: TipoSesion[] }
  export interface EvaluacionDedos { fecha: string; pesoCorporalKg: number; lastreKg: number }
  export interface Ejercicio { nombre: string; series?: number; repeticiones?: number; trabajoS?: number; descansoS?: number; descansoSeriesS?: number; cargaKg?: number; cargaTexto: string; notas?: string }
  export interface Bloque { nombre: string; minutos: number; ejercicios: Ejercicio[]; explicacion: Explicacion }
  export interface SesionPlan { sesion: Sesion; bloques: Bloque[]; explicaciones: Explicacion[] }
  export interface Peticion { fecha: string; horaInicio: number; contexto: Contexto; perfil: Perfil; historial: Sesion[]; fase: Fase; evaluacion?: EvaluacionDedos }
  export interface Propuesta { principal: SesionPlan | null; alternativas: SesionPlan[]; descanso?: Explicacion; proximaVentanaIntensa?: { fecha: string; hora: number } }
  ```
- Produces (`motor/fases.ts`): `FASE_BASE`, `FASE_FUERZA` (valores exactos en el spec §3).
- Produces (`motor/evaluacion.ts`): `fuerzaRelativa(e)`, `evaluacionVigente(e, fecha)`, `lastreRepeaters(e)`.
- Produces (`motor/tiempo.ts`): `fechaDesdeDia(dia: number): string` (inversa de `diaNumero`).
- Produces (`motor/_fabrica.ts`): `peticion(extra?: Partial<Peticion>): Peticion` con martes `2026-10-27`, `horaInicio: 19`, contexto `{ compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }`, `perfilNovel`, historial vacío, `FASE_BASE`.

- [ ] **Step 1: Crear `motor/propuesta-tipos.ts`**

```ts
import type { Explicacion } from './explicacion'
import type { Contexto, Perfil, Sesion, TipoSesion } from './tipos'

export interface Fase {
  id: string
  nombre: string
  cupos: Partial<Record<TipoSesion, number>>      // sesiones deseadas por cada 7 días
  prioridad: TipoSesion[]                         // de más a menos preferida
  prohibidos: TipoSesion[]
}

export interface EvaluacionDedos {
  fecha: string                                   // 'AAAA-MM-DD'
  pesoCorporalKg: number
  lastreKg: number                                // mejor intento de 10 s; negativo si fue con descarga
}

export interface Ejercicio {
  nombre: string
  series?: number
  repeticiones?: number
  trabajoS?: number
  descansoS?: number
  descansoSeriesS?: number
  cargaKg?: number                                // lastre (negativo = descarga); ausente si va por sensación
  cargaTexto: string
  notas?: string
}

export interface Bloque {
  nombre: string
  minutos: number
  ejercicios: Ejercicio[]
  explicacion: Explicacion
}

export interface SesionPlan {
  sesion: Sesion                                  // para validar y guardar en el historial
  bloques: Bloque[]                               // la suma de minutos = sesion.duracionMin
  explicaciones: Explicacion[]                    // porqué de la elección + una por bloque
}

export interface Peticion {
  fecha: string
  horaInicio: number
  contexto: Contexto
  perfil: Perfil
  historial: Sesion[]
  fase: Fase
  evaluacion?: EvaluacionDedos
}

export interface Propuesta {
  principal: SesionPlan | null
  alternativas: SesionPlan[]                      // 0 a 2, de tipos distintos entre sí y de la principal
  descanso?: Explicacion
  proximaVentanaIntensa?: { fecha: string; hora: number }
}
```

- [ ] **Step 2: Escribir `motor/fases.test.ts` (falla) y crear `motor/fases.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { FASE_BASE, FASE_FUERZA } from './fases'

describe.each([FASE_BASE, FASE_FUERZA])('fase $id', (fase) => {
  it('ningún tipo está a la vez en prioridad y en prohibidos', () => {
    for (const t of fase.prioridad) expect(fase.prohibidos, t).not.toContain(t)
  })
  it('los cupos solo existen para tipos prioritarios y son enteros positivos', () => {
    for (const [tipo, cupo] of Object.entries(fase.cupos)) {
      expect(fase.prioridad, tipo).toContain(tipo)
      expect(Number.isInteger(cupo) && cupo! > 0, tipo).toBe(true)
    }
  })
  it('la prioridad no tiene repetidos', () => {
    expect(new Set(fase.prioridad).size).toBe(fase.prioridad.length)
  })
})

describe('FASE_BASE respeta P-32', () => {
  it('no prescribe fuerza de dedos ni board', () => {
    for (const t of ['multipresa-resistencia', 'multipresa-maxima', 'board', 'campus'] as const) {
      expect(FASE_BASE.prioridad).not.toContain(t)
      expect(FASE_BASE.prohibidos).toContain(t)
    }
  })
  it('permite el test de dedos', () => {
    expect(FASE_BASE.prioridad[0]).toBe('evaluacion-dedos')
  })
})

describe('FASE_FUERZA', () => {
  it('prioriza la multipresa de repeaters y nunca las suspensiones máximas ni el campus', () => {
    expect(FASE_FUERZA.prioridad).toContain('multipresa-resistencia')
    expect(FASE_FUERZA.prohibidos).toContain('multipresa-maxima')
    expect(FASE_FUERZA.prohibidos).toContain('campus')
  })
})
```

```ts
import type { Fase } from './propuesta-tipos'

// Fases por defecto del tramo 2b. El macrociclo (tramo 2c) definirá las fases reales.
export const FASE_BASE: Fase = {
  id: 'base-tecnica',
  nombre: 'Base técnica y adaptación',
  cupos: { 'evaluacion-dedos': 1, tecnica: 2, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'board', 'campus', 'bloque-limite',
    'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}

export const FASE_FUERZA: Fase = {
  id: 'fuerza-dedos',
  nombre: 'Fuerza de dedos',
  cupos: { 'evaluacion-dedos': 1, 'multipresa-resistencia': 2, board: 1, tecnica: 1, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'multipresa-resistencia', 'board', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'campus', 'multipresa-maxima', 'bloque-limite', 'via-cuerda-limite', 'via-autoasegurada',
    'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}
```

- [ ] **Step 3: Escribir `motor/evaluacion.test.ts` (falla) y crear `motor/evaluacion.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { evaluacionVigente, fuerzaRelativa, lastreRepeaters } from './evaluacion'
import type { EvaluacionDedos } from './propuesta-tipos'

const ev = (extra: Partial<EvaluacionDedos> = {}): EvaluacionDedos => ({
  fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30, ...extra,
})

describe('fuerzaRelativa', () => {
  it('es (peso + lastre) / peso en porcentaje', () => {
    expect(fuerzaRelativa(ev())).toBeCloseTo(142.857, 2)
    expect(fuerzaRelativa(ev({ lastreKg: 0 }))).toBe(100)
    expect(fuerzaRelativa(ev({ lastreKg: -7 }))).toBeCloseTo(90, 9)
  })
})

describe('evaluacionVigente', () => {
  it('sin evaluación no es vigente', () => {
    expect(evaluacionVigente(undefined, '2026-10-27')).toBe(false)
  })
  it('70 días pasan y 71 no (P-08: nunca más de 10 semanas)', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-08-18' }), '2026-10-27')).toBe(true)
    expect(evaluacionVigente(ev({ fecha: '2026-08-17' }), '2026-10-27')).toBe(false)
  })
  it('una evaluación del futuro no es vigente', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-10-28' }), '2026-10-27')).toBe(false)
  })
  it('el mismo día es vigente', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-10-27' }), '2026-10-27')).toBe(true)
  })
})

describe('lastreRepeaters', () => {
  it('es el 80 % de (peso + lastre) menos el peso', () => {
    expect(lastreRepeaters(ev())).toBe(10) // 0,8 × 100 − 70
  })
  it('redondea hacia abajo a 0,5 kg para no superar nunca el 80 %', () => {
    expect(lastreRepeaters(ev({ lastreKg: 31 }))).toBe(10.5) // 0,8 × 101 − 70 = 10,8
    const total = 70 + lastreRepeaters(ev({ lastreKg: 31 }))
    expect(total / (70 + 31)).toBeLessThanOrEqual(0.8)
  })
  it('devuelve negativo cuando hace falta descarga', () => {
    expect(lastreRepeaters(ev({ lastreKg: -5 }))).toBe(-18) // 0,8 × 65 − 70
  })
  it('un resultado exacto no pierde 0,5 kg por ruido de coma flotante', () => {
    expect(lastreRepeaters(ev({ pesoCorporalKg: 60, lastreKg: 15 }))).toBe(0) // 0,8 × 75 − 60
  })
  it('nunca devuelve -0', () => {
    expect(Object.is(lastreRepeaters(ev({ pesoCorporalKg: 60, lastreKg: 15 })), 0)).toBe(true)
  })
  it('lanza con datos inválidos', () => {
    expect(() => lastreRepeaters(ev({ pesoCorporalKg: 0 }))).toThrow(/pesoCorporalKg/)
    expect(() => lastreRepeaters(ev({ lastreKg: Number.NaN }))).toThrow(/lastreKg/)
    expect(() => fuerzaRelativa(ev({ pesoCorporalKg: -1 }))).toThrow(/pesoCorporalKg/)
  })
})
```

```ts
import { VALORES } from './parametros'
import type { EvaluacionDedos } from './propuesta-tipos'
import { diaNumero } from './tiempo'

function comprobar(e: EvaluacionDedos): void {
  if (!Number.isFinite(e.pesoCorporalKg) || e.pesoCorporalKg <= 0) {
    throw new Error(`pesoCorporalKg debe ser un número finito positivo: ${e.pesoCorporalKg}`)
  }
  if (!Number.isFinite(e.lastreKg)) throw new Error(`lastreKg debe ser un número finito: ${e.lastreKg}`)
}

// Resultado del test en % del peso corporal (P-17): (peso + lastre) / peso × 100.
export function fuerzaRelativa(e: EvaluacionDedos): number {
  comprobar(e)
  return ((e.pesoCorporalKg + e.lastreKg) / e.pesoCorporalKg) * 100
}

// Vigente si tiene a lo sumo 10 semanas (P-08: nunca más de 10 seguidas sin reevaluar).
export function evaluacionVigente(e: EvaluacionDedos | undefined, fecha: string): boolean {
  if (!e) return false
  const dias = diaNumero(fecha) - diaNumero(e.fecha)
  return dias >= 0 && dias <= VALORES['P-08'].semanasMaximasSinReevaluar * 7
}

// Lastre de los repeaters: 80 % de (peso + lastre del test) menos el peso (P-06), redondeado hacia abajo a 0,5 kg
// para no superar nunca el 80 %. Negativo significa descarga (banda o polea).
export function lastreRepeaters(e: EvaluacionDedos): number {
  comprobar(e)
  const total = VALORES['P-06'].fraccionMaximaRepeaters * (e.pesoCorporalKg + e.lastreKg)
  return Math.floor((total - e.pesoCorporalKg) * 2 + 1e-9) / 2 + 0
}
```

- [ ] **Step 4: `fechaDesdeDia` en `motor/tiempo.ts` y su prueba**

Añadir a `motor/tiempo.test.ts` (importando `fechaDesdeDia`):

```ts
describe('fechaDesdeDia', () => {
  it('es la inversa de diaNumero', () => {
    for (const f of ['1970-01-01', '2024-02-29', '2026-10-27', '2026-12-31', '1969-12-31']) {
      expect(fechaDesdeDia(diaNumero(f))).toBe(f)
    }
  })
  it('suma un día al cambiar de mes', () => {
    expect(fechaDesdeDia(diaNumero('2026-10-31') + 1)).toBe('2026-11-01')
  })
})
```

Añadir a `motor/tiempo.ts`:

```ts
export function fechaDesdeDia(dia: number): string {
  return new Date(dia * MS_POR_DIA).toISOString().slice(0, 10)
}
```

- [ ] **Step 5: Ayuda de pruebas `peticion()` en `motor/_fabrica.ts`**

Añadir los imports `import { FASE_BASE } from './fases'` y `import type { Peticion } from './propuesta-tipos'`, y:

```ts
export function peticion(extra: Partial<Peticion> = {}): Peticion {
  return {
    fecha: '2026-10-27',
    horaInicio: 19,
    contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 },
    perfil: perfilNovel,
    historial: [],
    fase: FASE_BASE,
    ...extra,
  }
}
```

- [ ] **Step 6: Ejecutar en orden**: primero los tests (fallan por módulos ausentes), luego implementa, luego `npx tsc --noEmit && npx vitest run` (todo pasa). Commit:

```bash
git add -A
git commit -m "feat(motor): proposal types, default phases, finger-test load and date inverse

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Plantillas, parte 1 (calentamiento, multipresa y evaluación)

**Files:**
- Create: `motor/plantillas.ts`, `motor/plantillas.test.ts`

**Interfaces:**
- Consumes: `explicar`, `VALORES`, `evaluacionVigente`, `lastreRepeaters`, tipos de `./propuesta-tipos` y `./tipos`, `peticion` y `ses` de `./_fabrica` (solo en tests).
- Produces: `construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null`. Esta tarea implementa `multipresa-resistencia` y `evaluacion-dedos`; cualquier otro tipo devuelve `null` (la tarea 5 añade el resto). Cada `SesionPlan` cumple: `sesion.id === 'propuesta-<tipo>'`, `sesion.fecha`/`horaInicio` de la petición, suma de `bloques[].minutos === sesion.duracionMin`, `explicaciones` = las de los bloques.

- [ ] **Step 1: Escribir `motor/plantillas.test.ts` (falla)**

```ts
import { describe, expect, it } from 'vitest'
import { peticion, ses } from './_fabrica'
import { construirSesion } from './plantillas'
import type { EvaluacionDedos } from './propuesta-tipos'

const evaluacion: EvaluacionDedos = { fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30 }
const multipresasPrevias = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    ses(`m${i}`, `2026-09-${String(1 + i * 3).padStart(2, '0')}`, 18, { tipo: 'multipresa-resistencia' }),
  )
const suma = (p: NonNullable<ReturnType<typeof construirSesion>>) => p.bloques.reduce((a, b) => a + b.minutos, 0)

describe('construirSesion: invariantes', () => {
  it('un tipo sin plantilla devuelve null', () => {
    expect(construirSesion('descanso', peticion())).toBeNull()
    expect(construirSesion('campus', peticion())).toBeNull()
  })
})

describe('multipresa-resistencia', () => {
  const base = () => peticion({ evaluacion, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } })

  it('al empezar (menos de 4 sesiones de multipresa) es 1 bloque: 10 + 20 = 30 min', () => {
    const plan = construirSesion('multipresa-resistencia', base())!
    expect(plan.sesion).toMatchObject({
      id: 'propuesta-multipresa-resistencia', tipo: 'multipresa-resistencia', intensidad: 'alta',
      fecha: '2026-10-27', horaInicio: 19, duracionMin: 30,
      detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 20])
    expect(suma(plan)).toBe(plan.sesion.duracionMin)
  })
  it('con 3 sesiones previas sigue siendo 1 bloque y con 4 pasa a 2: 10 + 20 + 5 + 20 = 55 min', () => {
    const tres = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(3) })!
    expect(tres.sesion.duracionMin).toBe(30)
    const cuatro = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(4) })!
    expect(cuatro.sesion.duracionMin).toBe(55)
    expect(cuatro.bloques.map((b) => b.minutos)).toEqual([10, 20, 5, 20])
    expect(suma(cuatro)).toBe(55)
  })
  it('si dos bloques no caben usa uno, y si ni uno cabe devuelve null', () => {
    const justo = { ...base(), historial: multipresasPrevias(4), contexto: { ...base().contexto, minutosDisponibles: 54 } }
    expect(construirSesion('multipresa-resistencia', justo)!.sesion.duracionMin).toBe(30)
    expect(construirSesion('multipresa-resistencia', { ...justo, contexto: { ...justo.contexto, minutosDisponibles: 55 } })!.sesion.duracionMin).toBe(55)
    expect(construirSesion('multipresa-resistencia', { ...justo, contexto: { ...justo.contexto, minutosDisponibles: 29 } })).toBeNull()
  })
  it('el bloque de repeaters usa las cifras de los parámetros', () => {
    const bloque = construirSesion('multipresa-resistencia', base())!.bloques[1]!
    const e = bloque.ejercicios[0]!
    expect(e).toMatchObject({ series: 6, repeticiones: 7, trabajoS: 7, descansoS: 3, descansoSeriesS: 150 })
    expect(e.nombre).toMatch(/20 mm/)
    expect(e.nombre).toMatch(/semiarqueado/)
  })
  it('con evaluación vigente la carga es el lastre calculado', () => {
    const e = construirSesion('multipresa-resistencia', base())!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(10)
    expect(e.cargaTexto).toBe('+10 kg de lastre')
  })
  it('un lastre fraccionario se escribe con coma y uno negativo es descarga', () => {
    const fraccion = { ...base(), evaluacion: { ...evaluacion, lastreKg: 31 } }
    expect(construirSesion('multipresa-resistencia', fraccion)!.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('+10,5 kg de lastre')
    const descarga = { ...base(), evaluacion: { ...evaluacion, lastreKg: -5 } }
    const plan = construirSesion('multipresa-resistencia', descarga)!
    expect(plan.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('descarga de 18 kg')
    expect(plan.sesion.detalle?.conCarga).toBe(false)
  })
  it('lastre cero se escribe como peso corporal', () => {
    const cero = { ...base(), evaluacion: { ...evaluacion, pesoCorporalKg: 60, lastreKg: 15 } }
    expect(construirSesion('multipresa-resistencia', cero)!.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('Solo tu peso corporal')
  })
  it('sin evaluación vigente va por esfuerzo percibido y sin cargaKg', () => {
    for (const ev of [undefined, { ...evaluacion, fecha: '2026-08-01' }]) {
      const plan = construirSesion('multipresa-resistencia', { ...base(), evaluacion: ev })!
      const e = plan.bloques[1]!.ejercicios[0]!
      expect(e.cargaKg).toBeUndefined()
      expect(e.cargaTexto).toMatch(/6–7/)
      expect(plan.sesion.detalle?.conCarga).toBe(false)
    }
  })
  it('cada bloque trae su explicación con parámetros y la sesión las reúne', () => {
    const plan = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(4) })!
    for (const b of plan.bloques) expect(b.explicacion.parametros.length).toBeGreaterThan(0)
    expect(plan.explicaciones).toEqual(plan.bloques.map((b) => b.explicacion))
    expect(plan.bloques[0]!.explicacion.parametros).toContain('P-49')
    expect(plan.bloques[1]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-01', 'P-02', 'P-03', 'P-05', 'P-06']))
  })
  it('no muta la petición', () => {
    const p = { ...base(), historial: multipresasPrevias(4) }
    const antes = structuredClone(p)
    construirSesion('multipresa-resistencia', p)
    expect(p).toEqual(antes)
  })
})

describe('evaluacion-dedos', () => {
  const base = () => peticion({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } })

  it('dura 30 min: calentamiento 10, subida progresiva 5 y test 15', () => {
    const plan = construirSesion('evaluacion-dedos', base())!
    expect(plan.sesion).toMatchObject({
      id: 'propuesta-evaluacion-dedos', tipo: 'evaluacion-dedos', intensidad: 'alta', duracionMin: 30,
      detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 5, 15])
    expect(suma(plan)).toBe(30)
  })
  it('el test son 3 intentos de 10 s con 180 s de descanso', () => {
    const e = construirSesion('evaluacion-dedos', base())!.bloques[2]!.ejercicios[0]!
    expect(e).toMatchObject({ series: 3, trabajoS: 10, descansoSeriesS: 180 })
    expect(e.notas).toMatch(/dolor/)
  })
  it('cita los parámetros del test', () => {
    const plan = construirSesion('evaluacion-dedos', base())!
    expect(plan.bloques[2]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-17', 'P-18']))
  })
  it('devuelve null si no caben 30 min', () => {
    const corto = { ...base(), contexto: { ...base().contexto, minutosDisponibles: 29 } }
    expect(construirSesion('evaluacion-dedos', corto)).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/plantillas.test.ts`
Expected: FAIL (`Cannot find module './plantillas'`).

- [ ] **Step 3: Implementar `motor/plantillas.ts`**

```ts
import { explicar } from './explicacion'
import { evaluacionVigente, lastreRepeaters } from './evaluacion'
import { VALORES } from './parametros'
import type { Bloque, Peticion, SesionPlan } from './propuesta-tipos'
import type { Sesion, TipoSesion } from './tipos'

const fmt = (x: number): string => String(x).replace('.', ',')

const CALENTAMIENTO_MIN = VALORES['P-49'].minutos
// Decisión de diseño de este tramo (no está en parametros.md): pausa entre los dos bloques de multipresa.
const PAUSA_ENTRE_BLOQUES_MIN = 5
const REGLETA_MM = VALORES['P-12'].regletaMinimaMm

function bloqueCalentamiento(): Bloque {
  return {
    nombre: 'Calentamiento específico',
    minutos: CALENTAMIENTO_MIN,
    ejercicios: [
      { nombre: 'Calentamiento de menos a más: movilidad, escalada fácil y agarres progresivos', cargaTexto: 'Esfuerzo percibido 2–4 de 10' },
    ],
    explicacion: explicar(
      'plantilla.calentamiento',
      ['P-49'],
      'Unos 10 minutos de calentamiento específico de escalada, de menos a más, antes de cualquier trabajo intenso.',
    ),
  }
}

function sesionDe(
  tipo: TipoSesion,
  p: Peticion,
  duracionMin: number,
  intensidad: Sesion['intensidad'],
  detalle?: Sesion['detalle'],
): Sesion {
  return {
    id: `propuesta-${tipo}`,
    tipo,
    intensidad,
    fecha: p.fecha,
    horaInicio: p.horaInicio,
    duracionMin,
    ...(detalle ? { detalle } : {}),
  }
}

function plan(sesion: Sesion, bloques: Bloque[]): SesionPlan {
  const suma = bloques.reduce((a, b) => a + b.minutos, 0)
  if (suma !== sesion.duracionMin) {
    throw new Error(`Los bloques de ${sesion.tipo} suman ${suma} min y la sesión dura ${sesion.duracionMin} min`)
  }
  return { sesion, bloques, explicaciones: bloques.map((b) => b.explicacion) }
}

function minutosBloqueMultipresa(): number {
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie, seriesPorBloque } = VALORES['P-03']
  const segundos =
    seriesPorBloque * repeticionesPorSerie * (trabajoS + descansoS) +
    (seriesPorBloque - 1) * VALORES['P-05'].descansoEntreSeriesS
  return Math.ceil(segundos / 60)
}

function cargaMultipresa(kg: number | undefined): string {
  if (kg === undefined) return 'Esfuerzo percibido 6–7 de 10, sin llegar al fallo'
  if (kg === 0) return 'Solo tu peso corporal'
  return kg > 0 ? `+${fmt(kg)} kg de lastre` : `descarga de ${fmt(-kg)} kg`
}

function construirMultipresa(p: Peticion): SesionPlan | null {
  const previas = p.historial.filter((s) => s.tipo === 'multipresa-resistencia').length
  const { semanasConUnBloque, bloquesIniciales, bloquesDespues } = VALORES['P-04']
  const sesionesConUnBloque = semanasConUnBloque * VALORES['P-07'].sesionesPorSemana
  const deseados = previas < sesionesConUnBloque ? bloquesIniciales : bloquesDespues
  const bloqueMin = minutosBloqueMultipresa()
  const total = (n: number): number => CALENTAMIENTO_MIN + n * bloqueMin + (n - 1) * PAUSA_ENTRE_BLOQUES_MIN
  let n = deseados
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null

  const kg = evaluacionVigente(p.evaluacion, p.fecha) ? lastreRepeaters(p.evaluacion!) : undefined
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie, seriesPorBloque } = VALORES['P-03']
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= n; i++) {
    if (i > 1) {
      bloques.push({
        nombre: 'Pausa entre bloques',
        minutos: PAUSA_ENTRE_BLOQUES_MIN,
        ejercicios: [{ nombre: 'Descanso activo suave, sin colgarte', cargaTexto: 'Esfuerzo percibido 1–2 de 10' }],
        explicacion: explicar('plantilla.pausa', ['P-05'], 'Entre bloques de multipresa se descansa para llegar fresco al segundo.'),
      })
    }
    bloques.push({
      nombre: `Bloque de repeaters ${i}`,
      minutos: bloqueMin,
      ejercicios: [
        {
          nombre: `Repeaters en regleta de ${REGLETA_MM} mm, agarre semiarqueado`,
          series: seriesPorBloque,
          repeticiones: repeticionesPorSerie,
          trabajoS,
          descansoS,
          descansoSeriesS: VALORES['P-05'].descansoEntreSeriesS,
          ...(kg !== undefined ? { cargaKg: kg } : {}),
          cargaTexto: cargaMultipresa(kg),
          notas: 'Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.',
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa',
        ['P-01', 'P-02', 'P-03', 'P-05', 'P-06', 'P-09', 'P-10'],
        'Repeaters submáximos 7 s colgado : 3 s descanso, 6 series de 7 repeticiones, 2,5 min entre series, en regleta de 20 mm semiarqueado y como mucho al 80 % de tu test.',
      ),
    })
  }
  const sesion = sesionDe('multipresa-resistencia', p, total(n), 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: kg !== undefined && kg > 0,
  })
  return plan(sesion, bloques)
}

function construirEvaluacion(p: Peticion): SesionPlan | null {
  const subidaMin = 5
  const testMin = 15
  const total = CALENTAMIENTO_MIN + subidaMin + testMin
  if (total > p.contexto.minutosDisponibles) return null
  const { duracionS, intentos, descansoS } = VALORES['P-18']
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Subida progresiva de carga',
      minutos: subidaMin,
      ejercicios: [
        {
          nombre: 'Suspensiones cortas y fáciles añadiendo lastre en escalones',
          cargaTexto: 'Esfuerzo percibido 3–6 de 10',
          notas: 'Prepara el test sin fatigarte.',
        },
      ],
      explicacion: explicar('plantilla.subida', ['P-18', 'P-49'], 'Antes del test se sube la carga en escalones tras el calentamiento.'),
    },
    {
      nombre: 'Test de fuerza máxima de dedos',
      minutos: testMin,
      ejercicios: [
        {
          nombre: `Suspensión máxima de ${duracionS} s en regleta de ${REGLETA_MM} mm, semiarqueado`,
          series: intentos,
          trabajoS: duracionS,
          descansoSeriesS: descansoS,
          cargaTexto: `Añade lastre en escalones hasta tu máximo de ${duracionS} s y apunta el mejor intento`,
          notas: 'Detente ante cualquier dolor. Vale el mejor intento completado.',
        },
      ],
      explicacion: explicar(
        'plantilla.evaluacion',
        ['P-17', 'P-18', 'P-09', 'P-10'],
        'Hasta 3 intentos de 10 s con 3 min de descanso, en regleta de 20 mm semiarqueado; el resultado se anota en % del peso corporal.',
      ),
    },
  ]
  const sesion = sesionDe('evaluacion-dedos', p, total, 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: true,
  })
  return plan(sesion, bloques)
}

export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'multipresa-resistencia':
      return construirMultipresa(p)
    case 'evaluacion-dedos':
      return construirEvaluacion(p)
    default:
      return null
  }
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. Ajusta solo el código si una expectativa de este plan resulta incorrecta; si crees que es la prueba la que está mal, repórtalo.

```bash
git add motor/plantillas.ts motor/plantillas.test.ts
git commit -m "feat(motor): session templates for finger repeaters and the finger-strength test

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Plantillas, parte 2 (board, bloque suave, técnica, ARC, hombro)

**Files:**
- Modify: `motor/plantillas.ts`, `motor/plantillas.test.ts`, `motor/fases.test.ts`

**Interfaces:**
- Produces: `construirSesion` implementa también `board` (45 min, alta), `bloque-suave` (45, suave), `tecnica` (45, suave), `arc` (50 min con series de 15; 40 con series de 10; suave) y `hombro` (20, suave). Exporta `TIPOS_CON_PLANTILLA: readonly TipoSesion[]` con los 7 tipos soportados y `bloque-suave`: `['arc', 'bloque-suave', 'board', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia', 'tecnica']`.

- [ ] **Step 1: Añadir pruebas a `motor/plantillas.test.ts` (fallan)**

```ts
import { TIPOS_CON_PLANTILLA } from './plantillas'

describe('board', () => {
  it('dura 45 min, es alta y cita P-38 (diseño)', () => {
    const plan = construirSesion('board', peticion())!
    expect(plan.sesion).toMatchObject({ id: 'propuesta-board', tipo: 'board', intensidad: 'alta', duracionMin: 45 })
    expect(plan.sesion.detalle).toBeUndefined()
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 35])
    expect(plan.bloques[1]!.ejercicios[0]).toMatchObject({ series: 5, repeticiones: 3, descansoSeriesS: 180 })
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-38')
    expect(plan.bloques[1]!.explicacion.origen).toBe('diseno')
  })
  it('devuelve null si no caben 45 min', () => {
    expect(construirSesion('board', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 44 } }))).toBeNull()
  })
})

describe('bloque-suave', () => {
  it('dura 45 min y es suave', () => {
    const plan = construirSesion('bloque-suave', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'bloque-suave', intensidad: 'suave', duracionMin: 45 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 35])
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-54')
  })
})

describe('tecnica', () => {
  it('con gente en rocódromo usa vías con cuerda de nivel cómodo', () => {
    const plan = construirSesion('tecnica', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    expect(plan.bloques[1]!.ejercicios[0]!.nombre).toMatch(/cuerda/)
  })
  it('solo usa bloque y vías autoaseguradas, nunca cuerda', () => {
    const plan = construirSesion('tecnica', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } }))!
    const texto = plan.bloques[1]!.ejercicios.map((e) => e.nombre).join(' ')
    expect(texto).toMatch(/autoasegurad/)
    expect(texto).not.toMatch(/con cuerda/)
  })
  it('incluye previsualización de 3 min y vídeo, citando P-53, P-54 y P-55', () => {
    const plan = construirSesion('tecnica', peticion())!
    const textos = plan.bloques[1]!.ejercicios.map((e) => e.nombre).join(' ')
    expect(textos).toMatch(/3 min/)
    expect(textos).toMatch(/vídeo|graba/i)
    expect(plan.bloques[1]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-53', 'P-54', 'P-55']))
  })
})

describe('arc', () => {
  it('con tiempo: 10 + 15 + 10 + 15 = 50 min', () => {
    const plan = construirSesion('arc', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'arc', intensidad: 'suave', duracionMin: 50 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 15, 10, 15])
  })
  it('con poco tiempo usa series de 10 min: 40 min', () => {
    const plan = construirSesion('arc', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 45 } }))!
    expect(plan.sesion.duracionMin).toBe(40)
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 10, 10, 10])
  })
  it('devuelve null si no caben 40 min', () => {
    expect(construirSesion('arc', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 39 } }))).toBeNull()
  })
  it('cita P-35', () => {
    expect(construirSesion('arc', peticion())!.bloques[1]!.explicacion.parametros).toContain('P-35')
  })
})

describe('hombro', () => {
  it('dura 20 min: 5 de activación y 15 de ejercicios', () => {
    const plan = construirSesion('hombro', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'hombro', intensidad: 'suave', duracionMin: 20 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([5, 15])
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-41')
  })
  it('devuelve null si no caben 20 min', () => {
    expect(construirSesion('hombro', peticion({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 19 } }))).toBeNull()
  })
})

describe('TIPOS_CON_PLANTILLA', () => {
  it('lista exactamente los tipos que construyen sesión', () => {
    expect([...TIPOS_CON_PLANTILLA].sort()).toEqual([
      'arc', 'bloque-suave', 'board', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia', 'tecnica',
    ])
    for (const t of TIPOS_CON_PLANTILLA) {
      expect(construirSesion(t, peticion({ evaluacion: undefined }))).not.toBeNull()
    }
  })
  it('todas las sesiones suman sus minutos y traen explicación por bloque', () => {
    for (const t of TIPOS_CON_PLANTILLA) {
      const plan = construirSesion(t, peticion())!
      expect(plan.bloques.reduce((a, b) => a + b.minutos, 0)).toBe(plan.sesion.duracionMin)
      expect(plan.explicaciones).toHaveLength(plan.bloques.length)
    }
  })
})
```

Y en `motor/fases.test.ts` añadir:

```ts
import { TIPOS_CON_PLANTILLA } from './plantillas'

describe.each([FASE_BASE, FASE_FUERZA])('fase $id: plantillas', (fase) => {
  it('todos los tipos prioritarios tienen plantilla', () => {
    for (const t of fase.prioridad) expect(TIPOS_CON_PLANTILLA, t).toContain(t)
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `npx vitest run motor/plantillas.test.ts motor/fases.test.ts`
Expected: FAIL (`TIPOS_CON_PLANTILLA` no existe; los tipos devuelven `null`).

- [ ] **Step 3: Implementar en `motor/plantillas.ts`**

Añadir antes de `export function construirSesion`:

```ts
// Decisiones de diseño de este tramo (duraciones de bloques que no están en parametros.md).
const BLOQUE_PRINCIPAL_MIN = 35

function bloquePrincipalMasCalentamiento(
  p: Peticion,
  nombre: string,
  ejercicios: Bloque['ejercicios'],
  explicacion: Bloque['explicacion'],
): { total: number; bloques: Bloque[] } | null {
  const total = CALENTAMIENTO_MIN + BLOQUE_PRINCIPAL_MIN
  if (total > p.contexto.minutosDisponibles) return null
  return {
    total,
    bloques: [bloqueCalentamiento(), { nombre, minutos: BLOQUE_PRINCIPAL_MIN, ejercicios, explicacion }],
  }
}

function construirBoard(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques en board por debajo del máximo',
    [
      {
        nombre: '5 bloques en board, uno o dos grados por debajo de tu límite',
        series: 5,
        repeticiones: 3,
        descansoSeriesS: 180,
        cargaTexto: 'Esfuerzo percibido 6–7 de 10',
        notas: '3 intentos por bloque con 3 min de descanso. Para ante cualquier dolor.',
      },
    ],
    explicar(
      'plantilla.board',
      ['P-38', 'P-49'],
      'En la fase de fuerza, una sesión semanal de bloques en board por debajo del máximo; cuenta como sesión intensa de dedos.',
    ),
  )
  return base && plan(sesionDe('board', p, base.total, 'alta'), base.bloques)
}

function construirBloqueSuave(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques cómodos',
    [
      {
        nombre: '4 bloques cómodos para tu nivel, variando tipos de presa',
        series: 4,
        cargaTexto: 'Esfuerzo percibido 3–5 de 10',
        notas: 'Sustituye al board cuando las 48 h entre sesiones intensas no se cumplen.',
      },
    ],
    explicar('plantilla.bloque-suave', ['P-54'], 'Variar vías y tipos de presa mantiene la práctica técnica sin cargar los dedos.'),
  )
  return base && plan(sesionDe('bloque-suave', p, base.total, 'suave'), base.bloques)
}

function construirTecnica(p: Peticion): SesionPlan | null {
  const conCuerda = p.contexto.compania === 'con-gente' && p.contexto.lugar === 'rocodromo'
  const modalidad = conCuerda ? 'Vías con cuerda de nivel cómodo' : 'Bloque y vías autoaseguradas de nivel cómodo'
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Práctica técnica',
    [
      { nombre: `${modalidad}, variando vías y tipos de presa`, series: 3, cargaTexto: 'Esfuerzo percibido 4–5 de 10' },
      {
        nombre: `Previsualiza la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes de cada intento`,
        cargaTexto: 'Sin esfuerzo',
      },
      { nombre: 'Graba al menos una vía en vídeo y revísala', cargaTexto: 'Sin esfuerzo' },
    ],
    explicar(
      'plantilla.tecnica',
      ['P-53', 'P-54', 'P-55'],
      'Práctica técnica variada, con lectura previa de hasta 3 min de la vía y vídeo para revisar la ejecución.',
    ),
  )
  return base && plan(sesionDe('tecnica', p, base.total, 'suave'), base.bloques)
}

function construirArc(p: Peticion): SesionPlan | null {
  const { series, minutosSerie, minutosSerieCorta, descansoMin } = VALORES['P-35']
  const total = (serieMin: number): number =>
    CALENTAMIENTO_MIN + series * serieMin + (series - 1) * descansoMin
  const serieMin = [minutosSerie, minutosSerieCorta].find((m) => total(m) <= p.contexto.minutosDisponibles)
  if (serieMin === undefined) return null
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= series; i++) {
    if (i > 1) {
      bloques.push({
        nombre: 'Descanso entre series',
        minutos: descansoMin,
        ejercicios: [{ nombre: 'Descanso suave, hidrátate', cargaTexto: 'Sin esfuerzo' }],
        explicacion: explicar('plantilla.arc-descanso', ['P-35'], 'Entre las series de ARC se descansa 10 minutos.'),
      })
    }
    bloques.push({
      nombre: `Serie de ARC ${i}`,
      minutos: serieMin,
      ejercicios: [
        {
          nombre: `${serieMin} min de escalada continua sin bombeo marcado`,
          cargaTexto: 'Esfuerzo percibido 3–4 de 10',
          notas: 'Si notas bombeo, baja la dificultad.',
        },
      ],
      explicacion: explicar(
        'plantilla.arc',
        ['P-35'],
        'Capacidad: 2 series de 10-15 minutos de escalada continua sin bombeo marcado, con 10 minutos de descanso.',
      ),
    })
  }
  return plan(sesionDe('arc', p, total(serieMin), 'suave'), bloques)
}

function construirHombro(p: Peticion): SesionPlan | null {
  const activacionMin = 5
  const total = activacionMin + VALORES['P-41'].minutos
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    {
      nombre: 'Movilidad y activación',
      minutos: activacionMin,
      ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular suave', cargaTexto: 'Esfuerzo percibido 2–3 de 10' }],
      explicacion: explicar('plantilla.hombro-activacion', ['P-41'], 'Se activa el hombro antes del trabajo de fuerza.'),
    },
    {
      nombre: 'Hombro y antagonistas',
      minutos: VALORES['P-41'].minutos,
      ejercicios: [
        {
          nombre: 'Ejercicios de hombro en cadena cerrada, excéntricos y de fuerza',
          cargaTexto: 'Esfuerzo percibido 5–6 de 10',
          notas: 'Extensores de dedos: opcional.',
        },
      ],
      explicacion: explicar(
        'plantilla.hombro',
        ['P-41'],
        'Hombro en cadena cerrada, excéntricos y de fuerza, 2 veces por semana y 15 minutos (la dosis es decisión de diseño).',
      ),
    },
  ]
  return plan(sesionDe('hombro', p, total, 'suave'), bloques)
}

export const TIPOS_CON_PLANTILLA: readonly TipoSesion[] = [
  'arc', 'bloque-suave', 'board', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia', 'tecnica',
]
```

y sustituir el `switch` de `construirSesion` por:

```ts
export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'multipresa-resistencia':
      return construirMultipresa(p)
    case 'evaluacion-dedos':
      return construirEvaluacion(p)
    case 'board':
      return construirBoard(p)
    case 'bloque-suave':
      return construirBloqueSuave(p)
    case 'tecnica':
      return construirTecnica(p)
    case 'arc':
      return construirArc(p)
    case 'hombro':
      return construirHombro(p)
    default:
      return null
  }
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. El test «lista exactamente los tipos» usa `peticion()` por defecto (martes, 120 min, con gente en rocódromo): todas las plantillas deben construirse.

```bash
git add motor/plantillas.ts motor/plantillas.test.ts motor/fases.test.ts
git commit -m "feat(motor): templates for board, soft boulder, technique, ARC and shoulder

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `proponerSesion`

**Files:**
- Create: `motor/propuesta.ts`, `motor/propuesta.test.ts`

**Interfaces:**
- Consumes: `tiposPosibles`, `validarContexto` (`./contexto`); `explicar`, `explicarContexto`, `Explicacion` (`./explicacion`); `evaluacionVigente` (`./evaluacion`); `construirSesion` (`./plantillas`); `esIntensaDedos`, `validarSesion` (`./seguridad`); `diaNumero`, `fechaDesdeDia`, `finHoras`, `inicioHoras`, `validarEntrada` (`./tiempo`); `VALORES`.
- Produces: `proponerSesion(p: Peticion): Propuesta` con el algoritmo del spec §6.

- [ ] **Step 1: Escribir `motor/propuesta.test.ts` (falla)**

Fechas: martes 2026-10-27, jueves 2026-10-29. `ses(id, fecha, hora, extra)` crea sesiones de 90 min.

```ts
import { describe, expect, it } from 'vitest'
import { perfilExperto, peticion, ses } from './_fabrica'
import { FASE_BASE, FASE_FUERZA } from './fases'
import { proponerSesion } from './propuesta'
import type { EvaluacionDedos } from './propuesta-tipos'

const tipos = (r: ReturnType<typeof proponerSesion>) => [r.principal, ...r.alternativas].map((x) => x?.sesion.tipo)
const evaluacionReciente: EvaluacionDedos = { fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30 }
// Sesión antigua de ARC: fija el inicio de la base (más de 28 días) sin penalizar a la técnica por repetir tipo.
const antigua = ses('antigua', '2026-09-01', 18, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 })

describe('proponerSesion: primera semana (fase base, historial vacío)', () => {
  it('propone técnica, ARC y hombro, nunca el test ni multipresa', () => {
    const r = proponerSesion(peticion())
    expect(tipos(r)).toEqual(['tecnica', 'arc', 'hombro'])
    expect(r.descanso).toBeUndefined()
    expect(r.proximaVentanaIntensa).toBeUndefined()
  })
  it('la principal explica la elección con la fase', () => {
    const r = proponerSesion(peticion())
    const e = r.principal!.explicaciones[0]!
    expect(e.regla).toBe('generador.eleccion')
    expect(e.parametros).toContain('P-30')
    expect(e.motivo).toMatch(/Base técnica y adaptación/)
    expect(e.motivo).toMatch(/2 sesión\(es\) de tecnica/)
  })
})

describe('proponerSesion: fase de fuerza', () => {
  const fuerza = (extra = {}) => peticion({ fase: FASE_FUERZA, historial: [antigua], ...extra })

  it('sin evaluación vigente propone el test de dedos, luego multipresa y board', () => {
    expect(tipos(proponerSesion(fuerza()))).toEqual(['evaluacion-dedos', 'multipresa-resistencia', 'board'])
  })
  it('con evaluación vigente propone multipresa con su carga, luego board y técnica', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente }))
    expect(tipos(r)).toEqual(['multipresa-resistencia', 'board', 'tecnica'])
    const e = r.principal!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(10)
    expect(e.cargaTexto).toBe('+10 kg de lastre')
  })
  it('en casa solo ofrece lo que se puede hacer allí', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } }))
    expect(tipos(r)).toEqual(['multipresa-resistencia', 'board', 'hombro'])
  })
  it('una evaluación caducada (71 días) vuelve a proponer el test', () => {
    const r = proponerSesion(fuerza({ evaluacion: { ...evaluacionReciente, fecha: '2026-08-17' } }))
    expect(r.principal!.sesion.tipo).toBe('evaluacion-dedos')
  })
})

describe('proponerSesion: el jueves tras un martes intenso (48 h)', () => {
  const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite' }) // termina a las 20:30
  const jueves = (hora: number) => peticion({
    fecha: '2026-10-29', horaInicio: hora, fase: FASE_FUERZA, historial: [antigua, martes],
    evaluacion: evaluacionReciente, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 },
  })

  it('a las 18:00 no hay multipresa: el board se degrada a bloque suave y se avisa de cuándo se puede', () => {
    const r = proponerSesion(jueves(18))
    expect(tipos(r)).toEqual(['bloque-suave', 'tecnica', 'arc'])
    expect(r.proximaVentanaIntensa).toEqual({ fecha: '2026-10-29', hora: 20.5 })
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/Sustituye al board/)
  })
  it('a las 20:30 ya es posible la multipresa y no hay aviso', () => {
    const r = proponerSesion(jueves(20.5))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    expect(r.proximaVentanaIntensa).toBeUndefined()
  })
  it('lo que se devuelve nunca viola las reglas al revalidarlo', async () => {
    const { validarSesion } = await import('./seguridad')
    const { validarContexto } = await import('./contexto')
    for (const hora of [18, 20.5]) {
      const p = jueves(hora)
      const r = proponerSesion(p)
      for (const plan of [r.principal!, ...r.alternativas]) {
        expect(validarSesion(plan.sesion, p.historial, p.perfil)).toEqual([])
        expect(validarContexto(plan.sesion, p.contexto)).toEqual([])
      }
    }
  })
})

describe('proponerSesion: selección', () => {
  it('prefiere el tipo con el cupo pendiente y penaliza repetir el último tipo', () => {
    const ayer = ses('ayer', '2026-10-26', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(peticion({ historial: [ayer] }))
    expect(r.principal!.sesion.tipo).toBe('arc') // técnica: 50 + 3 − 30 = 23; ARC: 102
    expect(tipos(r)).toEqual(['arc', 'hombro', 'tecnica'])
  })
  it('las alternativas son de tipos distintos entre sí y de la principal', () => {
    const r = proponerSesion(peticion())
    const t = tipos(r)
    expect(new Set(t).size).toBe(t.length)
    expect(r.alternativas.length).toBeLessThanOrEqual(2)
  })
  it('el desempate entre puntuaciones iguales es estable', () => {
    const a = proponerSesion(peticion({ fase: { ...FASE_BASE, prioridad: ['hombro', 'arc'], cupos: { hombro: 1, arc: 1 } } }))
    const b = proponerSesion(peticion({ fase: { ...FASE_BASE, prioridad: ['hombro', 'arc'], cupos: { hombro: 1, arc: 1 } } }))
    expect(tipos(a)).toEqual(tipos(b))
  })
})

describe('proponerSesion: tiempo y descanso', () => {
  it('con 25 minutos solo cabe hombro', () => {
    const r = proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 25 } }))
    expect(tipos(r)).toEqual(['hombro'])
  })
  it('con 15 minutos no hay ninguna sesión: principal nulo y descanso explicado', () => {
    const r = proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 15 } }))
    expect(r.principal).toBeNull()
    expect(r.alternativas).toEqual([])
    expect(r.descanso!.origen).toBe('contexto')
  })
  it('con todos los cupos cubiertos y mucha actividad reciente recomienda descansar, pero sigue ofreciendo sesión', () => {
    const suave = (id: string, fecha: string, tipo: 'tecnica' | 'arc' | 'hombro') =>
      ses(id, fecha, 18, { tipo, intensidad: 'suave', duracionMin: 45 })
    const historial = [
      suave('h1', '2026-10-21', 'hombro'), suave('h2', '2026-10-22', 'hombro'),
      suave('t1', '2026-10-24', 'tecnica'), suave('t2', '2026-10-25', 'tecnica'), suave('a1', '2026-10-26', 'arc'),
    ]
    const r = proponerSesion(peticion({ historial }))
    expect(r.descanso).toBeDefined()
    expect(r.descanso!.regla).toBe('generador.descanso-recomendado')
    expect(r.principal).not.toBeNull()
  })
  it('con actividad reciente pero cupos pendientes no recomienda descanso', () => {
    const historial = [
      ses('t1', '2026-10-24', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('t2', '2026-10-25', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('t3', '2026-10-26', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
    ]
    expect(proponerSesion(peticion({ historial })).descanso).toBeUndefined()
  })
})

describe('proponerSesion: entradas y propiedades', () => {
  it('lanza con una fecha inválida o una hora fuera de rango', () => {
    expect(() => proponerSesion(peticion({ fecha: '2026-02-30' }))).toThrow()
    expect(() => proponerSesion(peticion({ horaInicio: 24 }))).toThrow(/horaInicio/)
  })
  it('lanza con minutos no positivos', () => {
    expect(() => proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 0 } }))).toThrow(/minutosDisponibles/)
  })
  it('lanza con un historial inválido', () => {
    expect(() => proponerSesion(peticion({ historial: [ses('a', '2026-10-26', 25)] }))).toThrow(/horaInicio/)
  })
  it('es determinista y no muta la petición', () => {
    const p = peticion({ fase: FASE_FUERZA, historial: [antigua], evaluacion: evaluacionReciente })
    const antes = structuredClone(p)
    expect(proponerSesion(p)).toEqual(proponerSesion(p))
    expect(p).toEqual(antes)
  })
  it('perfil con experiencia: el test de dedos puede proponerse sin historial', () => {
    const r = proponerSesion(peticion({ fase: FASE_FUERZA, perfil: perfilExperto }))
    expect(r.principal!.sesion.tipo).toBe('evaluacion-dedos')
  })
  it('toda sesión propuesta trae explicaciones con parámetros', () => {
    const r = proponerSesion(peticion({ fase: FASE_FUERZA, historial: [antigua], evaluacion: evaluacionReciente }))
    for (const plan of [r.principal!, ...r.alternativas]) {
      for (const e of plan.explicaciones) expect(e.parametros.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `npx vitest run motor/propuesta.test.ts`
Expected: FAIL (`Cannot find module './propuesta'`).

- [ ] **Step 3: Implementar `motor/propuesta.ts`**

```ts
import { tiposPosibles, validarContexto } from './contexto'
import { evaluacionVigente } from './evaluacion'
import { explicar, explicarContexto, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import type { Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { construirSesion } from './plantillas'
import { esIntensaDedos, validarSesion } from './seguridad'
import { diaNumero, fechaDesdeDia, finHoras, inicioHoras, validarEntrada } from './tiempo'
import type { TipoSesion, Violacion } from './tipos'

const PENALIZACION_REPETIR = 30
const DIAS_RECIENTES = 4
const SESIONES_RECIENTES_PARA_DESCANSO = 3

interface Candidato {
  tipoPlan: TipoSesion       // el tipo de la fase (puede diferir de plan.sesion.tipo si se sustituyó)
  plan: SesionPlan
  violaciones: Violacion[]
}

interface Valido extends Candidato {
  puntuacion: number
  hechas7d: number
}

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

function evaluar(tipo: TipoSesion, p: Peticion): Candidato | null {
  const plan = construirSesion(tipo, p)
  if (!plan) return null
  const violaciones = [
    ...validarContexto(plan.sesion, p.contexto),
    ...validarSesion(plan.sesion, p.historial, p.perfil),
  ]
  return { tipoPlan: tipo, plan, violaciones }
}

function validarPeticion(p: Peticion): void {
  if (p == null) throw new Error('proponerSesion: la petición es obligatoria')
  if (p.fase == null) throw new Error('proponerSesion: la fase es obligatoria')
  if (p.contexto == null) throw new Error('proponerSesion: el contexto es obligatorio')
  if (p.perfil == null) throw new Error('proponerSesion: el perfil es obligatorio')
  if (!Array.isArray(p.historial)) throw new Error('proponerSesion: el historial debe ser un array')
  // Comprueba fecha y hora de la petición con una sesión ficticia y valida de paso todo el historial.
  validarEntrada([
    { id: 'peticion', tipo: 'descanso', intensidad: 'suave', fecha: p.fecha, horaInicio: p.horaInicio, duracionMin: 1 },
    ...p.historial,
  ])
}

function hechasEn7Dias(p: Peticion, tipo: TipoSesion): number {
  const d = diaNumero(p.fecha)
  return p.historial.filter((s) => {
    const x = diaNumero(s.fecha)
    return s.tipo === tipo && x >= d - 6 && x <= d
  }).length
}

function ultimaSesion(p: Peticion) {
  return [...p.historial]
    .sort((a, b) => inicioHoras(a) - inicioHoras(b) || comparar(a.id, b.id))
    .at(-1)
}

function explicacionEleccion(c: Valido, p: Peticion): Explicacion {
  const cupo = p.fase.cupos[c.tipoPlan] ?? 0
  const base =
    cupo > 0
      ? `La fase «${p.fase.nombre}» pide ${cupo} sesión(es) de ${c.tipoPlan} cada 7 días y llevas ${c.hechas7d}.`
      : `Opción válida según la prioridad de la fase «${p.fase.nombre}».`
  const sustitucion =
    c.plan.sesion.tipo !== c.tipoPlan
      ? ` Sustituye al ${c.tipoPlan}, que choca con las 48 h entre sesiones intensas de dedos.`
      : ''
  return explicar('generador.eleccion', ['P-30'], base + sustitucion)
}

function conEleccion(c: Valido, p: Peticion): SesionPlan {
  return { ...c.plan, explicaciones: [explicacionEleccion(c, p), ...c.plan.explicaciones] }
}

// Hora a partir de la cual vuelve a ser posible una sesión intensa de dedos: fin de la última sesión intensa
// que sigue condicionando a la petición + 48 h. Nunca se redondea hacia atrás.
function ventanaIntensa(p: Peticion): { fecha: string; hora: number } | undefined {
  const minimo = VALORES['P-14'].horasMinimasEntreSesionesIntensasDedos
  const inicio = diaNumero(p.fecha) * 24 + p.horaInicio
  const finales = p.historial
    .filter(esIntensaDedos)
    .filter((h) => inicioHoras(h) <= inicio && finHoras(h) + minimo > inicio)
    .map(finHoras)
  if (finales.length === 0) return undefined
  const t = Math.max(...finales) + minimo
  let dia = Math.floor(t / 24)
  let hora = Math.ceil((t - dia * 24) * 100 - 1e-6) / 100
  if (hora >= 24) {
    dia += 1
    hora = 0
  }
  return { fecha: fechaDesdeDia(dia), hora }
}

export function proponerSesion(p: Peticion): Propuesta {
  validarPeticion(p)
  const posibles = new Set(tiposPosibles(p.contexto))
  const vigente = evaluacionVigente(p.evaluacion, p.fecha)
  const tipos = p.fase.prioridad.filter(
    (t) =>
      t !== 'descanso' &&
      posibles.has(t) &&
      !p.fase.prohibidos.includes(t) &&
      (t !== 'evaluacion-dedos' || !vigente),
  )

  let hubo48h = false
  const candidatos: Candidato[] = []
  for (const tipo of tipos) {
    let c = evaluar(tipo, p)
    if (!c) continue
    if (c.violaciones.length > 0 && tipo === 'board') {
      if (c.violaciones.some((v) => v.regla === 'seguridad.dedos-48h')) hubo48h = true
      const suave = evaluar('bloque-suave', p)
      if (suave) c = { ...suave, tipoPlan: tipo }
    }
    if (c.violaciones.some((v) => v.regla === 'seguridad.dedos-48h')) hubo48h = true
    if (c.violaciones.length === 0) candidatos.push(c)
  }

  const ultima = ultimaSesion(p)
  const validos: Valido[] = candidatos
    .map((c) => {
      const cupo = p.fase.cupos[c.tipoPlan] ?? 0
      const hechas7d = hechasEn7Dias(p, c.tipoPlan)
      const pendiente = cupo > 0 ? (100 * Math.max(0, cupo - hechas7d)) / cupo : 0
      const prioridad = p.fase.prioridad.length - p.fase.prioridad.indexOf(c.tipoPlan)
      const repetir = ultima && ultima.tipo === c.plan.sesion.tipo ? PENALIZACION_REPETIR : 0
      return { ...c, hechas7d, puntuacion: pendiente + prioridad - repetir }
    })
    .sort(
      (a, b) => b.puntuacion - a.puntuacion || comparar(a.plan.sesion.tipo, b.plan.sesion.tipo),
    )

  const elegidos: Valido[] = []
  for (const v of validos) {
    if (elegidos.length === 3) break
    if (elegidos.some((e) => e.plan.sesion.tipo === v.plan.sesion.tipo)) continue
    elegidos.push(v)
  }

  const principal = elegidos[0] ? conEleccion(elegidos[0], p) : null
  const alternativas = elegidos.slice(1).map((v) => conEleccion(v, p))

  let descanso: Explicacion | undefined
  if (validos.length === 0) {
    descanso = hubo48h
      ? explicar(
          'generador.descanso',
          ['P-14', 'P-15'],
          'Hoy no hay ninguna sesión posible: faltan horas de descanso desde tu última sesión intensa de dedos.',
        )
      : explicarContexto('contexto.sin-opciones', 'Con este contexto y esta fase no hay ninguna sesión posible hoy.')
  } else {
    const d = diaNumero(p.fecha)
    const recientes = p.historial.filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= d - DIAS_RECIENTES && x <= d - 1
    }).length
    const cuposCubiertos = validos.every((v) => {
      const cupo = p.fase.cupos[v.tipoPlan] ?? 0
      return cupo === 0 || v.hechas7d >= cupo
    })
    if (recientes >= SESIONES_RECIENTES_PARA_DESCANSO && cuposCubiertos) {
      descanso = explicar(
        'generador.descanso-recomendado',
        ['P-16'],
        `Llevas ${recientes} sesiones en los últimos ${DIAS_RECIENTES} días y los cupos de la fase están cubiertos: hoy es buen día para descansar.`,
      )
    }
  }

  const ventana = hubo48h ? ventanaIntensa(p) : undefined
  return {
    principal,
    alternativas,
    ...(descanso ? { descanso } : {}),
    ...(ventana ? { proximaVentanaIntensa: ventana } : {}),
  }
}
```

- [ ] **Step 4: Verificar y commitear**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa. Si una expectativa numérica de este plan no coincide con lo que produce el algoritmo del spec §6, repórtalo con el cálculo; no cambies reglas de seguridad para que encaje.

```bash
git add motor/propuesta.ts motor/propuesta.test.ts
git commit -m "feat(motor): on-demand session generator (proponerSesion)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: API pública, propiedades y escenario real

**Files:**
- Modify: `motor/index.ts`
- Create: `motor/propuesta-propiedades.test.ts`, `motor/propuesta-escenario.test.ts`

**Interfaces:**
- Produces (`motor/index.ts`): exporta además `proponerSesion`, `construirSesion`, `TIPOS_CON_PLANTILLA`, `FASE_BASE`, `FASE_FUERZA`, `fuerzaRelativa`, `evaluacionVigente`, `lastreRepeaters`, `fechaDesdeDia`, y los tipos `Fase`, `EvaluacionDedos`, `Ejercicio`, `Bloque`, `SesionPlan`, `Peticion`, `Propuesta`.

- [ ] **Step 1: Ampliar `motor/index.ts`** con:

```ts
export { proponerSesion } from './propuesta'
export { construirSesion, TIPOS_CON_PLANTILLA } from './plantillas'
export { FASE_BASE, FASE_FUERZA } from './fases'
export { fuerzaRelativa, evaluacionVigente, lastreRepeaters } from './evaluacion'
export { fechaDesdeDia } from './tiempo'
export type {
  Bloque, Ejercicio, EvaluacionDedos, Fase, Peticion, Propuesta, SesionPlan,
} from './propuesta-tipos'
```

(la línea existente de `./tiempo` pasa a incluir `fechaDesdeDia`; no dejes dos exports del mismo nombre.)

- [ ] **Step 2: `motor/propuesta-propiedades.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, peticion, ses } from './_fabrica'
import { FASE_BASE, FASE_FUERZA, proponerSesion, validarContexto, validarSesion } from './index'
import type { Peticion } from './index'

const historial = [
  ses('h1', '2026-09-01', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
  ses('h2', '2026-10-20', 19, { tipo: 'multipresa-resistencia', detalle: { regletaMm: 20, agarre: 'semiarqueado' } }),
  ses('h3', '2026-10-26', 19, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 }),
]
const evaluacion = { fecha: '2026-10-15', pesoCorporalKg: 70, lastreKg: 25 }

const escenarios: Peticion[] = []
for (const fase of [FASE_BASE, FASE_FUERZA]) {
  for (const perfil of [perfilNovel, perfilExperto]) {
    for (const compania of ['solo', 'con-gente'] as const) {
      for (const lugar of ['rocodromo', 'roca', 'casa'] as const) {
        for (const minutosDisponibles of [15, 45, 120]) {
          for (const horaInicio of [8, 19.5]) {
            escenarios.push(peticion({
              fase, perfil, horaInicio, historial, evaluacion,
              contexto: { compania, lugar, minutosDisponibles },
            }))
          }
        }
      }
    }
  }
}

describe('propiedades de proponerSesion (todas las combinaciones)', () => {
  it('hay un número razonable de escenarios', () => {
    expect(escenarios.length).toBe(2 * 2 * 2 * 3 * 3 * 2)
  })
  it('es determinista y no muta la petición', () => {
    for (const p of escenarios) {
      const antes = structuredClone(p)
      expect(proponerSesion(p)).toEqual(proponerSesion(p))
      expect(p).toEqual(antes)
    }
  })
  it('toda sesión propuesta supera contexto y seguridad al revalidarla', () => {
    for (const p of escenarios) {
      const r = proponerSesion(p)
      for (const plan of [...(r.principal ? [r.principal] : []), ...r.alternativas]) {
        expect(validarContexto(plan.sesion, p.contexto), JSON.stringify(plan.sesion)).toEqual([])
        expect(validarSesion(plan.sesion, p.historial, p.perfil), JSON.stringify(plan.sesion)).toEqual([])
      }
    }
  })
  it('principal y alternativas son de tipos distintos y hay como máximo 2 alternativas', () => {
    for (const p of escenarios) {
      const r = proponerSesion(p)
      const tipos = [...(r.principal ? [r.principal] : []), ...r.alternativas].map((x) => x.sesion.tipo)
      expect(new Set(tipos).size).toBe(tipos.length)
      expect(r.alternativas.length).toBeLessThanOrEqual(2)
      if (!r.principal) expect(r.alternativas).toEqual([])
    }
  })
  it('sin principal siempre hay una explicación de descanso', () => {
    for (const p of escenarios) {
      const r = proponerSesion(p)
      if (!r.principal) expect(r.descanso).toBeDefined()
    }
  })
  it('las sesiones caben en el tiempo y sus bloques suman su duración', () => {
    for (const p of escenarios) {
      const r = proponerSesion(p)
      for (const plan of [...(r.principal ? [r.principal] : []), ...r.alternativas]) {
        expect(plan.sesion.duracionMin).toBeLessThanOrEqual(p.contexto.minutosDisponibles)
        expect(plan.bloques.reduce((a, b) => a + b.minutos, 0)).toBe(plan.sesion.duracionMin)
        for (const e of plan.explicaciones) expect(e.regla.length).toBeGreaterThan(0)
      }
    }
  })
  it('un perfil novel nunca recibe suspensiones máximas, campus ni vías con cuerda en fase base', () => {
    for (const p of escenarios.filter((x) => x.perfil === perfilNovel)) {
      const r = proponerSesion(p)
      for (const plan of [...(r.principal ? [r.principal] : []), ...r.alternativas]) {
        expect(['multipresa-maxima', 'campus']).not.toContain(plan.sesion.tipo)
      }
    }
  })
  it('sin compañero nunca se propone una sesión de cuerda', () => {
    for (const p of escenarios.filter((x) => x.contexto.compania === 'solo')) {
      const r = proponerSesion(p)
      for (const plan of [...(r.principal ? [r.principal] : []), ...r.alternativas]) {
        expect(['via-cuerda-limite', 'pegues-proyecto']).not.toContain(plan.sesion.tipo)
        for (const b of plan.bloques) for (const e of b.ejercicios) expect(e.nombre).not.toMatch(/con cuerda/)
      }
    }
  })
})
```

- [ ] **Step 3: `motor/propuesta-escenario.test.ts`** (los casos reales del usuario)

```ts
import { describe, expect, it } from 'vitest'
import { perfilNovel, ses } from './_fabrica'
import { FASE_BASE, FASE_FUERZA, proponerSesion } from './index'
import type { Peticion } from './index'

// Martes con amigos (vías con cuerda) y jueves solo (bloque, autoasegurada, board, multipresa).
const martesContexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const juevesContexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const base = (extra: Partial<Peticion>): Peticion => ({
  fecha: '2026-10-27', horaInicio: 19, contexto: martesContexto, perfil: perfilNovel,
  historial: [], fase: FASE_BASE, ...extra,
})

describe('escenario real: primeras semanas de un 6b con menos de 2 años', () => {
  it('semana 1 (martes con gente): técnica con vías con cuerda', () => {
    const r = proponerSesion(base({}))
    expect(r.principal!.sesion.tipo).toBe('tecnica')
    expect(r.principal!.bloques[1]!.ejercicios[0]!.nombre).toMatch(/con cuerda/)
  })
  it('semana 1 (jueves solo): técnica con bloque y autoasegurada, sin cuerda', () => {
    const martes = ses('martes', '2026-10-27', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(base({ fecha: '2026-10-29', contexto: juevesContexto, historial: [martes] }))
    // La técnica del martes la penaliza por repetir tipo, así que aparece como alternativa, no como principal.
    const tecnica = [r.principal!, ...r.alternativas].find((x) => x.sesion.tipo === 'tecnica')!
    const nombres = tecnica.bloques[1]!.ejercicios.map((e) => e.nombre).join(' ')
    expect(nombres).toMatch(/autoasegurad/)
    expect(nombres).not.toMatch(/con cuerda/)
  })
  it('antes de 28 días de base nunca se ofrece el test máximo', () => {
    const primera = ses('p', '2026-10-06', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(base({ historial: [primera] }))
    const tipos = [r.principal, ...r.alternativas].map((x) => x!.sesion.tipo)
    expect(tipos).not.toContain('evaluacion-dedos')
  })
  it('a los 28 días de base el test de dedos pasa a ser la principal', () => {
    const primera = ses('p', '2026-09-29', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(base({ historial: [primera] }))
    expect(r.principal!.sesion.tipo).toBe('evaluacion-dedos')
    expect(r.principal!.bloques[2]!.ejercicios[0]).toMatchObject({ series: 3, trabajoS: 10, descansoSeriesS: 180 })
  })
})

describe('escenario real: fase de fuerza con test hecho', () => {
  const primera = ses('p', '2026-09-01', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
  const evaluacion = { fecha: '2026-10-13', pesoCorporalKg: 72, lastreKg: 28 }

  it('martes con gente: multipresa de repeaters con su lastre al 80 % del test', () => {
    const r = proponerSesion(base({ fase: FASE_FUERZA, historial: [primera], evaluacion }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    const e = r.principal!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(8) // 0,8 × 100 − 72 = 8
    expect(e.series).toBe(6)
    expect(e.repeticiones).toBe(7)
    expect(r.principal!.sesion.duracionMin).toBe(30)
  })
  it('jueves a las 18:00 tras multipresa el martes: nada intenso hasta el final del martes + 48 h', () => {
    const martes = ses('martes', '2026-10-27', 19, {
      tipo: 'multipresa-resistencia', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado' },
    }) // termina a las 19:30
    const r = proponerSesion(base({
      fecha: '2026-10-29', horaInicio: 18, contexto: juevesContexto,
      fase: FASE_FUERZA, historial: [primera, martes], evaluacion,
    }))
    const tipos = [r.principal, ...r.alternativas].map((x) => x!.sesion.tipo)
    expect(tipos).not.toContain('multipresa-resistencia')
    expect(tipos).not.toContain('board')
    expect(r.proximaVentanaIntensa).toEqual({ fecha: '2026-10-29', hora: 19.5 })
    expect(r.principal!.sesion.intensidad).toBe('suave')
  })
  it('jueves a las 19:30: ya es posible', () => {
    const martes = ses('martes', '2026-10-27', 19, {
      tipo: 'multipresa-resistencia', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado' },
    })
    const r = proponerSesion(base({
      fecha: '2026-10-29', horaInicio: 19.5, contexto: juevesContexto,
      fase: FASE_FUERZA, historial: [primera, martes], evaluacion,
    }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
  })
})
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: todo pasa, incluido `pureza.test.ts` sobre los ficheros nuevos de `motor/`. Si el escenario del martes tras multipresa muestra otra principal que `bloque-suave`, razona con el algoritmo del spec antes de tocar nada y repórtalo.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(motor): public API for the session generator, property tests and real scenarios

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Cobertura del spec 2b:** §1 cambios en el núcleo (Task 1 y 2), §2 tipos (Task 3), §3 fases (Task 3), §4 evaluación y carga (Task 3), §5 plantillas (Tasks 4–5), §6 algoritmo (Task 6), §7 pruebas incluidas propiedades y escenario (Task 6–7), §8 estructura de ficheros. Cambio de ARC a 50 min reflejado en Task 1.
- **Diferencias deliberadas con el spec:** la condición de «todos los cupos cubiertos» para recomendar descanso se evalúa sobre los candidatos válidos (no sobre todos los cupos de la fase), porque la evaluación de dedos nunca estaría «cubierta» en fase base; `bloque-suave` sustituye solo al `board`.
- **Marcadores pendientes:** ninguno. Las expectativas numéricas de las tareas 4, 6 y 7 se calcularon a mano con el algoritmo: puntuaciones de la primera semana (tecnica 103, arc 102, hombro 101), evaluación 106 / multipresa 105 / board 104 en fase de fuerza, ventana jueves 20:30 y 19:30.
- **Consistencia de tipos:** `Peticion`, `Propuesta`, `SesionPlan`, `Bloque`, `Ejercicio`, `Fase`, `EvaluacionDedos`, `construirSesion`, `proponerSesion`, `TIPOS_CON_PLANTILLA`, `fechaDesdeDia` y `peticion()` se usan con las mismas firmas en todas las tareas.
