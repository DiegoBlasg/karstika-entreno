import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { FondoTopo } from '@/components/FondoTopo'
import { MiniVia } from '@/components/MiniVia'
import { Aviso } from '@/components/ui/Aviso'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { testsSinResultado, vistaHoy } from '@/lib/datos/hoy'
import { progresoLargo, tituloLargo } from '@/lib/datos/largo'
import { proximoHueco } from '@/lib/datos/semana'
import { posicionSiSePuede, type PosicionTemporada } from '@/lib/datos/temporada'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import { NOMBRE_ZONA, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonAlta } from './_hoy/BotonAlta'
import { LimpiezaCronometro } from './_hoy/LimpiezaCronometro'
import { FormularioEntrenamientoLibre } from './_hoy/FormularioEntrenamientoLibre'
import { TarjetaChequeo } from './_hoy/TarjetaChequeo'
import { TarjetaSesion } from './_hoy/TarjetaSesion'

const PLEGABLE = 'rounded-2xl border border-borde bg-superficie'
const RESUMEN = 'flex min-h-11 cursor-pointer items-center justify-between px-4 py-2 font-titular text-lg font-bold uppercase'

export default async function PaginaHoy() {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const proximo = proximoHueco(datos, { fecha: hoy, minutos: Math.round(ahora.hora * 60) })
  const v = vistaHoy(datos, hoy)
  const sinResultado = testsSinResultado(datos, hoy)
  const largo = progresoLargo(datos, hoy)
  const posiciones = new Map<string, PosicionTemporada | null>()
  const posicionDe = (fecha: string): PosicionTemporada | null => {
    if (!posiciones.has(fecha)) posiciones.set(fecha, posicionSiSePuede(datos, fecha))
    return posiciones.get(fecha)!
  }
  const primeraPendiente = v.hoy.findIndex((t) => !t.registro)
  return (
    <div className="space-y-5">
      <LimpiezaCronometro pendientesHoy={v.hoy.filter((t) => !t.registro).map((t) => t.fila.id)} />
      <header className="relative -mx-4 overflow-hidden px-4 pb-1 pt-2">
        <FondoTopo />
        <div className="relative">
          <Etiqueta as="p">{fechaLarga(hoy)}</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none text-progreso">{largo ? tituloLargo(largo) : 'Hoy'}</h1>
        </div>
      </header>

      {largo && <MiniVia largo={largo} />}

      {v.zonasRojo.length > 0 && (
        <Aviso tono="rojo" className="space-y-2">
          <p className="font-medium">En rojo: {v.zonasRojo.map((z) => NOMBRE_ZONA[z]).join(', ')}. No cargues esas zonas.</p>
          <AvisoMedico />
          {v.zonasRojo.map((z) => <BotonAlta key={z} zona={z} />)}
        </Aviso>
      )}
      {v.zonasAmbar.length > 0 && (
        <Aviso tono="ambar">En ámbar: {v.zonasAmbar.map((z) => NOMBRE_ZONA[z]).join(', ')}. No subas la carga de esas zonas.</Aviso>
      )}
      {sinResultado.map((f) => (
        <Aviso key={f} tono="info">
          Te falta apuntar el resultado del test del {fechaLarga(f)}. <Link href="/progreso" className="text-progreso underline">Apuntarlo en Progreso</Link>
        </Aviso>
      ))}

      {v.pedirChequeo && <TarjetaChequeo hoy={hoy} />}

      {v.hoy.length === 0 ? (
        <EstadoVacio titulo="Nada para hoy" texto="No tienes ninguna sesión para hoy." accion={{ href: '/entrenar', texto: 'Preparar una' }} />
      ) : (
        v.hoy.map((t, i) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} destacada={i === primeraPendiente} />)
      )}

      {proximo && (
        <p className="text-sm text-texto-2">
          Próximo hueco: {fechaLarga(proximo.fila.fecha)} {hhmmDeMinutos(proximo.fila.inicio_min)} ·{' '}
          {proximo.estado.tipo === 'planeado'
            ? `${nombreSesion(proximo.estado.sesion)}${proximo.estado.cargaAlta ? ' ★' : ''}`
            : proximo.estado.tipo === 'libre' ? 'libre' : 'sin plan'}
          {' · '}<Link href="/semana" className="text-progreso underline">Semana</Link>
        </p>
      )}

      {v.pendientes.length > 0 && (
        <details className="rounded-2xl border border-ambar/40 bg-ambar/10">
          <summary className={`${RESUMEN} text-ambar`}>
            <span>{v.pendientes.length === 1 ? '1 sesión sin registrar' : `${v.pendientes.length} sesiones sin registrar`}</span>
            <span className="text-sm">Apuntar ›</span>
          </summary>
          <div className="space-y-3 p-3 pt-0">
            <p className="text-sm text-texto-2">Las sesiones sin registro no cuentan para progresar: apunta cómo fueron.</p>
            {v.pendientes.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}

      {v.proximas.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>Próximas</summary>
          <div className="space-y-3 p-3 pt-0">
            {v.proximas.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}
      {v.recientes.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>Últimos 7 días</summary>
          <div className="space-y-3 p-3 pt-0">
            {[...v.recientes].reverse().map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} />)}
          </div>
        </details>
      )}

      <FormularioEntrenamientoLibre hoy={hoy} hora={ahora.hhmm} />
    </div>
  )
}
