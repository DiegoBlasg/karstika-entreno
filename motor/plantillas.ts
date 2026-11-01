import { restriccionesDe } from './autorregulacion'
import { explicar, type Explicacion } from './explicacion'
import { evaluacionVigente, lastreRepeaters } from './evaluacion'
import { VALORES } from './parametros'
import type { Bloque, Ejercicio, Peticion, SesionPlan } from './propuesta-tipos'
import { desdeLunes } from './temporada'
import { diaNumero } from './tiempo'
import type { Sesion, TipoComplemento, TipoSesion } from './tipos'

const fmt = (x: number): string => String(x).replace('.', ',')

const CALENTAMIENTO_MIN = VALORES['P-49'].minutos
// Decisión de diseño de este tramo (no está en parametros.md): pausa entre los dos bloques de multipresa.
const PAUSA_ENTRE_BLOQUES_MIN = 5
const REGLETA_MM = VALORES['P-12'].regletaMinimaMm
// Decisión de diseño (dirección segura): las primeras semanas de multipresa se cuelga al 70 % del test; después,
// como mucho al tope del 80 % de P-06. El 80 % viene de escaladores avanzados y P-06 lo fija como techo, no como objetivo.
export const FRACCION_INICIAL_REPEATERS = 0.7

function bloqueCalentamiento(): Bloque {
  return {
    nombre: 'Calentamiento específico',
    minutos: CALENTAMIENTO_MIN,
    ejercicios: [
      {
        nombre: 'Calentamiento de menos a más: movilidad, escalada fácil y agarres progresivos',
        cargaTexto: 'Esfuerzo percibido 2–4 de 10',
        ficha: 'calentamiento-progresivo',
      },
    ],
    explicacion: explicar(
      'plantilla.calentamiento',
      ['P-49'],
      'Unos 10 minutos de calentamiento específico de escalada, de menos a más, antes de cualquier trabajo intenso.',
    ),
  }
}

function sesionDe(
  tipo: TipoSesion,
  p: Peticion,
  duracionMin: number,
  intensidad: Sesion['intensidad'],
  detalle?: Sesion['detalle'],
): Sesion {
  return {
    id: `propuesta-${tipo}`,
    tipo,
    intensidad,
    fecha: p.fecha,
    horaInicio: p.horaInicio,
    duracionMin,
    ...(detalle ? { detalle } : {}),
    ...(p.fase.descarga ? { descarga: true } : {}),
  }
}

function plan(sesion: Sesion, bloques: Bloque[]): SesionPlan {
  const suma = bloques.reduce((a, b) => a + b.minutos, 0)
  if (suma !== sesion.duracionMin) {
    throw new Error(`Los bloques de ${sesion.tipo} suman ${suma} min y la sesión dura ${sesion.duracionMin} min`)
  }
  return { sesion, bloques, explicaciones: bloques.map((b) => b.explicacion) }
}

function minutosBloqueMultipresa(seriesPorBloque: number = VALORES['P-03'].seriesPorBloque): number {
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie } = VALORES['P-03']
  const segundos =
    seriesPorBloque * repeticionesPorSerie * (trabajoS + descansoS) +
    (seriesPorBloque - 1) * VALORES['P-05'].descansoEntreSeriesS
  return Math.ceil(segundos / 60)
}

function cargaMultipresa(kg: number | undefined): string {
  if (kg === undefined) return 'Esfuerzo percibido 6–7 de 10, sin llegar al fallo'
  if (kg === 0) return 'Solo tu peso corporal'
  return kg > 0 ? `+${fmt(kg)} kg de lastre` : `descarga de ${fmt(-kg)} kg`
}

// La resistencia 10:6 (P-36) va a carga fija del test: no cuenta para la progresión de los repeaters.
const TIPOS_MULTIPRESA_PROGRESION: readonly TipoSesion[] = ['multipresa-resistencia']

// Progresión común a las multipresas. Solo cuentan las anteriores al día de la petición (no las futuras ya
// planificadas). Una sola subida cada vez (P-11): primero el volumen (1 → 2 bloques, P-04) y, otras tantas
// sesiones después, la carga (70 % → 80 %). Decisión de diseño en la dirección segura.
// Las sesiones hechas en descarga no cuentan para subir (el volumen era la mitad). Con seguimiento (tramo 2d), solo
// cuentan las válidas (P-11: registradas, completadas, dentro del RPE objetivo y sin dolor en dedos o muñeca).
// Escalones: 0 = 1 bloque al 70 %, 1 = 2 bloques al 70 %, 2 = 80 %. Cada episodio de molestia en dedos o muñeca
// baja un escalón desde donde estabas en ese momento (P-46), y desde ahí se progresa de nuevo. Con el freno de P-11
// (`sinSubida`), hoy no se pasa del escalón de la última multipresa.
// El lunes (día numérico) de la semana natural de `dia` (el día 0 cayó en jueves).
const lunesDeDia = (dia: number): number => dia - ((((dia - 4) % 7) + 7) % 7)

function progresionMultipresa(p: Peticion, tipos: readonly TipoSesion[] = TIPOS_MULTIPRESA_PROGRESION) {
  const hoy = diaNumero(p.fecha)
  const noValidas = new Set(p.estado?.sesionesNoValidas ?? [])
  const sinRegistro = new Set(p.estado?.sesionesSinRegistro ?? [])
  const pasadas = p.historial.filter((s) => tipos.includes(s.tipo) && diaNumero(s.fecha) < hoy)
  const sinDescarga = pasadas.filter((s) => !s.descarga)
  const lista = sinDescarga.filter((s) => !noValidas.has(s.id))
  const sinApuntar = pasadas.filter((s) => sinRegistro.has(s.id)).length
  const S = VALORES['P-04'].semanasConUnBloque * VALORES['P-07'].sesionesPorSemana
  const escalon = (n: number): number => (n < S ? 0 : n < 2 * S ? 1 : 2)
  // Recorrido en orden (día y hora; la molestia de un chequeo va al principio del día). Toda multipresa fuera de
  // descarga marca el escalón «de la última», pero solo las válidas suben: así una sola sesión mala no baja la carga.
  const validas = new Set(lista.map((s) => s.id))
  const eventos = [
    ...(p.estado?.molestiasP46 ?? []).map((m) => ({ dia: diaNumero(m.fecha), orden: m.orden, molestia: true, valida: false })),
    ...sinDescarga.map((s) => ({ dia: diaNumero(s.fecha), orden: s.horaInicio, molestia: false, valida: validas.has(s.id) })),
  ]
    .filter((e) => e.dia < hoy)
    .sort((x, y) => x.dia - y.dia || x.orden - y.orden || Number(y.molestia) - Number(x.molestia))
  // P-11 (Mundry 2021): ya en la fracción máxima, la carga sube como mucho 1,25 kg por semana natural, y solo en las
  // semanas con una sesión válida precedida de otra válida. Cuenta desde el test vigente (con un test nuevo la rampa
  // vuelve a empezar desde su 70 %, sin saltos) y una molestia la reinicia.
  const { kgMaxSemana, sesionesValidasParaSubir } = VALORES['P-11']
  const desdeTest = p.evaluacion ? diaNumero(p.evaluacion.fecha) : -Infinity
  let previas = 0
  let antesDeLaUltima = 0
  let racha = 0
  let semanaDeLaUltima: number | null = null // la semana que añadió la última sesión a la rampa, si la añadió
  const semanasConSubida = new Set<number>()
  for (const e of eventos) {
    if (e.molestia) {
      previas = Math.min(previas, Math.max(0, escalon(previas) - 1) * S)
      racha = 0
      semanasConSubida.clear()
      semanaDeLaUltima = null
    } else {
      antesDeLaUltima = previas
      const enMaxima = previas >= 2 * S
      racha = e.valida ? racha + 1 : 0
      if (e.valida) previas++
      const semana = lunesDeDia(e.dia)
      const suma = enMaxima && racha >= sesionesValidasParaSubir && e.dia > desdeTest && !semanasConSubida.has(semana)
      if (suma) semanasConSubida.add(semana)
      semanaDeLaUltima = suma ? semana : null
    }
  }
  const retornoP46 = escalon(previas) < escalon(lista.length)
  let frenado = false
  if (p.estado?.sinSubida && lista.length > 0 && escalon(previas) > escalon(antesDeLaUltima)) {
    previas = (escalon(antesDeLaUltima) + 1) * S - 1
    frenado = true
  }
  // El freno de P-11 (esfuerzo por encima o una zona en ámbar) también para la rampa: la última sesión no sube.
  if (p.estado?.sinSubida && semanaDeLaUltima !== null) {
    semanasConSubida.delete(semanaDeLaUltima)
    frenado = true
  }
  const sesionesConUnBloque = S
  const inicial = previas < 2 * sesionesConUnBloque
  const fraccion = inicial ? FRACCION_INICIAL_REPEATERS : VALORES['P-06'].fraccionMaximaRepeaters
  const vigente = evaluacionVigente(p.evaluacion, p.fecha)
  let kg = vigente ? lastreRepeaters(p.evaluacion!, fraccion) : undefined
  let porcentaje = Math.round(fraccion * 100)
  let enRampa = false
  if (vigente && kg !== undefined && !inicial) {
    // El salto de la fracción inicial a la máxima no es de golpe: desde la carga inicial, +1,25 kg por semana con subida.
    // Redondeada hacia abajo a 0,5 kg, como el resto de cargas (se puede ajustar en una polea).
    const conRampa = Math.floor((lastreRepeaters(p.evaluacion!, FRACCION_INICIAL_REPEATERS) + kgMaxSemana * semanasConSubida.size) * 2 + 1e-9) / 2
    if (conRampa < kg) {
      kg = conRampa
      enRampa = true
      const e = p.evaluacion!
      porcentaje = Math.round(((e.pesoCorporalKg + kg) / (e.pesoCorporalKg + e.lastreKg)) * 100)
    }
  }
  return { previas, sesionesConUnBloque, inicial, kg, porcentaje, retornoP46, frenado, sinApuntar, enRampa }
}

const TEXTO_P46 = ' Tras tu última molestia en dedos o muñeca, la progresión vuelve un escalón atrás y sube de nuevo con sesiones sin dolor (P-46).'
const TEXTO_FRENO = ' Hoy no sube: tu última sesión quedó por encima del esfuerzo previsto o tienes una zona en ámbar (P-11).'
const textoSinApuntar = (n: number): string =>
  n === 0 ? '' : ` ${n === 1 ? '1 sesión de multipresa sin registro no cuenta' : `${n} sesiones de multipresa sin registro no cuentan`} para subir: apunta el RPE y los minutos al terminar.`
const TEXTO_RAMPA = ' La carga sube como mucho 1,25 kg por semana y solo tras 2 sesiones válidas seguidas, hasta llegar al máximo (P-11, Mundry 2021).'
const extrasProgresion = (r: { retornoP46: boolean; frenado: boolean; sinApuntar: number; enRampa?: boolean }): string =>
  `${r.enRampa ? TEXTO_RAMPA : ''}${r.retornoP46 ? TEXTO_P46 : ''}${r.frenado ? TEXTO_FRENO : ''}${textoSinApuntar(r.sinApuntar)}`

function notasCarga(kg: number | undefined, porcentaje: number): string {
  return kg === undefined
    ? 'No hay test vigente: carga por esfuerzo percibido. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.'
    : `Carga al ${porcentaje} % de tu test. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.`
}

function construirMultipresa(p: Peticion): SesionPlan | null {
  const progresion = progresionMultipresa(p)
  const { previas, sesionesConUnBloque, inicial, kg, porcentaje, retornoP46 } = progresion
  const { bloquesIniciales, bloquesDespues } = VALORES['P-04']
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie } = VALORES['P-03']
  // Descarga (P-48): un solo bloque con la mitad de series, misma carga y frecuencia.
  const seriesPorBloque = p.fase.descarga ? VALORES['P-03'].seriesPorBloque / 2 : VALORES['P-03'].seriesPorBloque
  // En descarga y en la fase de rendimiento (mantenimiento) basta un bloque.
  const unBloque = p.fase.descarga || p.fase.id === 'rendimiento'
  const deseados = unBloque ? 1 : previas < sesionesConUnBloque ? bloquesIniciales : bloquesDespues
  const bloqueMin = minutosBloqueMultipresa(seriesPorBloque)
  const total = (n: number): number => CALENTAMIENTO_MIN + n * bloqueMin + (n - 1) * PAUSA_ENTRE_BLOQUES_MIN
  let n = deseados
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= n; i++) {
    if (i > 1) {
      bloques.push({
        nombre: 'Pausa entre bloques',
        minutos: PAUSA_ENTRE_BLOQUES_MIN,
        ejercicios: [{ nombre: 'Descanso activo suave, sin colgarte', cargaTexto: 'Esfuerzo percibido 1–2 de 10' }],
        explicacion: explicar('plantilla.pausa', ['P-05'], 'Entre bloques de multipresa se descansa para llegar fresco al segundo.'),
      })
    }
    bloques.push({
      nombre: `Bloque de repeaters ${i}`,
      minutos: bloqueMin,
      ejercicios: [
        {
          nombre: `Repeaters en regleta de ${REGLETA_MM} mm, agarre semiarqueado`,
          series: seriesPorBloque,
          repeticiones: repeticionesPorSerie,
          trabajoS,
          descansoS,
          descansoSeriesS: VALORES['P-05'].descansoEntreSeriesS,
          ...(kg !== undefined ? { cargaKg: kg } : {}),
          cargaTexto: cargaMultipresa(kg),
          notas: notasCarga(kg, porcentaje),
          ficha: 'repeaters-7-3',
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa',
        [
          ...(p.fase.descarga
            ? (['P-01', 'P-02', 'P-03', 'P-05', 'P-06', 'P-09', 'P-10', 'P-48'] as const)
            : (['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06', 'P-09', 'P-10', 'P-11'] as const)),
          ...(retornoP46 ? (['P-46'] as const) : []),
        ],
        `${p.fase.descarga ? 'Semana de descarga: la mitad de series en un solo bloque. ' : ''}Repeaters submáximos 7 s colgado : 3 s descanso, ${seriesPorBloque} series de 7 repeticiones, 2,5 min entre series, en regleta de 20 mm semiarqueado, ${
          kg === undefined
            ? 'por esfuerzo percibido porque no hay un test vigente'
            : `al ${porcentaje} % de tu test (${inicial ? `durante las primeras ${2 * sesionesConUnBloque} sesiones, por prudencia` : progresion.enRampa ? `subiendo hacia el ${Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100)} %, el tope de P-06` : 'el tope de P-06'})`
        }. Volumen y carga suben de uno en uno: primero de 1 a 2 bloques y después del 70 % al 80 %.${extrasProgresion(progresion)}`,
      ),
    })
  }
  const sesion = sesionDe('multipresa-resistencia', p, total(n), 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: kg !== undefined && kg > 0,
  })
  return plan(sesion, bloques)
}

// Resistencia en multipresa (P-36, Devise 2022): 10:6 hasta 24 repeticiones por serie, al 60 % fijo del test vigente.
// El ensayo no reajustó la intensidad: la carga sube cuando sube el test, no por sesiones.
function construirMultipresaResistenciaFuerza(p: Peticion): SesionPlan | null {
  const { trabajoS, descansoS, descansoSeriesS, fraccion, repeticionesDescarga } = VALORES['P-36']
  const kg = evaluacionVigente(p.evaluacion, p.fecha) ? lastreRepeaters(p.evaluacion!, fraccion) : undefined
  const porcentaje = Math.round(fraccion * 100)
  // Descarga (P-48: nada al límite): una sola serie y la mitad de repeticiones, lejos del fallo.
  const series = p.fase.descarga ? 1 : VALORES['P-36'].series
  const repeticiones = p.fase.descarga ? repeticionesDescarga : VALORES['P-36'].repeticiones
  const segundos = series * (repeticiones * (trabajoS + descansoS) - descansoS) + (series - 1) * descansoSeriesS
  const bloqueMin = Math.max(5, Math.ceil(segundos / 60 / 5) * 5)
  const total = CALENTAMIENTO_MIN + bloqueMin
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Resistencia en multipresa',
      minutos: bloqueMin,
      ejercicios: [
        {
          nombre: `Suspensiones ${trabajoS} s : ${descansoS} s en regleta de ${REGLETA_MM} mm, agarre semiarqueado`,
          series,
          repeticiones,
          trabajoS,
          descansoS,
          descansoSeriesS,
          hastaFallo: true,
          ...(kg !== undefined ? { cargaKg: kg } : {}),
          cargaTexto: cargaMultipresa(kg),
          notas: `${kg !== undefined
            ? `El ${porcentaje} % de tu último test.`
            : 'Sin test vigente no hay un 60 % que calcular: empieza con una carga que sostengas con margen y ajústala en la segunda serie, así te acercas sin pasarte.'} ${p.fase.descarga
            ? `Semana de descarga: ${repeticiones} repeticiones como mucho, sin acercarte al fallo.`
            : `Cada serie, hasta ${repeticiones} repeticiones o hasta que la siguiente ya no saldría limpia: para una antes del fallo.`}`,
          ficha: 'resistencia-10-6',
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa-resistencia-fuerza',
        p.fase.descarga ? ['P-36', 'P-09', 'P-10', 'P-48'] : ['P-36', 'P-09', 'P-10'],
        `${p.fase.descarga ? `Semana de descarga: una sola serie de ${repeticiones} como mucho, lejos del fallo. ` : ''}Resistencia: ${trabajoS} s colgado : ${descansoS} s de descanso, hasta ${repeticiones} repeticiones por serie, ${series === 1 ? '1 serie' : `${series} series con ${descansoSeriesS / 60} min entre series`}, en regleta de 20 mm semiarqueado, al ${porcentaje} % fijo de tu fuerza máxima. Es el protocolo con ensayo que mejoró la resistencia (Devise 2022, en avanzados); las suspensiones al máximo no la mejoraron.`,
      ),
    },
  ]
  return plan(
    sesionDe('multipresa-resistencia-fuerza', p, total, 'alta', {
      regletaMm: REGLETA_MM, agarre: 'semiarqueado', conCarga: kg !== undefined && kg > 0,
    }),
    bloques,
  )
}

// 4x4 (P-37, diseño): 4 bloques fáciles, 4 vueltas, 4 min entre vueltas (cada vuelta ≈ 4 min). En descarga, 2 vueltas.
function construir4x4(p: Peticion): SesionPlan | null {
  const { bloques: nBloques, descansoVueltaMin } = VALORES['P-37']
  const vueltas = p.fase.descarga ? VALORES['P-37'].vueltas / 2 : VALORES['P-37'].vueltas
  const minutosVuelta = nBloques // unos 1 min por bloque fácil
  const principal = Math.ceil((vueltas * minutosVuelta + (vueltas - 1) * descansoVueltaMin) / 5) * 5
  const total = CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + principal
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Bloques progresivos',
      minutos: PROGRESIVOS_BLOQUE_MIN,
      ejercicios: [{ nombre: '3-4 bloques por debajo de tu nivel, de menos a más', cargaTexto: 'Esfuerzo percibido 5–7 de 10', ficha: 'calentamiento-progresivo' }],
      explicacion: explicar('plantilla.progresivos', ['P-49'], 'Antes del 4x4 se sube la intensidad poco a poco.'),
    },
    {
      nombre: '4x4',
      minutos: principal,
      ejercicios: [
        {
          nombre: `${nBloques} bloques fáciles para tu nivel encadenados, ${vueltas} vueltas`,
          series: vueltas,
          repeticiones: nBloques,
          descansoSeriesS: descansoVueltaMin * 60,
          cargaTexto: 'Esfuerzo alto por el bombeo, 7–8 de 10',
          notas: 'Bloques fáciles: el objetivo es el bombeo acumulado, no la dificultad. Para ante cualquier dolor.',
          ficha: 'cuatro-por-cuatro',
        },
      ],
      explicacion: explicar(
        'plantilla.4x4',
        p.fase.descarga ? ['P-37', 'P-48'] : ['P-37'],
        `${p.fase.descarga ? 'Semana de descarga: la mitad de vueltas. ' : ''}4x4: ${nBloques} bloques fáciles, ${vueltas} vueltas y 4 min de descanso entre vueltas. Es la pauta clásica de entrenadores para la resistencia de fuerza en bloque; no hay ensayo que la mida, así que los bloques son fáciles para tu nivel para que el cansancio venga de encadenar, no de un paso duro.`,
      ),
    },
  ]
  return plan(sesionDe('resistencia-4x4', p, total, 'alta'), bloques)
}

// Pegues a un proyecto en roca (P-61: como mucho 4 intentos; P-51: 20 min de recuperación activa entre ellos).
const CALENTAMIENTO_ROCA_MIN = 20

function construirPegues(p: Peticion): SesionPlan | null {
  const total = (n: number): number => CALENTAMIENTO_ROCA_MIN + n * INTENTO_VIA_MIN
  let n = VALORES['P-61'].maxIntentos
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null
  const bloques: Bloque[] = [
    {
      nombre: 'Calentamiento en roca',
      minutos: CALENTAMIENTO_ROCA_MIN,
      ejercicios: [{ nombre: '2-3 vías fáciles de menos a más', cargaTexto: 'Esfuerzo percibido 3–6 de 10', ficha: 'calentamiento-progresivo' }],
      explicacion: explicar('plantilla.calentamiento', ['P-49'], 'Calentamiento específico de menos a más antes de los pegues.'),
    },
  ]
  for (let i = 1; i <= n; i++) {
    bloques.push({
      nombre: `Pegue ${i} al proyecto`,
      minutos: INTENTO_VIA_MIN,
      ejercicios: [
        {
          nombre: 'Pegue a tu proyecto: trabaja las secuencias o intenta encadenar',
          cargaTexto: 'Esfuerzo máximo, 9–10 de 10',
          notas: `Lee la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes. En los reposos, sacude el brazo colgando. Después, 20 min de recuperación activa suave, no reposo pasivo.`,
          ficha: 'via-limite-cuerda',
          fichasExtra: ['respiracion-voy', 'tactica-encadene'],
        },
      ],
      explicacion: explicar(
        'plantilla.pegues',
        ['P-51', 'P-52', 'P-53', 'P-61'],
        `Hasta ${VALORES['P-61'].maxIntentos} pegues al límite por sesión, con lectura previa, reposos sacudiendo y al menos 20 min de recuperación activa entre ellos.`,
      ),
    })
  }
  return plan(sesionDe('pegues-proyecto', p, total(n), 'alta'), bloques)
}

// Tras el test máximo, si hay tiempo: 10 min de descanso, el colgado continuo en 30 mm (P-24) y el power slap (P-19).
// Los 5 min del colgado tras 10 de descanso son los de la batería del informe 2026-10-31; los 5 del power slap dan para
// 3 intentos con descanso completo entre ellos.
const DESCANSO_ENTRE_TESTS_MIN = 10
const TEST_RESISTENCIA_MIN = 5
const POWER_SLAP_MIN = 5
// Tope del cronómetro para el colgado continuo: nadie de este nivel se acerca a 10 min en un canto de 30 mm.
const COLGADO_TOPE_S = 600

function construirEvaluacion(p: Peticion): SesionPlan | null {
  const subidaMin = 5
  const testMin = 15
  const soloMaximo = CALENTAMIENTO_MIN + subidaMin + testMin
  if (soloMaximo > p.contexto.minutosDisponibles) return null
  const extra = DESCANSO_ENTRE_TESTS_MIN + TEST_RESISTENCIA_MIN + POWER_SLAP_MIN
  const conResistencia = soloMaximo + extra <= p.contexto.minutosDisponibles
  const total = conResistencia ? soloMaximo + extra : soloMaximo
  const { duracionS, intentos, descansoS } = VALORES['P-18']
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Subida progresiva de carga',
      minutos: subidaMin,
      ejercicios: [
        {
          nombre: 'Suspensiones cortas y fáciles añadiendo lastre en escalones',
          cargaTexto: 'Esfuerzo percibido 3–6 de 10',
          notas: 'Prepara el test sin fatigarte.',
          ficha: 'suspension-maxima-10s',
        },
      ],
      explicacion: explicar('plantilla.subida', ['P-18', 'P-49'], 'Antes del test se sube la carga en escalones tras el calentamiento.'),
    },
    {
      nombre: 'Test de fuerza máxima de dedos',
      minutos: testMin,
      ejercicios: [
        {
          nombre: `Suspensión máxima de ${duracionS} s en regleta de ${REGLETA_MM} mm, semiarqueado`,
          series: intentos,
          trabajoS: duracionS,
          descansoSeriesS: descansoS,
          cargaTexto: `Añade lastre en escalones hasta tu máximo de ${duracionS} s y apunta el mejor intento`,
          notas: 'Detente ante cualquier dolor. Vale el mejor intento completado.',
          ficha: 'suspension-maxima-10s',
        },
      ],
      explicacion: explicar(
        'plantilla.evaluacion',
        ['P-17', 'P-18', 'P-09', 'P-10'],
        'Hasta 3 intentos de 10 s con 3 min de descanso, en regleta de 20 mm semiarqueado; el resultado se anota en % del peso corporal.',
      ),
    },
  ]
  if (conResistencia) {
    const { regletaMm, minimoS } = VALORES['P-24']
    bloques.push(
      {
        nombre: 'Descanso entre tests',
        minutos: DESCANSO_ENTRE_TESTS_MIN,
        ejercicios: [{ nombre: 'Descanso suave, sin colgarte', cargaTexto: 'Sin esfuerzo' }],
        explicacion: explicar('plantilla.descanso-tests', ['P-24'], 'Se descansa antes del test de resistencia para no mezclar la fatiga del máximo.'),
      },
      {
        nombre: 'Test de resistencia: colgado en 30 mm',
        minutos: TEST_RESISTENCIA_MIN,
        ejercicios: [
          {
            nombre: `Colgado continuo a dos manos en canto de ${regletaMm} mm a peso corporal, hasta soltar`,
            trabajoS: COLGADO_TOPE_S,
            hastaFallo: true,
            continuo: true,
            cargaTexto: 'Peso corporal, sin lastre',
            notas: `Semiarqueado y brazos estirados; el tiempo corre hasta que sueltas o pierdes el semiarqueado. Si no llegas a ${minimoS} s, descansa 3 min y repítelo con descarga (polea o pies apoyados) y apunta ese tiempo.`,
            ficha: 'colgado-30mm',
          },
        ],
        explicacion: explicar(
          'plantilla.test-resistencia',
          ['P-24', 'P-19'],
          'Colgado continuo en canto de 30 mm a peso corporal hasta soltar (batería IRCRA, r 0,81-0,87 con el grado). Como varía bastante de un día a otro, solo cuenta como cambio real a partir de un 25 %.',
        ),
      },
      {
        nombre: 'Power slap',
        minutos: POWER_SLAP_MIN,
        ejercicios: [
          {
            nombre: 'Power slap',
            series: 3,
            descansoSeriesS: 60,
            cargaTexto: '3 intentos con 1 min de descanso; vale el mejor',
            notas: 'Agarre estrecho, a la anchura de los hombros, en barra o presas grandes. Desde los brazos estirados, tira explosivo y da una palmada en la cinta métrica de la pared. Apunta los cm por encima de la mano.',
            ficha: 'power-slap',
          },
        ],
        explicacion: explicar(
          'plantilla.power-slap',
          ['P-19', 'P-27'],
          'Power slap: mide la potencia de tirón con una cinta métrica (CCI 0,95-0,98; con agarre estrecho, r 0,69-0,79 con el grado; Faggian 2024). Cambio real a partir de 10 cm o un 15 %. Al guardar el resultado, puntúa también tu técnica de 1 a 7 sobre un vídeo tuyo.',
        ),
      },
    )
  }
  const sesion = sesionDe('evaluacion-dedos', p, total, 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: true,
  })
  return plan(sesion, bloques)
}

// Decisiones de diseño de este tramo (duraciones de bloques que no están en parametros.md).
const BLOQUE_PRINCIPAL_MIN = 35

function bloquePrincipalMasCalentamiento(
  p: Peticion,
  nombre: string,
  ejercicios: Bloque['ejercicios'],
  explicacion: Bloque['explicacion'],
): { total: number; bloques: Bloque[] } | null {
  const total = CALENTAMIENTO_MIN + BLOQUE_PRINCIPAL_MIN
  if (total > p.contexto.minutosDisponibles) return null
  return {
    total,
    bloques: [bloqueCalentamiento(), { nombre, minutos: BLOQUE_PRINCIPAL_MIN, ejercicios, explicacion }],
  }
}

function construirBoard(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques en board por debajo del máximo',
    [
      {
        nombre: '5 bloques en board, uno o dos grados por debajo de tu límite',
        series: 5,
        repeticiones: 3,
        descansoSeriesS: 180,
        cargaTexto: 'Esfuerzo percibido 6–7 de 10',
        notas: '3 intentos por bloque con 3 min de descanso. Para ante cualquier dolor.',
      },
    ],
    explicar(
      'plantilla.board',
      ['P-38', 'P-49'],
      'En la fase de fuerza, una sesión semanal de bloques en board por debajo del máximo; cuenta como sesión intensa de dedos.',
    ),
  )
  return base && plan(sesionDe('board', p, base.total, 'alta'), base.bloques)
}

function construirBloqueSuave(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques cómodos',
    [
      {
        nombre: '4 bloques cómodos para tu nivel, variando tipos de presa',
        series: 4,
        cargaTexto: 'Esfuerzo percibido 3–5 de 10',
        notas: 'Sustituye a la sesión intensa cuando falta el día de descanso entre sesiones intensas de dedos.',
        ficha: 'practica-tecnica',
      },
    ],
    explicar('plantilla.bloque-suave', ['P-54'], 'Variar vías y tipos de presa mantiene la práctica técnica sin cargar los dedos.'),
  )
  return base && plan(sesionDe('bloque-suave', p, base.total, 'suave'), base.bloques)
}

// Modalidad de la práctica técnica según el contexto: en roca, vías por debajo del nivel; con compañero en el
// rocódromo, vías con cuerda; sin compañero, bloque y autoaseguradas (nunca cuerda).
function modalidadTecnica(p: Peticion): string {
  if (p.contexto.lugar === 'roca') return 'Vías por debajo de tu nivel en roca'
  if (p.contexto.compania === 'con-gente') return 'Vías con cuerda de nivel cómodo'
  return 'Bloque y vías autoaseguradas de nivel cómodo'
}

// El ejercicio técnico de la semana: rota cada semana natural, el mismo toda la semana (entrenadores, nivel C).
export const EJERCICIOS_TECNICA_SEMANA: readonly Ejercicio[] = [
  { nombre: 'Ejercicio de la semana: pies silenciosos', cargaTexto: '10 min en vías fáciles', ficha: 'pies-silenciosos' },
  { nombre: 'Ejercicio de la semana: manos pegadas', cargaTexto: '10 min en vías fáciles', ficha: 'manos-pegadas' },
  { nombre: 'Ejercicio de la semana: brazos estirados y «mismo lado»', cargaTexto: '2-3 travesías de 2-3 min', ficha: 'mismo-lado' },
  { nombre: 'Ejercicio de la semana: placa sin manos y destrepe', cargaTexto: '2-3 vías fáciles', ficha: 'placa-sin-manos' },
]

// En roca, siempre pies silenciosos: los otros son de rocódromo (destrepar o soltar manos en roca no es prudente).
export function ejercicioTecnicaSemana(fecha: string, lugar: Peticion['contexto']['lugar'] = 'rocodromo'): Ejercicio {
  if (lugar === 'roca') return { ...EJERCICIOS_TECNICA_SEMANA[0]! }
  const d = diaNumero(fecha)
  const semana = Math.floor((d - desdeLunes(d)) / 7)
  return { ...EJERCICIOS_TECNICA_SEMANA[((semana % 4) + 4) % 4]! }
}

function construirTecnica(p: Peticion): SesionPlan | null {
  const modalidad = modalidadTecnica(p)
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Práctica técnica',
    [
      {
        nombre: `${modalidad}: tu vía de práctica, 2-3 pegues buscando que salga fluida`,
        cargaTexto: 'Esfuerzo percibido 4–5 de 10',
        notas: 'Repite la misma vía de una sesión a otra hasta que fluya; si ya fluye, llevas unas 7 sesiones con ella o la desmontan, elige otra.',
        ficha: 'via-de-practica',
      },
      { nombre: '1-2 vías nuevas parecidas, a vista, variando el tipo de presa', cargaTexto: 'Esfuerzo percibido 4–5 de 10', ficha: 'practica-tecnica' },
      ejercicioTecnicaSemana(p.fecha, p.contexto.lugar),
      {
        nombre: `Previsualiza la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes de cada intento`,
        cargaTexto: 'Sin esfuerzo',
        ficha: 'practica-tecnica',
      },
      { nombre: 'Graba al menos una vía en vídeo y revísala', cargaTexto: 'Sin esfuerzo', ficha: 'video-autoevaluacion' },
    ],
    explicar(
      'plantilla.tecnica',
      ['P-53', 'P-54', 'P-55'],
      'Práctica técnica: una vía de práctica repetida hasta que fluya y 1-2 vías nuevas (Hacques 2022, en novatos: repetir mejora la fluidez en esa vía y variar hace la mirada más anticipatoria), con lectura previa de hasta 3 min y vídeo para revisar la ejecución. Además, un ejercicio técnico que cambia cada semana (pies silenciosos, manos pegadas, «mismo lado», placa sin manos; en roca, siempre pies silenciosos): son ejercicios clásicos de entrenadores (Gresham, Anderson) y de rocódromos, sin estudio que mida su efecto.',
    ),
  )
  return base && plan(sesionDe('tecnica', p, base.total, 'suave'), base.bloques)
}

// ARC (P-35): se alterna A (continuo) y B (on-offs) según cuántas sesiones de ARC hay antes de hoy, como el hombro.
export type RutinaArc = 'A' | 'B'

export function rutinaArc(p: Peticion): RutinaArc {
  const hoy = diaNumero(p.fecha)
  return p.historial.filter((s) => s.tipo === 'arc' && diaNumero(s.fecha) < hoy).length % 2 === 0 ? 'A' : 'B'
}

function construirArc(p: Peticion): SesionPlan | null {
  const v = VALORES['P-35']
  if (rutinaArc(p) === 'B') {
    const vueltas = p.fase.descarga ? v.onOffsDescarga : v.onOffs
    const bloqueMin = 2 * vueltas
    if (CALENTAMIENTO_MIN + bloqueMin <= p.contexto.minutosDisponibles) {
      return plan(sesionDe('arc', p, CALENTAMIENTO_MIN + bloqueMin, 'suave'), [
        bloqueCalentamiento(),
        {
          nombre: 'On-offs',
          minutos: bloqueMin,
          ejercicios: [
            {
              // El cronómetro lo guía con pitidos: 1 min escalando y 1 min de descanso, `vueltas` veces.
              nombre: `${vueltas} × (1 min escalando / 1 min de descanso)`,
              series: 1,
              repeticiones: vueltas,
              trabajoS: 60,
              descansoS: 60,
              hastaFallo: true,
              escalando: true,
              cargaTexto: 'Unos 2 grados por debajo de tu nivel a vista',
              notas: 'Bombeo alto solo en las últimas; si llega antes, baja la dificultad.',
              ficha: 'on-offs',
            },
          ],
          explicacion: explicar(
            'plantilla.arc-on-offs',
            ['P-35'],
            `${p.fase.descarga ? 'Semana de descarga: la mitad de vueltas. ' : ''}Capacidad, alternando con el ARC continuo: on-offs de 1 min escalando y 1 min de descanso. Es el protocolo de capacidad que usa Lattice; no hay ensayo que lo compare con el ARC continuo, así que se alternan semana a semana para trabajar la capacidad de las dos formas que proponen los entrenadores.`,
          ),
        },
      ])
    }
  }
  const { minutosSerie, minutosSerieCorta, descansoMin } = v
  const total = (series: number, serieMin: number): number => CALENTAMIENTO_MIN + series * serieMin + (series - 1) * descansoMin
  const opciones: [number, number][] = p.fase.descarga
    ? [[v.series, minutosSerie], [v.series, minutosSerieCorta]]
    : [[v.seriesMax, minutosSerie], [v.series, minutosSerie], [v.series, minutosSerieCorta]]
  const elegida = opciones.find(([n, m]) => total(n, m) <= p.contexto.minutosDisponibles)
  if (!elegida) return null
  const [series, serieMin] = elegida
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= series; i++) {
    if (i > 1) {
      bloques.push({
        nombre: `Descanso tras la serie ${i - 1}`,
        minutos: descansoMin,
        ejercicios: [{ nombre: 'Descanso suave, hidrátate', cargaTexto: 'Sin esfuerzo' }],
        explicacion: explicar('plantilla.arc-descanso', ['P-35'], 'Entre las series de ARC se descansa 10 minutos.'),
      })
    }
    bloques.push({
      nombre: `Serie de ARC ${i}`,
      minutos: serieMin,
      ejercicios: [
        {
          nombre: `${serieMin} min de escalada continua sin bombeo marcado`,
          cargaTexto: 'Esfuerzo percibido 3–4 de 10',
          notas: 'Si notas bombeo, baja la dificultad.',
          ficha: 'arc',
        },
      ],
      explicacion: explicar(
        'plantilla.arc',
        ['P-35'],
        `Capacidad: ${series} series de ${serieMin} minutos de escalada continua sin bombeo marcado, con 10 minutos de descanso (se alterna con los on-offs). No hay ensayo de ARC, pero la capacidad aeróbica del antebrazo se asocia al grado en estudios que comparan escaladores, y los entrenadores proponen 20-45 min continuos (Lattice) o 30 min o más (Anderson): las series de 15 min llegan a ese volumen dejando respirar entre medias.`,
      ),
    })
  }
  return plan(sesionDe('arc', p, total(series, serieMin), 'suave'), bloques)
}

// Con 40 min o más se añaden antagonistas y movilidad (decisión del usuario: días en casa de la fase base).
const ANTAGONISTAS_MOVILIDAD_MIN = 20

const hombroSinCarga = (p: Peticion): boolean => p.estado !== undefined && restriccionesDe(p.estado).hombroSinCarga

const explicacionHombroSinCarga = (): Explicacion =>
  explicar(
    'plantilla.hombro-sin-carga',
    ['P-41', 'P-43', 'P-64'],
    'Por tu semáforo de dolor, el trabajo de hombro va sin carga: solo movilidad y activación suave, los mismos minutos. Si duele, para.',
  )

// Rutina concreta de hombro y antagonistas (P-41): dos rutinas que se alternan, A, B, A…, según cuántas sesiones o
// complementos de hombro hay en el historial antes de hoy. Decisión de diseño: P-41 fija la frecuencia (2 por semana,
// 15 min), no la dosis; el tipo de ejercicio sigue el programa de EV-LESION-007 (cadena cerrada, excéntricos y fuerza).
// Las dosis van en el texto y no como series: el cronómetro sigue guiando el bloque como 15 min.
export type RutinaHombro = 'A' | 'B'

const ESFUERZO_HOMBRO = 'esfuerzo 5–6 de 10'
const ROTACION_EXTERNA: Ejercicio = {
  nombre: 'Rotación externa con banda',
  cargaTexto: `3 × 12, bajada en 3 s · ${ESFUERZO_HOMBRO}`,
  notas: 'Cada brazo, con el codo pegado al costado.',
  ficha: 'rotacion-externa-banda',
}

const RUTINAS_HOMBRO: Record<RutinaHombro, readonly Ejercicio[]> = {
  A: [
    { nombre: 'Retracciones escapulares colgado', cargaTexto: `3 × 8 · ${ESFUERZO_HOMBRO}`, notas: 'En barra, sin doblar los codos.', ficha: 'retracciones-escapulares' },
    { nombre: 'Flexiones', cargaTexto: `3 × 8-12 · ${ESFUERZO_HOMBRO}`, notas: 'Con las rodillas apoyadas si no salen con buena forma.', ficha: 'flexiones' },
    ROTACION_EXTERNA,
    { nombre: 'Y-T-W con banda', cargaTexto: `2 × 8 de cada · ${ESFUERZO_HOMBRO}`, ficha: 'ytw-banda' },
  ],
  B: [
    { nombre: 'Face pull con banda', cargaTexto: `3 × 12 · ${ESFUERZO_HOMBRO}`, notas: 'Con los codos altos.', ficha: 'face-pull-banda' },
    { nombre: 'Plancha con toques de hombro', cargaTexto: `3 × 30 s · ${ESFUERZO_HOMBRO}`, ficha: 'plancha-toques-hombro' },
    ROTACION_EXTERNA,
    { nombre: 'Extensores de dedos con banda', cargaTexto: '2 × 15 (opcional) · esfuerzo 3–4 de 10', notas: 'Cada mano.', ficha: 'extensores-dedos-banda' },
  ],
}

const cuentaHombro = (s: Sesion): boolean => s.tipo === 'hombro' || (s.incluye ?? []).includes('hombro')

export function rutinaHombro(p: Peticion): RutinaHombro {
  const hoy = diaNumero(p.fecha)
  const previas = p.historial.filter((s) => cuentaHombro(s) && diaNumero(s.fecha) < hoy).length
  return previas % 2 === 0 ? 'A' : 'B'
}

// Con dedos o muñeca fuera de verde (o chequeo bajo) el motor ya prohíbe colgarse en las dominadas (P-64, P-65): las
// retracciones colgado de la rutina A se cambian por face pull con banda.
const FACE_PULL_EN_LUGAR_DE_COLGARSE: Ejercicio = {
  nombre: 'Face pull con banda',
  cargaTexto: `3 × 12 · ${ESFUERZO_HOMBRO}`,
  notas: 'En lugar de las retracciones colgado: hoy nada de colgarse de la barra.',
  ficha: 'face-pull-banda',
}

const sinColgarse = (p: Peticion): boolean => p.estado !== undefined && restriccionesDe(p.estado).sinDominadas

const ejerciciosHombro = (r: RutinaHombro, p: Peticion): Ejercicio[] =>
  RUTINAS_HOMBRO[r].map((e) => (e.ficha === 'retracciones-escapulares' && sinColgarse(p) ? { ...FACE_PULL_EN_LUGAR_DE_COLGARSE } : { ...e }))

const explicacionRutinaHombro = (r: RutinaHombro): Explicacion =>
  explicar(
    'plantilla.hombro',
    ['P-41'],
    `Rutina ${r} de hombro y antagonistas (se alterna con la ${r === 'A' ? 'B' : 'A'}), 15 minutos. El tipo de ejercicio sigue el programa del ensayo EV-LESION-007: cadena cerrada, excéntricos y de fuerza. El ensayo fija la frecuencia (unos 15 min, 2 veces por semana, P-41) pero no publica los ejercicios exactos; se usan los habituales de ese tipo de programa (retracciones, flexiones, rotación externa, Y-T-W, face pull) con un esfuerzo moderado que no canse antes de escalar.`,
  )

// Sin carga (hombro o codo en ámbar, o rojo en dedos, muñeca o codo): solo movilidad y activación, sin peso, sin bandas
// y sin colgarse.
const MOVILIDAD_SIN_CARGA: Ejercicio = {
  nombre: 'Movilidad de hombro y activación escapular, sin peso ni bandas',
  cargaTexto: 'Sin esfuerzo',
  notas: 'Solo rangos sin dolor.',
  ficha: 'movilidad',
}

function construirHombro(p: Peticion): SesionPlan | null {
  const activacionMin = 5
  const corto = activacionMin + VALORES['P-41'].minutos
  if (corto > p.contexto.minutosDisponibles) return null
  if (hombroSinCarga(p)) {
    return plan(sesionDe('hombro', p, corto, 'suave', { conCarga: false }), [
      {
        nombre: 'Movilidad y activación',
        minutos: activacionMin,
        ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular suave', cargaTexto: 'Esfuerzo percibido 1–2 de 10', ficha: 'movilidad' }],
        explicacion: explicacionHombroSinCarga(),
      },
      {
        nombre: 'Movilidad sin carga',
        minutos: VALORES['P-41'].minutos,
        ejercicios: [{ nombre: 'Movilidad de hombro, cadera y muñecas, sin peso ni bandas', cargaTexto: 'Sin esfuerzo', notas: 'Solo rangos sin dolor.', ficha: 'movilidad' }],
        explicacion: explicacionHombroSinCarga(),
      },
    ])
  }
  const largo = corto + ANTAGONISTAS_MOVILIDAD_MIN <= p.contexto.minutosDisponibles
  const total = largo ? corto + ANTAGONISTAS_MOVILIDAD_MIN : corto
  const r = rutinaHombro(p)
  const bloques: Bloque[] = [
    {
      nombre: 'Movilidad y activación',
      minutos: activacionMin,
      ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular suave', cargaTexto: 'Esfuerzo percibido 2–3 de 10', ficha: 'movilidad' }],
      explicacion: explicar('plantilla.hombro-activacion', ['P-41'], 'Se activa el hombro antes del trabajo de fuerza.'),
    },
    {
      nombre: 'Hombro y antagonistas',
      minutos: VALORES['P-41'].minutos,
      ejercicios: ejerciciosHombro(r, p),
      explicacion: explicacionRutinaHombro(r),
    },
    ...(largo
      ? [
          {
            nombre: 'Antagonistas y movilidad',
            minutos: ANTAGONISTAS_MOVILIDAD_MIN,
            ejercicios: [
              { nombre: 'Empujes: flexiones a ritmo cómodo', cargaTexto: 'Esfuerzo percibido 4–5 de 10', ficha: 'flexiones' },
              { nombre: 'Extensores de dedos con banda (opcional)', cargaTexto: 'Esfuerzo percibido 3–4 de 10', ficha: 'extensores-dedos-banda' },
              { nombre: 'Movilidad de cadera, hombro y muñecas', cargaTexto: 'Sin esfuerzo', ficha: 'movilidad' },
            ],
            explicacion: explicar(
              'plantilla.antagonistas',
              ['P-41'],
              'Antagonistas: empujes y extensores de dedos (opcionales, P-41). La movilidad completa la mañana en casa sin cargar los dedos; no hay estudio que fije sus minutos, y los entrenadores proponen bloques cortos de movilidad de 10-15 min varios días por semana.',
            ),
          },
        ]
      : []),
  ]
  return plan(sesionDe('hombro', p, total, 'suave'), bloques)
}

// Dominadas lastradas como sesión (P-39; decisión de Diego del 2026-10-29 para las mañanas en casa con barra): el
// mismo 4x4 del complemento, con calentamiento propio de barra (P-49) y una vuelta a la calma corta. Suave, como el
// complemento: 2 repeticiones en reserva, sin fallo. Las reglas seguridad.dominadas-* las controlan igual que al
// complemento. 10 + 15 + 5 = 30 min, que caben en una mañana de 45-60 min.
const VUELTA_CALMA_DOMINADAS_MIN = 5

// Dominadas: se alternan A (lastradas, P-39) y B (potencia, P-73) según cuántas hay en el historial antes de hoy.
export function rutinaDominadas(p: Peticion): 'A' | 'B' {
  const hoy = diaNumero(p.fecha)
  return p.historial.filter((s) => s.tipo === 'dominadas' && diaNumero(s.fecha) < hoy).length % 2 === 0 ? 'A' : 'B'
}

function construirDominadas(p: Peticion): SesionPlan | null {
  const b = rutinaDominadas(p) === 'B' ? construirDominadasPotencia(p) : null
  return b ?? construirDominadasLastradas(p)
}

// B (P-73, Vigouroux y Devise 2024): explosivas y excéntricas en barra, lejos del fallo. Series y repeticiones, diseño.
function construirDominadasPotencia(p: Peticion): SesionPlan | null {
  const v = VALORES['P-73']
  const total = CALENTAMIENTO_MIN + v.minutos + VUELTA_CALMA_DOMINADAS_MIN
  if (total > p.contexto.minutosDisponibles) return null
  const explicacion = explicar(
    'plantilla.dominadas-potencia',
    ['P-73', 'P-39'],
    `Sesión opcional, alternando con las lastradas: potencia de tirón sin campus. En escaladores avanzados, las dominadas excéntricas y pliométricas 2 veces por semana durante 5 semanas subieron la fuerza y la velocidad de tirón (Vigouroux y Devise 2024). El estudio no publica las series exactas: se hacen pocas repeticiones lejos del fallo para que cada una sea rápida y para no cargar los codos. Mismas reglas que las lastradas: como mucho 1 por semana y nunca el día de dedos intensos.`,
  )
  return plan(sesionDe('dominadas', p, total, 'suave'), [
    {
      nombre: 'Calentamiento en barra',
      minutos: CALENTAMIENTO_MIN,
      ejercicios: [{ nombre: 'Movilidad de hombro y escápulas, colgarse de la barra y dominadas sin lastre de menos a más', cargaTexto: 'Esfuerzo percibido 2–4 de 10', ficha: 'calentamiento-barra' }],
      explicacion: explicar('plantilla.dominadas-calentamiento', ['P-39', 'P-49'], 'Unos 10 minutos de calentamiento de menos a más antes de las dominadas.'),
    },
    {
      nombre: 'Potencia en barra',
      minutos: v.minutos,
      ejercicios: [
        {
          nombre: 'Dominadas explosivas',
          series: v.explosivasSeries,
          descansoSeriesS: v.explosivasDescansoMin * 60,
          cargaTexto: `${v.repMin}-${v.repMax} repeticiones, lejos del fallo`,
          notas: 'Sube lo más rápido que puedas y baja controlando. Para la serie si pierdes velocidad. Si aún no haces 5 dominadas seguidas, sáltate estas y haz solo las excéntricas.',
          ficha: 'dominadas-explosivas',
        },
        {
          nombre: 'Dominadas excéntricas',
          series: v.excentricasSeries,
          descansoSeriesS: v.excentricasDescansoMin * 60,
          cargaTexto: `${v.repMin}-${v.repMax} bajadas de ${v.bajadaSMin}-${v.bajadaSMax} s`,
          notas: 'Sube con un salto o con ayuda y baja despacio.',
          ficha: 'dominadas-excentricas',
        },
      ],
      explicacion,
    },
    {
      nombre: 'Vuelta a la calma',
      minutos: VUELTA_CALMA_DOMINADAS_MIN,
      ejercicios: [{ nombre: 'Movilidad suave de hombro, espalda y muñecas', cargaTexto: 'Sin esfuerzo', ficha: 'movilidad' }],
      explicacion: explicar('plantilla.dominadas-vuelta-calma', ['P-39'], 'Unos minutos de movilidad suave para terminar, como al final de cualquier sesión de fuerza.'),
    },
  ])
}

function construirDominadasLastradas(p: Peticion): SesionPlan | null {
  const { minutos, series, repeticiones, repeticionesEnReserva, descansoMin } = VALORES['P-39']
  const total = CALENTAMIENTO_MIN + minutos + VUELTA_CALMA_DOMINADAS_MIN
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    {
      nombre: 'Calentamiento en barra',
      minutos: CALENTAMIENTO_MIN,
      ejercicios: [
        {
          nombre: 'Movilidad de hombro y escápulas, colgarse de la barra y dominadas sin lastre de menos a más',
          cargaTexto: 'Esfuerzo percibido 2–4 de 10',
          ficha: 'calentamiento-barra',
        },
      ],
      explicacion: explicar(
        'plantilla.dominadas-calentamiento',
        ['P-39', 'P-49'],
        'Unos 10 minutos de calentamiento de menos a más antes de las dominadas lastradas.',
      ),
    },
    {
      nombre: 'Dominadas lastradas',
      minutos,
      ejercicios: [
        {
          nombre: 'Dominadas lastradas en barra',
          series,
          repeticiones,
          descansoSeriesS: descansoMin * 60,
          cargaTexto: `Lastre que te deje ${repeticionesEnReserva} repeticiones en reserva`,
          notas: 'En barra, no en la multipresa. Si notas el codo o el hombro, para.',
          ficha: 'dominadas-lastradas',
        },
      ],
      explicacion: explicar(
        'plantilla.dominadas',
        ['P-39'],
        `Sesión opcional: ${series} series de ${repeticiones} dominadas lastradas, ${descansoMin} min de descanso. No hay ensayo que las ligue al grado, así que van como opción y con una pauta de fuerza general sin llegar al fallo (dejar 2 en reserva), como mucho 1 vez por semana y nunca el día de dedos intensos.`,
      ),
    },
    {
      nombre: 'Vuelta a la calma',
      minutos: VUELTA_CALMA_DOMINADAS_MIN,
      ejercicios: [{ nombre: 'Movilidad suave de hombro, espalda y muñecas', cargaTexto: 'Sin esfuerzo', ficha: 'movilidad' }],
      explicacion: explicar('plantilla.dominadas-vuelta-calma', ['P-39'], 'Unos minutos de movilidad suave para terminar, como al final de cualquier sesión de fuerza.'),
    },
  ]
  return plan(sesionDe('dominadas', p, total, 'suave'), bloques)
}

// Escalada al límite. Decisiones de diseño: 15 min de vías o bloques progresivos y, en vía, hasta 3 intentos
// (P-61 permite hasta 4) de unos 5 min, cada uno seguido de 20 min de recuperación activa (P-51).
const PROGRESIVAS_VIA_MIN = 15
const INTENTO_VIA_MIN = 25
const MAX_INTENTOS_VIA = 3
const PROGRESIVOS_BLOQUE_MIN = 10
const BLOQUES_LIMITE_MIN = [30, 20] as const

// P-76: si te limita la cabeza, una vía al límite por semana (lunes a domingo) en rocódromo lleva caídas progresivas:
// solo si no hay otra vía al límite esa semana (hecha o planificada, antes o después) y como mucho 6 semanas de las 12
// anteriores con vía al límite (la dosis de Ilgner es de 4-6 semanas; pasado el trimestre, si la cabeza sigue frenando,
// vuelve).
export function tocanCaidas(p: Peticion): boolean {
  if (p.limitantePrincipal !== 'cabeza' || p.contexto.lugar !== 'rocodromo') return false
  const { semanas, ventanaSemanas } = VALORES['P-76']
  const d = diaNumero(p.fecha)
  const lunes = d - desdeLunes(d)
  const vias = p.historial.filter((s) => s.tipo === 'via-cuerda-limite').map((s) => diaNumero(s.fecha))
  if (vias.some((x) => x >= lunes && x <= lunes + 6)) return false
  const anteriores = new Set(vias.filter((x) => x < lunes && x >= lunes - 7 * ventanaSemanas).map((x) => x - desdeLunes(x)))
  return anteriores.size < semanas
}

function bloqueCaidas(): Bloque {
  const { minutos, caidasMin, caidasMax } = VALORES['P-76']
  return {
    nombre: 'Caídas progresivas',
    minutos,
    ejercicios: [
      {
        nombre: `${caidasMin}-${caidasMax} caídas a propósito, de menos a más`,
        cargaTexto: 'Sin prisa: sube de escalón solo si la anterior fue sin ansiedad',
        notas: 'En una vía desplomada y limpia. Quien te asegura tiene que saber dar un aseguramiento dinámico; si no, quédate en top-rope. Cuerda siempre por delante de la pierna. Top-rope o chapa a la cintura, después a los pies y por encima.',
        ficha: 'caidas-progresivas',
      },
    ],
    explicacion: explicar(
      'plantilla.caidas',
      ['P-76', 'P-62'],
      'Tus respuestas dicen que te frena la cabeza: una vía al límite por semana lleva caídas progresivas. Arno Ilgner propone 3-5 caídas al empezar una sesión por semana, durante 4-6 semanas (sin estudio que lo mida y con dudas sobre si se transfiere a roca). Se hace en rocódromo porque hace falta un desplome limpio para caer sin golpes.',
    ),
  }
}

function construirViaLimite(p: Peticion): SesionPlan | null {
  const caidas = tocanCaidas(p)
  const extra = caidas ? VALORES['P-76'].minutos : 0
  const total = (n: number): number => CALENTAMIENTO_MIN + extra + PROGRESIVAS_VIA_MIN + n * INTENTO_VIA_MIN
  let n = MAX_INTENTOS_VIA
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) {
    if (!caidas) return null
    // Sin sitio para las caídas y un intento: la sesión de siempre.
    const { limitantePrincipal: _limitante, ...sinCabeza } = p
    return construirViaLimite(sinCabeza)
  }
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Vías progresivas',
      minutos: PROGRESIVAS_VIA_MIN,
      ejercicios: [
        { nombre: '2 vías con cuerda por debajo de tu nivel, de menos a más', series: 2, cargaTexto: 'Esfuerzo percibido 5–7 de 10', ficha: 'calentamiento-progresivo' },
      ],
      explicacion: explicar('plantilla.progresivas', ['P-49'], 'Antes de los intentos al límite se sube la intensidad poco a poco.'),
    },
    // Las caídas, ya calientes: dedos y hombros listos para frenar.
    ...(caidas ? [bloqueCaidas()] : []),
  ]
  for (let i = 1; i <= n; i++) {
    bloques.push({
      nombre: `Intento al límite ${i}`,
      minutos: INTENTO_VIA_MIN,
      ejercicios: [
        {
          nombre: 'Intento a una vía con cuerda en tu límite (una que no encadenas a vista)',
          cargaTexto: 'Esfuerzo máximo, 9–10 de 10',
          notas: `Lee la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes. En los reposos, sacude el brazo colgando. Después, 20 min de recuperación activa suave (pedalear o caminar), no reposo pasivo.`,
          ficha: 'via-limite-cuerda',
          fichasExtra: ['respiracion-voy'],
        },
      ],
      explicacion: explicar(
        'plantilla.via-limite',
        ['P-51', 'P-52', 'P-53', 'P-61'],
        'Intentos al límite con previsualización, reposos sacudiendo el antebrazo y al menos 20 min de recuperación activa entre intentos; como mucho 3 por sesión (P-61 admite 4).',
      ),
    })
  }
  return plan(sesionDe('via-cuerda-limite', p, total(n), 'alta'), bloques)
}

function construirBloqueLimite(p: Peticion): SesionPlan | null {
  const principal = BLOQUES_LIMITE_MIN.find(
    (m) => CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + m <= p.contexto.minutosDisponibles,
  )
  if (principal === undefined) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Bloques progresivos',
      minutos: PROGRESIVOS_BLOQUE_MIN,
      ejercicios: [{ nombre: '3-4 bloques por debajo de tu nivel, de menos a más', cargaTexto: 'Esfuerzo percibido 5–7 de 10', ficha: 'calentamiento-progresivo' }],
      explicacion: explicar('plantilla.progresivos', ['P-49'], 'Antes de los bloques al límite se sube la intensidad poco a poco.'),
    },
    {
      nombre: 'Bloques al límite',
      minutos: principal,
      ejercicios: [
        {
          nombre: `Bloques cerca de tu límite durante ${principal} min`,
          cargaTexto: 'Esfuerzo alto, 8–9 de 10',
          notas: 'Hasta 4 intentos por bloque y 3-4 min de descanso entre intentos. Lee el bloque antes de cada intento. Para ante cualquier dolor.',
          ficha: 'bloques-limite',
        },
      ],
      explicacion: explicar(
        'plantilla.bloque-limite',
        ['P-15', 'P-53'],
        'Bloque cerca del límite: cuenta como sesión intensa de dedos y se lee el problema antes de cada intento. Pocos intentos de calidad con descanso completo, como recomiendan los entrenadores para la potencia; no hay ensayo que fije cuántos.',
      ),
    },
  ]
  return plan(sesionDe('bloque-limite', p, CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + principal, 'alta'), bloques)
}

// Bloques de complemento: sin calentamiento propio (la sesión ya está caliente). Devuelve null si no caben.
const TECNICA_COMPLEMENTO_MIN = 30

export function construirComplemento(tipo: TipoComplemento, p: Peticion, minutosLibres: number): Bloque | null {
  switch (tipo) {
    case 'hombro': {
      const minutos = VALORES['P-41'].minutos
      if (minutos > minutosLibres) return null
      if (hombroSinCarga(p)) {
        return {
          nombre: 'Complemento: movilidad de hombro sin carga',
          minutos,
          ejercicios: [{ ...MOVILIDAD_SIN_CARGA }],
          explicacion: explicacionHombroSinCarga(),
        }
      }
      const r = rutinaHombro(p)
      return {
        nombre: 'Complemento: hombro y antagonistas',
        minutos,
        ejercicios: ejerciciosHombro(r, p),
        explicacion: explicacionRutinaHombro(r),
      }
    }
    case 'dominadas': {
      const { minutos, series, repeticiones, repeticionesEnReserva, descansoMin } = VALORES['P-39']
      if (minutos > minutosLibres) return null
      return {
        nombre: 'Complemento: dominadas lastradas',
        minutos,
        ejercicios: [
          {
            nombre: 'Dominadas lastradas en barra',
            series,
            repeticiones,
            descansoSeriesS: descansoMin * 60,
            cargaTexto: `Lastre que te deje ${repeticionesEnReserva} repeticiones en reserva`,
            notas: 'En barra, no en la multipresa. Si notas el codo o el hombro, para.',
            ficha: 'dominadas-lastradas',
          },
        ],
        explicacion: explicar(
          'plantilla.dominadas',
          ['P-39'],
          `Complemento opcional: ${series} series de ${repeticiones} dominadas lastradas, ${descansoMin} min de descanso. No hay ensayo que las ligue al grado, así que van como opción y con una pauta de fuerza general sin llegar al fallo, y nunca el día de dedos intensos.`,
        ),
      }
    }
    case 'arc': {
      const { minutosSerie, minutosSerieCorta } = VALORES['P-35']
      const minutos = [minutosSerie, minutosSerieCorta].find((m) => m <= minutosLibres)
      if (minutos === undefined) return null
      return {
        nombre: 'Complemento: ARC',
        minutos,
        ejercicios: [{ nombre: `${minutos} min de escalada continua sin bombeo marcado`, cargaTexto: 'Esfuerzo percibido 3–4 de 10', ficha: 'arc' }],
        explicacion: explicar('plantilla.arc', ['P-35'], 'Una serie de escalada continua suave como volumen de capacidad al final de la sesión.'),
      }
    }
    case 'tecnica': {
      if (TECNICA_COMPLEMENTO_MIN > minutosLibres) return null
      const modalidad = modalidadTecnica(p)
      return {
        nombre: 'Complemento: práctica técnica',
        minutos: TECNICA_COMPLEMENTO_MIN,
        ejercicios: [
          { nombre: `${modalidad}: tu vía de práctica hasta que fluya y una vía nueva`, cargaTexto: 'Esfuerzo percibido 4–5 de 10', ficha: 'via-de-practica' },
          { nombre: 'Graba al menos una vía en vídeo y revísala', cargaTexto: 'Sin esfuerzo', ficha: 'video-autoevaluacion' },
        ],
        explicacion: explicar('plantilla.tecnica', ['P-54', 'P-55'], 'Volumen técnico a nivel cómodo: tu vía de práctica hasta que fluya y una vía nueva (P-54), con vídeo.'),
      }
    }
  }
}

export const TIPOS_CON_PLANTILLA: readonly TipoSesion[] = [
  'arc', 'bloque-limite', 'bloque-suave', 'board', 'dominadas', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia',
  'multipresa-resistencia-fuerza', 'pegues-proyecto', 'resistencia-4x4', 'tecnica', 'via-cuerda-limite',
]

// Core y movilidad (P-72): la alternativa suave cuando toca descansar. Dosis = decisión de diseño. Sin barra (roca) o
// sin poder colgarse (P-64, P-65), las elevaciones van tumbado.
const ejerciciosCore = (colgado: boolean): Ejercicio[] => [
  { nombre: 'Plancha frontal', cargaTexto: '3 × 30-45 s · descanso 45-60 s', ficha: 'plancha-frontal' },
  { nombre: 'Hollow', cargaTexto: '3 × 20-30 s · descanso 45-60 s', ficha: 'hollow' },
  colgado
    ? { nombre: 'Elevaciones de piernas colgado', cargaTexto: '3 × 6-10 · descanso 60 s', ficha: 'elevaciones-colgado' }
    : { nombre: 'Elevaciones de piernas tumbado', cargaTexto: '3 × 10-12 · descanso 45 s', ficha: 'elevaciones-tumbado' },
  { nombre: 'Plancha lateral', cargaTexto: '2 × 30 s por lado', ficha: 'plancha-lateral' },
]
const EJERCICIOS_MOVILIDAD: readonly Ejercicio[] = [
  { nombre: 'Rana', cargaTexto: '2 × 45 s', ficha: 'rana' },
  { nombre: '90/90 de cadera', cargaTexto: '2 × 5 por lado', ficha: 'cadera-90-90' },
  { nombre: 'Paso alto activo a la pared', cargaTexto: '2 × 8 por lado', ficha: 'paso-alto' },
  { nombre: 'Tobillo con la rodilla a la pared', cargaTexto: '2 × 10 por lado', ficha: 'tobillo' },
  { nombre: 'Dislocaciones de hombro con cinta o palo', cargaTexto: '2 × 10', ficha: 'dislocaciones-hombro' },
]

// Paso alto y tobillo solo con la sesión larga (en la corta no caben) y sin «otra» zona en ámbar (cargan tobillo y
// rodilla).
const SOLO_LARGA: readonly string[] = ['paso-alto', 'tobillo']
function ejerciciosMovilidad(larga: boolean, p: Peticion): Ejercicio[] {
  const otraAmbar = p.estado?.zonas.otra === 'ambar'
  return EJERCICIOS_MOVILIDAD.filter((e) => !SOLO_LARGA.includes(e.ficha ?? '') || (larga && !otraAmbar)).map((e) => ({ ...e }))
}

function construirCoreMovilidad(p: Peticion): SesionPlan | null {
  const { minutosMin, minutosMax } = VALORES['P-72']
  if (p.contexto.minutosDisponibles < minutosMin) return null
  const total = p.contexto.minutosDisponibles >= minutosMax ? minutosMax : minutosMin
  const core = total === minutosMax ? 18 : 12
  const colgado = p.contexto.lugar !== 'roca' && !sinColgarse(p)
  const explicacion = explicar(
    'plantilla.core-movilidad',
    ['P-72'],
    'Hoy toca descansar de escalar: si quieres moverte, core y movilidad suaves no cargan los dedos. No hay estudios de core en escaladores: son los ejercicios habituales de tensión corporal, en dosis cortas y suaves para que no te cansen para la próxima sesión.',
  )
  return plan(sesionDe('core-movilidad', p, total, 'suave'), [
    { nombre: 'Core', minutos: core, ejercicios: ejerciciosCore(colgado), explicacion },
    { nombre: 'Movilidad', minutos: total - core, ejercicios: ejerciciosMovilidad(total === minutosMax, p), explicacion },
  ])
}

// Test en casa (2026-11-01): dominadas máximas y apertura de cadera, los dos tests de la batería del informe 2026-10-31
// que solo necesitan la barra. Unos 15 min y suave: un esfuerzo corto que no carga los dedos. Sin poder colgarse hoy
// (P-64, P-65) no se propone.
export const TEST_CASA_MIN = 15
const TEST_CASA_CALENTAMIENTO_MIN = 5

function construirTestCasa(p: Peticion): SesionPlan | null {
  if (TEST_CASA_MIN > p.contexto.minutosDisponibles || sinColgarse(p)) return null
  const resto = (TEST_CASA_MIN - TEST_CASA_CALENTAMIENTO_MIN) / 2
  const { dominadas, caderaCm } = VALORES['P-19']
  return plan(sesionDe('test-casa', p, TEST_CASA_MIN, 'suave'), [
    {
      nombre: 'Calentamiento en barra',
      minutos: TEST_CASA_CALENTAMIENTO_MIN,
      ejercicios: [{ nombre: 'Movilidad de hombro y escápulas, colgarse de la barra y dominadas sin lastre de menos a más', cargaTexto: 'Esfuerzo percibido 2–4 de 10', ficha: 'calentamiento-barra' }],
      explicacion: explicar('plantilla.calentamiento-barra', ['P-49'], 'Antes de un esfuerzo máximo se calienta de menos a más, por prudencia.'),
    },
    {
      nombre: 'Dominadas máximas',
      minutos: resto,
      ejercicios: [{ nombre: 'Dominadas estrictas seguidas, hasta no poder hacer otra completa', cargaTexto: 'Peso corporal; cuenta solo las completas', ficha: 'dominadas-maximas' }],
      explicacion: explicar(
        'plantilla.dominadas-maximas',
        ['P-19'],
        `Las dominadas máximas se relacionan con el grado (r 0,73-0,77; Faggian 2024), aunque en niveles bajos su fiabilidad es menor: solo cuenta como cambio real a partir de ${dominadas}.`,
      ),
    },
    {
      nombre: 'Apertura de cadera',
      minutos: resto,
      ejercicios: [{ nombre: 'Straddle de pie: piernas abiertas al máximo, mide la distancia del suelo a la ingle', series: 2, cargaTexto: 'Sin rebotes; vale la mejor de 2', ficha: 'apertura-cadera' }],
      explicacion: explicar(
        'plantilla.apertura-cadera',
        ['P-19'],
        `La apertura de cadera (straddle de pie) se relacionó con el nivel en escaladores de competición (r −0,48; Draga 2020). Menos cm es más apertura; cambio real a partir de ${caderaCm} cm.`,
      ),
    },
  ])
}

export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'test-casa':
      return construirTestCasa(p)
    case 'core-movilidad':
      return construirCoreMovilidad(p)
    case 'via-cuerda-limite':
      return construirViaLimite(p)
    case 'multipresa-resistencia-fuerza':
      return construirMultipresaResistenciaFuerza(p)
    case 'resistencia-4x4':
      return construir4x4(p)
    case 'pegues-proyecto':
      return construirPegues(p)
    case 'bloque-limite':
      return construirBloqueLimite(p)
    case 'multipresa-resistencia':
      return construirMultipresa(p)
    case 'evaluacion-dedos':
      return construirEvaluacion(p)
    case 'board':
      return construirBoard(p)
    case 'bloque-suave':
      return construirBloqueSuave(p)
    case 'tecnica':
      return construirTecnica(p)
    case 'arc':
      return construirArc(p)
    case 'hombro':
      return construirHombro(p)
    case 'dominadas':
      return construirDominadas(p)
    default:
      return null
  }
}
