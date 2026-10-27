# Motor 2d: autorregulación, semáforo, consejos y dominadas. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que el generador de sesión respete el dolor por zona, el RPE registrado y el chequeo, y que acompañe cada
propuesta de hasta 2 consejos con evidencia.

**Architecture:** `motor/autorregulacion.ts` calcula, de forma pura, un `EstadoAtleta` a partir del historial y
del seguimiento (registros, chequeos, altas) en una fecha, y lo traduce a `Restricciones`. `proponer` lo
recalcula para cada fecha que evalúa (también al buscar la ventana intensa) y filtra candidatos, aplica la
descarga adelantada y ajusta la progresión de multipresa. `motor/consejos.ts` elige consejos para una propuesta.

**Tech Stack:** TypeScript puro en `motor/`, vitest, Node 24. Sin React, Supabase ni `node:*` en `motor/`.

**Forma de trabajo** (lección de los tramos anteriores con Opus): implementación inline por tareas, con commit por
tarea y dos revisiones independientes de agentes Opus al final (una con simulación de la semana real de Diego).

## Global Constraints

- `motor/` es puro: sin `Date.now`, `Math.random`, `new Date()` sin argumentos, ni `node:*` (lo vigila `pureza.test.ts`).
- Todo número del motor sale de `VALORES` (con su fila en `docs/evidencia/parametros.md` y prueba en
  `motor/parametros.test.ts`) o es una constante comentada como «decisión de diseño».
- Cada `Explicacion` se crea con `explicar(regla, parametros, motivo)`; las decisiones de diseño lo dicen en el texto.
- Sin `seguimiento` en la petición, todas las pruebas de 2a-2c pasan sin cambios.
- Fechas `'AAAA-MM-DD'`; solo cuenta lo que tiene fecha ≤ la de la petición.
- Commits con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tras cada tarea: `npx tsc --noEmit` y `npx vitest run` en verde.

## Cambio respecto al spec

`Peticion` no recibe un `estado` ya calculado, sino `seguimiento?: Seguimiento` (`registros`, `chequeos`,
`altas`). El motor calcula `estadoAtleta(historial, seguimiento, fecha)` para cada fecha que evalúa, porque
`ventanaIntensa` prueba fechas futuras y el chequeo de hoy no vale para mañana. `Propuesta` gana `estado?`
para que la app lo muestre. La progresión de multipresa no recibe un `escalonMultipresa`: `EstadoAtleta` da
`sesionesNoValidas` y `retornoP46?: { fecha }`, y la plantilla calcula el escalón (sección 3 del spec).

## Archivos

- Crear `motor/autorregulacion-tipos.ts`: `ZONAS`, `Zona`, `Molestia`, `RegistroSesion`, `Chequeo`, `Alta`,
  `Seguimiento`, `Semaforo`, `EstadoAtleta`, `Restricciones`.
- Crear `motor/autorregulacion.ts`: `validarSeguimiento`, `estadoAtleta`, `restriccionesDe`, `objetivoRpe`.
- Crear `motor/consejos.ts`: `CONSEJOS`, `elegirConsejos`.
- Modificar `motor/propuesta-tipos.ts` (`Peticion.seguimiento`, `Peticion.limitantePrincipal`,
  `Peticion.consejosMostrados`, `Propuesta.estado`), `motor/propuesta.ts`, `motor/plantillas.ts`,
  `motor/seguridad.ts`, `motor/tipos.ts`, `motor/fases.ts`, `motor/index.ts`, `motor/parametros.ts`,
  `docs/evidencia/parametros.md`, `motor/metadatos.ts` (generado), `motor/parametros.test.ts`.
- Pruebas: `motor/autorregulacion.test.ts`, `motor/propuesta-autorregulacion.test.ts`, `motor/consejos.test.ts`,
  `motor/autorregulacion-simulacion.test.ts`, y casos nuevos en `motor/seguridad.test.ts` y `motor/fases.test.ts`.

---

### Task 1: Parámetros P-39, P-63 a P-66

**Files:** `docs/evidencia/parametros.md`, `motor/parametros.ts`, `motor/metadatos.ts` (con `npm run metadatos`),
`motor/parametros.test.ts`.

Filas nuevas (todas `sinEvidencia | sinEvidencia`, notas «Decisión de diseño, no basada en evidencia…»):

| id | parámetro | valor |
|---|---|---|
| P-63 | RPE objetivo de sesión | Máximo 8 (CR-10) en sesiones de intensidad alta y 5 en suaves; el test de dedos y el descanso no tienen objetivo. Por encima = RPE × minutos reales mayor que el máximo × minutos previstos |
| P-64 | Qué bloquea el semáforo por zona | Zonas: dedos, muñeca/antebrazo, codo, hombro y otra. Ámbar en dedos, muñeca, codo u hombro: sin sesiones de intensidad alta ni dominadas (en hombro, el trabajo de hombro va sin carga). Ámbar en otra: sin sesiones al límite. Rojo en dedos, muñeca o codo: sin escalar ni colgarse; quedan descanso y hombro sin carga. Rojo en hombro u otra: solo descanso |
| P-65 | Chequeo al pedir sesión | Sueño, fatiga y ganas de 1 a 5; bajo = media de 2 o menos. Chequeo de hoy bajo: sin sesiones de intensidad alta. 3 chequeos bajos seguidos en 7 días: descarga adelantada de 7 días (P-50) |
| P-66 | Consejos por sesión | Como mucho 2 por sesión; un consejo mostrado en los últimos 7 días no se repite, salvo los de seguridad |

P-39 pasa a: «Opcional, como complemento de 15 min en las fases de fuerza: 4 series de 4 repeticiones con un
lastre que deje 2 repeticiones en reserva y 3 min de descanso; como mucho 1 en 7 días y nunca el día de una
sesión intensa de dedos».

`VALORES` gana:

```ts
'P-39': { minutos: 15, series: 4, repeticiones: 4, repeticionesEnReserva: 2, descansoMin: 3, max7Dias: 1 },
'P-63': { rpeMaxAlta: 8, rpeMaxSuave: 5 },
'P-65': { escalaMin: 1, escalaMax: 5, umbralBajo: 2, chequeosBajosSeguidos: 3, ventanaDias: 7, diasDescarga: 7 },
'P-66': { maxConsejos: 2, diasSinRepetir: 7 },
'P-43': { verdeMax: 1, ambarMax: 3 },
'P-45': { registrosAmbarSeguidos: 2, diasAmbarMax: 7 },
'P-50': { sesionesPorEncimaSeguidas: 2 },
```

- [ ] Añadir las filas y editar P-39 en `parametros.md`; `npm run metadatos`.
- [ ] Añadir las claves a `VALORES` y una prueba por fila en `parametros.test.ts` que compare el texto del
      documento (regex sobre la columna de valor) con los números.
- [ ] `npx tsc --noEmit && npx vitest run`; commit `feat(motor): parámetros de autorregulación (P-39, P-63..P-66)`.

### Task 2: Tipos, validación y semáforo

**Files:** crear `motor/autorregulacion-tipos.ts`, `motor/autorregulacion.ts`, `motor/autorregulacion.test.ts`.

**Produces:**

```ts
export interface Seguimiento { registros: RegistroSesion[]; chequeos: Chequeo[]; altas: Alta[] }
export function validarSeguimiento(historial: readonly Sesion[], s: Seguimiento): void
export function estadoAtleta(historial: readonly Sesion[], s: Seguimiento, fecha: string): EstadoAtleta
```

Validación (lanza `Error` con mensaje en español): `dolor` entero 0-10; zona en `ZONAS` y sin repetir en la misma
lista; `rpe` finito 0-10; `duracionMin` finito, > 0 y ≤ 1440; sueño, fatiga y ganas enteros 1-5; `sesionId`
existente en el historial y con la misma `fecha`; un registro por sesión y un chequeo por día; fechas reales.

Semáforo por zona, sobre los eventos de fecha ≤ hoy en orden (fecha; el mismo día, registros por hora de inicio
de su sesión y el chequeo al final). Cada registro y cada chequeo es un evento para las 5 zonas (zona no
listada = dolor 0):
- nivel del evento: `alarma` o dolor ≥ 4 → rojo; 2-3 → ámbar; 0-1 → verde (P-43, P-44);
- rojo → `ultimoRojo = fecha`, y se reinicia la racha de ámbar;
- ámbar → empieza la racha si no la había (`ambarDesde`); si viene de un registro, suma a `ambarRegistros`;
  `ambarRegistros ≥ 2` o `fecha − ambarDesde > 7` → rojo en esa fecha (P-45);
- verde → se reinicia la racha.
- Al final, si el último evento es ámbar y `hoy − ambarDesde > 7`, rojo con fecha `ambarDesde + 8`.
- Una zona con `ultimoRojo` es roja salvo que haya un `Alta` de esa zona con fecha > `ultimoRojo`; entonces
  toma el nivel de su último evento.

Pruebas: umbrales 1/2 y 3/4, alarma con dolor 0, 2 registros ámbar seguidos → rojo, ámbar-verde-ámbar no escala,
ámbar 7 días → ámbar y 8 → rojo, el rojo sigue con dolor 0 hasta el alta, alta del mismo día que el rojo no
basta, chequeo de hoy manda sobre el registro de hoy, eventos futuros ignorados, cada error de validación.

- [ ] Pruebas → implementación → verde → commit `feat(motor): semáforo de dolor por zona (P-42..P-46)`.

### Task 3: RPE, descarga adelantada, chequeo bajo y retorno P-46

**Files:** `motor/autorregulacion.ts`, `motor/autorregulacion.test.ts`.

**Produces** (campos de `EstadoAtleta`):

```ts
sinSubida: boolean                 // última sesión con objetivo por encima, o alguna zona en ámbar
descargaAdelantada?: { desde: string; hasta: string; motivo: 'rpe' | 'bienestar' }
chequeoBajoHoy: boolean
sesionesNoValidas: string[]        // ids de sesiones pasadas sin registro, por encima del objetivo o con dolor ≥ 2 en dedos o muñeca
retornoP46?: { fecha: string }     // último registro o chequeo con dolor ≥ 2 (o alarma) en dedos o muñeca
explicaciones: Explicacion[]
export function objetivoRpe(s: Sesion): number | undefined   // P-63: 8 si esCargaAlta, 5 si no; undefined en descanso y evaluacion-dedos
```

- Por encima: `registro.rpe × registro.duracionMin > objetivoRpe(sesion) × sesion.duracionMin` (P-34).
- RPE: recorriendo las sesiones con objetivo y registro en orden, 2 seguidas por encima → descarga desde el día
  siguiente a la segunda, durante 7 días (`hasta = desde + 6`); tras activarse, la cuenta vuelve a 0.
- Bienestar: en cada chequeo `c`, si él y los 2 anteriores son bajos (media ≤ 2) y `c − el primero ≤ 6`,
  descarga desde `c.fecha` durante 7 días.
- Vale la descarga cuyo intervalo contiene hoy (si hay varias, la que empieza más tarde).
- `chequeoBajoHoy`: hay chequeo con fecha = hoy y media ≤ 2.
- Explicaciones con `explicar('autorregulacion.<x>', [...], ...)`: semáforo (P-43, P-44, P-45, P-46 y «el motor
  no diagnostica»), freno (P-11, P-63), descarga (P-50, P-34, P-65), chequeo (P-65).

Pruebas: frontera 5→8 de sRPE (8 × 60 = 480 frente a 481), una por encima solo frena, dos seguidas descargan 7
días exactos (día 7 sí, día 8 no), una dentro del objetivo en medio corta la racha, 3 chequeos bajos con el
primero hace 7 días no cuentan y con el primero hace 6 sí, chequeo de hoy bajo, sesión sin registro no válida,
dolor 2 en dedos invalida, retornoP46 por registro y por chequeo.

- [ ] Pruebas → implementación → verde → commit `feat(motor): RPE objetivo, descarga adelantada y chequeo (P-11, P-50)`.

### Task 4: Restricciones e integración en el generador

**Files:** `motor/autorregulacion.ts`, `motor/propuesta-tipos.ts`, `motor/propuesta.ts`, `motor/plantillas.ts`,
`motor/propuesta-autorregulacion.test.ts`.

```ts
export interface Restricciones {
  sinCargaAlta: boolean      // ámbar en dedos, muñeca, codo u hombro, o chequeo de hoy bajo
  sinLimite: boolean         // ámbar en otra: fuera bloque-limite, via-cuerda-limite, pegues-proyecto, board
  soloHombro: boolean        // rojo en dedos, muñeca o codo
  soloDescanso: boolean      // rojo en hombro u otra
  hombroSinCarga: boolean    // ámbar en hombro, o soloHombro
  sinDominadas: boolean      // cualquier zona de dedos, muñeca, codo u hombro no verde, o algún rojo
}
export function restriccionesDe(e: EstadoAtleta): Restricciones
```

En `proponer` (con `seguimiento`):
1. `estado = estadoAtleta(p.historial, p.seguimiento, p.fecha)`; `r = restriccionesDe(estado)`.
2. Si hay `descargaAdelantada` y la fase no es ya de descarga, `fase = descargar(fase)` para todo el cálculo.
3. Un candidato bloqueado por `r` (por tipo y por `esCargaAlta` de su sesión) prueba su sustituto suave si lo
   hay y no está bloqueado; si no, se descarta.
4. Con `soloDescanso` o `soloHombro`: `principal = null`, `descanso` = explicación del rojo
   (`autorregulacion.rojo`, P-43, P-44, P-46, recomienda fisioterapeuta), alternativas = hombro sin carga si
   `soloHombro` y cabe; si no, ninguna.
5. `Propuesta.estado = estado`; las explicaciones del estado van en la principal (o en `descanso`).

En plantillas:
- `progresionMultipresa`: con `seguimiento`, `previas` excluye `sesionesNoValidas`. Con `retornoP46`:
  `e = escalon(previas con fecha ≤ retorno.fecha)`, `previasEfectivas = max(0, e − 1) × 4 + previas posteriores`,
  con `escalon(n) = n < 4 ? 0 : n < 8 ? 1 : 2` (4 = `sesionesConUnBloque`). La explicación lo cuenta (P-46).
- `construirHombro` y el complemento de hombro con `hombroSinCarga`: solo movilidad y activación sin carga
  (mismos minutos), `detalle.conCarga = false`, explicación con P-41 y P-43.

Pruebas en los contextos reales (martes con gente en rocódromo 120 min, jueves solo 90, casa 40) y fase fuerza:
ámbar en dedos → sin multipresa, vía al límite ni test, sí técnica/ARC/bloque suave; ámbar en hombro → hombro
sin carga; ámbar en otra → sin vía ni bloque al límite pero sí multipresa; rojo en dedos → principal null,
alternativa hombro sin carga; rojo en hombro → nada; chequeo bajo hoy → sin carga alta y mañana sí; descarga
adelantada → nombre «(descarga)» y nada al límite; P-46 vuelve un escalón; sesiones no válidas no suben; sin
`seguimiento`, la propuesta es idéntica a la de antes (`toEqual` con el mismo caso sin el campo).

- [ ] Pruebas → implementación → verde → commit `feat(motor): el generador aplica el semáforo y la autorregulación`.

### Task 5: Dominadas como complemento

**Files:** `motor/tipos.ts` (`TIPOS_COMPLEMENTO` + `'dominadas'`), `motor/fases.ts` (FASE_FUERZA: cupo
`dominadas: 1`, fuera de prohibidos; `descargar` quita dominadas), `motor/plantillas.ts` (complemento de 15 min
con los valores de P-39), `motor/propuesta.ts` (`PRIORIDAD_COMPLEMENTOS` = hombro, técnica, ARC, dominadas; la
sesión de hombro admite solo el complemento de dominadas; antes de añadirlas se comprueba que no hay reglas
`seguridad.dominadas-*` ni `r.sinDominadas`), `motor/seguridad.ts` (reglas `seguridad.dominadas-dia-dedos` y
`seguridad.dominadas-7dias`, que miran `tipo` e `incluye`), pruebas en `seguridad.test.ts`, `fases.test.ts` y
`propuesta-autorregulacion.test.ts`.

Pruebas: complemento solo en fuerza y no en descarga; nunca con principal intensa de dedos ni con una intensa de
dedos ese día en el historial; 1 en 7 días; bloqueadas con ámbar en codo; reglas de seguridad con `tipo` y con
`incluye`, en ambos sentidos (dominadas primero y dedos después).

- [ ] Pruebas → implementación → verde → commit `feat(motor): dominadas lastradas como complemento (P-39)`.

### Task 6: Consejos

**Files:** crear `motor/consejos.ts`, `motor/consejos.test.ts`; `motor/propuesta-tipos.ts`
(`limitantePrincipal?: Limitante`, `consejosMostrados?: { id: string; fecha: string }[]`), `motor/index.ts`.

```ts
export interface Consejo { id: string; texto: string; explicacion: Explicacion }
export function elegirConsejos(p: Peticion, propuesta: Propuesta): Consejo[]
```

Catálogo y condiciones: los de la tabla de la sección 4 del spec. «Sesión» = tipo de la principal. Orden:
seguridad (`fisio-rojo`, `vigilar-ambar`, según `propuesta.estado`), los de la sesión en el orden del catálogo y
los generales (`sueno`, `proteina`, `peso`, `suplementos`). Los no de seguridad mostrados con
`hoy − fecha ≤ 6` se saltan. Se devuelven los 2 primeros. Textos sin cifras que no estén en su parámetro
(proteína 1,6 g/kg/día de P-57; sin horas de sueño, P-56; sin objetivo de peso, P-58; sin suplementos, P-59).

Pruebas: máximo 2, orden, rotación (6 días no, 7 sí), los de seguridad se repiten, `miedo-caer` solo con
limitante cabeza, determinismo, cada consejo cita parámetros existentes.

- [ ] Pruebas → implementación → verde → commit `feat(motor): consejos ligados a evidencia (P-49..P-62, P-66)`.

### Task 7: Simulación, documentación y revisión

**Files:** `motor/autorregulacion-simulacion.test.ts`, spec (nota de implementación), `motor/index.ts`.

Simulación de 8 semanas de la temporada de Diego desde el inicio de la fuerza del ciclo 1: martes con gente en
rocódromo, jueves solo, sábado en casa; cada sesión propuesta se registra con RPE dentro del objetivo salvo
indicación; semana 3, ámbar en dedos el jueves y verde el martes siguiente; semana 6, tres chequeos bajos.
Comprobar: ninguna violación de `validarSesion`, sin intensa de dedos mientras hay ámbar, multipresa un escalón
por debajo tras el ámbar, descarga adelantada de 7 días tras los chequeos y ninguna dominada en día de dedos.

- [ ] Simulación verde; nota «Implementado» en el spec; commit.
- [ ] Dos revisiones Opus independientes (código + simulación de la semana real), escribiendo solo en el
      directorio temporal; arreglar lo importante; fusionar en `master`; memoria.
