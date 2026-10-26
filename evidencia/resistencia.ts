import type { Hallazgo } from './tipos'

const FECHA = '2026-10-26'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-RESIST-001',
    bloque: 'resistencia',
    afirmacion:
      'En 24 boulderistas varones muy avanzados (nivel aprox. 7b Fontainebleau), 4 semanas de bouldering por intervalos mejoraron el tiempo hasta el agotamiento en colgadas intermitentes (+27,3 ± 18,4 s) y en escalada (+36,2 ± 14,1 s), mientras que el bouldering convencional no produjo cambios significativos (+4,9 s y +6,1 s).',
    fuentes: [
      {
        autores: 'Medernach, J. P., Kleinöder, H., Lötzerich, H. H. H.',
        anio: 2015,
        titulo: 'Effect of interval bouldering on hanging and climbing time to exhaustion',
        publicacion: 'Sports Technology, 8(3-4), 76-82',
        doi: '10.1080/19346182.2015.1063643',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'boulderistas varones muy avanzados (~7b Font.)', experiencia: '6,8 ± 3,1 años escalando', objetivo: 'bloque (extrapolación a deportiva no probada)' },
    limitaciones:
      'Solo se leyó el resumen en una base bibliográfica (lida.sport-iat.de); la página de la editorial devolvió 403. El nivel A describe el diseño (ensayo aleatorizado, n=12 por grupo); la verificación fue solo con el resumen. El resumen NO da el protocolo (duración de trabajo/descanso, series, frecuencia), así que no sirve para fijar dosis. Solo varones, muy avanzados, 4 semanas; el desenlace es tiempo hasta el agotamiento subjetivo, no grado encadenado en vía. Verificar el texto completo antes de usarlo en el motor.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-002',
    bloque: 'resistencia',
    afirmacion:
      'En un metaanálisis de ensayos aleatorizados en escaladores activos (11 estudios en la revisión, 5 con grupo control en el metaanálisis), el entrenamiento de resistencia específico de escalada superó al de solo escalar en pruebas relacionadas con la escalada (SDM 0,57; IC95% 0,24-0,91), con la mayor mejora en resistencia de antebrazo (SDM 1,23; IC95% 0,69-1,77).',
    fuentes: [
      {
        autores: 'Stien, N., et al.',
        anio: 2023,
        titulo: 'Effects of climbing- and resistance-training on climbing-specific performance: a systematic review and meta-analysis',
        publicacion: 'Biology of Sport, 40(1), 179-191',
        doi: '10.5114/biolsport.2023.113295',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9806751',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'escaladores activos, nivel intermedio a élite', objetivo: 'general' },
    limitaciones:
      'Evidencia escasa: 225 escaladores en total, cuatro de los cinco estudios metaanalizados con poca potencia, PEDro 5-7/10 y sin cegamiento ni análisis por intención de tratar; no se reporta GRADE. El "entrenamiento de fuerza" analizado es sobre todo colgadas/hangboard de flexores, no formatos de resistencia en vía; la revisión no trata ARC ni escalada continua. El texto contiene inconsistencias internas menores (umbral de calidad, referencia duplicada). Se leyó vía PMC (texto abierto) y las cifras provienen de la página abierta.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-RESIST-003',
    bloque: 'resistencia',
    afirmacion:
      'En 26 escaladores avanzados (~7c+/8a), 8 semanas de colgadas intermitentes (4-5 repeticiones de 10 s con 5 s de descanso, 1 min entre series, 2 veces/semana, sumadas a su escalada) mejoraron la resistencia de agarre un 45% (ES 1,0) frente a 34% (ES 0,6) con colgadas máximas con lastre; no hubo diferencias significativas entre grupos.',
    fuentes: [
      {
        autores: 'López-Rivera, E., González-Badillo, J. J.',
        anio: 2019,
        titulo: 'Comparison of the Effects of Three Hangboard Strength and Endurance Training Programs on Grip Endurance in Sport Climbers',
        publicacion: 'Journal of Human Kinetics, 66, 183-195',
        doi: '10.2478/hukin-2018-0057',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6458579/',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'avanzado/élite (~7c+/8a), mucho por encima del perfil 6b', objetivo: 'deportiva' },
    limitaciones:
      'Ensayo aleatorizado con solo 26 analizados (de 38; abandonos mayores en los grupos intermitentes), 23 hombres y 3 mujeres; sin diferencias estadísticas entre grupos (poca potencia). La resistencia se midió como tiempo colgado en un canto de 11 mm, no como rendimiento en vía. El grupo mixto (4 semanas máximas + 4 intermitentes) solo mejoró un 7%. Escaladores mucho más fuertes que el perfil objetivo (6b).',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-RESIST-004',
    bloque: 'resistencia',
    afirmacion:
      'En 14 escaladores de nivel intermedio, 5 semanas (15 sesiones) priorizando escalada con cuerda (2 sesiones/semana de vía + 1 de bloque) mejoraron la resistencia intermitente de antebrazo (ES 0,55) y priorizando bloque mejoró la fuerza aislada de dedos (ES 0,35), sin diferencias significativas entre grupos y sin cambios en el rendimiento de escalada.',
    fuentes: [
      {
        autores: 'Stien, N., Frøysaker, T. F., Hermans, E., Vereide, V. A., Andersen, V., Saeterbakken, A. H.',
        anio: 2021,
        titulo: 'The Effects of Prioritizing Lead or Boulder Climbing Among Intermediate Climbers',
        publicacion: 'Frontiers in Sports and Active Living, 3, 661167',
        doi: '10.3389/fspor.2021.661167',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'intermedio', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Solo se leyó el resumen en la editorial (el PDF no se pudo decodificar): no se conocen intensidades ni descansos. n=14 en total, 5 semanas, las diferencias entre grupos no fueron significativas (P 0,062-0,710) y el rendimiento en escalada no cambió, por lo que es una señal débil, no una dosis. El P del resumen (0,007) difiere del de otras fuentes secundarias (0,014); se cita solo el ES.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-005',
    bloque: 'resistencia',
    afirmacion:
      'En 23 escaladores de élite, 8 semanas de entrenamiento específico de resistencia muscular o de hipertrofia mejoraron por igual el rendimiento en escalada a vista con cuerda (más movimientos y mayor grado), sin interacción grupo x tiempo; los autores recomiendan incluir ambos a partes iguales.',
    fuentes: [
      {
        autores: 'Philippe, M., Filzwieser, I., Leichtfried, V., Blank, C., Haslinger, S., Fleckenstein, J., Schobersberger, W.',
        anio: 2019,
        titulo: 'The effects of 8 weeks of two different training methods on on-sight lead climbing performance',
        publicacion: 'Journal of Sports Medicine and Physical Fitness, 59(4), 561-568',
        doi: '10.23736/S0022-4707.18.08399-8',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'élite (IRCRA 20,8 ± 2,0)', objetivo: 'deportiva (a vista)' },
    limitaciones:
      'Solo se leyó el resumen en una base bibliográfica (lida.sport-iat.de), no la editorial. El nivel B describe el diseño (comparación de dos programas en escaladores sin grupo control; el resumen no indica aleatorización). No hay grupo control y no se conocen ejercicios, series, cargas ni frecuencia. n=11 y 12. Población de élite, no extrapolable a 6b.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-006',
    bloque: 'resistencia',
    afirmacion:
      'La critical force (CF) de los flexores de los dedos puede estimarse con tres tests hasta el fallo de contracciones isométricas intermitentes al 45, 60 y 80% de la MVC: media 425,7 ± 82,8 N (41,0 ± 6,2% de la MVC), con buena concordancia entre protocolo de una sesión y de varias sesiones para CF (ICC 0,900) y peor para W\' (ICC 0,768).',
    fuentes: [
      {
        autores: 'Giles, D., Chidley, J., Taylor, N., Torr, O., Hadley, J., Randall, T., Fryer, S. M.',
        anio: 2019,
        titulo: 'The Determination of Finger Flexor Critical Force in Rock Climbers',
        publicacion: 'International Journal of Sports Physiology and Performance, 14(7), 972-979',
        doi: '10.1123/ijspp.2018-0809',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores de roca (nivel no desglosado en el resumen)', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen en el repositorio institucional (eprints.glos.ac.uk); el resumen no indica el tamaño de muestra. Estudio de fiabilidad/viabilidad del test, no de entrenamiento: no demuestra que entrenar a determinada fracción de CF mejore nada. Intervalo de confianza de ICC para CF amplio (0,616-0,979).',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-007',
    bloque: 'resistencia',
    afirmacion:
      'Con un test "todo o nada" de flexores de los dedos (ff-CF), la CF relativa a la masa corporal explicó el 61% de la varianza del rendimiento en deportiva y el 26% en bloque; W\' por kg explicó el 7% y el 34%, y combinados (ajustados por sexo) el 66% y el 44%.',
    fuentes: [
      {
        autores: 'Giles, D., Hartley, C., Maslen, H., Hadley, J., Taylor, N., Torr, O., Chidley, J., Randall, T., Fryer, S. M.',
        anio: 2021,
        titulo: 'An all-out test to determine finger flexor critical force in rock climbers',
        publicacion: 'International Journal of Sports Physiology and Performance, 16(7), 942-949',
        doi: '10.1123/ijspp.2020-0637',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores de roca (sin desglose verificado)', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Solo se leyó el resumen en el repositorio institucional; no se verificaron n, nivel de los participantes ni protocolo detallado (el PDF no se pudo leer). Correlacional y transversal: la capacidad de explicar el rendimiento no implica que entrenar la CF lo mejore. Es probable que el rendimiento fuera autoinformado (no verificado).',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-008',
    bloque: 'resistencia',
    afirmacion:
      'En 12 escaladores deportivos, la CF calculada como media de la fuerza de las últimas tres contracciones de un test de 4 min no predijo de forma fiable el máximo ritmo de trabajo sostenible: a esa CF el tiempo hasta el fallo fue 440 ± 140 s y solo 1 de 12 completó 720 s (frente a 38%, 69% y 92% al reducir la carga 2, 4 y 6 kg); definir la CF con la fuerza final mostró mejor relación.',
    fuentes: [
      {
        autores: 'Baláš, J., Gajdošík, J., Javorský, T., Berta, P., Feldmann, A.',
        anio: 2024,
        titulo: 'Measuring critical force in sport climbers: a validation study of the 4 min all-out test on finger flexors',
        publicacion: 'European Journal of Applied Physiology, 124(9), 2787-2798',
        doi: '10.1007/s00421-024-05490-7',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos (nivel no verificado)', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen en una base bibliográfica (lida.sport-iat.de); la editorial y el repositorio redirigieron sin dar texto. Nivel B por el diseño (estudio fisiológico de laboratorio en escaladores). n=12. Cuestiona la validez del test de CF de 4 min tal como se calcula habitualmente y contradice el tono optimista de Giles 2021: la CF no debe usarse todavía como umbral exacto de prescripción. La oxigenación muscular del antebrazo no distinguió ensayos exhaustivos de no exhaustivos.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-009',
    bloque: 'resistencia',
    afirmacion:
      'En 44 escaladores varones, los de élite recuperaron el oxígeno del antebrazo mucho más rápido tras contracciones al 40% de MVC (tiempo a la mitad de la recuperación del flexor profundo ~8 s en élite frente a 93 s en el grupo control y 83 s en el intermedio, en contracciones intermitentes), pese a desoxigenarse más; los autores recomiendan que los escaladores de menor nivel se centren en protocolos de fatiga intermitente específicos.',
    fuentes: [
      {
        autores: 'Fryer, S. M., Stoner, L., Dickson, T. G., Draper, S. B., McCluskey, M. J., Hughes, J. D., How, S. C., Draper, N.',
        anio: 2015,
        titulo: 'Oxygen Recovery Kinetics in the Forearm Flexors of Multiple Ability Groups of Rock Climbers',
        publicacion: 'Journal of Strength and Conditioning Research, 29(6), 1633-1639',
        doi: '10.1519/JSC.0000000000000804',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'control, intermedio, avanzado y élite (varones)', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen en el repositorio institucional; no se dieron n por grupo ni datos del grupo avanzado. Transversal: no demuestra que el entrenamiento intermitente acelere la reoxigenación, la recomendación es una inferencia de los autores. Solo varones, contracciones en fingerboard al 40% MVC, recuperación pasiva de 5 min.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-010',
    bloque: 'resistencia',
    afirmacion:
      'En 22 escaladores, durante un test intermitente de flexores al 60% de MVC hasta el fallo, sacudir el antebrazo al costado del cuerpo en las fases de recuperación (frente a mantener la mano sobre la presa) aumentó el tiempo de test un 22%, la integral fuerza-tiempo un 28% y la reoxigenación muscular un 32%; el cociente tiempo intermitente/continuo fue 2,02 en escaladores deportivos, 1,74 en boulderistas y 1,25 en escaladores de grado bajo.',
    fuentes: [
      {
        autores: 'Baláš, J., Michailov, M., Giles, D., Kodejška, J., Panáčková, M., Fryer, S. M.',
        anio: 2016,
        titulo: 'Active recovery of the finger flexors enhances intermittent handgrip performance in rock climbers',
        publicacion: 'European Journal of Sport Science, 16(7), 264-272',
        doi: '10.1080/17461391.2015.1119198',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos, boulderistas y de grado bajo', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen en el repositorio institucional. Test de laboratorio con fingerboard (no escalada real), n=22 repartidos en tres grupos. Los 22% / 28% / 32% son diferencias entre dos condiciones de recuperación en el mismo test, no un efecto de entrenamiento. El cociente por disciplina es transversal. Los resúmenes consultados citan páginas 264-272; el número de volumen/artículo puede variar entre bases.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-011',
    bloque: 'resistencia',
    afirmacion:
      'En 21 escaladores deportivos varones, el índice de capacidad oxidativa del antebrazo, la desoxigenación máxima y el VO2pico en treadwall predijeron significativamente la capacidad de encadenado autoinformada (juntos, 67% de la varianza), mientras que el VO2max en cinta de correr no; los autores sugieren entrenar la capacidad aeróbica local del antebrazo y la general con aparatos específicos.',
    fuentes: [
      {
        autores: 'Fryer, S. M., Giles, D., Garrido, I., de la O Puerta, A., España-Romero, V.',
        anio: 2018,
        titulo: 'Hemodynamic and Cardiorespiratory Predictors of Sport Rock Climbing Performance',
        publicacion: 'Journal of Strength and Conditioning Research, 32(12), 3534-3541',
        doi: '10.1519/JSC.0000000000001860',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos varones (nivel no desglosado)', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen en el repositorio institucional, y sus valores de R2 ajustado son internamente inconsistentes (negativos para predictores "significativos", errata en el del VO2max en cinta): no citar los R2 individuales, solo el 67% combinado y la dirección. n=21, solo varones, rendimiento autoinformado, transversal; no es un ensayo de entrenamiento y no sirve para fijar dosis de ARC.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-RESIST-012',
    bloque: 'resistencia',
    afirmacion:
      'Tras una sesión de alta intensidad (cuatro tareas de escalada de 5 min hasta el agotamiento) en 21 escaladores de alto nivel, la fuerza de los flexores cayó un 18% (MVC), 55% (contracción sostenida) y 59% (contracciones intermitentes); a las 24 h la recuperación fue amplia, pero menor en las pruebas de resistencia que en la fuerza máxima.',
    fuentes: [
      {
        autores: 'Feldmann, A., Lehmann, R., Wittmann, F., Wolf, P., Baláš, J., Erlacher, D.',
        anio: 2022,
        titulo: 'Acute Effect of High-Intensity Climbing on Performance and Muscle Oxygenation in Elite Climbers',
        publicacion: 'Journal of Science in Sport and Exercise, 4(2), 145-155',
        doi: '10.1007/s42978-021-00139-9',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores de élite (desglose no disponible)', objetivo: 'deportiva' },
    limitaciones:
      'Se leyó el resumen en la página de la revista; no se citan las cifras de recuperación a 24 h porque solo aparecieron en un resumen del buscador, no en la página abierta. 21 escaladores en la intervención y 8 controles, un único protocolo agudo, sin seguimiento de entrenamiento. Informa de tiempos de readiness, no de la reoxigenación entre intervalos.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
]
