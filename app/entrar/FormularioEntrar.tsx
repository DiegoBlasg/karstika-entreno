'use client'

import { useActionState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { entrar } from './acciones'

export function FormularioEntrar() {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(entrar, null)
  return (
    <form action={accion} className="space-y-4">
      <label className="block">
        Contraseña
        <input type="password" name="clave" required autoComplete="current-password" className={CAMPO} />
      </label>
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Entrando…' : 'Entrar'}</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
