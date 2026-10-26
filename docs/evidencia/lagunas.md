# Lagunas consolidadas y cómo las trata el motor

Fecha: 2026-10-26. Este documento consolida las lagunas de los nueve bloques. El detalle de cada bloque
sigue en `lagunas-<bloque>.md` (rendimiento, dedos, fuerza, resistencia, tecnica, tactica, periodizacion,
lesiones, recuperacion). Los parámetros citados (P-xx) están en [parametros.md](parametros.md).

## Tratamientos posibles

- **Conservador**: valor por defecto de diseño en la dirección segura (menos carga, más descanso, menos
  intensidad), etiquetado `sinEvidencia` en parametros.md.
- **C declarado**: se aplica, pero la explicación ("¿Por qué?") lo muestra como consenso, práctica o
  extrapolación, nunca como "ciencia".
- **Preguntar**: el motor pide el dato al usuario en lugar de suponerlo.
- **No se implementa**: el motor no toma esa decisión. Como mucho, da información o recomienda a un
  profesional.
- **Revisar fuente**: hay una fuente identificada que no se leyó entera y conviene abrir antes de cambiar
  el parámetro.

En todos los casos, la explicación de la decisión enlaza los ids indirectos y dice explícitamente que el
valor no viene de un estudio.

## Tabla de lagunas

| # | Laguna | Qué hay | Tratamiento en el motor | Parámetros |
|---|---|---|---|---|
| L-01 | Seguridad y eficacia del entrenamiento de dedos con < 2 años de experiencia | Ningún ensayo en esa población. Solo una encuesta no revisada por pares (EV-DEDOS-014, C) y resultados contradictorios sobre experiencia (EV-DEDOS-011). Todos los ensayos son de intermedios-avanzados a élite | Conservador: repeaters submáximos, volumen inicial reducido, sin máximas, sin campus, regleta de 20-23 mm | P-01, P-04, P-11, P-12, P-13 |
| L-02 | Progresión máxima semanal de carga en dedos | Sin estudios. Los ensayos no reajustaban la carga (EV-DEDOS-005) | Conservador: como mucho 1 incremento mínimo por semana, condicionado a RPE y dolor | P-11 |
| L-03 | Descanso mínimo entre sesiones intensas de dedos | Solo indirecto: 60 h hasta la disposición para escalar tras una competición de élite (EV-PERIOD-013). Las cifras de 48-72 h de blogs se descartaron | Conservador: 48 h como restricción dura; parámetro configurable para revisarlo si aparece evidencia | P-14, P-15 |
| L-04 | Máximo de días seguidos de carga alta | Sin evidencia | Conservador: 2 días | P-16 |
| L-05 | Valores de referencia de suspensión a 20 mm y de dominada para 6b-7a | No hay tabla revisada por pares. Berta 2025 (EV-RENDIM-003) tiene normas, pero solo se leyó el resumen | No se implementa la comparación con tablas: el diagnóstico usa la línea base propia. Revisar fuente: abrir el texto completo de Berta 2025 | P-20, P-21, P-23 |
| L-06 | Duración de la suspensión en el test y cambio mínimo detectable | La revisión de fiabilidad da CCI globales (EV-DEDOS-012), no los protocolos individuales. El CV de la tracción isométrica en intermedios es alto (EV-FUERZA-007) | Conservador: protocolo de diseño; un cambio solo cuenta si se repite en dos evaluaciones | P-17, P-18, P-19 |
| L-07 | Frecuencia óptima de reevaluación | Solo la duración de los ensayos (4-10 semanas) | Conservador: al final de cada fase | P-26 |
| L-08 | Instrumento de autoevaluación técnica | Solo una escala 1-7 puntuada por jueces expertos (EV-TECNIC-007) | C declarado: autoevaluación con vídeo, sin valor diagnóstico fuerte | P-27 |
| L-09 | Modelo de periodización en escalada | Ningún ensayo en escaladores; extrapolado de fuerza y de resistencia aeróbica (EV-PERIOD-001 a EV-PERIOD-004) | C declarado (extrapolado): fases por bloques con variación ondulante, como configuración y no como código | P-28, P-30 |
| L-10 | Duración del macrociclo y de las fases para 6b→7a | Sin evidencia. Solo la duración de los ensayos | Conservador: 16-24 semanas; fases dentro de los rangos ensayados. Preguntar: fecha objetivo | P-29, P-31, P-32 |
| L-11 | Velocidad de adaptación de poleas y tendones frente al músculo | Solo observacional en adolescentes y en élite a 10 años (EV-DEDOS-009, EV-DEDOS-010) | Conservador: fase de base de al menos 4 semanas antes de la fuerza de dedos | P-32 |
| L-12 | Interferencia entre fuerza y resistencia en escaladores | Un ensayo infradotado (EV-FUERZA-008) y extrapolación (EV-FUERZA-012) | C declarado: se permite el entrenamiento concurrente, con una prioridad por fase | P-33 |
| L-13 | Validez de sRPE, TRIMP y tonelaje en escalada | sRPE validado en otros deportes (EV-PERIOD-006); RPE poco fiable en niveles bajos (EV-PERIOD-005) | C declarado: sRPE; el motor no usa el sRPE como único criterio para subir carga | P-34, P-50 |
| L-14 | Magnitud, frecuencia y eficacia de las descargas | Solo práctica descrita y consenso (EV-PERIOD-007, EV-PERIOD-008) | C declarado y conservador: cada 4 semanas, −50 % de volumen | P-47, P-48 |
| L-15 | Señales fiables de sobrecarga en escaladores y reglas para ajustar la carga | Ningún marcador validado (EV-PERIOD-009); el autoinforme es sensible a la carga, pero sin umbrales (EV-RECUP-012) | Conservador: umbrales de diseño para adelantar la descarga o cambiar una sesión intensa por una suave | P-50 |
| L-16 | Dosis de ARC o capacidad | Ningún estudio de intervención. Solo asociaciones (EV-RESIST-011, EV-RENDIM-011) | Conservador (volumen bajo), etiquetado `sinEvidencia` | P-35 |
| L-17 | 4x4, bloques enlazados e intervalos en vía | Solo bouldering por intervalos con protocolo desconocido (EV-RESIST-001, A, solo resumen) | Conservador, etiquetado `sinEvidencia`; solo en la fase de resistencia de fuerza | P-37 |
| L-18 | CF como umbral exacto de prescripción | Validez cuestionada (EV-RENDIM-010, EV-RESIST-008) | No se implementa como umbral; solo seguimiento | P-25 |
| L-19 | Entrenamiento en board | Sin evidencia revisada por pares; solo se usó como test (EV-FUERZA-005) | Conservador: 1 sesión por semana, cuenta como sesión intensa de dedos | P-38 |
| L-20 | Dominadas lastradas a largo plazo y fuerza relativa | Solo efecto agudo (EV-FUERZA-003) y datos transversales (EV-FUERZA-007) | Opcional y no prioritario | P-22, P-39 |
| L-21 | Prerrequisitos del campus en adultos | Solo guía cualitativa (EV-FUERZA-010) y una asociación con lesión (EV-FUERZA-011) | No se implementa para este perfil (0 sesiones) | P-13 |
| L-22 | Antagonistas, hombro y dosis preventiva | Un ensayo de hombro sin dosis extraída (EV-LESION-007); relación flexor/extensor especulativa (EV-DEDOS-013) | C declarado en la dosis: 2 × 15 min por semana de hombro. Revisar fuente: Kozin 2021 | P-41 |
| L-23 | Umbrales del semáforo de dolor | Ninguna fuente | Conservador: verde 0-1, ámbar 2-3, rojo 4 o más | P-42, P-43 |
| L-24 | Criterios formales de derivación en lesión de polea | No existen en las fuentes abiertas; solo señales clínicas y que hace falta imagen (EV-LESION-010, EV-LESION-011) | No se implementa ningún diagnóstico. Las señales de alarma pasan a rojo y se recomienda valoración profesional | P-44 |
| L-25 | Volver a entrenar tras molestias leves | Sin guía validada (EV-LESION-012) | Conservador: volver al escalón de carga anterior. Tras un rojo, solo con alta profesional | P-45, P-46 |
| L-26 | Incidencia de lesión por grado y experiencia; efecto del aumento brusco de carga | Solo asociaciones (EV-LESION-004, EV-LESION-005); no se analizó el aumento brusco | Conservador: progresión lenta (P-11). El motor no estima un riesgo individual | P-11 |
| L-27 | Eficacia preventiva del calentamiento | No se halló asociación (EV-LESION-006); los efectos inmediatos no se midieron escalando (EV-TACTIC-001) | C declarado: se mantiene el calentamiento por prudencia, sin prometer prevención | P-49 |
| L-28 | Transferencia de sala y board a roca | Ningún estudio revisado por pares | Preguntar: días de roca disponibles. La fase final prioriza la roca cuando la hay | P-60 |
| L-29 | Descanso entre pegues y número de intentos | Un dato: 20 min con recuperación activa mantienen el rendimiento en una vía de 6b de rocódromo (EV-RECUP-010). No hay comparación de duraciones ni datos en roca. No hay análisis de intentos | Conservador: al menos 20 min, como mucho 4 intentos al límite | P-51, P-61 |
| L-30 | Intervenciones para el miedo a caer y la ansiedad | Una intervención solo en mujeres (EV-TACTIC-011, solo resumen) | Solo consejo; sin protocolo prescrito | P-62 |
| L-31 | Volumen de práctica técnica y ejercicios técnicos con efecto medido | Solo estudios pequeños de aprendizaje en una vía (EV-TECNIC-003 a EV-TECNIC-005) y un caso único (EV-TECNIC-008) | C declarado: variar vías; el volumen técnico lo fija el diseño | P-54 |
| L-32 | Entrenamiento de la lectura de vía | Solo descripción de estrategias (EV-TECNIC-009 a EV-TECNIC-012) | Solo consejo de previsualización | P-53 |
| L-33 | Peso corporal y rendimiento (causalidad) | Solo transversal (EV-RECUP-007, EV-RENDIM-001) | No se implementa: ningún objetivo de peso | P-58 |
| L-34 | Horas de sueño, energía y carbohidrato para escaladores | Sin cifras aplicables (EV-RECUP-001, EV-RECUP-002, EV-RECUP-004) | Solo consejo, sin cifras | P-56, P-57 |
| L-35 | Creatina y cafeína en escalada | Creatina sin resultados en escaladores; cafeína con un solo ensayo nulo (EV-RECUP-008, EV-RECUP-009) | No se implementa: el plan no prescribe suplementos | P-59 |
| L-36 | Recuperación entre sesiones (frío, masaje) | Solo recuperación entre intentos (EV-RECUP-010) y otros deportes (EV-RECUP-011) | Solo consejo; nunca sustituye al descanso de P-14 | P-14 |
| L-37 | Mujeres y escaladores de 6b | Muy poco representados en casi todos los estudios | C declarado: la explicación avisa de que la población de los estudios es distinta | todos |

## Lagunas de la propia base de datos (para revisar antes del motor)

- Resueltas (ver conclusiones, contradicciones 11-15): niveles unificados por diseño entre bloques,
  niveles restaurados en EV-RESIST-001, EV-RESIST-005, EV-RESIST-008 y EV-RENDIM-012, método `resumen` en
  periodización y recuperación, y traducción corregida en EV-RESIST-002.
- Fuentes que conviene abrir enteras porque pueden cerrar lagunas:
  - Berta 2025: normas de fuerza de dedos (L-05).
  - Kozin 2021: dosis del programa de hombro (L-22).
  - Medernach 2015: protocolo del bouldering por intervalos (L-17).
  - Stien 2021: vía frente a bloque, intensidades (L-12).
