import Link from 'next/link'
import { TARJETA } from '@/components/estilos'
import type { HuecoVista } from '@/lib/datos/semana'
import { vistaSemana } from '@/lib/datos/semana'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos, lunesDe, sumarDias } from '@/lib/fecha'
import { nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarHueco } from './BotonBorrarHueco'
import { FormularioHueco } from './FormularioHueco'

const LUGAR = { casa: 'casa', rocodromo: 'rocódromo', roca: 'roca' } as const
const COMPANIA = { solo: 'solo', 'con-gente': 'con gente' } as const

function enlacePreparar({ fila }: HuecoVista): string {
  const q = new URLSearchParams({
    fecha: fila.fecha, hora: hhmmDeMinutos(fila.inicio_min), compania: fila.compania, lugar: fila.lugar, minutos: String(fila.minutos),
  })
  return `/entrenar?${q.toString()}`
}

function Fila({ h }: { h: HuecoVista }) {
  const { fila, estado } = h
  const pasado = estado.tipo === 'pasado'
  return (
    <li className={`${TARJETA} ${pasado ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          {fechaLarga(fila.fecha)} · {hhmmDeMinutos(fila.inicio_min)} · {LUGAR[fila.lugar]} · {COMPANIA[fila.compania]} · {fila.minutos} min
        </p>
        {!pasado && <BotonBorrarHueco id={fila.id} conSesion={estado.tipo === 'ocupado'} />}
      </div>
      {estado.tipo === 'planeado' && <p className="font-medium">{nombreSesion(estado.sesion)}{estado.cargaAlta ? ' ★' : ''}</p>}
      {estado.tipo === 'libre' && <p className="text-stone-600">Libre: no hace falta entrenar.</p>}
      {estado.tipo === 'ocupado' && (
        <p>
          {nombreSesion(estado.sesion.sesion)} · {estado.registrada ? 'Registrada' : 'Aceptada'} · <Link href="/" className="underline">Ver en Hoy</Link>
        </p>
      )}
      {pasado && estado.sesion && <p className="text-sm">{nombreSesion(estado.sesion.sesion)}</p>}
      {(estado.tipo === 'planeado' || estado.tipo === 'libre' || estado.tipo === 'sin-plan') && (
        <Link href={enlacePreparar(h)} className="inline-block rounded bg-stone-900 px-3 py-1 text-sm font-medium text-white">Preparar</Link>
      )}
    </li>
  )
}

export default async function PaginaSemana({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const estaSemana = lunesDe(ahora.fecha)
  const siguiente = sumarDias(estaSemana, 7)
  const pedido = (await searchParams).lunes
  const lunes = pedido === siguiente ? siguiente : estaSemana
  const v = vistaSemana(datos, lunes, { fecha: ahora.fecha, minutos: Math.round(ahora.hora * 60) })
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d >= ahora.fecha)
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Mi semana</h1>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <p>
          {fechaLarga(v.lunes)} – {fechaLarga(v.domingo)}
          {v.fase ? ` · ${v.fase.nombre}${v.fase.descarga ? ' (descarga)' : ''}` : ''}
        </p>
        {lunes === estaSemana
          ? <Link href={`/semana?lunes=${siguiente}`} className="underline">Semana siguiente →</Link>
          : <Link href="/semana" className="underline">← Esta semana</Link>}
      </div>
      {v.huecos.length === 0 && (
        <p className="rounded bg-sky-50 p-3 text-sm">
          Declara los huecos que tienes esta semana. Cuantos más declares, mejor reparte el motor los días intensos.
        </p>
      )}
      {v.aviso && <p className="rounded bg-amber-50 p-3 text-sm">{v.aviso}</p>}
      <ul className="space-y-3">{v.huecos.map((h) => <Fila key={h.fila.id} h={h} />)}</ul>
      {v.huecos.some((h) => h.estado.tipo === 'planeado' && h.estado.cargaAlta) && <p className="text-xs text-stone-500">★ = carga alta.</p>}
      {dias.length > 0 && <FormularioHueco dias={dias} />}
    </div>
  )
}
