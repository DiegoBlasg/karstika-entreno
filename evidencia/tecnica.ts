import type { Hallazgo } from './tipos'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-TECNIC-001',
    bloque: 'tecnica',
    afirmacion:
      'Una revisión sistemática de 42 estudios concluye que la coordinación hábil en escalada se asocia a mejor percepción de las oportunidades de escalada (affordances), a rasgos espaciotemporales optimizados (coordinación cuerpo-pared, trayectoria, contacto mano-presa) y a poco comportamiento exploratorio; la mejora con la práctica depende de la novedad de la tarea y de la dificultad de la vía respecto a la capacidad del escalador.',
    fuentes: [
      { autores: 'Orth, D., Davids, K., & Seifert, L.', anio: 2016, titulo: 'Coordination in climbing: effect of skill, practice and constraints manipulation', publicacion: 'Sports Medicine, 46(2), 255-268', doi: '10.1007/s40279-015-0417-5' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'estudios desde principiante hasta élite', objetivo: 'deportiva' },
    limitaciones:
      'Revisión cualitativa (sin metaanálisis) de estudios observacionales y experimentales pequeños; búsqueda en 2014. Los propios autores señalan incertidumbre sobre el efecto de distintas intervenciones de práctica en aprendizaje y transferencia, por lo que no da recomendaciones de dosis. Solo se leyó el resumen (repositorio institucional); el año 2016 es el de la edición impresa (online 2015).',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-TECNIC-002',
    bloque: 'tecnica',
    afirmacion:
      'En una revisión de 21 estudios, mayor nivel de habilidad se asocia a progresión espacialmente más eficiente (menor entropía geométrica, GIE) y a menor inmovilidad; las vías más duras exigen más movilidad y complejidad de movimiento. La inmovilidad no siempre indica mala técnica (los expertos pueden descansar activamente, p. ej. sacudir o encalar) y los autores recomiendan interpretar jerk, entropía e inmovilidad conjuntamente.',
    fuentes: [
      { autores: 'Orth, D., Kerr, G., Davids, K., & Seifert, L.', anio: 2017, titulo: 'Analysis of Relations between Spatiotemporal Movement Regulation and Performance of Discrete Actions Reveals Functionality in Skilled Climbing', publicacion: 'Frontiers in Psychology, 8, 1744', doi: '10.3389/fpsyg.2017.01744' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'estudios desde principiante hasta élite', objetivo: 'deportiva' },
    limitaciones:
      'Revisión de 21 estudios pequeños (n de 4 a 29) y heterogéneos, solo en inglés y hasta noviembre de 2016. GIE se calcula en un solo plano y puede no captar paradas sin cambio de trayectoria; la inmovilidad suele codificarse manualmente. En un estudio incluido no hubo relación GIE-rendimiento en élite. Varias conclusiones prácticas son hipótesis de los autores.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-003',
    bloque: 'tecnica',
    afirmacion:
      'En 9 escaladores varones de nivel intermedio (6a-6b), 4 sesiones de práctica en vías submáximas (5b-5c) con presas de orientación horizontal, vertical o doble (meta-estable) redujeron el tiempo de ascensión (de 115,9 s a 93,4 s) y las exploraciones (0,4 a 0,1); en la vía de doble orientación la entropía bajó (aprox. 1,33 a 1,08) sin perder exploración, y esa vía generó más exploración y variabilidad de rotación del tronco.',
    fuentes: [
      { autores: 'Seifert, L., Boulanger, J., Orth, D., & Davids, K.', anio: 2015, titulo: 'Environmental Design Shapes Perceptual-motor Exploration, Learning, and Transfer in Climbing', publicacion: 'Frontiers in Psychology, 6, 1819', doi: '10.3389/fpsyg.2015.01819' },
    ],
    nivel: 'B',
    aplicaA: { nivel: '6a-6b (intermedio)', experiencia: 'unos 3 años, 3 h/semana', objetivo: 'deportiva' },
    limitaciones:
      'n=9, solo varones, top-rope y vías submáximas; sin grupo control; una sola vía de transferencia; grados de libertad del ANOVA muy pequeños. La meta-estabilidad se infiere del comportamiento, no se probó directamente. El efecto sobre el grado real alcanzado no se midió. Apoya el enfoque basado en restricciones (constraints-led) pero no prueba superioridad frente a otros métodos.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-004',
    bloque: 'tecnica',
    afirmacion:
      'En 8 escaladores intermedios (5c, ~1,1 años de experiencia), tras 4 sesiones las caídas, el tiempo de ascensión y el jerk (fluidez) bajaron y la exploración de presas disminuyó; sin embargo, en una vía nueva con presas mixtas de orientación (test de transferencia) cayeron más, tardaron más y escalaron con menos fluidez: el aprendizaje no se transfirió totalmente a diseños de vía más complejos.',
    fuentes: [
      { autores: 'Seifert, L., Orth, D., Mantel, B., Boulanger, J., Hérault, R., & Dicks, M.', anio: 2018, titulo: 'Affordance Realization in Climbing: Learning and Transfer', publicacion: 'Frontiers in Psychology, 9, 820', doi: '10.3389/fpsyg.2018.00820' },
    ],
    nivel: 'B',
    aplicaA: { nivel: '5c (intermedio)', experiencia: '~1,1 años', objetivo: 'deportiva' },
    limitaciones:
      'n=8 (5 hombres, 3 mujeres); solo 4 sesiones de una hora; no se manipuló la cantidad de práctica; la vía de transferencia se analizó entera; la interpretación de búsqueda visual se infiere de sensores inerciales, no de seguimiento ocular. El grado de las vías aparece como 5b o 5c según la sección del artículo.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-005',
    bloque: 'tecnica',
    afirmacion:
      'En 7 principiantes (sin experiencia en roca, al menos 10 h en indoor) que practicaron una misma vía 5b durante 7 semanas (14 sesiones x 3 ascensos), jerk, entropía e inmovilidad mejoraron de pre a post-test; en el grupo, jerk y entropía se estabilizaron hacia la sesión 7 y la movilidad siguió mejorando hasta la ~9. Las trayectorias individuales fueron continuas, súbitas o sin mejora, y parecieron relacionarse con el repertorio previo de ángulos cadera-pared.',
    fuentes: [
      { autores: 'Orth, D., Davids, K., Chow, J.-Y., Brymer, E., & Seifert, L.', anio: 2018, titulo: 'Behavioral Repertoire Influences the Rate and Nature of Learning in Climbing: Implications for Individualized Learning Design in Preparation for Extreme Sports Participation', publicacion: 'Frontiers in Psychology, 9, 949', doi: '10.3389/fpsyg.2018.00949' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'principiantes (~16-18 Ewbank)', experiencia: '< 1 año, estudiantes de 18-24 años', objetivo: 'deportiva' },
    limitaciones:
      'Solo 7 analizados (1 abandono); una única vía repetida (efecto de familiaridad); clasificación de trayectorias individuales cualitativa y exploratoria, sin test estadístico. No permite fijar un volumen recomendado de práctica técnica para escaladores de 6b con < 2 años: solo ilustra que con una vía fija las mejoras de fluidez se aplanan en pocas semanas.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-006',
    bloque: 'tecnica',
    afirmacion:
      'En 9 escaladores que repitieron nueve veces la misma vía indoor (una ascensión por semana), la entropía geométrica del centro de masa fue menor en la 6.ª y la 9.ª ascensión que en la 1.ª, y se correlacionó con el gasto energético estimado (r = 0,67): al familiarizarse con la vía, la trayectoria se vuelve más directa y puede acompañarse de menor coste energético.',
    fuentes: [
      { autores: 'Watts, P. B., España-Romero, V., Ostrowski, M. L., & Jensen, R. L.', anio: 2021, titulo: 'Change in geometric entropy with repeated ascents in rock climbing', publicacion: 'Sports Biomechanics, 20(8), 1031-1040', doi: '10.1080/14763141.2019.1635636' },
    ],
    nivel: 'B',
    aplicaA: { objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen (Europe PMC); el artículo es de acceso restringido, por lo que nivel de los participantes, grado de la vía y análisis detallado no se verificaron. n=9, una sola vía; la correlación no demuestra causalidad. Mide el efecto de repetir la misma vía, no de entrenar técnica en vías distintas.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-TECNIC-007',
    bloque: 'tecnica',
    afirmacion:
      'En un ensayo aleatorizado con 26 escaladores novatos (12 mujeres), añadir análisis de vídeo y modelado por experto al feedback verbal estandarizado durante 3 sesiones mejoró la ejecución del paso alto (high step) frente al feedback verbal solo (efecto total 0,38; IC95% 0,06-0,68; escala 1-7 puntuada por dos expertos), sin diferencias claras en drop knee ni heel hook.',
    fuentes: [
      { autores: 'Blagus, R., Leskošek, B., Okršlar, L., Vreček, N., & Debevec, T.', anio: 2024, titulo: 'Utility of video analysis and expert modelling for technique development in novice sport climbers: a randomized controlled study', publicacion: 'International Journal of Sports Science & Coaching, 19(1), 355-367', doi: '10.1177/17479541231152548' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'novatos', experiencia: 'principiantes', objetivo: 'deportiva' },
    limitaciones:
      'n=26 novatos y solo 3 sesiones de entrenamiento; el resultado se limita a la calidad de ejecución de 3 técnicas puntuada por jueces, no al grado escalado; en drop knee y heel hook los IC incluyen el cero. No se extrapola a escaladores de 6b con > 1 año. Se consultó el registro del repositorio (resumen y resultados), no el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-TECNIC-008',
    bloque: 'tecnica',
    afirmacion:
      'En un estudio de caso único (un escalador recreativo de 20 años con 2 años de experiencia), el entrenamiento aislado de ejercicios (powerball, dominadas a mano abierta, test de resistencia) mejoró esos ejercicios entre un 35 y un 50% sin mejora significativa del rendimiento en escalada, mientras que 12 semanas de escalada combinada de 8 vías seguidas con objetivos escalonados se asociaron a ~40% de mejora en puntos de escalada.',
    fuentes: [
      { autores: 'Furlonger, B. E., Oey, A., Moore, D. W., Busacca, M., & Scott, D.', anio: 2017, titulo: 'Improving Amateur Indoor Rock Climbing Performance Using a Changing Criterion Design Within a Self-Management Program', publicacion: 'The Sport Journal', url: 'https://thesportjournal.org/article/improving-amateur-indoor-rock-climbing-performance-using-a-changing-criterion-design-within-a-self-management-program/' },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'recreativo (~2 años de experiencia)', experiencia: '2 años', objetivo: 'indoor' },
    limitaciones:
      'n=1, sin fase de reversión y con efecto de orden (la fase de ejercicios siempre precedió a la combinada); el rendimiento es una puntuación propia del estudio, no un grado. Sin DOI localizado; el año 2017 es la fecha de publicación de la web. Solo ilustra que practicar la tarea completa pudo ser más eficaz que ejercicios aislados en este caso.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-009',
    bloque: 'tecnica',
    afirmacion:
      'En 29 escaladores varones (nivel intermedio, avanzado y experto), la inspección visual de 3 minutos antes de la ascensión indoor no cambió la probabilidad de completar la vía, pero redujo el número y la duración de las paradas; la reducción en la duración de las paradas se dio sobre todo en los expertos.',
    fuentes: [
      { autores: 'Sanchez, X., Lambert, P., Jones, G., & Llewellyn, D. J.', anio: 2012, titulo: 'Efficacy of pre-ascent climbing route visual inspection in indoor sport climbing', publicacion: 'Scandinavian Journal of Medicine & Science in Sports, 22(1), 67-72', doi: '10.1111/j.1600-0838.2010.01151.x' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'intermedio a experto (varones)', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen (Europe PMC y repositorios); no se verificaron los grados exactos ni el detalle estadístico. Solo varones, indoor; mide parámetros de ejecución tras previsualizar, no el entrenamiento de la lectura de vía.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-TECNIC-010',
    bloque: 'tecnica',
    afirmacion:
      'En 18 escaladores (10 experimentados 6c-7b+ y 8 inexpertos 5-5+) que previsualizaron una vía 5b con gafas de seguimiento ocular, se identificaron 4 perfiles de previsualización; los perfiles con previsualización más corta y estrategia ascendente (3 experimentados) tuvieron menor jerk (escalada más fluida), mientras que zigzaguear o recorrer en bloques se asoció a más inmovilidad durante la escalada (r = 0,43-0,46).',
    fuentes: [
      { autores: 'Seifert, L., Cordier, R., Orth, D., Courtine, Y., & Croft, J. L.', anio: 2017, titulo: 'Role of route previewing strategies on climbing fluency and exploratory movements', publicacion: 'PLoS One, 12(4), e0176306', doi: '10.1371/journal.pone.0176306' },
    ],
    nivel: 'B',
    aplicaA: { nivel: '5-5+ y 6c-7b+', objetivo: 'deportiva' },
    limitaciones:
      'n=18, una sola vía en top-rope; solo 3 escaladores en los clusters de previsualización corta, con gran variabilidad del jerk; umbrales de clasificación fijados por los autores; grados autoinformados; correlaciones sobre muestra agrupada. Es descriptivo: no demuestra que enseñar una estrategia de previsualización mejore el rendimiento.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-011',
    bloque: 'tecnica',
    afirmacion:
      'En 18 escaladores varones de competición (aprox. 6b+ a 8b), las presas fijadas durante una previsualización de hasta 2 minutos se usaron mucho más que las no fijadas (159 de las 164 presas usadas habían sido fijadas), las presas usadas recibieron fijaciones más largas (~755 ms frente a ~397 ms) y más años de entrenamiento se asociaron a mejor rendimiento visual y motor (rho 0,54-0,56) y a menos tiempo de escalada (rho -0,53).',
    fuentes: [
      { autores: 'Luis-del Campo, V., Morenas Martín, J., Musculus, L., & Raab, M.', anio: 2024, titulo: 'Embodied planning in climbing: how pre-planning informs motor execution', publicacion: 'Frontiers in Psychology, 15, 1337878', doi: '10.3389/fpsyg.2024.1337878' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'aprox. 6b+ a 8b (competición)', experiencia: 'media 8,2 años escalando', objetivo: 'deportiva' },
    limitaciones:
      'n=18 varones, una vía y un muro de laboratorio de 21 presas con 4 presas señuelo; la proporción presas objetivo/señuelo puede sesgar; resultados correlacionales (no prueban que el pre-planeamiento cause la ejecución); población mucho más avanzada que un escalador de 6b con < 2 años.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-TECNIC-012',
    bloque: 'tecnica',
    afirmacion:
      'En entrevistas a 10 escaladores varones de 7a+ a 8b (todos entrenadores titulados), la previsualización de la vía fue el parámetro de rendimiento más codificado (de 9 identificados), percibida como útil para decidir la progresión y para gestionar el esfuerzo; los entrevistados también describieron entrenar la previsualización.',
    fuentes: [
      { autores: 'Sanchez, X., Torregrossa, M., Woodman, T., Jones, G., & Llewellyn, D. J.', anio: 2019, titulo: 'Identification of Parameters That Predict Sport Climbing Performance', publicacion: 'Frontiers in Psychology, 10, 1294', doi: '10.3389/fpsyg.2019.01294' },
    ],
    nivel: 'C',
    aplicaA: { nivel: '7a+ a 8b', experiencia: '8-22 años', objetivo: 'deportiva' },
    limitaciones:
      'Estudio cualitativo (percepciones de 10 varones, muestreo intencional, codificación por los propios autores), no mide rendimiento; centrado en escalada de dificultad (lead), sobre todo indoor. Es opinión experta de escaladores muy avanzados, no evidencia de eficacia de un método de entrenamiento de la lectura de vía.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
]
