import { explicar } from './explicacion'
import { VALORES } from './parametros'
import { diaNumero, validarEntrada } from './tiempo'
import type { Perfil, Sesion, TipoSesion, Violacion } from './tipos'

const TIPOS_DEDOS: readonly TipoSesion[] = VALORES['P-15'].tiposIntensosDedos

// Estos tipos cuentan siempre como sesión intensa de dedos, sea cual sea su etiqueta de intensidad (P-15 los cuenta por tipo).
const SIEMPRE_INTENSOS: readonly TipoSesion[] = ['multipresa-resistencia', 'multipresa-maxima', 'campus', 'evaluacion-dedos']

export const esIntensaDedos = (s: Sesion): boolean =>
  SIEMPRE_INTENSOS.includes(s.tipo) || (s.intensidad === 'alta' && TIPOS_DEDOS.includes(s.tipo))

// Carga alta: etiqueta alta o intensa de dedos por tipo.
export const esCargaAlta = (s: Sesion): boolean => s.intensidad === 'alta' || esIntensaDedos(s)

type Regla = (propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil) => Violacion[]

function validarPerfil(perfil: Perfil): void {
  if (!Number.isFinite(perfil.anosEscalando) || perfil.anosEscalando < 0) {
    throw new Error(`anosEscalando debe ser un número finito no negativo: ${perfil.anosEscalando}`)
  }
  if (!Number.isFinite(perfil.pesoKg) || perfil.pesoKg <= 0) {
    throw new Error(`pesoKg debe ser un número finito positivo: ${perfil.pesoKg}`)
  }
}

// Entre dos días con sesión intensa de dedos tiene que haber al menos un día natural completo sin ella
// (martes y jueves sí; martes y miércoles, o dos sesiones el mismo día, no). Se cuenta por fecha de inicio.
function reglaDedosDiaDescanso(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (!esIntensaDedos(propuesta)) return []
  const minimo = VALORES['P-14'].diasMinimosEntreSesionesIntensasDedos
  const d = diaNumero(propuesta.fecha)
  const out: Violacion[] = []
  for (const h of historial) {
    if (!esIntensaDedos(h)) continue
    const distancia = Math.abs(d - diaNumero(h.fecha))
    if (distancia < minimo) {
      out.push({
        regla: 'seguridad.dedos-dia-descanso',
        sesionIds: [h.id, propuesta.id].sort(),
        mensaje:
          distancia === 0
            ? `${h.id} y ${propuesta.id} son sesiones intensas de dedos el mismo día; tiene que haber un día completo de descanso entre ellas.`
            : `${h.id} y ${propuesta.id} son sesiones intensas de dedos en días seguidos; tiene que haber un día completo de descanso entre ellas.`,
        explicacion: explicar(
          'seguridad.dedos-dia-descanso',
          ['P-14', 'P-15'],
          'Entre dos días con sesión intensa de dedos se deja al menos un día natural completo sin carga intensa de dedos.',
        ),
      })
    }
  }
  return out
}

// Decisión: una sesión cuenta solo en su día de INICIO (s.fecha), aunque cruce la medianoche
// (p. ej. 23:30 durante 5 h cuenta para ese día y no para el siguiente).
function reglaCargaAltaSeguida(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (!esCargaAlta(propuesta)) return []
  const max = VALORES['P-16'].maxDiasSeguidosCargaAlta
  const altas = [...historial, propuesta].filter(esCargaAlta)
  const dias = new Set(altas.map((s) => diaNumero(s.fecha)))
  const d = diaNumero(propuesta.fecha)
  let inicio = d
  while (dias.has(inicio - 1)) inicio--
  let fin = d
  while (dias.has(fin + 1)) fin++
  const racha = fin - inicio + 1
  if (racha <= max) return []
  const ids = altas
    .filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= inicio && x <= fin
    })
    .map((s) => s.id)
    .sort()
  return [
    {
      regla: 'seguridad.carga-alta-seguida',
      sesionIds: ids,
      mensaje: `Con esta sesión habría ${racha} días seguidos de carga alta; el máximo es ${max}.`,
      explicacion: explicar(
        'seguridad.carga-alta-seguida',
        ['P-16'],
        `No se encadenan más de ${max} días naturales seguidos con sesiones de intensidad alta; después toca descanso o carga suave.`,
      ),
    },
  ]
}

const MULTIPRESA: readonly TipoSesion[] = ['multipresa-resistencia', 'multipresa-maxima']
const esMultipresa = (s: Sesion): boolean => MULTIPRESA.includes(s.tipo)
const esNovel = (p: Perfil): boolean => p.anosEscalando < VALORES['P-12'].anosMaximosPerfilNovel

function reglaCampus(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'campus' || !esNovel(perfil)) return []
  const max = VALORES['P-13'].maxSesionesCampus
  const hechas = historial.filter((s) => s.tipo === 'campus').length
  if (hechas + 1 <= max) return []
  return [
    {
      regla: 'seguridad.campus',
      sesionIds: [propuesta.id],
      mensaje: `El campus no entra en el plan con menos de ${VALORES['P-12'].anosMaximosPerfilNovel} años de experiencia (máximo ${max} sesiones).`,
      explicacion: explicar(
        'seguridad.campus',
        ['P-13', 'P-12'],
        'El campus board no se prescribe a escaladores con poca experiencia: la guía lo reserva a adultos experimentados y se asocia a más lesión.',
      ),
    },
  ]
}

function reglaMaximaNovel(propuesta: Sesion, _historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'multipresa-maxima' || !esNovel(perfil)) return []
  return [
    {
      regla: 'seguridad.maxima-novel',
      sesionIds: [propuesta.id],
      mensaje: 'Las suspensiones máximas quedan excluidas con poca experiencia; usa repeaters submáximos.',
      explicacion: explicar(
        'seguridad.maxima-novel',
        ['P-01', 'P-12'],
        'Con menos de 2 años de experiencia no hay evidencia de que las suspensiones máximas sean seguras; se usan repeaters submáximos.',
      ),
    },
  ]
}

function reglaMultipresa7Dias(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (!esMultipresa(propuesta) || !esNovel(perfil)) return []
  const max = VALORES['P-12'].maxSesionesMultipresa7Dias
  const todas = [...historial, propuesta].filter(esMultipresa)
  const d = diaNumero(propuesta.fecha)
  for (let inicio = d - 6; inicio <= d; inicio++) {
    const ventana = todas.filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= inicio && x <= inicio + 6
    })
    if (ventana.length > max) {
      return [
        {
          regla: 'seguridad.multipresa-7dias',
          sesionIds: ventana.map((s) => s.id).sort(),
          mensaje: `Habría ${ventana.length} sesiones de multipresa en 7 días; el máximo es ${max}.`,
          explicacion: explicar(
            'seguridad.multipresa-7dias',
            ['P-12'],
            `Con poca experiencia no se superan ${max} sesiones de multipresa en cualquier ventana de 7 días.`,
          ),
        },
      ]
    }
  }
  return []
}

// Falla cerrado: sin regletaMm en una multipresa o en el test de dedos de un perfil novel también es violación.
function reglaRegleta(propuesta: Sesion, _historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  const mm = propuesta.detalle?.regletaMm
  const minimo = VALORES['P-12'].regletaMinimaMm
  const colgado = esMultipresa(propuesta) || propuesta.tipo === 'evaluacion-dedos'
  if (!colgado || !esNovel(perfil)) return []
  if (mm === undefined) {
    return [
      {
        regla: 'seguridad.regleta',
        sesionIds: [propuesta.id],
        mensaje: `Hay que especificar la profundidad del canto (regletaMm) en la multipresa; el mínimo es ${minimo} mm.`,
        explicacion: explicar(
          'seguridad.regleta',
          ['P-12'],
          `Con poca experiencia no se usan regletas de menos de ${minimo} mm, así que hay que indicar el canto para poder comprobarlo.`,
        ),
      },
    ]
  }
  if (mm >= minimo) return []
  return [
    {
      regla: 'seguridad.regleta',
      sesionIds: [propuesta.id],
      mensaje: `Una regleta de ${mm} mm es demasiado pequeña; el mínimo es ${minimo} mm.`,
      explicacion: explicar(
        'seguridad.regleta',
        ['P-12'],
        `Con poca experiencia no se usan regletas de menos de ${minimo} mm.`,
      ),
    },
  ]
}

function reglaArqueado(propuesta: Sesion, _historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  const novel = esNovel(perfil)
  if (propuesta.detalle?.agarre !== 'arqueado' || (!novel && propuesta.detalle.conCarga !== true)) return []
  return [
    {
      regla: 'seguridad.arqueado',
      sesionIds: [propuesta.id],
      mensaje: novel
        ? 'Con poca experiencia no se usa el agarre arqueado completo, ni con carga ni sin ella.'
        : 'No se cuelga con carga en agarre arqueado completo.',
      explicacion: explicar(
        'seguridad.arqueado',
        novel ? ['P-10', 'P-12'] : ['P-10'],
        novel
          ? 'Con menos de 2 años de experiencia no se usa el arqueado completo; se usa semiarqueado estandarizado.'
          : 'El agarre arqueado completo con carga concentra tensión en las poleas; se usa semiarqueado estandarizado.',
      ),
    },
  ]
}

function reglaEvaluacionPrematura(propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta.tipo !== 'evaluacion-dedos' || !esNovel(perfil)) return []
  const minimo = VALORES['P-32'].diasBaseMinimos
  const dias = historial.map((s) => diaNumero(s.fecha))
  if (dias.length > 0 && diaNumero(propuesta.fecha) - Math.min(...dias) >= minimo) return []
  return [
    {
      regla: 'seguridad.evaluacion-prematura',
      sesionIds: [propuesta.id],
      mensaje: `El test máximo de dedos exige al menos ${minimo} días de base desde tu primera sesión registrada.`,
      explicacion: explicar(
        'seguridad.evaluacion-prematura',
        ['P-32', 'P-12'],
        `Con poca experiencia el único esfuerzo máximo de dedos es el test, y solo tras ${minimo} días (4 semanas) de base técnica y adaptación.`,
      ),
    },
  ]
}

const REGLAS: Regla[] = [
  reglaDedosDiaDescanso, reglaCargaAltaSeguida, reglaCampus, reglaMaximaNovel,
  reglaMultipresa7Dias, reglaRegleta, reglaArqueado, reglaEvaluacionPrematura,
]

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function validarSesion(propuesta: Sesion, historial: Sesion[], perfil: Perfil): Violacion[] {
  if (propuesta == null) throw new Error('validarSesion: propuesta es obligatoria')
  if (!Array.isArray(historial)) throw new Error('validarSesion: historial debe ser un array')
  if (perfil == null) throw new Error('validarSesion: perfil es obligatorio')
  validarPerfil(perfil)
  validarEntrada([propuesta, ...historial])
  return REGLAS.flatMap((regla) => regla(propuesta, historial, perfil)).sort(
    (a, b) => comparar(a.regla, b.regla) || comparar(a.sesionIds.join(','), b.sesionIds.join(',')),
  )
}
