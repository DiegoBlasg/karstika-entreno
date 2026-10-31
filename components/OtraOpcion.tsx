'use client'

import { useActionState } from 'react'
import { otraOpcionAccion } from '@/app/(app)/_generar/acciones'
import type { EstadoAccion } from '@/lib/estado'

// Cambia la sesión por la siguiente opción del entrenador para ese día. El aviso se queda a la vista: quien lo use
// debe montarlo con una `key` que no cambie con la sesión (fecha y franja), para no perderlo al cambiar.
export function OtraOpcion({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraOpcionAccion, null)
  return (
    <form action={accion}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className="inline-flex min-h-11 items-center text-progreso underline" disabled={pendiente}>
        {pendiente ? 'Buscando…' : 'Otra opción'}
      </button>
      {estado?.ok && <p role="status" className="text-sm text-progreso">{estado.ok}</p>}
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
