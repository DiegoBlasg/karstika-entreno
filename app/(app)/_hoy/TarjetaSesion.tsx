'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { TIPOS_SESION, type Sesion, type TipoSesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO, TARJETA } from '@/components/estilos'
import { PlanSesion } from '@/components/PlanSesion'
import type { FilaIntento, FilaRegistro } from '@/lib/datos/filas'
import { corregible, type Tarjeta } from '@/lib/datos/hoy'
import type { EstadoAccion } from '@/lib/estado'
import { fechaLarga } from '@/lib/fecha'
import { MAX_INTENTOS, REGLETA_MM } from '@/lib/formulario'
import {
  AGARRES, ETIQUETA_RPE, MOTIVOS_CAIDA, NOMBRE_AGARRE, NOMBRE_MOTIVO, NOMBRE_TIPO, NOMBRE_ZONA, TIPOS_CON_INTENTOS, TIPOS_CON_REGLETA,
} from '@/lib/nombres'
import { corregirRegistro, noLaHice, otraCosa, registrar } from './acciones'

const hhmm = (h: number): string => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

// Registrar o, con `previo`, corregir lo ya registrado (precargado). Los campos no se vacían si la acción falla.
function FormularioRegistro({
  sesion, previo, alTerminar,
}: { sesion: Sesion; previo?: { registro: FilaRegistro; intentos: FilaIntento[] }; alTerminar?: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(previo ? corregirRegistro : registrar, null)
  useEffect(() => {
    if (estado?.ok) alTerminar?.()
  }, [estado, alTerminar])
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
        <input type="number" name="minutos" min={1} max={1440} defaultValue={previo?.registro.duracion_min ?? sesion.duracionMin} required className={CAMPO} />
      </label>
      <CamposMolestias iniciales={previo?.registro.molestias} />
      {TIPOS_CON_INTENTOS.includes(sesion.tipo) && (
        <fieldset className="space-y-2">
          <legend className="font-medium">Intentos al límite</legend>
          {Array.from({ length: MAX_INTENTOS }, (_, i) => (
            <label key={i} className="flex items-center gap-3 text-sm">
              <span className="w-20">Intento {i + 1}</span>
              <select name={`intento_${i}`} defaultValue={intentoPrevio(i)} className="flex-1 rounded border border-stone-300 px-2 py-1">
                <option value="">—</option>
                <option value="encadenado">Encadenado</option>
                {MOTIVOS_CAIDA.map((m) => <option key={m} value={m}>{NOMBRE_MOTIVO[m]}</option>)}
              </select>
            </label>
          ))}
        </fieldset>
      )}
      <button className={BOTON} disabled={pendiente}>
        {pendiente ? 'Guardando…' : previo ? 'Guardar la corrección' : 'Registrar'}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

function BotonNoLaHice({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(noLaHice, null)
  return (
    <form action={accion} onSubmit={(e) => { if (!confirm('¿Borrar esta sesión?')) e.preventDefault() }}>
      <input type="hidden" name="sesion_id" value={id} />
      <button className="text-red-700" disabled={pendiente}>No la hice</button>
      {estado?.error && <p role="alert" className="text-sm text-red-700">{estado.error}</p>}
    </form>
  )
}

// Lo que se hizo de verdad. Se envía sin vaciar los campos: tras los avisos, «Lo hice así de todos modos» guarda lo
// que el usuario ha escrito, no la sesión propuesta.
function FormularioOtraCosa({ sesion }: { sesion: Sesion }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(otraCosa, null)
  const [tipo, setTipo] = useState<TipoSesion>(sesion.tipo === 'descanso' ? 'tecnica' : sesion.tipo)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 border-t border-stone-100 pt-3">
      <input type="hidden" name="sesion_id" value={sesion.id} />
      <label className="block">
        ¿Qué hiciste?
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoSesion)} className={CAMPO}>
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
      {TIPOS_CON_REGLETA.includes(tipo) && (
        <div className="flex gap-3">
          <label className="block flex-1">
            Regleta (mm)
            <input
              type="number" name="regleta_mm" min={REGLETA_MM.min} max={REGLETA_MM.max} step="0.5"
              defaultValue={sesion.detalle?.regletaMm ?? ''} className={CAMPO}
            />
          </label>
          <label className="block flex-1">
            Agarre
            <select name="agarre" defaultValue={sesion.detalle?.agarre ?? ''} className={CAMPO}>
              <option value="">—</option>
              {AGARRES.map((a) => <option key={a} value={a}>{NOMBRE_AGARRE[a]}</option>)}
            </select>
          </label>
        </div>
      )}
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

function Registrada({ tarjeta, hoy }: { tarjeta: Tarjeta & { registro: FilaRegistro }; hoy: string }) {
  const { fila, registro, intentos } = tarjeta
  const [corrigiendo, setCorrigiendo] = useState(false)
  const cerrar = (): void => setCorrigiendo(false)
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-emerald-700">
          Hecha · RPE {registro.rpe} · {registro.duracion_min} min
          {registro.molestias.length > 0 ? ` · molestias: ${registro.molestias.map((m) => `${NOMBRE_ZONA[m.zona]} ${m.dolor}`).join(', ')}` : ''}
        </p>
        {corregible(fila.fecha, hoy) && (
          <button type="button" onClick={() => setCorrigiendo(!corrigiendo)} className="text-sm underline">
            {corrigiendo ? 'Cancelar' : 'Corregir'}
          </button>
        )}
      </div>
      {corrigiendo && <FormularioRegistro sesion={fila.sesion} previo={{ registro, intentos }} alTerminar={cerrar} />}
    </>
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
        <Registrada tarjeta={{ ...tarjeta, registro }} hoy={hoy} />
      ) : (
        <>
          {pasada && !cambiando && <FormularioRegistro sesion={s} />}
          <div className="flex gap-4 text-sm">
            <BotonNoLaHice id={s.id} />
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
