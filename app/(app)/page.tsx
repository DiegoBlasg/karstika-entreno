import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { FilaSesion } from '@/components/FilaSesion'
import { GenerarEntreno } from '@/components/GenerarEntreno'
import { FondoTopo } from '@/components/FondoTopo'
import { MiniVia } from '@/components/MiniVia'
import { PieDeVia } from '@/components/PieDeVia'
import { Aviso } from '@/components/ui/Aviso'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { pasosArranque } from '@/lib/datos/arranque'
import { testsSinResultado, vistaHoy } from '@/lib/datos/hoy'
import { progresoLargo, tituloLargo } from '@/lib/datos/largo'
import { posicionSiSePuede, type PosicionTemporada } from '@/lib/datos/temporada'
import { claveFila, franjasLibres, inicialGenerar } from '@/lib/datos/agenda'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { chequeoDelDia } from '@/lib/formulario'
import { NOMBRE_ZONA } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonAlta } from './_hoy/BotonAlta'
import { LimpiezaCronometro } from './_hoy/LimpiezaCronometro'
import { gradosReferencia } from '@/lib/escaladas/nivel'
import { FormularioEntrenamientoLibre } from './_hoy/FormularioEntrenamientoLibre'
import { TarjetaChequeo } from './_hoy/TarjetaChequeo'
import { TarjetaSesion } from './_hoy/TarjetaSesion'

const PLEGABLE = 'rounded-2xl border border-borde bg-superficie'
const RESUMEN = 'flex min-h-11 cursor-pointer items-center justify-between px-4 py-2 font-titular text-lg font-bold uppercase'

export default async function PaginaHoy() {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const enTemporada = hoy >= datos.perfil.inicio_temporada && hoy <= datos.perfil.objetivo_temporada
  const libresHoy = franjasLibres(datos, hoy)
  const v = vistaHoy(datos, hoy)
  const sinResultado = testsSinResultado(datos, hoy)
  const largo = progresoLargo(datos, hoy)
  const arranque = pasosArranque(datos)
  const referencia = gradosReferencia(datos.escaladas ?? [], datos.perfil, hoy)
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

      {!arranque.completo && <PieDeVia pasos={arranque} principal={false} />}
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
        <div className="space-y-3">
          <EstadoVacio titulo="Nada para hoy" texto={enTemporada ? 'No tienes ninguna sesión para hoy.' : 'Fuera de la temporada: cambia las fechas en Yo para planificar otra.'} />
          {enTemporada && (
            <GenerarEntreno fecha={hoy} titulo="hoy" inicial={inicialGenerar(datos, hoy)} libres={libresHoy} principal
              pedirChequeo={!chequeoDelDia(datos.chequeos, hoy)} />
          )}
        </div>
      ) : (
        <>
          {v.hoy.map((t, i) => <TarjetaSesion key={claveFila(t)} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} destacada={i === primeraPendiente} escaladas={datos.escaladas} referencia={referencia} />)}
          {enTemporada && libresHoy.length > 0 && (
            <GenerarEntreno fecha={hoy} titulo="hoy" inicial={inicialGenerar(datos, hoy)} libres={libresHoy} compacto
              pedirChequeo={!chequeoDelDia(datos.chequeos, hoy)} />
          )}
        </>
      )}

      {v.pendientes.length > 0 && (
        <details className="rounded-2xl border border-ambar/40 bg-ambar/10">
          <summary className={`${RESUMEN} text-ambar`}>
            <span>{v.pendientes.length === 1 ? '1 sesión sin registrar' : `${v.pendientes.length} sesiones sin registrar`}</span>
            <span className="text-sm">Apuntar ›</span>
          </summary>
          <div className="space-y-3 p-3 pt-0">
            <p className="text-sm text-texto-2">Las sesiones sin registro no cuentan para progresar: apunta cómo fueron.</p>
            {v.pendientes.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} posicion={posicionDe(t.fila.fecha)} escaladas={datos.escaladas} referencia={referencia} />)}
          </div>
        </details>
      )}

      {v.proximas.length > 0 && (
        <section aria-label="Próximas" className="space-y-2">
          <h2 className="font-titular text-lg font-bold uppercase">Próximas</h2>
          {v.proximas.slice(0, 5).map((t) => <FilaSesion key={claveFila(t)} tarjeta={t} hoy={hoy} />)}
          <Link href="/semana" className="inline-flex min-h-11 items-center text-sm text-progreso underline">Ver la semana</Link>
        </section>
      )}
      {v.recientes.length > 0 && (
        <details className={PLEGABLE}>
          <summary className={RESUMEN}>Últimos 7 días</summary>
          <div className="space-y-2 p-3 pt-0">
            {[...v.recientes].reverse().map((t) => <FilaSesion key={claveFila(t)} tarjeta={t} hoy={hoy} />)}
          </div>
        </details>
      )}

      <FormularioEntrenamientoLibre hoy={hoy} hora={ahora.hhmm} escaladas={datos.escaladas ?? []} referencia={referencia} />
    </div>
  )
}
