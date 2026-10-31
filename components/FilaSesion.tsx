'use client'

import Link from 'next/link'
import { ChevronDown, Play } from 'lucide-react'
import { useActionState } from 'react'
import { esCargaAlta } from '@/motor'
import { otraOpcionAccion } from '@/app/(app)/_generar/acciones'
import { BotonNoLaHice, Registrada } from '@/app/(app)/_hoy/TarjetaSesion'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import { franja } from '@/lib/datos/agenda'
import type { Tarjeta } from '@/lib/datos/hoy'
import type { EstadoAccion } from '@/lib/estado'
import { nombreSesion } from '@/lib/nombres'

const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
// «jue 6» → «Jue 6»
const dia = (fecha: string): string => {
  const t = DIA.format(new Date(`${fecha}T12:00:00Z`)).replace(/\./g, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const TEXTO_FRANJA = { manana: 'Mañana', tarde: 'Tarde' } as const

function OtraOpcion({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraOpcionAccion, null)
  return (
    <form action={accion}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className="inline-flex min-h-11 items-center text-sm text-progreso underline" disabled={pendiente}>
        {pendiente ? 'Buscando…' : 'Otra opción'}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}

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
          <Registrada tarjeta={{ ...tarjeta, registro }} hoy={hoy} />
        ) : futura ? (
          <>
            {fila.propuesta && <PlanSesion plan={fila.propuesta} />}
            {fila.fecha === hoy && fila.propuesta && (
              <Link href={`/sesion/${fila.id}`} className={`${BOTON_SECUNDARIO} w-full`}><Play size={18} aria-hidden /> Empezar sesión</Link>
            )}
            <div className="flex flex-wrap gap-x-4">
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
