'use client'

import { useActionState } from 'react'
import { ZONAS, type SesionPlan } from '@/motor'
import { AvisoMedico } from '@/components/AvisoMedico'
import { BOTON, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import { PorQue } from '@/components/PorQue'
import type { EntradaPeticion, Preparacion } from '@/lib/datos/peticion'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { aceptar } from './acciones'

function Opcion({ plan, indice, titulo, entrada }: { plan: SesionPlan; indice: number; titulo: string; entrada: EntradaPeticion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(aceptar, null)
  return (
    <section className={TARJETA}>
      <p className="text-xs uppercase tracking-wide text-stone-500">{titulo}</p>
      <PlanSesion plan={plan} />
      <form action={accion}>
        <input type="hidden" name="entrada" value={JSON.stringify(entrada)} />
        <input type="hidden" name="indice" value={indice} />
        <input type="hidden" name="tipo" value={plan.sesion.tipo} />
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Aceptar esta sesión'}</button>
      </form>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </section>
  )
}

export function ResultadoPropuesta({ entrada, prep }: { entrada: EntradaPeticion; prep: Preparacion }) {
  if (prep.tipo === 'fuera-temporada') return <p className="rounded bg-amber-50 p-3">{prep.mensaje}</p>
  const { propuesta, consejos, fase } = prep
  const estado = propuesta.estado
  const noVerdes = estado ? ZONAS.filter((z) => estado.zonas[z] !== 'verde') : []
  const opciones = [
    ...(propuesta.principal ? [{ plan: propuesta.principal, indice: 0, titulo: 'Propuesta' }] : []),
    ...propuesta.alternativas.map((plan, i) => ({ plan, indice: i + 1, titulo: `Alternativa ${i + 1}` })),
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        {fechaLarga(entrada.fecha)} · fase {fase.nombre}{fase.descarga ? ' · semana de descarga' : ''}
      </p>
      {noVerdes.length > 0 && (
        <section className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <ul>
            {noVerdes.map((z) => <li key={z}>{NOMBRE_ZONA[z]}: {estado!.zonas[z] === 'rojo' ? 'rojo' : 'ámbar'}</li>)}
          </ul>
          {noVerdes.some((z) => estado!.zonas[z] === 'rojo') && <AvisoMedico />}
        </section>
      )}
      {estado && <PorQue titulo="Cómo te ve el entrenador hoy" explicaciones={estado.explicaciones} />}
      {propuesta.descanso && (
        <section className={TARJETA}>
          <h2 className="font-semibold">Toca descansar</h2>
          <p className="text-sm">{propuesta.descanso.motivo}</p>
          {propuesta.proximaVentanaIntensa && (
            <p className="text-sm">Próximo día con sesión intensa de dedos posible: {fechaLarga(propuesta.proximaVentanaIntensa.fecha)}.</p>
          )}
          <PorQue explicaciones={[propuesta.descanso]} />
        </section>
      )}
      {opciones.length === 0 && !propuesta.descanso && (
        <p role="alert" className="rounded bg-red-50 p-3">El entrenador no encuentra ninguna sesión posible con este contexto.</p>
      )}
      {opciones.map((o) => <Opcion key={o.indice} {...o} entrada={entrada} />)}
      {consejos.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Consejos</h2>
          <ul className="space-y-2">
            {consejos.map((c) => (
              <li key={c.id} className="rounded border border-stone-200 bg-white p-3 text-sm">
                <p>{c.texto}</p>
                <PorQue explicaciones={[c.explicacion]} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
