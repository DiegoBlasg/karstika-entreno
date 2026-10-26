import type { Hallazgo } from './tipos'

const FECHA = '2026-10-26'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-TACTIC-001',
    bloque: 'tactica',
    afirmacion:
      'En 22 escaladores recreativos de bloque (20–50 años), tres calentamientos de unos 10 min (estiramiento dinámico con Thera-Band, rodillo vibratorio y calentamiento específico de escalada) mejoraron de forma inmediata la flexibilidad de hombro, la fuerza de flexores de codo y extensores de hombro y la estabilidad dinámica de miembro superior, sin diferencias entre ellos salvo ventajas puntuales (rodillo en flexibilidad; escalada específica en rotadores externos del hombro frente al dinámico). Ninguno cambió la fuerza de los flexores de dedos.',
    fuentes: [
      {
        autores: 'Han, H.-P., Yang, P.-S., Lee, C.-L., Chang, N.-J.',
        anio: 2025,
        titulo:
          'Comparing the Effectiveness of 10-Minute Dynamic Stretching, Vibration Rolling, and Climbing-Specific Warm-Ups on Exercise Performances in Rock Climbers',
        publicacion: 'Journal of Sports Science & Medicine, 24(1), 84–92',
        doi: '10.52082/jssm.2025.84',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11877290/',
      },
    ],
    nivel: 'A',
    aplicaA: {
      nivel: 'recreativo (nivel variable, no especificado como 6b)',
      experiencia: 'variable; los hombres con más años de práctica que las mujeres',
      objetivo: 'general (bloque; no mide encadenar en deportiva)',
    },
    limitaciones:
      'Cruzado aleatorizado y contrabalanceado, n = 22, lavado de 48 h. Solo efectos inmediatos; no se midió rendimiento escalando ni resistencia de dedos. Un solo valor de vibración (33 Hz); no se probaron combinaciones. El texto del artículo presenta una incoherencia con los tamaños de efecto en rotadores externos. No responde a cuánto ni a qué intensidad calentar para un proyecto en deportiva.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-002',
    bloque: 'tactica',
    afirmacion:
      'En 44 varones, tras contracciones de agarre al 40 % de la CVM en regleta hasta el fallo, la reoxigenación (NIRS) del flexor profundo de los dedos se recuperó mucho más rápido en escaladores de élite (tiempo a la mitad de recuperación ≈ 8 s) que en controles (≈ 95 s) e intermedios (≈ 47 s) tras contracción sostenida. Los autores sugieren que los escaladores de alto nivel aprovechen descansos en la vía para recuperarse.',
    fuentes: [
      {
        autores: 'Fryer, S. M., Stoner, L., Dickson, T., Draper, S. B., McCluskey, M. J., Hughes, J., How, S. C., Draper, N.',
        anio: 2015,
        titulo: 'Oxygen recovery kinetics in the forearm flexors of multiple ability groups of rock climbers',
        publicacion: 'Journal of Strength and Conditioning Research, 29(6), 1633–1639',
        doi: '10.1519/JSC.0000000000000804',
        url: 'https://eprints.glos.ac.uk/2467/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'control, intermedio, avanzado y élite (varones)', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen del repositorio institucional. Estudio transversal con 5 min de recuperación pasiva en laboratorio, no descanso entre intentos en roca; no estima cuántos minutos descansar entre pegues. Solo varones; n por grupo no consta en el resumen. El nivel «intermedio» no equivale a 6b.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-TACTIC-003',
    bloque: 'tactica',
    afirmacion:
      'En 22 escaladores, sacudir el antebrazo durante la recuperación entre contracciones intermitentes de flexores de dedos (60 % CVM) produjo un 22 % más de tiempo de test, un 28 % más de integral fuerza-tiempo y una reoxigenación muscular un 32 % más rápida que mantener la mano sobre la presa.',
    fuentes: [
      {
        autores: 'Baláš, J., Michailov, M., Giles, D., Kodejška, J., Panáčková, M., Fryer, S. M.',
        anio: 2016,
        titulo: 'Active recovery of the finger flexors enhances intermittent handgrip performance in rock climbers',
        publicacion: 'European Journal of Sport Science, 16(7), 264–272',
        doi: '10.1080/17461391.2015.1119198',
        url: 'https://eprints.glos.ac.uk/3089/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'mezcla de escaladores deportivos, boulderistas y de grado bajo', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen del repositorio. n = 22; test de laboratorio con regleta, no en vía; no se determinó la duración óptima del descanso. Extrapolar a descansos en la vía es una inferencia.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-TACTIC-004',
    bloque: 'tactica',
    afirmacion:
      'En 16 instructores varones avanzados (vía de 7a+/7b+ en gimnasio), el segundo intento (pegue, red-point) de la misma vía una semana después del a vista fue más rápido (148,7 vs 179,5 s), con menos paradas inapropiadas, menor FC pico (175 vs 186 lpm), menor lactato pico (5,06 vs 6,81 mmol/L), menor ansiedad cognitiva y somática previas y mayor autoconfianza previa.',
    fuentes: [
      {
        autores: 'Limonta, E., Fanchini, M., Rampichini, S., Cè, E., Longo, S., Coratella, G., Esposito, F.',
        anio: 2020,
        titulo: 'On-Sight and Red-Point Climbing: Changes in Performance and Route-Finding Ability in Male Advanced Climbers',
        publicacion: 'Frontiers in Psychology, 11, 902',
        doi: '10.3389/fpsyg.2020.00902',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7271724/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: '7a+/7b+ (por encima del objetivo 6b→7a)', experiencia: 'instructores con ≥ 4 años de coaching', objetivo: 'deportiva (indoor)' },
    limitaciones:
      'n = 16 varones, una sola vía en gimnasio. Orden fijo (a vista siempre primero), por lo que el efecto de práctica está confundido con la condición; no se puede separar la experiencia física de la vía de la lectura de ruta. Es un segundo intento, no un proyecto con muchos pegues. No generalizable a 6b.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-005',
    bloque: 'tactica',
    afirmacion:
      'En 29 escaladores varones (intermedios, avanzados, expertos) en vías de gimnasio, 3 min de inspección visual previa no cambiaron la probabilidad de completar la vía, pero redujeron el número y la duración de las paradas; la reducción de la duración de paradas apareció solo en los expertos.',
    fuentes: [
      {
        autores: 'Sanchez, X., Lambert, P., Jones, G., Llewellyn, D. J.',
        anio: 2012,
        titulo: 'Efficacy of pre-ascent climbing route visual inspection in indoor sport climbing',
        publicacion: 'Scandinavian Journal of Medicine & Science in Sports, 22, 67–72',
        url: 'https://coachsci.sdsu.edu:443/csa/vol185/sanchez1.htm',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'intermedio a experto (varones)', objetivo: 'deportiva (indoor)' },
    limitaciones:
      'Solo se leyó un resumen alojado en un sitio de terceros (sin DOI localizado). Solo varones, solo indoor, inspección fija de 3 min; no se evaluó la roca. El beneficio fue en la forma de moverse, no en el resultado.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-TACTIC-006',
    bloque: 'tactica',
    afirmacion:
      'En 18 escaladores (10 experimentados, 8 inexpertos) con hasta 3 min de previsualización de una vía de 5b en top-rope, el seguimiento ocular mostró cuatro perfiles de inspección; los dos de previsualización más corta (ambos de experimentados) se asociaron con una escalada más fluida (menor jerk), y más trayectos de mirada se correlacionaron con más movimiento exploratorio (r = 0,481).',
    fuentes: [
      {
        autores: 'Seifert, L., Cordier, R., Orth, D., Courtine, Y., Croft, J. L.',
        anio: 2017,
        titulo: 'Role of route previewing strategies on climbing fluency and exploratory movements',
        publicacion: 'PLoS ONE, 12(4), e0176306',
        doi: '10.1371/journal.pone.0176306',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5404847/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'vía 5b, por debajo del objetivo', objetivo: 'general (top-rope indoor)' },
    limitaciones:
      'Muestra pequeña con clústeres desbalanceados (uno con un solo escalador), una sola vía fácil, correlaciones (no causalidad). Umbrales de detección fijados por los investigadores. No prueba que una estrategia de previsualización mejore el encadenamiento en 7a.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-007',
    bloque: 'tactica',
    afirmacion:
      'Diez escaladores expertos varones (a vista 7a+ a 8b) con titulación de entrenador identificaron en entrevistas nueve parámetros de rendimiento en deportiva (pasar cruces, fuerza y acondicionamiento, interacción con el entorno, repertorio de movimientos, gestión del riesgo, gestión de la ruta, equilibrio mental, comunicación con compañeros y previsualización de la ruta); la previsualización fue considerada la más crítica.',
    fuentes: [
      {
        autores: 'Sanchez, X., Torregrossa, M., Woodman, T., Jones, G., Llewellyn, D. J.',
        anio: 2019,
        titulo: 'Identification of parameters that predict sport climbing performance',
        publicacion: 'Frontiers in Psychology, 10, 1294',
        doi: '10.3389/fpsyg.2019.01294',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6554989/',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: '7a+–8b a vista (expertos)', objetivo: 'deportiva' },
    limitaciones:
      'Estudio cualitativo de percepciones de expertos (n = 10, varones, Bélgica francófona); no mide rendimiento, por lo que «predicen» en el título es una hipótesis, no un resultado. Sin cuantificación de intentos ni descansos.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-008',
    bloque: 'tactica',
    afirmacion:
      'En 10 escaladores intermedios varones, una subida a vista en cabeza (vía 5b de 9,4 m) frente a una segunda subida tras ≥ 2 días produjo más ansiedad somática y cognitiva (CSAI-2R), mayor tiempo (≈ 32 s más) y más lactato post-escalada, sin diferencias significativas de VO2 ni FC media.',
    fuentes: [
      {
        autores: 'Draper, N., Jones, G. A., Fryer, S., Hodgson, C., Blackwell, G.',
        anio: 2008,
        titulo: 'Effect of an on-sight lead on the physiological and psychological responses to rock climbing',
        publicacion: 'Journal of Sports Science and Medicine, 7, 492–498',
        url: 'https://jssm.org/jssm-07-492.xml-Fulltext',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'intermedio, vía 5b', objetivo: 'deportiva (muro artificial exterior)' },
    limitaciones:
      'n = 10 varones, una vía, orden fijo (a vista siempre primero), tests unilaterales sin corrección por comparaciones múltiples. El vínculo ansiedad–lactato es una inferencia.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-009',
    bloque: 'tactica',
    afirmacion:
      'En 100 escaladores (19–65 años) de gimnasios polacos, la ansiedad estado (STAI) fue mayor en cabeza que en top-rope (40,1 ± 9,2 vs 33,1 ± 6,3; p < 0,0001); el 46 % tuvo ansiedad alta en cabeza frente al 9 % en top-rope. Las mujeres puntuaron más alto que los hombres en ansiedad estado y rasgo.',
    fuentes: [
      {
        autores: 'Swinarska, N., Krężel, P., Hapka, A., Jurczak, A., Wieder-Huszla, S.',
        anio: 2025,
        titulo: 'Anxiety levels and physiological responses during top-rope and lead climbing: a cross-sectional study among sport climbers',
        publicacion: 'BMC Sports Science, Medicine and Rehabilitation',
        doi: '10.1186/s13102-025-01493-9',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12859972/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'no especificado (muestra mixta)', objetivo: 'deportiva (indoor)' },
    limitaciones:
      'Transversal, muestreo de conveniencia, orden fijo (top-rope primero), cuestionario propio no validado, sin control de nivel, miedo a caer ni experiencia como confusores, sin corrección por comparaciones múltiples. No evalúa intervenciones ni rendimiento.',
    verificada: { fecha: FECHA, metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TACTIC-010',
    bloque: 'tactica',
    afirmacion:
      'Una revisión sistemática de 83 estudios (de 504 registros; búsqueda en julio de 2023) concluye que el flow, la confianza, la facilitación de la ansiedad y la percepción son clave en el rendimiento en escalada y que los escaladores más hábiles gestionan el riesgo con menos efectos psicofisiológicos, pero que los niveles óptimos y las formas de desarrollarlos siguen sin estar claros.',
    fuentes: [
      {
        autores: 'Mangan, K., Andrews, K., Miles, B., Draper, N.',
        anio: 2025,
        titulo: 'The psychology of rock climbing: A systematic review',
        publicacion: 'Psychology of Sport and Exercise, 76, 102763',
        doi: '10.1016/j.psychsport.2024.102763',
        url: 'https://pubmed.ncbi.nlm.nih.gov/39389518/',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'todos', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen (vía registro de PubMed). Revisión sistemática sin metaanálisis y mayoritariamente estudios observacionales; no establece intervenciones eficaces. Los propios autores señalan que los niveles óptimos son desconocidos.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-TACTIC-011',
    bloque: 'tactica',
    afirmacion:
      'En mujeres escaladoras con miedo a caer, un programa de entrenamiento psicológico basado en regulación emocional mejoró la capacidad de escalada (autoinformada) y redujo la ansiedad cognitiva y somática, con mayor aumento de autoconfianza que un grupo de entrenamiento físico; el grupo de entrenamiento solo redujo la ansiedad cognitiva. Un grupo control completó el diseño.',
    fuentes: [
      {
        autores: 'Garrido-Palomino, I., España-Romero, V.',
        anio: 2023,
        titulo: 'Fear of falling in women: A psychological training intervention improves climbing performance',
        publicacion: 'Journal of Sports Sciences, 41(16), 1518–1529',
        doi: '10.1080/02640414.2023.2281157',
        url: 'https://rodin.uca.es/handle/10498/33821?show=full',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'no consta', objetivo: 'general (mujeres con miedo a caer)' },
    limitaciones:
      'Solo se leyó el resumen de un repositorio institucional (el texto del editor devolvió 403). No consta n, duración, aleatorización ni seguimiento; la capacidad de escalada, la ansiedad y la conciencia interoceptiva son autoinformadas. Solo mujeres. No se puede clasificar como A sin confirmar la asignación aleatoria.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
  {
    id: 'EV-TACTIC-012',
    bloque: 'tactica',
    afirmacion:
      'En 33 escaladoras principiantes, cuatro sesiones de técnica más un programa guionizado de imaginería motivacional redujeron el estrés percibido y aumentaron la autoeficacia para la técnica correcta frente a un grupo control, con rendimiento de escalada similar en ambos grupos.',
    fuentes: [
      {
        autores: 'Jones, M. V., Mace, R. D., Bray, S. R., MacRae, A. W., Stockbridge, C.',
        anio: 2002,
        titulo: 'The impact of motivational imagery on the emotional state and self-efficacy levels of novice climbers',
        publicacion: 'Journal of Sport Behavior, 25, 57–73',
        url: 'https://coachsci.sdsu.edu/csa/vol92/jones.htm',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'principiante', experiencia: 'novatas', objetivo: 'general (técnica de escalada)' },
    limitaciones:
      'Solo se leyó un resumen alojado por un tercero (sin DOI). No consta cómo se asignó a los grupos. Solo mujeres principiantes; no hubo mejora del rendimiento. No sustenta que la imaginería mejore el encadenamiento en 6b–7a.',
    verificada: { fecha: FECHA, metodo: 'resumen' },
  },
]
