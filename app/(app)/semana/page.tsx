import Link from 'next/link'
import { BOTON, TARJETA } from '@/components/estilos'
import { Aviso } from '@/components/ui/Aviso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { enlacePreparar } from '@/lib/datos/huecos'
import type { HuecoVista } from '@/lib/datos/semana'
import { vistaSemana } from '@/lib/datos/semana'
import { ahoraMadrid, hhmmDeMinutos, lunesDe, sumarDias } from '@/lib/fecha'
import { DESCANSO_ACTIVO, DONDE_SE_HACE, NOMBRE_COMPANIA, NOMBRE_LUGAR, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarHueco } from './BotonBorrarHueco'
import { FormularioHueco } from './FormularioHueco'
import { ProximosDias } from './ProximosDias'

function Fila({ h }: { h: HuecoVista }) {
  const { fila, estado } = h
  const pasado = estado.tipo === 'pasado'
  return (
    <li className={`${TARJETA} ${pasado ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">
          {hhmmDeMinutos(fila.inicio_min)} · {NOMBRE_LUGAR[fila.lugar]} · {NOMBRE_COMPANIA[fila.compania]} · {fila.minutos} min
        </p>
        {!pasado && <BotonBorrarHueco id={fila.id} conSesion={estado.tipo === 'ocupado'} />}
      </div>
      {estado.tipo === 'planeado' && (
        <>
          <p className="font-medium">{nombreSesion(estado.sesion)}{estado.cargaAlta ? ' ★' : ''}</p>
          <p className="text-sm text-texto-2">Dónde: {DONDE_SE_HACE[estado.sesion.tipo]}</p>
        </>
      )}
      {estado.tipo === 'libre' && <p className="text-texto-2">{estado.descansoActivo ? DESCANSO_ACTIVO : 'Libre: no hace falta entrenar.'}</p>}
      {estado.tipo === 'ocupado' && (
        <p>
          {nombreSesion(estado.sesion.sesion)} · {estado.registrada ? 'Registrada' : 'Aceptada'} · <Link href="/" className="underline">Ver en Hoy</Link>
        </p>
      )}
      {pasado && estado.sesion && <p className="text-sm">{nombreSesion(estado.sesion.sesion)}</p>}
      {(estado.tipo === 'planeado' || estado.tipo === 'libre' || estado.tipo === 'sin-plan') && (
        <Link href={enlacePreparar(fila)} className={BOTON}>Preparar</Link>
      )}
    </li>
  )
}

const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
const RANGO = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const dia = (fecha: string): string => DIA.format(new Date(`${fecha}T12:00:00Z`)).replace(/\./g, '')
const rango = (fecha: string): string => RANGO.format(new Date(`${fecha}T12:00:00Z`))
const ENLACE_SEMANA = 'inline-flex min-h-11 items-center rounded-xl border border-borde px-4 text-sm text-texto hover:bg-superficie-2'

function PorDias({ huecos, hoy }: { huecos: HuecoVista[]; hoy: string }) {
  const dias: { fecha: string; huecos: HuecoVista[] }[] = []
  for (const h of huecos) {
    const ultimo = dias[dias.length - 1]
    if (ultimo && ultimo.fecha === h.fila.fecha) ultimo.huecos.push(h)
    else dias.push({ fecha: h.fila.fecha, huecos: [h] })
  }
  return (
    <div className="space-y-5">
      {dias.map((d) => (
        <section key={d.fecha} className="space-y-2">
          <Etiqueta as="h2" className={d.fecha === hoy ? 'text-progreso' : ''}>{d.fecha === hoy ? `hoy · ${dia(d.fecha)}` : dia(d.fecha)}</Etiqueta>
          <ul className="space-y-3">{d.huecos.map((h) => <Fila key={h.fila.id} h={h} />)}</ul>
        </section>
      ))}
    </div>
  )
}

export default async function PaginaSemana({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const estaSemana = lunesDe(ahora.fecha)
  const siguiente = sumarDias(estaSemana, 7)
  const pedido = (await searchParams).lunes
  const lunes = pedido === siguiente ? siguiente : estaSemana
  const momento = { fecha: ahora.fecha, minutos: Math.round(ahora.hora * 60) }
  const v = vistaSemana(datos, lunes, momento)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).filter((d) => d >= ahora.fecha)
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Tu <span className="text-progreso">semana</span></h1>
        <p>
          <Etiqueta>
            {rango(v.lunes)} – {rango(v.domingo)}
            {v.fase ? ` · ${v.fase.nombre}${v.fase.descarga ? ' (descarga)' : ''}` : ''}
          </Etiqueta>
        </p>
        <div className="flex justify-between gap-2">
          {lunes === estaSemana
            ? <Link href={`/semana?lunes=${siguiente}`} className={`${ENLACE_SEMANA} ml-auto`}>Semana siguiente →</Link>
            : <Link href="/semana" className={ENLACE_SEMANA}>← Esta semana</Link>}
        </div>
      </header>
      {v.huecos.length === 0 && (
        <Aviso tono="info">Declara los huecos que tienes esta semana. Cuantos más declares, mejor reparte el motor los días intensos.</Aviso>
      )}
      {v.aviso && <Aviso tono="ambar">{v.aviso}</Aviso>}
      <PorDias huecos={v.huecos} hoy={ahora.fecha} />
      {v.huecos.some((h) => h.estado.tipo === 'planeado' && h.estado.cargaAlta) && <p className="text-xs text-texto-2">★ = carga alta.</p>}
      <ProximosDias datos={datos} ahora={momento} lunesVisto={lunes} />
      {dias.length > 0 && <FormularioHueco dias={dias} abierto={v.huecos.length === 0} />}
    </div>
  )
}
