import { PieDeVia } from '@/components/PieDeVia'
import type { PasosArranque } from '@/lib/datos/arranque'
import type { EstadoTramo, VistaVia } from '@/lib/datos/via'
import { fechaLarga } from '@/lib/fecha'
import { CarruselLargos } from './CarruselLargos'
import type { PasoVia } from './PasosVia'
import { ProximaReunion } from './Reunion'
import { TarjetaCima, TarjetaLargo } from './TarjetaLargo'

const ESTADO = { hecho: 'hecho', actual: 'ahora', futuro: 'por hacer' } as const
const DIA = 86_400_000
const semanasEntre = (desde: string, hasta: string): number => Math.round((Date.parse(hasta) - Date.parse(desde)) / (7 * DIA))

const lunesActualDe = (vista: VistaVia): string | null => vista.largos.flatMap((l) => l.chapas).find((c) => c.estado === 'actual')?.lunes ?? null

function estadoCima(vista: VistaVia): EstadoTramo {
  if (vista.cima.actual) return 'actual'
  return vista.largos.length > 0 && vista.largos.every((l) => l.estado === 'hecho') ? 'hecho' : 'futuro'
}

// Cuánto falta para la cima desde la semana en curso: «en 21 semanas», «la semana que viene» (null fuera de la temporada).
function faltaCima(vista: VistaVia): string | null {
  if (vista.cima.actual) return 'esta semana'
  const lunes = lunesActualDe(vista)
  if (!lunes) return null
  const n = semanasEntre(lunes, vista.cima.lunes)
  return n === 1 ? 'la semana que viene' : `en ${n} semanas`
}

// Dónde estás, en una línea, bajo el título: «Largo 3 de 8 · la cima en 21 semanas».
export function resumenVia(vista: VistaVia): string | null {
  const { largos, cima } = vista
  if (largos.length === 0) return null
  if (cima.actual) return `Semana objetivo: a por el ${cima.grado}`
  const actual = largos.find((l) => l.estado === 'actual')
  const falta = faltaCima(vista)
  if (actual && falta) return `Largo ${actual.numero} de ${largos.length} · la cima ${falta}`
  if (estadoCima(vista) === 'hecho') return 'Temporada terminada'
  return `${largos.length} largos · empieza el ${fechaLarga(largos[0]!.chapas[0]!.lunes)}`
}

// La temporada: fila de pasos (un largo por paso y la cima), carrusel de largos centrado en el actual y, debajo, la
// próxima reunión. En el primer uso, el pie de vía con sus tres pasos.
export function Via({ vista, arranque }: { vista: VistaVia; arranque: PasosArranque }) {
  const { largos, cima, tests } = vista
  const reuniones = largos.flatMap((l) => l.reuniones)
  // R1, R2…: posición de cada reunión entre todas las de la temporada (un largo puede tener una a mitad).
  const numeros: Record<string, number> = Object.fromEntries(reuniones.map((r, i) => [r.lunes, i + 1]))
  const pie = !arranque.completo && <PieDeVia pasos={arranque} />
  if (largos.length === 0) return pie || null

  const pasos: PasoVia[] = [
    ...largos.map((l) => ({
      id: `largo-${l.numero}`,
      numero: l.numero,
      faseId: l.faseId,
      estado: l.estado,
      nombre: `Largo ${l.numero} · ${l.fase} · ${ESTADO[l.estado]}`,
    })),
    { id: 'largo-cima', numero: null, faseId: null, estado: estadoCima(vista), nombre: `Cima · ${fechaLarga(cima.lunes)}` },
  ]
  const actual = pasos.findIndex((p) => p.estado === 'actual')
  const futuro = pasos.findIndex((p) => p.estado === 'futuro')
  const inicial = actual >= 0 ? actual : futuro >= 0 ? futuro : pasos.length - 1
  const tarjetas = [
    ...largos.map((l) => <TarjetaLargo key={l.numero} largo={l} numeros={numeros} />),
    <TarjetaCima key="cima" cima={cima} falta={faltaCima(vista)} />,
  ]
  return (
    <>
      <CarruselLargos pasos={pasos} tarjetas={tarjetas} inicial={inicial} />
      {pie}
      <ProximaReunion reuniones={reuniones} tests={tests} lunesActual={lunesActualDe(vista)} />
    </>
  )
}
