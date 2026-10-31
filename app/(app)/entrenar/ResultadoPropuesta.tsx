'use client'

import { useActionState } from 'react'
import { esCargaAlta, ZONAS, type SesionPlan } from '@/motor'
import { AvisoMedico } from '@/components/AvisoMedico'
import { ContextoTemporada } from '@/components/ContextoTemporada'
import { BOTON, TARJETA, TARJETA_DESTACADA } from '@/components/estilos'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { PlanSesion } from '@/components/PlanSesion'
import { PorQue } from '@/components/PorQue'
import type { EntradaPeticion, Preparacion } from '@/lib/datos/peticion'
import type { PosicionTemporada } from '@/lib/datos/temporada'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import { DESCANSO_ACTIVO, NOMBRE_ZONA, nombreSesion } from '@/lib/nombres'
import { aceptar } from './acciones'

function Opcion({ plan, indice, titulo, entrada, reemplaza }: { plan: SesionPlan; indice: number; titulo: string; entrada: EntradaPeticion; reemplaza?: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(aceptar, null)
  return (
    <section className={indice === 0 ? TARJETA_DESTACADA : TARJETA}>
      <Etiqueta as="p">{titulo}</Etiqueta>
      <PlanSesion plan={plan} />
      <form action={accion}>
        <input type="hidden" name="entrada" value={JSON.stringify(entrada)} />
        <input type="hidden" name="indice" value={indice} />
        <input type="hidden" name="tipo" value={plan.sesion.tipo} />
        {reemplaza && <input type="hidden" name="reemplaza" value={reemplaza} />}
        <button className={`${BOTON} w-full`} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Aceptar esta sesión'}</button>
      </form>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </section>
  )
}

export function ResultadoPropuesta({ entrada, prep, posicion, reemplaza }: {
  entrada: EntradaPeticion; prep: Preparacion; posicion: PosicionTemporada | null; reemplaza?: string
}) {
  if (prep.tipo === 'fuera-temporada') return <p className="rounded bg-ambar/10 p-3">{prep.mensaje}</p>
  const { propuesta, consejos, fase } = prep
  const estado = propuesta.estado
  const noVerdes = estado ? ZONAS.filter((z) => estado.zonas[z] !== 'verde') : []
  const opciones = [
    ...(propuesta.principal ? [{ plan: propuesta.principal, indice: 0, titulo: 'Propuesta' }] : []),
    ...propuesta.alternativas.map((plan, i) => ({ plan, indice: i + 1, titulo: `Alternativa ${i + 1}` })),
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-texto-2">
        {fechaLarga(entrada.fecha)}{posicion ? '' : ` · fase ${fase.nombre}${fase.descarga ? ' · semana de descarga' : ''}`}
      </p>
      {posicion && <ContextoTemporada posicion={posicion} />}
      {noVerdes.length > 0 && (
        <section className="space-y-2 rounded border border-ambar/40 bg-ambar/10 p-3 text-sm">
          <ul>
            {noVerdes.map((z) => <li key={z}>{NOMBRE_ZONA[z]}: {estado!.zonas[z] === 'rojo' ? 'rojo' : 'ámbar'}</li>)}
          </ul>
          {noVerdes.some((z) => estado!.zonas[z] === 'rojo') && <AvisoMedico />}
        </section>
      )}
      {estado && <PorQue titulo="Cómo te ve el entrenador hoy" explicaciones={estado.explicaciones} />}
      {propuesta.descanso && (
        <section className={TARJETA}>
          <h2 className="font-titular text-2xl font-bold uppercase">Toca descansar</h2>
          <p className="text-sm">{propuesta.descanso.motivo}</p>
          {!propuesta.principal && propuesta.descanso.regla === 'plan.semana-libre' && entrada.contexto.lugar === 'casa' && (
            <p className="text-sm">{DESCANSO_ACTIVO}</p>
          )}
          {propuesta.proximaVentanaIntensa && (
            <p className="text-sm">Próximo día con sesión intensa de dedos posible: {fechaLarga(propuesta.proximaVentanaIntensa.fecha)}.</p>
          )}
          <PorQue explicaciones={[propuesta.descanso]} />
        </section>
      )}
      {opciones.length === 0 && !propuesta.descanso && (
        <p role="alert" className="rounded bg-rojo/10 p-3">El entrenador no encuentra ninguna sesión posible con este contexto.</p>
      )}
      {opciones.map((o) => <Opcion key={o.indice} {...o} entrada={entrada} reemplaza={reemplaza} />)}
      {propuesta.semana && propuesta.semana.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Así queda tu semana</h2>
          <ul className="space-y-1 text-sm">
            {propuesta.semana.map(({ hueco, sesion }) => (
              <li key={`${hueco.fecha}-${hueco.horaInicio}`} className="rounded border border-borde bg-superficie px-3 py-2">
                {fechaLarga(hueco.fecha)} · {hhmmDeMinutos(Math.round(hueco.horaInicio * 60))} ·{' '}
                {sesion ? `${nombreSesion(sesion)}${esCargaAlta(sesion) ? ' ★' : ''}` : 'Libre'}
              </li>
            ))}
          </ul>
          <p className="text-xs text-texto-2">★ = carga alta. El plan se recalcula cada vez que preparas una sesión.</p>
        </section>
      )}
      {consejos.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Consejos</h2>
          <ul className="space-y-2">
            {consejos.map((c) => (
              <li key={c.id} className="rounded border border-borde bg-superficie p-3 text-sm">
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
