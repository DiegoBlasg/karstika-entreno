import type { Hallazgo } from './tipos'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-RECUP-001',
    bloque: 'recuperacion',
    afirmacion:
      'En una revisión sistemática de 12 estudios de cohortes prospectivas en deportistas adultos, la evidencia de que dormir mal aumente la incidencia de lesión deportiva o relacionada con el entrenamiento fue limitada (insuficiente en profesionales/élite, universitarios y de resistencia); los autores concluyen que no se puede considerar el mal sueño un factor de riesgo independiente de lesión.',
    fuentes: [
      {
        autores: 'Dobrosielski, D. A.; Sweeney, L.; Lisman, P. J.',
        anio: 2021,
        titulo: 'The Association Between Poor Sleep and the Incidence of Sport and Physical Training-Related Injuries in Adult Athletic Populations: A Systematic Review',
        publicacion: 'Sports Medicine',
        doi: '10.1007/s40279-020-01416-3',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'deportistas adultos (no específico de escalada)', objetivo: 'general (extrapolación a escalada deportiva)' },
    limitaciones:
      'Revisión de estudios observacionales (cohortes), sin metaanálisis; heterogeneidad metodológica. Ausencia de evidencia no equivale a ausencia de efecto. Texto completo de pago: solo se leyó el resumen. Una revisión sistemática en futbolistas (Clemente 2021, Healthcare, doi 10.3390/healthcare9070808; 32 estudios, mayoritariamente observacionales) sugiere que la restricción de sueño se asocia a peor rendimiento y más lesiones musculoesqueléticas, con resultados inconsistentes. Ningún estudio incluido es de escaladores.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-002',
    bloque: 'recuperacion',
    afirmacion:
      'En una revisión sistemática de 10 estudios (218 deportistas de 18-24 años; natación, fútbol, baloncesto, tenis) sobre intervenciones de sueño (extensión y siestas, higiene del sueño, estrategias postejercicio), la extensión del sueño fue la intervención con efectos más beneficiosos sobre el rendimiento posterior; el sueño importa para algunos aspectos del rendimiento y la recuperación, pero no para todos.',
    fuentes: [
      {
        autores: 'Bonnar, D.; Bartel, K.; Kakoschke, N.; Lang, C.',
        anio: 2018,
        titulo: 'Sleep Interventions Designed to Improve Athletic Performance and Recovery: A Systematic Review of Current Approaches',
        publicacion: 'Sports Medicine',
        doi: '10.1007/s40279-017-0832-x',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'deportistas jóvenes adultos de otros deportes', objetivo: 'general (extrapolación a escalada deportiva)' },
    limitaciones:
      'Pocos estudios y muestras pequeñas, edades 18-24 años, ningún escalador. Calidad metodológica modesta. Solo se leyó el resumen (texto completo de pago). No fija una cantidad de horas aplicable a escaladores, por lo que no se cuantifica aquí.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-003',
    bloque: 'recuperacion',
    afirmacion:
      'En un metaanálisis de ensayos aleatorizados (49 estudios, 1863 adultos sanos, entrenamiento de fuerza de al menos 6 semanas), la suplementación con proteína aumentó la fuerza (1RM) y la masa libre de grasa; no hubo ganancias adicionales de masa libre de grasa por encima de una ingesta proteica total de unos 1,62 g/kg/día.',
    fuentes: [
      {
        autores: 'Morton, R. W.; Murphy, K. T.; McKellar, S. R.; Schoenfeld, B. J.; Henselmans, M.; Helms, E.; Aragon, A. A.; Devries, M. C.; Banfield, L.; Krieger, J. W.; Phillips, S. M.',
        anio: 2018,
        titulo: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults',
        publicacion: 'British Journal of Sports Medicine',
        doi: '10.1136/bjsports-2017-097608',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'adultos sanos con entrenamiento de fuerza (no escaladores)', objetivo: 'masa magra y fuerza; extrapolación a escalada deportiva' },
    limitaciones:
      'Extrapolación: no hay escaladores y el resultado es sobre masa magra y fuerza en entrenamiento de fuerza, no sobre rendimiento en escalada. El punto de ruptura (~1,62 g/kg/día) es una estimación con incertidumbre, no un umbral exacto; el efecto en masa libre de grasa fue pequeño y menor con la edad. Resumen leído vía registro bibliográfico (Europe PMC); texto completo no revisado. No cubre hidratos de carbono ni energía total.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-004',
    bloque: 'recuperacion',
    afirmacion:
      'En 40 escaladores experimentados (20 hombres, 20 mujeres; 18-46 años; IMC medio 21,6) con diario de comida pesado de 3 días, la ingesta media fue de 2155 kcal/día, 3,7 g/kg/día de hidratos de carbono y 1,6 g/kg/día de proteína; el 77,5 % no alcanzaba el requerimiento energético estimado para una actividad "moderada", el 80 % de las mujeres no cubría la ingesta de referencia de hierro y alrededor del 30 % de las mujeres cumplía criterios de deficiencia de hierro.',
    fuentes: [
      {
        autores: 'Gibson-Smith, E.; Storey, R.; Ranchordas, M.',
        anio: 2020,
        titulo: 'Dietary Intake, Body Composition and Iron Status in Experienced and Elite Climbers',
        publicacion: 'Frontiers in Nutrition',
        doi: '10.3389/fnut.2020.00122',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores experimentados y de élite', experiencia: 'media 8,8 años (muy superior al perfil objetivo de <2 años)', objetivo: 'general' },
    limitaciones:
      'Estudio transversal, n=40, muestra de conveniencia del Reino Unido; diario de 3 días (subregistro frecuente); requerimiento estimado con ecuaciones (RMR de Cunningham x 1,443), no medido. Describe lo que comen, no lo que deberían comer ni su efecto sobre el rendimiento. Hierro medido en una muestra aleatoria no en ayunas. Sin diferencias entre escaladores intermedios/avanzados y de élite. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-005',
    bloque: 'recuperacion',
    afirmacion:
      'En 27 escaladores del equipo juvenil esloveno (13-18 años) con registros de comida y actividad de 3 días, la disponibilidad energética media fue de 27,5 ± 9,8 kcal/kg de masa libre de grasa/día; el 63 % quedaba por debajo de 30 kcal/kg MLG/día, la ingesta de hidratos de carbono (4,3 ± 1,3 g/kg/día) fue baja, y las 5 escaladoras con disfunción menstrual (36 % de las chicas) tenían disponibilidad energética <30.',
    fuentes: [
      {
        autores: 'Simič, V.; Jevšnik, Š.; Mohorko, N.',
        anio: 2022,
        titulo: 'Low Energy Availability and Carbohydrate Intake in Competitive Adolescent Sport Climbers',
        publicacion: 'Kinesiology',
        url: 'https://ojs.srce.hr/kinesiology/article/view/20524',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores adolescentes de competición (13-18 años)', experiencia: 'equipo juvenil nacional', objetivo: 'competición' },
    limitaciones:
      'n=27, transversal, 3 días de registro (error en ingesta y gasto); adolescentes de competición, no adultos recreativos; la página no indica DOI (se cita la URL). No demuestra causalidad entre baja disponibilidad energética y disfunción menstrual. El umbral de 30 kcal/kg MLG/día es un punto de corte orientativo, no un diagnóstico. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-006',
    bloque: 'recuperacion',
    afirmacion:
      'El consenso del COI de 2023 define el RED-S como un síndrome de problemas de salud y rendimiento causado por baja disponibilidad energética (ingesta insuficiente respecto al gasto del ejercicio) que afecta a mujeres y hombres, e incorpora una herramienta clínica (REDs CAT2) para detección y estratificación del riesgo; una revisión narrativa en escaladores de roca señala que muchos tienen IMC y grasa corporal bajos y que un número preocupante de escaladores de alto nivel no cubre las necesidades energéticas de un entrenamiento moderado, y recomienda un abordaje multidisciplinar e individualizado.',
    fuentes: [
      {
        autores: 'Mountjoy, M.; et al.',
        anio: 2023,
        titulo: "2023 International Olympic Committee's (IOC) consensus statement on Relative Energy Deficiency in Sport (REDs)",
        publicacion: 'British Journal of Sports Medicine',
        doi: '10.1136/bjsports-2023-106994',
      },
      {
        autores: 'Tan, K.; Schöffl, V.',
        anio: 2025,
        titulo: 'Relative Energy Deficiency in Sport in Rock Climbers: A Narrative Review',
        publicacion: 'Journal of Strength and Conditioning Research',
        doi: '10.1519/JSC.0000000000005157',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'deportistas en general y escaladores de roca (jóvenes, adultos, paraclimbers)', objetivo: 'general' },
    limitaciones:
      'Consenso de expertos y revisión narrativa, no estudios primarios; solo se leyeron los resúmenes (PubMed no accesible; consenso consultado vía Europe PMC, 17 autores, se cita solo al primero). La prevalencia real de RED-S en escaladores recreativos no está establecida. La herramienta CAT2 es para cribado clínico por profesionales, no para autodiagnóstico en una app; la app no debe diagnosticar. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-007',
    bloque: 'recuperacion',
    afirmacion:
      'En una revisión sistemática (artículos 2000-2021), los escaladores deportivos tenían menor masa y grasa corporal que los controles, y los de élite menos que los menos avanzados, además de mayor fuerza de dedos (también relativa a la masa corporal); los autores lo presentan como posibles factores del rendimiento de élite, descripción que no implica que perder peso mejore el rendimiento de un escalador concreto.',
    fuentes: [
      {
        autores: 'Ginszt, M.; Saito, M.; Zięba, E.; Majcher, P.; Kikuchi, N.',
        anio: 2023,
        titulo: 'Body Composition, Anthropometric Parameters, and Strength-Endurance Characteristics of Sport Climbers: A Systematic Review',
        publicacion: 'Journal of Strength and Conditioning Research',
        doi: '10.1519/jsc.0000000000004464',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores deportivos: élite vs menos avanzados vs controles', objetivo: 'deportiva' },
    limitaciones:
      'Revisión de estudios transversales: describe diferencias entre grupos, no demuestra que reducir peso o grasa mejore el rendimiento (sesgo de selección y causalidad inversa). Solo se leyó el resumen, que no da valores numéricos. Perder peso en quien ya tiene IMC normal puede reducir fuerza y salud (ver EV-RECUP-004 a 006). No usar para fijar objetivos de peso o grasa: la app no debe proponerlos.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-008',
    bloque: 'recuperacion',
    afirmacion:
      'En un metaanálisis de ensayos aleatorizados (53 estudios; 563 con creatina y 575 controles; ejercicios de menos de 3 minutos), la creatina mejoró la fuerza de miembro superior (tamaño de efecto global 0,317; press de banca 0,265) sin relación con las características de la población, el protocolo, la dosis o la duración.',
    fuentes: [
      {
        autores: 'Lanhers, C.; Pereira, B.; Naughton, G.; Trousselard, M.; Lesage, F.-X.; Dutheil, F.',
        anio: 2017,
        titulo: 'Creatine Supplementation and Upper Limb Strength Performance: A Systematic Review and Meta-Analysis',
        publicacion: 'Sports Medicine',
        doi: '10.1007/s40279-016-0571-4',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'adultos en general, fuerza de miembro superior (press), no escaladores', objetivo: 'fuerza; extrapolación a escalada deportiva' },
    limitaciones:
      'Extrapolación: no se encontraron resultados publicados de creatina en escaladores (solo un ensayo registrado en boulderistas sin resultados). Las pruebas fueron de press/pectoral, no dominadas ni suspensión de dedos; efecto pequeño-moderado. Solo resumen (texto completo de pago). No evalúa efectos adversos ni el posible aumento de peso corporal por retención de agua, relevante en un deporte de peso corporal.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-009',
    bloque: 'recuperacion',
    afirmacion:
      'En un ensayo aleatorizado, triple ciego y cruzado con 13 escaladores varones intermedio-avanzados, una dosis aguda de 3 mg/kg de cafeína no mejoró de forma significativa ninguna variable (1RM y potencia en dominada, resistencia en dominada, suspensión, fuerza y tasa de desarrollo de fuerza de agarre), aunque se sintieron más fuertes y alerta; en cambio, una revisión paraguas de 21 metaanálisis concluye que la cafeína es ergogénica en resistencia aeróbica, fuerza, resistencia muscular, potencia y salto, con efecto mayor en lo aeróbico que en lo anaeróbico.',
    fuentes: [
      {
        autores: 'Ruiz-López, A.; Montalvo-Alonso, J. J.; Martín-Rivas, I.; Del Val-Manzano, M.; Ferragut, C.; Valadés, D.; Barrios-Egea, M.; Gonzalo-Encabo, P.; Pérez-López, A.',
        anio: 2026,
        titulo: 'Effects of Acute and Moderate Caffeine Doses on Sport Climbing Performance: A Randomized Controlled Trial',
        publicacion: 'Nutrients',
        doi: '10.3390/nu18020284',
      },
      {
        autores: 'Grgic, J.; Grgic, I.; Pickering, C.; Schoenfeld, B. J.; Bishop, D. J.; Pedisic, Z.',
        anio: 2020,
        titulo: 'Wake up and smell the coffee: caffeine supplementation and exercise performance: an umbrella review of 21 published meta-analyses',
        publicacion: 'British Journal of Sports Medicine',
        doi: '10.1136/bjsports-2018-100278',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'escaladores varones intermedio-avanzados (ensayo); varones jóvenes en general (revisión)', objetivo: 'deportiva' },
    limitaciones:
      'Ensayo en escaladores: n=13, solo varones, una única dosis; un resultado no significativo en muestra pequeña no demuestra ausencia de efecto; tests de laboratorio, no en vía. Revisión paraguas: extrapolación (mayoría de estudios en hombres jóvenes no escaladores; algunos metaanálisis sin dirección clara con el intervalo de predicción). Evidencia de cafeína en escalada contradictoria/insuficiente; no se evaluaron efectos sobre el sueño. Solo se leyeron resúmenes. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-010',
    bloque: 'recuperacion',
    afirmacion:
      'En un ensayo aleatorizado cruzado con 13 escaladoras bien entrenadas (27,1 ± 8,9 años) que hicieron dos escaladas exhaustivas en una vía de 6b separadas por 20 minutos, el rendimiento en la segunda escalada se mantuvo tras recuperación activa (bicicleta a 30-40 W) e inmersión fría de antebrazos y brazos (~15 °C), y bajó tras reposo pasivo y electroestimulación (P < 0,01); en 15 escaladores expertos, el lactato volvió a su nivel basal a los 20 min con recuperación activa y a los 30 min con pasiva.',
    fuentes: [
      {
        autores: 'Heyman, E.; De Geus, B.; Mertens, I.; Meeusen, R.',
        anio: 2009,
        titulo: 'Effects of four recovery methods on repeated maximal rock climbing performance',
        publicacion: 'Medicine & Science in Sports & Exercise',
        doi: '10.1249/mss.0b013e318195107d',
      },
      {
        autores: 'Watts, P. B.; Daggett, M.; Gallagher, P.; Wilkins, B.',
        anio: 2000,
        titulo: 'Metabolic response during sport rock climbing and the effects of active versus passive recovery',
        publicacion: 'International Journal of Sports Medicine',
        doi: '10.1055/s-2000-302',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'escaladoras bien entrenadas (vía 6b) y escaladores expertos (5.12b)', objetivo: 'recuperación entre intentos dentro de una misma sesión' },
    limitaciones:
      'Heyman: n=13, solo mujeres, una vía; Watts: n=15 con grupos desiguales (8 y 7), asignación no cruzada, mide lactato y no rendimiento posterior (los propios autores señalan que falta saber si mejora el rendimiento). Ambos miden recuperación en minutos entre intentos, no entre sesiones ni adaptaciones al entrenamiento. Solo se leyeron los resúmenes. Los resultados de recuperación activa/frío entre intentos no se pueden extender a recuperación entre días. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-011',
    bloque: 'recuperacion',
    afirmacion:
      'Un metaanálisis de 28 estudios concluye que la inmersión en agua fría fue superior a otros métodos para recuperar del dolor muscular y similar para potencia y flexibilidad, y más eficaz que la recuperación activa, el agua de contraste y la inmersión templada en la mayoría de resultados tras ejercicio extenuante agudo en personas físicamente activas; otro metaanálisis de 99 estudios halló que el masaje fue la técnica más eficaz para reducir el dolor muscular de aparición tardía (DOMS) y la fatiga percibida.',
    fuentes: [
      {
        autores: 'Moore, E.; Fuller, J. T.; Bellenger, C. R.; Saunders, S.; Halson, S. L.; Broatch, J. R.; Buckley, J. D.',
        anio: 2023,
        titulo: 'Effects of Cold-Water Immersion Compared with Other Recovery Modalities on Athletic Performance Following Acute Strenuous Exercise in Physically Active Participants: A Systematic Review, Meta-Analysis, and Meta-Regression',
        publicacion: 'Sports Medicine',
        doi: '10.1007/s40279-022-01800-1',
      },
      {
        autores: 'Dupuy, O.; Douzi, W.; Theurot, D.; Bosquet, L.; Dugué, B.',
        anio: 2018,
        titulo: 'An Evidence-Based Approach for Choosing Post-exercise Recovery Techniques to Reduce Markers of Muscle Damage, Soreness, Fatigue, and Inflammation: A Systematic Review With Meta-Analysis',
        publicacion: 'Frontiers in Physiology',
        doi: '10.3389/fphys.2018.00403',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'personas físicamente activas y deportistas de otros deportes; sin estudios de escalada entre sesiones', objetivo: 'recuperación percibida (dolor, fatiga) tras ejercicio agudo' },
    limitaciones:
      'Extrapolación desde otros deportes y otros músculos; los efectos son sobre dolor y fatiga percibidos y marcadores, no sobre rendimiento en escalada ni sobre las adaptaciones. No se verificó si el frío repetido tras entrenamiento de fuerza atenúa las adaptaciones (hay literatura que lo sugiere; no evaluada aquí). Heterogeneidad de protocolos; solo resúmenes leídos vía Europe PMC. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-RECUP-012',
    bloque: 'recuperacion',
    afirmacion:
      'Una revisión sistemática de 56 estudios en deportistas halló que las medidas subjetivas autodeclaradas (bienestar, estado de ánimo, estrés percibido) reflejaban las cargas de entrenamiento agudas y crónicas con mayor sensibilidad y consistencia que las medidas objetivas; el bienestar subjetivo tendía a empeorar con aumentos agudos de carga o con entrenamiento crónico y a mejorar tras reducirla, y ambos tipos de medida generalmente no se correlacionaban entre sí.',
    fuentes: [
      {
        autores: 'Saw, A. E.; Main, L. C.; Gastin, P. B.',
        anio: 2016,
        titulo: 'Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review',
        publicacion: 'British Journal of Sports Medicine',
        doi: '10.1136/bjsports-2015-094758',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'deportistas de distintos deportes (no escalada)', objetivo: 'monitorización de la carga' },
    limitaciones:
      'Revisión de estudios mayoritariamente observacionales y heterogéneos; ningún estudio en escalada. No establece umbrales cuantitativos para ajustar la carga (cuánto reducir con cierto bienestar, sueño o dolor): sin evidencia de reglas de ajuste concretas. Se leyó el resumen en PMC; el texto completo no se revisó.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
]
