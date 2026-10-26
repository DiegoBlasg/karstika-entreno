# Base de evidencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la base de evidencia verificada (hallazgos tipados y citados) y el documento de conclusiones con los parámetros que usará el motor de entrenamiento.

**Architecture:** Un paquete TypeScript mínimo (sin Next ni Supabase todavía) con un esquema `Hallazgo`, un validador por tests (vitest) y un fichero de datos por bloque temático. Cada bloque se investiga con búsqueda web, verificando cada afirmación contra la fuente primaria. Una síntesis final extrae los parámetros del motor, cada uno enlazado a ids de hallazgos.

**Tech Stack:** TypeScript 5, vitest, Node 20+. Búsqueda e investigación con WebSearch/WebFetch.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-entrenador-escalada-design.md`.
- Idioma de los datos y documentos: español. Citas de fuentes en su idioma original.
- Niveles: **A** = ensayo controlado o metaanálisis · **B** = estudio observacional/fisiológico en escaladores · **C** = consenso de expertos o práctica establecida.
- Perfil objetivo: escalador de 6b, < 2 años de experiencia, sin lesiones; objetivo 7a deportiva en roca.
- Ningún hallazgo sin fuente verificable (DOI o URL) ni sin fecha de verificación.
- No inventar: si no se encuentra la fuente primaria de una afirmación, no entra como A o B; entra como C con la limitación "sin estudio primario localizado", o se descarta.
- Las cifras del motor salen solo de hallazgos. Si no hay evidencia, el parámetro queda marcado `sinEvidencia` en la síntesis.

### Protocolo de investigación (aplica a las tareas 2–10)

1. Buscar con WebSearch al menos 6 consultas variadas por bloque (inglés y español; términos de la tarea; nombres de autores clave).
2. Priorizar: metaanálisis y revisiones sistemáticas → ensayos controlados → estudios en escaladores → libros/consenso de entrenadores (nivel C).
3. Para cada hallazgo candidato, abrir la fuente con WebFetch (PubMed, DOI, editorial, preprint) y comprobar que el enunciado se sostiene con el resumen o el texto. Si solo se leyó un resumen de terceros, no puede ser nivel A o B.
4. Escribir el hallazgo con la afirmación **acotada a lo que el estudio muestra** (población, protocolo, tamaño de muestra) y rellenar `limitaciones`, incluidos conflictos de interés conocidos y contradicciones con otros estudios.
5. Mínimo 8 hallazgos por bloque, y cubrir todas las preguntas de la tarea (o dejar constancia en `docs/evidencia/lagunas.md` de las que no tengan evidencia).
6. Ejecutar `npx vitest run` antes de cada commit.

---

## File Structure

```
package.json, tsconfig.json, vitest.config.ts
evidencia/tipos.ts            esquema Hallazgo, Fuente, Bloque, Nivel
evidencia/dedos.ts            un fichero por bloque, exporta `const hallazgos: Hallazgo[]`
evidencia/index.ts            agrega todos los bloques
evidencia/evidencia.test.ts   validador de esquema e integridad
docs/evidencia/conclusiones.md   síntesis legible
docs/evidencia/parametros.md     parámetros del motor con ids de evidencia
docs/evidencia/lagunas.md        preguntas sin evidencia suficiente
```

Bloques → fichero → prefijo de id: rendimiento `RENDIM`, dedos `DEDOS`, fuerza `FUERZA`, resistencia `RESIST`, tecnica `TECNIC`, tactica `TACTIC`, periodizacion `PERIOD`, lesiones `LESION`, recuperacion `RECUP`.

---

### Task 1: Esquema y validador

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `evidencia/tipos.ts`, `evidencia/index.ts`
- Test: `evidencia/evidencia.test.ts`

**Interfaces:**
- Produces: `Hallazgo`, `Fuente`, `Bloque`, `Nivel` (en `evidencia/tipos.ts`); `todos: Hallazgo[]` y `porId(id: string): Hallazgo | undefined` (en `evidencia/index.ts`).

- [ ] **Step 1: Inicializar el paquete**

```bash
cd /d/karstika-entreno
cat > package.json <<'EOF'
{
  "name": "karstika-entreno",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run", "tsc": "tsc --noEmit" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
EOF
cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "noUncheckedIndexedAccess": true, "skipLibCheck": true, "noEmit": true
  },
  "include": ["evidencia", "motor", "**/*.ts"],
  "exclude": ["node_modules"]
}
EOF
cat > vitest.config.ts <<'EOF'
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['**/*.test.ts'] } })
EOF
printf 'node_modules\n.next\n.env*\n' > .gitignore
npm install
```

Expected: `added N packages`, sin errores.

- [ ] **Step 2: Escribir el test del validador (falla porque aún no hay tipos)**

Create `evidencia/evidencia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { todos } from './index'
import { BLOQUES, PREFIJOS } from './tipos'

const ANIO_MAX = new Date().getFullYear()

describe('base de evidencia', () => {
  it('los ids son únicos', () => {
    const ids = todos.map((h) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(todos.map((h) => [h.id, h] as const))('%s cumple el esquema', (_id, h) => {
    expect(h.id).toMatch(/^EV-[A-Z]{5,6}-\d{3}$/)
    expect(h.id.startsWith(`EV-${PREFIJOS[h.bloque]}-`)).toBe(true)
    expect(BLOQUES).toContain(h.bloque)
    expect(['A', 'B', 'C']).toContain(h.nivel)
    expect(h.afirmacion.trim().length).toBeGreaterThan(20)
    expect(h.limitaciones.trim().length).toBeGreaterThan(10)
    expect(h.fuentes.length).toBeGreaterThan(0)
    expect(h.verificada.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const f of h.fuentes) {
      expect(f.autores.trim()).not.toBe('')
      expect(f.titulo.trim()).not.toBe('')
      expect(f.anio).toBeGreaterThanOrEqual(1970)
      expect(f.anio).toBeLessThanOrEqual(ANIO_MAX)
      expect(Boolean(f.doi || f.url)).toBe(true)
    }
  })

  it('nivel A o B exige verificación contra la fuente primaria', () => {
    for (const h of todos.filter((x) => x.nivel !== 'C')) {
      expect(h.verificada.metodo, h.id).toBe('fuente-primaria')
    }
  })

  it('cada bloque tiene al menos 8 hallazgos', () => {
    for (const b of BLOQUES) {
      expect(todos.filter((h) => h.bloque === b).length, b).toBeGreaterThanOrEqual(8)
    }
  })
})
```

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `npx vitest run`
Expected: FAIL (`Cannot find module './index'`).

- [ ] **Step 4: Implementar tipos e índice**

Create `evidencia/tipos.ts`:

```ts
export type Nivel = 'A' | 'B' | 'C'

export const BLOQUES = [
  'rendimiento', 'dedos', 'fuerza', 'resistencia', 'tecnica',
  'tactica', 'periodizacion', 'lesiones', 'recuperacion',
] as const
export type Bloque = (typeof BLOQUES)[number]

export const PREFIJOS: Record<Bloque, string> = {
  rendimiento: 'RENDIM', dedos: 'DEDOS', fuerza: 'FUERZA', resistencia: 'RESIST',
  tecnica: 'TECNIC', tactica: 'TACTIC', periodizacion: 'PERIOD',
  lesiones: 'LESION', recuperacion: 'RECUP',
}

export interface Fuente {
  autores: string
  anio: number
  titulo: string
  publicacion: string
  doi?: string
  url?: string
}

export interface Hallazgo {
  id: string
  bloque: Bloque
  afirmacion: string
  fuentes: Fuente[]
  nivel: Nivel
  aplicaA: { nivel?: string; experiencia?: string; objetivo?: string }
  limitaciones: string
  verificada: { fecha: string; metodo: 'fuente-primaria' | 'resumen' }
}
```

Create `evidencia/index.ts`:

```ts
import type { Hallazgo } from './tipos'

// Se añade un import por bloque a medida que se investiga (tareas 2–10).
export const todos: Hallazgo[] = []

export const porId = (id: string): Hallazgo | undefined => todos.find((h) => h.id === id)
```

- [ ] **Step 5: Ejecutar tests**

Run: `npx vitest run`
Expected: PASS en unicidad y nivel; FAIL solo en `cada bloque tiene al menos 8 hallazgos` (esperado hasta completar los bloques). Run `npx tsc --noEmit`: sin errores.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(evidencia): schema and integrity validator

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Bloque rendimiento (determinantes del rendimiento en deportiva)

**Files:**
- Create: `evidencia/rendimiento.ts`
- Modify: `evidencia/index.ts` (importar y añadir al array `todos`)

**Interfaces:**
- Consumes: `Hallazgo` de `./tipos`.
- Produces: `export const hallazgos: Hallazgo[]` con ids `EV-RENDIM-001…`.

**Preguntas que debe responder:**
1. ¿Qué variables fisiológicas y antropométricas discriminan a escaladores de 6b, 7a y 7b+? (fuerza de dedos relativa, dominada, *critical force*, flexibilidad de cadera, % graso).
2. ¿Qué peso relativo tienen fuerza, resistencia y técnica en el rendimiento en deportiva (frente a bloque)?
3. ¿Qué valores de referencia (con unidad y protocolo) tienen los escaladores de nivel 6b–7a en suspensión máxima a 20 mm y en dominada?
4. ¿Qué se sabe de la capacidad aeróbica del antebrazo y la recuperación de oxígeno muscular (NIRS)?

Autores/términos de partida: Baláš, Giles, Fryer, MacLeod, Draper, Watts, Michailov, Mermier, Laffaye, "climbing performance determinants", "critical force", "NIRS forearm".

- [ ] **Step 1: Investigar** siguiendo el Protocolo (consultas web, verificación con WebFetch).
- [ ] **Step 2: Escribir `evidencia/rendimiento.ts`** con este formato exacto (un objeto por hallazgo; el siguiente es el molde con sus campos reales, a rellenar con datos verificados):

```ts
import type { Hallazgo } from './tipos'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-RENDIM-001',
    bloque: 'rendimiento',
    afirmacion: '<enunciado acotado a lo que el estudio muestra, con población y protocolo>',
    fuentes: [
      { autores: '<Apellido, I.>', anio: 2000, titulo: '<título>', publicacion: '<revista>', doi: '<doi>' },
    ],
    nivel: 'B',
    aplicaA: { nivel: '<p. ej. 6b–7a>', experiencia: '<si consta>', objetivo: 'deportiva' },
    limitaciones: '<n, población, diseño, contradicciones>',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
]
```

(Los valores `<…>` y los años del molde se sustituyen por los reales; ningún marcador `<…>` puede llegar al commit.)

- [ ] **Step 3: Registrar en el índice.** En `evidencia/index.ts`:

```ts
import { hallazgos as rendimiento } from './rendimiento'
export const todos: Hallazgo[] = [...rendimiento]
```

- [ ] **Step 4: Validar**

Run: `npx vitest run && npx tsc --noEmit`
Expected: los tests de `EV-RENDIM-*` pasan; `grep -rn "<" evidencia/rendimiento.ts` no devuelve marcadores `<…>` pendientes (salvo en genéricos TS).

- [ ] **Step 5: Commit**

```bash
git add evidencia/rendimiento.ts evidencia/index.ts
git commit -m "feat(evidencia): performance determinants block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Bloque dedos (fuerza de dedos)

**Files:** Create `evidencia/dedos.ts` (ids `EV-DEDOS-001…`, mismo molde que Task 2) · Modify `evidencia/index.ts` (importar `hallazgos as dedos` y añadirlo a `todos`).

**Preguntas:**
1. ¿Qué protocolo de multipresa mejora más la fuerza de dedos: suspensiones máximas, *repeaters*, *no-hangs*, intermitentes? ¿Con qué dosis (duración, series, descanso, frecuencia semanal, duración del bloque)?
2. ¿Qué profundidad de regleta y qué agarre (semiabierto, abierto, arqueado) es más eficaz y más seguro?
3. ¿Cuándo es seguro empezar a colgarse y con qué carga si tienes < 2 años de experiencia? ¿Hay evidencia sobre adaptación tendinosa/poleas frente a la muscular?
4. ¿Cuánto mejora la fuerza relativa en 4–12 semanas y qué retorno tiene en el grado escalado?
5. ¿Cómo se mide de forma fiable la fuerza máxima de dedos (protocolos MVC, *Max hang*, test de 20 mm) y con qué reproducibilidad?

Autores/términos: López-Rivera & González-Badillo, Levernier & Laffaye, Medernach, Nelson, Anderson, Lattice, "hangboard training", "maximal strength finger", "intermittent isometric".

- [ ] **Step 1:** Investigar (Protocolo).
- [ ] **Step 2:** Escribir `evidencia/dedos.ts` con el molde de Task 2 (`bloque: 'dedos'`, `id: 'EV-DEDOS-0NN'`).
- [ ] **Step 3:** Registrar en `evidencia/index.ts`.
- [ ] **Step 4:** `npx vitest run && npx tsc --noEmit` → pasan los de `EV-DEDOS-*`.
- [ ] **Step 5:** Commit `feat(evidencia): finger strength block` (con la línea Co-Authored-By de Task 1).

---

### Task 4: Bloque fuerza (fuerza y potencia generales)

**Files:** Create `evidencia/fuerza.ts` (`EV-FUERZA-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Mejora el entrenamiento de dominadas lastradas/tracción el rendimiento en escalada? ¿Qué dosis y qué relación con la fuerza relativa?
2. ¿Qué evidencia hay sobre entrenamiento en board (Moonboard, Kilter, Tension) para mejorar potencia y grado?
3. Campus board: ¿qué beneficio demuestra, qué riesgo de lesión y qué prerrequisitos de fuerza y experiencia se proponen?
4. ¿Aportan algo el trabajo de core, antagonistas y fuerza general (ej. press, hombro)? ¿Con qué evidencia?
5. ¿Hay efecto de interferencia entre fuerza máxima y resistencia en escaladores?

Términos: "pull-up weighted climbers", "campus board injury", "board training climbing", "strength training rock climbers randomized".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'fuerza'`; commit `feat(evidencia): strength and power block`.

---

### Task 5: Bloque resistencia

**Files:** Create `evidencia/resistencia.ts` (`EV-RESIST-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Qué evidencia respalda el ARC / entrenamiento de capacidad (volumen a baja intensidad) y qué dosis?
2. ¿Qué formatos de resistencia de fuerza (4x4, intervalos, series en vía/bloque, *linked boulder problems*) mejoran el rendimiento en vía, con qué intensidad y descansos?
3. ¿Qué papel tiene la *critical force* en el entrenamiento de resistencia y cómo se entrena para elevarla?
4. ¿Qué se sabe de la recuperación intra-sesión y entre intervalos (reoxigenación)?
5. ¿Cómo se reparte el volumen aeróbico y anaeróbico según el nivel?

Términos: "critical force climbing training", "interval training climbing", "aerobic capacity forearm", "4x4 boulder", "power endurance".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'resistencia'`; commit `feat(evidencia): endurance block`.

---

### Task 6: Bloque técnica

**Files:** Create `evidencia/tecnica.ts` (`EV-TECNIC-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Qué dicen los estudios sobre aprendizaje motor en escalada (práctica deliberada, variabilidad, feedback, *constraints-led approach*)?
2. ¿Qué indicadores técnicos distinguen a escaladores expertos (fluidez geométrica de la trayectoria, entropía, inmovilidades, tiempo de contacto, uso de pies)?
3. ¿Qué ejercicios técnicos tienen efectos medidos (silent feet, pies precisos, escalada a ciegas, restricciones)?
4. ¿Cómo se entrena la lectura de vía y la toma de decisiones?
5. ¿Cuánto volumen de práctica técnica es recomendable en escaladores de < 2 años?

Autores/términos: Seifert, Orth, Boulanger, Button, Cordier, Pezzulo, "climbing fluency", "constraints-led approach climbing", "route reading".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'tecnica'`; commit `feat(evidencia): technique block`.

---

### Task 7: Bloque táctica

**Files:** Create `evidencia/tactica.ts` (`EV-TACTIC-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Qué evidencia existe sobre estrategias de proyecto en roca: pegues, trabajo de secuencias, descanso entre intentos, tiempo de recuperación en reposo en la vía?
2. ¿Cómo se transfiere el entrenamiento en sala/board al rendimiento en roca? ¿Hay estudios sobre diferencias roca vs. sala?
3. ¿Qué factores psicológicos (miedo a caer, ansiedad, atención, visualización, autoeficacia) afectan al rendimiento y qué intervenciones tienen evidencia?
4. ¿Qué estrategias de calentamiento específicas para encadenar (cuánto, qué intensidad) hay?
5. ¿Qué dicen los datos sobre el número de intentos y la probabilidad de encadenar un proyecto?

Términos: "fear of falling climbing intervention", "redpoint strategy", "psychological skills climbing", "warm-up climbing performance".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'tactica'`; commit `feat(evidencia): tactics and mental block`.

---

### Task 8: Bloque periodización

**Files:** Create `evidencia/periodizacion.ts` (`EV-PERIOD-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Qué modelo de periodización (lineal, ondulante, por bloques, polarizado) tiene mejor evidencia en escalada y, si no hay, en deportes de fuerza/resistencia comparables?
2. ¿Qué duración y estructura de fases es razonable para pasar de 6b a 7a?
3. ¿Cómo se cuantifica la carga (RPE de sesión, TRIMP, tonelaje en multipresa) y qué validez tienen estas medidas en escalada?
4. ¿Cuándo y cómo descargar (frecuencia, magnitud) y qué señales de sobrecarga son fiables?
5. Distribución de sesiones por semana según días disponibles: ¿qué mínimo de frecuencia es eficaz para fuerza y para resistencia?
6. Descanso mínimo entre sesiones intensas de dedos.

Términos: "periodization climbing", "session RPE climbers", "training load climbing", "block periodization", "deload", "minimum effective dose strength".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'periodizacion'`; commit `feat(evidencia): periodization and load block`.

---

### Task 9: Bloque lesiones

**Files:** Create `evidencia/lesiones.ts` (`EV-LESION-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Cuáles son las lesiones más frecuentes en escalada (poleas A2/A4, epicondilitis, hombro, SLAP) y su incidencia por nivel y años de experiencia?
2. ¿Qué factores de riesgo están asociados (aumento brusco de carga, campus, grado, tipo de agarre, edad)?
3. ¿Qué evidencia hay de eficacia en prevención (calentamiento, antagonistas, progresión de carga)?
4. ¿Cuáles son las señales de alarma de lesión de polea y los criterios de derivación?
5. ¿Qué dicen las guías sobre volver a entrenar tras molestias leves?

Autores/términos: Schöffl, Lutter, Jones, Woollings, Neuhof, "climbing injuries epidemiology", "finger pulley injury", "overuse climbing".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'lesiones'`; commit `feat(evidencia): injuries block`.

---

### Task 10: Bloque recuperación y estilo de vida

**Files:** Create `evidencia/recuperacion.ts` (`EV-RECUP-001…`) · Modify `evidencia/index.ts`.

**Preguntas:**
1. ¿Cuánto sueño y qué higiene del sueño afectan al rendimiento y la lesión en deportistas?
2. ¿Ingesta de proteína, carbohidrato y energía para el deportista de fuerza/resistencia? ¿Qué dice la evidencia de la suplementación (creatina, cafeína)?
3. Disponibilidad energética baja y RED-S en escalada; relación peso corporal–rendimiento sin promover conductas de riesgo.
4. ¿Qué evidencia hay sobre métodos de recuperación (activa, frío, masaje) tras sesiones de escalada?
5. ¿Cómo se ajusta la carga con indicadores de fatiga subjetiva (bienestar, sueño, dolor)?

Términos: "sleep athletes performance", "RED-S climbing", "creatine climbing", "recovery methods strength training".

- [ ] **Steps 1–5:** como Task 3 con `bloque: 'recuperacion'`; commit `feat(evidencia): recovery and lifestyle block`.

---

### Task 11: Síntesis, parámetros del motor y lagunas

**Files:**
- Create: `docs/evidencia/conclusiones.md`, `docs/evidencia/parametros.md`, `docs/evidencia/lagunas.md`
- Test: `evidencia/parametros.test.ts`

**Interfaces:**
- Consumes: `todos`, `porId` de `evidencia/index.ts`.
- Produces: `docs/evidencia/parametros.md`: tabla con una fila por parámetro del motor.

Parámetros que debe fijar (cada uno con valor, unidad, ids de evidencia y nivel mínimo de las evidencias, o `sinEvidencia`):
- dosis de multipresa (duración, series, descanso, frecuencia semanal, duración del bloque, profundidad, agarre);
- progresión máxima semanal de carga en dedos y límites de seguridad para < 2 años de experiencia;
- descanso mínimo entre sesiones intensas de dedos, y máximo de días seguidos de carga alta;
- batería de tests (protocolo exacto, reproducibilidad, frecuencia de reevaluación) y valores de referencia 6b / 7a;
- duración y estructura de fases del macrociclo y modelo de periodización;
- dosis de ARC, resistencia de fuerza y fuerza máxima en board/dominadas;
- umbrales del semáforo de dolor y criterios de derivación;
- criterios de descarga.

- [ ] **Step 1: Escribir el test de trazabilidad (falla sin el documento)**

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { porId } from './index'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')
const filas = md.split('\n').filter((l) => /^\|\s*P-\d{2}/.test(l))

describe('parámetros del motor', () => {
  it('hay al menos 20 parámetros', () => {
    expect(filas.length).toBeGreaterThanOrEqual(20)
  })
  it.each(filas.map((l) => [l.split('|')[1]!.trim(), l] as const))('%s cita evidencia existente o sinEvidencia', (_p, fila) => {
    if (fila.includes('sinEvidencia')) return
    const ids = fila.match(/EV-[A-Z]{5,6}-\d{3}/g) ?? []
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(porId(id), id).toBeDefined()
  })
})
```

- [ ] **Step 2:** Run `npx vitest run evidencia/parametros.test.ts` → FAIL (falta el documento).
- [ ] **Step 3: Escribir `docs/evidencia/parametros.md`** con la tabla `| P-01 | parámetro | valor y unidad | ids EV | nivel mínimo | notas |` (una fila por parámetro de la lista; valores tomados solo de los hallazgos).
- [ ] **Step 4: Escribir `docs/evidencia/conclusiones.md`**: un apartado por bloque (qué está bien establecido, qué es controvertido, qué se decide para este perfil y por qué), citando ids. Escribir `docs/evidencia/lagunas.md` con las preguntas sin evidencia suficiente y cómo las tratará el motor (conservador, nivel C declarado).
- [ ] **Step 5: Validar todo**

Run: `npx vitest run && npx tsc --noEmit`
Expected: todos los tests pasan (incluido el mínimo de 8 por bloque).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs(evidencia): conclusions, engine parameters and gaps

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

- **Cobertura del spec §2:** los 9 bloques (Tasks 2–10), esquema con nivel/limitaciones/aplicabilidad (Task 1), regla de oro ref→evidencia (Task 11 en parámetros; el enlace regla→hallazgo del motor se testea en el subproyecto 2), batería de evaluación y valores de referencia (Task 11).
- **Marcadores:** los `<…>` del molde son plantilla de datos reales y el paso de validación comprueba que no queden.
- **Consistencia de tipos:** `Hallazgo`, `PREFIJOS`, `BLOQUES`, `todos`, `porId` se usan con los mismos nombres en todas las tareas.
