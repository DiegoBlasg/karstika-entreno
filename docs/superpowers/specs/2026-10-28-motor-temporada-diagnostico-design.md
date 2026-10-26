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
  rendimiento de primavera. Si no cabe (N < 40 o N > 56), `planificarTemporada` lanza un error claro.
- **Descargas** (P-47: 1 de cada 4 semanas para < 2 años): se cuentan las semanas de `fuerza`, `resistencia` y
  `rendimiento` de cada ciclo, de forma continua; cada 4.ª es de descarga. `base` y `transicion` no cuentan (ya
  son suaves). La última semana del ciclo 2 es siempre de **afinado** (`descarga: true`).
- `reevaluar`: última semana de cada fase salvo `transicion`.

### 1.2 Fases (`motor/fases.ts`)

`Fase` gana `id: FaseId`, `descarga?: boolean` y `reevaluar?: boolean`. Fases nuevas:

- `FASE_RESISTENCIA` (resistencia de fuerza): cupos `via-cuerda-limite` 1, `multipresa-resistencia-fuerza` 1,
  `resistencia-4x4` 1, `tecnica` 1, `arc` 1, `hombro` 2. Intensas de dedos: 2 por semana.
- `FASE_RENDIMIENTO`: cupos `pegues-proyecto` 2 (solo en roca), `via-cuerda-limite` 2, `multipresa-resistencia` 1
  (mantenimiento), `tecnica` 1, `hombro` 2. Prioridad: pegues, vía, multipresa, técnica, ARC, hombro.
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

- Temporada: 48 semanas con la plantilla exacta; ajuste a 44 y 52 semanas; errores fuera de 40-56; descargas cada
  4.ª semana de las fases que cuentan; afinado final; `reevaluar` en las últimas semanas; `faseEnFecha` devuelve la
  fase descargada en semanas de descarga.
- Fases: coherencia de cupos, prioridad y prohibidos; tope de 3 intensas para novel; transición sin nada intenso.
- Plantillas nuevas con sus cifras; descarga a la mitad.
- Generador: descanso como principal; hombro de 40 min; test con menos de 6 sesiones bloqueado; reevaluación.
- Simulación de la temporada completa (48 semanas) con el patrón real del usuario: nunca una propuesta inválida,
  ≤ 3 intensas por 7 días, descargas sin nada al límite, y progresión de cargas coherente.
