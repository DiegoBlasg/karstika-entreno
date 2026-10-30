'use client'

import { useActionState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarEvaluacion } from './acciones'

// `fechaInicial`: la del último test registrado sin resultado, o hoy.
export function FormularioEvaluacion({ hoy, fechaInicial, peso }: { hoy: string; fechaInicial: string; peso: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEvaluacion, null)
  return (
    <form action={accion} className="space-y-4">
      {/* Tras guardar, ir a la pantalla de llegada a la reunión (la usa la acción). */}
      <input type="hidden" name="tras" value="reunion" />
      <label className="block">Fecha del test<input type="date" name="fecha" max={hoy} defaultValue={fechaInicial} required className={CAMPO} /></label>
      <label className="block">Peso ese día (kg)<input name="peso_corporal_kg" inputMode="decimal" defaultValue={peso} required className={CAMPO} /></label>
      <label className="block">
        Lastre del mejor intento de 10 s (kg)
        <input name="lastre_kg" inputMode="decimal" required className={CAMPO} />
        <span className="text-xs text-texto-2">Negativo si usaste descarga (polea o banda).</span>
      </label>
      <label className="block">Resistencia: segundos hasta el fallo en 7:3 al 60 % (opcional)<input name="resistencia_s" inputMode="decimal" className={CAMPO} /></label>
      <label className="block">Técnica: autoevaluación del vídeo de 1 a 7 (opcional)<input name="tecnica" inputMode="decimal" className={CAMPO} /></label>
      <button className={BOTON} disabled={pendiente}>Guardar evaluación</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
