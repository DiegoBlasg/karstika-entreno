# App: biblioteca de ejercicios y rutina de hombro concreta

Fecha: 2026-10-30 · Estado: aprobado por Diego en conversación

## 1. Objetivo

Cada ejercicio que propone el motor enlaza a una **ficha** que explica cómo se hace.

Decisión de Diego:
- La ficha lleva texto y un **dibujo esquemático SVG**. No hay vídeos externos, y la ficha funciona sin conexión.
- Las sesiones de **hombro y antagonistas** pasan a tener una **rutina concreta**, en lugar de «ejercicios en cadena cerrada, excéntricos y de fuerza».

## 2. Fichas

`lib/biblioteca/fichas.ts` (puro) define `FICHAS: Record<FichaId, Ficha>`:

```ts
interface Ficha {
  id: FichaId
  titulo: string
  paraQue: string            // qué se busca, en 1-2 frases
  material: string           // «Multipresa, regleta de 20 mm» · «Barra» · «Banda elástica» · «Ninguno»
  pasos: string[]            // 3-7 pasos numerados
  errores: string[]          // errores típicos
  paraSi: string[]           // cuándo parar: dolor, chasquido, pérdida de fuerza, etc.
  parametros: ParametroId[]  // las reglas del motor que lo prescriben (enlazan a «¿Por qué?» y a las fuentes)
  dibujo?: DibujoId          // esquema SVG de la posición clave
}
```

Las fichas mínimas cubren todo lo que el motor puede proponer:
- **Suspensiones:**
  - repeaters 7:3;
  - resistencia de fuerza 10:5;
  - suspensión máxima de 10 s del test;
  - 7:3 hasta el fallo del test;
  - agarre semiarqueado frente a arqueado (P-10).
- **Calentamiento:** calentamiento de menos a más y calentamiento en barra.
- **Escalada:**
  - bloques al límite;
  - vía al límite con cuerda;
  - 4×4;
  - ARC;
  - práctica técnica (paso alto, drop knee, talón, pies precisos);
  - vídeo y autoevaluación de técnica (1-7).
- **Barra:** dominadas lastradas y colgarse de la barra (activo y pasivo).
- **Hombro y antagonistas:**
  - retracciones escapulares colgado;
  - flexiones;
  - rotación externa con banda (con bajada lenta);
  - Y-T-W con banda;
  - face pull con banda;
  - extensores de dedos con banda;
  - plancha con toques de hombro.
- **Movilidad:** cadera, hombro y muñecas sin carga.

**Textos:**
- Son técnicos y prudentes, en español.
- No atribuyen a un estudio lo que el estudio no dice.
- Lo que es diseño propio lleva «(decisión de diseño)» en la dosis.
- La seguridad sigue las reglas ya existentes: semiarqueado (P-10), parar ante dolor y alarma (P-42 a P-45), regleta obligatoria para noveles.

**Dibujos:**
- Un `DibujoId` por posición clave, en `components/dibujos/`.
- Son figuras de palitos en SVG en línea, de una sola tinta (`currentColor`), legibles en móvil y con `aria-label`.
- Al menos estas posiciones:
  - colgado en multipresa (semiarqueado);
  - retracción escapular en barra;
  - dominada;
  - flexión;
  - rotación externa con banda;
  - Y-T-W;
  - face pull;
  - plancha.
- Una ficha sin dibujo propio no muestra imagen.

## 3. Enlaces desde el motor

- `Ejercicio` (motor) gana `ficha?: string`.
- `plantillas.ts` pone la ficha en cada ejercicio que tenga una.
- Un test comprueba que toda `ficha` usada por las plantillas existe en `FICHAS`. El test está en `lib/` porque el motor no conoce la biblioteca.
- `PlanSesion` y el cronómetro muestran «Cómo se hace» con un enlace a `/biblioteca/<id>` en cada ejercicio con ficha.

## 4. Rutina de hombro concreta (P-41)

**Rutinas.** La sesión de `hombro` y el complemento de hombro alternan **dos rutinas**:
- **A:**
  - retracciones escapulares colgado, 3×8;
  - flexiones, 3×8-12;
  - rotación externa con banda, 3×12 con 3 s de bajada;
  - Y-T-W con banda, 2×8 de cada.
- **B:**
  - face pull con banda, 3×12;
  - plancha con toques de hombro, 3×30 s;
  - rotación externa con banda, 3×12 con 3 s de bajada;
  - extensores de dedos con banda, 2×15 (opcional).

**Reglas de la rutina:**
- Se alterna A, B, A… según cuántas sesiones o complementos de hombro hay ya en el historial. Es determinista.
- Las dosis son **decisión de diseño**: P-41 fija la frecuencia, no la dosis. Así lo dice la explicación.
- El tipo de ejercicio sigue el programa de EV-LESION-007: cadena cerrada, excéntricos y fuerza.

**Restricciones del estado.** Se respetan tal cual:
- con `hombroSinCarga` (hombro o codo en ámbar), solo movilidad y activación sin bandas;
- con `soloHombro`, igual que ahora.

**Duración.** La duración del bloque no cambia.

## 5. Pantallas

- `/biblioteca`: el índice por grupos (suspensiones, escalada, barra, hombro y antagonistas, movilidad).
- `/biblioteca/[id]`: la ficha completa, con «Por qué se hace» y las bases de sus `parametros`, con los estudios a través de `basesDe` de `lib/fuentes.ts`.
- La biblioteca entra en el menú (o en «Plan», si el menú ya es largo).

## 6. Pruebas

- **Fichas:**
  - todas las fichas tienen título, pasos y «para si»;
  - sus `parametros` existen en `METADATOS`;
  - cada `dibujo` existe.
- **Plantillas:** cada `ficha` que usan existe; la sesión de hombro concreta los ejercicios y alterna A y B; con `hombroSinCarga` no hay bandas.
- **e2e:** desde una sesión, abrir «Cómo se hace» y ver los pasos.
