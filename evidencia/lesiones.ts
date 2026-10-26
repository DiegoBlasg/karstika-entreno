import type { Hallazgo } from './tipos'

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-LESION-001',
    bloque: 'lesiones',
    afirmacion:
      'Una revisión semisistemática de ocho estudios sobre escalada deportiva y bloque estimó una tasa media de lesión de 2,71 ± 4,49 por 1000 horas de escalada; la dispersión (DE mayor que la media) indica que la tasa varía mucho entre estudios.',
    fuentes: [
      {
        autores: 'Jones, G.; Schöffl, V.; Johnson, M. I.',
        anio: 2018,
        titulo: 'Incidence, Diagnosis, and Management of Injury in Sport Climbing and Bouldering: A Critical Review',
        publicacion: 'Current Sports Medicine Reports, 17(11), 396-401',
        doi: '10.1249/jsr.0000000000000534',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escalada deportiva y bloque, sin estratificar por grado', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen. Los propios autores señalan limitaciones metodológicas en los estudios incluidos (definiciones de lesión y de exposición heterogéneas). Estimación agrupada sin metaanálisis formal; no permite calcular el riesgo individual de un escalador de 6b.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-002',
    bloque: 'lesiones',
    afirmacion:
      'En una serie prospectiva de un único centro (836 pacientes, 911 lesiones de escalada, 2009-2012), el 52 % de las lesiones fueron de dedos y la lesión de polea fue la más frecuente entre ellas; 531 de 911 fueron lesiones por sobrecarga, y los escaladores mayores y con más años de práctica tuvieron más lesiones por sobrecarga que agudas. Frente a la serie previa (1998-2001) las lesiones de polea A4 superaron a las A2 y aumentaron las de hombro.',
    fuentes: [
      {
        autores: 'Schöffl, V.; Popp, D.; Küpper, T.; Schöffl, I.',
        anio: 2015,
        titulo: 'Injury trends in rock climbers: evaluation of a case series of 911 injuries between 2009 and 2012',
        publicacion: 'Wilderness & Environmental Medicine, 26(1), 62-67',
        doi: '10.1016/j.wem.2014.08.013',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'pacientes de una consulta especializada (niveles mixtos)', experiencia: 'más sobrecarga con más años de práctica', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen. Muestra de pacientes que acuden a una clínica especializada (sesgo de selección, sin denominador de horas de exposición): describe la distribución de lesiones, no su incidencia. Casi todas las lesiones fueron de gravedad leve-moderada (UIAA grado 2: 881 de 911). Los autores son referentes en el tema y publican las dos series comparadas.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-003',
    bloque: 'lesiones',
    afirmacion:
      'Una revisión sistemática de 7 estudios (más de 4000 escaladores adultos de vía y bloque) concluyó que las lesiones por sobrecarga, sobre todo de dedos y hombros, son más frecuentes que las agudas, y que la evidencia sobre factores de riesgo (nivel, edad, uso de vendaje preventivo) es inconsistente y contradictoria.',
    fuentes: [
      {
        autores: 'Zieliński, J.; Grygorowicz, M.; Lewandowski, J.',
        anio: 2025,
        titulo: 'Epidemiology of Musculoskeletal Injuries Among Climbers - A Systematic Review',
        publicacion: 'Journal of Functional Morphology and Kinesiology, 11(1), 19',
        doi: '10.3390/jfmk11010019',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'adultos, escalada de vía y bloque', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen; no se comprobaron tasas ni cifras por estudio (el resumen no las da). Revisión sin metaanálisis, con solo 7 estudios incluidos; los autores piden definiciones de lesión estandarizadas y seguimientos largos.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-004',
    bloque: 'lesiones',
    afirmacion:
      'Una revisión sistemática de 19 estudios (35 posibles factores de riesgo o medidas preventivas) identificó como posibles factores de riesgo de lesión la edad, los años de experiencia, el grado máximo alcanzado, una alta intensidad de escalada (climbing intensity score) y escalar en vía como líder; sobre las medidas de prevención el resultado fue no concluyente.',
    fuentes: [
      {
        autores: 'Woollings, K. Y.; McKay, C. D.; Emery, C. A.',
        anio: 2015,
        titulo: 'Risk factors for injury in sport climbing and bouldering: a systematic review of the literature',
        publicacion: 'British Journal of Sports Medicine, 49(17), 1094-1099',
        doi: '10.1136/bjsports-2014-094372',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores de deportiva y bloque, mayoritariamente estudios transversales', experiencia: 'más años de práctica asociados a más riesgo', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen. Asociaciones, no causalidad: los autores indican que faltan estudios prospectivos de calidad para identificar factores modificables. Grado alto, experiencia e intensidad están correlacionados entre sí (confusión probable). No distingue un aumento brusco de carga.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-005',
    bloque: 'lesiones',
    afirmacion:
      'En una revisión sistemática PRISMA de 34 estudios (10 049 escaladores adultos, edad media 30 años), una mayor intensidad de escalada (por grado o nivel) fue el factor de riesgo de sobrecarga más consistente; también se asociaron el bloque frente a otras disciplinas (evidencia moderada), el agarre en cruce o "crimp" (2 estudios), la lesión previa (3 estudios prospectivos, con una probabilidad media de reincidencia del 63 % en uno de ellos, sobre todo en dedos) y, con evidencia débil, menor fuerza de agarre. Volumen de entrenamiento, edad, años de experiencia y sexo mostraron resultados contradictorios.',
    fuentes: [
      {
        autores: 'Quarmby, A.; Zhang, M.; Geisler, M.; Javorsky, T.; Mugele, H.; Cassel, M.; Lawley, J.',
        anio: 2023,
        titulo: 'Risk factors and injury prevention strategies for overuse injuries in adult climbers: a systematic review',
        publicacion: 'Frontiers in Sports and Active Living, 5, 1269870',
        doi: '10.3389/fspor.2023.1269870',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'adultos; sobrecarga; todos los niveles mezclados', objetivo: 'deportiva' },
    limitaciones:
      'Texto completo abierto (PMC). Cerca del 65 % de los estudios eran transversales; calidad metodológica baja (Downs y Black, media 14,4 de 32). Sin metaanálisis por heterogeneidad. Muestras con predominio masculino y algunas con menores de 18; varios estudios no separan sobrecarga de trauma; no se analizaron interacciones como el aumento brusco de carga. No hay estudios que prueben que el campus o el aumento brusco de carga causen lesión: el resultado no cubre esas variables.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-LESION-006',
    bloque: 'lesiones',
    afirmacion:
      'La misma revisión sistemática (34 estudios) no encontró asociación con el riesgo de lesión por sobrecarga para calentamiento y enfriamiento, estiramientos, vendaje de dedos, hidratación ni IMC; el vendaje de muñeca mostró un posible beneficio débil. Esto describe ausencia de asociación en estudios mayoritariamente observacionales, no que esas prácticas sean ineficaces ni dañinas.',
    fuentes: [
      {
        autores: 'Quarmby, A.; Zhang, M.; Geisler, M.; Javorsky, T.; Mugele, H.; Cassel, M.; Lawley, J.',
        anio: 2023,
        titulo: 'Risk factors and injury prevention strategies for overuse injuries in adult climbers: a systematic review',
        publicacion: 'Frontiers in Sports and Active Living, 5, 1269870',
        doi: '10.3389/fspor.2023.1269870',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'adultos; sobrecarga', objetivo: 'deportiva' },
    limitaciones:
      'Texto completo abierto (PMC). Casi todo observacional con baja calidad: un estudio prospectivo incluso asoció un calentamiento específico de dedos con más probabilidad de lesión, que los autores atribuyen a confusión (quien tiene molestias calienta más). Ningún ensayo probó el calentamiento como medida preventiva. No es una recomendación de omitir el calentamiento.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-LESION-007',
    bloque: 'lesiones',
    afirmacion:
      'En un ensayo aleatorizado con 84 estudiantes varones de 18-19 años que escalaban como aficionados (40 intervención, 44 control), un programa de un año con ejercicios en cadena cinética cerrada, excéntricos y de fuerza redujo la tasa de lesiones de hombro (0,5 frente a 3,182 por 1000 exposiciones de deportista; P < 0,001). La razón de tasas fue 0,862 (IC95 % 0,751-0,990) para lesiones moderadas y 0,864 (0,768-0,971) para graves; para las leves el IC (0,737-1,007) incluyó el 1.',
    fuentes: [
      {
        autores: 'Kozin, S.; Cretu, M.; Kozina, Z.; Chernozub, A.; Ryepko, O.; Shepelenko, T.; Sobko, I.; Oleksiuk, M.',
        anio: 2021,
        titulo: 'Application of closed kinematic chain exercises with eccentric and strength exercises for the shoulder injuries prevention in student rock climbers: a randomized controlled trial',
        publicacion: 'Acta of Bioengineering and Biomechanics, 23(2), 159-168',
        doi: '10.37190/abb-01828-2021-01',
      },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'aficionados jóvenes varones; no se informa grado', experiencia: 'estudiantes, nivel amateur', objetivo: 'escalada en general (no específica de deportiva en roca)' },
    limitaciones:
      'Solo se leyó el resumen de la editorial. Un único grupo de investigación y una sola cohorte pequeña de varones jóvenes; no se evaluaron dedos. Un registro de terceros (PEDro, no verificado por mí) la puntúa 4/10 por ausencia de cegamiento y de análisis por intención de tratar. El resumen usa una prueba exacta de Fisher para razones de tasas y no define la exposición; la cifra debe leerse con cautela. No extrapolar a mujeres, adultos de más edad ni a lesiones de dedo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-008',
    bloque: 'lesiones',
    afirmacion:
      'En un estudio transversal con cuestionario a 116 escaladores jóvenes de 11-19 años (Alberta, Canadá), la tasa de lesión fue 4,44 por 1000 horas de escalada (IC95 % 3,74-5,23); el mecanismo principal fue la sobrecarga repetitiva (42 %) y la mano y los dedos la localización más frecuente (21 %). En análisis exploratorios, tener 15-19 años frente a 11-14 (OR 11,30; IC95 % 2,33-54,85), una lesión en otro deporte (OR 6,46) y el uso de vendaje preventivo (OR 5,09) se asociaron a más lesión.',
    fuentes: [
      {
        autores: 'Woollings, K. Y.; McKay, C. D.; Kang, J.; Meeuwisse, W. H.; Emery, C. A.',
        anio: 2015,
        titulo: 'Incidence, mechanism and risk factors for injury in youth rock climbers',
        publicacion: 'British Journal of Sports Medicine, 49(1), 44-50',
        doi: '10.1136/bjsports-2014-094067',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'jóvenes de 11-19 años, recreativos y de élite', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Solo se leyó el resumen. Diseño transversal con cuestionario anónimo (sesgo de recuerdo) y n pequeño: intervalos de confianza muy anchos. Los factores de riesgo son exploratorios; el vendaje preventivo probablemente refleja causalidad inversa (se venda quien ya tiene molestias). No es aplicable directamente a adultos.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-009',
    bloque: 'lesiones',
    afirmacion:
      'Una encuesta transversal retrospectiva a 745 escaladores recreativos (2024) encontró que el 77 % refería al menos una lesión, el 70 % de ellas en dedos o manos; las lesiones de polea (47 %) y de tendón flexor (14 %) estuvieron entre las más citadas. Tuvieron mayor probabilidad de lesión los hombres, quienes llevaban 4-10 o más de 11 años escalando y quienes usaban fingerboard. El 44 % buscó guía de tratamiento en recursos en línea y el 47 % consultó a un médico.',
    fuentes: [
      {
        autores: 'den Hengst, S.; Powis, E.; Cooper, C.; Diamond, S.; Tuaño, K. R.',
        anio: 2026,
        titulo: 'Finger, hand and wrist injuries in climbers: insights from climber and provider surveys',
        publicacion: 'BMJ Open Sport & Exercise Medicine, 12(2), e003239',
        doi: '10.1136/bmjsem-2026-003239',
      },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'escaladores recreativos (autoinformado)', experiencia: 'mayor probabilidad con 4-10 y más de 11 años', objetivo: 'deportiva y bloque' },
    limitaciones:
      'Solo se leyó el resumen; el registro no aporta OR ni IC ni limitaciones. Encuesta voluntaria difundida por redes (sesgo de selección hacia quienes se lesionaron), diagnósticos autoinformados y no confirmados por un clínico, diseño transversal: el uso de fingerboard puede ser consecuencia de la lesión (rehabilitación) y no causa. No cuantifica el riesgo por exposición.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-010',
    bloque: 'lesiones',
    afirmacion:
      'Revisión narrativa de expertos: las lesiones de polea del dedo se producen por el agarre en cruce ("crimp"); las poleas A2, A3 y A4 son las más expuestas, sobre todo con carga excéntrica. Se clasifican en grados I-IV; se recomienda la ecografía como primera prueba de imagen (RM si no es concluyente); los grados I-III se tratan de forma conservadora (inmovilización, vendaje en H, férula protectora) y la cirugía se reserva para el grado IV que no es tratable conservadoramente.',
    fuentes: [
      {
        autores: 'Miro, P. H.; vanSonnenberg, E.; Sabb, D. M.; Schöffl, V.',
        anio: 2021,
        titulo: 'Finger Flexor Pulley Injuries in Rock Climbers',
        publicacion: 'Wilderness & Environmental Medicine, 32(2), 247-258',
        doi: '10.1016/j.wem.2021.01.011',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'escaladores con sospecha de lesión de polea', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen. Revisión narrativa, no sistemática; la clasificación y el manejo son práctica clínica de expertos, no ensayos. Solo informativo para la app: no sirve para diagnosticar ni descartar una lesión, que requiere exploración y, en su caso, ecografía por un profesional. Un coautor (Schöffl) es autor de la clasificación y del algoritmo de manejo (conflicto intelectual).',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-LESION-011',
    bloque: 'lesiones',
    afirmacion:
      'Revisión narrativa clínica: la lesión de polea aparece típicamente de forma aguda (movimiento difícil en agarre en cruce o caída con carga brusca) con dolor y tumefacción de inicio súbito; un chasquido audible ocurre a veces pero no es lo habitual; el arqueo del tendón (bowstringing) suele verse solo cuando se rompen al menos dos poleas consecutivas (descrito en casos aislados de A2). El diagnóstico clínico es difícil, por lo que suele ser necesaria una prueba de imagen (radiografía para descartar fractura o avulsión de placa volar; ecografía considerada de referencia). Se indican plazos orientativos: grados I-II con recuperación completa en unas 6 semanas y vendaje protector hasta 3 meses; grado III con inmovilización de 10-14 días y escalada suave desde las 6-8 semanas.',
    fuentes: [
      {
        autores: 'Crowley, T. P.',
        anio: 2012,
        titulo: 'The Flexor Tendon Pulley System and Rock Climbing',
        publicacion: 'Journal of Hand and Microsurgery, 4(1), 25-29',
        doi: '10.1007/s12593-012-0061-3',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'escaladores con sospecha de lesión de polea', objetivo: 'deportiva' },
    limitaciones:
      'Leído el texto en PMC. Revisión narrativa de un solo autor (cirujano plástico) de 2012; los plazos son orientativos y proceden de series pequeñas citadas, no de ensayos. No establece criterios formales de derivación: solo indica que el diagnóstico clínico es difícil y que se necesita imagen. En la app solo puede usarse como información de señales de alerta (dolor súbito, hinchazón, chasquido, pérdida de función), nunca como diagnóstico, y siempre con recomendación de valoración profesional.',
    verificada: { fecha: '2026-10-26', metodo: 'fuente-primaria' },
  },
  {
    id: 'EV-LESION-012',
    bloque: 'lesiones',
    afirmacion:
      'Un comentario clínico de expertos señala que apenas existen guías que describan la rehabilitación y la preparación física para volver a escalar tras una lesión de polea anular, y propone gestionar la rotura traumática con principios de fuerza y acondicionamiento mediante carga progresiva.',
    fuentes: [
      {
        autores: 'Ehiogu, U. D.; Schöffl, V.; Jones, G.',
        anio: 2023,
        titulo: 'Rehabilitation of Annular Pulley Injuries of the Fingers in Climbers: A Clinical Commentary',
        publicacion: 'Current Sports Medicine Reports, 22(10), 345-352',
        doi: '10.1249/jsr.0000000000001107',
      },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'escaladores tras rotura de polea', objetivo: 'deportiva' },
    limitaciones:
      'Solo se leyó el resumen (texto completo de pago): no se verificaron plazos ni criterios de retorno. Opinión de expertos sin estudio primario que valide un protocolo. No hay base aquí para fijar cuándo volver a entrenar tras molestias leves; la pregunta queda registrada como laguna.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
]
