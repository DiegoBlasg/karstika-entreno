# Rediseño móvil · Tanda 3: Progreso, logros y celebraciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La pestaña Progreso muestra la evolución real (fuerza de dedos, grado y encadenes, semanas cumplidas, logros) y la app celebra los dos momentos que hacen avanzar: registrar una sesión («+1 chapa») y llegar a una reunión (apuntar un test).

**Architecture:** Funciones puras en `lib/datos/progreso.ts` y `lib/datos/celebracion.ts` (con tests vitest) sobre `vistaVia`, `progresoLargo`, `cambiosPorResultados` y los datos del atleta. La pantalla Progreso se recompone con los componentes de la tanda 0 y una gráfica SVG propia. Las dos celebraciones son páginas del grupo `app/(enfoque)` (pantalla completa, sin barra): `registrar` redirige a `/chapa/[id]` y `guardarEvaluacion`, solo desde Progreso, a `/reunion/[id]`. No hay tablas nuevas: los logros se derivan de los datos.

**Tech Stack:** Next.js 16.4 (Server Actions con `redirect`, rutas dinámicas con `params` como Promise), React 19, Tailwind 4 (tokens), lucide-react 1.65, vitest 2, Playwright 1.64.

Spec: `docs/superpowers/specs/2026-10-30-rediseno-movil-design.md` (secciones «Progreso», «Momentos de progreso», «Gamificación (moderada)»). Rama: `rediseno-3`, desde `master` cb6c5cc.

## Global Constraints

- Texto de la interfaz en español; Diego usa iPhone (app instalada).
- Solo tema oscuro y solo los tokens de la tanda 0 (`fondo`, `fondo-hundido`, `superficie`, `superficie-2`, `borde`, `pista`, `texto`, `texto-2`, `texto-3`, `progreso`, `cima`, `ambar`, `rojo`). `texto-3` solo en texto grande o decorativo.
- Gamificación moderada: logros solo por hitos reales; constancia en semanas cumplidas (la de descarga cuenta igual); nada de rachas diarias, puntos ni niveles; nada que premie entrenar más de lo planeado.
- Si un test empeora: tono honesto, sin celebración, con posibles causas (descarga, sueño, fatiga).
- Reutilizar `components/estilos.ts`, `components/ui/*` (`CifraGrande`, `Tarjeta`, `Etiqueta`, `BarraProgreso`, `EstadoVacio`, `Aviso`, `Boton`, `Chip`), `components/iconos/Escalada.tsx`, `components/FondoTopo.tsx`, `components/MiniVia.tsx`.
- Zonas táctiles ≥ 44 px; foco visible; una sola acción principal por pantalla; animaciones ≤ 400 ms y desactivadas con `prefers-reduced-motion`.
- No tocar `motor/`. En `lib/` solo `lib/datos/progreso.ts` y `lib/datos/celebracion.ts` (nuevos) y sus tests.
- Leer la guía en `node_modules/next/dist/docs/` antes de escribir código de Next. Borrar cualquier `AGENTS.md` sin seguimiento; nunca commitearlo.
- Navegador y e2e solo contra la base de PRUEBAS (`E2E_DATABASE_URL`), nunca producción. Servidor de pruebas: puerto 3200 con `DATABASE_URL`=`E2E_DATABASE_URL`, `CLAVE_ACCESO`=`E2E_CLAVE_ACCESO`, `SECRETO_SESION=secreto-de-pruebas-e2e-de-al-menos-32-caracteres`; scripts de Playwright en la carpeta temporal del sistema; no imprimir secretos.
- En cada tarea: `npm test`, `npm run tsc`, `npm run build` y, en las tareas con UI, `npm run e2e` en verde.
- Commits con el trailer exacto `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Datos de progreso (`lib/datos/progreso.ts`)

**Files:**
- Create: `lib/datos/progreso.ts`, `lib/datos/progreso.test.ts`

**Interfaces:**
- Consumes: `vistaVia(d, hoy)` y `type ResultadoTest` (`lib/datos/via.ts`; `VistaVia.tests` ya es la serie de fuerza ordenada: `{ fecha, lastreKg, fuerzaRelativa }[]`, y `largos[i]` tiene `numero`, `fase`, `estado`, `chapas[].lunes`, `sesionesHechas`; `cima.lunes`); `temporadaDe(d)` (`lib/datos/peticion.ts`, `semanas: { lunes, descarga }[]`, `inicio`); `lunesDe`, `sumarDias` (`lib/fecha.ts`); `type MotivoCaida` (`motor`).
- Produces:

```ts
export type EstadoSemana = 'cumplida' | 'no-cumplida' | 'neutra' | 'actual'
export interface SemanaCumplida { lunes: string; estado: EstadoSemana; descarga: boolean }
export interface Constancia {
  semanas: SemanaCumplida[]   // desde el inicio de la temporada hasta la semana actual (incluida, como 'actual')
  cumplidas: number
  conSesiones: number         // semanas pasadas con alguna sesión (cumplidas + no cumplidas)
  rachaActual: number         // cumplidas seguidas que terminan en la última semana pasada; las neutras ni suman ni cortan
  mejorRacha: number
}
export function constancia(d: DatosAtleta, hoy: string): Constancia

export interface ResumenEscalada {
  gradoActual: string
  gradoObjetivo: string
  encadenes: number                  // intentos encadenados hasta hoy
  ultimaCaida: MotivoCaida | null    // motivo del último intento no encadenado con motivo, hasta hoy
}
export function resumenEscalada(d: DatosAtleta, hoy: string): ResumenEscalada

export interface Logro { id: string; titulo: string; descripcion: string; conseguido: boolean; fecha: string | null }
export function logros(d: DatosAtleta, hoy: string): Logro[]
```

Reglas:
- **Semana cumplida** (spec): semana pasada (`lunes < lunesDe(hoy)`) desde el lunes de inicio de la temporada, con al menos una sesión guardada que no sea `descanso` y todas sus sesiones no-descanso registradas. Sin sesiones: `neutra`. Con alguna sin registrar: `no-cumplida`. La semana de hoy: `actual`. `descarga` viene de la semana de la temporada con ese lunes (programada). Fuera de temporada (antes del inicio) no hay semanas: `semanas: []`. Si `temporadaDe` lanza, `constancia` devuelve todo vacío/cero.
- **Logros**, en este orden:
  1. `primera-semana` · «Primera semana cumplida» · «Registraste todas las sesiones de una semana.» · fecha = domingo de la primera semana cumplida.
  2. `cuatro-seguidas` · «4 semanas seguidas» · «Cuatro semanas cumplidas una detrás de otra.» · fecha = domingo de la semana que completa la primera racha de 4.
  3. `primer-encadene` · «Primer encadene» · «Encadenaste una vía o un bloque al límite.» · fecha = fecha del primer intento encadenado (≤ hoy).
  4. `record-fuerza` · «Récord de fuerza de dedos» · «Un test mejor que todos los anteriores.» · conseguido si algún test (≤ hoy) supera a todos los anteriores y hay al menos uno anterior; fecha = el último test que fue récord.
  5. Un `largo-N` por largo de la vía · «Largo N · {fase}» · «Largo completado.» · conseguido si `estado === 'hecho'` y `sesionesHechas > 0`; fecha = domingo de su última chapa.
  6. `cima` · «Cima» · «Llegaste a la semana objetivo de la temporada.» · conseguido si `lunesDe(hoy) >= cima.lunes`; fecha = `cima.lunes`.
  No conseguidos: `fecha: null`.

- [ ] **Step 1: Tests que fallan `lib/datos/progreso.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaIntento, FilaRegistro } from './filas'
import { constancia, logros, resumenEscalada } from './progreso'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })
const evaluacion = (n: number, fecha: string, lastre: number): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, tecnica: null })
const intento = (n: number, fecha: string, encadenado: boolean, motivo: FilaIntento['motivo_caida'] = null): FilaIntento =>
  ({ id: uuid(200 + n), sesion_id: uuid(1), fecha, encadenado, motivo_caida: motivo })

// Temporada de prueba: empieza el lunes 2026-11-02; base 4 semanas; fuerza desde 2026-11-30 (descarga 2026-12-21).
describe('constancia', () => {
  it('cumplida, no cumplida, neutra y actual', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05'),     // semana 1: todas registradas
      sesionFila(uuid(3), '2026-11-10'), sesionFila(uuid(4), '2026-11-12'),     // semana 2: una sin registrar
      sesionFila(uuid(5), '2026-11-17', { tipo: 'descanso' }),                  // semana 3: solo descanso → neutra
      sesionFila(uuid(6), '2026-11-24'),                                        // semana 4: cumplida
    ]
    const registros = [uuid(1), uuid(2), uuid(3), uuid(6)].map(registro)
    const c = constancia(datosVacios({ sesiones, registros }), '2026-12-02')
    expect(c.semanas.map((s) => [s.lunes, s.estado])).toEqual([
      ['2026-11-02', 'cumplida'], ['2026-11-09', 'no-cumplida'], ['2026-11-16', 'neutra'], ['2026-11-23', 'cumplida'], ['2026-11-30', 'actual'],
    ])
    expect(c).toMatchObject({ cumplidas: 2, conSesiones: 3, rachaActual: 1, mejorRacha: 1 })
  })

  it('la neutra no corta la racha y la descarga cuenta igual', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-30'), sesionFila(uuid(2), '2026-12-07'),
      sesionFila(uuid(3), '2026-12-21'),                                        // semana de descarga
    ]                                                                           // 2026-12-14: sin sesiones (neutra)
    const registros = [uuid(1), uuid(2), uuid(3)].map(registro)
    const c = constancia(datosVacios({ sesiones, registros }), '2026-12-30')
    expect(c.semanas.find((s) => s.lunes === '2026-12-21')).toEqual({ lunes: '2026-12-21', estado: 'cumplida', descarga: true })
    expect(c.rachaActual).toBe(3)
  })

  it('antes de la temporada no hay semanas', () => {
    expect(constancia(datosVacios(), '2026-10-20')).toEqual({ semanas: [], cumplidas: 0, conSesiones: 0, rachaActual: 0, mejorRacha: 0 })
  })
})

describe('resumenEscalada', () => {
  it('grado del perfil, encadenes y última caída hasta hoy', () => {
    const intentos = [intento(1, '2026-11-10', false, 'bombeo'), intento(2, '2026-11-12', true), intento(3, '2026-11-14', false, 'cabeza'), intento(4, '2026-11-20', true)]
    expect(resumenEscalada(datosVacios({ intentos }), '2026-11-15')).toEqual({ gradoActual: '6b', gradoObjetivo: '7a', encadenes: 1, ultimaCaida: 'cabeza' })
  })
})

describe('logros', () => {
  it('sin datos: ninguno conseguido; uno por largo y la cima al final', () => {
    const l = logros(datosVacios(), '2026-11-04')
    expect(l.map((x) => x.id)).toEqual(['primera-semana', 'cuatro-seguidas', 'primer-encadene', 'record-fuerza', 'largo-1', 'largo-2', 'largo-3', 'largo-4', 'largo-5', 'largo-6', 'largo-7', 'largo-8', 'cima'])
    expect(l.every((x) => !x.conseguido && x.fecha === null)).toBe(true)
    expect(l.find((x) => x.id === 'largo-2')?.titulo).toBe('Largo 2 · Fuerza de dedos')
  })

  it('récord, encadene, primera semana y largo completado con su fecha', () => {
    const sesiones = [sesionFila(uuid(1), '2026-11-03')]
    const registros = [registro(uuid(1))]
    const evaluaciones = [evaluacion(1, '2026-10-30', 8), evaluacion(2, '2026-11-25', 7), evaluacion(3, '2026-11-27', 10)]
    const intentos = [intento(1, '2026-11-04', true)]
    const l = logros(datosVacios({ sesiones, registros, evaluaciones, intentos }), '2026-12-02')
    const por = (id: string) => l.find((x) => x.id === id)!
    expect(por('primera-semana')).toMatchObject({ conseguido: true, fecha: '2026-11-08' })
    expect(por('primer-encadene')).toMatchObject({ conseguido: true, fecha: '2026-11-04' })
    expect(por('record-fuerza')).toMatchObject({ conseguido: true, fecha: '2026-11-27' })
    expect(por('largo-1')).toMatchObject({ conseguido: true, fecha: '2026-11-29' })
    expect(por('largo-2').conseguido).toBe(false)
    expect(por('cuatro-seguidas').conseguido).toBe(false)
  })

  it('un solo test no es récord', () => {
    const l = logros(datosVacios({ evaluaciones: [evaluacion(1, '2026-11-05', 10)] }), '2026-11-10')
    expect(l.find((x) => x.id === 'record-fuerza')?.conseguido).toBe(false)
  })
})
```

Run: `npx vitest run lib/datos/progreso.test.ts` → FAIL.

- [ ] **Step 2: Implementar `lib/datos/progreso.ts`**

```ts
// Progreso real del atleta: constancia por semanas, escalada y logros (derivados, sin tabla propia). Puro.
import type { MotivoCaida, SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { temporadaDe } from './peticion'
import { vistaVia } from './via'

// (interfaces de «Produces», exportadas)

const VACIA: Constancia = { semanas: [], cumplidas: 0, conSesiones: 0, rachaActual: 0, mejorRacha: 0 }

export function constancia(d: DatosAtleta, hoy: string): Constancia {
  let semanasPlan: readonly SemanaPlan[]
  try {
    semanasPlan = temporadaDe(d).semanas
  } catch {
    return VACIA
  }
  const lunesHoy = lunesDe(hoy)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const semanas: SemanaCumplida[] = []
  for (const s of semanasPlan) {
    if (s.lunes > lunesHoy) break
    if (s.lunes === lunesHoy) { semanas.push({ lunes: s.lunes, estado: 'actual', descarga: s.descarga }); break }
    const deLaSemana = d.sesiones.filter((x) => x.fecha >= s.lunes && x.fecha <= sumarDias(s.lunes, 6) && x.sesion.tipo !== 'descanso')
    const estado: EstadoSemana = deLaSemana.length === 0 ? 'neutra' : deLaSemana.every((x) => registradas.has(x.id)) ? 'cumplida' : 'no-cumplida'
    semanas.push({ lunes: s.lunes, estado, descarga: s.descarga })
  }
  let racha = 0
  let mejorRacha = 0
  for (const s of semanas) {
    if (s.estado === 'cumplida') { racha++; mejorRacha = Math.max(mejorRacha, racha) }
    else if (s.estado === 'no-cumplida') racha = 0
  }
  return {
    semanas,
    cumplidas: semanas.filter((s) => s.estado === 'cumplida').length,
    conSesiones: semanas.filter((s) => s.estado === 'cumplida' || s.estado === 'no-cumplida').length,
    rachaActual: racha,
    mejorRacha,
  }
}

export function resumenEscalada(d: DatosAtleta, hoy: string): ResumenEscalada {
  const hasta = [...d.intentos].filter((i) => i.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const caida = hasta.filter((i) => !i.encadenado && i.motivo_caida).at(-1)
  return {
    gradoActual: d.perfil.grado_actual,
    gradoObjetivo: d.perfil.grado_objetivo,
    encadenes: hasta.filter((i) => i.encadenado).length,
    ultimaCaida: caida?.motivo_caida ?? null,
  }
}

const domingo = (lunes: string): string => sumarDias(lunes, 6)

export function logros(d: DatosAtleta, hoy: string): Logro[] {
  const c = constancia(d, hoy)
  const via = vistaVia(d, hoy)
  const cumplidas = c.semanas.filter((s) => s.estado === 'cumplida')
  let racha = 0
  let cuatro: string | null = null
  for (const s of c.semanas) {
    if (s.estado === 'cumplida') { racha++; if (racha === 4 && !cuatro) cuatro = domingo(s.lunes) }
    else if (s.estado === 'no-cumplida') racha = 0
  }
  const encadene = [...d.intentos].filter((i) => i.encadenado && i.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  let record: string | null = null
  let mejor = -Infinity
  via.tests.filter((t) => t.fecha <= hoy).forEach((t, i) => {
    if (i > 0 && t.fuerzaRelativa > mejor) record = t.fecha
    mejor = Math.max(mejor, t.fuerzaRelativa)
  })
  const logro = (id: string, titulo: string, descripcion: string, fecha: string | null): Logro =>
    ({ id, titulo, descripcion, conseguido: fecha !== null, fecha })
  return [
    logro('primera-semana', 'Primera semana cumplida', 'Registraste todas las sesiones de una semana.', cumplidas[0] ? domingo(cumplidas[0].lunes) : null),
    logro('cuatro-seguidas', '4 semanas seguidas', 'Cuatro semanas cumplidas una detrás de otra.', cuatro),
    logro('primer-encadene', 'Primer encadene', 'Encadenaste una vía o un bloque al límite.', encadene?.fecha ?? null),
    logro('record-fuerza', 'Récord de fuerza de dedos', 'Un test mejor que todos los anteriores.', record),
    ...via.largos.map((l) =>
      logro(`largo-${l.numero}`, `Largo ${l.numero} · ${l.fase}`, 'Largo completado.',
        l.estado === 'hecho' && l.sesionesHechas > 0 ? domingo(l.chapas.at(-1)!.lunes) : null)),
    logro('cima', 'Cima', 'Llegaste a la semana objetivo de la temporada.', via.largos.length > 0 && lunesDe(hoy) >= via.cima.lunes ? via.cima.lunes : null),
  ]
}
```

(Comprobar que `SemanaPlan` y `MotivoCaida` se exportan desde `motor`; si no, importarlos del módulo que los define.)

Run: `npx vitest run lib/datos/progreso.test.ts` → PASS. Si alguna fecha esperada no cuadra con la temporada real, investigar y explicarlo; no cambiar la expectativa a ciegas.

- [ ] **Step 3: Verificar y commit**

Run: `npm test && npm run tsc && npm run build`.

```bash
git add lib/datos/progreso.ts lib/datos/progreso.test.ts
git commit -m "feat(datos): constancia por semanas, resumen de escalada y logros derivados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pantalla Progreso

**Files:**
- Create: `components/progreso/GraficaFuerza.tsx`, `components/progreso/Constancia.tsx`, `components/progreso/Logros.tsx`
- Modify: `app/(app)/progreso/page.tsx`, `e2e/zz-navegacion.spec.ts`

**Interfaces:**
- Consumes: `constancia`, `resumenEscalada`, `logros`, tipos (Task 1); `vistaVia(d, hoy).tests` (serie de fuerza); `NOMBRE_MOTIVO` (`lib/nombres.ts`); `CifraGrande`, `Etiqueta`, `Tarjeta`, `EstadoVacio`, `BarraProgreso` (`components/ui`); `fechaLarga` (`lib/fecha.ts`).
- Produces: `GraficaFuerza({ tests }: { tests: ResultadoTest[] })`, `Constancia({ c }: { c: Constancia })`, `Logros({ lista }: { lista: Logro[] })`.

- [ ] **Step 1: Cargar la skill `dataviz`** antes de escribir la gráfica y la fila de semanas (es obligatoria para cualquier gráfica): seguir su método para forma, color (tokens del proyecto: línea `progreso`, ejes/rejilla `borde`, etiquetas `texto-2`), marcas y texto alternativo.

- [ ] **Step 2: Componentes**

- `GraficaFuerza`: SVG propio (sin librerías), ancho al 100 % con `viewBox`, alto ~120 px. Un punto por test (% del peso) unido por línea lima; el último punto destacado (anillo); eje Y con mínimo y máximo redondeados y 2–3 líneas de rejilla en `borde`; fechas cortas bajo los puntos extremos. Solo con ≥ 2 tests. Accesible: `role="img"` y `aria-label` con el resumen en texto («De 112 % el 30 oct a 118 % el 20 ene: +6 puntos»), más una lista oculta visualmente (`sr-only`) con todos los puntos.
- `Constancia`: título «Semanas cumplidas», cifra «N de M» (cumplidas de `conSesiones`) y racha («Racha: 3 semanas»; mejor racha si es mayor). Fila de bloques por semana: cumplida lima, cumplida de descarga lima al 50 %, no cumplida `ambar` al 40 %, neutra `pista`, actual con borde lima. Cada bloque con `title` y una leyenda bajo la fila (texto, no solo color). Si hay más de 16 semanas, mostrar las 16 últimas y «+N anteriores».
- `Logros`: rejilla de 3 columnas; cada logro una ficha con icono (hexágono con `IconoChapa` para semanas, `IconoCima` para cima, `IconoReunion` para récord, `IconoPresa` para encadene, `IconoCuerda` para largos), título y, si conseguido, la fecha corta; no conseguidos con opacidad 40 % y «Pendiente» en texto. Encabezado «Logros · N de M».

- [ ] **Step 3: Página `app/(app)/progreso/page.tsx`**

Orden:
1. Cabecera: `<h1>` «Tu progreso» (`font-titular text-4xl font-extrabold uppercase`, «progreso» en lima).
2. Aviso de tests sin resultado (si lo hay, como ahora) con `Aviso tono="info"`.
3. Tarjeta «Fuerza de dedos · % del peso»: con 0 tests → `EstadoVacio` («Aún no hay tests» · «El entrenador te propondrá el primero cuando toque.»); con 1 → `CifraGrande` del test y «Tu primera marca · {fecha}»; con ≥ 2 → `CifraGrande` del último con `delta` frente al anterior (sube/baja/igual si |dif| < 1) y `GraficaFuerza`.
4. Tarjeta «Grado»: actual → objetivo (actual en `texto`, objetivo en `cima`), «N encadenes al límite» y «Última caída: {NOMBRE_MOTIVO[...]}» si la hay.
5. `Constancia`.
6. `Logros`.
7. «Apuntar un resultado de test»: el formulario y el historial actuales (mismo contenido; el `<h2>` con el estilo nuevo). El formulario de esta página envía un campo oculto `tras` con valor `reunion` (lo usa la Task 4).

- [ ] **Step 4: e2e** — en `e2e/zz-navegacion.spec.ts`:

```ts
test('Progreso: fuerza, grado, semanas cumplidas y logros', async ({ page }) => {
  await page.goto('/progreso')
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible()
  await expect(page.getByText('Fuerza de dedos · % del peso')).toBeVisible()
  await expect(page.getByText('Semanas cumplidas')).toBeVisible()
  await expect(page.getByText(/^Logros · \d+ de \d+$/)).toBeVisible()
})
```

- [ ] **Step 5: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e`. Capturas 390 × 844 (base de pruebas) de Progreso entero en `.superpowers/sdd/tanda3-progreso*.png`; mirarlas y corregir.

```bash
git add components/progreso "app/(app)/progreso" e2e
git commit -m "feat(progreso): fuerza de dedos con gráfica, grado, semanas cumplidas y logros

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: «+1 chapa» al registrar una sesión

**Files:**
- Create: `lib/datos/celebracion.ts`, `lib/datos/celebracion.test.ts`, `app/(enfoque)/chapa/[id]/page.tsx`
- Modify: `app/(app)/_hoy/acciones.ts` (`registrar`), `e2e/flujo.spec.ts`

**Interfaces:**
- Consumes: `progresoLargo` (`lib/datos/largo.ts`), `logros` (Task 1), `objetivoRpe` (`motor`), `MiniVia`.
- Produces:

```ts
export type Valoracion = 'previsto' | 'mas-duro' | 'mas-suave' | 'sin-objetivo'
export interface ResumenRegistro {
  sesion: FilaSesion
  registro: FilaRegistro
  largo: ProgresoLargo | null           // progresoLargo(d, sesion.fecha)
  esfuerzo: { rpe: number; objetivo: number | null; valoracion: Valoracion }
  siguiente: FilaSesion | null          // la primera sesión sin registrar posterior (fecha y hora) a esta
  logrosNuevos: Logro[]                 // conseguidos con fecha === sesion.fecha o en su semana (fecha <= domingo de la semana y >= lunes)
  conTest: string | null                // id de la evaluación de esa fecha si la sesión es 'evaluacion-dedos'
}
export function resumenRegistro(d: DatosAtleta, sesionId: string): ResumenRegistro | null
export function textoEsfuerzo(e: ResumenRegistro['esfuerzo']): string
```

Reglas de esfuerzo (`objetivo = objetivoRpe(sesion.sesion) ?? null`): sin objetivo → `sin-objetivo`; `rpe > objetivo` → `mas-duro`; `rpe < objetivo - 2` → `mas-suave`; si no, `previsto`. Textos:
- `previsto`: «Esfuerzo {rpe}/10: lo previsto. La carga sigue su curso.»
- `mas-duro`: «Esfuerzo {rpe}/10: más duro de lo previsto (máximo {objetivo}). El entrenador no subirá la carga en la próxima.»
- `mas-suave`: «Esfuerzo {rpe}/10: más suave de lo previsto.»
- `sin-objetivo`: «Esfuerzo {rpe}/10.»

- [ ] **Step 1: Tests que fallan `lib/datos/celebracion.test.ts`** — casos: sesión inexistente o sin registrar → `null`; valoración de los 4 casos con `textoEsfuerzo` exacto (usar una sesión `tecnica` suave y una `multipresa-resistencia` alta; leer `objetivoRpe` para saber sus máximos y escribirlos literales en el test); `siguiente` = la primera sin registrar posterior (mismo día más tarde cuenta; anteriores y registradas no); `logrosNuevos` incluye «Primera semana cumplida» cuando ese registro completa la primera semana; `conTest` con una `evaluacion-dedos` y una evaluación del mismo día.

Run: `npx vitest run lib/datos/celebracion.test.ts` → FAIL. Implementar `resumenRegistro` y `textoEsfuerzo` en `lib/datos/celebracion.ts` → PASS.

- [ ] **Step 2: `registrar` redirige a la chapa**

En `app/(app)/_hoy/acciones.ts`, al final de `registrar` (solo en el éxito, después de `revalidatePath('/')`): `redirect(`/chapa/${leido.registro.sesion_id}`)` (import de `next/navigation`; comprobar en la guía de Server Actions de `node_modules/next/dist/docs` que `redirect` dentro de una acción usada con `useActionState` navega en esta versión). `corregirRegistro` no cambia. El formulario de entrenamiento libre no cambia.

- [ ] **Step 3: Página `app/(enfoque)/chapa/[id]/page.tsx`**

Servidor; `params` es una Promise. `requerirDatos()`, `resumenRegistro(datos, id)`; si es `null` → `redirect('/')`. Contenido, centrado y de arriba abajo:
- Dibujo de la chapa clavándose: un tramo de vía SVG con chapas lima y la nueva marcada (animación CSS de entrada ≤ 400 ms: escala de 0,6 a 1 y opacidad; sin animación con `motion-reduce:animate-none`).
- `Etiqueta` «Sesión registrada» y `<h1>` «+1 chapa» («chapa» en lima).
- Si hay `largo`: tarjeta con «{fase} · semana X de Y», «N sesiones hechas en este largo» y `BarraProgreso`.
- Tarjeta «Lo que ha entendido el entrenador»: `textoEsfuerzo(...)`.
- Si hay `logrosNuevos`: tarjeta «Logro conseguido» con cada uno.
- Si `conTest`: enlace secundario «Ver tu reunión» a `/reunion/{conTest}`.
- Si hay `siguiente`: tarjeta «Siguiente» con la fecha larga y el nombre de la sesión (`nombreSesion`).
- Acción principal: `<Link href="/" className={`${BOTON} w-full`}>Hecho</Link>`.

- [ ] **Step 4: e2e** — en `e2e/flujo.spec.ts`, en cada sitio donde se pulsa «Registrar» para un registro nuevo (no correcciones): tras el clic, `await expect(page).toHaveURL(/\/chapa\//)`, `await expect(page.getByRole('heading', { name: '+1 chapa' })).toBeVisible()`, `await page.getByRole('link', { name: 'Hecho' }).click()`, `await expect(page).toHaveURL(/\/$/)` y después la aserción de siempre («Hecha · RPE N»). En el flujo del test guiado (cronómetro), comprobar además que aparece «Ver tu reunión».

- [ ] **Step 5: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e`. Captura 390 × 844 de una chapa en `.superpowers/sdd/tanda3-chapa.png`.

```bash
git add lib/datos/celebracion.ts lib/datos/celebracion.test.ts "app/(enfoque)/chapa" "app/(app)/_hoy/acciones.ts" e2e
git commit -m "feat(celebracion): +1 chapa al registrar, con el largo, el esfuerzo y lo siguiente

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Llegada a una reunión al apuntar un test

**Files:**
- Modify: `lib/datos/celebracion.ts`, `lib/datos/celebracion.test.ts`, `app/(app)/progreso/acciones.ts` (`guardarEvaluacion`), `e2e/zz-navegacion.spec.ts`
- Create: `app/(enfoque)/reunion/[id]/page.tsx`

**Interfaces:**
- Consumes: `vistaVia` (reuniones con `resultado.fecha`, numeración R1…Rn en orden de la vía), `cambiosPorResultados(d, hoy)` (`lib/datos/plan.ts`: `repeaters?: { lastreInicial, lastreMaximo }`), `logros`, `textoLastre` (`lib/cronometro/test.ts`).
- Produces:

```ts
export type Mejora = 'sube' | 'baja' | 'igual' | 'primera'
export interface ResumenReunion {
  test: ResultadoTest & { id: string }
  anterior: ResultadoTest | null           // el test anterior por fecha
  diferencia: number | null                // puntos de % del peso (test − anterior)
  mejora: Mejora                           // igual si |diferencia| < 1
  reunion: { numero: number; lunes: string } | null   // la reunión de la vía cuyo resultado es este test
  siguienteLargo: { numero: number; fase: string; objetivo: string; semanas: number } | null  // primer largo que empieza después de la semana del test
  repeaters: { lastreInicial: number; lastreMaximo: number } | null
  logrosNuevos: Logro[]                    // conseguidos con fecha === test.fecha
}
export function resumenReunion(d: DatosAtleta, evaluacionId: string, hoy: string): ResumenReunion | null
```

- [ ] **Step 1: Tests que fallan** (en `lib/datos/celebracion.test.ts`): id inexistente → `null`; primer test → `mejora: 'primera'`, `anterior: null`; segundo test mejor → `sube`, `diferencia` ≈ valor exacto con `toBeCloseTo`, `logrosNuevos` contiene `record-fuerza`; peor → `baja` y sin `record-fuerza`; test dentro de la semana de test del 2027-01-18 → `reunion.lunes === '2027-01-18'` y `siguienteLargo.fase === 'Resistencia de fuerza'` (comprobar el nombre real en `FASES`).

Run → FAIL. Implementar → PASS.

- [ ] **Step 2: `guardarEvaluacion` redirige solo desde Progreso**

Al final del éxito: `if (fd.get('tras') === 'reunion') redirect(`/reunion/${fila.id}`)`; si no, devuelve `{ ok: 'Evaluación guardada.' }` como ahora (el cronómetro del test guiado depende de ese `ok`). Comprobar que `FormularioEvaluacion` (Progreso) envía `tras=reunion` (lo añadió la Task 2; si no, añadirlo aquí).

- [ ] **Step 3: Página `app/(enfoque)/reunion/[id]/page.tsx`**

`resumenReunion(datos, id, hoy)`; `null` → `redirect('/progreso')`. Contenido centrado:
- Insignia de la reunión (círculo lima con «R{n}», o «Test» si no corresponde a una reunión) con fondo radial sutil lima solo si `mejora` es `sube` o `primera`.
- `Etiqueta`: «Reunión R{n} · {fase del largo que termina}» o «Test de dedos».
- Titular según `mejora`: `sube` → «Nuevo récord» (si `record-fuerza` está en `logrosNuevos`) o «Subes»; `igual` → «Te mantienes»; `baja` → «Hoy, algo menos» (sin lima ni celebración); `primera` → «Tu primera marca».
- Tarjeta comparativa: anterior → ahora (`% del peso` y lastre con `textoLastre`), con la diferencia en puntos.
- Si `baja`: `Aviso tono="info"` «Un test peor no borra lo entrenado. Suele pesar más la fatiga, el sueño o una semana de descarga reciente que la fuerza real: repítelo cuando toque.»
- Si `repeaters`: «Tus repeaters: empiezan con {textoLastre(lastreInicial)} y pueden subir hasta {textoLastre(lastreMaximo)}.»
- Si `siguienteLargo`: tarjeta «Siguiente largo» con «L{n} · {fase}», «{semanas} semanas» y el objetivo.
- `logrosNuevos` si hay.
- Acción principal: `Link` «Seguir escalando» a `/via`; secundaria «Volver a Progreso».

- [ ] **Step 4: e2e** — en `e2e/zz-navegacion.spec.ts`:

```ts
test('Progreso: apuntar un test lleva a la reunión', async ({ page }) => {
  await page.goto('/progreso')
  // Rellenar el formulario con los labels reales de FormularioEvaluacion (leerlos antes): fecha de hoy, peso 70, lastre 12.
  // …
  await page.getByRole('button', { name: /Guardar/ }).click()
  await expect(page).toHaveURL(/\/reunion\//)
  await expect(page.getByRole('link', { name: 'Seguir escalando' })).toBeVisible()
  await page.getByRole('link', { name: 'Seguir escalando' }).click()
  await expect(page).toHaveURL(/\/via$/)
})
```

(Completar el relleno con los `label` reales del formulario; si la base de pruebas ya tiene una evaluación de hoy y la validación lo impide, usar una fecha libre de los últimos días y explicarlo.)

- [ ] **Step 5: Verificar y commit**

Run: `npm test && npm run tsc && npm run build && npm run e2e`. Capturas 390 × 844 de una reunión que sube y de una que baja (con datos de la base de pruebas) en `.superpowers/sdd/tanda3-reunion*.png`.

```bash
git add lib/datos/celebracion.ts lib/datos/celebracion.test.ts "app/(enfoque)/reunion" "app/(app)/progreso/acciones.ts" e2e
git commit -m "feat(celebracion): llegada a la reunión al apuntar un test, honesta si empeora

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Cierre de la tanda

- [ ] Revisión final de la rama (modelo más capaz): reglas de semana cumplida y logros frente al spec, redirecciones de las acciones (registrar, guardarEvaluacion) sin romper el cronómetro ni las correcciones, accesibilidad de la gráfica y de las celebraciones, nada que premie entrenar de más.
- [ ] Fusionar en `master`, `npm test` sobre el resultado y, con el visto bueno de Diego, subir a GitHub.
