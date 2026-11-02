// Biblioteca de ejercicios: una ficha por cada ejercicio que puede proponer el motor. Puro: solo texto y constantes.
// Los números de las suspensiones salen de VALORES (motor), para que la ficha no se separe nunca de lo que se prescribe.
// Lo que no viene de un estudio lo dice y explica de dónde sale (entrenadores, prudencia o el propio protocolo).
import { FRACCION_INICIAL_REPEATERS, VALORES, type ParametroId } from '../../motor'
import type { DibujoId } from './dibujos'

export const FICHA_IDS = [
  'agarre-semiarqueado', 'repeaters-7-3', 'resistencia-10-6', 'suspension-maxima-10s', 'colgado-30mm', 'power-slap',
  'calentamiento-progresivo', 'calentamiento-barra',
  'bloques-limite', 'via-limite-cuerda', 'cuatro-por-cuatro', 'arc', 'on-offs', 'via-de-practica', 'practica-tecnica', 'video-autoevaluacion',
  'dominadas-lastradas', 'dominadas-explosivas', 'dominadas-excentricas', 'colgarse-barra',
  'retracciones-escapulares', 'flexiones', 'rotacion-externa-banda', 'ytw-banda', 'face-pull-banda', 'extensores-dedos-banda',
  'plancha-toques-hombro',
  'movilidad',
  'plancha-frontal', 'hollow', 'elevaciones-colgado', 'elevaciones-tumbado', 'plancha-lateral', 'rana', 'cadera-90-90',
  'dislocaciones-hombro',
  'dominadas-maximas', 'apertura-cadera',
  'pies-silenciosos', 'manos-pegadas', 'mismo-lado', 'placa-sin-manos', 'caidas-progresivas', 'respiracion-voy', 'tactica-encadene',
  'continuidad-5x3', 'up-down-up', 'repetir-vias', 'inthangs', 'suspensiones-largas', 'abrahangs', 'intermitentes-80', 'finger-curls',
  'dedos-en-barra', 'campus', 'paso-alto', 'tobillo',
] as const
export type FichaId = (typeof FICHA_IDS)[number]

export interface Ficha {
  id: FichaId
  titulo: string
  paraQue: string            // qué se busca, en 1-2 frases
  material: string
  pasos: string[]            // 3-7 pasos
  errores: string[]          // errores típicos
  paraSi: string[]           // cuándo parar
  parametros: ParametroId[]  // las reglas del motor que lo prescriben
  dibujo?: DibujoId          // esquema SVG de la posición clave
}

const fmt = (x: number): string => String(x).replace('.', ',')
const pct = (f: number): string => `${Math.round(f * 100)} %`

const REGLETA = `${VALORES['P-12'].regletaMinimaMm} mm`
const NOVEL = `Si llevas menos de ${VALORES['P-12'].anosMaximosPerfilNovel} años escalando, nunca uses una regleta de menos de ${REGLETA} ni el agarre arqueado completo (P-12).`

// Cuándo parar: comunes a todas las fichas (P-43 y P-44).
const PARA_DOLOR = 'Dolor de 2 o más sobre 10 en la zona que trabajas: para y apúntalo; el semáforo ajusta lo siguiente (P-43).'
const PARA_ALARMA = 'Chasquido, dolor súbito, hinchazón o pérdida de fuerza: para del todo y consulta a un fisioterapeuta (P-44).'
const PARA_SI = [PARA_DOLOR, PARA_ALARMA]
const SEGURIDAD: ParametroId[] = ['P-43', 'P-44']

const { trabajoS: R_T, descansoS: R_D } = VALORES['P-02']
const RF = VALORES['P-36']
const MAX = VALORES['P-18']
const T30 = VALORES['P-24']
const DOM = VALORES['P-39']
const ARC = VALORES['P-35']
const X4 = VALORES['P-37']
const LECTURA = `${VALORES['P-53'].minutosPrevisualizacion} min`

// Las suspensiones de consulta no se suman al plan: P-07 y P-12 limitan las sesiones de multipresa e intensas de dedos.
const SUSTITUYE = 'Si lo haces, que sustituya a una sesión de multipresa del plan, no que se sume (P-07, P-12).'

const PASOS_COLGARSE = [
  'Coloca las yemas en la regleta con agarre semiarqueado: falanges medias más o menos a 90° y el pulgar suelto.',
  'Hombros activos: escápulas abajo y codos casi estirados, sin bloquearlos.',
]

export const FICHAS: Record<FichaId, Ficha> = {
  'agarre-semiarqueado': {
    id: 'agarre-semiarqueado',
    titulo: 'Agarre semiarqueado frente a arqueado',
    paraQue: 'Es el agarre estándar de todas las suspensiones y tests: estandariza la carga y evita el arqueado completo con carga (P-10).',
    material: `Multipresa, regleta de ${REGLETA}`,
    pasos: [
      'Semiarqueado: las falanges medias forman más o menos un ángulo recto y la última falange queda casi plana sobre la regleta.',
      'El pulgar queda suelto, sin montarlo sobre el índice.',
      'Arqueado completo: el pulgar sobre el índice y la segunda falange muy doblada. No lo uses con carga.',
      'Mantén el mismo agarre de la primera a la última repetición.',
      NOVEL,
    ],
    errores: [
      'Cerrar el agarre hacia el arqueado cuando llega el cansancio.',
      'Abrir del todo los dedos hasta colgar solo de la punta.',
    ],
    paraSi: [
      'No puedes mantener el semiarqueado: termina la serie aunque falten repeticiones.',
      ...PARA_SI,
    ],
    parametros: ['P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'repeaters-7-3': {
    id: 'repeaters-7-3',
    titulo: `Repeaters ${R_T}:${R_D}`,
    paraQue: 'Suspensiones submáximas repetidas para mejorar la fuerza y la resistencia de dedos sin llegar al fallo.',
    material: `Multipresa, regleta de ${REGLETA}`,
    pasos: [
      ...PASOS_COLGARSE,
      `Cada repetición: ${R_T} s colgado y ${R_D} s de descanso; ${VALORES['P-03'].repeticionesPorSerie} repeticiones forman una serie.`,
      `Descansa ${fmt(VALORES['P-05'].descansoEntreSeriesS / 60)} min entre series; las series y los bloques los marca la sesión.`,
      `Carga: el ${pct(FRACCION_INICIAL_REPEATERS)} de tu test las primeras sesiones y, como mucho, el ${pct(VALORES['P-06'].fraccionMaximaRepeaters)} después. Sin test vigente, por esfuerzo (6-7 de 10).`,
      NOVEL,
    ],
    errores: [
      'Llegar al fallo: tienes que completar todas las repeticiones.',
      'Soltar de golpe o dejarte caer sobre los hombros.',
      'Acortar los descansos para terminar antes.',
    ],
    paraSi: [
      'No completas una repetición con buena forma: termina la serie ahí.',
      ...PARA_SI,
    ],
    parametros: ['P-01', 'P-02', 'P-03', 'P-05', 'P-06', 'P-09', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'resistencia-10-6': {
    id: 'resistencia-10-6',
    titulo: `Resistencia ${RF.trabajoS}:${RF.descansoS} al ${pct(RF.fraccion)}`,
    paraQue: 'Suspensiones intermitentes submáximas para la resistencia de dedos: el protocolo con ensayo (Devise 2022) que mejoró la resistencia sin necesidad de ir al máximo.',
    material: `Multipresa, regleta de ${REGLETA}`,
    pasos: [
      ...PASOS_COLGARSE,
      `Cada repetición: ${RF.trabajoS} s colgado y ${RF.descansoS} s de descanso, hasta ${RF.repeticiones} repeticiones o hasta que la siguiente ya no saldría limpia: para una antes del fallo (en semana de descarga, ${RF.repeticionesDescarga} como mucho).`,
      `Haz ${RF.series} series con ${fmt(RF.descansoSeriesS / 60)} min entre series.`,
      `Carga: el ${pct(RF.fraccion)} de tu fuerza máxima del último test, fija. Sin test: empieza con una carga que sostengas con margen y ajústala en la segunda serie.`,
      NOVEL,
    ],
    errores: [
      'Subir la carga para llegar antes al fallo: el estímulo está en acumular repeticiones a carga moderada.',
      'Cerrar el agarre hacia el arqueado al final de cada suspensión.',
    ],
    paraSi: [
      'No sostienes los 10 s con buena forma: la serie ha terminado.',
      ...PARA_SI,
    ],
    parametros: ['P-36', 'P-09', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'suspension-maxima-10s': {
    id: 'suspension-maxima-10s',
    titulo: `Suspensión máxima de ${MAX.duracionS} s (test)`,
    paraQue: 'Medir tu fuerza máxima de dedos para calcular las cargas. Es un test, no un entrenamiento.',
    material: `Multipresa, regleta de ${REGLETA}, lastre o polea para descargar`,
    pasos: [
      `Tras el calentamiento, sube la carga en escalones con suspensiones cortas y fáciles.`,
      ...PASOS_COLGARSE,
      `Cuelga ${MAX.duracionS} s con la carga más alta que puedas sostener entero.`,
      `Hasta ${MAX.intentos} intentos con ${MAX.descansoS / 60} min de descanso; vale el mejor completado.`,
      'Apunta el lastre (o la descarga) del mejor intento y tu peso de hoy.',
      NOVEL,
    ],
    errores: [
      'Saltarse la subida de carga en escalones.',
      'Dar por bueno un intento en el que soltaste antes de tiempo o cambiaste el agarre.',
    ],
    paraSi: [
      'El agarre se cierra hacia el arqueado: ese intento no vale y no subas más.',
      ...PARA_SI,
    ],
    parametros: ['P-17', 'P-18', 'P-09', 'P-10', 'P-12', 'P-49', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'colgado-30mm': {
    id: 'colgado-30mm',
    titulo: `Colgado en canto de ${T30.regletaMm} mm`,
    paraQue: `Medir tu resistencia de dedos: segundos colgado a peso corporal hasta soltar. Es el test de la batería IRCRA (r 0,81-0,87 con el grado; Draper 2021); como varía bastante de un día a otro, solo un cambio de un ${VALORES['P-19'].colgadoPct} % o más cuenta como real.`,
    material: `Multipresa con canto de ${T30.regletaMm} mm (polea o un taburete para los pies si no llegas a ${T30.minimoS} s)`,
    pasos: [
      'Descansa unos minutos tras la suspensión máxima.',
      ...PASOS_COLGARSE,
      'Cuélgate a dos manos, sin lastre, cuando acabe la cuenta atrás de 10 s: el cronómetro cuenta hacia arriba.',
      'Aguanta hasta soltar o hasta perder el semiarqueado y pulsa «No puedo más».',
      `Si no llegas a ${T30.minimoS} s, descansa 3 min y repítelo quitando peso con polea o apoyando un poco los pies; apunta ese tiempo y hazlo igual la próxima vez.`,
      NOVEL,
    ],
    errores: [
      'Seguir con el agarre cerrado hacia el arqueado para arañar segundos.',
      'Cambiar de canto, de agarre o de descarga entre un test y otro: no serían comparables.',
    ],
    paraSi: [
      'Pierdes el semiarqueado: el test termina ahí.',
      ...PARA_SI,
    ],
    parametros: ['P-24', 'P-19', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'power-slap': {
    id: 'power-slap',
    titulo: 'Power slap',
    paraQue: `Medir la potencia de tirón con una cinta métrica: una dominada explosiva y una palmada lo más alto posible. Es muy repetible (CCI 0,95-0,98; Faggian 2024) y, con agarre estrecho, se relaciona con el grado (r 0,69-0,79); cambio real a partir de ${VALORES['P-19'].powerSlapCm} cm o un ${VALORES['P-19'].powerSlapPct} %.`,
    material: 'Barra o presas grandes junto a una pared, cinta métrica pegada en vertical y tiza en la mano',
    pasos: [
      'Pega la cinta métrica en la pared, con el 0 a la altura de la mano que cuelga.',
      'Cuélgate con agarre estrecho (manos a la anchura de los hombros), los brazos estirados y las escápulas activas.',
      'Tira lo más explosivo que puedas y, arriba, suelta una mano y da una palmada en la cinta.',
      'Apunta los cm de la marca por encima de la mano. Descansa 1 min.',
      '3 intentos: vale el mejor.',
    ],
    errores: ['Balancearte o patear para subir más.', 'Cambiar la altura del 0 o el agarre entre tests: no serían comparables.'],
    paraSi: ['Notas el codo o el hombro: para.', ...PARA_SI],
    parametros: ['P-19', 'P-39', ...SEGURIDAD],
    dibujo: 'dominada',
  },
  'calentamiento-progresivo': {
    id: 'calentamiento-progresivo',
    titulo: 'Calentamiento de menos a más',
    paraQue: `Unos ${VALORES['P-49'].minutos} min para llegar preparado al trabajo intenso. No hay prueba de que prevenga lesiones; se hace por prudencia.`,
    material: 'Ninguno; presas fáciles o vías y bloques por debajo de tu nivel',
    pasos: [
      'Movilidad suave de hombros, muñecas y cadera.',
      'Escalada fácil o vías y bloques muy por debajo de tu nivel.',
      'Agarres progresivos: de presas grandes a más pequeñas, sin cargar del todo.',
      'Sube el esfuerzo poco a poco hasta un 4 de 10 al final.',
    ],
    errores: [
      'Empezar directamente en presas pequeñas o al límite.',
      'Cansarte en el calentamiento.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-49', ...SEGURIDAD],
  },
  'calentamiento-barra': {
    id: 'calentamiento-barra',
    titulo: 'Calentamiento en barra',
    paraQue: 'Preparar hombros, codos y espalda antes de las dominadas lastradas.',
    material: 'Barra',
    pasos: [
      'Movilidad de hombro y escápulas, sin carga.',
      'Cuélgate de la barra unos segundos, activo y pasivo (mira la ficha «Colgarse de la barra»).',
      'Unas retracciones escapulares colgado.',
      'Dominadas sin lastre, pocas y fáciles, de menos a más.',
    ],
    errores: [
      'Empezar con lastre.',
      'Hacer dominadas hasta el fallo antes de las series de trabajo.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-39', 'P-49', ...SEGURIDAD],
  },
  'bloques-limite': {
    id: 'bloques-limite',
    titulo: 'Bloques al límite',
    paraQue: 'Trabajar movimientos duros cerca de tu máximo. Cuenta como sesión intensa de dedos (P-15).',
    material: 'Rocódromo de bloque o board',
    pasos: [
      'Calienta y haz unos bloques progresivos por debajo de tu nivel.',
      'Elige bloques cerca de tu límite, que no encadenas a la primera.',
      'Lee el bloque antes de cada intento (P-53).',
      'Hasta 4 intentos por bloque con 3-4 min de descanso entre intentos: pocos intentos de calidad y descanso completo, como recomiendan los entrenadores para la potencia.',
      'Cambia de bloque cuando no progreses.',
    ],
    errores: [
      'Descansar poco y acumular intentos de mala calidad.',
      'Cerrar presas pequeñas en arqueado completo.',
      'Seguir cuando ya no sale ningún movimiento.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-15', 'P-53', ...SEGURIDAD],
  },
  'via-limite-cuerda': {
    id: 'via-limite-cuerda',
    titulo: 'Vía al límite con cuerda',
    paraQue: 'Intentos a una vía (o a tu proyecto) que no encadenas, con descansos largos y activos para llegar fresco al siguiente.',
    material: 'Cuerda, arnés y un compañero que asegure',
    pasos: [
      'Calienta y haz 2 vías progresivas por debajo de tu nivel.',
      `Lee la vía hasta ${LECTURA} antes de cada intento (P-53).`,
      'En los reposos, sacude el antebrazo con el brazo colgando (P-52).',
      'Después de cada intento, 20 min de recuperación activa suave (pedalear o caminar), no reposo pasivo (P-51).',
      `Haz los intentos que marque la sesión: nunca más de ${VALORES['P-61'].maxIntentos} (P-61).`,
    ],
    errores: [
      'Encadenar intentos sin los 20 min de recuperación.',
      'Apoyar la mano en la presa para descansar en lugar de sacudirla colgando.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-51', 'P-52', 'P-53', 'P-61', ...SEGURIDAD],
  },
  'cuatro-por-cuatro': {
    id: 'cuatro-por-cuatro',
    titulo: '4x4',
    paraQue: 'Resistencia: encadenar bloques fáciles para acumular bombeo. El objetivo es el bombeo, no la dificultad.',
    material: 'Rocódromo de bloque',
    pasos: [
      `Elige ${X4.bloques} bloques fáciles para tu nivel.`,
      `Escálalos seguidos, uno tras otro: eso es una vuelta.`,
      `Descansa ${X4.descansoVueltaMin} min y repite hasta ${X4.vueltas} vueltas: la pauta clásica de entrenadores, sin ensayo que la mida.`,
      'Si fallas en un bloque, cámbialo por uno más fácil.',
    ],
    errores: [
      'Elegir bloques demasiado duros: la sesión se convierte en bloque al límite.',
      'Acortar los descansos entre vueltas.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-37', ...SEGURIDAD],
  },
  arc: {
    id: 'arc',
    titulo: 'ARC (escalada continua suave)',
    paraQue: 'Capacidad aeróbica del antebrazo: mucho tiempo escalando sin bombeo marcado.',
    material: 'Rocódromo (travesía o vías fáciles)',
    pasos: [
      'Elige una travesía o vías muy por debajo de tu nivel.',
      `Escala sin parar ${ARC.minutosSerie} min (o ${ARC.minutosSerieCorta} si va corta la sesión); ${ARC.series}-${ARC.seriesMax} series según el tiempo.`,
      'Esfuerzo 3-4 de 10: puedes hablar mientras escalas.',
      `Descansa ${ARC.descansoMin} min entre series.`,
    ],
    errores: [
      'Subir la dificultad hasta notar bombeo marcado.',
      'Quedarte parado colgado en la misma presa.',
    ],
    paraSi: [
      'Notas bombeo: baja la dificultad.',
      ...PARA_SI,
    ],
    parametros: ['P-35', ...SEGURIDAD],
  },
  'on-offs': {
    id: 'on-offs',
    titulo: 'On-offs (1 min escalando / 1 min de descanso)',
    paraQue: 'Capacidad del antebrazo con intervalos: se alterna con el ARC continuo. Protocolo de entrenadores (Lattice), sin ensayo.',
    material: 'Rocódromo (bloques o vías fáciles, autoasegurador) o roca',
    pasos: [
      'Elige un recorrido unos 2 grados por debajo de tu nivel a vista.',
      `Escala 1 min y descansa 1 min; repite ${ARC.onOffs} veces (${ARC.onOffsDescarga} en semana de descarga).`,
      'El bombeo debe llegar solo en las últimas vueltas.',
      'En el descanso, sacude los brazos colgando (P-52).',
    ],
    errores: ['Empezar demasiado duro y bombearse en la tercera vuelta.', 'Alargar los descansos.'],
    paraSi: ['Te bombeas pronto: baja la dificultad.', ...PARA_SI],
    parametros: ['P-35', ...SEGURIDAD],
  },
  'via-de-practica': {
    id: 'via-de-practica',
    titulo: 'Tu vía de práctica',
    paraQue: 'Repetir la misma vía de una sesión a otra hasta que salga fluida: en novatos, repetir mejoró más la fluidez en esa vía que cambiar cada vez (Hacques 2022).',
    material: 'Rocódromo (o una vía fácil en roca)',
    pasos: [
      'Elige una vía cómoda para tu nivel con algún paso que no te salga limpio.',
      'Hazle 2-3 pegues buscando que salga sin paradas ni reajustes.',
      'Repítela en las siguientes sesiones de técnica.',
      'Cuando ya fluya, o tras unas 7 sesiones con ella, elige otra (P-54).',
    ],
    errores: ['Subir de dificultad: aquí manda la fluidez, no el grado.', 'Cambiar de vía cada sesión.'],
    paraSi: ['Te bombeas: es demasiado dura para practicar técnica.', ...PARA_SI],
    parametros: ['P-54', ...SEGURIDAD],
  },
  'practica-tecnica': {
    id: 'practica-tecnica',
    titulo: 'Práctica técnica',
    paraQue: 'Mejorar la forma de moverte a esfuerzo cómodo: paso alto, drop knee, talón y pies precisos.',
    material: 'Rocódromo o roca; vías y bloques cómodos',
    pasos: [
      `Lee la vía o el bloque hasta ${LECTURA} antes de empezar (P-53).`,
      'Elige un gesto para la sesión: paso alto, drop knee, talón o pies precisos.',
      'Pies precisos: mira el pie hasta que se apoye y no lo recoloques.',
      'Varía vías y tipos de presa; no repitas la misma vía para técnica más de unas 7 sesiones (P-54).',
      'Esfuerzo 4-5 de 10: si se te va la técnica, baja de nivel.',
    ],
    errores: [
      'Convertir la sesión en una de grado.',
      'Repetir siempre la misma vía.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-53', 'P-54', ...SEGURIDAD],
  },
  'video-autoevaluacion': {
    id: 'video-autoevaluacion',
    titulo: 'Vídeo y autoevaluación de técnica (1-7)',
    paraQue: 'Verte desde fuera para corregir la técnica y puntuarla en el test.',
    material: 'Móvil con trípode o un compañero que grabe',
    pasos: [
      'Graba una vía o un bloque entero, con los pies a la vista.',
      'Revísalo después, mejor junto a un vídeo de alguien que lo haga bien (P-55).',
      'Puntúa de 1 a 7 cada gesto: paso alto, drop knee, talón y pies precisos (P-27).',
      'Apunta una cosa concreta para la próxima sesión.',
    ],
    errores: [
      'Grabar solo las manos.',
      'Ponerte la nota por el grado y no por cómo te mueves.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-55', 'P-27', ...SEGURIDAD],
  },
  'dominadas-lastradas': {
    id: 'dominadas-lastradas',
    titulo: 'Dominadas lastradas',
    paraQue: 'Fuerza de tirón, opcional: no hay ensayo que la ligue al grado (P-39).',
    material: 'Barra y lastre (cinturón o mochila)',
    pasos: [
      'Calienta en barra (mira «Calentamiento en barra»).',
      'Agarre en la barra con las palmas hacia delante, un poco más abierto que los hombros.',
      'Desde colgado con escápulas activas, sube hasta la barbilla por encima de la barra y baja controlando.',
      `${DOM.series} series de ${DOM.repeticiones} con un lastre que te deje ${DOM.repeticionesEnReserva} repeticiones en reserva y ${DOM.descansoMin} min de descanso: pauta de fuerza general sin llegar al fallo.`,
      'En barra, nunca en la multipresa.',
    ],
    errores: [
      'Llegar al fallo.',
      'Balancearte o dar tirones.',
      'Hacerlas el día de una sesión intensa de dedos.',
    ],
    paraSi: [
      'Notas el codo o el hombro: para.',
      ...PARA_SI,
    ],
    parametros: ['P-39', ...SEGURIDAD],
    dibujo: 'dominada',
  },
  'dominadas-explosivas': {
    id: 'dominadas-explosivas',
    titulo: 'Dominadas explosivas',
    paraQue: 'Potencia de tirón sin campus: subir lo más rápido posible (Vigouroux y Devise 2024, en avanzados). El estudio no publica las series: pocas repeticiones y lejos del fallo para que cada una sea rápida.',
    material: 'Barra',
    pasos: [
      'Calienta en barra (mira «Calentamiento en barra»).',
      'Desde colgado con escápulas activas, sube lo más rápido que puedas.',
      'Baja controlando, sin dejarte caer.',
      `${VALORES['P-73'].explosivasSeries} series de ${VALORES['P-73'].repMin}-${VALORES['P-73'].repMax}, lejos del fallo, con ${VALORES['P-73'].explosivasDescansoMin} min de descanso.`,
      'Para la serie en cuanto pierdas velocidad.',
    ],
    errores: ['Dar tirones o balancearte.', 'Llegar al fallo.', 'Hacerlas el día de una sesión intensa de dedos.'],
    paraSi: ['Notas el codo o el hombro: para.', ...PARA_SI],
    parametros: ['P-73', 'P-39', ...SEGURIDAD],
    dibujo: 'dominada',
  },
  'dominadas-excentricas': {
    id: 'dominadas-excentricas',
    titulo: 'Dominadas excéntricas',
    paraQue: 'Fuerza y potencia de tirón con la bajada lenta (Vigouroux y Devise 2024, en avanzados). El estudio no publica las series: pocas y controladas para no cargar los codos.',
    material: 'Barra (una silla o un salto para subir)',
    pasos: [
      'Ponte arriba con la barbilla sobre la barra, con un salto o apoyando en una silla.',
      `Baja despacio, en ${VALORES['P-73'].bajadaSMin}-${VALORES['P-73'].bajadaSMax} s, hasta los brazos estirados.`,
      `${VALORES['P-73'].excentricasSeries} series de ${VALORES['P-73'].repMin}-${VALORES['P-73'].repMax} bajadas con ${VALORES['P-73'].excentricasDescansoMin} min de descanso.`,
      'Vuelve a subir sin tirar de los brazos.',
    ],
    errores: ['Dejarse caer al final de la bajada.', 'Encoger los hombros.'],
    paraSi: ['Notas el codo o el hombro: para.', ...PARA_SI],
    parametros: ['P-73', 'P-39', ...SEGURIDAD],
    dibujo: 'dominada',
  },
  'colgarse-barra': {
    id: 'colgarse-barra',
    titulo: 'Colgarse de la barra (activo y pasivo)',
    paraQue: 'Preparar hombros y espalda colgando del peso del cuerpo, sin cargar los dedos.',
    material: 'Barra',
    pasos: [
      'Agárrate con toda la mano, sin apurar los dedos.',
      'Pasivo: deja que los hombros suban hacia las orejas, sin dolor, unos segundos.',
      'Activo: baja las escápulas y aléjalas de las orejas sin doblar los codos.',
      'Alterna pasivo y activo unas veces y baja con los pies.',
    ],
    errores: [
      'Saltar al suelo desde arriba.',
      'Colgarte pasivo con dolor de hombro.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-39', 'P-49', ...SEGURIDAD],
    dibujo: 'retraccion-barra',
  },
  'retracciones-escapulares': {
    id: 'retracciones-escapulares',
    titulo: 'Retracciones escapulares colgado',
    paraQue: 'Fuerza de los músculos que controlan la escápula, en cadena cerrada, como el programa de EV-LESION-007.',
    material: 'Barra',
    pasos: [
      'Cuélgate de la barra con toda la mano y los brazos estirados.',
      'Sin doblar los codos, baja y junta las escápulas: el cuerpo sube un poco.',
      'Aguanta 1-2 s arriba y vuelve despacio a colgado.',
      'Series y repeticiones las marca la sesión.',
    ],
    errores: [
      'Doblar los codos: entonces es una dominada.',
      'Balancearte.',
    ],
    paraSi: [
      'Notas los dedos: hazlas con apoyo de los pies en el suelo o sáltalas.',
      ...PARA_SI,
    ],
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'retraccion-barra',
  },
  flexiones: {
    id: 'flexiones',
    titulo: 'Flexiones',
    paraQue: 'Empuje: el antagonista de la escalada, en cadena cerrada.',
    material: 'Ninguno',
    pasos: [
      'Manos en el suelo algo más abiertas que los hombros y el cuerpo recto de la cabeza a los talones.',
      'Baja hasta que el pecho quede cerca del suelo, con los codos a unos 45° del cuerpo.',
      'Sube empujando el suelo sin hundir la cadera.',
      'Si no salen las repeticiones con buena forma, apoya las rodillas o las manos en un banco.',
      'Series y repeticiones las marca la sesión.',
    ],
    errores: [
      'Hundir la cadera o subirla.',
      'Abrir los codos en cruz.',
    ],
    paraSi: [
      'Molestia en la muñeca: apoya sobre los puños o con las manos en un banco.',
      ...PARA_SI,
    ],
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'flexion',
  },
  'rotacion-externa-banda': {
    id: 'rotacion-externa-banda',
    titulo: 'Rotación externa con banda',
    paraQue: 'Fuerza de los rotadores externos del hombro, con fase excéntrica (bajada lenta).',
    material: 'Banda elástica',
    pasos: [
      'Ata la banda a la altura del codo y ponte de lado.',
      'Codo pegado al costado y doblado a 90°; puedes poner una toalla entre el codo y el cuerpo.',
      'Gira el antebrazo hacia fuera sin separar el codo.',
      'Vuelve en 3 s, despacio: esa bajada es la fase excéntrica.',
      'Cambia de brazo. Series y repeticiones las marca la sesión.',
    ],
    errores: [
      'Separar el codo del cuerpo.',
      'Dejar que la banda tire en la vuelta.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'rotacion-externa',
  },
  'ytw-banda': {
    id: 'ytw-banda',
    titulo: 'Y-T-W con banda',
    paraQue: 'Fuerza de la parte media y baja del trapecio y de los rotadores, en tres posiciones.',
    material: 'Banda elástica',
    pasos: [
      'De pie, inclinado un poco hacia delante, con la banda entre las manos y los brazos estirados delante.',
      'Y: sube los brazos en diagonal por encima de la cabeza, separando la banda.',
      'T: abre los brazos en cruz a la altura de los hombros.',
      'W: con los codos doblados, llévalos atrás juntando las escápulas.',
      'Las repeticiones de cada letra las marca la sesión.',
    ],
    errores: [
      'Subir los hombros hacia las orejas.',
      'Arquear la zona lumbar.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'ytw',
  },
  'face-pull-banda': {
    id: 'face-pull-banda',
    titulo: 'Face pull con banda',
    paraQue: 'Tirón horizontal con rotación externa: fuerza de la parte posterior del hombro.',
    material: 'Banda elástica',
    pasos: [
      'Ata la banda a la altura de la cara y agárrala con las palmas hacia abajo.',
      'Tira hacia la cara con los codos altos, por encima de las manos.',
      'Al final, gira las manos hacia atrás y junta las escápulas.',
      'Vuelve despacio. Series y repeticiones las marca la sesión.',
    ],
    errores: [
      'Bajar los codos: se convierte en un remo.',
      'Echar el cuerpo atrás para tirar.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'face-pull',
  },
  'extensores-dedos-banda': {
    id: 'extensores-dedos-banda',
    titulo: 'Extensores de dedos con banda',
    paraQue: 'Opcional: trabajar los extensores de los dedos. Su relación con la lesión es especulativa (P-41).',
    material: 'Goma o banda elástica pequeña',
    pasos: [
      'Pasa la goma por fuera de los cinco dedos, juntos y algo doblados.',
      'Abre los dedos contra la goma todo lo que puedas.',
      'Vuelve despacio.',
      'Cambia de mano. Series y repeticiones las marca la sesión.',
    ],
    errores: [
      'Una goma tan dura que no deja abrir del todo.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-41', ...SEGURIDAD],
  },
  'plancha-toques-hombro': {
    id: 'plancha-toques-hombro',
    titulo: 'Plancha con toques de hombro',
    paraQue: 'Estabilidad del hombro y del tronco en cadena cerrada.',
    material: 'Ninguno',
    pasos: [
      'Plancha alta: manos bajo los hombros y el cuerpo recto.',
      'Separa un poco los pies para no girar la cadera.',
      'Lleva una mano al hombro contrario y vuelve; alterna las manos.',
      'Empuja el suelo con la mano de apoyo para que la escápula no se hunda.',
      'El tiempo de cada serie lo marca la sesión.',
    ],
    errores: [
      'Balancear la cadera a cada toque.',
      'Hundir la zona lumbar.',
    ],
    paraSi: [
      'Molestia en la muñeca: apoya sobre los puños o los antebrazos.',
      ...PARA_SI,
    ],
    parametros: ['P-41', ...SEGURIDAD],
    dibujo: 'plancha',
  },
  movilidad: {
    id: 'movilidad',
    titulo: 'Movilidad de cadera, hombro y muñecas sin carga',
    paraQue: 'Moverse en rangos cómodos sin cargar, para empezar, terminar o en días con molestias. Ningún estudio fija sus minutos; los entrenadores proponen bloques cortos, de 10-15 min.',
    material: 'Ninguno',
    pasos: [
      'Hombro: círculos de brazos y llevar los brazos arriba y atrás, sin peso ni bandas.',
      'Escápulas: subir, bajar, juntar y separar despacio, de pie.',
      'Muñecas: círculos y flexión y extensión suaves, sin apoyar peso.',
      'Cadera: círculos, aperturas y sentadilla profunda con apoyo.',
      'Solo rangos sin dolor; respira tranquilo.',
    ],
    errores: [
      'Forzar el rango con rebotes.',
      'Usar peso o bandas cuando el semáforo pide trabajo sin carga.',
    ],
    paraSi: PARA_SI,
    parametros: ['P-41', 'P-64', ...SEGURIDAD],
  },
  // Core y movilidad (P-72): no hay estudios de core en escaladores; ejercicios habituales de tensión corporal, en dosis cortas.
  'plancha-frontal': {
    id: 'plancha-frontal',
    titulo: 'Plancha frontal',
    paraQue: 'Tensión del tronco: mantener el cuerpo recto como en un desplome con los pies apoyados. No hay estudios de core en escaladores: dosis corta y suave.',
    material: 'Ninguno (una esterilla si la hay)',
    pasos: [
      'Antebrazos en el suelo, codos bajo los hombros.',
      'Cuerpo recto de la cabeza a los talones: aprieta glúteos y abdomen.',
      'Respira sin soltar la tensión; la mirada al suelo.',
      'Para la serie cuando la cadera empiece a caer.',
    ],
    errores: ['Hundir la zona lumbar.', 'Subir la cadera para descansar.', 'Aguantar la respiración.'],
    paraSi: ['Molestia lumbar: acorta el tiempo o apoya las rodillas.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
    dibujo: 'plancha',
  },
  hollow: {
    id: 'hollow',
    titulo: 'Hollow',
    paraQue: 'Tensión de la parte delantera del tronco, la que se pierde cuando los pies se despegan en un desplome. No hay estudios de core en escaladores: dosis corta y suave.',
    material: 'Ninguno (una esterilla si la hay)',
    pasos: [
      'Tumbado boca arriba, pega la zona lumbar al suelo.',
      'Despega hombros y piernas del suelo, brazos estirados hacia atrás.',
      'Mantén la lumbar pegada todo el tiempo.',
      'Más fácil: rodillas dobladas o brazos junto al cuerpo.',
    ],
    errores: ['Que la lumbar se despegue del suelo.', 'Tirar del cuello hacia arriba.'],
    paraSi: ['Molestia lumbar: dobla las rodillas y acorta el tiempo.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'elevaciones-colgado': {
    id: 'elevaciones-colgado',
    titulo: 'Elevaciones de piernas colgado',
    paraQue: 'Subir los pies con el tronco firme, como al poner un pie alto en un desplome. No hay estudios de core en escaladores: dosis corta y suave.',
    material: 'Barra de dominadas',
    pasos: [
      'Cuélgate de la barra con agarre cómodo y los hombros activos (no colgado de los ligamentos).',
      'Sube las rodillas al pecho sin balancearte; más difícil: piernas estiradas.',
      'Baja despacio, en unos 2 s.',
      'Si te balanceas, para un momento antes de la siguiente.',
    ],
    errores: ['Balancearse para subir.', 'Hombros encogidos y sueltos.', 'Bajar de golpe.'],
    paraSi: ['Molestia en dedos, muñeca u hombro: hazlas tumbado.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'elevaciones-tumbado': {
    id: 'elevaciones-tumbado',
    titulo: 'Elevaciones de piernas tumbado',
    paraQue: 'La versión sin colgarse de las elevaciones de piernas: sin barra o sin poder cargar dedos y hombros. Dosis corta y suave.',
    material: 'Ninguno (una esterilla si la hay)',
    pasos: [
      'Tumbado boca arriba, manos junto a la cadera o bajo los glúteos.',
      'Pega la zona lumbar al suelo.',
      'Sube las piernas hasta la vertical y bájalas despacio sin tocar el suelo.',
      'Más fácil: con las rodillas dobladas.',
    ],
    errores: ['Arquear la espalda al bajar.', 'Bajar de golpe.'],
    paraSi: ['Molestia lumbar: dobla las rodillas y acorta el recorrido.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'plancha-lateral': {
    id: 'plancha-lateral',
    titulo: 'Plancha lateral',
    paraQue: 'Tensión lateral del tronco, la que sujeta la cadera pegada a la pared en los movimientos de lado. No hay estudios de core en escaladores: dosis corta y suave.',
    material: 'Ninguno (una esterilla si la hay)',
    pasos: [
      'De lado, apoyado en un antebrazo con el codo bajo el hombro.',
      'Sube la cadera hasta que el cuerpo quede recto.',
      'Aguanta sin dejar caer la cadera; luego el otro lado.',
      'Más fácil: con la rodilla de abajo apoyada.',
    ],
    errores: ['Dejar caer la cadera.', 'Girar el pecho hacia el suelo.'],
    paraSi: ['Molestia en el hombro de apoyo: apoya la rodilla o acorta el tiempo.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
    dibujo: 'plancha',
  },
  'dominadas-maximas': {
    id: 'dominadas-maximas',
    titulo: 'Dominadas máximas',
    paraQue: `Test de casa: cuántas dominadas estrictas seguidas haces. Se relaciona con el grado (r 0,73-0,77; Faggian 2024), aunque en niveles bajos es menos fiable; cambio real a partir de ${VALORES['P-19'].dominadas}.`,
    material: 'Barra',
    pasos: [
      'Calienta en barra (mira «Calentamiento en barra»).',
      'Agarre prono a la anchura de los hombros, desde brazos estirados.',
      'Sube hasta pasar la barbilla sobre la barra y baja hasta estirar los brazos.',
      'Sigue sin pararte arriba ni abajo hasta no poder hacer otra completa.',
      'Apunta solo las completas.',
    ],
    errores: ['Contar las que se quedan a medias.', 'Patear o balancearte.', 'Cambiar de agarre entre tests.'],
    paraSi: ['Notas el codo o el hombro: para.', ...PARA_SI],
    parametros: ['P-19', 'P-39', ...SEGURIDAD],
    dibujo: 'dominada',
  },
  'apertura-cadera': {
    id: 'apertura-cadera',
    titulo: 'Apertura de cadera (straddle de pie)',
    paraQue: `Test de casa de movilidad: cuánto abres las piernas de pie. Se relacionó con el nivel en escaladores de competición (r −0,48; Draga 2020). Menos cm es más apertura; cambio real a partir de ${VALORES['P-19'].caderaCm} cm.`,
    material: 'Suelo que no resbale (o calcetines sobre parqué) y una cinta métrica',
    pasos: [
      'De pie, con las piernas estiradas y los pies hacia delante, ábrelas despacio todo lo que puedas.',
      'Apoya las manos en el suelo o en una silla para no caerte; sin rebotes.',
      'Mide los cm del suelo a la ingle (o pide a alguien que lo mida).',
      'Dos intentos: vale el mejor.',
    ],
    errores: ['Rebotar para bajar más.', 'Girar los pies hacia fuera un test y hacia delante el siguiente.'],
    paraSi: ['Pinchazo en la ingle o en la rodilla: sube un poco.', ...PARA_SI],
    parametros: ['P-19', 'P-72', ...SEGURIDAD],
  },
  rana: {
    id: 'rana',
    titulo: 'Rana',
    paraQue: 'Apertura de cadera para pegar la cadera a la pared con los pies abiertos. La apertura de cadera se asocia (poco) al nivel; la dosis sigue los bloques cortos que proponen los entrenadores.',
    material: 'Esterilla o algo blando para las rodillas',
    pasos: [
      'A cuatro patas, separa las rodillas todo lo que sea cómodo, con los pies hacia fuera.',
      'Tobillos a la altura de las rodillas.',
      'Lleva la cadera hacia atrás despacio hasta notar estiramiento en la ingle.',
      'Respira tranquilo y mantén sin rebotes.',
    ],
    errores: ['Rebotar.', 'Forzar hasta notar dolor en la rodilla.'],
    paraSi: ['Dolor en la rodilla o pinchazo en la ingle: cierra un poco las rodillas.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'cadera-90-90': {
    id: 'cadera-90-90',
    titulo: '90/90 de cadera',
    paraQue: 'Rotación de cadera, útil para los talones, los drop knee y pegar la cadera a la pared. La dosis sigue los bloques cortos de movilidad que proponen los entrenadores.',
    material: 'Ninguno (una esterilla si la hay)',
    pasos: [
      'Sentado, una pierna delante y otra al lado, las dos con la rodilla a 90 grados.',
      'Con el tronco recto, gira las dos rodillas al otro lado sin usar las manos si puedes.',
      'Vuelve despacio: eso es una repetición.',
      'Si cuesta, apoya las manos detrás.',
    ],
    errores: ['Encorvar la espalda.', 'Hacerlo deprisa a base de impulso.'],
    paraSi: ['Molestia en la rodilla o la cadera: reduce el recorrido.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'dislocaciones-hombro': {
    id: 'dislocaciones-hombro',
    titulo: 'Dislocaciones de hombro con cinta o palo',
    paraQue: 'Movilidad del hombro por encima de la cabeza, sin carga. La dosis sigue los bloques cortos de movilidad que proponen los entrenadores.',
    material: 'Una cinta, una toalla larga o un palo',
    pasos: [
      'De pie, agarra la cinta con las manos muy separadas.',
      'Con los brazos estirados, pásala por encima de la cabeza hasta detrás y vuelve.',
      'Si no pasa sin doblar los codos, separa más las manos.',
      'Despacio, sin forzar.',
    ],
    errores: ['Doblar los codos para pasar.', 'Arquear la espalda para compensar.'],
    paraSi: ['Pinchazo en el hombro: separa más las manos o reduce el recorrido.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  'pies-silenciosos': {
    id: 'pies-silenciosos',
    titulo: 'Pies silenciosos',
    paraQue: 'Poner el pie con precisión: mirarlo hasta cargarlo y que no suene al apoyar. Es un ejercicio clásico de entrenadores (Anderson, Gresham); no hay estudio que mida su efecto. Va como ejercicio de la semana en la sesión técnica.',
    material: 'Vías o bloques fáciles (rocódromo o roca)',
    pasos: [
      'Elige vías o bloques 2-3 grados por debajo de tu nivel.',
      'Mira cada presa de pie hasta que el pie esté apoyado y cargado.',
      'Apoya sin ruido: si suena, el pie llegó tarde o mal colocado.',
      'No recolques el pie una vez apoyado.',
      'Unos 10 min o 3-4 vías.',
    ],
    errores: ['Mirar ya a la siguiente mano antes de cargar el pie.', 'Subir de grado: con dureza se pierde la precisión.'],
    paraSi: PARA_SI,
    parametros: ['P-54', ...SEGURIDAD],
  },
  'manos-pegadas': {
    id: 'manos-pegadas',
    titulo: 'Manos pegadas',
    paraQue: 'Coger cada presa a la primera, sin reajustar la mano. Obliga a leer antes de mover. Ejercicio de entrenadores (Gresham), sin estudio que lo mida.',
    material: 'Vías o bloques fáciles del rocódromo',
    pasos: [
      'Elige vías 2-3 grados por debajo de tu nivel.',
      'Antes de cada movimiento, mira cómo vas a coger la presa.',
      'Coge la presa una vez y no la reajustes, aunque no sea el mejor agarre.',
      'Unos 10 min o 3-4 vías.',
    ],
    errores: ['Corregir el agarre «solo un poco».', 'Ir rápido: el ejercicio es de precisión, no de velocidad.'],
    paraSi: PARA_SI,
    parametros: ['P-54', ...SEGURIDAD],
  },
  'mismo-lado': {
    id: 'mismo-lado',
    titulo: 'Brazos estirados y «mismo lado»',
    paraQue: 'Moverte con los brazos estirados y girando la cadera: bandera, backstep y pie y mano del mismo lado. Ahorra fuerza en las presas. Ejercicio de entrenadores (Gresham), sin estudio que lo mida.',
    material: 'Una travesía o vías fáciles del rocódromo',
    pasos: [
      'Escoge una travesía o una vía fácil y desplomada.',
      'Mantén los brazos estirados en cada reposo y entre movimientos.',
      'Para alcanzar, gira la cadera hacia la pared (backstep) o saca una pierna hacia el otro lado (bandera).',
      'Haz 2-3 travesías de 2-3 min.',
    ],
    errores: ['Doblar los brazos para acercarte a la pared.', 'Quedarte siempre de frente.'],
    paraSi: PARA_SI,
    parametros: ['P-54', ...SEGURIDAD],
  },
  'placa-sin-manos': {
    id: 'placa-sin-manos',
    titulo: 'Placa sin manos y destrepe',
    paraQue: 'Confiar en los pies: subir una placa fácil solo con las palmas y destrepar el calentamiento. Lo propone un rocódromo (Philadelphia Rock Gym, nivel C), sin estudio que lo mida. Solo en rocódromo.',
    material: 'Placa tumbada o vía fácil del rocódromo',
    pasos: [
      'En una placa muy tumbada, sube usando solo las palmas abiertas para equilibrarte.',
      'Carga el peso en los pies y sube con las piernas.',
      'Destrepa la vía de calentamiento solo en top-rope (o un bloque bajo); nunca de primero.',
      '2-3 vías.',
    ],
    errores: ['Elegir una placa demasiado vertical.', 'Agarrarte en cuanto dudas: prueba antes a mover el pie.'],
    paraSi: PARA_SI,
    parametros: ['P-54', ...SEGURIDAD],
  },
  'caidas-progresivas': {
    id: 'caidas-progresivas',
    titulo: 'Caídas progresivas',
    paraQue: `Perder el miedo a caer de primero poco a poco. Es la propuesta de Arno Ilgner (entrenador, nivel C); sus pasos exactos no están publicados en abierto y hay quien duda de que se transfiera a roca. ${VALORES['P-76'].caidasMin}-${VALORES['P-76'].caidasMax} caídas en una sesión por semana, durante 4-6 semanas.`,
    material: 'Vía desplomada y limpia del rocódromo, compañero que asegure avisado',
    pasos: [
      'Avisa a quien te asegura: vas a caer a propósito. Tiene que saber dar un aseguramiento dinámico; si no, quédate en top-rope.',
      'Cuerda siempre por delante de la pierna, nunca entre las piernas ni detrás.',
      'Empieza en top-rope o con la chapa a la altura de la cintura y suéltate: rodillas flexionadas, pies por delante para amortiguar contra la pared y manos lejos de la cuerda.',
      'Sube un escalón (chapa a los pies, después por encima) solo si caes sin ansiedad y el aseguramiento fue suave.',
      `Entre ${VALORES['P-76'].caidasMin} y ${VALORES['P-76'].caidasMax} caídas; no subas de escalón el mismo día si dudas.`,
    ],
    errores: ['Caer en una vía tumbada o con salientes.', 'Agarrar la cuerda o la cinta al caer.', 'Saltarte escalones por prisa.'],
    paraSi: [
      'Golpe con la pared en el pie o el tobillo: para y revisa la vía y el aseguramiento.',
      'Si la cuerda se te mete detrás de la pierna: para y repasa la posición antes de la siguiente.',
      ...PARA_SI,
    ],
    parametros: ['P-76', 'P-62', ...SEGURIDAD],
  },
  'respiracion-voy': {
    id: 'respiracion-voy',
    titulo: 'Respirar y decidir «voy»',
    paraQue: 'Antes del paso clave, en el último reposo: respirar y decidir ir a por ello, no quedarse a medias. De primero la ansiedad sube (P-62); esta rutina concreta es de entrenadores, sin fuente específica (C).',
    material: 'Ninguno',
    pasos: [
      'En el reposo antes del paso clave, sacude el brazo colgando.',
      'Respira lento dos o tres veces, soltando el aire largo.',
      'Repasa el movimiento que vas a hacer.',
      'Di «voy» y muévete con decisión, sin parar a mitad.',
    ],
    errores: ['Quedarse en el reposo hasta cansarse.', 'Ir «a ver qué pasa» sin decidir.'],
    paraSi: PARA_SI,
    parametros: ['P-62', 'P-52', ...SEGURIDAD],
  },
  'tactica-encadene': {
    id: 'tactica-encadene',
    titulo: 'Táctica de encadene',
    paraQue: 'Trabajar un proyecto por partes: trocear, memorizar, planificar reposos y chapas y visualizarlo entero. Memorizar y visualizar ayuda a ejecutar (Whitaker 2020, B; entrenadores, C).',
    material: 'Tu proyecto (roca)',
    pasos: [
      'Divide la vía en tramos entre reposos.',
      'Resuelve los pasos de cada tramo y memorízalos.',
      'Decide dónde reposar y desde dónde chapar cada cinta.',
      'Antes de cada pegue, visualiza la vía entera con los ojos cerrados.',
      'Enlaza tramos cada vez más largos hasta ir desde abajo.',
    ],
    errores: ['Ir desde abajo cada pegue sin haber resuelto los pasos.', 'No apuntar o recordar la secuencia de un día para otro.'],
    paraSi: PARA_SI,
    parametros: ['P-53', 'P-61', ...SEGURIDAD],
  },
  'continuidad-5x3': {
    id: 'continuidad-5x3',
    titulo: 'Continuidad 5×3',
    paraQue: 'Regeneración y capacidad suave: 3 bloques de 5 min escalando sin parar, bien por debajo de tu nivel (Lattice, nivel C). El entrenador ya programa el ARC y los on-offs para esto.',
    material: 'Vías fáciles o travesía del rocódromo',
    pasos: [
      'Escoge terreno al menos 4 grados por debajo de tu a vista.',
      'Escala 5 min sin parar (vueltas, destrepes o travesía).',
      'Descansa 3 min.',
      'Repite hasta 3 bloques.',
    ],
    errores: ['Bombear: si notas el antebrazo hinchado, baja de grado.'],
    paraSi: PARA_SI,
    parametros: ['P-35', ...SEGURIDAD],
  },
  'up-down-up': {
    id: 'up-down-up',
    titulo: 'Up-down-up',
    paraQue: 'Resistencia en vía: subir, destrepar y volver a subir la misma vía. Propuesta de foro (Mountain Project, nivel C).',
    material: 'Vía en top-rope (rocódromo o roca), compañero',
    pasos: [
      'Escoge una vía fácil, bastante por debajo de tu nivel, para destrepar con seguridad.',
      'Siempre en top-rope: súbela, destrépala y vuelve a subirla sin descansar en el suelo. Nunca de primero.',
      'Descansa lo que necesites antes de la siguiente serie.',
      '3-4 series; la última, si quieres, en una vía algo más dura.',
    ],
    errores: ['Elegir una vía demasiado dura para destrepar con seguridad.'],
    paraSi: PARA_SI,
    parametros: ['P-37', ...SEGURIDAD],
  },
  'repetir-vias': {
    id: 'repetir-vias',
    titulo: 'Repetir vías con descanso fijo',
    paraQue: 'Resistencia en vía: 3-4 vías seguidas con un descanso fijo entre ellas, 1-3 series (Hörst, nivel C).',
    material: 'Vías con cuerda (rocódromo o roca), compañero',
    pasos: [
      'Escoge 3-4 vías algo por debajo de tu límite.',
      'Escálalas una detrás de otra con el mismo descanso (por ejemplo, el tiempo que tarda tu compañero).',
      'Descansa hasta recuperarte antes de la siguiente serie.',
      '1-3 series.',
    ],
    errores: ['Alargar los descansos cuando cuesta: el ejercicio es el descanso fijo.'],
    paraSi: PARA_SI,
    parametros: ['P-37', ...SEGURIDAD],
  },
  inthangs: {
    id: 'inthangs',
    titulo: 'IntHangs (Eva López)',
    paraQue: `Resistencia de dedos con suspensiones intermitentes: 3-5 series de 4-5 repeticiones de 7-10 s con 3-30 s de descanso (Eva López, nivel C). En regleta de ${REGLETA} o mayor: para progresar, añade carga en lugar de bajar de regleta (Mundry 2021, A). ${SUSTITUYE}`,
    material: `Multipresa, regleta de ${REGLETA} o mayor`,
    pasos: [
      'Calienta como para cualquier suspensión.',
      ...PASOS_COLGARSE,
      'Cuelga 7-10 s, descansa 3-30 s; 4-5 repeticiones.',
      '1-2 min entre series; 3-5 series.',
      NOVEL,
    ],
    errores: ['Bajar de regleta por debajo de lo seguro para tu experiencia.'],
    paraSi: ['Pierdes el semiarqueado: termina la serie.', ...PARA_SI],
    parametros: ['P-36', 'P-07', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'suspensiones-largas': {
    id: 'suspensiones-largas',
    titulo: 'Suspensiones largas suaves',
    paraQue: `Para iniciarse en la multipresa: suspensiones de 30-60 s a baja intensidad, quitando peso con polea o pies (Lattice, nivel C). ${SUSTITUYE}`,
    material: `Multipresa, regleta de ${REGLETA}, polea o un taburete para los pies`,
    pasos: [
      ...PASOS_COLGARSE,
      'Quita peso hasta que el esfuerzo sea 5-7 de 10.',
      'Cuelga 30-60 s.',
      '4-8 series, descansando lo que necesites entre ellas.',
      NOVEL,
    ],
    errores: ['Colgar con todo el peso desde el primer día.'],
    paraSi: ['Pierdes el semiarqueado: termina la serie.', ...PARA_SI],
    parametros: ['P-01', 'P-07', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  abrahangs: {
    id: 'abrahangs',
    titulo: '«Abrahangs»',
    paraQue: `Suspensiones de baja intensidad, unos 10 min en total. En usuarios de Crimpd mejoraron la fuerza casi como las máximas, pero no es un ensayo y no se publica la estructura exacta (Gilmore 2024, B). ${SUSTITUYE}`,
    material: `Multipresa, regleta de ${REGLETA}, polea o taburete para quitar peso`,
    pasos: [
      ...PASOS_COLGARSE,
      'Quita peso con la polea o los pies: la intensidad tiene que ser baja.',
      'Cuelga a baja intensidad durante unos 10 min en total, descansando cuando lo necesites.',
      'Cuenta como una sesión de multipresa: no la sumes a las del plan.',
      NOVEL,
    ],
    errores: ['Convertirlo en una sesión dura subiendo la carga.'],
    paraSi: PARA_SI,
    parametros: ['P-01', 'P-07', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'intermitentes-80': {
    id: 'intermitentes-80',
    titulo: 'Intermitentes 10:6 al 80 %',
    paraQue: `La otra rama del ensayo de Devise 2022 (A): 10 s colgado y 6 s de descanso al 80 % del máximo, hasta 12 repeticiones, 3 series con 8 min, 2 por semana durante 4 semanas. Mejoró resistencia y fuerza en escaladores con más experiencia que tú; para menos de 2 años el entrenador usa la del 60 %. ${SUSTITUYE}`,
    material: `Multipresa, regleta de ${REGLETA}, lastre o polea`,
    pasos: [
      ...PASOS_COLGARSE,
      'Carga = el 80 % de tu máximo de 10 s.',
      '10 s colgado, 6 s de descanso, hasta 12 repeticiones.',
      '8 min entre series; 3 series.',
      NOVEL,
    ],
    errores: ['Hacerla sin un test de dedos reciente.'],
    paraSi: ['Pierdes el semiarqueado: termina la serie.', ...PARA_SI],
    parametros: ['P-36', 'P-07', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
  },
  'finger-curls': {
    id: 'finger-curls',
    titulo: 'Finger curls',
    paraQue: 'Fuerza dinámica de dedos con una barra o mancuerna. En un ensayo no aportó frente a la suspensión isométrica (Saeterbakken 2024, A): prioridad baja.',
    material: 'Barra de pesas o mancuerna (en casa hace falta tenerla)',
    pasos: [
      'Sentado, antebrazo apoyado en el muslo y la palma hacia arriba.',
      'Deja que la barra ruede hasta la punta de los dedos.',
      'Ciérralos y sube la muñeca.',
      '3-5 series de 4-10 repeticiones.',
    ],
    errores: ['Cargar tanto que tira de la muñeca.'],
    paraSi: PARA_SI,
    parametros: ['P-01', ...SEGURIDAD],
  },
  'dedos-en-barra': {
    id: 'dedos-en-barra',
    titulo: 'Dedos en barra o toalla (no se propone)',
    paraQue: 'Colgarse de la barra o de una toalla no se parece a una regleta de 20 mm: no hay evidencia de que entrene la fuerza de dedos. Por eso el entrenador no lo propone en casa; para los dedos, la multipresa.',
    material: 'Barra de dominadas',
    pasos: [
      'Si no tienes multipresa en casa, dedica la barra a dominadas, hombro y core.',
      'Deja la fuerza de dedos para el rocódromo.',
      'Si quieres colgarte, que sea para el hombro (colgado pasivo).',
    ],
    errores: ['Contarlo como sesión de dedos.'],
    paraSi: PARA_SI,
    parametros: ['P-01', ...SEGURIDAD],
  },
  campus: {
    id: 'campus',
    titulo: 'Campus (no se propone)',
    paraQue: 'El campus sobrecarga las poleas de los dedos. Solo hay ensayo en avanzados y los entrenadores piden al menos 1-2 años y un bloque de nivel consistente. Con menos de 2 años escalando, el entrenador no lo propone (P-13): la potencia se trabaja con bloque al límite y dominadas explosivas.',
    material: 'Campus board',
    pasos: [
      'Para potencia, usa el bloque al límite con descanso completo.',
      'En casa, dominadas explosivas o excéntricas.',
      'Vuelve a mirarlo cuando lleves más de 2 años escalando y un nivel de bloque estable.',
    ],
    errores: ['Probarlo «solo un poco» antes de tiempo.'],
    paraSi: PARA_SI,
    parametros: ['P-13', ...SEGURIDAD],
  },
  'paso-alto': {
    id: 'paso-alto',
    titulo: 'Paso alto activo a la pared',
    paraQue: 'Movilidad activa de cadera para subir el pie alto sin despegar la cadera. Bloque de movilidad de entrenadores (Hooper\'s Beta, The Climbing Doctor, nivel C): la movilidad se asocia poco al nivel, así que va en dosis corta.',
    material: 'Una pared',
    pasos: [
      'De frente a la pared, cerca, con las manos apoyadas.',
      'Sube una rodilla hacia fuera y lleva el pie lo más alto que puedas sin separar la cadera.',
      'Mantén 2 s arriba y baja controlando.',
      '2 × 8 por lado.',
    ],
    errores: ['Echar la cadera hacia atrás para subir más.', 'Rebotar.'],
    paraSi: ['Pinchazo en la ingle: sube menos.', ...PARA_SI],
    parametros: ['P-72', ...SEGURIDAD],
  },
  tobillo: {
    id: 'tobillo',
    titulo: 'Tobillo con la rodilla a la pared',
    paraQue: 'Movilidad de tobillo para cargar bien los pies en presas altas y de puntillas. Bloque de movilidad de entrenadores (Hooper\'s Beta, nivel C), en dosis corta.',
    material: 'Una pared',
    pasos: [
      'De pie, un pie a un palmo de la pared.',
      'Lleva la rodilla a tocar la pared sin levantar el talón.',
      'Si la tocas fácil, aleja el pie un poco.',
      '2 × 10 por lado.',
    ],
    errores: ['Levantar el talón.', 'Meter la rodilla hacia dentro.'],
    paraSi: PARA_SI,
    parametros: ['P-72', ...SEGURIDAD],
  },
}

export interface Grupo {
  id: 'fuerza' | 'resistencia' | 'potencia' | 'tecnica' | 'cabeza' | 'hombro' | 'movilidad'
  titulo: string
  fichas: FichaId[]
}

// Por cualidad, como el informe 2026-10-31.
export const GRUPOS: Grupo[] = [
  {
    id: 'fuerza',
    titulo: 'Fuerza de dedos',
    fichas: ['agarre-semiarqueado', 'suspension-maxima-10s', 'repeaters-7-3', 'suspensiones-largas', 'abrahangs', 'finger-curls', 'dedos-en-barra'],
  },
  {
    id: 'resistencia',
    titulo: 'Resistencia',
    fichas: [
      'resistencia-10-6', 'intermitentes-80', 'inthangs', 'colgado-30mm', 'arc', 'on-offs', 'cuatro-por-cuatro', 'continuidad-5x3',
      'up-down-up', 'repetir-vias',
    ],
  },
  {
    id: 'potencia',
    titulo: 'Potencia y tirón',
    fichas: [
      'bloques-limite', 'calentamiento-barra', 'colgarse-barra', 'dominadas-lastradas', 'dominadas-explosivas', 'dominadas-excentricas',
      'dominadas-maximas', 'power-slap', 'campus',
    ],
  },
  {
    id: 'tecnica',
    titulo: 'Técnica',
    fichas: [
      'calentamiento-progresivo', 'via-de-practica', 'practica-tecnica', 'video-autoevaluacion', 'pies-silenciosos', 'manos-pegadas',
      'mismo-lado', 'placa-sin-manos',
    ],
  },
  { id: 'cabeza', titulo: 'Cabeza y táctica', fichas: ['via-limite-cuerda', 'caidas-progresivas', 'respiracion-voy', 'tactica-encadene'] },
  {
    id: 'hombro',
    titulo: 'Hombro y antagonistas',
    fichas: ['retracciones-escapulares', 'flexiones', 'rotacion-externa-banda', 'ytw-banda', 'face-pull-banda', 'extensores-dedos-banda', 'plancha-toques-hombro'],
  },
  {
    id: 'movilidad',
    titulo: 'Movilidad y core',
    fichas: [
      'movilidad', 'rana', 'cadera-90-90', 'paso-alto', 'tobillo', 'dislocaciones-hombro', 'apertura-cadera', 'plancha-frontal', 'hollow',
      'elevaciones-colgado', 'elevaciones-tumbado', 'plancha-lateral',
    ],
  },
]

export type LugarFicha = 'rocodromo' | 'roca' | 'casa'
export const NOMBRE_LUGAR_FICHA: Record<LugarFicha, string> = { rocodromo: 'Rocódromo', roca: 'Roca', casa: 'Casa' }
const R: LugarFicha[] = ['rocodromo']
const RR: LugarFicha[] = ['rocodromo', 'roca']
const RC: LugarFicha[] = ['rocodromo', 'casa']
const C: LugarFicha[] = ['casa']
// Lo que necesita regleta es de rocódromo: en casa se cuenta solo con la barra (la multipresa en casa es opcional).
const TODOS: LugarFicha[] = ['rocodromo', 'roca', 'casa']

// Dónde se puede hacer cada ejercicio.
export const LUGARES_FICHA: Record<FichaId, LugarFicha[]> = {
  'agarre-semiarqueado': R, 'repeaters-7-3': R, 'resistencia-10-6': R, 'suspension-maxima-10s': R, 'colgado-30mm': R, 'power-slap': RC,
  'calentamiento-progresivo': RR, 'calentamiento-barra': RC,
  'bloques-limite': R, 'via-limite-cuerda': RR, 'cuatro-por-cuatro': R, arc: RR, 'on-offs': RR, 'via-de-practica': RR, 'practica-tecnica': RR,
  'video-autoevaluacion': RR,
  'dominadas-lastradas': RC, 'dominadas-explosivas': RC, 'dominadas-excentricas': RC, 'colgarse-barra': RC, 'dominadas-maximas': RC,
  'retracciones-escapulares': RC, flexiones: TODOS, 'rotacion-externa-banda': RC, 'ytw-banda': RC, 'face-pull-banda': RC,
  'extensores-dedos-banda': RC, 'plancha-toques-hombro': TODOS,
  movilidad: TODOS, 'plancha-frontal': TODOS, hollow: TODOS, 'elevaciones-colgado': RC, 'elevaciones-tumbado': TODOS, 'plancha-lateral': TODOS,
  rana: TODOS, 'cadera-90-90': TODOS, 'dislocaciones-hombro': TODOS, 'apertura-cadera': TODOS,
  'pies-silenciosos': RR, 'manos-pegadas': R, 'mismo-lado': R, 'placa-sin-manos': R, 'caidas-progresivas': RR, 'respiracion-voy': RR,
  'tactica-encadene': ['roca'], 'continuidad-5x3': R, 'up-down-up': RR, 'repetir-vias': RR, inthangs: R, 'suspensiones-largas': R,
  abrahangs: R, 'intermitentes-80': R, 'finger-curls': RC, 'dedos-en-barra': C, campus: R, 'paso-alto': TODOS, tobillo: TODOS,
}

// Si el entrenador lo programa. Por defecto, sí; las de consulta las puedes hacer por tu cuenta; las «no» explican por
// qué no se proponen.
export type UsoFicha = 'plan' | 'consulta' | 'no'
const USO: Partial<Record<FichaId, UsoFicha>> = {
  'continuidad-5x3': 'consulta', 'up-down-up': 'consulta', 'repetir-vias': 'consulta', inthangs: 'consulta', 'suspensiones-largas': 'consulta',
  abrahangs: 'consulta', 'intermitentes-80': 'consulta', 'finger-curls': 'consulta', 'dedos-en-barra': 'no', campus: 'no',
}
export const usoFicha = (id: FichaId): UsoFicha => USO[id] ?? 'plan'

// Las fichas que son tests (se repiten para medir, no para entrenar).
export const FICHAS_TEST: ReadonlySet<FichaId> = new Set<FichaId>(['suspension-maxima-10s', 'colgado-30mm', 'power-slap', 'dominadas-maximas', 'apertura-cadera'])
export const TEXTO_USO: Record<UsoFicha, string> = {
  plan: 'Te lo propone el entrenador cuando toca.',
  consulta: 'De consulta: el entrenador no lo programa, pero puedes hacerlo por tu cuenta.',
  no: 'No se propone: el motivo está arriba.',
}

// La ficha de un id que viene de fuera (una propuesta guardada, la URL): undefined si no existe.
export function fichaDe(id: string | undefined): Ficha | undefined {
  if (id === undefined || !Object.hasOwn(FICHAS, id)) return undefined
  return FICHAS[id as FichaId]
}
