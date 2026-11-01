'use client'

import { useActionState, useEffect } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarEvaluacion } from '@/app/(app)/progreso/acciones'

// Guarda la evaluación de hoy con la misma acción (y las mismas validaciones) que la pantalla Progreso.
// El lastre es texto normal, no decimal, para que en iPhone se pueda escribir el signo menos al corregirlo.
export function FormularioResultadoTest({ hoy, pesoKg, lastreKg, colgadoS, conColgado, conPowerSlap, alGuardar }: {
  hoy: string; pesoKg: number; lastreKg: number; colgadoS: number | null; conColgado: boolean; conPowerSlap: boolean; alGuardar: () => void
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEvaluacion, null)
  useEffect(() => {
    if (estado?.ok) alGuardar()
  }, [estado, alGuardar])
  const fmt = (n: number): string => String(n).replace('.', ',')
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 rounded border border-borde bg-superficie-2 p-4">
      <h2 className="font-semibold">Resultado del test</h2>
      <input type="hidden" name="fecha" value={hoy} />
      <label className="block">Peso hoy (kg)<input name="peso_corporal_kg" type="text" inputMode="decimal" defaultValue={fmt(pesoKg)} required className={CAMPO} /></label>
      <label className="block">Lastre del mejor intento (kg, negativo = descarga)<input name="lastre_kg" type="text" defaultValue={fmt(lastreKg)} required className={CAMPO} /></label>
      {conColgado && (
        <>
          <label className="block">
            Resistencia: segundos colgado en 30 mm (opcional)
            <input name="colgado_30_s" type="text" inputMode="decimal" defaultValue={colgadoS ?? ''} className={CAMPO} />
            <span className="text-xs text-texto-2">Si no llegaste a 10 s y lo repetiste con descarga, apunta ese tiempo y marca la casilla.</span>
          </label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="colgado_con_descarga" className="size-5" /> Con descarga (polea o pies)</label>
        </>
      )}
      {conPowerSlap && (
        <label className="block">Power slap: cm por encima de la mano, el mejor de 3 (opcional)<input name="power_slap_cm" type="text" inputMode="decimal" className={CAMPO} /></label>
      )}
      <label className="block">
        Técnica de 1 a 7 (opcional)
        <select name="tecnica" defaultValue="" className={CAMPO}>
          <option value="">—</option>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {estado?.ok ? (
        <p className="text-sm text-progreso">{estado.ok}</p>
      ) : (
        <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar resultado'}</button>
      )}
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
