import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { TARJETA } from './estilos'
import { BarraProgreso } from './ui/BarraProgreso'
import { Etiqueta } from './ui/Etiqueta'
import { textoReunion, type ProgresoLargo } from '@/lib/datos/largo'

// Tramo de vía del largo actual: hecho en lima hasta tu posición, por hacer en gris, cima en naranja. Lleva a Vía.
export function MiniVia({ largo }: { largo: ProgresoLargo }) {
  const hechas = largo.sesionesHechas === 1 ? '1 sesión hecha' : `${largo.sesionesHechas} sesiones hechas`
  return (
    <Link href="/via" className={`${TARJETA} flex items-center gap-4`}>
      <svg aria-hidden="true" width="28" height="76" viewBox="0 0 28 76" className="shrink-0">
        <line x1="14" y1="12" x2="14" y2="70" className="stroke-pista" strokeWidth="3" />
        <line x1="14" y1="40" x2="14" y2="70" className="stroke-progreso" strokeWidth="3" />
        <path d="M6 13 L14 1 L22 13 Z" className="fill-cima" />
        <circle cx="14" cy="66" r="4" className="fill-progreso" />
        <circle cx="14" cy="40" r="7" className="fill-fondo stroke-progreso" strokeWidth="3" />
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Etiqueta as="p">Largo {largo.largo} de {largo.totalLargos} · ciclo {largo.ciclo}</Etiqueta>
        <p>
          {largo.enCima ? 'Semana objetivo' : `Semana ${largo.semanaDeFase} de ${largo.semanasDeFase}`} · {hechas}
        </p>
        <BarraProgreso valor={largo.semanaDeFase / largo.semanasDeFase} etiqueta="Semanas del largo" />
        <p className="flex items-center gap-1 text-sm text-texto-2">
          {textoReunion(largo)} <ChevronRight size={16} aria-hidden />
        </p>
      </div>
    </Link>
  )
}
