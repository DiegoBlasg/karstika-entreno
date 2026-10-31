'use client'

import { useActionState } from 'react'
import type { EstadoAccion } from '@/lib/estado'
import { borrarHueco } from './acciones'

export function BotonBorrarHueco({ id, conSesion }: { id: string; conSesion: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(borrarHueco, null)
  const pregunta = conSesion ? '¿Borrar este rato para entrenar? La sesión que tiene se queda.' : null
  return (
    <form action={accion} onSubmit={(e) => { if (pregunta && !confirm(pregunta)) e.preventDefault() }}>
      <input type="hidden" name="hueco_id" value={id} />
      <button aria-label="Borrar este rato para entrenar" className="-mr-2 flex size-11 items-center justify-center rounded-xl text-texto-2 hover:bg-superficie-2" disabled={pendiente}>✕</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
