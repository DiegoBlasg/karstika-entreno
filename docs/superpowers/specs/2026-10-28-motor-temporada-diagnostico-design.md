# Motor, tramo 2c: temporada, fases y diagnóstico

Fecha: 2026-10-28 · Estado: diseño aprobado en brainstorming
Depende de: núcleo 2a y generador 2b (en `master`), `docs/evidencia/parametros.md`.

## Decisiones del usuario

1. **Fecha objetivo**: el 7a en roca en octubre de 2027. Semana objetivo por defecto: lunes 4 de octubre de 2027
   (configurable). Inicio: lunes 2 de noviembre de 2026.
2. **Dos ciclos** con un objetivo intermedio en primavera (6c / 6c+).
3. **Roca solo en viajes puntuales**: el rendimiento se prepara en sala; en los viajes, el contexto `roca` propone
   pegues de proyecto.
4. **Diagnóstico** con tests frente a la propia línea base y el motivo de cada caída en los intentos al límite.
5. Pendientes del tramo 2b: el **descanso pasa a ser la principal** cuando se recomienda descansar; en casa durante
   la base, **hombro, antagonistas y movilidad hasta ~40 min**; el **test de dedos exige 28 días y al menos 6
   sesiones** registradas en ellos.

## Parte 1: temporada, fases nuevas y descargas

### 1.1 Plan de temporada (`motor/temporada.ts`)

```ts
export interface SemanaPlan {
  lunes: string                 // 'AAAA-MM-DD'
  ciclo: 1 | 2
  faseId: FaseId
  semanaDeFase: number          // 1..n
  descarga: boolean             // P-47 / P-48
  reevaluar: boolean            // última semana de fase (P-26)
}
export interface Temporada { inicio: string; objetivo: string; semanas: SemanaPlan[] }
export function planificarTemporada(inicio: string, objetivo: string): Temporada
export function semanaEnFecha(t: Temporada, fecha: string): SemanaPlan | undefined
export function faseEnFecha(t: Temporada, fecha: string): Fase   // ya con la descarga aplicada
```

Plantilla de 48 semanas:

| Ciclo | Fase (`FaseId`) | Semanas | Rango ajustable | Origen |
|---|---|---|---|---|
| 1 | `base` | 4 | fijo | P-32 (mínimo 4) |
| 1 | `fuerza` | 8 | fijo en 2c-1 | P-08, P-31 |
| 1 | `resistencia` | 6 | fijo en 2c-1 | P-31 |
| 1 | `rendimiento` (primavera) | 4 | 3-6 | diseño |
| 1 | `transicion` | 2 | 1-3 | diseño |
| 2 | `fuerza` | 8 | 4-10 (diagnóstico, parte 2) | P-08, P-31 |
| 2 | `resistencia` | 6 | 4-8 (diagnóstico, parte 2) | P-31 |
| 2 | `rendimiento` (final) | 10 | 6-12 | diseño |

- `inicio` debe ser lunes; `objetivo` se normaliza al lunes de su semana. N = semanas entre ambos.
- Si N ≠ 48, la diferencia se absorbe por este orden y dentro de su rango: rendimiento final, transición,
  rendimiento de primavera. Si no cabe (N < 42 o N > 53, que son los límites de los rangos), `planificarTemporada`
  lanza un error claro.
- **Descargas** (P-47: 1 de cada 4 semanas para < 2 años): se cuentan las semanas de `fuerza`, `resistencia` y
  `rendimiento` de cada ciclo, de forma continua; cada 4.ª es de descarga. `base` y `transicion` no cuentan (ya
  son suaves). La última semana del ciclo 2 es siempre de **afinado** (`descarga: true`).
- `reevaluar`: última semana de cada fase salvo `transicion` y salvo la semana de afinado final (hay que llegar
  fresco al objetivo). Si una semana de reevaluación es de descarga, el test se permite igual (poco volumen).

### 1.2 Fases (`motor/fases.ts`)

`Fase` gana `id: FaseId`, `descarga?: boolean` y `reevaluar?: boolean`. Fases nuevas:

- `FASE_RESISTENCIA` (resistencia de fuerza): cupos `via-cuerda-limite` 1, `multipresa-resistencia-fuerza` 1,
  `resistencia-4x4` 1, `tecnica` 1, `arc` 1, `hombro` 2. Intensas de dedos: 2 por semana. El 4x4 va antes que la
  multipresa en la prioridad: solo cabe en el rocódromo, y la multipresa también en casa.
- `FASE_RENDIMIENTO`: cupos `pegues-proyecto` 2 (solo en roca), `via-cuerda-limite` 2, `multipresa-resistencia` 1
  (mantenimiento), `tecnica` 1, `hombro` 2. Prioridad: pegues, vía, multipresa, técnica, ARC, hombro. En semana de
  sala son 3 intensas (2 vías + 1 multipresa); en semana de viaje los pegues compiten con la vía y la regla
  `seguridad.dedos-7dias` impide pasar de 3.
- `FASE_TRANSICION`: cupos `tecnica` 2, `arc` 1, `hombro` 2; todo lo intenso prohibido.
- `descargar(fase)`: prohíbe todo lo que es al límite (`via-cuerda-limite`, `bloque-limite`, `board`,
  `pegues-proyecto`, `campus`, `evaluacion-dedos`), conserva la multipresa con `descarga: true` y marca la fase.

### 1.3 Tipos y plantillas nuevos

- Tipo nuevo `multipresa-resistencia-fuerza`: P-36 (10 s : 5 s, 5 repeticiones, 4 series, 60 s entre series; A).
  Intensa de dedos por tipo, multipresa a todos los efectos (regleta, 7 días, P-12), lugares `casa` y `rocodromo`.
  Carga: la de repeaters de 2b (70 % / 80 % del test o esfuerzo percibido).
- `resistencia-4x4`: P-37 (diseño): calentamiento 10 + bloques progresivos 10 + 4 vueltas a 4 bloques fáciles con
  4 min entre vueltas (≈ 30 min) = 50 min. Carga alta, no intensa de dedos.
- `pegues-proyecto` (roca, con compañero): calentamiento en vías fáciles 20 min + hasta 4 intentos (P-61) de
  25 min con 20 min de recuperación activa (P-51), lectura de hasta 3 min (P-53) y reposos sacudiendo (P-52).
- `tecnica` en `roca` (con compañero): vías por debajo del nivel; da el segundo día de un viaje sin violar P-14.
- Contexto: en `roca` todo tipo salvo `descanso` exige compañero (la escalada en roca es con cuerda).
- **Descarga en plantillas**: multipresa con la mitad de series; 4x4 con 2 vueltas; el resto sin cambios
  (ya son suaves).

### 1.4 Generador

- `proponerSesion` recibe la fase como hasta ahora (la interfaz la obtiene con `faseEnFecha`).
- Con `fase.reevaluar`, el test de dedos vuelve a ser candidato si el último tiene 21 días o más.
- **Descanso como principal**: cuando se recomienda descansar, `principal` es `null`, `descanso` explica por qué y
  las alternativas (hasta 2) son las mejores sesiones suaves.
- **Hombro ampliado**: con 40 min o más, la sesión de hombro añade antagonistas y movilidad (5 + 15 + 20 min).
- **Test de dedos**: `seguridad.evaluacion-prematura` exige además al menos 6 sesiones en los 28 días anteriores
  (`VALORES['P-32'].sesionesMinimasBase = 6`, ampliación de diseño en `parametros.md`).

## Parte 2: diagnóstico (plan aparte)

- `EvaluacionDedos` gana `resistenciaS?` (test intermitente 7 s : 3 s al 60 % hasta el fallo, P-24) y
  `tecnica?` (1-7, P-27); el test de dedos añade ese segundo bloque tras 10 min de descanso.
- El registro de cada intento al límite admite `motivoCaida: 'bombeo' | 'paso-fuerza' | 'tecnica-lectura' |
  'cabeza'`.
- `diagnosticar(evaluaciones, intentos)`: progreso frente a la línea base (< 5 % = sin cambio, diseño) y orden de
  limitantes (con ≥ 10 intentos manda el motivo de caída; si no, P-23).
- El diagnóstico ajusta las semanas de `fuerza` y `resistencia` del ciclo 2 dentro de sus rangos y el cupo de
  técnica.

## Pruebas (parte 1)

- Temporada: 48 semanas con la plantilla exacta; ajuste a 44 y 52 semanas; errores fuera de 42-53; descargas cada
  4.ª semana de las fases que cuentan; afinado final; `reevaluar` en las últimas semanas; `faseEnFecha` devuelve la
  fase descargada en semanas de descarga.
- Fases: coherencia de cupos, prioridad y prohibidos; tope de 3 intensas para novel; transición sin nada intenso.
- Plantillas nuevas con sus cifras; descarga a la mitad.
- Generador: descanso como principal; hombro de 40 min; test con menos de 6 sesiones bloqueado; reevaluación.
- Simulación de la temporada completa (48 semanas) con el patrón real del usuario: nunca una propuesta inválida,
  ≤ 3 intensas por 7 días, descargas sin nada al límite, y progresión de cargas coherente.

## Validación (parte 1)

Simulación de las 48 semanas con la semana real del usuario (martes con gente, jueves solo, sábado en casa) y dos
viajes de fin de semana, incluida como prueba (`motor/temporada-simulacion.test.ts`): ninguna propuesta inválida;
2-3 sesiones intensas de dedos por semana y nunca en días seguidos; descargas sin nada al límite; test de dedos al
final de cada fase (el primero tras 4 semanas y 6 sesiones de base, ninguno en el afinado); multipresa siempre
≤ 80 % del test; en los viajes, pegues el primer día y vías cómodas el segundo.

## Revisión final de la parte 1 (2026-10-28)

- `FASE_RENDIMIENTO`: vía al límite 1, **bloque al límite 1** (para el día sin compañero), multipresa de
  mantenimiento 1 (**un solo bloque**) y pegues 2 en roca. Semana de sala del usuario: 3 sesiones al límite.
- Los cupos son tope para toda sesión de **carga alta** (no solo intensa de dedos): p. ej. el 4x4 una vez por semana.
- `reevaluar`: no en la base (su test lo desbloquea P-32); sí a mitad de los rendimientos de más de 6 semanas, para
  no pasar de 10 semanas sin test (P-08).
- La **semana objetivo** devuelve `FASE_OBJETIVO`: solo pegues al proyecto en roca y cosas suaves (nada intenso en
  sala), para llegar fresco a los días de roca; la semana siguiente, `FASE_RENDIMIENTO` sin test ni descarga.
- Seguimientos aplazados: en semanas de descarga un hueco de rocódromo puede quedarse en solo hombro (sería mejor
  técnica); el ciclo 2 de fuerza arranca al 80 % y 2 bloques tras la transición (se podría reiniciar la progresión).
- La resistencia de fuerza en multipresa tiene progresión propia (vuelve a empezar al 70 %, P-11) y su
  explicación aclara que la carga viene de P-06.
- El mínimo de 6 sesiones de base no cuenta los `descanso`. Las fases constantes están congeladas.

## Parte 2 implementada

- `EvaluacionDedos` con `resistenciaS` (P-24, 1-600 s) y `tecnica` (P-27, entero 1-7), validados.
- El test de dedos, con 45 min o más, añade 10 min de descanso y el test intermitente 7 s : 3 s al 60 % hasta el
  fallo, y pide la autoevaluación técnica; con 30-44 min, solo el test máximo.
- `diagnosticar(evaluaciones, intentos, fecha)`: progreso (primera frente a última evaluación anterior a la fecha;
  < 5 % = sin cambio, diseño) y limitantes (con ≥ 10 caídas con motivo en 8 semanas manda el registro; si no, P-23;
  empates por P-23). `IntentoLimite { fecha, encadenado, motivoCaida? }`: bombeo → resistencia, paso de fuerza →
  fuerza de dedos, técnica o lectura → técnica, cabeza → cabeza.
- `ajusteCiclo2(diagnostico)`: fuerza de dedos → 10 + 4; resistencia → 6 + 8; técnica → 8 + 6 con un cupo más de
  técnica por semana (se usa cuando hay hueco); cabeza → 8 + 6 (el trabajo mental, en los consejos del tramo 2d). Rangos de P-31.
- `planificarTemporada(inicio, objetivo, { ciclo2, refuerzoTecnica })` aplica el ajuste sin cambiar la fecha
  objetivo (las 14 semanas se reparten; error claro fuera de P-31 o si no suman 14).

### Correcciones tras la revisión de la parte 2

- **P-08**: las fases de fuerza o resistencia de más de 8 semanas (y los rendimientos de más de 6) llevan test a
  mitad de fase; con cualquiera de los 4 repartos nunca pasan más de 10 semanas entre tests (probado).
- **Progreso (P-19)**: hacen falta 3 tests y que los 2 últimos confirmen el cambio frente al primero (≥ 5 %, o 1 punto
  en la técnica, que se muestra en puntos y no en %). Dos evaluaciones el mismo día se rechazan.
- **Test de resistencia**: la carga se da en kg con la fórmula `0,6 × (peso + lastre de hoy) − peso` (negativo =
  descarga con polea o banda) y un ejemplo con el último test; si hace falta descarga y no hay polea, en el rocódromo.
- **Refuerzo de técnica**: es un cupo más de técnica que se usa cuando hay hueco (días suaves, descargas, rendimiento);
  no desplaza a la fuerza, y la explicación lo dice así.
- `planificarTemporada(..., { ajuste })` acepta directamente el resultado de `ajusteCiclo2`.
- **P-08 en cualquier longitud de temporada**: tras construir el calendario, una pasada final garantiza que nunca pasan
  más de 10 semanas entre tests (contando la transición, que en temporadas de 51-53 semanas sube a 3) y quita los que
  quedarían a menos de 3 semanas del anterior. La temporada de 48 semanas no cambia. Una prueba recorre todas las
  longitudes válidas (42-53) con los 4 repartos.
- `planificarTemporada` lanza error si se pasa `ajuste` junto con `ciclo2` o `refuerzoTecnica`.
- La explicación del progreso dice «sin datos suficientes», da el número de tests y usa «1 punto» en singular.
