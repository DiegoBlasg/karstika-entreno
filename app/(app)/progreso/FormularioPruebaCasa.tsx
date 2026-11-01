'use client'

import { useActionState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarPruebaCasa } from './acciones'

// El test en casa apuntado a mano: dominadas máximas, apertura de cadera o las dos.
// `fechaInicial`: la del último test en casa registrado sin resultado, o hoy.
export function FormularioPruebaCasa({ hoy, fechaInicial }: { hoy: string; fechaInicial: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarPruebaCasa, null)
  return (
    <form action={accion} className="space-y-4">
      <label className="block">Fecha<input type="date" name="fecha" max={hoy} defaultValue={fechaInicial} required className={CAMPO} /></label>
      <label className="block">Dominadas estrictas seguidas<input name="dominadas" inputMode="numeric" className={CAMPO} /></label>
      <label className="block">
        Apertura de cadera (cm)
        <input name="cadera_cm" inputMode="decimal" className={CAMPO} />
        <span className="text-xs text-texto-2">De pie con las piernas abiertas al máximo: cm del suelo a la ingle.</span>
      </label>
      <button className={BOTON} disabled={pendiente}>Guardar test en casa</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
