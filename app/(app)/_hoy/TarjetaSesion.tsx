'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { TIPOS_SESION, type Sesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { BOTON, CAMPO, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import type { Tarjeta } from '@/lib/datos/hoy'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MAX_INTENTOS } from '@/lib/formulario'
import { ETIQUETA_RPE, MOTIVOS_CAIDA, NOMBRE_MOTIVO, NOMBRE_TIPO, NOMBRE_ZONA, TIPOS_CON_INTENTOS } from '@/lib/nombres'
import { noLaHice, otraCosa, registrar } from './acciones'

const hhmm = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

function FormularioRegistro({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(registrar, null)
  return (
    <form action={accion} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        Esfuerzo (RPE 0-10)
        <select name="rpe" defaultValue="" required className={CAMPO}>
          <option value="" disabled>Elige</option>
          {ETIQUETA_RPE.map((t, n) => <option key={n} value={n}>{n} · {t}</option>)}
        </select>
      </label>
      <label className="block">Minutos reales<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
      <CamposMolestias />
      {TIPOS_CON_INTENTOS.includes(sesion.tipo) && (
        <fieldset className="space-y-2">
          <legend className="font-medium">Intentos al límite</legend>
          {Array.from({ length: MAX_INTENTOS }, (_, i) => (
            <label key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20">Intento {i + 1}</span>
              <select name={`intento_${i}`} defaultValue="" className="flex-1 rounded border border-stone-300 px-2 py-1">
                <option value="">—</option>
                <option value="encadenado">Encadenado</option>
                {MOTIVOS_CAIDA.map((m) => <option key={m} value={m}>{NOMBRE_MOTIVO[m]}</option>)}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Registrar'}</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

function FormularioOtraCosa({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraCosa, null)
  return (
    <form action={accion} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        ¿Qué hiciste?
        <select name="tipo" defaultValue={sesion.tipo} className={CAMPO}>
          {TIPOS_SESION.filter((t) => t !== 'descanso').map((t) => <option key={t} value={t}>{NOMBRE_TIPO[t]}</option>)}
        </select>
      </label>
      <label className="block">
        Intensidad
        <select name="intensidad" defaultValue={sesion.intensidad} className={CAMPO}>
          <option value="alta">Alta</option>
          <option value="suave">Suave</option>
        </select>
      </label>
      <div className="flex gap-3">
        <label className="block flex-1">Hora de inicio<input type="time" name="hora" defaultValue={hhmm(sesion.horaInicio)} required className={CAMPO} /></label>
        <label className="block flex-1">Minutos<input type="number" name="minutos" min={1} max={1440} defaultValue={sesion.duracionMin} required className={CAMPO} /></label>
      </div>
      {estado?.avisos && (
        <div className="space-y-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <ul className="list-disc pl-5">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <label className="flex items-center gap-2"><input type="checkbox" name="confirmar" /> Lo hice así de todos modos</label>
        </div>
      )}
      <button className={BOTON} disabled={pendiente}>Guardar lo que hice</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

export function TarjetaSesion({ tarjeta, hoy }: { tarjeta: Tarjeta; hoy: string }) {
  const { fila, registro } = tarjeta
  const s = fila.sesion
  const pasada = fila.fecha <= hoy
  const [cambiando, setCambiando] = useState(false)
  return (
    <article className={TARJETA}>
      {fila.fecha !== hoy && <p className="text-sm text-stone-500">{fechaLarga(fila.fecha)}</p>}
      {fila.propuesta ? (
        <PlanSesion plan={fila.propuesta} />
      ) : (
        <h3 className="font-semibold">{NOMBRE_TIPO[s.tipo]} · {s.duracionMin} min (lo que hiciste)</h3>
      )}
      {s.tipo === 'evaluacion-dedos' && (
        <p className="text-sm">Al terminar el test, apunta el resultado en <Link href="/evaluacion" className="underline">Evaluación</Link>.</p>
      )}
      {registro ? (
        <p className="text-sm text-emerald-700">
          Hecha · RPE {registro.rpe} · {registro.duracion_min} min
          {registro.molestias.length > 0 ? ` · molestias: ${registro.molestias.map((m) => `${NOMBRE_ZONA[m.zona]} ${m.dolor}`).join(', ')}` : ''}
        </p>
      ) : (
        <>
          {pasada && !cambiando && <FormularioRegistro sesion={s} />}
          <div className="flex gap-4 text-sm">
            <form action={noLaHice} onSubmit={(e) => { if (!confirm('¿Borrar esta sesión?')) e.preventDefault() }}>
              <input type="hidden" name="sesion_id" value={s.id} />
              <button className="text-red-700">No la hice</button>
            </form>
            {pasada && (
              <button type="button" onClick={() => setCambiando(!cambiando)} className="underline">
                {cambiando ? 'Cancelar' : 'Hice otra cosa'}
              </button>
            )}
          </div>
          {cambiando && <FormularioOtraCosa sesion={s} />}
        </>
      )}
    </article>
  )
}
