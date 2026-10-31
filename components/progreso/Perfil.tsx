import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { VistaPerfil } from '@/lib/datos/perfil-limitantes'
import { NOMBRE_LIMITANTE } from '@/lib/nombres'

// «la fuerza de dedos» → «Fuerza de dedos»
const titulo = (t: string): string => {
  const sin = t.replace(/^la /, '')
  return sin.charAt(0).toUpperCase() + sin.slice(1)
}

// Lo que más te limita (naranja de cima: lo que falta) y lo que mejor llevas (lima de progreso), cada uno con su origen.
export function Perfil({ v }: { v: VistaPerfil }) {
  return (
    <Tarjeta aria-label="Tu perfil">
      <Etiqueta as="h2">Tu perfil</Etiqueta>
      <div className="space-y-1">
        <p className="text-sm text-texto-2">Lo que más te limita</p>
        <p className="font-titular text-3xl font-extrabold uppercase leading-none text-cima">{titulo(NOMBRE_LIMITANTE[v.limita.cualidad])}</p>
        <p className="text-sm text-texto-2">{v.limita.origen}.</p>
        {v.plan && <p className="text-sm">{v.plan}</p>}
      </div>
      <div className="space-y-1 border-t border-borde pt-3">
        <p className="text-sm text-texto-2">Lo que mejor llevas</p>
        {v.fuerte ? (
          <>
            <p className="font-titular text-2xl font-extrabold uppercase leading-none text-progreso">{titulo(NOMBRE_LIMITANTE[v.fuerte.cualidad])}</p>
            <p className="text-sm text-texto-2">{v.fuerte.origen}.</p>
          </>
        ) : (
          <p className="text-sm">Aún no lo sabemos: hacen falta 3 tests o unas semanas respondiendo al terminar.</p>
        )}
      </div>
      {v.sinDatos && (
        <p className="text-sm text-texto-2">Responde «¿Qué te frenó hoy?» al terminar tus sesiones al límite y esto se llenará con tus datos.</p>
      )}
    </Tarjeta>
  )
}
