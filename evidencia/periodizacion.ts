import type { Hallazgo } from './tipos'

// Verificación: cada hallazgo se contrastó con el resumen oficial del artículo (registro Europe PMC / editorial)
// el 2026-10-26. No se leyó el texto completo salvo indicación contraria en `limitaciones`.
export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-PERIOD-001',
    bloque: 'periodizacion',
    afirmacion:
      'En un metaanálisis de 18 estudios (81 tamaños de efecto) de entrenamiento de fuerza, los programas periodizados dieron mayores ganancias de 1RM que los no periodizados (ES = 0,43; IC95% 0,27–0,58), con ventaja para los modelos ondulantes sobre los lineales según el moderador "modelo de periodización". Las ganancias fueron mayores en personas no entrenadas.',
    fuentes: [
      {
        autores: 'Williams, T.D., Tolusso, D.V., Fedewa, M.V., Esco, M.R.',
        anio: 2017,
        titulo: 'Comparison of Periodized and Non-Periodized Resistance Training on Maximal Strength: A Meta-Analysis',
        publicacion: 'Sports Medicine, 47(10), 2083-2100',
        doi: '10.1007/s40279-017-0734-y',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'No específico de escalada (extrapolación desde entrenamiento de fuerza general)',
      experiencia: 'Mezcla de personas entrenadas y no entrenadas; mayor efecto en no entrenadas',
      objetivo: 'fuerza máxima (1RM en ejercicios de pesas), no rendimiento en deportiva',
    },
    limitaciones:
      'Ningún estudio incluido es en escaladores: es extrapolación desde fuerza general (1RM en ejercicios convencionales). Resultado discutido en una carta de Nunes et al. (Sports Med 2018, doi 10.1007/s40279-017-0824-x) cuyo contenido no se leyó. Estudios de 1988–2015, calidad y duración heterogéneas. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-002',
    bloque: 'periodizacion',
    afirmacion:
      'En un metaanálisis de entrenamiento de resistencia en atletas entrenados a muy entrenados (20 estudios incluidos, 6 agrupados), la periodización por bloques mostró efectos pequeños a favor frente a la periodización tradicional en VO2max (DME 0,40; IC95% 0,02–0,79) y Wmax (DME 0,28; IC95% 0,01–0,54).',
    fuentes: [
      {
        autores: 'Mølmen, K.S., Øfsteng, S.J., Rønnestad, B.R.',
        anio: 2019,
        titulo: 'Block periodization of endurance training: a systematic review and meta-analysis',
        publicacion: 'Open Access Journal of Sports Medicine, 10, 145-160',
        doi: '10.2147/OAJSM.S180408',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'No específico de escalada (ciclismo, remo, esquí de fondo, etc.)',
      experiencia: 'Atletas entrenados a muy entrenados; no principiantes',
      objetivo: 'resistencia aeróbica (VO2max, potencia máxima)',
    },
    limitaciones:
      'Extrapolación desde deportes cíclicos de resistencia; no hay estudios en escalada. Estudios pequeños y de baja calidad metodológica (PEDro medio 3,7/10); los autores piden cautela. Los intervalos de confianza rozan el cero. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-003',
    bloque: 'periodizacion',
    afirmacion:
      'En un ensayo de 12 semanas con 30 ciclistas entrenados (bloques n = 14; tradicional n = 16), la periodización por bloques y la tradicional "mejor práctica" no difirieron en el rendimiento (potencia en contrarreloj de 5 y 40 min, Wmax); sí hubo diferencias en adaptaciones hematológicas y capilares.',
    fuentes: [
      {
        autores: 'Almquist, N.W., Eriksen, H.B., Wilhelmsen, M., Hamarsland, H., Ing, S., Ellefsen, S., Sandbakk, Ø., Rønnestad, B.R., Skovereng, K.',
        anio: 2022,
        titulo: 'No Differences Between 12 Weeks of Block- vs. Traditional-Periodized Training in Performance Adaptations in Trained Cyclists',
        publicacion: 'Frontiers in Physiology, 13',
        doi: '10.3389/fphys.2022.837634',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'No específico de escalada (ciclistas, VO2peak 58 ± 8 ml/kg/min)',
      experiencia: 'Ciclistas entrenados',
      objetivo: 'resistencia aeróbica',
    },
    limitaciones:
      'Un solo ensayo en ciclismo, n = 30, 12 semanas; no generalizable a escalada ni a principiantes. Contrasta con la ligera ventaja de bloques del metaanálisis EV-PERIOD-002, lo que sugiere que esa ventaja puede deberse a diferencias de carga entre programas. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-004',
    bloque: 'periodizacion',
    afirmacion:
      'En un metaanálisis de ensayos aleatorizados (4 estudios cualitativos, 3 agrupados) en atletas de resistencia, el entrenamiento polarizado dio un efecto moderado a favor frente al umbral en rendimiento en contrarreloj (ES = -0,66; IC95% -1,17 a -0,15).',
    fuentes: [
      {
        autores: 'Rosenblat, M.A., Perrotta, A.S., Vicenzino, B.',
        anio: 2019,
        titulo: 'Polarized vs. Threshold Training Intensity Distribution on Endurance Sport Performance: A Systematic Review and Meta-Analysis of Randomized Controlled Trials',
        publicacion: 'Journal of Strength and Conditioning Research, 33(12), 3491-3500',
        doi: '10.1519/JSC.0000000000002618',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'No específico de escalada (corredores, ciclistas, esquiadores de fondo)',
      experiencia: 'Atletas de resistencia entrenados',
      objetivo: 'resistencia aeróbica general; no aplica directamente a resistencia de antebrazo ni a deportiva',
    },
    limitaciones:
      'Solo 3 estudios agrupados, calidad PEDro 4–5/10; búsqueda de 2016. No hay estudios de distribución de intensidad en escaladores localizados. La revisión de Stöggl y Sperlich (2015, doi 10.3389/fphys.2015.00295) indica que en la práctica de atletas de élite predomina la distribución piramidal. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-005',
    bloque: 'periodizacion',
    afirmacion:
      'En 42 escaladores deportivos (14 de grado bajo, 14 intermedios, 14 avanzados) que subieron la misma vía de 19,5 m en tapiz rodante y en pared a altura, la percepción de esfuerzo (Borg 6–20) solo se relacionó bien con la demanda fisiológica en los avanzados; en los de menor nivel el RPE puede sobreestimar la intensidad real y debe interpretarse con cautela.',
    fuentes: [
      {
        autores: 'Gajdošík, J., Baláš, J., Draper, N.',
        anio: 2020,
        titulo: 'Effect of Height on Perceived Exertion and Physiological Responses for Climbers of Differing Ability Levels',
        publicacion: 'Frontiers in Psychology, 11, 997',
        doi: '10.3389/fpsyg.2020.00997',
      },
    ],
    nivel: 'B',
    aplicaA: {
      nivel: 'Tres grupos por nivel IRCRA; relevante el grupo intermedio/inferior (6b)',
      experiencia: 'Escaladores deportivos de distinto nivel',
      objetivo: 'cuantificación de carga con RPE en escalada',
    },
    limitaciones:
      'Mide RPE de una vía única de 19,5 m a 4 m/min (no RPE de sesión x duración), una sola vía. En general la relación RPE–fisiología fue moderada. Estudio transversal, n = 42. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-006',
    bloque: 'periodizacion',
    afirmacion:
      'El método de RPE de sesión (RPE x duración) se validó frente a la frecuencia cardiaca en ciclismo y baloncesto (Foster 2001), y una revisión de 36 estudios con la escala CR-10 modificada concluye buena validez y fiabilidad en varios deportes, sexos, edades y niveles; puede usarse solo para monitorizar la carga, aunque algunos autores recomiendan combinarlo con frecuencia cardiaca.',
    fuentes: [
      {
        autores: 'Foster, C., Florhaug, J.A., Franklin, J., Gottschall, L., Hrovatin, L.A., Parker, S., Doleshal, P., Dodge, C.',
        anio: 2001,
        titulo: 'A new approach to monitoring exercise training',
        publicacion: 'Journal of Strength and Conditioning Research, 15(1), 109-115',
        doi: '10.1519/1533-4287(2001)015<0109:ANATME>2.0.CO;2',
      },
      {
        autores: 'Haddad, M., Stylianides, G., Djaoui, L., Dellal, A., Chamari, K.',
        anio: 2017,
        titulo: 'Session-RPE Method for Training Load Monitoring: Validity, Ecological Usefulness, and Influencing Factors',
        publicacion: 'Frontiers in Neuroscience, 11, 612',
        doi: '10.3389/fnins.2017.00612',
      },
    ],
    nivel: 'B',
    aplicaA: {
      nivel: 'No validado específicamente en escalada (ver EV-PERIOD-005)',
      experiencia: 'Distintos niveles de experiencia en otros deportes',
      objetivo: 'cuantificar carga interna de sesión',
    },
    limitaciones:
      'Ningún estudio de validación citado es en escalada; extrapolación desde ciclismo, baloncesto y otros deportes. Haddad es revisión narrativa (búsqueda 2001–2016, 36 estudios de validez), no metaanálisis, de ahí el nivel B (evidencia observacional/de validación). No se localizó validación de TRIMP ni de tonelaje en multipresa en escaladores. Solo se leyeron los resúmenes.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-007',
    bloque: 'periodizacion',
    afirmacion:
      'Un consenso Delphi de 3 rondas con 34 entrenadores (21 completaron la última) define el deload como "un periodo de estrés de entrenamiento reducido diseñado para mitigar la fatiga fisiológica y psicológica", y lo plantea como una estrategia muy extendida pero poco investigada en deportes de fuerza y físicos.',
    fuentes: [
      {
        autores: 'Bell, L., Strafford, B.W., Coleman, M., Androulakis Korakakis, P., Nolan, D.',
        anio: 2023,
        titulo: 'Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach',
        publicacion: 'Sports Medicine - Open, 9, 87',
        doi: '10.1186/s40798-023-00633-0',
      },
    ],
    nivel: 'C',
    aplicaA: {
      nivel: 'No específico de escalada (halterofilia, powerlifting, culturismo)',
      experiencia: 'Entrenadores de atletas de fuerza y físico',
      objetivo: 'planificación de deloads',
    },
    limitaciones:
      'Consenso de opinión de entrenadores, no evidencia de eficacia. No hay ensayos que comparen deload con no deload localizados. Los detalles de los principios de diseño (frecuencia, magnitud) no se extrajeron del resumen. Nada específico de escalada.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-008',
    bloque: 'periodizacion',
    afirmacion:
      'En una encuesta a 246 atletas competitivos de fuerza y físico (8,2 ± 6,2 años de entrenamiento), todos hacían deload: duración típica 6,4 ± 1,7 días, cada 5,6 ± 2,3 semanas; reducían volumen (menos series y repeticiones) y carga, mantenían la frecuencia de sesiones y deloaban sobre todo por gestión de fatiga, estancamiento del rendimiento o aumento de dolor muscular/articular.',
    fuentes: [
      {
        autores: 'Rogerson, D., Nolan, D., Androulakis Korakakis, P., Immonen, V., Wolf, M., Bell, L.',
        anio: 2024,
        titulo: 'Deloading Practices in Strength and Physique Sports: A Cross-sectional Survey',
        publicacion: 'Sports Medicine - Open, 10, 26',
        doi: '10.1186/s40798-024-00691-y',
      },
    ],
    nivel: 'C',
    aplicaA: {
      nivel: 'No específico de escalada',
      experiencia: 'Atletas competitivos de fuerza/físico con varios años de experiencia',
      objetivo: 'descripción de la práctica de deload',
    },
    limitaciones:
      'Describe lo que hacen los atletas, no lo que funciona; encuesta autorreportada y anónima, sesgo de selección. Sin comparación con no deload. Población muy distinta de un escalador de 6b con < 2 años de experiencia. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-009',
    bloque: 'periodizacion',
    afirmacion:
      'El consenso conjunto ECSS/ACSM sobre sobreentrenamiento establece que el sobrealcance funcional (caída de rendimiento a corto plazo que se recupera con descanso) puede mejorar el rendimiento, que el sobrealcance no funcional y el síndrome de sobreentrenamiento son difíciles de distinguir y se diagnostican por exclusión, y que ningún marcador hormonal, de rendimiento, psicológico, bioquímico o inmune cumple todos los criterios para aceptación general.',
    fuentes: [
      {
        autores: 'Meeusen, R., Duclos, M., Foster, C., Fry, A., Gleeson, M., Nieman, D., Raglin, J., Rietjens, G., Steinacker, J., Urhausen, A.',
        anio: 2013,
        titulo: 'Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the European College of Sport Science and the American College of Sports Medicine',
        publicacion: 'Medicine & Science in Sports & Exercise, 45(1), 186-205',
        doi: '10.1249/MSS.0b013e318279a10a',
      },
    ],
    nivel: 'C',
    aplicaA: {
      nivel: 'General (deportes de resistencia y fuerza); no específico de escalada',
      experiencia: 'Atletas en general',
      objetivo: 'detección de sobrecarga',
    },
    limitaciones:
      'Consenso de expertos; no hay señales de sobrecarga validadas en escaladores. Aquí se reflejan solo las conclusiones del resumen; los detalles de síntomas y marcadores del texto completo no se leyeron. La utilidad práctica para un escalador recreativo (qué señales vigilar) debe tratarse como no resuelta.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-010',
    bloque: 'periodizacion',
    afirmacion:
      'En un metaanálisis de 22 estudios sobre frecuencia de entrenamiento de fuerza, el efecto de la frecuencia sobre la ganancia de fuerza desaparece cuando el volumen está igualado: la ventaja aparente de entrenar con más frecuencia parece deberse al mayor volumen.',
    fuentes: [
      {
        autores: 'Grgic, J., Schoenfeld, B.J., Davies, T.B., Lazinica, B., Krieger, J.W., Pedisic, Z.',
        anio: 2018,
        titulo: 'Effect of Resistance Training Frequency on Gains in Muscular Strength: A Systematic Review and Meta-Analysis',
        publicacion: 'Sports Medicine, 48(5), 1207-1220',
        doi: '10.1007/s40279-018-0872-x',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'No específico de escalada (ejercicios de pesas)',
      experiencia: 'Mayoría de participantes no entrenados',
      objetivo: 'fuerza (frecuencia por grupo muscular)',
    },
    limitaciones:
      'Extrapolación desde entrenamiento de fuerza general; la mayoría de estudios en no entrenados. El resumen (que se leyó vía resumen de registro bibliográfico) no da el número mínimo de sesiones por semana, así que no sostiene una frecuencia mínima eficaz concreta para escalada. No cubre resistencia.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-011',
    bloque: 'periodizacion',
    afirmacion:
      'En un ensayo aleatorizado con 35 escaladores de nivel intermedio a avanzado (8 mujeres, 27 hombres), 10 semanas de entrenamiento en fingerboard con 2 sesiones por semana de 48 min, añadidas a su escalada habitual, mejoraron la fuerza máxima de dedos (aprox. +17% fuerza pico y +18% fuerza media en regleta de 23 mm) frente a un control sin cambios.',
    fuentes: [
      {
        autores: 'Hermans, E., Saeterbakken, A.H., Vereide, V., Nord, I.S.O., Stien, N., Andersen, V.',
        anio: 2022,
        titulo: 'The Effects of 10 Weeks Hangboard Training on Climbing Specific Maximal Strength, Explosive Strength, and Finger Endurance',
        publicacion: 'Frontiers in Sports and Active Living, 4, 888158',
        doi: '10.3389/fspor.2022.888158',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'Intermedio a avanzado (probablemente por encima de 6b de media; grado exacto no verificado en el resumen)',
      experiencia: 'Escaladores con práctica regular',
      objetivo: 'fuerza máxima de dedos',
    },
    limitaciones:
      'Solo se evaluó una frecuencia (2 sesiones/semana): no compara frecuencias ni da el descanso mínimo entre sesiones. n = 35, 10 semanas. No informa de lesiones en el resumen. Participantes más avanzados que el perfil objetivo. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-012',
    bloque: 'periodizacion',
    afirmacion:
      'Una revisión narrativa de entrenamiento de resistencia en escaladores concluye que un entrenamiento estructurado de bajo volumen y alta resistencia es viable, en concreto "dos veces por semana colgado de regletas pequeñas o un fingerboard", y que el fingerboard y el campus deben limitarse en escaladores de grado bajo por la alta carga mecánica sobre los flexores de los dedos.',
    fuentes: [
      {
        autores: 'Saeterbakken, A.H., Stien, N., Pedersen, H., Langer, K., Scott, S., Michailov, M.L., Gronhaug, G., Baláš, J., Solstad, T.E.J., Andersen, V.',
        anio: 2024,
        titulo: 'The Connection Between Resistance Training, Climbing Performance, and Injury Prevention',
        publicacion: 'Sports Medicine - Open, 10',
        doi: '10.1186/s40798-024-00677-w',
      },
    ],
    nivel: 'C',
    aplicaA: {
      nivel: 'Escaladores en general; cautela explícita para grados bajos',
      experiencia: 'No especificada en el resumen',
      objetivo: 'fuerza de dedos y prevención de lesiones',
    },
    limitaciones:
      'Revisión narrativa: recomendaciones de expertos basadas en la literatura, no una estimación de dosis-respuesta. Resumen sin datos numéricos. Los límites concretos de "grado bajo" no se leyeron. Un escalador de 6b con < 2 años podría caer en la categoría de cautela.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-013',
    bloque: 'periodizacion',
    afirmacion:
      'Tras un campeonato nacional de búsqueda (bloque) en escaladores de élite, la fuerza isométrica de agarre cayó 6,38 ± 1,32% a las 12 h y volvió a la línea base a las 24 h; el dolor de antebrazo volvió a basal a las 24 h, el cansancio a las 48 h y la "disposición para escalar" solo a las 60 h. Los autores concluyen que pueden hacer falta hasta 60 h para recuperarse completamente entre competiciones.',
    fuentes: [
      {
        autores: 'Gáspari, A.F., Zaminiani, M.G., Vilarinho, M.C., Caruso, D., Guimarães, P.D.S., Piunti, R.P., Itaborahy, A., de Moraes, A.C.',
        anio: 2024,
        titulo: 'Recovery markers in elite climbers after the national boulder climbing championship',
        publicacion: 'Frontiers in Sports and Active Living, 6',
        doi: '10.3389/fspor.2024.1251047',
      },
    ],
    nivel: 'B',
    aplicaA: {
      nivel: 'Élite (campeonato nacional de bloque), muy por encima de 6b',
      experiencia: 'Escaladores de élite',
      objetivo: 'recuperación tras esfuerzo competitivo de bloque',
    },
    limitaciones:
      'Informe breve; el resumen no indica el tamaño de muestra. Carga de competición (varias subidas máximas), no una sesión de entrenamiento de dedos; mide fuerza de agarre global, no integridad de poleas ni tendones. Estudio observacional sin grupo de comparación. Es evidencia indirecta para el descanso entre sesiones intensas de dedos y no basta para fijar un mínimo en horas para un escalador de 6b. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-PERIOD-014',
    bloque: 'periodizacion',
    afirmacion:
      'Una revisión sistemática de 34 estudios sobre lesiones por sobreuso en escaladores adultos encontró que la mayor intensidad de escalada, el bloque, la menor fuerza de dedos/agarre, el agarre en regleta y la lesión previa se asociaron a mayor riesgo, mientras que la evidencia sobre el volumen de entrenamiento fue contradictoria; una intervención de fuerza redujo lesiones de hombro y codo.',
    fuentes: [
      {
        autores: 'Quarmby, A., Zhang, M., Geisler, M., Javorsky, T., Mugele, H., Cassel, M., Lawley, J.',
        anio: 2023,
        titulo: 'Risk factors and injury prevention strategies for overuse injuries in adult climbers: a systematic review',
        publicacion: 'Frontiers in Sports and Active Living, 5, 1269870',
        doi: '10.3389/fspor.2023.1269870',
      },
    ],
    nivel: 'B',
    aplicaA: {
      nivel: 'Escaladores adultos de niveles diversos',
      experiencia: 'Variada',
      objetivo: 'gestión de carga y prevención de lesiones',
    },
    limitaciones:
      'Revisión de estudios mayoritariamente observacionales: asociación, no causalidad. El resumen no da umbrales de carga, frecuencia ni descanso, de modo que no permite fijar parámetros de carga semanal ni de descanso. Solo se leyó el resumen.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
]
