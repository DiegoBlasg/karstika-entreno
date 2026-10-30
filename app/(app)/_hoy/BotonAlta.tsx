'use client'

import { useActionState } from 'react'
import type { Zona } from '@/motor'
import type { EstadoAccion } from '@/lib/estado'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { alta } from './acciones'

export function BotonAlta({ zona }: { zona: Zona }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(alta, null)
  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm(`¿Confirmas que el fisioterapeuta te ha dado el alta de ${NOMBRE_ZONA[zona].toLowerCase()}?`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="zona" value={zona} />
      <button disabled={pendiente} className="rounded border border-rojo/50 bg-superficie px-3 py-1 text-sm">Me ha dado el alta el fisio ({NOMBRE_ZONA[zona]})</button>
      {estado?.error && <p role="alert" className="mt-1 text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="mt-1 text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
