# App: modo sesión con cronómetro (entrega 2, parte A)

Fecha: 2026-10-28 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Problema y objetivo

Las sesiones aceptadas traen un plan detallado (series, repeticiones, segundos colgado, descansos), pero Diego tiene
que llevar el tiempo por su cuenta, y colgado de la multipresa no puede mirar ni tocar el móvil. El objetivo es un
**cronómetro que guía la sesión paso a paso con pitidos** y que, al acabar, abre el registro con los minutos reales.

Orden de la entrega 2 (decisión de Diego): **A cronómetro** (este documento) → B tests guiados (usa este cronómetro) →
C mejoras de Hoy (aviso de sesión aceptada que ya no encaja con el chequeo, entrenamiento no planeado, «Terminar»).

Fuera de alcance: voz y vibración (decisión de Diego: solo pitidos), guardar en el servidor cada serie hecha, guardar
automáticamente el resultado del test (parte B).

## 2. Arquitectura

- Todo el cronómetro funciona **en el navegador** a partir del `SesionPlan` guardado en `sesiones.propuesta`. Sin
  tablas nuevas ni escrituras durante la sesión; al final se usa la acción `registrar` que ya existe.
- Dos piezas puras con pruebas:
  - `lib/cronometro/pasos.ts`: `pasosDeSesion(plan: SesionPlan): Paso[]`.
  - `lib/cronometro/reloj.ts`: el estado del reloj y sus transiciones, recibiendo el instante (`ahoraMs`) como dato.
- La pantalla `app/(app)/sesion/[id]/` (Server Component que carga y comprueba; componente de cliente que ejecuta).

## 3. Pasos

```ts
type Paso =
  | { tipo: 'preparate'; segundos: 10; titulo: string; carga?: string }             // antes de cada ejercicio colgado
  | { tipo: 'colgado'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'descanso'; segundos: number; titulo: string }
  | { tipo: 'manual'; titulo: string; carga?: string; notas?: string }              // se pasa con «Hecho»
  | { tipo: 'bloque'; segundos: number; titulo: string; detalle: string[] }          // cuenta atrás de los minutos del bloque
  | { tipo: 'fallo'; trabajoS: number; descansoS: number; titulo: string; carga?: string } // 7:3 hasta «No puedo más»
```

Cada paso lleva también `bloque` (nombre del bloque) para mostrarlo. Reglas de `pasosDeSesion`, bloque a bloque y
ejercicio a ejercicio, según los campos del `Ejercicio` (`series`, `repeticiones`, `trabajoS`, `descansoS`,
`descansoSeriesS`):

1. **Bloque sin ningún ejercicio con tiempo** (`trabajoS` o `series` ausentes en todos): un paso `bloque` con
   `segundos = minutos × 60` y como `detalle` el nombre, la carga y las notas de cada ejercicio.
2. **Repeaters** (`series`, `repeticiones`, `trabajoS`, `descansoS`): `preparate`, y por cada serie y repetición
   `colgado trabajoS` seguido de `descanso descansoS`, salvo tras la última repetición de la serie; entre series
   `descanso descansoSeriesS` (si falta, sin descanso entre series). Títulos: «Serie 2 de 6 · rep 4 de 7».
3. **Suspensión por series sin repeticiones** (`series`, `trabajoS`, sin `repeticiones`; p. ej. máximas de 10 s del
   test): `preparate`, y por serie `colgado trabajoS`, con `descanso descansoSeriesS` entre series. Título «Intento 2 de 3».
4. **Hasta el fallo** (`trabajoS` y `descansoS`, sin `series`): `preparate` y un paso `fallo`.
5. **Series sin tiempo de trabajo** (`series` sin `trabajoS`; p. ej. 4×4): por serie un `manual` («Vuelta 2 de 4»)
   y `descanso descansoSeriesS` entre series.
6. **Ejercicio sin tiempo dentro de un bloque con tiempo**: un `manual` con su nombre, carga y notas.
7. `carga` = `cargaTexto` del ejercicio.

Las descargas no necesitan nada especial: el plan ya trae la mitad de series.

## 4. Reloj

Estado: índice del paso, si está en marcha o en pausa, milisegundos acumulados del paso actual (y el instante desde el
que corre si está en marcha), milisegundos totales de la sesión, y en un paso `fallo` los segundos colgado acumulados.
Funciones puras: `empezar`, `pausar`, `seguir`, `saltar`, `atras`, `hecho` (manual), `noPuedoMas` (fallo), `terminar`,
`tick(estado, ahoraMs)` (avanza solo cuando un paso con tiempo llega a cero, también varios pasos de golpe si el
navegador estuvo dormido) y `restante(estado, ahoraMs)`.

- El tiempo sale siempre de restar instantes (`ahoraMs`), no de sumar ticks: no se desfasa.
- En un paso `fallo` el reloj cuenta hacia arriba alternando colgado y descanso (trabajoS / descansoS) y guarda los
  segundos **colgado** acumulados hasta «No puedo más» (es el dato del test de resistencia).
- Al terminar (último paso o «Terminar»): `minutosReales = ceil(total / 60 s)`, como mínimo 1.
- **Recarga:** el estado se guarda en `localStorage` con la clave `cronometro:<id>` en cada cambio (con try/catch; si
  falla, la página funciona igual). Al volver se ofrece **Continuar donde ibas** (en pausa) o **Empezar de nuevo**. Se
  borra al registrar.

## 5. Pantalla

- **Entrada:** en Hoy, cada sesión de **hoy**, aceptada (con `propuesta`) y sin registrar tiene un enlace **Empezar con
  cronómetro** a `/sesion/<id>`. `/sesion/[id]` (con `params` como `Promise`, Next 16) comprueba con `requerirDatos()`
  que la sesión existe, es de hoy, tiene propuesta y no está registrada; si no, un mensaje y un enlace a Hoy.
- **Antes de empezar:** la lista de bloques y un botón **Empezar** (desbloquea el audio: el navegador solo deja sonar
  tras una pulsación).
- **En marcha:**
  - Segundos restantes en grande (en `fallo`, segundos colgado acumulados hacia arriba y si toca colgado o descanso);
    título del paso, bloque y carga; el paso siguiente en pequeño; «paso n de N».
  - Fondo: verde en `colgado`, azul en `descanso`, ámbar en `preparate`, gris en `bloque` y `manual`.
  - Botones: **Pausa/Seguir**, **Saltar**, **Atrás**, **Terminar** (con confirmación); **Hecho** en `manual`, **No
    puedo más** en `fallo`.
  - La pantalla no se apaga mientras corre (Screen Wake Lock, si el navegador lo soporta; se vuelve a pedir al volver
    a la pestaña).
- **Pitidos** (Web Audio, sin archivos): tres cortos en los 3 últimos segundos de cada paso con tiempo; uno largo y
  agudo al empezar un `colgado`; uno grave al empezar un `descanso`. Un botón para silenciar.
- **Al acabar:** «Sesión terminada» y el **formulario de registro** de siempre en la misma pantalla, con los minutos
  reales puestos y las molestias del chequeo de hoy. En un test de dedos se muestra además «Resistencia: N s» para
  apuntarlo en Evaluación. Al registrar se borra el estado guardado y se vuelve a Hoy.
- `FormularioRegistro` sale de `TarjetaSesion.tsx` a su propio archivo (`app/(app)/_hoy/FormularioRegistro.tsx`) y gana
  `minutosIniciales?: number` para reutilizarlo aquí.

## 6. Pruebas

- **`pasosDeSesion`** con planes reales del motor (`construirSesion`): repeaters (número de pasos, sin descanso corto
  tras la última repetición, descanso entre series), resistencia de fuerza 10:5, 4×4 (manuales y descansos de 4 min),
  ARC y hombro (bloques por minutos), test de dedos (3 intentos con 3 min y el 7:3 hasta el fallo), descarga (mitad de
  series) y que los segundos con tiempo de cada bloque no superan sus minutos.
- **Reloj:** avanza al llegar a cero, varios pasos de golpe tras un salto de tiempo, pausar y seguir no cuenta la
  pausa, saltar y atrás, hecho, fallo con los segundos colgado, minutos reales, y que el estado se puede serializar y
  recuperar.
- **e2e:** desde Hoy, abrir el cronómetro de la sesión aceptada, empezar, terminar y registrar.
