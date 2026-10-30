// Biblioteca de ejercicios: una ficha por cada ejercicio que puede proponer el motor. Puro: solo texto y constantes.
// Los números de las suspensiones salen de VALORES (motor), para que la ficha no se separe nunca de lo que se prescribe.
// Lo que no viene de un estudio lo dice: «(decisión de diseño)».
import { FRACCION_INICIAL_REPEATERS, VALORES, type ParametroId } from '../../motor'
import type { DibujoId } from './dibujos'

export const FICHA_IDS = [
  'agarre-semiarqueado', 'repeaters-7-3', 'resistencia-fuerza-10-5', 'suspension-maxima-10s', 'test-7-3-fallo',
  'calentamiento-progresivo', 'calentamiento-barra',
  'bloques-limite', 'via-limite-cuerda', 'cuatro-por-cuatro', 'arc', 'practica-tecnica', 'video-autoevaluacion',
  'dominadas-lastradas', 'colgarse-barra',
  'retracciones-escapulares', 'flexiones', 'rotacion-externa-banda', 'ytw-banda', 'face-pull-banda', 'extensores-dedos-banda',
  'plancha-toques-hombro',
  'movilidad',
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
const T73 = VALORES['P-24']
const DOM = VALORES['P-39']
const ARC = VALORES['P-35']
const X4 = VALORES['P-37']
const LECTURA = `${VALORES['P-53'].minutosPrevisualizacion} min`

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
  'resistencia-fuerza-10-5': {
    id: 'resistencia-fuerza-10-5',
    titulo: `Resistencia de fuerza ${RF.trabajoS}:${RF.descansoS}`,
    paraQue: 'Suspensiones más largas, con menos descanso, para la resistencia de fuerza de dedos.',
    material: `Multipresa, regleta de ${REGLETA}`,
    pasos: [
      ...PASOS_COLGARSE,
      `Cada repetición: ${RF.trabajoS} s colgado y ${RF.descansoS} s de descanso; ${RF.repeticiones} repeticiones por serie.`,
      `Haz ${RF.series} series con ${fmt(RF.descansoSeriesS / 60)} min entre series.`,
      `Carga: la misma regla que los repeaters (el ${pct(FRACCION_INICIAL_REPEATERS)} del test y después hasta el ${pct(VALORES['P-06'].fraccionMaximaRepeaters)}).`,
      NOVEL,
    ],
    errores: [
      'Llegar al fallo en las primeras series.',
      'Cerrar el agarre hacia el arqueado al final de cada suspensión.',
    ],
    paraSi: [
      'No sostienes los 10 s con buena forma: termina la serie.',
      ...PARA_SI,
    ],
    parametros: ['P-36', 'P-06', 'P-09', 'P-10', 'P-12', ...SEGURIDAD],
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
  'test-7-3-fallo': {
    id: 'test-7-3-fallo',
    titulo: `Test ${T73.trabajoS}:${T73.descansoS} hasta el fallo`,
    paraQue: 'Medir tu resistencia de dedos en segundos totales colgado.',
    material: `Multipresa, regleta de ${REGLETA}, lastre o polea para descargar`,
    pasos: [
      'Descansa unos minutos tras la suspensión máxima.',
      `Prepara la carga: el ${pct(T73.fraccion)} de tu máximo de hoy (peso más lastre del mejor intento). Si sale por debajo de tu peso, descarga con polea o banda.`,
      ...PASOS_COLGARSE,
      `Repite ${T73.trabajoS} s colgado y ${T73.descansoS} s de descanso hasta que no completes una repetición: eso es el fallo.`,
      'Apunta los segundos totales colgado.',
      NOVEL,
    ],
    errores: [
      'Seguir con el agarre cerrado hacia el arqueado para arañar segundos.',
      'Usar otra regleta u otra carga que en el test anterior: no serían comparables.',
    ],
    paraSi: [
      'Pierdes el semiarqueado: el test termina ahí.',
      ...PARA_SI,
    ],
    parametros: ['P-24', 'P-10', 'P-12', ...SEGURIDAD],
    dibujo: 'colgado-multipresa',
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
      'Hasta 4 intentos por bloque con 3-4 min de descanso entre intentos (decisión de diseño).',
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
      `Descansa ${X4.descansoVueltaMin} min y repite hasta ${X4.vueltas} vueltas (decisión de diseño, sin estudio directo).`,
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
      `Escala sin parar ${ARC.minutosSerie} min (o ${ARC.minutosSerieCorta} si va corta la sesión).`,
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
      `${DOM.series} series de ${DOM.repeticiones} con un lastre que te deje ${DOM.repeticionesEnReserva} repeticiones en reserva y ${DOM.descansoMin} min de descanso (decisión de diseño).`,
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
      'Series y repeticiones las marca la sesión (decisión de diseño).',
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
      'Series y repeticiones las marca la sesión (decisión de diseño).',
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
      'Cambia de brazo. Series y repeticiones las marca la sesión (decisión de diseño).',
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
      'Las repeticiones de cada letra las marca la sesión (decisión de diseño).',
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
      'Vuelve despacio. Series y repeticiones las marca la sesión (decisión de diseño).',
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
      'Cambia de mano. Series y repeticiones las marca la sesión (decisión de diseño).',
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
      'El tiempo de cada serie lo marca la sesión (decisión de diseño).',
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
    paraQue: 'Moverse en rangos cómodos sin cargar, para empezar, terminar o en días con molestias. La movilidad y sus minutos son decisión de diseño.',
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
}

export interface Grupo {
  id: 'suspensiones' | 'escalada' | 'barra' | 'hombro' | 'movilidad'
  titulo: string
  fichas: FichaId[]
}

export const GRUPOS: Grupo[] = [
  { id: 'suspensiones', titulo: 'Suspensiones', fichas: ['agarre-semiarqueado', 'repeaters-7-3', 'resistencia-fuerza-10-5', 'suspension-maxima-10s', 'test-7-3-fallo'] },
  {
    id: 'escalada',
    titulo: 'Escalada',
    fichas: ['calentamiento-progresivo', 'bloques-limite', 'via-limite-cuerda', 'cuatro-por-cuatro', 'arc', 'practica-tecnica', 'video-autoevaluacion'],
  },
  { id: 'barra', titulo: 'Barra', fichas: ['calentamiento-barra', 'colgarse-barra', 'dominadas-lastradas'] },
  {
    id: 'hombro',
    titulo: 'Hombro y antagonistas',
    fichas: ['retracciones-escapulares', 'flexiones', 'rotacion-externa-banda', 'ytw-banda', 'face-pull-banda', 'extensores-dedos-banda', 'plancha-toques-hombro'],
  },
  { id: 'movilidad', titulo: 'Movilidad', fichas: ['movilidad'] },
]

// La ficha de un id que viene de fuera (una propuesta guardada, la URL): undefined si no existe.
export function fichaDe(id: string | undefined): Ficha | undefined {
  if (id === undefined || !Object.hasOwn(FICHAS, id)) return undefined
  return FICHAS[id as FichaId]
}
