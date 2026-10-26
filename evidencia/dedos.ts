import type { Hallazgo } from './tipos'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-DEDOS-001',
    bloque: 'dedos',
    afirmacion:
      'En un metaanálisis de ensayos controlados (11 estudios, 225 escaladores; 4 estudios y 80 escaladores en el análisis de fuerza de dedos), el entrenamiento isométrico específico de flexores de los dedos mejoró la fuerza de dedos más que escalar solo (SDM 0,41; IC95% 0,03–0,80), además de la tasa de desarrollo de fuerza (SDM 0,91) y la resistencia de antebrazo/dead-hang (SDM 1,23). El rendimiento en grado escalado no se pudo agrupar y los resultados individuales fueron mixtos.',
    fuentes: [
      {
        autores: 'Stien, N., Riiser, A., Shaw, M. P., Saeterbakken, A. H., Andersen, V.',
        anio: 2023,
        titulo: 'Effects of climbing- and resistance-training on climbing-specific performance: a systematic review and meta-analysis',
        publicacion: 'Biology of Sport, 40(1), 179–191',
        doi: '10.5114/biolsport.2023.113295',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'mixto, de intermedio a élite', experiencia: 'no estratificada', objetivo: 'general (deportiva y bloque)' },
    limitaciones:
      'Intervenciones de 4–8 semanas; muestras pequeñas y mayoría de ensayos con poca potencia; PEDro 5–7 de 10 sin cegamiento de participantes ni evaluadores; ningún estudio solo con mujeres; solo artículos en inglés; con tan pocos estudios la heterogeneidad (I2 = 0%) no es fiable. No demuestra mejora del grado escalado ni informa de seguridad en principiantes.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-002',
    bloque: 'dedos',
    afirmacion:
      'En un ensayo aleatorizado con 23 boulderistas varones avanzados, 4 semanas de entrenamiento en fingerboard (n = 11) mejoraron significativamente la fuerza de agarre, a diferencia del grupo que solo hizo búlder (n = 12); la resistencia en suspensión intermitente subió unos 26 s de media solo en el grupo de fingerboard.',
    fuentes: [
      {
        autores: 'Medernach, J. P., Kleinöder, H., Lötzerich, H. H.',
        anio: 2015,
        titulo: 'Fingerboard in Competitive Bouldering: Training Effects on Grip Strength and Endurance',
        publicacion: 'Journal of Strength and Conditioning Research, 29(8), 2286–2295',
        doi: '10.1519/jsc.0000000000000873',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'boulderistas avanzados de competición', experiencia: 'avanzada', objetivo: 'bloque' },
    limitaciones:
      'Solo se leyó el resumen (vía registro bibliográfico), no el texto completo; el protocolo exacto (dosis, descanso) no se ha verificado aquí. Muestra pequeña, solo varones, 4 semanas. Revisiones posteriores señalan que ninguno de los tres ensayos con control de este tipo mostró superioridad clara frente a escalar en todas las pruebas de fuerza máxima. No aplicable sin más a escaladores con menos de 2 años de práctica.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-DEDOS-003',
    bloque: 'dedos',
    afirmacion:
      'En 14 boulderistas franceses de nivel nacional e internacional, 4 semanas de entrenamiento de agarre con suspensiones en presas pequeñas dos veces por semana aumentaron la fuerza máxima en slope-crimp en torno a un 8% y la tasa de desarrollo de fuerza en los primeros 200 ms entre un 27,5% y un 32% frente a un grupo que solo escaló; los autores lo atribuyen sobre todo a adaptación neural.',
    fuentes: [
      {
        autores: 'Levernier, G., Laffaye, G.',
        anio: 2019,
        titulo: 'Four Weeks of Finger Grip Training Increases the Rate of Force Development and the Maximal Force in Elite and Top World-Ranking Climbers',
        publicacion: 'Journal of Strength and Conditioning Research, 33(9), 2471–2480',
        doi: '10.1519/jsc.0000000000002230',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'élite y top mundial en búlder', experiencia: 'muy avanzada', objetivo: 'bloque' },
    limitaciones:
      'Solo se leyó el resumen (paráfrasis de un registro bibliográfico); no se verificaron aquí el protocolo detallado ni los tamaños por grupo. n = 14, solo varones, 4 semanas. La atribución a adaptación neural es interpretación de los autores, no medida directa. Muy lejos del perfil objetivo (6b, menos de 2 años).',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-DEDOS-004',
    bloque: 'dedos',
    afirmacion:
      'En 35 escaladores recreativos de nivel intermedio-avanzado (rojo mínimo 6a, unos 6–7 años de experiencia), 10 semanas de hangboard con repeaters (2 sesiones por semana; 2 bloques de 6 series de 7 repeticiones de 7 s colgado y 3 s de descanso, 2,5 min entre series) aumentaron la fuerza máxima isométrica en regleta de 23 mm (pico +89,7 N, aprox. +17%) frente al control (+20 N); la diferencia entre grupos en la duración del dead-hang no fue significativa.',
    fuentes: [
      {
        autores: 'Hermans, E., Saeterbakken, A. H., Vereide, V., Nord, I. S. O., Stien, N., Andersen, V.',
        anio: 2022,
        titulo: 'The Effects of 10 Weeks Hangboard Training on Climbing Specific Maximal Strength, Explosive Strength, and Finger Endurance',
        publicacion: 'Frontiers in Sports and Active Living, 4:888158',
        doi: '10.3389/fspor.2022.888158',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'IRCRA aprox. 15,5–17,5 (intermedio-avanzado)', experiencia: 'unos 6–7 años; inclusión: rojo mínimo 6a y sin lesión en 6 meses', objetivo: 'general' },
    limitaciones:
      'n = 35 con 8 abandonos; el grupo de hangboard hizo menos sesiones de escalada que el control (8,8 frente a 21,6), lo que puede confundir; sin prueba de rendimiento en roca o búlder, así que no demuestra mejora de grado; registros de entrenamiento autoinformados; el test de fuerza usó codos a 90 grados y el entrenamiento codos extendidos; el artículo no informa de lesiones. Participantes mucho más experimentados que el perfil objetivo.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-005',
    bloque: 'dedos',
    afirmacion:
      'En un ensayo aleatorizado de 4 semanas (2 sesiones por semana, regleta de 12 mm) con 54 escaladores avanzados o de élite, la fuerza máxima de dedos subió +14,3% con suspensiones máximas (100% de la fuerza máxima; 2 series de 6 suspensiones por mano), +12,4% con intermitentes al 80% (10 s colgado y 6 s descanso, hasta 12 repeticiones, 3 series) y +5,9% (no significativo) al 60%; solo el 80% mejoró a la vez fuerza máxima, stamina y resistencia. El control subió +0,7%.',
    fuentes: [
      {
        autores: 'Devise, M., Lechaptois, C., Berton, E., Vigouroux, L.',
        anio: 2022,
        titulo: 'Effects of Different Hangboard Training Intensities on Finger Grip Strength, Stamina, and Endurance',
        publicacion: 'Frontiers in Sports and Active Living, 4:862782',
        doi: '10.3389/fspor.2022.862782',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'avanzado o élite, sobre todo escalada en roca', experiencia: 'avanzada', objetivo: 'general' },
    limitaciones:
      'Solo 4 semanas; grupos de 12–14; mezcla de sexos y niveles; volumen de escalada externo no controlado; la intensidad se fijó en la primera sesión y no se reajustó; mecanismos no medidos; dos autores participan en el desarrollo del dispositivo SmartBoard (la empresa declara no haber intervenido). El grupo de 100% hizo menos volumen total de colgado. No probado en principiantes.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-006',
    bloque: 'dedos',
    afirmacion:
      'En 26 escaladores avanzados (7c+/8a de media, al menos 2 años de experiencia), 8 semanas de dead-hangs 2 veces por semana en semi-arqueado mejoraron la resistencia de agarre (tiempo hasta el fallo en 11 mm): +45% con colgados intermitentes (4–5 repeticiones de 10 s con 5 s de descanso, 3–5 series, 1 min entre series) y +34% con suspensiones máximas de 10 s con 3 min de descanso; la combinación mejoró solo un 7% (no significativo) y no hubo diferencias significativas entre grupos.',
    fuentes: [
      {
        autores: 'López-Rivera, E., González-Badillo, J. J.',
        anio: 2019,
        titulo: 'Comparison of the Effects of Three Hangboard Strength and Endurance Training Programs on Grip Endurance in Sport Climbers',
        publicacion: 'Journal of Human Kinetics, 66, 183–195',
        doi: '10.2478/hukin-2018-0057',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'avanzado 7c+/8a', experiencia: 'al menos 2 años; media de 10–14 años', objetivo: 'deportiva' },
    limitaciones:
      'Mide resistencia de agarre, no fuerza máxima. n final 26 de 38 (12 abandonos desiguales entre grupos); grupos de 7–11; sin diferencias significativas entre grupos; posible efecto techo en el grupo combinado; todos siguieron su entrenamiento normal de escalada. Ensayo aleatorizado (mismo estudio que EV-RESIST-003), por eso nivel A.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-007',
    bloque: 'dedos',
    afirmacion:
      'En un ensayo aleatorizado de 5 semanas con 31 boulderistas avanzados a élite, el entrenamiento dinámico de fuerza de dedos (3 sesiones por semana, 3–5 series de 4–10 RM) aumentó la fuerza isométrica de dedos (pico +5,5%) pero no mejoró el rendimiento en una prueba de búlder (+3,8% frente a -2,5% en control, sin diferencia entre grupos, p = 0,39). Los autores concluyen que mejorar solo la fuerza no parece suficiente para mejorar el búlder.',
    fuentes: [
      {
        autores: 'Saeterbakken, A. H., Bratland, E., Andersen, V., Stien, N.',
        anio: 2024,
        titulo: 'Five weeks of dynamic finger flexor strength training on bouldering performance and climbing-specific strength tests. A randomized controlled trial',
        publicacion: 'Frontiers in Physiology, 15:1461820',
        doi: '10.3389/fphys.2024.1461820',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'rojo mínimo 6B+, avanzado a élite', experiencia: 'avanzada', objetivo: 'bloque' },
    limitaciones:
      'n = 31 (solo 3 mujeres) y poca potencia estadística; 5 semanas, sin seguimiento posterior; la prueba de búlder usó problemas aleatorios con cruxes de coordinación que pueden limitar el papel de la fuerza; entrenamiento externo autoinformado; el propio artículo contiene inconsistencias estadísticas menores. Es un ejercicio dinámico, no un hangboard isométrico. Evidencia de que ganar fuerza no se traduce automáticamente en grado, no de que no sirva.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-008',
    bloque: 'dedos',
    afirmacion:
      'En 10 escaladores experimentados, la fuerza vertical máxima de los dedos (350,8–575,7 N) dependió significativamente de la profundidad de la presa (1 a 4 cm) y del tipo de agarre (slope, semi-arqueado, arqueado completo) y aumentó con presas más profundas, con un patrón distinto según el agarre.',
    fuentes: [
      {
        autores: 'Amca, A. M., Vigouroux, L., Aritan, S., Berton, E.',
        anio: 2012,
        titulo: 'Effect of hold depth and grip technique on maximal finger forces in rock climbing',
        publicacion: 'Journal of Sports Sciences, 30(7), 669–677',
        doi: '10.1080/02640414.2012.658845',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores experimentados', experiencia: 'experimentados', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen. n = 10, medición de fuerza máxima voluntaria puntual, no un estudio de entrenamiento: no compara cuál agarre es más eficaz para entrenar ni cuál es más seguro. La carga sobre poleas por agarre no se midió en este estudio, así que no permite concluir seguridad. Se aplican las mismas cautelas de EV-DEDOS-011 sobre el agarre arqueado.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-DEDOS-009',
    bloque: 'dedos',
    afirmacion:
      'En una ecografía de 20 escaladores competitivos adolescentes (10–17 años) frente a 6 controles, los escaladores tenían tendones flexores, placas volares y partes blandas significativamente más gruesos (adaptación fisiológica), pero también derrame articular en 13 de 19 (68%) y malalineación falángica en 10 de 19 (53%); con resonancia en 4 sintomáticos se hallaron una rotura capsular, una fractura por estrés y una lesión por estrés de la fisis.',
    fuentes: [
      {
        autores: 'Garcia, K., Jaramillo, D., Rubesova, E.',
        anio: 2018,
        titulo: 'Ultrasound evaluation of stress injuries and physiological adaptations in the fingers of adolescent competitive rock climbers',
        publicacion: 'Pediatric Radiology, 48(3)',
        doi: '10.1007/s00247-017-4033-4',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'adolescentes competitivos', experiencia: 'grupos por horas de entrenamiento y años', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen. Estudio transversal con 20 escaladores; el resumen da denominadores de 19 sin explicarlo; adolescentes con fisis abiertas, población distinta de adultos. Muestra que la carga intensa de los dedos produce adaptación pero también lesión por estrés, sin identificar cuánta carga es segura ni el papel concreto del hangboard.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-DEDOS-010',
    bloque: 'dedos',
    afirmacion:
      'En un seguimiento ecográfico a 10 años de 31 escaladores de alto nivel (100% de seguimiento), el grosor de las poleas A2/A4 y de los tendones flexores aumentó significativamente (p < 0,001) mientras que el de las placas palmares no cambió; tras 10 años todos los tejidos seguían más gruesos que en controles de la misma edad. Los autores lo interpretan como mecanoadaptación acumulada a la carga de la carrera.',
    fuentes: [
      {
        autores: 'Fröhlich, S., Schweizer, A., Reissner, L., Pastor, T., Spörri, J., Pastor, T.',
        anio: 2021,
        titulo: 'Long term evolution of soft tissue response in the fingers of high-level sport climbers: A cross-sectional 10 Year follow-up study',
        publicacion: 'Physical Therapy in Sport, 52, 173–179',
        doi: '10.1016/j.ptsp.2021.09.006',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'alto nivel', experiencia: 'décadas de carrera', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen (paráfrasis de un registro bibliográfico). n = 31, sin aleatorización, sin grupo de entrenamiento controlado. Demuestra que poleas y tendones se adaptan lentamente a lo largo de años de escalada; no mide la velocidad relativa de adaptación tendinosa frente a muscular, ni si el hangboard acelera o arriesga esa adaptación. Sustenta la prudencia para principiantes pero no fija un umbral.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-DEDOS-011',
    bloque: 'dedos',
    afirmacion:
      'Una revisión sistemática de 34 estudios (10.049 participantes) sobre lesiones por sobreuso en escaladores adultos encontró evidencia limitada (dos estudios, calidad 9/32 y 12/32) que vincula el agarre arqueado repetido con lesión de mano y dedo; los resultados sobre la experiencia de escalada son contradictorios (algunos estudios asocian más años con más lesión y cuatro no hallan asociación); y un estudio prospectivo de un año en boulderistas no halló mayor riesgo de lesión con el entrenamiento en fingerboard.',
    fuentes: [
      {
        autores: 'Quarmby, A., Zhang, M., Geisler, M., Javorsky, T., Mugele, H., Cassel, M., Lawley, J.',
        anio: 2023,
        titulo: 'Risk factors and injury prevention strategies for overuse injuries in adult climbers: a systematic review',
        publicacion: 'Frontiers in Sports and Active Living, 5',
        doi: '10.3389/fspor.2023.1269870',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'adultos, mixto', experiencia: 'contradictoria entre estudios', objetivo: 'general' },
    limitaciones:
      'Revisión sistemática sin metaanálisis de estudios en su mayoría observacionales (cerca del 65% transversales); calidad Downs-Black de 8 a 20 sobre 32 (media 14,4); definiciones de lesión heterogéneas; muestras sesgadas a varones; solo dos ensayos incluidos y sobre la misma cohorte. Se leyó el texto hasta los 100.000 primeros caracteres. No permite fijar un umbral de experiencia ni una carga segura para quien lleva menos de 2 años.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-012',
    bloque: 'dedos',
    afirmacion:
      'Una revisión sistemática de 15 estudios test-retest (747 participantes) concluye que las pruebas de fuerza isométrica máxima de dedos (MIFS) tienen fiabilidad alta (CCI mediano de 0,85 a 0,99 en el resumen; mediana global 0,86) y que los bordes fijos de unos 20–23 mm con agarre semi-arqueado estandarizado deben priorizarse para el seguimiento; recomienda dinamómetro o plataforma de fuerza antes que pesos añadidos y evaluar cada mano por separado.',
    fuentes: [
      {
        autores: 'Pérez-Cordero, J., Jerez-Mayorga, D., Rodríguez-Perea, Á., Soto García, D.',
        anio: 2025,
        titulo: 'Reliability of finger strength assessment methods in climbing: a systematic review',
        publicacion: 'Frontiers in Sports and Active Living, 7',
        doi: '10.3389/fspor.2025.1650198',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores de distintos niveles', experiencia: 'no especificada', objetivo: 'general' },
    limitaciones:
      'Calidad metodológica moderada (CAT 44–55%, QAREL 36–45%); heterogeneidad que impidió metaanálisis; el resumen y el cuerpo difieren en cuántos estudios muestran fiabilidad alta (14 frente a 12); los CCI más bajos (0,29–0,69) correspondieron a un estudio con NIRS; evidencia limitada en mujeres y jóvenes; la recomendación de 20–23 mm es conclusión de la revisión, no de una comparación directa de profundidades. Se leyó la primera parte del texto (100.000 caracteres).',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-013',
    bloque: 'dedos',
    afirmacion:
      'En un ensayo con 78 escaladores (52 asignados al azar a 4 semanas de hangboard, 2 sesiones por semana), el entrenamiento de flexores subió la fuerza de flexores un +8,4% y el alterno flexores-extensores un +11,9%; la fuerza de extensores solo subió con entrenamiento de extensores (+41,4%). La relación flexor/extensor media fue 6,27 y los autores indican que su relación con el riesgo de lesión es especulativa y no se evaluó.',
    fuentes: [
      {
        autores: 'Devise, M., Pasek, L., Goislard De Monsabert, B., Vigouroux, L.',
        anio: 2023,
        titulo: 'Finger flexion to extension ratio in healthy climbers: a proposal for evaluation and rebalance',
        publicacion: 'Frontiers in Sports and Active Living, 5:1243354',
        doi: '10.3389/fspor.2023.1243354',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'de intermedio a élite (IRCRA medio 20,3)', experiencia: 'al menos 2 años escalando 2 veces por semana', objetivo: 'general' },
    limitaciones:
      'Grupos de 10–11 (control 20) y 4 semanas; gran variabilidad interindividual; sin EMG; no se probó ningún efecto sobre lesiones; un autor asesora a la empresa que fabrica la regleta instrumentada. Sirve como dato sobre dosis y respuesta de 4 semanas y sobre el equilibrio flexor-extensor, no como prueba de prevención de lesiones.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-DEDOS-014',
    bloque: 'dedos',
    afirmacion:
      'Una encuesta transversal a escaladores finlandeses (n = 434) asoció el entrenamiento regular en fingerboard con menos molestias o lesiones de dedos en quienes llevaban 6 o más años escalando, y con más molestias o lesiones en el subgrupo de varones con menos de 6 años de experiencia que ya escalaban 7a o más; no hubo correlación significativa en el conjunto de la muestra. Los autores sugieren prudencia con la carga en los menos adaptados.',
    fuentes: [
      {
        autores: 'Sjöman, Grønhaug, Julin',
        anio: 2023,
        titulo: 'A Finger in the Game: Sport-Specific Finger Strength Training and Onset of Injury',
        publicacion: 'Trabajo académico (repositorios HVL Open y Theseus); no se ha localizado versión revisada por pares',
        url: 'https://www.theseus.fi/handle/10024/805309',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'comunidad de escalada finlandesa, mixto', experiencia: 'menos de 6 años frente a 6 años o más', objetivo: 'general' },
    limitaciones:
      'No se pudo abrir la fuente primaria (el repositorio devolvió 403 o no resolvió); los datos proceden de un resumen de buscador, por eso nivel C. Diseño transversal por autoinforme: no establece causalidad (las personas con dolor pueden entrenar menos o más), el subgrupo de menos experiencia es pequeño y muy específico, y no es una prueba de umbral de seguridad. No hay estudio primario aleatorizado en principiantes. Es la única pista localizada sobre el riesgo en menos experimentados.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
]
