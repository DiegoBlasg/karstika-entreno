'use client'

import { useActionState, useEffect } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarEvaluacion } from '../../evaluacion/acciones'

// Guarda la evaluación de hoy con la misma acción (y las mismas validaciones) que la pantalla Evaluación.
// El lastre es texto normal, no decimal, para que en iPhone se pueda escribir el signo menos al corregirlo.
export function FormularioResultadoTest({ hoy, pesoKg, lastreKg, resistenciaS, alGuardar }: {
  hoy: string; pesoKg: number; lastreKg: number; resistenciaS: number | null; alGuardar: () => void
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEvaluacion, null)
  useEffect(() => {
    if (estado?.ok) alGuardar()
  }, [estado, alGuardar])
  const fmt = (n: number): string => String(n).replace('.', ',')
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-sky-200 bg-sky-50 p-4">
      <h2 className="font-semibold">Resultado del test</h2>
      <input type="hidden" name="fecha" value={hoy} />
      <label className="block">Peso hoy (kg)<input name="peso_corporal_kg" type="text" inputMode="decimal" defaultValue={fmt(pesoKg)} required className={CAMPO} /></label>
      <label className="block">Lastre del mejor intento (kg, negativo = descarga)<input name="lastre_kg" type="text" defaultValue={fmt(lastreKg)} required className={CAMPO} /></label>
      <label className="block">Resistencia: segundos colgado en el 7:3<input name="resistencia_s" type="text" inputMode="decimal" defaultValue={resistenciaS ?? ''} className={CAMPO} /></label>
      <label className="block">
        Técnica de 1 a 7 (opcional)
        <select name="tecnica" defaultValue="" className={CAMPO}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {estado?.ok ? (
        <p className="text-sm text-emerald-700">{estado.ok}</p>
      ) : (
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar resultado'}</button>
      )}
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
