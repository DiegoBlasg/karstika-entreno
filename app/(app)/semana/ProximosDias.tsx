import Link from 'next/link'
import { BOTON, TARJETA } from '@/components/estilos'
import type { DatosAtleta } from '@/lib/datos/filas'
import { enlacePreparar } from '@/lib/datos/huecos'
import { proximosDias, type HuecoPlan, type SemanaPlanVista } from '@/lib/datos/plan'
import { fechaLarga, hhmmDeMinutos, sumarDias } from '@/lib/fecha'
import { DESCANSO_ACTIVO, DONDE_SE_HACE, NOMBRE_COMPANIA, NOMBRE_LUGAR, nombreSesion } from '@/lib/nombres'

const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const corta = (fecha: string): string => CORTA.format(new Date(`${fecha}T12:00:00Z`))

function FilaHueco({ h }: { h: HuecoPlan }) {
  const { hueco, estado, sesion } = h
  return (
    <li className={TARJETA}>
      <p className="text-sm">
        {fechaLarga(hueco.fecha)} · {hhmmDeMinutos(hueco.inicio_min)} · {NOMBRE_LUGAR[hueco.lugar]} · {NOMBRE_COMPANIA[hueco.compania]} · {hueco.minutos} min
      </p>
      {estado === 'planeada' && sesion && (
        <>
          <p className="font-medium">{nombreSesion(sesion)}{h.cargaAlta ? ' ★' : ''}</p>
          <p className="text-sm text-texto-2">Dónde: {DONDE_SE_HACE[sesion.tipo]}</p>
        </>
      )}
      {estado === 'aceptada' && sesion && (
        <>
          <p className="font-medium">{nombreSesion(sesion)} · {h.registrada ? 'Registrada' : 'Aceptada'}</p>
          <p className="text-sm text-texto-2">Dónde: {DONDE_SE_HACE[sesion.tipo]}</p>
        </>
      )}
      {estado === 'libre' && <p className="text-texto-2">{h.descansoActivo ? DESCANSO_ACTIVO : 'Libre: no hace falta entrenar.'}</p>}
      {estado === 'sin-plan' && <p className="text-texto-2">Sin plan: prepáralo cuando llegue.</p>}
      {(estado === 'planeada' || estado === 'libre' || estado === 'sin-plan') && (
        <Link href={enlacePreparar(hueco)} className={BOTON}>Preparar</Link>
      )}
    </li>
  )
}

function Semana({ s, titulo }: { s: SemanaPlanVista; titulo: string }) {
  const pendientes = s.huecos.filter((h) => h.estado !== 'pasado')
  return (
    <section className="space-y-3">
      <h3 className="font-medium">{titulo} · {corta(s.lunes)} – {corta(sumarDias(s.lunes, 6))}</h3>
      {s.orientativo && (
        <p className="rounded bg-superficie-2 p-3 text-sm">
          Orientativo, con tu semana habitual: declara tus huecos en <Link href="/semana" className="underline">Semana</Link>.
        </p>
      )}
      {s.aviso && <p className="rounded bg-ambar/10 p-3 text-sm">{s.aviso}</p>}
      {pendientes.length > 0 && <ul className="space-y-3">{pendientes.map((h) => <FilaHueco key={h.hueco.id} h={h} />)}</ul>}
    </section>
  )
}

// Lo que el plan propone para esta semana y la siguiente (antes en Vía).
export function ProximosDias({ datos, ahora }: { datos: DatosAtleta; ahora: { fecha: string; minutos: number } }) {
  const { semanas } = proximosDias(datos, ahora)
  return (
    <section className="space-y-4 pt-4">
      <h2 className="text-lg font-semibold">Próximos días</h2>
      {semanas[0] && <Semana s={semanas[0]} titulo="Esta semana" />}
      {semanas[1] && <Semana s={semanas[1]} titulo="Semana siguiente" />}
      {semanas.some((s) => s.huecos.some((h) => h.estado === 'planeada' && h.cargaAlta)) && <p className="text-xs text-texto-2">★ = carga alta.</p>}
    </section>
  )
}
