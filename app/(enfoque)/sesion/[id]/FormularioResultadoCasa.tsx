'use client'

import { useActionState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarPruebaCasa } from '@/app/(app)/progreso/acciones'

// Guarda el test en casa de hoy con la misma acción (y las mismas validaciones) que la pantalla Progreso.
export function FormularioResultadoCasa({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarPruebaCasa, null)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-borde bg-superficie-2 p-4">
      <h2 className="font-semibold">Resultado del test en casa</h2>
      <input type="hidden" name="fecha" value={hoy} />
      <label className="block">Dominadas estrictas seguidas<input name="dominadas" type="text" inputMode="numeric" className={CAMPO} /></label>
      <label className="block">Apertura de cadera: cm del suelo a la ingle, la mejor<input name="cadera_cm" type="text" inputMode="decimal" className={CAMPO} /></label>
      {estado?.ok ? (
        <p className="text-sm text-progreso">{estado.ok}</p>
      ) : (
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar resultado'}</button>
      )}
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
