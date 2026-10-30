import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BOTON, BOTON_SECUNDARIO } from '@/components/estilos'
import { BarraProgreso } from '@/components/ui/BarraProgreso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { resumenRegistro, textoEsfuerzo } from '@/lib/datos/celebracion'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { LimpiarCronometro } from './LimpiarCronometro'

// Tramo de vía con chapas: las anteriores en lima y la nueva (la última) con aro y animación de entrada.
function DibujoChapa() {
  const ys = [92, 62, 32]
  return (
    <svg aria-hidden="true" width="64" height="124" viewBox="0 0 64 124" className="mx-auto">
      <line x1="32" y1="8" x2="32" y2="116" className="stroke-pista" strokeWidth="3" />
      <path d="M24 14 L32 2 L40 14 Z" className="fill-cima" />
      {ys.map((y, i) =>
        i < ys.length - 1 ? (
          <circle key={y} cx="32" cy={y} r="6" className="fill-progreso" />
        ) : (
          <g key={y} className="origin-[32px_32px] animate-chapa motion-reduce:animate-none" data-testid="chapa-nueva">
            <circle cx="32" cy={y} r="13" className="fill-fondo stroke-progreso" strokeWidth="3" />
            <circle cx="32" cy={y} r="6" className="fill-progreso" />
          </g>
        ),
      )}
    </svg>
  )
}

export default async function PaginaChapa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { datos } = await requerirDatos()
  const r = resumenRegistro(datos, id, ahoraMadrid(new Date()).fecha)
  if (!r) redirect('/')
  const { largo } = r
  const hechas = largo ? (largo.sesionesHechas === 1 ? '1 sesión hecha' : `${largo.sesionesHechas} sesiones hechas`) : ''
  return (
    <div className="space-y-5 text-center">
      <LimpiarCronometro sesionId={r.sesion.id} />
      <DibujoChapa />
      <div className="space-y-1">
        <Etiqueta as="p">Sesión registrada</Etiqueta>
        <h1 className="font-titular text-5xl font-bold uppercase tracking-tight">
          +1 <span className="text-progreso">chapa</span>
        </h1>
      </div>
      {largo && (
        <Tarjeta className="text-left">
          <p>{largo.enCima ? 'Semana objetivo' : `${largo.fase} · semana ${largo.semanaDeFase} de ${largo.semanasDeFase}`}</p>
          <p className="text-sm text-texto-2">{hechas} en este largo</p>
          <BarraProgreso valor={largo.semanaDeFase / largo.semanasDeFase} etiqueta="Semanas del largo" />
        </Tarjeta>
      )}
      <Tarjeta className="text-left">
        <Etiqueta as="h2">Lo que ha entendido el entrenador</Etiqueta>
        <p>{textoEsfuerzo(r.esfuerzo)}</p>
      </Tarjeta>
      {r.logrosNuevos.length > 0 && (
        <Tarjeta destacada className="text-left">
          <Etiqueta as="h2">Logro conseguido</Etiqueta>
          <ul className="space-y-2">
            {r.logrosNuevos.map((l) => (
              <li key={l.id}>
                <p className="font-semibold">{l.titulo}</p>
                <p className="text-sm text-texto-2">{l.descripcion}</p>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      {r.conTest && (
        <Link href={`/reunion/${r.conTest}`} className={`${BOTON_SECUNDARIO} w-full`}>Ver tu reunión</Link>
      )}
      {r.siguiente && (
        <Tarjeta className="text-left">
          <Etiqueta as="h2">Siguiente</Etiqueta>
          <p className="first-letter:uppercase">{fechaLarga(r.siguiente.fecha)}</p>
          <p className="text-sm text-texto-2">{nombreSesion(r.siguiente.sesion)}</p>
        </Tarjeta>
      )}
      <Link href="/" className={`${BOTON} w-full`}>Hecho</Link>
    </div>
  )
}
