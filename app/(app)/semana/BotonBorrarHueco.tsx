'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { borrarHueco } from './acciones'

export function BotonBorrarHueco({ id, conSesion }: { id: string; conSesion: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarHueco, null)
  const pregunta = conSesion ? '¿Borrar este hueco? La sesión que tiene se queda.' : null
  return (
    <form action={accion} onSubmit={(e) => { if (pregunta && !confirm(pregunta)) e.preventDefault() }}>
      <input type="hidden" name="hueco_id" value={id} />
      <button aria-label="Borrar hueco" className="text-stone-500" disabled={pendiente}>✕</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
