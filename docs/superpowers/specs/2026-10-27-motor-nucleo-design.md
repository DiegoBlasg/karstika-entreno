# Motor, tramo 2a: núcleo (parámetros, explicación, seguridad)

Fecha: 2026-10-27 · Estado: diseño aprobado en brainstorming, pendiente de revisión escrita
Depende de: `docs/superpowers/specs/2026-10-26-entrenador-escalada-design.md` (§4) y
`docs/evidencia/parametros.md` (62 parámetros, P-01…P-62).

## Contexto

El motor (spec global §4) se construye en 4 tramos: **2a núcleo** (este), 2b planificador semanal,
2c macrociclo y diagnóstico, 2d autorregulación y consejos. Cada tramo se entrega y se prueba solo.

## Objetivo del tramo 2a

Un módulo `motor/` en TypeScript puro (sin React, Supabase ni acceso a red o reloj) que ofrece:

1. un **registro de parámetros** con trazabilidad a la evidencia,
2. una **explicación automática** derivada de los parámetros usados,
3. **validación de seguridad** de una semana de sesiones (restricciones duras).

Reglas transversales: determinista (mismas entradas, mismas salidas), sin fecha implícita (los tiempos
entran como datos), sin efectos secundarios.

## 1. Tipos base (`motor/tipos.ts`)

```ts
export type TipoSesion =
  | 'multipresa-resistencia' | 'multipresa-maxima' | 'board' | 'bloque-limite'
  | 'pegues-proyecto' | 'campus' | 'resistencia-4x4' | 'arc' | 'tecnica'
  | 'dominadas' | 'hombro' | 'descanso'

export type Intensidad = 'alta' | 'suave'
export type Agarre = 'abierto' | 'semiarqueado' | 'arqueado'

export interface Perfil {
  pesoKg: number
  anosEscalando: number
  lesiones: string[]
}

export interface Sesion {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  inicioHoras: number      // horas desde el inicio de la semana (lunes 00:00 = 0)
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre; conCarga?: boolean }
}

export interface Violacion {
  regla: ParametroId       // p. ej. 'P-14'
  sesionIds: string[]
  mensaje: string
  explicacion: Explicacion
}
```

`multipresa-resistencia` corresponde a repeaters submáximos (P-01); `multipresa-maxima` son
suspensiones máximas al 100 %, excluidas para el perfil (P-01, P-12).

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
  'P-12': { anosMaximosPerfilNovel: 2, maxSesionesMultipresaSemana: 2, regletaMinimaMm: 20 },
  'P-13': { maxSesionesCampusSemana: 0 },
  'P-14': { horasMinimasEntreSesionesIntensasDedos: 48 },
  'P-15': { tiposIntensosDedos: ['multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite', 'pegues-proyecto'] },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
} as const satisfies Partial<Record<ParametroId, object>>
```

Un test comprueba que cada clave de `VALORES` existe en `metadatos` y que los números coinciden con
`parametros.md`.

Decisión de este diseño: la distancia de P-14 se mide **del fin de una sesión al inicio de la siguiente**
(`inicio + duracionMin/60`), que es la lectura segura (más descanso). El planificador del tramo 2b
tendrá que respetarla.

## 4. Explicación (`motor/explicacion.ts`)

```ts
export interface Explicacion {
  regla: string                       // identificador de la regla, p. ej. 'seguridad.dedos-48h'
  parametros: ParametroId[]
  evidencias: string[]                // unión de los ids EV de los parámetros, sin duplicados, ordenada
  nivelMinimo: 'A' | 'B' | 'C' | 'sinEvidencia'   // el peor entre los parámetros usados
  origen: 'evidencia' | 'diseno'      // 'diseno' si algún parámetro usado es de diseño
  motivo: string
}

export function explicar(regla: string, parametros: ParametroId[], motivo: string): Explicacion
```

- `explicar` falla (lanza error) si `parametros` está vacío o contiene un id desconocido: una decisión
  sin parámetro no puede existir.
- Orden de niveles: `sinEvidencia` < `C` < `B` < `A`; `nivelMinimo` es el mínimo.
- `motivo` es texto en español, mostrado en el botón "¿Por qué?".

## 5. Seguridad (`motor/seguridad.ts`)

```ts
export function validarSemana(sesiones: Sesion[], perfil: Perfil): Violacion[]
```

Reglas (cada violación lleva su `Explicacion`):

| Regla | Condición de violación | Parámetros |
|---|---|---|
| `seguridad.dedos-48h` | Dos sesiones con tipo en `tiposIntensosDedos` e `intensidad` `alta` con menos de 48 h entre el fin de la primera y el inicio de la segunda | P-14, P-15 |
| `seguridad.carga-alta-seguida` | Más de 2 días naturales consecutivos con alguna sesión de intensidad `alta` (día = `floor(inicioHoras/24)`) | P-16 |
| `seguridad.campus` | Cualquier sesión de tipo `campus` cuando `anosEscalando < 2` | P-13, P-12 |
| `seguridad.maxima-novel` | Sesión `multipresa-maxima` cuando `anosEscalando < 2` | P-01, P-12 |
| `seguridad.multipresa-semana` | Más de 2 sesiones de multipresa (`resistencia` o `maxima`) en la semana cuando `anosEscalando < 2` | P-12 |
| `seguridad.regleta` | `detalle.regletaMm < 20` en sesión de multipresa cuando `anosEscalando < 2` | P-12 |
| `seguridad.arqueado` | `detalle.agarre === 'arqueado'` y `detalle.conCarga` verdadero | P-10, P-12 |

- La salida está ordenada por regla y luego por ids de sesión, para que sea estable.
- Sesiones con `inicioHoras` fuera de `[0, 168)`, `duracionMin <= 0` o ids duplicados lanzan error de
  entrada inválida (no se silencian).
- Una semana sin violaciones devuelve `[]`.

## 6. Pruebas

- **Reglas**: por cada regla, caso que viola, caso que pasa y caso límite (47,9 h falla y 48,0 h pasa; 2
  días seguidos pasa y 3 falla; 2 multipresas pasan y 3 fallan; regleta de 20 mm pasa y 19 mm falla).
- **Perfil**: las reglas de principiante no se aplican con `anosEscalando >= 2`; `seguridad.dedos-48h`
  y `seguridad.carga-alta-seguida` se aplican siempre.
- **Explicación**: derivación de evidencias, orden de niveles, origen `diseno` cuando hay un parámetro de
  diseño, error con parámetros vacíos o desconocidos.
- **Propiedades**: determinismo (mismas entradas, misma salida); `validarSemana` no muta su entrada; toda
  violación trae una explicación con al menos un parámetro.
- **Documento ↔ código**: deriva de metadatos, integridad de ids EV, valores de `VALORES` frente a
  `parametros.md`.

## 7. Estructura de ficheros

```
motor/tipos.ts            tipos base
motor/metadatos.ts        GENERADO desde parametros.md
motor/parametros.ts       VALORES de los parámetros usados
motor/explicacion.ts      explicar()
motor/seguridad.ts        validarSemana()
motor/index.ts            reexporta la API pública
scripts/generar-metadatos.ts
motor/*.test.ts           pruebas junto a cada módulo
```

## 8. Fuera de alcance de 2a

Planificador semanal (2b), macrociclo y diagnóstico (2c), progresión de cargas, semáforo de dolor,
descargas y consejos (2d), y cualquier interfaz o persistencia.
