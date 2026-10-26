import type { Hallazgo } from './tipos'

const FECHA = '2026-10-26'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-RENDIM-001',
    bloque: 'rendimiento',
    afirmacion:
      'En 44 escaladores (24 hombres, 20 mujeres; 5.6–5.13c YDS autoinformado) puntuados en dos vías de pared artificial, un componente de variables entrenables explicó de forma única el 58,9 % de la varianza del rendimiento, frente a 0,3 % del componente antropométrico y 1,8 % del de flexibilidad. Los autores concluyen que los datos no respaldan que haga falta un perfil antropométrico concreto.',
    fuentes: [
      { autores: 'Mermier, C., Janot, J., Parker, D., Swan, J.', anio: 2000, titulo: 'Physiological and anthropometric determinants of sport climbing performance', publicacion: 'British Journal of Sports Medicine, 34(5), 359–365', doi: '10.1136/bjsm.34.5.359' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'amplio rango, 5.6–5.13c YDS (no específico de 6b–7b+)', objetivo: 'deportiva en pared artificial' },
    limitaciones:
      'Transversal; el resumen solo da las varianzas únicas, no el R² total ni coeficientes. Rango de nivel muy amplio y grado autoinformado; rendimiento medido en pared artificial con sistema de puntuación de competición. El componente "flexibilidad" no distingue cadera de otras articulaciones en el resumen leído.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-002',
    bloque: 'rendimiento',
    afirmacion:
      'En 41 escaladores noveles (n=15), hábiles (n=16) y de élite (n=10), la fuerza de agarre de dedos fue la variable que mejor diferenció los tres grupos; los componentes entrenables explicaron el 46 % de la varianza de la capacidad de escalada y antropometría y características musculares menos del 4 %. La capacidad se relacionó más con fuerza específica que con fuerza general.',
    fuentes: [
      { autores: 'Laffaye, G., Levernier, G., Collin, J. M.', anio: 2016, titulo: 'Determinant factors in climbing ability: Influence of strength, anthropometry, and neuromuscular fatigue', publicacion: 'Scandinavian Journal of Medicine & Science in Sports, 26(10), 1151–1159', doi: '10.1111/sms.12558' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'noveles a élite (grados exactos no verificados en el resumen)', objetivo: 'escalada en general' },
    limitaciones:
      'Transversal, n pequeño por grupo. Leído solo el resumen, sin tablas; no se verificó la escala de grado ni el protocolo exacto de dedos. Los resultados no distinguen deportiva de bloque.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-003',
    bloque: 'rendimiento',
    afirmacion:
      'En 185 escaladores y 122 escaladoras, en un montaje específico de escalada, la fuerza máxima de los flexores de los dedos explicó el 68 % (hombres) y 64 % (mujeres) de la varianza de la capacidad de escalada; la resistencia intermitente añadió un 28 % y 34 %. El test de suspensión (finger hang) tuvo la correlación más alta con la capacidad (R ≈ 0,75) pero dependió sobre todo de la fuerza (65 % de su varianza en hombres, 80 % en mujeres). Normalizadas por masa corporal no hubo diferencias significativas entre sexos.',
    fuentes: [
      { autores: 'Berta, P., Michailov, M., Kaško, D., Gajdošík, J., Běhounek, M., Baláš, J.', anio: 2025, titulo: 'Validity and normative scores of finger flexor strength and endurance tests estimated from a large sample of female and male climbers', publicacion: 'Journal of Sports Sciences, 43(3), 245–255', doi: '10.1080/02640414.2024.2449316' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos de amplio rango (no desglosado por 6b/7a/7b+ en el resumen)', objetivo: 'deportiva' },
    limitaciones:
      'Transversal; las varianzas no son aditivas de forma simple y no implican causalidad. Leído solo el resumen: no se pudieron extraer las puntuaciones normativas numéricas por nivel ni el protocolo de cada test.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-004',
    bloque: 'rendimiento',
    afirmacion:
      "En 129 escaladores, con un test de fuerza crítica (CF) de dedos «todo o nada» de una sola sesión, la CF expresada como % de la masa corporal explicó el 61 % de la capacidad autoinformada en deportiva y el 26 % en bloque (ajustado por sexo). El impulso por encima de CF (W') por kg explicó 7 % en deportiva y 34 % en bloque; el modelo combinado, 66 % y 44 %.",
    fuentes: [
      { autores: 'Giles, D., Hartley, C., Maslen, H., Hadley, J., Taylor, N., Torr, O., Chidley, J., Randall, T., Fryer, S.', anio: 2021, titulo: 'An all-out test to determine finger flexor critical force in rock climbers', publicacion: 'International Journal of Sports Physiology and Performance, 16(7), 942–949', doi: '10.1123/ijspp.2020-0637' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'rango mixto, capacidad autoinformada', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Capacidad autoinformada, no ascensos medidos; el resumen no da el reparto por sexo ni la clasificación de nivel. Asociación transversal. Otro estudio (EV-RENDIM-010) cuestiona que la CF obtenida con la media de las 3 últimas contracciones indique el límite sostenible.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-005',
    bloque: 'rendimiento',
    afirmacion:
      'En 55 escaladoras experimentadas (avanzadas bajas, avanzadas altas y élite, por grado autoinformado), las de élite mostraron mayor potencia de tren superior (12,9–16,6 cm más en la prueba de salto con brazos) y fuerza de dedos (51,6–65,4 N más) que las avanzadas. La fuerza de dedos explicó el 45 % de la varianza de la capacidad en deportiva y el 53 % en bloque; la potencia de tren superior, 39 % y 60 %.',
    fuentes: [
      { autores: 'Giles, D., Barnes, K., Taylor, N., Chidley, C., Chidley, J., Mitchell, J., Torr, O., Gibson-Smith, E., España-Romero, V.', anio: 2021, titulo: 'Anthropometry and performance characteristics of recreational advanced to elite female rock climbers', publicacion: 'Journal of Sports Sciences, 39(1), 48–56', doi: '10.1080/02640414.2020.1804784' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'mujeres, avanzadas a élite', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Solo mujeres (n=55), grupos por grado autoinformado y diferencia de edad de ~9 años entre élite y avanzadas (confusión). Extrapolar a hombres o a escaladores de 6b no está justificado. La unidad exacta de la potencia de tren superior se dedujo de las diferencias en cm del resumen.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-006',
    bloque: 'rendimiento',
    afirmacion:
      'En 20 escaladores varones, los de élite (8b–8c, n=6) frente a avanzados (7c+–8a, n=14) tuvieron mayor fuerza relativa de dedos (test de canto de 2,5 cm), mayor tiempo de suspensión en cantos de 2,5 y 4 cm y más dominadas; solo el perímetro de gemelo (≈2,2 cm menor) difirió significativamente en lo somático. Peso, % graso e IMC más bajos en élite no alcanzaron significación; la fuerza absoluta o relativa de dominada con carga no difirió.',
    fuentes: [
      { autores: 'Ozimek, M., Rokowski, R., Draga, P., Ljakh, V., Ambroży, T., Krawczyk, M., Ręgwelski, T., Stanula, A., Görner, K., Jurczak, A., Mucha, D.', anio: 2017, titulo: 'The role of physique, strength and endurance in the achievements of elite climbers', publicacion: 'PLoS ONE, 12(8), e0182026', doi: '10.1371/journal.pone.0182026' },
    ],
    nivel: 'B',
    aplicaA: { nivel: '7c+–8c (muy por encima de 6b–7a)', objetivo: 'escalada de dificultad' },
    limitaciones:
      'Solo varones, n=20 con 6 de élite: preliminar, sin potencia para detectar diferencias somáticas (la ausencia de significación en % graso no demuestra ausencia de efecto). Niveles muy superiores al perfil objetivo.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-RENDIM-007',
    bloque: 'rendimiento',
    afirmacion:
      'En 31 escaladores recreativos (16 de bloque, IRCRA rojo-punto 17,9 ± 3,3; 15 de vía, 20,5 ± 3,5), los de bloque tuvieron mayor fuerza máxima en tracción isométrica (canto de 23 mm: 1249 vs 1079 N de pico), mayor tasa de desarrollo de fuerza (1537 vs 1057 N/s) y mayor velocidad de dominada dinámica (0,96 vs 0,76 m/s); la resistencia de flexores de dedos (test intermitente al 60 % de la fuerza máxima, 7 s/3 s) no difirió significativamente (83 vs 107 s, p=0,088).',
    fuentes: [
      { autores: 'Stien, N., Saeterbakken, A. H., Hermans, E., Vereide, V. A., Olsen, E., Andersen, V.', anio: 2019, titulo: 'Comparison of climbing-specific strength and endurance between lead and boulder climbers', publicacion: 'PLoS ONE, 14(9), e0222529', doi: '10.1371/journal.pone.0222529' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'recreativos, IRCRA ≈ 18–20', objetivo: 'deportiva frente a bloque' },
    limitaciones:
      'Transversal, 28 hombres y 3 mujeres, clasificados por disciplina principal autoinformada. Test de resistencia posiblemente demasiado corto; no se midió el nivel de bloque. Sirve como referencia de valores de tracción a 90° de codo en 23 mm, no de suspensión con peso corporal en 20 mm.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-RENDIM-008',
    bloque: 'rendimiento',
    afirmacion:
      'Una revisión sistemática (búsqueda hasta septiembre de 2018) concluyó que se asocian con el éxito en escalada bajo % graso, gran volumen de antebrazo, fuerza y resistencia de flexores y agarre, tiempos largos de suspensión de dedos y de brazos flexionados, y técnica eficiente; los autores señalan la fuerza y resistencia de mano y antebrazo como clave.',
    fuentes: [
      { autores: 'Saul, D., Steinmetz, G., Lehmann, W., Schilling, A. F.', anio: 2019, titulo: 'Determinants for success in climbing: A systematic review', publicacion: 'Journal of Exercise Science & Fitness, 17(3), 91–100', doi: '10.1016/j.jesf.2019.04.002' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escalada de nivel alto en general', objetivo: 'escalada (no separa deportiva y bloque)' },
    limitaciones:
      'Revisión sistemática sin metaanálisis; en el resumen leído no consta el número de estudios incluidos ni su calidad. Se apoya en estudios transversales pequeños. No cuantifica pesos relativos entre fuerza, resistencia y técnica.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-009',
    bloque: 'rendimiento',
    afirmacion:
      'En 44 varones (control, intermedios, avanzados y élite) con contracciones de agarre al 40 % de la CVM hasta el fallo, medidas con NIRS en una tabla de dedos, los escaladores de élite se desoxigenaron más el flexor profundo (FDP) y se recuperaron antes (menor tiempo a media recuperación, T½) que los controles y los intermedios, tanto con contracción sostenida como intermitente.',
    fuentes: [
      { autores: 'Fryer, S. M., Stoner, L., Dickson, T., Draper, S. B., McCluskey, M. J., Hughes, J., How, S. C., Draper, N.', anio: 2015, titulo: 'Oxygen recovery kinetics in the forearm flexors of multiple ability groups of rock climbers', publicacion: 'Journal of Strength and Conditioning Research, 29(6), 1633–1639', doi: '10.1519/JSC.0000000000000804' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'élite frente a intermedios y no escaladores; no incluye 6b–7a como grupo definido', objetivo: 'escalada' },
    limitaciones:
      'Solo hombres, n total 44 con grupos pequeños (tamaños por grupo no verificados). El resumen presenta T½ de unos 8 s (élite) frente a decenas de segundos en otros grupos, pero la asignación exacta de cada cifra a cada grupo no quedó clara; por eso solo se afirma la dirección del efecto. Transversal.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-010',
    bloque: 'rendimiento',
    afirmacion:
      'En 12 escaladores deportivos, la CF de flexores de dedos del test de 4 min «todo o nada» calculada con la media de las 3 últimas contracciones (20,1 ± 5,7 kg) no predijo de forma fiable la mayor intensidad sostenible: en CF el tiempo hasta el fallo fue 440 ± 140 s (solo 1 completó 720 s) y completaron 720 s el 38 %, 69 % y 92 % al reducir la carga 2, 4 y 6 kg. La CF con la fuerza final (16,8 ± 5,2 kg) se asoció mejor. La oxigenación muscular fue muy variable y poco sensible.',
    fuentes: [
      { autores: 'Baláš, J., Gajdošík, J., Javorský, T., Berta, P., Feldmann, A.', anio: 2024, titulo: 'Measuring critical force in sport climbers: a validation study of the 4 min all-out test on finger flexors', publicacion: 'European Journal of Applied Physiology, 124(9), 2787–2798', doi: '10.1007/s00421-024-05490-7' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos (nivel no verificado en el resumen)', objetivo: 'deportiva' },
    limitaciones:
      'n=12, estudio de laboratorio; nivel de los participantes no verificado. Matiza el uso de CF en EV-RENDIM-004 y desaconseja interpretar NIRS de antebrazo como indicador fino de estado metabólico.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-011',
    bloque: 'rendimiento',
    afirmacion:
      'En 13 boluderos, 10 escaladores de vía y 10 controles (varones), ambos grupos de escaladores tuvieron mayor índice de capacidad oxidativa NIRS en flexor profundo y extensor común y mayor integral fuerza-tiempo al 40 % CVM que los controles, sin diferencias entre disciplinas; los boluderos tuvieron mayor CVM (diferencia media 9,6 kg; IC95 % 5,2–14).',
    fuentes: [
      { autores: 'Fryer, S. M., Stone, K. J., Sveen, J., Dickson, T., España-Romero, V., Giles, D., Baláš, J., Stoner, L., Draper, N.', anio: 2017, titulo: 'Differences in forearm strength, endurance, and hemodynamic kinetics between male boulderers and lead rock climbers', publicacion: 'European Journal of Sport Science, 17(9), 1177–1183', doi: '10.1080/17461391.2017.1353135' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'no verificado en el resumen leído', objetivo: 'deportiva frente a bloque' },
    limitaciones:
      'Solo hombres, muestras muy pequeñas, transversal; nivel de grado de los grupos no verificado. Los autores sugieren entrenamiento aeróbico específico de antebrazo, pero el estudio no lo prueba.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RENDIM-012',
    bloque: 'rendimiento',
    afirmacion:
      'En 205 escaladores deportivos (136 hombres, 69 mujeres; mejor rojo-punto UIAA 4–11), un modelo de ecuaciones estructurales con una variable latente de fuerza y resistencia de mano-brazo (agarre, suspensión con brazos flexionados, suspensión de dedos), % graso, volumen y experiencia explicó el 97 % de la varianza del rendimiento; % graso y experiencia/volumen actuaban a través de esa variable latente.',
    fuentes: [
      { autores: 'Baláš, J., Pecha, O., Martin, A. J., Cochrane, D.', anio: 2012, titulo: 'Hand-arm strength and endurance as predictors of climbing performance', publicacion: 'European Journal of Sport Science, 12(1), 16–25', doi: '10.1080/17461391.2010.546431' },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'UIAA 4–11, rango muy amplio', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen reproducido por una base de datos bibliográfica (lida.sport-iat.de), no la editorial ni el texto; por eso se degrada a C. El 97 % es ajuste del modelo en su propia muestra, no precisión predictiva, y el rango de nivel es enorme.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
]
