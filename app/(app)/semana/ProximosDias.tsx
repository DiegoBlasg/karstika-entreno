import Link from 'next/link'
import { BOTON, TARJETA } from '@/components/estilos'
import { Aviso } from '@/components/ui/Aviso'
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
        <Aviso tono="info">Orientativo, con tu semana habitual: declara tus huecos más abajo.</Aviso>
      )}
      {s.aviso && <Aviso tono="ambar">{s.aviso}</Aviso>}
      {pendientes.length > 0 && <ul className="space-y-3">{pendientes.map((h) => <FilaHueco key={h.hueco.id} h={h} />)}</ul>}
    </section>
  )
}

const DIA_CORTO = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const diaCorto = (fecha: string): string => DIA_CORTO.format(new Date(`${fecha}T12:00:00Z`)).replace(/\./g, '')

function textoCompacto(h: HuecoPlan): string {
  if (h.sesion) return `${nombreSesion(h.sesion)}${h.cargaAlta ? ' ★' : ''}`
  if (h.estado === 'libre') return h.descansoActivo ? DESCANSO_ACTIVO : 'Libre'
  return 'Sin plan todavía'
}

// Adelanto de la semana siguiente: una línea por hueco, sin botones.
function Adelanto({ s }: { s: SemanaPlanVista }) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium">Semana siguiente · {corta(s.lunes)} – {corta(sumarDias(s.lunes, 6))}</h3>
      {s.orientativo && <Aviso tono="info">Orientativo, con tu semana habitual: declara tus huecos para afinarlo.</Aviso>}
      {s.aviso && <Aviso tono="ambar">{s.aviso}</Aviso>}
      {s.huecos.length > 0 && (
        <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie px-4">
          {s.huecos.map((h) => (
            <li key={h.hueco.id} className="py-2 text-sm">
              <span className="text-texto-2">{diaCorto(h.hueco.fecha)} · {hhmmDeMinutos(h.hueco.inicio_min)} · {NOMBRE_LUGAR[h.hueco.lugar]}</span>
              <br />
              {textoCompacto(h)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Lo que el plan propone y no sale ya en la lista de la semana que se está viendo (antes en Vía):
// el plan orientativo si esa semana no tiene huecos declarados y, viendo esta semana, un adelanto de la siguiente.
export function ProximosDias({ datos, ahora, lunesVisto }: { datos: DatosAtleta; ahora: { fecha: string; minutos: number }; lunesVisto: string }) {
  const { semanas } = proximosDias(datos, ahora)
  const vista = semanas.find((s) => s.lunes === lunesVisto)
  const orientativa = vista?.orientativo ? vista : undefined
  const adelanto = lunesVisto === semanas[0]?.lunes ? semanas[1] : undefined
  if (!orientativa && !adelanto) return null
  return (
    <section className="space-y-4 pt-2">
      <h2 className="text-lg font-semibold">Próximos días</h2>
      {orientativa && <Semana s={orientativa} titulo="Plan orientativo" />}
      {adelanto && <Adelanto s={adelanto} />}
      {orientativa?.huecos.some((h) => h.estado === 'planeada' && h.cargaAlta) && <p className="text-xs text-texto-2">★ = carga alta.</p>}
    </section>
  )
}
