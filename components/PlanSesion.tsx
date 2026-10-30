import type { Ejercicio, SesionPlan } from '@/motor'
import { DONDE_SE_HACE, NOMBRE_TIPO } from '@/lib/nombres'
import { ComoSeHace } from './ComoSeHace'
import { PorQue } from './PorQue'

function detalle(ej: Ejercicio): string {
  const partes: string[] = []
  if (ej.series) partes.push(`${ej.series} series`)
  if (ej.repeticiones) partes.push(`${ej.repeticiones} rep.`)
  if (ej.trabajoS) partes.push(`${ej.trabajoS} s`)
  if (ej.descansoS) partes.push(`descanso ${ej.descansoS} s`)
  if (ej.descansoSeriesS) partes.push(`entre series ${Math.round((ej.descansoSeriesS / 60) * 10) / 10} min`)
  partes.push(ej.cargaTexto)
  return partes.join(' · ')
}

// Las explicaciones de la sesión ya incluyen la de cada bloque (motor: «porqué de la elección + una por bloque»).
export function PlanSesion({ plan }: { plan: SesionPlan }) {
  const s = plan.sesion
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">
        {NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min{s.intensidad === 'alta' ? ' · intensa' : ''}
      </h3>
      <p className="text-sm text-texto-2">Dónde: {DONDE_SE_HACE[s.tipo]}</p>
      <PorQue explicaciones={plan.explicaciones} />
      <ol className="space-y-2">
        {plan.bloques.map((b, i) => (
          <li key={`${b.nombre}-${i}`} className="rounded border border-borde p-3">
            <p className="font-medium">
              {b.nombre} <span className="text-texto-2">· {b.minutos} min</span>
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {b.ejercicios.map((ej, j) => (
                <li key={`${ej.nombre}-${j}`}>
                  <span className="font-medium">{ej.nombre}</span>: {detalle(ej)}
                  {ej.notas && <span className="block text-texto-2">{ej.notas}</span>}
                  <ComoSeHace ids={[ej.ficha]} className="text-progreso" />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
