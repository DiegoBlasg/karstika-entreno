'use client'

import { useActionState, useEffect } from 'react'
import type { Molestia, Sesion } from '@/motor'
import { CamposMolestias } from '@/components/CamposMolestias'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import type { FilaEscalada, FilaRegistro } from '@/lib/datos/filas'
import { tipoDeSesion } from '@/lib/escaladas/formulario'
import { proyectos } from '@/lib/escaladas/nivel'
import type { EstadoAccion } from '@/lib/estado'
import { ETIQUETA_RPE, TIPOS_AL_LIMITE } from '@/lib/nombres'
import { CamposEncadenes, CamposProyecto } from './CamposEscaladas'
import { CamposFreno } from './CamposFreno'
import { corregirRegistro, registrar } from './acciones'

// Registrar o, con `previo`, corregir lo ya registrado (precargado). Los campos no se vacían si la acción falla.
// `escaladas`: todas las apuntadas (las de esta sesión se precargan; las demás dan los proyectos abiertos).
export function FormularioRegistro({
  sesion, previo, iniciales, minutosIniciales, alTerminar, escaladas = [], hoy,
}: {
  sesion: Sesion; previo?: { registro: FilaRegistro }; iniciales?: readonly Molestia[]; minutosIniciales?: number; alTerminar?: () => void
  escaladas?: readonly FilaEscalada[]; hoy?: string
}) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(previo ? corregirRegistro : registrar, null)
  useEffect(() => {
    if (estado?.ok) alTerminar?.()
  }, [estado, alTerminar])
  const deEsta = escaladas.filter((e) => e.sesion_id === sesion.id)
  const abiertos = proyectos(escaladas.filter((e) => e.sesion_id !== sesion.id), hoy ?? sesion.fecha).filter((p) => p.encadenado === null)
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-3 border-t border-borde pt-3">
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
      {TIPOS_AL_LIMITE.includes(sesion.tipo) && (
        <CamposFreno
          freno={previo?.registro.freno ?? null}
          encadene={(previo?.registro.encadene ?? false) || deEsta.some((e) => !e.proyecto)}
          encadenes={<CamposEncadenes tipoInicial={tipoDeSesion({ sesion })} previas={deEsta.filter((e) => !e.proyecto)} />}
        />
      )}
      {sesion.tipo === 'pegues-proyecto' && <CamposProyecto abiertos={abiertos} previa={deEsta.find((e) => e.proyecto)} />}
      <button className={BOTON} disabled={pendiente}>
        {pendiente ? 'Guardando…' : previo ? 'Guardar la corrección' : 'Registrar'}
      </button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
    </form>
  )
}
