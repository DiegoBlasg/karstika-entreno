import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { testsSinResultado, vistaHoy } from '@/lib/datos/hoy'
import { proximoHueco } from '@/lib/datos/semana'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos } from '@/lib/fecha'
import { NOMBRE_ZONA, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonAlta } from './_hoy/BotonAlta'
import { FormularioEntrenamientoLibre } from './_hoy/FormularioEntrenamientoLibre'
import { TarjetaChequeo } from './_hoy/TarjetaChequeo'
import { TarjetaSesion } from './_hoy/TarjetaSesion'

export default async function PaginaHoy() {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const proximo = proximoHueco(datos, { fecha: hoy, minutos: Math.round(ahora.hora * 60) })
  const v = vistaHoy(datos, hoy)
  const sinResultado = testsSinResultado(datos, hoy)
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Hoy, {fechaLarga(hoy)}</h1>
      {v.pedirChequeo && <TarjetaChequeo hoy={hoy} />}
      {proximo && (
        <p className="text-sm">
          Próximo hueco: {fechaLarga(proximo.fila.fecha)} {hhmmDeMinutos(proximo.fila.inicio_min)} ·{' '}
          {proximo.estado.tipo === 'planeado'
            ? `${nombreSesion(proximo.estado.sesion)}${proximo.estado.cargaAlta ? ' ★' : ''}`
            : proximo.estado.tipo === 'libre' ? 'libre' : 'sin plan'}
          {' · '}<Link href="/semana" className="underline">Mi semana</Link>
        </p>
      )}
      {sinResultado.map((f) => (
        <p key={f} className="rounded border border-sky-300 bg-sky-50 p-3 text-sm">
          Te falta apuntar el resultado del test del {fechaLarga(f)}. <Link href="/evaluacion" className="underline">Apuntarlo en Evaluación</Link>
        </p>
      ))}
      {v.zonasRojo.length > 0 && (
        <section className="space-y-2 rounded border border-red-300 bg-red-50 p-3">
          <p className="font-medium">En rojo: {v.zonasRojo.map((z) => NOMBRE_ZONA[z]).join(', ')}. No cargues esas zonas.</p>
          <AvisoMedico />
          {v.zonasRojo.map((z) => <BotonAlta key={z} zona={z} />)}
        </section>
      )}
      {v.zonasAmbar.length > 0 && (
        <p className="rounded bg-amber-50 p-3 text-sm">En ámbar: {v.zonasAmbar.map((z) => NOMBRE_ZONA[z]).join(', ')}. No subas la carga de esas zonas.</p>
      )}
      {v.pendientes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Sin registrar</h2>
          <p className="text-sm text-stone-600">Las sesiones sin registro no cuentan para progresar: apunta cómo fueron.</p>
          {v.pendientes.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)}
        </section>
      )}
      {v.hoy.length === 0 ? (
        <p>No tienes ninguna sesión para hoy. <Link href="/entrenar" className="underline">Prepara una</Link>.</p>
      ) : (
        v.hoy.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)
      )}
      {v.recientes.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer font-medium">Últimos 7 días</summary>
          <div className="space-y-3 pt-3">
            {[...v.recientes].reverse().map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)}
          </div>
        </details>
      )}
      {v.proximas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Próximas</h2>
          {v.proximas.map((t) => <TarjetaSesion key={t.fila.id} tarjeta={t} hoy={hoy} />)}
        </section>
      )}
      <FormularioEntrenamientoLibre hoy={hoy} hora={ahora.hhmm} />
    </div>
  )
}
