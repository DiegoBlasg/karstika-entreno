'use client'

import { useState } from 'react'
import { CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import type { FilaEscalada } from '@/lib/datos/filas'
import { MAX_ENCADENES, PROYECTO_NUEVO } from '@/lib/escaladas/formulario'
import { ESCALA, type TipoEscalada } from '@/lib/escaladas/grados'
import type { Proyecto } from '@/lib/escaladas/nivel'

const TIPOS = [{ valor: 'via', texto: 'Vía' }, { valor: 'bloque', texto: 'Bloque' }]
const ESTILOS = [{ valor: 'a-vista', texto: 'A vista' }, { valor: 'flash', texto: 'Flash' }, { valor: 'encadenada', texto: 'Trabajada' }]

function SelectorGrado({ nombre, tipo, inicial, etiqueta }: { nombre: string; tipo: TipoEscalada; inicial?: string | null; etiqueta: string }) {
  return (
    <label className="block">
      {etiqueta}
      <select key={tipo} name={nombre} defaultValue={inicial && ESCALA[tipo].includes(inicial) ? inicial : ''} className={CAMPO}>
        <option value="">—</option>
        {ESCALA[tipo].map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    </label>
  )
}

function LineaEncadene({ i, tipoInicial, previa }: { i: number; tipoInicial: TipoEscalada; previa?: FilaEscalada }) {
  const [tipo, setTipo] = useState<TipoEscalada>(previa?.tipo ?? tipoInicial)
  const [estilo, setEstilo] = useState<string>(previa?.estilo ?? 'encadenada')
  return (
    <div className="space-y-2 rounded-xl border border-borde p-3">
      <Opciones nombre={`esc_tipo_${i}`} leyenda="¿Vía o bloque?" opciones={TIPOS} valor={tipo} onCambio={(v) => setTipo(v as TipoEscalada)} columnas={2} />
      <SelectorGrado nombre={`esc_grado_${i}`} tipo={tipo} inicial={previa?.grado} etiqueta="Grado" />
      <Opciones nombre={`esc_estilo_${i}`} leyenda="¿Cómo?" opciones={ESTILOS} valor={estilo} onCambio={setEstilo} columnas={3} />
    </div>
  )
}

// Los encadenes del día, al marcar «encadené»: una línea por vía o bloque (sin grado, la línea no se guarda).
export function CamposEncadenes({ tipoInicial, previas }: { tipoInicial: TipoEscalada; previas: readonly FilaEscalada[] }) {
  const [n, setN] = useState(Math.max(1, previas.length))
  return (
    <div className="space-y-2">
      <p className="text-sm text-texto-2">¿Qué encadenaste? Con el grado, la app conoce tu nivel real.</p>
      {Array.from({ length: n }, (_, i) => <LineaEncadene key={i} i={i} tipoInicial={tipoInicial} previa={previas[i]} />)}
      {n < MAX_ENCADENES && (
        <button type="button" onClick={() => setN(n + 1)} className="inline-flex min-h-11 items-center text-sm text-progreso underline">+ otra</button>
      )}
    </div>
  )
}

// Pegues a un proyecto (sesión de pegues): elegir uno abierto o crear uno, cuántos pegues y si cayó.
export function CamposProyecto({ abiertos, previa }: { abiertos: readonly Proyecto[]; previa?: FilaEscalada }) {
  const [elegido, setElegido] = useState<string>(previa?.nombre ?? (abiertos[0]?.nombre ?? ''))
  const nuevo = elegido === PROYECTO_NUEVO
  return (
    <fieldset className="space-y-2 rounded-xl border border-borde p-3">
      <legend className="font-medium">Pegues a un proyecto</legend>
      <label className="block">
        Proyecto
        <select name="proy" value={elegido} onChange={(e) => setElegido(e.target.value)} className={CAMPO}>
          <option value="">Ninguno</option>
          {abiertos.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre}{p.grado ? ` · ${p.grado}` : ''}</option>)}
          {previa?.nombre && !abiertos.some((p) => p.nombre === previa.nombre) && <option value={previa.nombre}>{previa.nombre}</option>}
          <option value={PROYECTO_NUEVO}>Uno nuevo…</option>
        </select>
      </label>
      {nuevo && (
        <>
          <label className="block">Nombre<input name="proy_nombre" maxLength={80} className={CAMPO} /></label>
          <SelectorGrado nombre="proy_grado" tipo="via" etiqueta="Grado" />
        </>
      )}
      {elegido !== '' && (
        <>
          <label className="block">Pegues de hoy<input name="proy_pegues" type="number" min={1} max={50} defaultValue={previa?.pegues ?? 1} className={CAMPO} /></label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="proy_cayo" defaultChecked={previa?.estilo === 'encadenada'} className="size-5" /> ¡Lo encadené!
          </label>
        </>
      )}
    </fieldset>
  )
}
