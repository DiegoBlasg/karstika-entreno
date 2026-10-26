# Motor, tramo 2b: generador de sesión a demanda

Fecha: 2026-10-28 · Estado: implementado en la rama `motor-generador` (revisado el mismo día)
Depende de: `docs/superpowers/specs/2026-10-27-motor-nucleo-design.md` (tramo 2a, ya en `master`),
`docs/evidencia/parametros.md` y el spec global (§4).

> **Revisión del 2026-10-28 (decisiones del usuario; prevalece sobre el texto de abajo):**
> 1. **Escalar al límite desde la base.** Nuevas plantillas `via-cuerda-limite` (con compañero: calentamiento
>    10 min, vías progresivas 15 min y hasta 3 intentos de 25 min con 20 min de recuperación activa, P-51, P-52,
>    P-53, P-61; 50/75/100 min) y `bloque-limite` (solo: 10 + 10 + 30 min, o 20 si hay poco tiempo).
>    `FASE_BASE` les da cupo 1 cada una; `FASE_FUERZA` mantiene la vía al límite con cupo 1.
> 2. **Sesiones compuestas.** Tras elegir cada sesión, se rellena el tiempo libre con complementos suaves
>    (`tecnica` 30 min, `arc` 15 o 10 min, `hombro` 15 min) cuyo cupo sigue pendiente y que son posibles en el
>    contexto; el hombro se elige primero y va siempre al final. Se guardan en `Sesion.incluye` y cuentan para
>    los cupos. La sesión compuesta se revalida entera; si fallara, se devuelve sin complementos.
> 3. **Descanso entre días intensos de dedos por días naturales** (P-14 revisado). `proximaVentanaIntensa` pasa
>    a ser `{ fecha }`: el primer día sin conflicto con ninguna sesión intensa de dedos del historial.
> 4. **Carga inicial de multipresa al 70 %** del test las 2 primeras semanas (decisión de diseño, dirección
>    segura); después, el tope del 80 % de P-06. `lastreRepeaters(e, fraccion)` nunca acepta más de 0,8.
> 5. `bloque-limite` también se sustituye por `bloque-suave` cuando no es seguro, igual que el `board`.
> 6. El test de dedos rechaza pesos y lastres implausibles (protección contra errores al teclear).

## Objetivo

Dado un día y una hora, un contexto (solo o con gente, lugar, minutos disponibles), el perfil, el
historial y la fase actual, devolver una **propuesta** (`principal` + 2 `alternativas`) con sesiones
completas: bloques, ejercicios, series, repeticiones, descansos y cargas, cada decisión con su explicación.
También puede recomendar descansar.

Reglas transversales (heredadas de 2a): TypeScript puro en `motor/`, determinista (mismas entradas, misma
salida), sin reloj, sin mutar entradas, todo mensaje en español, toda decisión con `Explicacion`.

## Decisiones de producto (del usuario)

1. Sesión **completa con cargas**. Si no hay test de fuerza de dedos vigente, la multipresa va por
   sensación de esfuerzo y se propone hacer el test.
2. **Una principal y dos alternativas** válidas (tipos distintos), con el porqué de la principal.
3. **Test de fuerza máxima prudente** (P-17, P-18) como excepción a la regla de no hacer máximos, solo
   tras 4 semanas de base técnica (P-32) y como sesión de evaluación propia.
4. La hora entra como dato de la petición. El valor por defecto (la hora habitual del usuario) lo pone la
   capa de interfaz, no el motor.

## 1. Cambios en el núcleo 2a

- Nuevo `TipoSesion`: `'evaluacion-dedos'`. Cuenta siempre como sesión intensa de dedos (como la
  multipresa y el campus). Lugares posibles: `casa` y `rocodromo`.
- P-15 (documento y `VALORES`): añadir «test de fuerza de dedos» a la lista de sesiones intensas.
- Nueva regla de seguridad `seguridad.evaluacion-prematura` (parámetros P-32, P-12): para perfiles novel,
  una `evaluacion-dedos` viola si no hay en el historial ninguna sesión con fecha de 28 días o más antes de
  la propuesta (la primera sesión registrada define el inicio de la base). Valor `diasBaseMinimos: 28` en
  `VALORES['P-32']`, contrastado con el texto «4 semanas como mínimo» de `parametros.md`.
- `seguridad.maxima-novel` no cambia: la evaluación es su única excepción y por eso es un tipo aparte.
- Nuevos valores en `VALORES` (todos contrastados con `parametros.md` por `parametros.test.ts`):
  P-02 (7 s : 3 s), P-03/P-04 (6 series × 7 repeticiones; 1 bloque al empezar, 2 después), P-05
  (descanso entre series 150 s), P-06 (tope 0,80 de la fuerza máxima), P-08 (reevaluar como máximo cada
  10 semanas), P-18 (10 s, 3 intentos, 180 s de descanso), P-35 (ARC), P-37 (4x4), P-41 (hombro),
  P-49 (calentamiento 10 min), P-53 (previsualización 3 min).

## 2. Tipos nuevos (`motor/propuesta-tipos.ts`)

```ts
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
  series?: number; repeticiones?: number
  trabajoS?: number; descansoS?: number; descansoSeriesS?: number
  cargaKg?: number                                // lastre (negativo = descarga); ausente si va por sensación
  cargaTexto: string                              // p. ej. «+7,5 kg» o "RPE 6–7"
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
  fecha: string; horaInicio: number
  contexto: Contexto
  perfil: Perfil
  historial: Sesion[]
  fase: Fase
  evaluacion?: EvaluacionDedos
}

export interface Propuesta {
  principal: SesionPlan | null
  alternativas: SesionPlan[]                      // 0 a 2, tipos distintos entre sí y de la principal
  descanso?: Explicacion                          // presente cuando se recomienda descansar
  proximaVentanaIntensa?: { fecha: string }  // primer día en que vuelve a caber una sesión intensa de dedos
}
```

## 3. Fases por defecto (`motor/fases.ts`)

La fase real la define el macrociclo (tramo 2c); 2b trae dos para poder funcionar y probarse.

- `FASE_BASE`: `prioridad: ['evaluacion-dedos', 'tecnica', 'arc', 'hombro']`,
  `cupos: { 'evaluacion-dedos': 1, tecnica: 2, arc: 1, hombro: 2 }`,
  `prohibidos`: multipresa, board, campus, bloque-limite, vías con cuerda, pegues, dominadas, 4x4. Respeta
  P-32 (4 semanas de base antes de la fuerza de dedos). La evaluación solo llega a ser candidata si no
  hay una vigente (§6) y la regla de seguridad exige además las 4 semanas.
- `FASE_FUERZA`: `prioridad: ['evaluacion-dedos', 'multipresa-resistencia', 'board', 'tecnica', 'arc', 'hombro']`,
  `cupos: { 'evaluacion-dedos': 1, 'multipresa-resistencia': 2, board: 1, tecnica: 1, arc: 1, hombro: 2 }`; prohibidos: campus,
  suspensiones máximas, bloque-limite, vías con cuerda, pegues, dominadas, 4x4.

El generador **no** produce todavía bloque al límite, vías con cuerda, pegues, dominadas, campus ni 4x4
(fases de rendimiento y resistencia de fuerza: tramo 2c). La sesión `tecnica` adapta su modalidad al
contexto: con gente en rocódromo usa vías con cuerda de nivel cómodo; solo usa bloque o vías
autoaseguradas.

## 4. Carga de multipresa (`motor/evaluacion.ts`)

```ts
export function fuerzaRelativa(e: EvaluacionDedos): number         // (peso + lastre) / peso × 100
export function evaluacionVigente(e: EvaluacionDedos | undefined, fecha: string): boolean   // <= 10 semanas
export function lastreRepeaters(e: EvaluacionDedos): number        // 0,80 × (peso + lastre) − peso, a 0,5 kg
```

- `evaluacionVigente` es falsa sin evaluación o con más de 70 días (P-08). Entonces la multipresa va por
  sensación (RPE 6–7, sin llegar al fallo) y la principal prioriza proponer `evaluacion-dedos` si la
  seguridad lo permite.
- `lastreRepeaters` nunca supera el 80 % (P-06); si el resultado es negativo, la sesión indica
  «descarga de X kg» (banda o polea).

## 5. Plantillas (`motor/plantillas.ts`)

`construirSesion(tipo, peticion): SesionPlan | null` (null si no cabe en `minutosDisponibles`). Todas
incluyen calentamiento de 10 min (P-49) y fijan los campos de `detalle` que exige la seguridad
(`regletaMm: 20`, `agarre: 'semiarqueado'`, `conCarga`) en las sesiones de multipresa y evaluación.

| Tipo | Contenido | Duración | Parámetros |
|---|---|---|---|
| `multipresa-resistencia` | calentamiento 10 min; por bloque 6 series × 7 repeticiones de 7 s colgado : 3 s descanso, 150 s entre series, regleta 20 mm semiarqueado; 1 bloque si hay menos de 4 sesiones de multipresa en el historial, 2 después (5 min entre bloques); carga `lastreRepeaters` o RPE 6–7 | 30 (1 bloque) o 55 min (2) | P-01…P-06, P-09, P-10 |
| `evaluacion-dedos` | calentamiento 10 min; 5 min de subida progresiva de carga en escalones; hasta 3 intentos de 10 s con 180 s de descanso; se anota el mejor; se detiene con cualquier dolor | 30 min | P-17, P-18, P-49 |
| `board` | calentamiento 10 min; 5 bloques por debajo del máximo, 3 intentos cada uno, 3 min de descanso | 45 min | P-38 (diseño) |
| `tecnica` | calentamiento 10 min; 3 bloques variando vías y tipos de presa; previsualización hasta 3 min; grabar en vídeo al menos una vía | 45 min | P-53, P-54, P-55 |
| `bloque-suave` | calentamiento 10 min; 4 bloques cómodos para el nivel, variando presas (solo como sustituto de `board`; no está en las prioridades de las fases) | 45 min | P-54 |
| `arc` | calentamiento 10 min; 2 series de 15 min (10 min si hay poco tiempo) de escalada continua sin bombeo marcado, 10 min de descanso | 50 min (40 con series de 10) | P-35 (diseño) |
| `hombro` | 15 min de ejercicios de hombro en cadena cerrada y excéntricos | 20 min | P-41 |

- Duración: el generador elige la versión que cabe; si no cabe ni la mínima, el tipo no es candidato.
- Intensidad de la sesión: `alta` para `multipresa-resistencia`, `evaluacion-dedos` y `board`; `suave`
  para `tecnica`, `bloque-suave`, `arc` y `hombro`.
- Cada `Bloque` lleva una `explicar(...)` con los parámetros que lo sustentan, y la sesión añade la
  explicación de la elección (cupos y prioridad de la fase: parámetro P-30, de diseño).

## 6. Algoritmo (`motor/propuesta.ts`)

`proponerSesion(p: Peticion): Propuesta`

1. Validar la petición con `validarEntrada` y `validarPerfil` (reutilizados de 2a). La sesión propuesta
   usa el id `propuesta-<tipo>` y el historial no puede contener ese id.
2. Candidatos = `fase.prioridad` ∩ `tiposPosibles(contexto)` − `fase.prohibidos`. `evaluacion-dedos`
   solo es candidato si `evaluacionVigente` es falsa (así no se repite cada semana).
3. Para cada candidato, `construirSesion`; descartar los que dan `null`.
4. Validar cada candidato con `validarContexto` y `validarSesion` contra el historial. Descartar los que
   tienen violaciones, salvo `board`, que se sustituye por `bloque-suave` (misma modalidad, intensidad
   `suave`) y se vuelve a validar. Los demás tipos no tienen versión suave: lo que no cabe se descarta.
5. Puntuar cada válido (más alto es mejor):
   `puntuación = 100 × max(0, cupo − hechas7d)/cupo + (longitud(prioridad) − índice(prioridad)) − 30 si es el mismo tipo que la última sesión del historial`
   (el primer término es 0 si el tipo no tiene cupo)
   donde `hechas7d` son las sesiones de ese tipo en los 7 días naturales que acaban el día de la petición.
   Desempate por nombre de tipo (orden alfabético).
6. `principal` = la mejor; `alternativas` = las dos siguientes de tipos distintos.
7. `descanso`: se rellena cuando no hay ningún candidato válido, o cuando hay 3 o más sesiones en los 4
   días anteriores a la petición y todos los cupos están cubiertos; en el primer caso, `principal` es
   `null`.
8. `proximaVentanaIntensa`: si algún candidato intenso se descartó por `seguridad.dedos-dia-descanso`, el
   primer día a partir de mañana sin conflicto con ninguna sesión intensa de dedos del historial (`{ fecha }`).
9. Cada elegida se completa con complementos suaves (ver la revisión del principio).

## 7. Pruebas

- **Plantillas**: cada tipo con sus cifras exactas (6 × 7, 7 s : 3 s, 150 s, 20 mm, 1 o 2 bloques según
  el historial, minutos que suman la duración, `detalle` presente), y cada bloque con explicación.
- **Evaluación y carga**: `fuerzaRelativa`, vigencia a 70 y 71 días, `lastreRepeaters` con redondeo y tope
  del 80 %, caso de descarga negativa, sin evaluación → RPE.
- **Seguridad nueva**: `evaluacion-prematura` (27 días viola, 28 pasa, sin historial viola; no se aplica a
  perfiles con experiencia) y los cambios de P-15/P-32 sincronizados con el documento.
- **Selección**: cupos pendientes ganan a cupos cubiertos; penalización por repetir tipo; desempate
  estable; alternativas de tipos distintos; `board` degradado a `bloque-suave`.
- **Escenario del usuario**: martes con gente en rocódromo (vía al límite con hombro al final) y jueves solo
  (bloque al límite, sin cuerda); el miércoles tras una sesión intensa el martes no ofrece nada intenso de
  dedos y devuelve `proximaVentanaIntensa = jueves`. Primera semana: nunca evaluación.
- **Propiedades**: determinismo, no muta entradas, ninguna sesión propuesta tiene violaciones al
  revalidarla, cada `SesionPlan` tiene explicaciones con parámetros, `principal` nunca está en
  `alternativas`.
- **Pureza**: se amplía la guardia `pureza.test.ts` a los ficheros nuevos.

## 8. Estructura de ficheros

```
motor/propuesta-tipos.ts   Fase, EvaluacionDedos, Ejercicio, Bloque, SesionPlan, Peticion, Propuesta
motor/fases.ts             FASE_BASE, FASE_FUERZA
motor/evaluacion.ts        fuerzaRelativa, evaluacionVigente, lastreRepeaters
motor/plantillas.ts        construirSesion
motor/propuesta.ts         proponerSesion
motor/*.test.ts            pruebas junto a cada módulo
```

## 9. Fuera de alcance

Macrociclo y diagnóstico (2c), progresión de cargas tras cada sesión, semáforo de dolor, `lesiones`,
descargas, consejos y autorregulación con RPE (2d); bloque al límite, vías con cuerda, pegues, dominadas,
campus y 4x4; hombro añadido como bloque a otras sesiones; persistencia e interfaz.
