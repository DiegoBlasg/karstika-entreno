import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { TARJETA } from './estilos'
import { BarraProgreso } from './ui/BarraProgreso'
import { Etiqueta } from './ui/Etiqueta'
import { COLOR_CIMA, COLOR_FASE } from '@/lib/ui/fases'
import { textoReunion, type ProgresoLargo } from '@/lib/datos/largo'

// Altura (y) de tu posición en el tramo: de 70 (abajo, inicio) a 12 (arriba, cima); el marcador queda dentro de [16, 66].
export function posicionY(semanaDeFase: number, semanasDeFase: number): number {
  const y = 70 - (58 * semanaDeFase) / Math.max(1, semanasDeFase)
  return Math.min(66, Math.max(16, y))
}

// Tramo de vía del largo actual: hecho en el color de la fase hasta tu posición, por hacer en gris, cima en naranja. Lleva a Vía.
export function MiniVia({ largo }: { largo: ProgresoLargo }) {
  const hechas = largo.sesionesHechas === 1 ? '1 sesión hecha' : `${largo.sesionesHechas} sesiones hechas`
  const color = largo.enCima ? COLOR_CIMA : COLOR_FASE[largo.faseId]
  const y = posicionY(largo.semanaDeFase, largo.semanasDeFase)
  return (
    <Link href="/via" className={`${TARJETA} flex items-center gap-4`}>
      <svg aria-hidden="true" width="28" height="76" viewBox="0 0 28 76" className="shrink-0">
        <line x1="14" y1="12" x2="14" y2="70" className="stroke-pista" strokeWidth="3" />
        <line x1="14" y1={y} x2="14" y2="70" className={color.trazo} strokeWidth="3" />
        <path d="M6 13 L14 1 L22 13 Z" className="fill-cima" />
        <circle cx="14" cy="66" r="4" className={color.relleno} />
        <circle cx="14" cy={y} r="7" className={`fill-fondo ${color.trazo}`} strokeWidth="3" />
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Etiqueta as="p">{largo.enCima ? 'Cima · semana objetivo' : `Largo ${largo.largo} de ${largo.totalLargos} · ciclo ${largo.ciclo}`}</Etiqueta>
        <p>
          {largo.enCima ? 'Semana objetivo' : `Semana ${largo.semanaDeFase} de ${largo.semanasDeFase}`} · {hechas}
        </p>
        <BarraProgreso valor={largo.semanaDeFase / largo.semanasDeFase} etiqueta="Semanas del largo" color={color.fondo} />
        <p className="flex items-center gap-1 text-sm text-texto-2">
          {textoReunion(largo)} <ChevronRight size={16} aria-hidden />
        </p>
      </div>
    </Link>
  )
}
