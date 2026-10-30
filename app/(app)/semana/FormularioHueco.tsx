'use client'

import { useActionState, useState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MINUTOS_DISPONIBLES } from '@/lib/formulario'
import { anadirHueco } from './acciones'

// Se envía sin vaciar: añadir varios huecos seguidos solo cambia el día o la hora.
export function FormularioHueco({ dias }: { dias: string[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(anadirHueco, null)
  const [minutos, setMinutos] = useState(60)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-borde bg-superficie p-4">
      <h2 className="font-medium">Añadir hueco</h2>
      <div className="flex gap-3">
        <label className="block flex-1">
          Día
          <select name="fecha" className={CAMPO} defaultValue={dias[0]}>
            {dias.map((d) => <option key={d} value={d}>{fechaLarga(d)}</option>)}
          </select>
        </label>
        <label className="block w-32">Hora<input type="time" name="hora" defaultValue="09:00" required className={CAMPO} /></label>
      </div>
      <fieldset>
        <legend className="font-medium">¿Con quién?</legend>
        <label className="mr-4 inline-flex items-center gap-1"><input type="radio" name="compania" value="solo" defaultChecked required /> Solo</label>
        <label className="mr-4 inline-flex items-center gap-1"><input type="radio" name="compania" value="con-gente" /> Con gente</label>
      </fieldset>
      <fieldset>
        <legend className="font-medium">¿Dónde?</legend>
        {([['casa', 'Casa'], ['rocodromo', 'Rocódromo'], ['roca', 'Roca']] as const).map(([v, t]) => (
          <label key={v} className="mr-4 inline-flex items-center gap-1">
            <input type="radio" name="lugar" value={v} defaultChecked={v === 'casa'} required onChange={() => setMinutos(v === 'casa' ? 60 : 90)} /> {t}
          </label>
        ))}
      </fieldset>
      <label className="block">
        Minutos disponibles
        <input
          type="number" name="minutos" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={5}
          value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} required className={CAMPO}
        />
      </label>
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Añadir hueco'}</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
