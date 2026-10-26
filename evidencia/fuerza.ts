import type { Hallazgo } from './tipos'

const V = { fecha: '2026-10-26', metodo: 'fuente-primaria' } as const

export const hallazgos: Hallazgo[] = [
  {
    id: 'EV-FUERZA-001',
    bloque: 'fuerza',
    afirmacion:
      'En una revisión sistemática con metaanálisis de ensayos aleatorizados en escaladores activos (11 estudios, 225 escaladores; 5 estudios y 110 escaladores en el metaanálisis), el entrenamiento de fuerza específico superó a solo escalar en pruebas relacionadas con la escalada (SDM = 0,57; IC95 % 0,24–0,91). El entrenamiento de flexores de dedos mejoró fuerza de dedos (SDM 0,41), tasa de desarrollo de fuerza (SDM 0,91) y resistencia de antebrazo (SDM 1,23), pero sin mejoras en pruebas específicas de escalada.',
    fuentes: [
      { autores: 'Stien, N.; Riiser, A.; Shaw, M. P.; Saeterbakken, A. H.; Andersen, V.', anio: 2023, titulo: 'Effects of climbing- and resistance-training on climbing-specific performance: a systematic review and meta-analysis', publicacion: 'Biology of Sport, 40(1), 179–191', doi: '10.5114/biolsport.2023.113295' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'principalmente avanzados/élite, mayoría de bloques de 4–5 semanas', experiencia: 'escaladores activos', objetivo: 'general (boulder y deportiva)' },
    limitaciones:
      'Pocos ensayos y muestras pequeñas (infradotados); PEDro 5–7; sin cegamiento; intervenciones de 4–8 semanas, ninguna de más de 10; el rendimiento en escalada rara vez se midió directamente y no se metaanalizó; apenas mujeres; solo artículos en inglés. Solo un estudio incluyó trabajo de tren superior general (dominadas/curl) sin cambio en rendimiento de escalada: no hay base aquí para dosis de dominadas lastradas. Publicado online en 2022, número de 2023.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-002',
    bloque: 'fuerza',
    afirmacion:
      'En 16 escaladores de encadene avanzados a élite aleatorizados a 5 semanas de campus board (2 o 4 sesiones semanales con volumen igualado) o control, los grupos de campus mejoraron frente al control la fuerza de dominada isométrica en regleta (ES 0,87), el rendimiento en boulder (ES 2,37), el alcance máximo (ES 1,66) y los movimientos hasta el fallo (ES 1,43). No hubo diferencias entre 2 y 4 sesiones semanales.',
    fuentes: [
      { autores: 'Stien, N.; Pedersen, H.; Vereide, V. A.; Saeterbakken, A. H.; Hermans, E.; Kalland, J.; Schoenfeld, B. J.; Andersen, V.', anio: 2021, titulo: 'Effects of Two vs. Four Weekly Campus Board Training Sessions on Bouldering Performance and Climbing-Specific Tests in Advanced and Elite Climbers', publicacion: 'Journal of Sports Science and Medicine, 20, 438–447', doi: '10.52082/jssm.2021.438' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'avanzado–élite (IRCRA alto)', experiencia: 'avanzados con experiencia previa', objetivo: 'boulder / potencia' },
    limitaciones:
      'n = 16 en tres grupos, sin tamaños por grupo en el resumen; muchos contrastes (riesgo de azar); tamaños de efecto muy grandes en grupos diminutos son imprecisos; solo 5 semanas y sin seguimiento; no valora lesiones. No generalizable a escaladores intermedios ni a menores. Verificado solo con el resumen (abstract), no con el texto completo.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-FUERZA-003',
    bloque: 'fuerza',
    afirmacion:
      'En un estudio cruzado con 24 escaladores avanzados, una serie de dominadas lastradas a 5RM (carga media 27,8 kg) realizada 4 minutos antes mejoró de forma aguda el IRCRA Power Slap (distancia 84,0 a 91,4 cm, d = 0,68; potencia y fuerza también), mientras que las dominadas a un brazo solo mejoraron la distancia. Es un efecto agudo (potenciación), no una adaptación de entrenamiento.',
    fuentes: [
      { autores: 'Sas-Nowosielski, K.; Kandzia, K.', anio: 2022, titulo: 'Acute Effects of Post-Activation Performance Enhancement of 5RM Weighted Pull-Ups and One Arm Pull-Ups on Specific Upper Body Climbing Performance', publicacion: 'Journal of Human Kinetics, 84, 206–215', doi: '10.2478/hukin-2022-0097' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'avanzado (IRCRA ~22 encadene)', experiencia: 'capaces de dominadas lastradas a 5RM', objetivo: 'potencia / boulder' },
    limitaciones:
      'Una sola serie y un descanso fijo de 4 min: dosis y momento óptimos desconocidos; muestras por condición distintas (24/18/14) por restricciones COVID; calentamientos autoseleccionados; el sensor puede subestimar la potencia. No demuestra que entrenar dominadas lastradas a largo plazo mejore el grado.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-004',
    bloque: 'fuerza',
    afirmacion:
      'En escaladores de encadene avanzados y élite (n = 19), 10 semanas de entrenamiento de core dinámico o isométrico (2 sesiones/semana, 30–40 min) no difirieron entre sí; mejoraron tests generales de core (p. ej. flexión de tronco, aprox. +9–11 %) y el body-lift específico solo fue significativo en el grupo isométrico (+29,6 %), sin mejora del body lock-off en ninguno.',
    fuentes: [
      { autores: 'Saeterbakken, A. H.; Loken, E.; Scott, S.; Hermans, E.; Vereide, V. A.; Andersen, V.', anio: 2018, titulo: 'Effects of ten weeks dynamic or isometric core training on climbing performance among highly trained climbers', publicacion: 'PLoS ONE, 13(10), e0203766', doi: '10.1371/journal.pone.0203766' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'avanzado–élite', experiencia: '7,3 ± 5,6 años escalando', objetivo: 'general' },
    limitaciones:
      'n = 19 (inconsistencias internas 18/19), sin grupo control sin core; mantuvieron su escalada habitual; core alto de base (efecto techo); el body-lift no aísla el core; el propio resumen sobrestima el efecto; el body lock-off no cambió. Sin evidencia de que el core mejore el grado.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-005',
    bloque: 'fuerza',
    afirmacion:
      'En 31 boulderistas avanzados–élite, 5 semanas de fuerza dinámica de flexores de dedos (3 sesiones/semana, 4–10RM) aumentaron la fuerza 1RM (+11,5 %) pero no mejoraron el rendimiento en un test de 5 problemas en Kilter Board frente al control (p = 0,39, ES = 0,35). Los autores concluyen que la fuerza de dedos sola no parece suficiente.',
    fuentes: [
      { autores: 'Saeterbakken, A. H.; Bratland, E.; Andersen, V.; Stien, N.', anio: 2024, titulo: 'Five weeks of dynamic finger flexor strength training on bouldering performance and climbing-specific strength tests. A randomized controlled trial', publicacion: 'Frontiers in Physiology, 15', doi: '10.3389/fphys.2024.1461820' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'avanzado–élite (encadene IRCRA ~19–21)', experiencia: 'boulderistas regulares', objetivo: 'boulder' },
    limitaciones:
      'Baja potencia (31 completos; 3 mujeres); post-test 48–96 h tras la última sesión sin seguimiento; el test de boulder incluía pasos de coordinación que pueden no ser sensibles a la fuerza; estadísticos inconsistentes en el texto. El Kilter Board se usó como herramienta de test, no como intervención: no es evidencia sobre entrenar en board.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-006',
    bloque: 'fuerza',
    afirmacion:
      'En 35 escaladores intermedios–avanzados (mínimo 6a), 10 semanas de hangboard (2 sesiones de 48 min/semana) aumentaron frente al control la fuerza máxima de dominada isométrica en regleta de 23 mm (Fpeak +89,7 N frente a +20,0 N; p ajustada = 0,008), sin diferencia significativa en tasa de desarrollo de fuerza ni en resistencia de colgado. No se midió rendimiento de escalada.',
    fuentes: [
      { autores: 'Hermans, E.; Saeterbakken, A. H.; Vereide, V.; Nord, I. S. O.; Stien, N.; Andersen, V.', anio: 2022, titulo: 'The Effects of 10 Weeks Hangboard Training on Climbing Specific Maximal Strength, Explosive Strength, and Finger Endurance', publicacion: 'Frontiers in Sports and Active Living, 4, 888158', doi: '10.3389/fspor.2022.888158' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'intermedio–avanzado recreativo (6a o más)', experiencia: 'escaladores recreativos', objetivo: 'general' },
    limitaciones:
      'Sin test de boulder o vía: no prueba transferencia al grado; el grupo control escaló bastante más (aprox. 21,6 frente a 8,8 sesiones), lo que sesga la comparación; registros autodeclarados; solo el grupo de hangboard tuvo seguimiento del investigador; test a 90° de codo frente a entrenamiento con brazos extendidos; n = 35. Tema de dedos; se incluye porque cuantifica la fuerza de tracción en regleta.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-007',
    bloque: 'fuerza',
    afirmacion:
      'En un estudio transversal de 57 escaladores varones, la fuerza máxima y la tasa de desarrollo de fuerza de dominada isométrica en regleta de 23 mm (90° de codo) separaban a los élite de avanzados e intermedios (fuerza máxima ES aprox. 1,8), pero no distinguían a intermedios de avanzados.',
    fuentes: [
      { autores: 'Stien, N.; Vereide, V. A.; Saeterbakken, A. H.; Hermans, E.; Shaw, M. P.; Andersen, V.', anio: 2021, titulo: 'Upper body rate of force development and maximal strength discriminates performance levels in sport climbing', publicacion: 'PLoS ONE, 16(3), e0249353', doi: '10.1371/journal.pone.0249353' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'intermedio (IRCRA 10–17), avanzado (18–23), élite (24–27)', experiencia: 'varones', objetivo: 'deportiva y boulder (sin separar)' },
    limitaciones:
      'Transversal: no establece causalidad; solo varones; niveles autodeclarados; grupos pequeños e inconsistentes entre texto y tabla; CV inaceptable (17–31 %) en intermedios y avanzados, por lo que el test es poco fiable para cambios individuales; fuerza absoluta, no relativa al peso. Sin dosis de entrenamiento.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-008',
    bloque: 'fuerza',
    afirmacion:
      'En 14 escaladores intermedios aleatorizados durante 5 semanas (3 sesiones/semana) a priorizar boulder o vía, priorizar una disciplina no empeoró el rendimiento en la otra; ambos grupos mejoraron la fuerza de dominada en jug. La resistencia de antebrazo mejoró solo en el grupo de vía (+25 s) y la fuerza de dedos solo en el de boulder (+48 N), pero la interacción grupo por tiempo no fue significativa.',
    fuentes: [
      { autores: 'Stien, N.; Frøysaker, T. F.; Hermans, E.; Vereide, V. A.; Andersen, V.; Saeterbakken, A. H.', anio: 2021, titulo: 'The Effects of Prioritizing Lead or Boulder Climbing Among Intermediate Climbers', publicacion: 'Frontiers in Sports and Active Living, 3, 661167', doi: '10.3389/fspor.2021.661167' },
    ],
    nivel: 'A',
    aplicaA: { nivel: 'intermedio–avanzado amateur', experiencia: 'amateur', objetivo: 'boulder y deportiva' },
    limitaciones:
      'n = 7 por grupo (6 en vía): muy infradotado; diferencias entre grupos no significativas, solo sugerentes; 5 semanas de baja intensidad; volumen no monitorizado; test de vía influido por miedo o enlaces. Es la única evidencia directa en escaladores sobre compatibilidad fuerza–resistencia hallada y no es concluyente sobre interferencia.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-009',
    bloque: 'fuerza',
    afirmacion:
      'En una encuesta transversal de 267 competidores juveniles de EE. UU. (edad media 14 años), solo el 5,7 % indicó la edad segura correcta (18 años o más) para los doble dinos en campus board; el 76,2 % entrenaba en campus board y el 3,5 % de ellos refirió lesión de cartílago de crecimiento del dedo; la polea A2 fue la lesión más citada como común (35,5 %).',
    fuentes: [
      { autores: 'Meyers, R. N.; Hobbs, S. L.; Howell, D. R.; Provance, A. J.', anio: 2020, titulo: 'Are Adolescent Climbers Aware of the Most Common Youth Climbing Injury and Safe Training Practices?', publicacion: 'International Journal of Environmental Research and Public Health, 17(3), 812', doi: '10.3390/ijerph17030812' },
    ],
    nivel: 'B',
    aplicaA: { nivel: 'competidores juveniles', experiencia: 'adolescentes (media 14 ± 2,7 años)', objetivo: 'competición' },
    limitaciones:
      'Datos autodeclarados sin confirmación clínica; cuestionario no validado; respuesta del 43,6 %; no preguntó si realizaban doble dinos; transversal (sin causalidad); no mide el riesgo en adultos. Aporta prevalencia de uso y desconocimiento de la edad segura, no una tasa de lesión atribuible al campus.',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-010',
    bloque: 'fuerza',
    afirmacion:
      'Guía de la British Mountaineering Council aprobada por la Comisión Médica de la UIAA: los menores de 18 años no deben hacer campus con pies fuera o dinámico (placas de crecimiento aún no fusionadas); en adultos, el campus dinámico o con pies fuera es para escaladores experimentados, con calentamiento a fondo y al inicio de la sesión, y los doble dinos solo para muy experimentados.',
    fuentes: [
      { autores: 'British Mountaineering Council (aprobada por UIAA Medical Commission)', anio: 2024, titulo: 'Campus boards: guidance on use', publicacion: 'BMC (thebmc.co.uk)', url: 'https://thebmc.co.uk/en/campus-boards-guidance-on-use' },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'menores de 18 y adultos', experiencia: 'adultos experimentados para campus dinámico (sin umbral cuantitativo)', objetivo: 'general' },
    limitaciones:
      'Guía de consenso, no estudio; no fija umbrales cuantitativos de fuerza ni años de experiencia en adultos; la página no muestra año de publicación (2024 es el copyright del sitio, no confirmado como fecha); el documento de respaldo enlazado no se abrió; otros documentos citan cortes de 16–17 años (no verificados aquí).',
    verificada: V,
  },
  {
    id: 'EV-FUERZA-011',
    bloque: 'fuerza',
    afirmacion:
      'En una cohorte de 426 escaladores recreativos de rocódromo seguidos un año, usar campus board se asoció a lesión de extremidad superior (OR 2,48; IC95 % 1,23–5,02).',
    fuentes: [
      { autores: 'van Middelkoop, M.; Bruens, M.; Coert, J. H.; Selles, R.; Verhagen, E.; Bierma-Zeinstra, S.; Koes, B.', anio: 2015, titulo: 'Incidence and Risk Factors for Upper Extremity Climbing Injuries in Indoor Climbers', publicacion: 'International Journal of Sports Medicine, 36(10), 837–842', doi: '10.1055/s-0035-1547224' },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'recreativo, rocódromo', experiencia: 'no consta', objetivo: 'general' },
    limitaciones:
      'Solo se leyó el resumen en una ficha de repositorio, no el texto completo; asociación observacional (no causal), sin control por volumen de escalada confirmado; otras fuentes encontradas (no verificadas) hallan resultados discrepantes sobre el campus board. No cuantifica prerrequisitos.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
  {
    id: 'EV-FUERZA-012',
    bloque: 'fuerza',
    afirmacion:
      'En el metaanálisis de entrenamiento concurrente (21 estudios, 422 tamaños de efecto, población general y no escaladores), sumar resistencia a la fuerza redujo los efectos sobre la potencia (ES 0,91 solo fuerza frente a 0,55 concurrente) y, con carrera pero no con ciclismo, sobre fuerza e hipertrofia; la interferencia aumentaba con la frecuencia y duración del trabajo de resistencia.',
    fuentes: [
      { autores: 'Wilson, J. M.; Marin, P. J.; Rhea, M. R.; Wilson, S. M.; Loenneke, J. P.; Anderson, J. C.', anio: 2012, titulo: 'Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises', publicacion: 'Journal of Strength and Conditioning Research, 26(8), 2293–2307', doi: '10.1519/jsc.0b013e31823a3e2d' },
    ],
    nivel: 'C',
    aplicaA: { nivel: 'no escaladores', experiencia: 'no consta', objetivo: 'general (extrapolación)' },
    limitaciones:
      'No son escaladores y la resistencia estudiada (carrera, ciclismo) no es la de antebrazo; solo se leyó el resumen vía Europe PMC; extrapolar a escalada es una hipótesis sin respaldo directo. No hay ensayos de interferencia en escaladores.',
    verificada: { fecha: '2026-10-26', metodo: 'resumen' },
  },
]
