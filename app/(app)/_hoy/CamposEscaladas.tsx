'use client'

import { useState } from 'react'
import { CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import type { FilaEscalada } from '@/lib/datos/filas'
import { MAX_ENCADENES, PROYECTO_NUEVO } from '@/lib/escaladas/formulario'
import { ESCALA, type TipoEscalada } from '@/lib/escaladas/grados'
import { claveProyecto, type Proyecto } from '@/lib/escaladas/nivel'

const TIPOS = [{ valor: 'via', texto: 'Vía' }, { valor: 'bloque', texto: 'Bloque' }]
const LUGARES = [{ valor: 'roca', texto: 'Roca' }, { valor: 'rocodromo', texto: 'Rocódromo' }]
const ESTILOS = [{ valor: 'a-vista', texto: 'A vista' }, { valor: 'flash', texto: 'Flash' }, { valor: 'encadenada', texto: 'Trabajada' }]
const LUGAR = { roca: 'roca', rocodromo: 'rocódromo' } as const

function SelectorGrado({ nombre, tipo, inicial, etiqueta, requerido }: {
  nombre: string; tipo: TipoEscalada; inicial?: string | null; etiqueta: string; requerido?: boolean
}) {
  return (
    <label className="block">
      {etiqueta}
      <select key={tipo} name={nombre} defaultValue={inicial && ESCALA[tipo].includes(inicial) ? inicial : ''} required={requerido} className={CAMPO}>
        <option value="">—</option>
        {ESCALA[tipo].map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    </label>
  )
}

function LineaEncadene({ i, numero, tipoInicial, previa, alQuitar }: {
  i: number; numero: number; tipoInicial: TipoEscalada; previa?: FilaEscalada; alQuitar?: () => void
}) {
  const [tipo, setTipo] = useState<TipoEscalada>(previa?.tipo ?? tipoInicial)
  const [estilo, setEstilo] = useState<string>(previa?.estilo ?? 'encadenada')
  return (
    <fieldset className="space-y-2 rounded-xl border border-borde p-3">
      <legend className="sr-only">Encadene {numero}</legend>
      <Opciones nombre={`esc_tipo_${i}`} leyenda="¿Vía o bloque?" opciones={TIPOS} valor={tipo} onCambio={(v) => setTipo(v as TipoEscalada)} columnas={2} />
      <SelectorGrado nombre={`esc_grado_${i}`} tipo={tipo} inicial={previa?.grado} etiqueta="Grado" />
      <Opciones nombre={`esc_estilo_${i}`} leyenda="¿Cómo?" opciones={ESTILOS} valor={estilo} onCambio={setEstilo} columnas={3} />
      {alQuitar && (
        <button type="button" onClick={alQuitar} className="inline-flex min-h-11 items-center text-sm text-rojo underline">Quitar este encadene</button>
      )}
    </fieldset>
  )
}

// Los encadenes del día, al marcar «encadené»: dónde y una línea por vía o bloque (sin grado, la línea no se guarda).
// Cada línea ocupa un hueco fijo de 0 a 4 (los nombres de sus campos), para poder quitar cualquiera.
export function CamposEncadenes({ tipoInicial, lugarInicial, previas }: {
  tipoInicial: TipoEscalada; lugarInicial: FilaEscalada['lugar']; previas: readonly FilaEscalada[]
}) {
  const [huecos, setHuecos] = useState<number[]>(() => Array.from({ length: Math.min(MAX_ENCADENES, Math.max(1, previas.length)) }, (_, i) => i))
  const anadir = (): void => {
    const libre = Array.from({ length: MAX_ENCADENES }, (_, i) => i).find((i) => !huecos.includes(i))
    if (libre !== undefined) setHuecos([...huecos, libre])
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-texto-2">¿Qué encadenaste? Con el grado, la app conoce tu nivel real.</p>
      <Opciones nombre="esc_lugar" leyenda="¿Dónde?" opciones={LUGARES} valor={previas[0]?.lugar ?? lugarInicial} columnas={2} />
      {huecos.map((i, k) => (
        <LineaEncadene
          key={i} i={i} numero={k + 1} tipoInicial={tipoInicial} previa={previas[i]}
          {...(huecos.length > 1 ? { alQuitar: () => setHuecos(huecos.filter((h) => h !== i)) } : {})}
        />
      ))}
      {huecos.length < MAX_ENCADENES && (
        <button type="button" onClick={anadir} className="inline-flex min-h-11 items-center text-sm text-progreso underline">+ otra vía o bloque</button>
      )}
    </div>
  )
}

// Pegues a un proyecto (sesión de pegues): elegir uno abierto o crear uno, cuántos pegues y si cayó. Empieza en
// «Ninguno» para no sumar pegues sin querer. `previa`: el que ya tenía esta sesión, al corregir.
export function CamposProyecto({ abiertos, previa }: { abiertos: readonly Proyecto[]; previa?: FilaEscalada }) {
  const clavePrevia = previa?.nombre ? claveProyecto({ ...previa, nombre: previa.nombre }) : ''
  const [elegido, setElegido] = useState<string>(clavePrevia)
  const nuevo = elegido === PROYECTO_NUEVO
  const existente = abiertos.find((p) => p.clave === elegido) ?? (previa && elegido === clavePrevia && elegido !== '' ? { tipo: previa.tipo, grado: previa.grado } : undefined)
  return (
    <fieldset className="space-y-2 rounded-xl border border-borde p-3">
      <legend className="font-medium">Pegues a un proyecto</legend>
      <label className="block">
        Proyecto
        <select name="proy" value={elegido} onChange={(e) => setElegido(e.target.value)} className={CAMPO}>
          <option value="">Ninguno</option>
          {abiertos.map((p) => (
            <option key={p.clave} value={p.clave}>
              {p.nombre}{p.grado ? ` · ${p.grado}` : ''}{p.tipo === 'bloque' ? ' · bloque' : ''}{p.lugar === 'rocodromo' ? ' · rocódromo' : ''}
            </option>
          ))}
          {previa?.nombre && clavePrevia !== '' && !abiertos.some((p) => p.clave === clavePrevia) && <option value={clavePrevia}>{previa.nombre}</option>}
          <option value={PROYECTO_NUEVO}>Uno nuevo…</option>
        </select>
      </label>
      {nuevo && (
        <>
          <label className="block">Nombre del proyecto<input name="proy_nombre" maxLength={80} required className={CAMPO} /></label>
          <SelectorGrado nombre="proy_grado" tipo="via" etiqueta="Grado" requerido />
          <p className="text-xs text-texto-2">Un proyecto nuevo se apunta como vía en roca.</p>
        </>
      )}
      {existente && (
        <SelectorGrado key={elegido} nombre="proy_grado" tipo={existente.tipo} inicial={existente.grado}
          etiqueta={existente.grado ? 'Grado (cámbialo si no era ese)' : 'Grado (hace falta si lo encadenaste)'} />
      )}
      {elegido !== '' && (
        <>
          <label className="block">Pegues ese día<input name="proy_pegues" type="number" min={1} max={50} defaultValue={previa?.pegues ?? 1} className={CAMPO} /></label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="proy_cayo" defaultChecked={previa?.estilo === 'encadenada'} className="size-5" /> ¡Lo encadené!
          </label>
        </>
      )}
      {existente && previa && previa.lugar !== 'roca' && <p className="text-xs text-texto-2">En {LUGAR[previa.lugar]}.</p>}
    </fieldset>
  )
}
