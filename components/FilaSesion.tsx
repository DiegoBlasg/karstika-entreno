'use client'

import Link from 'next/link'
import { ChevronDown, Play } from 'lucide-react'
import { esCargaAlta } from '@/motor'
import { BotonNoLaHice, Registrada } from '@/app/(app)/_hoy/TarjetaSesion'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { OtraOpcion } from '@/components/OtraOpcion'
import { PlanSesion } from '@/components/PlanSesion'
import { franja } from '@/lib/datos/agenda'
import type { Tarjeta } from '@/lib/datos/hoy'
import { nombreSesion } from '@/lib/nombres'

const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
// «jue 6» → «Jue 6»
const dia = (fecha: string): string => {
  const t = DIA.format(new Date(`${fecha}T12:00:00Z`)).replace(/\./g, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const TEXTO_FRANJA = { manana: 'Mañana', tarde: 'Tarde' } as const

// Una sesión en una línea (día · mañana/tarde · nombre ★ · minutos) que se despliega con el plan y lo que se puede hacer.
// `conDia`: en Semana el día ya va en la cabecera.
export function FilaSesion({ tarjeta, hoy, conDia = true }: { tarjeta: Tarjeta; hoy: string; conDia?: boolean }) {
  const { fila, registro } = tarjeta
  const s = fila.sesion
  const futura = fila.fecha >= hoy
  return (
    <details className="group rounded-2xl border border-borde bg-superficie">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-texto-2">
            {conDia ? `${dia(fila.fecha)} · ` : ''}{TEXTO_FRANJA[franja(s.horaInicio)]}{registro ? ' · hecha' : ''}
          </span>
          <span className={`block font-semibold ${registro ? 'text-texto-2' : ''}`}>
            {nombreSesion(s)}
            {esCargaAlta(s) && <span className="text-cima"> <span aria-hidden="true">★</span><span className="sr-only">(carga alta)</span></span>}
            <span className="font-normal text-texto-2"> · {s.duracionMin} min</span>
          </span>
        </span>
        <ChevronDown size={18} aria-hidden className="shrink-0 text-texto-2 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="space-y-3 border-t border-borde p-3">
        {registro ? (
          <>
            <Registrada tarjeta={{ ...tarjeta, registro }} hoy={hoy} />
            {fila.propuesta && (
              <details className="border-t border-borde pt-1">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm text-texto-2">Ver el plan</summary>
                <PlanSesion plan={fila.propuesta} />
              </details>
            )}
          </>
        ) : futura ? (
          <>
            {fila.propuesta && <PlanSesion plan={fila.propuesta} />}
            {fila.fecha === hoy && fila.propuesta && (
              <Link href={`/sesion/${fila.id}`} className={`${BOTON_SECUNDARIO} w-full`}><Play size={18} aria-hidden /> Empezar sesión</Link>
            )}
            <div className="flex flex-wrap items-start gap-x-4">
              {fila.propuesta?.contexto && <OtraOpcion id={fila.id} />}
              <BotonNoLaHice id={fila.id} etiqueta="Quitar" confirmacion="¿Quitar esta sesión?" />
            </div>
          </>
        ) : (
          <p className="text-sm">Sin registrar: <Link href="/" className="text-progreso underline">apúntala en Hoy</Link>.</p>
        )}
      </div>
    </details>
  )
}
