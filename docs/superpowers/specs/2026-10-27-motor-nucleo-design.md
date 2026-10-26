# Motor, tramo 2a: núcleo (parámetros, explicación, seguridad y contexto)

Fecha: 2026-10-27 · Estado: diseño aprobado en brainstorming (revisado tras el cambio a sesiones a demanda), pendiente de revisión escrita
Depende de: `docs/superpowers/specs/2026-10-26-entrenador-escalada-design.md` (§4) y
`docs/evidencia/parametros.md` (62 parámetros, P-01…P-62).

## Contexto

El motor (spec global §4) se construye en 4 tramos: **2a núcleo** (este), 2b generador de sesión a demanda,
2c macrociclo y diagnóstico, 2d autorregulación y consejos. Cada tramo se entrega y se prueba solo.

Modelo de uso: el usuario no tiene calendario fijo. Pide una sesión para un día concreto, responde tres
preguntas (solo o con gente, dónde, minutos disponibles) y el motor la prepara con el historial reciente.
Por eso la seguridad se valida contra el **historial real con fechas**, no contra una semana cerrada, y
el contexto restringe qué tipos de sesión son posibles.

## Objetivo del tramo 2a

Un módulo `motor/` en TypeScript puro (sin React, Supabase ni acceso a red o reloj) que ofrece:

1. un **registro de parámetros** con trazabilidad a la evidencia,
2. una **explicación automática** derivada de los parámetros usados,
3. **restricciones de contexto**: qué tipos de sesión son posibles según compañía y lugar,
4. **validación de seguridad** de una sesión propuesta frente al historial (restricciones duras).

Reglas transversales: determinista (mismas entradas, mismas salidas), sin fecha implícita (las fechas
entran como datos), sin efectos secundarios, sin mutar las entradas.

## 1. Tipos base (`motor/tipos.ts`)

```ts
export type TipoSesion =
  | 'multipresa-resistencia' | 'multipresa-maxima' | 'board' | 'bloque-limite'
  | 'bloque-suave' | 'via-cuerda-limite' | 'via-autoasegurada' | 'pegues-proyecto'
  | 'campus' | 'resistencia-4x4' | 'arc' | 'tecnica' | 'dominadas' | 'hombro' | 'descanso'

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
  horaInicio: number       // 0 <= h < 24, hora local del usuario (puede tener decimales)
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre; conCarga?: boolean }
}

export interface Violacion {
  regla: string            // p. ej. 'seguridad.dedos-48h' o 'contexto.sin-cuerda'
  sesionIds: string[]
  mensaje: string
  explicacion: Explicacion
}
```

- `multipresa-resistencia` son repeaters submáximos (P-01); `multipresa-maxima` son suspensiones máximas al
  100 %, excluidas para el perfil (P-01, P-12).
- `via-cuerda-limite` y `pegues-proyecto` necesitan compañero; `via-autoasegurada` solo existe en rocódromo.
- Tiempo absoluto de una sesión: `Date.UTC(año, mes-1, día) / 3.6e6 + horaInicio` horas. Se usa la hora
  local del usuario como si fuera continua; los cambios de hora de verano pueden desplazar un resultado
  una hora y no se corrigen (limitación documentada; el margen de 48 h lo absorbe en la práctica).
- Una fecha mal formada, `horaInicio` fuera de `[0, 24)`, `duracionMin <= 0` o ids duplicados lanzan error
  de entrada inválida (no se silencian).

## 2. Metadatos de parámetros (`motor/metadatos.ts`, generado)

- El script `scripts/generar-metadatos.ts` lee `docs/evidencia/parametros.md` y escribe
  `motor/metadatos.ts` (commiteado). Contenido por parámetro:
  `{ id, titulo, origen: 'evidencia' | 'diseno', evidencia: string[], nivelMinimo: 'A'|'B'|'C'|'sinEvidencia' }`.
- `origen = 'diseno'` cuando la fila contiene `sinEvidencia` en la columna de ids. Los ids de las filas
  `sinEvidencia` son apoyo indirecto y se conservan en `evidencia`, pero nunca elevan `nivelMinimo`.
- `ParametroId` es la unión literal `'P-01' | … | 'P-62'`, generada en el mismo fichero.
- Test de deriva: regenerar y comparar con el fichero commiteado; si difieren, el test falla.
- Test de integridad: todos los ids `EV-…` existen en `evidencia/index.ts` y hay exactamente 62 parámetros.

## 3. Valores (`motor/parametros.ts`, escrito a mano)

Solo los valores que el tramo 2a usa; los siguientes tramos añaden los suyos con el mismo patrón.

```ts
export const VALORES = {
  'P-12': { anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, regletaMinimaMm: 20 },
  'P-13': { maxSesionesCampus: 0 },
  'P-14': { horasMinimasEntreSesionesIntensasDedos: 48 },
  'P-15': { tiposIntensosDedos: ['multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite', 'via-cuerda-limite', 'pegues-proyecto'] },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
} as const satisfies Partial<Record<ParametroId, object>>
```

Un test comprueba que cada clave de `VALORES` existe en `metadatos` y que los números coinciden con
`parametros.md`.

Decisión de este diseño: la distancia de P-14 se mide **del fin de una sesión al inicio de la siguiente**
(`inicio + duracionMin/60`), que es la lectura segura (más descanso). El generador del tramo 2b tendrá que
respetarla.

## 4. Explicación (`motor/explicacion.ts`)

```ts
export interface Explicacion {
  regla: string
  parametros: ParametroId[]
  evidencias: string[]                // unión de los ids EV de los parámetros, sin duplicados, ordenada
  nivelMinimo: 'A' | 'B' | 'C' | 'sinEvidencia'   // el peor entre los parámetros usados
  origen: 'evidencia' | 'diseno' | 'contexto'
  motivo: string
}

export function explicar(regla: string, parametros: ParametroId[], motivo: string): Explicacion
export function explicarContexto(regla: string, motivo: string): Explicacion
```

- `explicar` lanza error si `parametros` está vacío o contiene un id desconocido: una decisión de
  entrenamiento sin parámetro no puede existir.
- Orden de niveles: `sinEvidencia` < `C` < `B` < `A`; `nivelMinimo` es el mínimo. `origen` es `'diseno'`
  si algún parámetro usado es de diseño.
- `explicarContexto` es para restricciones logísticas (no hay compañero, no hay material): no dependen de
  la evidencia y devuelven `origen: 'contexto'`, `parametros: []`, `evidencias: []` y `nivelMinimo:
  'sinEvidencia'`. La regla debe empezar por `contexto.` o lanza error.
- `motivo` es texto en español, mostrado en el botón "¿Por qué?".

## 5. Contexto (`motor/contexto.ts`)

```ts
export function tiposPosibles(ctx: Contexto): TipoSesion[]
export function validarContexto(sesion: Sesion, ctx: Contexto): Violacion[]
```

Tabla de posibilidad (una sesión es posible si el contexto lo permite; ya excluidas por seguridad se
tratan en §6):

| Tipo | Compañía | Lugar |
|---|---|---|
| `via-cuerda-limite`, `pegues-proyecto` | `con-gente` | `rocodromo` o `roca` (`pegues-proyecto` solo `roca`) |
| `via-autoasegurada` | cualquiera | `rocodromo` |
| `bloque-limite`, `bloque-suave`, `board`, `tecnica`, `arc` | cualquiera | `rocodromo` (`board` también `casa`) |
| `resistencia-4x4` | cualquiera | `rocodromo` |
| `multipresa-resistencia`, `multipresa-maxima`, `dominadas`, `hombro`, `campus` | cualquiera | `casa` o `rocodromo` |
| `descanso` | cualquiera | cualquiera |

- `tiposPosibles` devuelve la lista ordenada alfabéticamente y siempre incluye `descanso`, así que nunca
  queda vacía.
- `validarContexto` produce las violaciones `contexto.sin-cuerda` (tipo con cuerda sin compañero),
  `contexto.lugar` (tipo no posible en el lugar) y `contexto.tiempo` (`duracionMin > minutosDisponibles`),
  cada una con `explicarContexto`.

## 6. Seguridad (`motor/seguridad.ts`)

```ts
export function validarSesion(propuesta: Sesion, historial: Sesion[], perfil: Perfil): Violacion[]
```

Evalúa la sesión propuesta junto con el historial (sesiones ya hechas o confirmadas, de cualquier fecha).
Solo devuelve violaciones en las que interviene la propuesta. Cada violación lleva su `Explicacion`.

| Regla | Condición de violación | Parámetros |
|---|---|---|
| `seguridad.dedos-48h` | La propuesta y alguna sesión del historial son de tipo en `tiposIntensosDedos` con intensidad `alta` y hay menos de 48 h entre el fin de la anterior y el inicio de la posterior | P-14, P-15 |
| `seguridad.carga-alta-seguida` | Con la propuesta habría más de 2 días naturales consecutivos con alguna sesión de intensidad `alta` (la propuesta es de intensidad `alta`) | P-16 |
| `seguridad.campus` | La propuesta es `campus` y `anosEscalando < 2` | P-13, P-12 |
| `seguridad.maxima-novel` | La propuesta es `multipresa-maxima` y `anosEscalando < 2` | P-01, P-12 |
| `seguridad.multipresa-7dias` | Con la propuesta habría más de 2 sesiones de multipresa en los 7 días naturales que acaban el día de la propuesta y `anosEscalando < 2` | P-12 |
| `seguridad.regleta` | `detalle.regletaMm < 20` en multipresa y `anosEscalando < 2` | P-12 |
| `seguridad.arqueado` | `detalle.agarre === 'arqueado'` y `detalle.conCarga` verdadero (siempre, también con experiencia) | P-10, P-12 |

- La salida está ordenada por regla y luego por ids de sesión, para que sea estable.
- `validarSesion` no valida el contexto; el generador (2b) llama a `validarContexto` y `validarSesion`.
- Una sesión sin violaciones devuelve `[]`.

## 7. Pruebas

- **Seguridad**, por regla: caso que viola, caso que pasa y caso límite (47,9 h falla y 48,0 h pasa; 2 días
  seguidos pasa y 3 falla; 2 multipresas en 7 días pasan y 3 fallan; regleta de 20 mm pasa y 19 mm falla).
  Historial con sesiones de semanas distintas (cruce de fin de semana y de fin de mes).
- **Perfil**: las reglas de principiante no se aplican con `anosEscalando >= 2`; `dedos-48h`,
  `carga-alta-seguida` y `arqueado` se aplican siempre.
- **Contexto**: cada fila de la tabla (solo/con gente × rocódromo/roca/casa); `tiposPosibles` nunca vacío;
  caso real del usuario: martes con gente en rocódromo (vías con cuerda sí) y jueves solo en rocódromo
  (vías con cuerda no; autoasegurada, bloque y board sí).
- **Explicación**: derivación de evidencias, orden de niveles, origen `diseno` si hay un parámetro de
  diseño, `contexto` en `explicarContexto`, error con parámetros vacíos o desconocidos.
- **Propiedades**: determinismo; `validarSesion` y `validarContexto` no mutan sus entradas; toda violación
  trae una explicación; el orden del historial no cambia el resultado.
- **Documento ↔ código**: deriva de metadatos, integridad de ids EV, valores de `VALORES` frente a
  `parametros.md`.

## 8. Estructura de ficheros

```
motor/tipos.ts            tipos base
motor/metadatos.ts        GENERADO desde parametros.md
motor/parametros.ts       VALORES de los parámetros usados
motor/explicacion.ts      explicar(), explicarContexto()
motor/tiempo.ts           conversión fecha + hora a horas absolutas y validación de sesión
motor/contexto.ts         tiposPosibles(), validarContexto()
motor/seguridad.ts        validarSesion()
motor/index.ts            reexporta la API pública
scripts/generar-metadatos.ts
motor/*.test.ts           pruebas junto a cada módulo
```

## 9. Fuera de alcance de 2a

Generador de sesión a demanda y cupos de fase (2b), macrociclo y diagnóstico (2c), progresión de cargas,
semáforo de dolor, descargas, chequeo diario y consejos (2d), y cualquier interfaz o persistencia.
