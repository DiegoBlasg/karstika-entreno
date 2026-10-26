import { explicar } from './explicacion'
import { VALORES } from './parametros'
import { diaNumero, finHoras, inicioHoras, validarEntrada } from './tiempo'
import type { Perfil, Sesion, TipoSesion, Violacion } from './tipos'

const EPS = 1e-9
const TIPOS_DEDOS: readonly TipoSesion[] = VALORES['P-15'].tiposIntensosDedos

export const esIntensaDedos = (s: Sesion): boolean => s.intensidad === 'alta' && TIPOS_DEDOS.includes(s.tipo)

type Regla = (propuesta: Sesion, historial: readonly Sesion[], perfil: Perfil) => Violacion[]

const redondear = (x: number): number => Math.round(x * 10) / 10

function validarPerfil(perfil: Perfil): void {
  if (!Number.isFinite(perfil.anosEscalando) || perfil.anosEscalando < 0) {
    throw new Error(`anosEscalando debe ser un número finito no negativo: ${perfil.anosEscalando}`)
  }
  if (!Number.isFinite(perfil.pesoKg) || perfil.pesoKg <= 0) {
    throw new Error(`pesoKg debe ser un número finito positivo: ${perfil.pesoKg}`)
  }
}

function reglaDedos48h(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (!esIntensaDedos(propuesta)) return []
  const minimo = VALORES['P-14'].horasMinimasEntreSesionesIntensasDedos
  const out: Violacion[] = []
  for (const h of historial) {
    if (!esIntensaDedos(h)) continue
    const hueco =
      inicioHoras(propuesta) >= inicioHoras(h)
        ? inicioHoras(propuesta) - finHoras(h)
        : inicioHoras(h) - finHoras(propuesta)
    if (hueco < minimo - EPS) {
      out.push({
        regla: 'seguridad.dedos-48h',
        sesionIds: [h.id, propuesta.id].sort(),
        mensaje: `Solo hay ${redondear(Math.max(0, hueco))} h entre ${h.id} y ${propuesta.id}; las sesiones intensas de dedos necesitan al menos ${minimo} h.`,
        explicacion: explicar(
          'seguridad.dedos-48h',
          ['P-14', 'P-15'],
          `Dos sesiones intensas de dedos necesitan al menos ${minimo} h de descanso entre el fin de una y el inicio de la siguiente.`,
        ),
      })
    }
  }
  return out
}

function reglaCargaAltaSeguida(propuesta: Sesion, historial: readonly Sesion[]): Violacion[] {
  if (propuesta.intensidad !== 'alta') return []
  const max = VALORES['P-16'].maxDiasSeguidosCargaAlta
  const altas = [...historial, propuesta].filter((s) => s.intensidad === 'alta')
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

const REGLAS: Regla[] = [reglaDedos48h, reglaCargaAltaSeguida]

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

export function validarSesion(propuesta: Sesion, historial: Sesion[], perfil: Perfil): Violacion[] {
  validarPerfil(perfil)
  validarEntrada([propuesta, ...historial])
  return REGLAS.flatMap((regla) => regla(propuesta, historial, perfil)).sort(
    (a, b) => comparar(a.regla, b.regla) || comparar(a.sesionIds.join(','), b.sesionIds.join(',')),
  )
}
