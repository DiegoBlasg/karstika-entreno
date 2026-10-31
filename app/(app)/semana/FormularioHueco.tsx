'use client'

import { useActionState, useState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MINUTOS_DISPONIBLES } from '@/lib/formulario'
import { anadirHueco } from './acciones'

// Se envía sin vaciar: añadir varios huecos seguidos solo cambia el día o la hora.
export function FormularioHueco({ dias, abierto }: { dias: string[]; abierto: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(anadirHueco, null)
  const [minutos, setMinutos] = useState(60)
  const [lugar, setLugar] = useState('casa')
  // Solo decide si empieza abierto: añadir un hueco no lo cierra y deja ver «Hueco añadido.».
  const [inicial] = useState(abierto)
  return (
    <details open={inicial} className="rounded-2xl border border-borde bg-superficie">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 font-titular text-lg font-bold uppercase tracking-wide text-progreso">+ Añadir un hueco</summary>
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 p-4 pt-1">
      <div className="flex gap-3">
        <label className="block flex-1">
          Día
          <select name="fecha" className={CAMPO} defaultValue={dias[0]}>
            {dias.map((d) => <option key={d} value={d}>{fechaLarga(d)}</option>)}
          </select>
        </label>
        <label className="block w-32">Hora<input type="time" name="hora" defaultValue="09:00" required className={CAMPO} /></label>
      </div>
      <Opciones nombre="compania" leyenda="¿Con quién?" requerido valor="solo" columnas={2}
        opciones={[{ valor: 'solo', texto: 'Solo' }, { valor: 'con-gente', texto: 'Con gente' }]} />
      <Opciones nombre="lugar" leyenda="¿Dónde?" requerido valor={lugar} onCambio={(v) => { setLugar(v); setMinutos(v === 'casa' ? 60 : 90) }}
        opciones={[{ valor: 'casa', texto: 'Casa' }, { valor: 'rocodromo', texto: 'Rocódromo' }, { valor: 'roca', texto: 'Roca' }]} />
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
    </details>
  )
}
