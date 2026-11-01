'use client'

import { useActionState, useState } from 'react'
import { BOTON, CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import type { EstadoAccion } from '@/lib/estado'
import { ESCALA, type TipoEscalada } from '@/lib/escaladas/grados'
import { guardarEscalada } from './acciones'

const ESTILOS = [
  { valor: 'a-vista', texto: 'A vista' }, { valor: 'flash', texto: 'Flash' }, { valor: 'encadenada', texto: 'Trabajada' },
  { valor: 'pegues', texto: 'Pegues a un proyecto, sin encadenar' },
]

// Una escalada suelta: un encadene o un día de pegues a un proyecto (de hoy o de los 30 días anteriores). Con el nombre
// de un proyecto abierto, cuenta como de ese proyecto.
export function FormularioEscalada({ hoy, desde, proyectos }: { hoy: string; desde: string; proyectos: readonly string[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarEscalada, null)
  const [tipo, setTipo] = useState<TipoEscalada>('via')
  const [estilo, setEstilo] = useState('encadenada')
  const [proyecto, setProyecto] = useState(false)
  const pegues = estilo === 'pegues'
  const conNombre = pegues || proyecto
  return (
    <form action={accion} className="space-y-3">
      <label className="block">Fecha<input type="date" name="fecha" min={desde} max={hoy} defaultValue={hoy} required className={CAMPO} /></label>
      <Opciones nombre="tipo" leyenda="¿Vía o bloque?" opciones={[{ valor: 'via', texto: 'Vía' }, { valor: 'bloque', texto: 'Bloque' }]} valor={tipo} onCambio={(v) => setTipo(v as TipoEscalada)} columnas={2} />
      <Opciones nombre="lugar" leyenda="¿Dónde?" opciones={[{ valor: 'roca', texto: 'Roca' }, { valor: 'rocodromo', texto: 'Rocódromo' }]} valor="roca" columnas={2} />
      <Opciones nombre="estilo" leyenda="¿Cómo fue?" opciones={ESTILOS} valor={estilo} onCambio={setEstilo} columnas={2} />
      <label className="block">
        {pegues ? 'Grado (opcional)' : 'Grado'}
        <select key={tipo} name="grado" defaultValue="" required={!pegues} className={CAMPO}>
          <option value="">—</option>
          {ESCALA[tipo].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      {!pegues && (
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="proyecto" checked={proyecto} onChange={(e) => setProyecto(e.target.checked)} className="size-5" /> Era un proyecto
        </label>
      )}
      <label className="block">
        {conNombre ? 'Nombre del proyecto' : 'Nombre (opcional)'}
        <input name="nombre" maxLength={80} list="proyectos-abiertos" required={conNombre} className={CAMPO} />
        <datalist id="proyectos-abiertos">{proyectos.map((p) => <option key={p} value={p} />)}</datalist>
      </label>
      {(estilo === 'encadenada' || pegues) && (
        <label className="block">
          {pegues ? 'Pegues ese día' : 'Pegues ese día (incluido el bueno)'}
          <input type="number" name="pegues" min={1} max={50} defaultValue={1} className={CAMPO} />
        </label>
      )}
      <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Apuntar escalada'}</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
