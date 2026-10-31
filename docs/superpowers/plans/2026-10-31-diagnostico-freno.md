# Diagnóstico «¿Qué te frenó hoy?» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el registro por caída («+ intento») por una pregunta de un toque al terminar las sesiones al límite, hacer que los tests corrijan el diagnóstico físico y mostrar en Progreso lo que más te limita y lo que mejor llevas.

**Architecture:** El motor puro (`motor/diagnostico.ts`) recibe respuestas `{fecha, freno}` en lugar de intentos y aplica la regla respuestas → corrección por tests → tests → P-23, y calcula una fortaleza. Los datos viven en dos columnas nuevas de `registros`. La capa `lib/datos` traduce filas a entradas del motor y prepara la vista; la UI usa los componentes del sistema de diseño (`Opciones`, `Tarjeta`, `Etiqueta`).

**Tech Stack:** Next.js (App Router, Server Actions), TypeScript, Neon Postgres (`@neondatabase/serverless`), Vitest, Playwright, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-31-diagnostico-freno-design.md`

## Global Constraints

- Repo `D:/karstika-entreno`, rama `diagnostico-freno`. Comandos con `npm run …` desde la raíz.
- AGENTS.md: esta versión de Next.js tiene cambios; antes de tocar APIs de Next leer `node_modules/next/dist/docs/`. Este plan no usa APIs nuevas de Next.
- Todo el texto de UI, comentarios y commits en español, con el estilo del código vecino.
- Cada número del motor cita un parámetro de `docs/evidencia/parametros.md`; los nuevos son `sinEvidencia`.
- Valores del freno: `'bombeo' | 'paso-fuerza' | 'tecnica-lectura' | 'cabeza' | 'nada'`.
- Textos de los botones: «Me bombeé», «No aguantaba las presas», «No vi o no leí el movimiento», «Miedo, no me atreví», «Nada, buen día». Casilla: «✓ Hoy encadené algo al límite».
- Regla P-69: ventana 56 días, ≥ 6 respuestas distintas de «nada», mayoría ≥ 40 %.
- Los tipos donde se pregunta son los que hoy tienen intentos: `['via-cuerda-limite', 'pegues-proyecto', 'bloque-limite']` (la spec menciona board por error: no se añade).
- Los intentos antiguos (`intentos_limite`) no se borran ni se editan; solo cuentan para encadenes, logro y «último freno» de respaldo.
- Cada tarea termina con `npm run tsc` y `npm test` en verde, y commit con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Parámetros P-69, P-70, P-71 y correcciones de `parametros.md`

**Files:**
- Modify: `docs/evidencia/parametros.md` (línea 4, fila P-17, fila P-23, filas nuevas tras P-68)
- Modify: `motor/parametros.ts` (añadir `'P-69'`)
- Regenerate: `motor/metadatos.ts` (con `npm run metadatos`)
- Test: `motor/parametros.test.ts`

**Interfaces:**
- Produces: `VALORES['P-69'] = { ventanaDias: 56, minRespuestas: 6, mayoriaPct: 40 }`; ids `'P-69' | 'P-70' | 'P-71'` válidos como `ParametroId`.

- [ ] **Step 1: Test que falla**

En `motor/parametros.test.ts`, dentro de `describe('VALORES del diagnóstico', …)`, añadir:

```ts
  it('P-69 coincide con el documento; P-70 y P-71 existen', () => {
    expect(columnas('P-69')[2]).toMatch(/^Una pregunta al terminar cada sesión al límite/)
    expect(columnas('P-69')[2]).toMatch(/56 días/)
    expect(columnas('P-69')[2]).toMatch(/al menos 6 respuestas/)
    expect(columnas('P-69')[2]).toMatch(/al menos el 40 %/)
    expect(VALORES['P-69']).toEqual({ ventanaDias: 56, minRespuestas: 6, mayoriaPct: 40 })
    expect(columnas('P-70')[2]).toMatch(/^Los tests corrigen la respuesta física/)
    expect(columnas('P-71')[2]).toMatch(/^La fortaleza solo se muestra con datos propios/)
  })
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run motor/parametros.test.ts`
Expected: FAIL (`P-69` no existe en el documento).

- [ ] **Step 3: Documento**

En `docs/evidencia/parametros.md`:

1. Línea 4: cambiar `rocódromo + board + multipresa en casa.` por `rocódromo + board (multipresa solo en el rocódromo; en casa, barra de dominadas).`
2. Fila P-17, columna de notas: cambiar `Con multipresa en casa lo normal será usar pesos, que es la opción menos recomendada.` por `Sin dinamómetro, en la multipresa del rocódromo lo normal será usar pesos, que es la opción menos recomendada.`
3. Fila P-23, al final de la columna de notas añadir: ` Desde 2026-10-31 no depende de las caídas: es el valor por defecto cuando no deciden las respuestas (P-69) ni los tests (P-70).`
4. Tras la fila P-68 añadir:

```markdown
| P-69 | Diagnóstico por la respuesta de cierre | Una pregunta al terminar cada sesión al límite («¿Qué te frenó hoy?»: bombeo, presas, movimiento/lectura, miedo, nada). Con al menos 6 respuestas distintas de «nada» en los últimos 56 días, el motivo que sume al menos el 40 % es el limitante principal; empates por P-23 | sinEvidencia | sinEvidencia | Decisión de diseño (2026-10-31). Ningún instrumento validado diagnostica el limitante individual y ninguna app revisada pregunta por caída; una sola pregunta al día ronda el 90 % de cumplimiento; el grado autoinformado es válido (Draper 2011). Sustituye a «≥ 10 caídas con motivo». Ver docs/evidencia/informe-2026-10-31-tests-ejercicios.md. |
| P-70 | Los tests corrigen la autoatribución física | Los tests corrigen la respuesta física: si la fuerza de dedos mejora y la resistencia no (sin cambio o peor), el limitante es la resistencia; si la resistencia mejora y la fuerza no, la fuerza de dedos. Sustituye a una respuesta física contraria y decide solo si no hay respuestas suficientes. No corrige técnica ni cabeza | sinEvidencia | sinEvidencia (indirecta B) | Decisión de diseño. Dedos y resistencia explican juntos la mayor parte del grado (Berta 2025; Augste 2022, B) y lo más débil mejora más al entrenarlo (Devise 2022, A); la autoatribución no está validada contra tests. |
| P-71 | Fortaleza mostrada | La fortaleza solo se muestra con datos propios: la cualidad que mejora en los tests cuando otra no, o el único motivo nunca marcado con al menos 6 respuestas; nunca la misma que el limitante | sinEvidencia | sinEvidencia | Decisión de diseño: no se muestra una fortaleza deducida del orden general de los estudios. |
```

- [ ] **Step 4: Valores y metadatos**

En `motor/parametros.ts`, tras `'P-68': { maxCargaAltaPorDia: 1 },` añadir:

```ts
  // Diagnóstico por la respuesta de cierre (decisión de diseño, sinEvidencia).
  'P-69': { ventanaDias: 56, minRespuestas: 6, mayoriaPct: 40 },
```

Run: `npm run metadatos`
Expected: regenera `motor/metadatos.ts` con P-69, P-70 y P-71 (`git diff --stat motor/metadatos.ts` muestra cambios).

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `npx vitest run motor/parametros.test.ts motor/metadatos.test.ts && npm run tsc`
Expected: PASS, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add docs/evidencia/parametros.md motor/parametros.ts motor/metadatos.ts motor/parametros.test.ts
git commit -m "docs(evidencia): P-69 a P-71 del diagnóstico por respuesta de cierre y multipresa solo en el rocódromo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Motor — diagnóstico con respuestas, corrección por tests y fortaleza

**Files:**
- Modify: `motor/diagnostico.ts`
- Modify: `motor/index.ts:24-25` (exportaciones)
- Test: `motor/diagnostico.test.ts`

**Interfaces:**
- Consumes: `VALORES['P-69']` (Task 1).
- Produces (exportado desde `motor`):
  ```ts
  export type Freno = MotivoCaida | 'nada'
  export interface RespuestaFreno { fecha: string; freno: Freno }
  export type FuenteDiagnostico = 'respuestas' | 'tests' | 'respuestas-y-tests' | 'evidencia'
  export interface Fortaleza { cualidad: Limitante; fuente: 'tests' | 'respuestas' }
  export interface Diagnostico {
    progreso: { fuerza: Progreso; resistencia: Progreso; tecnica: Progreso }
    limitantes: Limitante[]
    fuente: FuenteDiagnostico
    frenos: Record<Limitante, number>   // respuestas en la ventana, por limitante
    nada: number                        // respuestas «nada» en la ventana
    fortaleza: Fortaleza | null
    explicaciones: Explicacion[]
  }
  export function diagnosticar(evaluaciones: readonly EvaluacionDedos[], respuestas: readonly RespuestaFreno[], fecha: string): Diagnostico
  ```
  `IntentoLimite` deja de existir en el motor. `MotivoCaida` se mantiene.

- [ ] **Step 1: Reescribir los tests de limitantes (fallan)**

En `motor/diagnostico.test.ts`:

1. Cambiar la importación por:
```ts
import { ajusteCiclo2, diagnosticar, type Freno, type MotivoCaida, type RespuestaFreno } from './diagnostico'
```
2. Sustituir el helper `caidas` por:
```ts
const frenos = (freno: Freno, n: number, desdeHace = 1): RespuestaFreno[] =>
  Array.from({ length: n }, (_, i) => ({ fecha: haceDias(desdeHace + i), freno }))
// Tres tests: la fuerza mejora (+11 % y +16 %) y la resistencia no (80 → 81 → 80 s).
const fuerzaSubeResistenciaNo = [
  ev('2026-12-01', 20, { resistenciaS: 80 }), ev('2027-01-19', 30, { resistenciaS: 81 }), ev('2027-03-02', 34, { resistenciaS: 80 }),
]
// Tres tests: la resistencia mejora (80 → 90 → 95 s) y la fuerza no (20 → 20,5 → 21 kg de lastre: < 5 %).
const resistenciaSubeFuerzaNo = [
  ev('2026-12-01', 20, { resistenciaS: 80 }), ev('2027-01-19', 20.5, { resistenciaS: 90 }), ev('2027-03-02', 21, { resistenciaS: 95 }),
]
```
3. Reemplazar todo el `describe('diagnosticar: orden de limitantes', …)` por:

```ts
describe('diagnosticar: limitante principal (P-69, P-70, P-23)', () => {
  it('sin respuestas ni tests manda P-23 y lo explica como orden general', () => {
    const d = diagnosticar([], [], HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.limitantes).toEqual(['fuerza-dedos', 'resistencia', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-69'])
    expect(d.explicaciones[1]!.motivo).toMatch(/decisión de diseño/)
  })
  it('con 6 respuestas y mayoría ≥ 40 % manda la respuesta', () => {
    const d = diagnosticar([], [...frenos('bombeo', 3), ...frenos('tecnica-lectura', 2, 10), ...frenos('cabeza', 1, 20)], HOY)
    expect(d.fuente).toBe('respuestas')
    expect(d.frenos).toEqual({ 'fuerza-dedos': 0, resistencia: 3, tecnica: 2, cabeza: 1 })
    expect(d.limitantes).toEqual(['resistencia', 'fuerza-dedos', 'tecnica', 'cabeza'])
  })
  it('con 5 respuestas no basta; «nada» no cuenta para el mínimo', () => {
    expect(diagnosticar([], frenos('cabeza', 5), HOY).fuente).toBe('evidencia')
    const d = diagnosticar([], [...frenos('cabeza', 5), ...frenos('nada', 4, 10)], HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.nada).toBe(4)
  })
  it('sin mayoría del 40 % no hay candidato por respuestas', () => {
    // 7 respuestas: 2 + 2 + 2 + 1 → el máximo es 28,6 %.
    const r = [...frenos('bombeo', 2), ...frenos('paso-fuerza', 2, 5), ...frenos('tecnica-lectura', 2, 10), ...frenos('cabeza', 1, 15)]
    expect(diagnosticar([], r, HOY).fuente).toBe('evidencia')
  })
  it('los empates de mayoría siguen P-23', () => {
    const d = diagnosticar([], [...frenos('cabeza', 3), ...frenos('tecnica-lectura', 3, 10)], HOY)
    expect(d.limitantes[0]).toBe('tecnica')
  })
  it('la ventana es de 56 días exactos: cuenta hace 55 y no hace 56 ni el futuro', () => {
    const base = frenos('cabeza', 5, 1)
    expect(diagnosticar([], [...base, { fecha: haceDias(55), freno: 'cabeza' }], HOY).fuente).toBe('respuestas')
    expect(diagnosticar([], [...base, { fecha: haceDias(56), freno: 'cabeza' }], HOY).fuente).toBe('evidencia')
    expect(diagnosticar([], [...base, { fecha: haceDias(-1), freno: 'cabeza' }], HOY).fuente).toBe('evidencia')
  })
  it('los tests corrigen una respuesta física contraria: dices bombeo, pero la resistencia mejora y la fuerza no', () => {
    const d = diagnosticar(resistenciaSubeFuerzaNo, frenos('bombeo', 6), HOY)
    expect(d.fuente).toBe('respuestas-y-tests')
    expect(d.limitantes[0]).toBe('fuerza-dedos')
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-69', 'P-70'])
  })
  it('y al revés: dices presas, pero la fuerza mejora y la resistencia no', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('paso-fuerza', 6), HOY)
    expect(d.fuente).toBe('respuestas-y-tests')
    expect(d.limitantes[0]).toBe('resistencia')
  })
  it('si los tests coinciden con la respuesta, la fuente sigue siendo la respuesta', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('bombeo', 6), HOY)
    expect(d.fuente).toBe('respuestas')
    expect(d.limitantes[0]).toBe('resistencia')
  })
  it('los tests no corrigen la técnica ni la cabeza', () => {
    expect(diagnosticar(fuerzaSubeResistenciaNo, frenos('cabeza', 6), HOY).limitantes[0]).toBe('cabeza')
    expect(diagnosticar(resistenciaSubeFuerzaNo, frenos('tecnica-lectura', 6), HOY).limitantes[0]).toBe('tecnica')
  })
  it('sin respuestas suficientes deciden los tests solos', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('bombeo', 2), HOY)
    expect(d.fuente).toBe('tests')
    expect(d.limitantes).toEqual(['resistencia', 'fuerza-dedos', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-70'])
  })
  it('sin veredicto de los tests (ambas mejoran o falta una) no deciden', () => {
    const ambas = [ev('2026-12-01', 20, { resistenciaS: 80 }), ev('2027-01-19', 30, { resistenciaS: 90 }), ev('2027-03-02', 34, { resistenciaS: 95 })]
    expect(diagnosticar(ambas, [], HOY).fuente).toBe('evidencia')
    const sinResistencia = [ev('2026-12-01', 20), ev('2027-01-19', 30), ev('2027-03-02', 34)]
    expect(diagnosticar(sinResistencia, [], HOY).fuente).toBe('evidencia')
  })
  it('rechaza respuestas mal formadas', () => {
    expect(() => diagnosticar([], [{ fecha: '2027-03-01', freno: 'sueño' as never }], HOY)).toThrow(/freno desconocido/)
    expect(() => diagnosticar([], [{ fecha: '2027-02-30', freno: 'nada' }], HOY)).toThrow()
  })
  it('es determinista y no muta sus entradas', () => {
    const evs = [...fuerzaSubeResistenciaNo]
    const rs = [...frenos('bombeo', 6), ...frenos('nada', 2, 10)]
    const antes = structuredClone({ evs, rs })
    expect(diagnosticar(evs, rs, HOY)).toEqual(diagnosticar(evs, rs, HOY))
    expect({ evs, rs }).toEqual(antes)
  })
})

describe('diagnosticar: fortaleza (P-71)', () => {
  it('sin datos propios no hay fortaleza', () => {
    expect(diagnosticar([], [], HOY).fortaleza).toBeNull()
  })
  it('por tests: la que mejora cuando otra no', () => {
    expect(diagnosticar(resistenciaSubeFuerzaNo, [], HOY).fortaleza).toEqual({ cualidad: 'resistencia', fuente: 'tests' })
  })
  it('por tests, la técnica cuenta (escala 1-7) y gana la de mayor cambio relativo', () => {
    const evs = [
      ev('2026-12-01', 20, { resistenciaS: 80, tecnica: 3 }), ev('2027-01-19', 30, { resistenciaS: 81, tecnica: 4 }),
      ev('2027-03-02', 34, { resistenciaS: 80, tecnica: 5 }),
    ]
    // Fuerza: (106 − 92) / 92 ≈ +15 %; técnica: +2 / 3 ≈ +67 % → técnica.
    expect(diagnosticar(evs, [], HOY).fortaleza).toEqual({ cualidad: 'tecnica', fuente: 'tests' })
  })
  it('nunca coincide con el limitante principal', () => {
    // Fuerza mejora, técnica igual y resistencia sin datos: no hay veredicto, P-23 pone la fuerza primero → la
    // fortaleza «fuerza» se descarta.
    const evs = [ev('2026-12-01', 20, { tecnica: 4 }), ev('2027-01-19', 30, { tecnica: 4 }), ev('2027-03-02', 34, { tecnica: 4 })]
    const d = diagnosticar(evs, [], HOY)
    expect(d.limitantes[0]).toBe('fuerza-dedos')
    expect(d.fortaleza).toBeNull()
  })
  it('por respuestas: el único motivo nunca marcado, con al menos 6 respuestas', () => {
    const r = [...frenos('bombeo', 4), ...frenos('tecnica-lectura', 1, 10), ...frenos('cabeza', 1, 20)]
    expect(diagnosticar([], r, HOY).fortaleza).toEqual({ cualidad: 'fuerza-dedos', fuente: 'respuestas' })
  })
  it('con varios motivos a cero no se sabe', () => {
    expect(diagnosticar([], frenos('bombeo', 6), HOY).fortaleza).toBeNull()
  })
})
```

4. En `describe('ajusteCiclo2', …)` y `describe('temporada ajustada con el diagnóstico', …)`, sustituir `caidas(motivo, 12)` por `frenos(motivo, 12)` (dos sitios) y el test «sin registro suficiente…» queda igual. Cambiar en el test de explicaciones `expect(con('bombeo').explicacion.motivo).toMatch(/decisión de diseño/)` sin cambios y añadir:
```ts
    expect(con('bombeo').explicacion.motivo).toMatch(/te frena el bombeo/)
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run motor/diagnostico.test.ts`
Expected: FAIL (tipos `Freno`/`RespuestaFreno` inexistentes, `fuente` distinta).

- [ ] **Step 3: Implementar**

En `motor/diagnostico.ts`:

1. Sustituir desde `export type MotivoCaida = …` hasta el cierre de `interface IntentoLimite` por:

```ts
export type MotivoCaida = 'bombeo' | 'paso-fuerza' | 'tecnica-lectura' | 'cabeza'
// Respuesta a «¿Qué te frenó hoy?» al terminar una sesión al límite (P-69). «nada» = buen día.
export type Freno = MotivoCaida | 'nada'
export interface RespuestaFreno {
  fecha: string
  freno: Freno
}
```

2. Sustituir la interfaz `Diagnostico` por:

```ts
export type FuenteDiagnostico = 'respuestas' | 'tests' | 'respuestas-y-tests' | 'evidencia'
export interface Fortaleza {
  cualidad: Limitante
  fuente: 'tests' | 'respuestas'
}

export interface Diagnostico {
  progreso: { fuerza: Progreso; resistencia: Progreso; tecnica: Progreso }
  limitantes: Limitante[]                 // de más a menos prioritario
  fuente: FuenteDiagnostico               // qué decidió el primero (P-69, P-70; si nada, P-23)
  frenos: Record<Limitante, number>       // respuestas de la ventana por limitante (sin «nada»)
  nada: number                            // respuestas «nada» de la ventana
  fortaleza: Fortaleza | null             // P-71
  explicaciones: Explicacion[]
}
```

3. Sustituir el comentario y las constantes `UMBRAL_CAMBIO_PCT … VENTANA_CAIDAS_DIAS` por:

```ts
// Decisiones de diseño (no están en parametros.md). Se desconoce el cambio mínimo detectable y una sola medición
// no basta (P-19): hacen falta al menos 3 tests y que los 2 últimos confirmen el cambio frente al primero, de al
// menos un 5 % (o 1 punto en la técnica, escala 1-7).
const UMBRAL_CAMBIO_PCT = 5
const UMBRAL_PUNTOS = 1
const MIN_MEDICIONES = 3
const { ventanaDias: VENTANA_DIAS, minRespuestas: MIN_RESPUESTAS, mayoriaPct: MAYORIA_PCT } = VALORES['P-69']

const NOMBRE: Record<Limitante, string> = {
  'fuerza-dedos': 'la fuerza de dedos',
  resistencia: 'la resistencia',
  tecnica: 'la técnica o la lectura',
  cabeza: 'la cabeza',
}
const FISICOS: readonly Limitante[] = ['fuerza-dedos', 'resistencia']
```

4. Sustituir `const MOTIVOS: readonly MotivoCaida[] = …` por:

```ts
const FRENOS: readonly Freno[] = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada']
```

5. Sustituir `function validarIntento(…) {…}` por:

```ts
function validarRespuesta(r: RespuestaFreno): void {
  diaNumero(r.fecha)
  if (!FRENOS.includes(r.freno)) throw new Error(`respuesta del ${r.fecha}: freno desconocido: ${String(r.freno)}`)
}

// P-70: los tests solo opinan de lo físico, y solo si una de las dos cualidades mejora y la otra no.
function veredictoTests(fuerza: Progreso, resistencia: Progreso): Limitante | null {
  const noMejora = (p: Progreso) => p.tendencia === 'sin-cambio' || p.tendencia === 'empeora'
  if (fuerza.tendencia === 'mejora' && noMejora(resistencia)) return 'resistencia'
  if (resistencia.tendencia === 'mejora' && noMejora(fuerza)) return 'fuerza-dedos'
  return null
}

// P-71: solo con datos propios y nunca la misma que el limitante principal.
function fortalezaDe(
  progresos: readonly [Limitante, Progreso][], frenos: Record<Limitante, number>, n: number, principal: Limitante,
): Fortaleza | null {
  const conDatos = progresos.filter(([, p]) => p.tendencia !== 'sin-datos')
  const mejoran = conDatos.filter(([, p]) => p.tendencia === 'mejora')
  if (mejoran.length > 0 && mejoran.length < conDatos.length) {
    const relativo = (p: Progreso): number => (p.unidad === '%' ? p.cambio! : (p.cambio! / p.inicial!) * 100)
    const [mejor] = mejoran.reduce((a, b) => (relativo(b[1]) > relativo(a[1]) ? b : a))
    return mejor === principal ? null : { cualidad: mejor, fuente: 'tests' }
  }
  if (n >= MIN_RESPUESTAS) {
    const ceros = (Object.keys(frenos) as Limitante[]).filter((l) => frenos[l] === 0)
    if (ceros.length === 1 && ceros[0] !== principal) return { cualidad: ceros[0]!, fuente: 'respuestas' }
  }
  return null
}
```

6. Sustituir la función `diagnosticar` completa (desde `export function diagnosticar(` hasta su `}` final, justo antes de `// Reparto de las 14 semanas…`) por:

```ts
export function diagnosticar(evaluaciones: readonly EvaluacionDedos[], respuestas: readonly RespuestaFreno[], fecha: string): Diagnostico {
  const hoy = diaNumero(fecha)
  const fechas = new Set<string>()
  for (const e of evaluaciones) {
    validarEvaluacion(e)
    diaNumero(e.fecha)
    if (fechas.has(e.fecha)) throw new Error(`Hay dos evaluaciones el mismo día (${e.fecha}): deja solo una`)
    fechas.add(e.fecha)
  }
  for (const r of respuestas) validarRespuesta(r)

  // Solo cuenta lo que ya ha pasado; las evaluaciones, en orden de fecha.
  const pasadas = evaluaciones.filter((e) => diaNumero(e.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const fuerza = progreso(pasadas.map(fuerzaRelativa), '%')
  const resistencia = progreso(pasadas.flatMap((e) => (e.resistenciaS === undefined ? [] : [e.resistenciaS])), '%')
  const tecnica = progreso(pasadas.flatMap((e) => (e.tecnica === undefined ? [] : [e.tecnica])), 'puntos')

  const frenos: Record<Limitante, number> = { 'fuerza-dedos': 0, resistencia: 0, tecnica: 0, cabeza: 0 }
  let nada = 0
  for (const r of respuestas) {
    const d = diaNumero(r.fecha)
    if (d > hoy || d <= hoy - VENTANA_DIAS) continue
    if (r.freno === 'nada') nada += 1
    else frenos[LIMITANTE_DE[r.freno]] += 1
  }
  const n = Object.values(frenos).reduce((a, b) => a + b, 0)
  const orden = VALORES['P-23'].orden as readonly Limitante[]

  // P-69: candidato por respuestas (empates por el orden de P-23).
  let candidato: Limitante | null = null
  if (n >= MIN_RESPUESTAS) {
    const max = orden.reduce((a, b) => (frenos[b] > frenos[a] ? b : a))
    if (frenos[max] * 100 >= MAYORIA_PCT * n) candidato = max
  }
  const veredicto = veredictoTests(fuerza, resistencia)

  let principal: Limitante | null = null
  let fuente: FuenteDiagnostico = 'evidencia'
  if (candidato !== null) {
    const corrige = FISICOS.includes(candidato) && veredicto !== null && veredicto !== candidato
    principal = corrige ? veredicto : candidato
    fuente = corrige ? 'respuestas-y-tests' : 'respuestas'
  } else if (veredicto !== null) {
    principal = veredicto
    fuente = 'tests'
  }
  const limitantes = principal === null ? [...orden] : [principal, ...orden.filter((l) => l !== principal)]

  const cambio = (p: Progreso) => {
    if (p.cambio === undefined) return ''
    const signo = p.cambio > 0 ? '+' : ''
    const valor = p.unidad === '%' ? `${p.cambio.toFixed(1)} %` : `${p.cambio} ${Math.abs(p.cambio) === 1 ? 'punto' : 'puntos'}`
    return ` (${signo}${valor} con ${p.mediciones} tests)`
  }
  const estado = (p: Progreso) => (p.tendencia === 'sin-datos' ? 'sin datos suficientes' : p.tendencia)
  const pct = (l: Limitante) => Math.round((frenos[l] / n) * 100)
  const lecturaTests = veredicto === 'resistencia'
    ? 'tu fuerza de dedos mejora y tu resistencia no'
    : 'tu resistencia mejora y tu fuerza de dedos no'
  const motivoLimitante = {
    respuestas: () =>
      `En las últimas 8 semanas respondiste ${n} veces qué te frenó (sin contar los días buenos); ${NOMBRE[principal!]} sale en el ${pct(principal!)} %, así que es tu limitante principal (P-69). Los empates siguen el orden de P-23.`,
    'respuestas-y-tests': () =>
      `Tus respuestas apuntaban a ${NOMBRE[candidato!]} (${pct(candidato!)} %), pero en tus tests ${lecturaTests}: manda el test y el limitante principal es ${NOMBRE[principal!]} (P-70).`,
    tests: () =>
      `Aún no hay respuestas suficientes (${n} de ${MIN_RESPUESTAS} con una mayoría del ${MAYORIA_PCT} %), pero en tus tests ${lecturaTests}: el limitante principal es ${NOMBRE[principal!]} (P-70).`,
    evidencia: () =>
      `Sin datos tuyos suficientes (${n} respuestas de ${MIN_RESPUESTAS} y sin un veredicto claro de los tests), el orden es el de la evidencia: fuerza de dedos y resistencia intermitente (P-23); después técnica y cabeza (la táctica de P-23), cuyo orden entre sí es decisión de diseño.`,
  }[fuente]()
  const parametrosLimitante: ParametroId[] = {
    respuestas: ['P-23', 'P-69'] as ParametroId[],
    'respuestas-y-tests': ['P-23', 'P-69', 'P-70'] as ParametroId[],
    tests: ['P-23', 'P-70'] as ParametroId[],
    evidencia: ['P-23', 'P-69'] as ParametroId[],
  }[fuente]
  const explicaciones = [
    explicar(
      'diagnostico.progreso',
      ['P-19', 'P-24', 'P-27'],
      `Progreso frente a tu propia línea base: fuerza de dedos ${estado(fuerza)}${cambio(fuerza)}, resistencia ${estado(resistencia)}${cambio(resistencia)}, técnica ${estado(tecnica)}${cambio(tecnica)}. Una sola medición no basta (P-19): hacen falta ${MIN_MEDICIONES} tests y que los 2 últimos confirmen un cambio de al menos un ${UMBRAL_CAMBIO_PCT} % (1 punto en la técnica); los umbrales son decisión de diseño. Los segundos de resistencia se miden al 60 % del máximo de ese día: si tu fuerza sube, pueden quedarse igual aunque hayas mejorado.`,
    ),
    explicar('diagnostico.limitantes', parametrosLimitante, motivoLimitante),
  ]
  const fortaleza = fortalezaDe(
    [['fuerza-dedos', fuerza], ['resistencia', resistencia], ['tecnica', tecnica]], frenos, n, limitantes[0]!,
  )
  return { progreso: { fuerza, resistencia, tecnica }, limitantes, fuente, frenos, nada, fortaleza, explicaciones }
}
```

7. Añadir el import de tipo de `ParametroId` al principio del archivo:
```ts
import type { ParametroId } from './metadatos'
```
   (Si `explicar` ordena los parámetros, como indica el test existente `['P-23', 'P-31']`, los arrays ya van ordenados.)

8. En `ajusteCiclo2`, cambiar el texto de `resistencia` por:
```ts
    resistencia: 'Tu limitante principal es la resistencia (te frena el bombeo): el ciclo 2 alarga la resistencia a 8 semanas y acorta la fuerza a 6.',
```

En `motor/index.ts`, en la exportación de `./diagnostico`, sustituir `type IntentoLimite,` por `type Fortaleza, type Freno, type FuenteDiagnostico, type RespuestaFreno,` (mantener `type MotivoCaida`).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run motor/diagnostico.test.ts`
Expected: PASS.

Run: `npm run tsc`
Expected: errores SOLO en `lib/` (`intentosMotor`, `IntentoLimite`): los arregla la Task 3. No commitear con `tsc` en rojo: continuar con la Task 3 y commitear las dos juntas al final de la Task 3.

---

### Task 3: Datos — migración 004, filas, consultas y llamadas al diagnóstico

**Files:**
- Create: `migraciones/004_freno.sql`
- Modify: `lib/datos/filas.ts` (`FilaRegistro`)
- Modify: `lib/servidor/consultas.ts:9-35, 108-138`
- Modify: `lib/datos/cambios.ts:59-76`
- Modify: `lib/datos/mapeo.ts:50-52`
- Modify: `lib/datos/peticion.ts:31,52`, `lib/datos/plan.ts:150-163`, `lib/datos/validar.ts:26-37`
- Modify: `scripts/probar-bd.ts` (casos)
- Test: `lib/datos/mapeo.test.ts`, `lib/datos/cambios.test.ts`, `lib/datos/peticion.test.ts`, `lib/datos/validar.test.ts`

**Interfaces:**
- Consumes: `diagnosticar(evaluaciones, respuestas, fecha)`, `RespuestaFreno`, `Freno` (Task 2).
- Produces:
  - `FilaRegistro` gana `freno?: Freno | null` y `encadene?: boolean` (opcionales en TS para no tocar todos los fixtures; la base siempre los devuelve).
  - `frenosMotor(d: DatosAtleta): RespuestaFreno[]` en `lib/datos/mapeo.ts` (fecha = la de la sesión del registro).
  - `conRegistro(d, r)` y `conRegistroCorregido(d, r)` sin parámetro de intentos.
  - `insertarRegistro(sql, r)`, `insertarSesionRegistrada(sql, f, r)`, `corregirRegistroBd(sql, r)` sin intentos.

- [ ] **Step 1: Migración**

Crear `migraciones/004_freno.sql`:

```sql
-- «¿Qué te frenó hoy?» al terminar una sesión al límite (P-69) y si se encadenó algo. Sustituye a los intentos
-- (intentos_limite se conserva: solo lectura).
alter table registros
  add column freno text check (freno in ('bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada')),
  add column encadene boolean not null default false;
```

En `scripts/probar-bd.ts`, al final de la lista `casos` (antes de `]`), añadir:

```ts
  ['registro con freno desconocido', () => sql`insert into registros (sesion_id, rpe, duracion_min, freno) values (${S1}, 5, 60, 'lluvia')`],
  ['registro con encadene nulo', () => sql`insert into registros (sesion_id, rpe, duracion_min, encadene) values (${S1}, 5, 60, null)`],
```

- [ ] **Step 2: Tests que fallan**

En `lib/datos/mapeo.test.ts`, sustituir el test que usa `intentosMotor` (línea ~50-56) por:

```ts
  it('frenosMotor: una respuesta por registro con freno, con la fecha de su sesión', () => {
    const d = datosVacios()
    d.sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-04'), sesionFila(uuid(3), '2026-11-05')]
    d.registros = [
      { ...registro(uuid(1)), freno: 'bombeo' },
      { ...registro(uuid(2)), freno: null },
      { ...registro(uuid(3)) },
    ]
    expect(frenosMotor(d)).toEqual([{ fecha: '2026-11-03', freno: 'bombeo' }])
  })
```

(Usar los helpers `datosVacios`, `sesionFila`, `registro`, `uuid` que ya existan en ese archivo; si alguno no existe, importarlo de `./prueba` o del helper que usen los tests vecinos — buscar con `grep -n "export function datosVacios" lib/datos/*.ts`. Importar `frenosMotor` en lugar de `intentosMotor`.)

En `lib/datos/cambios.test.ts`:
- Línea 54: `conRegistro(d, registro(uuid(1)), [{ …intento… }])` → `conRegistro(d, registro(uuid(1)))` y ajustar la expectativa siguiente para no esperar el intento nuevo.
- Líneas 59-61 y 87: quitar el tercer argumento `[]`.
- Bloque de líneas ~70-85 (`conRegistroCorregido` con intentos): sustituir por:

```ts
  it('corregir conserva cuándo se apuntó, guarda freno y encadene y no toca los intentos antiguos', () => {
    let d = conSesion(conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03')), sesionFila(uuid(2), '2026-11-04'))
    d = conRegistro(d, { ...registro(uuid(1)), registrado_en: 'antes' })
    d = { ...d, intentos: [intento(10, uuid(1), true)] }
    const c = conRegistroCorregido(d, { ...registro(uuid(1)), rpe: 9, freno: 'cabeza', encadene: true })
    expect(c.registros[0]).toMatchObject({ rpe: 9, freno: 'cabeza', encadene: true, registrado_en: 'antes' })
    expect(c.intentos).toEqual(d.intentos)
    expect(() => conRegistroCorregido(d, registro(uuid(2)))).toThrow('Esa sesión no está registrada.')
  })
```

En `lib/datos/peticion.test.ts:43`: `conRegistro(conSesion(datosVacios(), fila), {…})` — quitar el tercer argumento si lo tiene.

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `npx vitest run lib/datos/mapeo.test.ts lib/datos/cambios.test.ts`
Expected: FAIL (`frenosMotor` no existe; firmas).

- [ ] **Step 4: Implementar**

`lib/datos/filas.ts` — `FilaRegistro`:

```ts
export interface FilaRegistro {
  sesion_id: string
  rpe: number
  duracion_min: number
  molestias: Molestia[]
  registrado_en: string
  // «¿Qué te frenó hoy?» (solo sesiones al límite) y si se encadenó algo. La base siempre los devuelve; opcionales
  // para los registros construidos a mano.
  freno?: Freno | null
  encadene?: boolean
}
```
(Importar `type Freno` desde `../../motor` junto a los tipos que ya importa el archivo.)

`lib/servidor/consultas.ts`:
- En `cargarDatos`, la consulta de registros:
```ts
      sql`select sesion_id::text as sesion_id, rpe, duracion_min, molestias, registrado_en::text as registrado_en, freno, encadene from registros`,
```
- Sustituir `insertarRegistro`, `insertarSesionRegistrada` y `corregirRegistroBd` por:

```ts
export async function insertarRegistro(sql: Sql, r: FilaRegistro): Promise<void> {
  await sql`insert into registros (sesion_id, rpe, duracion_min, molestias, freno, encadene)
    values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb, ${r.freno ?? null}, ${r.encadene ?? false})`
}

// Un entrenamiento no planeado: la sesión y su registro en una transacción.
export async function insertarSesionRegistrada(sql: Sql, f: FilaSesion, r: FilaRegistro): Promise<void> {
  await sql.transaction([
    consultaSesion(sql, f),
    sql`insert into registros (sesion_id, rpe, duracion_min, molestias, freno, encadene)
      values (${r.sesion_id}, ${r.rpe}, ${r.duracion_min}, ${JSON.stringify(r.molestias)}::jsonb, ${r.freno ?? null}, ${r.encadene ?? false})`,
  ])
}

// Corrige un registro. Los intentos antiguos de la sesión (de antes de «¿Qué te frenó hoy?») no se tocan.
export async function corregirRegistroBd(sql: Sql, r: FilaRegistro): Promise<void> {
  await sql`update registros set rpe = ${r.rpe}, duracion_min = ${r.duracion_min}, molestias = ${JSON.stringify(r.molestias)}::jsonb,
      freno = ${r.freno ?? null}, encadene = ${r.encadene ?? false}
    where sesion_id = ${r.sesion_id}`
}
```
- Quitar `FilaIntento` del import si ya no se usa (se sigue usando en `cargarDatos`: dejarlo).

`lib/datos/cambios.ts` — sustituir `conRegistro` y `conRegistroCorregido` por:

```ts
export function conRegistro(d: DatosAtleta, r: FilaRegistro): DatosAtleta {
  if (!d.sesiones.some((s) => s.id === r.sesion_id)) throw new Error('Esa sesión ya no existe.')
  if (d.registros.some((x) => x.sesion_id === r.sesion_id)) throw new Error('Esa sesión ya está registrada.')
  return { ...d, registros: [...d.registros, r] }
}

// Corrige un registro ya guardado: sustituye el registro conservando cuándo se apuntó. Los intentos antiguos no se tocan.
export function conRegistroCorregido(d: DatosAtleta, r: FilaRegistro): DatosAtleta {
  const previo = d.registros.find((x) => x.sesion_id === r.sesion_id)
  if (!previo) throw new Error('Esa sesión no está registrada.')
  return {
    ...d,
    registros: d.registros.map((x) => (x.sesion_id === r.sesion_id ? { ...r, registrado_en: previo.registrado_en } : x)),
  }
}
```
(Quitar `FilaIntento` del import de `cambios.ts` si queda sin uso.)

`lib/datos/mapeo.ts` — sustituir `intentosMotor` por:

```ts
// Las respuestas a «¿Qué te frenó hoy?», con la fecha de la sesión de cada registro.
export function frenosMotor(d: DatosAtleta): RespuestaFreno[] {
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  return d.registros.flatMap((r) => {
    const fecha = fechaDe.get(r.sesion_id)
    return r.freno && fecha !== undefined ? [{ fecha, freno: r.freno }] : []
  })
}
```
y en su import cambiar `IntentoLimite` por `RespuestaFreno` y quitar `FilaIntento` si queda sin uso.

`lib/datos/peticion.ts`: sustituir las dos llamadas `intentosMotor(d.intentos)` por `frenosMotor(d)` y el import.

`lib/datos/plan.ts` (dentro de `cambiosPorResultados`): `const intentos = intentosMotor(d.intentos)` → `const respuestas = frenosMotor(d)`, y las dos llamadas `diagnosticar(evaluaciones, intentos, …)` → `diagnosticar(evaluaciones, respuestas, …)`; actualizar import.

`lib/datos/validar.ts` — sustituir el final (desde `// diagnosticar valida…`) por:

```ts
  // diagnosticar valida todas las evaluaciones y todas las respuestas (fechas repetidas, valores) antes de calcular;
  // la fecha solo decide qué cuenta en el cálculo, que aquí no se usa.
  const respuestas = frenosMotor(d)
  const fechas = [...d.evaluaciones.map((e) => e.fecha), ...respuestas.map((r) => r.fecha)].sort()
  const ultima = fechas.at(-1)
  if (ultima !== undefined) diagnosticar(evaluacionesMotor(d.evaluaciones), respuestas, ultima)
```
(El bucle que comprueba que cada intento tiene su sesión se queda.) Actualizar el import (`frenosMotor` en lugar de `intentosMotor`).

Si `lib/datos/validar.test.ts` construye intentos con motivo para provocar errores del diagnóstico, cambiar ese caso a un registro con `freno: 'lluvia' as never` y esperar `/freno desconocido/`.

- [ ] **Step 5: Ejecutar**

Run: `npm run tsc`
Expected: quedan errores SOLO en `app/(app)/_hoy/acciones.ts` y formularios (Task 4) si `acciones.ts` llama a `insertarRegistro(sql, r, intentos)`. Para dejar esta tarea en verde, en `acciones.ts` hacer el mínimo: quitar el tercer argumento de `insertarRegistro`, `insertarSesionRegistrada`, `corregirRegistroBd`, `conRegistro` y `conRegistroCorregido`, y en `leerRegistro` devolver `filasIntentos: []` temporalmente (lo sustituye la Task 4).

Run: `npm run tsc && npm test`
Expected: PASS.

Run (base de pruebas): `npm run migrar:pruebas && npm run probar-bd`
Expected: `base de datos correcta: 27 casos rechazados` (25 + 2). Si la variable `E2E_DATABASE_URL` no está en `.env.local`, anotarlo y seguir; lo comprueba la Task 6.

- [ ] **Step 6: Commit (Tasks 2 + 3)**

```bash
git add motor/diagnostico.ts motor/diagnostico.test.ts motor/index.ts migraciones/004_freno.sql scripts/probar-bd.ts lib "app/(app)/_hoy/acciones.ts"
git commit -m "feat(diagnostico): el limitante sale de «¿Qué te frenó hoy?» corregido por los tests, con fortaleza

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Registro — «¿Qué te frenó hoy?» en lugar de «+ intento»

**Files:**
- Create: `app/(app)/_hoy/CamposFreno.tsx`
- Delete: `app/(app)/_hoy/CamposIntentos.tsx`
- Modify: `lib/nombres.ts:23-31,37-38` (`FRENOS`, `NOMBRE_FRENO`, `TIPOS_AL_LIMITE`; quitar `MOTIVOS_CAIDA` y `NOMBRE_MOTIVO`)
- Modify: `lib/formulario.ts` (`freno`, `encadene`; quitar `intentos`, `MAX_INTENTOS`)
- Modify: `app/(app)/_hoy/acciones.ts` (`leerRegistro`)
- Modify: `app/(app)/_hoy/FormularioRegistro.tsx`, `app/(app)/_hoy/FormularioEntrenamientoLibre.tsx`, `app/(app)/_hoy/TarjetaSesion.tsx:104-120`
- Test: `lib/formulario.test.ts`

**Interfaces:**
- Consumes: `Freno` (motor), `FilaRegistro.freno/encadene` (Task 3).
- Produces: `FRENOS: readonly Freno[]`, `NOMBRE_FRENO: Record<Freno, string>`, `TIPOS_AL_LIMITE: readonly TipoSesion[]` en `lib/nombres.ts`; `freno(fd): Freno | null`, `encadene(fd): boolean` en `lib/formulario.ts`; componente `CamposFreno({ freno?: Freno | null; encadene?: boolean })`.

- [ ] **Step 1: Test que falla**

En `lib/formulario.test.ts`, sustituir el `describe`/`it` de `intentos(...)` (línea ~35-50) por:

```ts
describe('freno y encadene', () => {
  const fd = (campos: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(campos)) f.set(k, v)
    return f
  }
  it('freno: vacío → null; un valor válido; uno inválido lanza', () => {
    expect(freno(fd({}))).toBeNull()
    expect(freno(fd({ freno: 'bombeo' }))).toBe('bombeo')
    expect(freno(fd({ freno: 'nada' }))).toBe('nada')
    expect(() => freno(fd({ freno: 'lluvia' }))).toThrow(/opción no válida/)
  })
  it('encadene: solo con la casilla marcada', () => {
    expect(encadene(fd({}))).toBe(false)
    expect(encadene(fd({ encadene: 'on' }))).toBe(true)
  })
})
```
y en el import cambiar `intentos` por `encadene, freno`.

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/formulario.test.ts`
Expected: FAIL (`freno` no exportado).

- [ ] **Step 3: Implementar**

`lib/nombres.ts`: sustituir `MOTIVOS_CAIDA` y `NOMBRE_MOTIVO` por:

```ts
// Respuestas a «¿Qué te frenó hoy?» (P-69), en el orden en que se muestran.
export const FRENOS = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada'] as const satisfies readonly Freno[]

export const NOMBRE_FRENO: Record<Freno, string> = {
  bombeo: 'Me bombeé',
  'paso-fuerza': 'No aguantaba las presas',
  'tecnica-lectura': 'No vi o no leí el movimiento',
  cabeza: 'Miedo, no me atreví',
  nada: 'Nada, buen día',
}
```
y sustituir `TIPOS_CON_INTENTOS` por:

```ts
// Sesiones al límite: al terminarlas se pregunta «¿Qué te frenó hoy?» (alimenta el diagnóstico, P-69).
export const TIPOS_AL_LIMITE: readonly TipoSesion[] = ['via-cuerda-limite', 'pegues-proyecto', 'bloque-limite']
```
(Importar `type Freno` del motor; quitar `MotivoCaida` del import si queda sin uso.) Renombrar todas las apariciones de `TIPOS_CON_INTENTOS` (`grep -rn TIPOS_CON_INTENTOS app lib components`).

`lib/formulario.ts`: sustituir `MAX_INTENTOS` e `intentos(...)` por:

```ts
// «¿Qué te frenó hoy?»: opcional.
export function freno(fd: FormData): Freno | null {
  return opcionOpcional(fd, 'freno', 'Qué te frenó', FRENOS)
}

export function encadene(fd: FormData): boolean {
  return fd.get('encadene') === 'on'
}
```
y en los imports: `MotivoCaida` → `Freno`, `MOTIVOS_CAIDA` → `FRENOS`.

Crear `app/(app)/_hoy/CamposFreno.tsx`:

```tsx
import type { Freno } from '@/motor'
import { Opciones } from '@/components/ui/Opciones'
import { FRENOS, NOMBRE_FRENO } from '@/lib/nombres'

// Al terminar una sesión al límite: una sola pregunta (P-69) y, aparte, si se encadenó algo. Las dos opcionales.
// La casilla va como las Opciones: el input real encima y transparente, el aspecto en el span.
export function CamposFreno({ freno, encadene }: { freno?: Freno | null; encadene?: boolean }) {
  return (
    <div className="space-y-2">
      <Opciones
        nombre="freno"
        leyenda="¿Qué te frenó hoy?"
        columnas={2}
        opciones={FRENOS.map((f) => ({ valor: f, texto: NOMBRE_FRENO[f] }))}
        {...(freno ? { valor: freno } : {})}
      />
      <label className="relative block">
        <input type="checkbox" name="encadene" defaultChecked={encadene ?? false} className="peer absolute inset-0 cursor-pointer opacity-0" />
        <span className="flex min-h-11 items-center justify-center rounded-xl border border-borde bg-superficie-2 px-2 text-center transition-colors peer-checked:border-cima peer-checked:bg-cima peer-checked:font-bold peer-checked:text-fondo peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-progreso">
          ✓ Hoy encadené algo al límite
        </span>
      </label>
    </div>
  )
}
```
(Comprobar que existen las clases `bg-cima`/`border-cima` en `app/globals.css` (`--color-cima`); si el token se llama distinto, usar el del naranja de cima que ya usa la tarjeta Grado: `text-cima`.)

Borrar `app/(app)/_hoy/CamposIntentos.tsx`.

`app/(app)/_hoy/acciones.ts` — sustituir `leerRegistro` por:

```ts
// RPE, minutos, molestias y, en las sesiones al límite, qué frenó y si se encadenó (el mismo formulario para registrar
// y para corregir).
function leerRegistro(fd: FormData, fila: FilaSesion): FilaRegistro {
  const alLimite = TIPOS_AL_LIMITE.includes(fila.sesion.tipo)
  return {
    sesion_id: fila.id,
    rpe: entero(fd, 'rpe', 'El esfuerzo', 0, 10),
    duracion_min: entero(fd, 'minutos', 'Los minutos', 1, 1440),
    molestias: molestias(fd),
    registrado_en: new Date().toISOString(),
    freno: alLimite ? freno(fd) : null,
    encadene: alLimite && encadene(fd),
  }
}
```
y en `registrar`, `corregirRegistro` y `apuntarEntrenamiento`: `let leido: ReturnType<typeof leerRegistro>` → `let leido: FilaRegistro`; `leido.registro` → `leido`; quitar todo uso de `leido.filasIntentos`. En `registrar`, el `redirect` queda `redirect(\`/chapa/${leido.sesion_id}\`)`. Imports: `intentos` → `encadene, freno`; `TIPOS_CON_INTENTOS` → `TIPOS_AL_LIMITE`; quitar `FilaIntento`. Actualizar el comentario de `corregirRegistro` («…las molestias y qué te frenó…») y el de `apuntarEntrenamiento` («…la sesión libre y su registro…»).

`app/(app)/_hoy/FormularioRegistro.tsx`:
- Props: `previo?: { registro: FilaRegistro }`.
- Sustituir la línea de `CamposIntentos` por:
```tsx
      {TIPOS_AL_LIMITE.includes(sesion.tipo) && <CamposFreno freno={previo?.registro.freno ?? null} encadene={previo?.registro.encadene ?? false} />}
```
- Imports: `CamposIntentos` → `CamposFreno`; `FilaIntento` fuera; `TIPOS_CON_INTENTOS` → `TIPOS_AL_LIMITE`.

`app/(app)/_hoy/FormularioEntrenamientoLibre.tsx`: `{TIPOS_CON_INTENTOS.includes(tipo) && <CamposIntentos />}` → `{TIPOS_AL_LIMITE.includes(tipo) && <CamposFreno />}` e imports.

`app/(app)/_hoy/TarjetaSesion.tsx` (`Registrada`): `previo={{ registro, intentos }}` → `previo={{ registro }}`; quitar `intentos` de la desestructuración si queda sin uso.

`lib/datos/hoy.ts`: si `intentos` de la tarjeta queda sin ningún consumidor (`grep -rn "\.intentos" app`), quitarlo de la interfaz y del objeto devuelto, y ajustar `lib/datos/hoy.test.ts`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm run tsc && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A app/(app)/_hoy lib/nombres.ts lib/formulario.ts lib/formulario.test.ts lib/datos/hoy.ts lib/datos/hoy.test.ts
git commit -m "feat(registro): «¿Qué te frenó hoy?» y «encadené» sustituyen a «+ intento»

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Progreso — «Tu perfil», último freno y encadenes

**Files:**
- Create: `lib/datos/perfil-limitantes.ts`, `lib/datos/perfil-limitantes.test.ts`
- Create: `components/progreso/Perfil.tsx`
- Modify: `lib/datos/progreso.ts:19-23,64-73,87,104` (`resumenEscalada`, logro)
- Modify: `app/(app)/progreso/page.tsx` (tarjeta nueva y «Último freno»)
- Modify: `app/(app)/via/page.tsx:76` (texto «tests y caídas»)
- Test: `lib/datos/progreso.test.ts`

**Interfaces:**
- Consumes: `diagnosticar`, `ajusteCiclo2`, `FuenteDiagnostico`, `Limitante` (motor); `frenosMotor`, `evaluacionesMotor` (mapeo); `temporadaDe` (peticion); `fechaLarga` (`lib/fecha`); `NOMBRE_FRENO`, `NOMBRE_LIMITANTE` (`lib/nombres`).
- Produces:
  ```ts
  // lib/datos/progreso.ts
  export interface ResumenEscalada { gradoActual: string; gradoObjetivo: string; encadenes: number; ultimoFreno: MotivoCaida | null }
  // lib/datos/perfil-limitantes.ts
  export interface VistaPerfil {
    limita: { cualidad: Limitante; origen: string }
    fuerte: { cualidad: Limitante; origen: string } | null
    plan: string | null
    sinDatos: boolean
  }
  export function vistaPerfil(d: DatosAtleta, hoy: string): VistaPerfil | null   // null si el cálculo falla
  ```

- [ ] **Step 1: Tests que fallan**

En `lib/datos/progreso.test.ts`, añadir (usando los helpers del archivo para crear datos con sesiones y registros; si no hay uno para registros, construirlos a mano como en `cambios.test.ts`):

```ts
describe('resumenEscalada con «¿Qué te frenó hoy?»', () => {
  it('encadenes suma intentos antiguos y registros marcados; último freno sale de la respuesta más reciente distinta de «nada»', () => {
    const d = datosVacios()
    d.sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05'), sesionFila(uuid(3), '2026-11-06')]
    d.intentos = [{ id: uuid(9), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: true, motivo_caida: null }]
    d.registros = [
      { ...registro(uuid(1)) },
      { ...registro(uuid(2)), freno: 'cabeza', encadene: true },
      { ...registro(uuid(3)), freno: 'nada' },
    ]
    const r = resumenEscalada(d, '2026-11-06')
    expect(r.encadenes).toBe(2)
    expect(r.ultimoFreno).toBe('cabeza')
  })
  it('sin respuestas, el último freno es el último motivo de un intento antiguo', () => {
    const d = datosVacios()
    d.sesiones = [sesionFila(uuid(1), '2026-11-03')]
    d.intentos = [{ id: uuid(9), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: false, motivo_caida: 'bombeo' }]
    expect(resumenEscalada(d, '2026-11-06').ultimoFreno).toBe('bombeo')
  })
  it('el logro «Primer encadene» también sale de un registro marcado', () => {
    const d = datosVacios()
    d.sesiones = [sesionFila(uuid(2), '2026-11-05')]
    d.registros = [{ ...registro(uuid(2)), encadene: true }]
    expect(logros(d, '2026-11-06').find((l) => l.id === 'primer-encadene')).toMatchObject({ conseguido: true, fecha: '2026-11-05' })
  })
})
```

Crear `lib/datos/perfil-limitantes.test.ts` (helpers igual que arriba; `datosVacios()` debe traer un perfil con temporada `2026-11-02` → `2027-10-04`; si no, fijarlo en el test):

```ts
import { describe, expect, it } from 'vitest'
import { vistaPerfil } from './perfil-limitantes'
// + los helpers de datos de prueba que usen los tests vecinos

describe('vistaPerfil', () => {
  it('sin datos: orden general, sin fortaleza y aviso de cómo llenarlo', () => {
    const v = vistaPerfil(datosVacios(), '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'fuerza-dedos', origen: 'Orden general de los estudios: aún no hay datos tuyos' })
    expect(v.fuerte).toBeNull()
    expect(v.sinDatos).toBe(true)
    expect(v.plan).toMatch(/^Si sigue así, en el ciclo 2 \(desde el .+\): 10 semanas de fuerza y 4 de resistencia\.$/)
  })
  it('con 6 respuestas de miedo: limita la cabeza, según tus respuestas', () => {
    const d = datosVacios()
    d.sesiones = Array.from({ length: 6 }, (_, i) => sesionFila(uuid(i + 1), `2026-11-0${i + 3}`))
    d.registros = d.sesiones.map((s) => ({ ...registro(s.id), freno: 'cabeza' as const }))
    const v = vistaPerfil(d, '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'cabeza', origen: 'Según lo que respondes al terminar' })
    expect(v.sinDatos).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run lib/datos/progreso.test.ts lib/datos/perfil-limitantes.test.ts`
Expected: FAIL (`ultimoFreno` no existe; módulo `perfil-limitantes` no existe).

- [ ] **Step 3: Implementar**

`lib/datos/progreso.ts`:
- Interfaz:
```ts
export interface ResumenEscalada {
  gradoActual: string
  gradoObjetivo: string
  encadenes: number                  // intentos encadenados antiguos + registros con «encadené», hasta hoy
  ultimoFreno: MotivoCaida | null    // la respuesta más reciente distinta de «nada»; si no hay, el último motivo de un intento antiguo
}
```
- Sustituir `resumenEscalada` por:
```ts
export function resumenEscalada(d: DatosAtleta, hoy: string): ResumenEscalada {
  const hasta = [...d.intentos].filter((i) => i.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const caida = hasta.filter((i) => !i.encadenado && i.motivo_caida).at(-1)
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  const registros = d.registros
    .flatMap((r) => {
      const fecha = fechaDe.get(r.sesion_id)
      return fecha !== undefined && fecha <= hoy ? [{ ...r, fecha }] : []
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.registrado_en.localeCompare(b.registrado_en))
  const freno = registros.filter((r) => r.freno && r.freno !== 'nada').at(-1)?.freno
  return {
    gradoActual: d.perfil.grado_actual,
    gradoObjetivo: d.perfil.grado_objetivo,
    encadenes: hasta.filter((i) => i.encadenado).length + registros.filter((r) => r.encadene).length,
    ultimoFreno: freno && freno !== 'nada' ? freno : (caida?.motivo_caida ?? null),
  }
}
```
- En `logros`, sustituir la línea `const encadene = …` por:
```ts
  const fechaDe = new Map(d.sesiones.map((s) => [s.id, s.fecha]))
  const fechasEncadene = [
    ...d.intentos.filter((i) => i.encadenado).map((i) => i.fecha),
    ...d.registros.filter((r) => r.encadene).flatMap((r) => fechaDe.get(r.sesion_id) ?? []),
  ].filter((f) => f <= hoy).sort()
```
  y en el logro `primer-encadene` usar `fechasEncadene[0] ?? null`.

Crear `lib/datos/perfil-limitantes.ts`:

```ts
// «Tu perfil» en Progreso: lo que más te limita y lo que mejor llevas, con su origen (P-69, P-70, P-71). Puro.
import { ajusteCiclo2, diagnosticar, type FuenteDiagnostico, type Limitante } from '../../motor'
import { fechaLarga } from '../fecha'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, frenosMotor } from './mapeo'
import { temporadaDe } from './peticion'

export interface VistaPerfil {
  limita: { cualidad: Limitante; origen: string }
  fuerte: { cualidad: Limitante; origen: string } | null
  plan: string | null       // qué hace el ciclo 2 con ello; null si la temporada no tiene ciclo 2
  sinDatos: boolean         // el limitante sale del orden general: hay que explicar cómo se llena
}

const ORIGEN: Record<FuenteDiagnostico, string> = {
  respuestas: 'Según lo que respondes al terminar',
  tests: 'Según tus tests',
  'respuestas-y-tests': 'Según tus respuestas, corregido por tus tests',
  evidencia: 'Orden general de los estudios: aún no hay datos tuyos',
}
const ORIGEN_FUERTE = { tests: 'Según tus tests', respuestas: 'Según lo que respondes al terminar' } as const

export function vistaPerfil(d: DatosAtleta, hoy: string): VistaPerfil | null {
  try {
    const evaluaciones = evaluacionesMotor(d.evaluaciones)
    const respuestas = frenosMotor(d)
    const diag = diagnosticar(evaluaciones, respuestas, hoy)
    const lunesCiclo2 = temporadaDe(d).semanas.find((s) => s.ciclo === 2)?.lunes
    let plan: string | null = null
    if (lunesCiclo2) {
      // Antes del ciclo 2, lo que saldría hoy; después, lo fijado con lo sabido aquel lunes (como la temporada).
      const fijado = hoy >= lunesCiclo2
      const a = ajusteCiclo2(fijado ? diagnosticar(evaluaciones, respuestas, lunesCiclo2) : diag)
      const reparto = `${a.fuerza} semanas de fuerza y ${a.resistencia} de resistencia${a.refuerzoTecnica ? ', con técnica extra cada semana' : ''}`
      plan = fijado
        ? `El ciclo 2 lleva ${reparto}.`
        : `Si sigue así, en el ciclo 2 (desde el ${fechaLarga(lunesCiclo2)}): ${reparto}.`
    }
    return {
      limita: { cualidad: diag.limitantes[0]!, origen: ORIGEN[diag.fuente] },
      fuerte: diag.fortaleza ? { cualidad: diag.fortaleza.cualidad, origen: ORIGEN_FUERTE[diag.fortaleza.fuente] } : null,
      plan,
      sinDatos: diag.fuente === 'evidencia',
    }
  } catch {
    return null
  }
}
```

Crear `components/progreso/Perfil.tsx`:

```tsx
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { VistaPerfil } from '@/lib/datos/perfil-limitantes'
import { NOMBRE_LIMITANTE } from '@/lib/nombres'

const mayuscula = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)
// «la fuerza de dedos» → «Fuerza de dedos»
const titulo = (t: string): string => mayuscula(t.replace(/^la /, ''))

// Lo que más te limita (naranja de cima: lo que falta) y lo que mejor llevas (lima de progreso), cada uno con su origen.
export function Perfil({ v }: { v: VistaPerfil }) {
  return (
    <Tarjeta aria-label="Tu perfil">
      <Etiqueta as="h2">Tu perfil</Etiqueta>
      <div className="space-y-1">
        <p className="text-sm text-texto-2">Lo que más te limita</p>
        <p className="font-titular text-3xl font-extrabold uppercase leading-none text-cima">{titulo(NOMBRE_LIMITANTE[v.limita.cualidad])}</p>
        <p className="text-sm text-texto-2">{v.limita.origen}.</p>
        {v.plan && <p className="text-sm">{v.plan}</p>}
      </div>
      <div className="space-y-1 border-t border-borde pt-3">
        <p className="text-sm text-texto-2">Lo que mejor llevas</p>
        {v.fuerte ? (
          <>
            <p className="font-titular text-2xl font-extrabold uppercase leading-none text-progreso">{titulo(NOMBRE_LIMITANTE[v.fuerte.cualidad])}</p>
            <p className="text-sm text-texto-2">{v.fuerte.origen}.</p>
          </>
        ) : (
          <p className="text-sm">Aún no lo sabemos: hacen falta 3 tests o unas semanas respondiendo al terminar.</p>
        )}
      </div>
      {v.sinDatos && (
        <p className="text-sm text-texto-2">Responde «¿Qué te frenó hoy?» al terminar tus sesiones al límite y esto se llenará con tus datos.</p>
      )}
    </Tarjeta>
  )
}
```
(Si `Tarjeta` no espacia sus hijos, envolver el contenido en `<div className="space-y-3">`; mirar `components/ui/Tarjeta.tsx`.)

`app/(app)/progreso/page.tsx`:
- Imports: `import { Perfil } from '@/components/progreso/Perfil'`, `import { vistaPerfil } from '@/lib/datos/perfil-limitantes'`, `NOMBRE_MOTIVO` → `NOMBRE_FRENO`.
- En `PaginaProgreso`, tras `const escalada = …`: `const perfil = vistaPerfil(datos, hoy)`.
- Justo después de `<Fuerza tests={tests} />`: `{perfil && <Perfil v={perfil} />}`.
- En la tarjeta Grado: `{escalada.ultimaCaida && <><br />Última caída: {NOMBRE_MOTIVO[escalada.ultimaCaida]}</>}` → `{escalada.ultimoFreno && <><br />Último freno: {NOMBRE_FRENO[escalada.ultimoFreno]}</>}`.

`app/(app)/via/page.tsx:76`: `con tus tests y caídas` → `con tus tests y lo que respondes al terminar`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm run tsc && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/datos/progreso.ts lib/datos/progreso.test.ts lib/datos/perfil-limitantes.ts lib/datos/perfil-limitantes.test.ts components/progreso/Perfil.tsx "app/(app)/progreso/page.tsx" "app/(app)/via/page.tsx"
git commit -m "feat(progreso): «Tu perfil» con lo que más te limita y lo que mejor llevas; último freno

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: e2e y verificación final

**Files:**
- Modify: `e2e/flujo.spec.ts` (test nuevo al final)

- [ ] **Step 1: Test e2e**

Al final de `e2e/flujo.spec.ts` añadir:

```ts
test('al límite: «¿Qué te frenó hoy?», encadené, último freno y «Tu perfil»', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000f001'
  const sesion = { id, tipo: 'bloque-limite', intensidad: 'alta', fecha: hoy, horaInicio: 23, duracionMin: 30 }
  const explicacion = { regla: 'e2e.freno', parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Bloque al límite', minutos: 30, ejercicios: [{ nombre: 'Pegues', cargaTexto: 'Al límite' }], explicacion }],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto(`/sesion/${id}`)
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await expect(page.getByText('¿Qué te frenó hoy?')).toBeVisible()
  await expect(page.getByText('Intentos al límite')).toHaveCount(0)
  await page.getByLabel('Miedo, no me atreví').check()
  await page.getByLabel('✓ Hoy encadené algo al límite').check()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('8')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/chapa\//)
  const [fila] = await sql`select freno, encadene from registros where sesion_id = ${id}`
  expect(fila).toEqual({ freno: 'cabeza', encadene: true })
  await page.goto('/progreso')
  await expect(page.getByText('Último freno: Miedo, no me atreví')).toBeVisible()
  const perfil = page.getByRole('region', { name: 'Tu perfil' })
  await expect(perfil.getByText('Lo que más te limita')).toBeVisible()
  await expect(perfil.getByText('Lo que mejor llevas')).toBeVisible()
})
```
(Si `Tarjeta` no renderiza un `<section>` con `aria-label` — rol `region` —, usar `page.getByLabel('Tu perfil')`. Si en el entorno ya hay otra sesión de carga alta hoy y el cronómetro no se abre por eso, cambiar `horaInicio` o el día; el cronómetro solo pide que sea de hoy, aceptada y sin registrar.)

- [ ] **Step 2: Migrar la base de pruebas y ejecutar todo**

Run: `npm run migrar:pruebas && npm run probar-bd`
Expected: `base de datos correcta: 27 casos rechazados`.

Run: `npm run tsc && npm test && npm run build`
Expected: todo en verde.

Run: `npm run e2e`
Expected: todas las pruebas en verde (19). Si el puerto del servidor de e2e está ocupado por un `next dev` antiguo (ver memoria del proyecto), ejecutar los e2e en un worktree temporal o pedir a Diego que cierre el proceso; no matar procesos sin permiso.

- [ ] **Step 3: Commit**

```bash
git add e2e/flujo.spec.ts
git commit -m "test(e2e): «¿Qué te frenó hoy?» de punta a punta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Publicar (solo con el visto bueno de Diego)**

Orden acordado en el proyecto: migrar producción primero (`npm run migrar` con la URL de producción) y después fusionar a `master` y `git push`.
