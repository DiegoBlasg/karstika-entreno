import { textoPosicion, type PosicionTemporada } from '@/lib/datos/temporada'
import { OBJETIVO_FASE, OBJETIVO_SEMANA_OBJETIVO } from '@/lib/nombres'

// La línea de contexto y, debajo, el objetivo de la fase.
export function ContextoTemporada({ posicion }: { posicion: PosicionTemporada }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium text-texto-2">{textoPosicion(posicion)}</p>
      <p className="text-texto-2">{posicion.semanaObjetivo ? OBJETIVO_SEMANA_OBJETIVO : OBJETIVO_FASE[posicion.faseId]}</p>
    </div>
  )
}
