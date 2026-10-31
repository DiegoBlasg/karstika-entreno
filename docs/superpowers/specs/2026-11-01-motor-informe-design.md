# El informe de ejercicios en el motor: resistencia 10:6, ARC alterno, subir carga despacio, dominadas de potencia y vía de práctica

Fecha: 2026-11-01 · Rama: `motor-informe` · Base: `docs/evidencia/informe-2026-10-31-tests-ejercicios.md`

## Por qué

El informe del 2026-10-31 encontró prescripciones con mejor apoyo (o más cercanas al perfil de Diego) que las que usa
el motor. Diego eligió llevar al motor cinco de ellas (1, 2, 4, 5 y 6 de la propuesta); las suspensiones suaves en la
base (3) se descartan: **la base sigue sin multipresa**.

## Decisiones de Diego (2026-11-01)

1. Resistencia en multipresa: **10 s : 6 s al 60 %, hasta 24 repeticiones, 2 series, 6 min** (Devise 2022, F60).
2. ARC: alternar **continuo 2-3 × 15 min** y **on-offs 10 × (1 min / 1 min)**.
3. Subir carga en dedos más despacio: **2 sesiones completas seguidas** antes de subir y **+1,25 kg por semana como
   techo** (Mundry 2021); nunca bajar de regleta.
4. Dominadas en casa: alternar **lastradas** y **potencia** (explosivas + excéntricas; Vigouroux 2024).
5. Técnica: **«tu vía de práctica» hasta que fluya** (≤ ~7 sesiones) **+ 1-2 vías nuevas** (Hacques 2022).
6. Las sesiones ya generadas no cambian; lo nuevo vale para lo que se genere desde ahora.

## 1. Resistencia en multipresa (`multipresa-resistencia-fuerza`, P-36)

- Protocolo: suspensiones 10 s : 6 s en regleta de 20 mm semiarqueado, **hasta 24 repeticiones por serie**, **2 series**,
  **6 min** entre series. Descarga: 1 serie.
- Carga: **60 % del test vigente** (`lastreRepeaters(e, 0.6)`). Sin test vigente: texto «la carga con la que completas
  casi toda la primera serie» (como hoy sin test).
- Progresión (diseño): si en la sesión anterior de este tipo se completaron las 24 en las dos series… la app no lo sabe
  (no se registran repeticiones). Se aplica la misma regla de subida que al resto de multipresa (§3), con la carga base
  al 60 % en lugar del 70/80 %.
- Cronómetro: cada serie es un paso «fallo» de 10:6 hasta 24 repeticiones o «No puedo más» (el tipo de paso ya existe
  para el 7:3 del test).
- Sigue siendo **intensa de dedos** (P-15) y su cupo de fase no cambia.
- Ficha nueva `resistencia-10-6` (sustituye a `resistencia-fuerza-10-5` en la plantilla; la vieja se mantiene en la
  biblioteca solo si algo la usa, si no se borra).
- P-36: valor nuevo `{ trabajoS: 10, descansoS: 6, repeticiones: 24, series: 2, descansoSeriesS: 360, fraccion: 0.6 }`;
  texto con F60 (A) y nota de que F80 y el 10:5 de EV-RESIST-003 quedan como alternativas no usadas.

## 2. ARC (P-35)

- Alterna según cuántas sesiones de ARC hay en el historial antes de hoy (par → A, impar → B), como la rutina de hombro.
- **A, continuo**: series de 15 min, 10 min de descanso; **3 series si caben** (≥ 10 + 3·15 + 2·10 = 75 min), si no 2
  (≥ 50 min), si no 2 × 10 (≥ 40 min, como hoy). Esfuerzo 3-4/10, sin bombeo marcado.
- **B, on-offs**: 10 × (1 min escalando / 1 min descanso) = 20 min + calentamiento (30 min). Unos 2 grados por debajo de
  tu a vista; bombeo alto solo al final. Si no caben 30 min, A.
- Descarga: A con 2 series, B con 5 repeticiones (diseño).
- P-35: valores `{ minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10, seriesMax: 3, onOffs: 10 }`; nivel C
  (Lattice, Anderson) + diseño.
- Ficha nueva `on-offs`.

## 3. Subir carga en dedos (P-11, P-04/P-06)

Para toda la multipresa con progresión (`progresionMultipresa`):
- **Subir de escalón** (y cada paso de la rampa de abajo) exige que **las 2 últimas sesiones de multipresa fuera de
  descarga sean válidas** (completadas, RPE en objetivo, dolor 0-1: lo que hoy ya marca `sesionesNoValidas`). Si no, la
  carga se queda en la de la última sesión.
- **Rampa de +1,25 kg por semana**: cuando toca pasar del 70 % al 80 % (o a la fracción mayor que toque), la carga no
  salta: sube como mucho 1,25 kg por semana natural desde la carga anterior hasta llegar al objetivo. (Mundry 2021 añadió
  1,25 kg/semana en población 5c-7a+.)
- Nunca se baja de regleta: 20 mm fijos (ya es así; se refuerza el texto de P-09).
- P-11: texto nuevo con las 2 sesiones y el techo de 1,25 kg/semana (A, Mundry; C, Lattice). `VALORES['P-11'] =
  { sesionesValidasParaSubir: 2, kgMaxSemana: 1.25 }`.

## 4. Dominadas en casa (P-39 + nuevo P-73)

- La sesión `dominadas` alterna por historial (par → A, impar → B):
  - **A, lastradas** (como hoy, P-39).
  - **B, potencia** (P-73): calentamiento de barra 10 min; **dominadas explosivas 4 × 3-5** lejos del fallo (subir
    rápido, bajar controlado), 3 min de descanso; **excéntricas 3 × 3-5 bajadas de 3-5 s**, 2 min de descanso; vuelta a
    la calma 5 min. Total 30 min, como la A.
- Mismas reglas que hoy: opcional, ≤ 1 por semana, nunca el día de dedos intensos, sin colgarse con dedos/muñeca fuera
  de verde (P-64, P-65), fuera de descarga.
- P-73 `sinEvidencia (indirecta A)`: frecuencia y duración de Vigouroux y Devise 2024 (avanzados); series y
  repeticiones = diseño.
- Fichas nuevas `dominadas-explosivas` y `dominadas-excentricas`.

## 5. Técnica (P-54)

- La sesión de técnica sustituye su ejercicio principal por dos:
  - «Tu vía de práctica: 2-3 pegues buscando que salga fluida. Si ya fluye o llevas unas 7 sesiones con ella, elige
    otra» (ficha `via-de-practica`).
  - «1-2 vías nuevas parecidas, a vista» (ficha `practica-tecnica`).
  - Se mantienen la previsualización (P-53) y el vídeo (P-55).
- P-54: texto nuevo con Hacques 2022 (A: repetir mejora la fluidez en esa vía; variar hace la mirada más anticipatoria).

## 6. Pruebas

- Motor: P-36 nuevo (series, repeticiones, 60 %, descarga), ARC A/B alterno y elección de 3/2 series por minutos,
  on-offs en descarga; rampa de 1,25 kg/semana y bloqueo si alguna de las 2 últimas no es válida; dominadas A/B
  alternas; técnica con vía de práctica + nuevas.
- `parametros.test.ts` para P-11, P-35, P-36, P-54, P-73; metadatos 72 → 73.
- Cronómetro: pasos del 10:6 hasta 24 con «No puedo más».
- Biblioteca: fichas nuevas y la simulación de temporada completa en verde.
