'use client'

import { useActionState, useEffect, useState } from 'react'
import type { Molestia, Sesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { FilaIntento, FilaRegistro } from '@/lib/datos/filas'
import type { EstadoAccion } from '@/lib/estado'
import { MAX_INTENTOS } from '@/lib/formulario'
import { ETIQUETA_RPE, MOTIVOS_CAIDA, NOMBRE_MOTIVO, TIPOS_CON_INTENTOS } from '@/lib/nombres'
import { corregirRegistro, registrar } from './acciones'

// Registrar o, con `previo`, corregir lo ya registrado (precargado). Los campos no se vacían si la acción falla.
export function FormularioRegistro({
  sesion, previo, iniciales, minutosIniciales, alTerminar,
}: { sesion: Sesion; previo?: { registro: FilaRegistro; intentos: FilaIntento[] }; iniciales?: readonly Molestia[]; minutosIniciales?: number; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(previo ? corregirRegistro : registrar, null)
  useEffect(() => {
    if (estado?.ok) alTerminar?.()
  }, [estado, alTerminar])
  const [filas, setFilas] = useState(previo?.intentos.length ?? 0)
  const intentoPrevio = (i: number): string => {
    const p = previo?.intentos[i]
    return p === undefined ? '' : p.encadenado ? 'encadenado' : (p.motivo_caida ?? '')
  }
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        Esfuerzo (RPE 0-10)
        <select name="rpe" defaultValue={previo ? String(previo.registro.rpe) : ''} required className={CAMPO}>
          <option value="" disabled>Elige</option>
          {ETIQUETA_RPE.map((t, n) => <option key={n} value={n}>{n} · {t}</option>)}
        </select>
      </label>
      <label className="block">
        Minutos reales
        <input type="number" name="minutos" min={1} max={1440} defaultValue={previo?.registro.duracion_min ?? minutosIniciales ?? sesion.duracionMin} required className={CAMPO} />
      </label>
      <CamposMolestias iniciales={previo?.registro.molestias ?? iniciales} plegable />
      {TIPOS_CON_INTENTOS.includes(sesion.tipo) && (
        <fieldset className="space-y-2">
          <legend className="font-medium">Intentos al límite</legend>
          {Array.from({ length: filas }, (_, i) => (
            <label key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20">Intento {i + 1}</span>
              <select name={`intento_${i}`} defaultValue={intentoPrevio(i)} className="flex-1 rounded border border-stone-300 px-2 py-1">
                <option value="">—</option>
                <option value="encadenado">Encadenado</option>
                {MOTIVOS_CAIDA.map((m) => <option key={m} value={m}>{NOMBRE_MOTIVO[m]}</option>)}
              </select>
            </label>
          ))}
          <button type="button" onClick={() => setFilas((n) => Math.min(n + 1, MAX_INTENTOS))} disabled={filas >= MAX_INTENTOS} className="text-sm underline disabled:opacity-50">
            + intento
          </button>
        </fieldset>
      )}
      <button className={BOTON} disabled={pendiente}>
        {pendiente ? 'Guardando…' : previo ? 'Guardar la corrección' : 'Registrar'}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}
