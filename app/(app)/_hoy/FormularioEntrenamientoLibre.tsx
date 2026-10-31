'use client'

import { useActionState, useEffect, useState } from 'react'
import { TIPOS_SESION, type TipoSesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO, TARJETA } from '@/components/estilos'
import { DIAS_CORRECCION } from '@/lib/datos/hoy'
import type { EstadoAccion } from '@/lib/estado'
import { sumarDias } from '@/lib/fecha'
import {
  AGARRES, ETIQUETA_RPE, NOMBRE_AGARRE, NOMBRE_TIPO, TIPOS_CON_INTENTOS, TIPOS_CON_REGLETA,
} from '@/lib/nombres'
import { CamposIntentos } from './CamposIntentos'
import { apuntarEntrenamiento } from './acciones'

// La sesión y su registro en un solo formulario. Se envía sin vaciar: tras los avisos, «Lo hice así de todos modos»
// guarda lo que se ha escrito. La duración de la sesión y los minutos reales son el mismo campo (`minutos`).
function Formulario({ hoy, hora, alTerminar }: { hoy: string; hora: string; alTerminar: (mensaje: string) => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(apuntarEntrenamiento, null)
  const [tipo, setTipo] = useState<TipoSesion>('tecnica')
  useEffect(() => {
    if (estado?.ok) alTerminar(estado.ok)
  }, [estado, alTerminar])
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3">
      <label className="block">
        Día
        <input type="date" name="fecha" min={sumarDias(hoy, -DIAS_CORRECCION)} max={hoy} defaultValue={hoy} required className={CAMPO} />
      </label>
      <label className="block">
        ¿Qué hiciste?
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSesion)} className={CAMPO}>
          {TIPOS_SESION.filter((t) => t !== 'descanso').map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
        </select>
      </label>
      <label className="block">
        Intensidad
        <select name="intensidad" defaultValue="suave" className={CAMPO}>
          <option value="alta">Alta</option>
          <option value="suave">Suave</option>
        </select>
      </label>
      <div className="flex gap-3">
        <label className="block min-w-0 flex-1">Hora de inicio<input type="time" name="hora" defaultValue={hora} required className={CAMPO} /></label>
        <label className="block min-w-0 flex-1">Minutos<input type="number" name="minutos" min={1} max={1440} defaultValue={60} required className={CAMPO} /></label>
      </div>
      {TIPOS_CON_REGLETA.includes(tipo) && (
        <div className="flex gap-3">
          <label className="block flex-1">
            Regleta (mm)
            <input type="text" inputMode="decimal" name="regleta_mm" className={CAMPO} />
          </label>
          <label className="block flex-1">
            Agarre
            <select name="agarre" defaultValue="" className={CAMPO}>
              <option value="">—</option>
              {AGARRES.map((a) => <option key={a} value={a}>{NOMBRE_AGARRE[a]}</option>)}
            </select>
          </label>
        </div>
      )}
      <label className="block">
        Esfuerzo (RPE 0-10)
        <select name="rpe" defaultValue="" required className={CAMPO}>
          <option value="" disabled>Elige</option>
          {ETIQUETA_RPE.map((t, n) => <option key={n} value={n}>{n} · {t}</option>)}
        </select>
      </label>
      <CamposMolestias plegable />
      {TIPOS_CON_INTENTOS.includes(tipo) && <CamposIntentos />}
      {estado?.avisos && (
        <div className="space-y-2 rounded border border-ambar/40 bg-ambar/10 p-3 text-sm">
          <ul className="list-disc pl-5">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" /> Lo hice así de todos modos</label>
        </div>
      )}
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar'}</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}

// Al final de Hoy: un entrenamiento que no estaba planeado, de hoy o de los 7 días anteriores.
export function FormularioEntrenamientoLibre({ hoy, hora }: { hoy: string; hora: string }) {
  const [abierto, setAbierto] = useState(false)
  const [hecho, setHecho] = useState<string | null>(null)
  const alTerminar = (mensaje: string): void => {
    setHecho(mensaje)
    setAbierto(false)
  }
  return (
    <section className={TARJETA}>
      <button
        type="button"
        onClick={() => { setAbierto(!abierto); setHecho(null) }}
        className="min-h-11 text-left font-medium underline"
      >
        {abierto ? 'Cancelar' : 'Apuntar un entrenamiento que no estaba planeado'}
      </button>
      {hecho && <p role="status" className="text-sm text-progreso">{hecho}</p>}
      {abierto && <Formulario hoy={hoy} hora={hora} alTerminar={alTerminar} />}
    </section>
  )
}
