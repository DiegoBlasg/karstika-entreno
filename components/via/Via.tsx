import { Etiqueta } from '@/components/ui/Etiqueta'
import { IconoCima } from '@/components/iconos/Escalada'
import type { VistaVia } from '@/lib/datos/via'
import { fechaLarga } from '@/lib/fecha'
import { Largo } from './Largo'
import { FilaVia, LINEA } from './Rail'
import { Reunion } from './Reunion'

function Cima({ cima, llegada }: { cima: VistaVia['cima']; llegada: boolean }) {
  const contenido = (
    <>
      <Etiqueta as="p" className="text-cima">Cima · semana objetivo{cima.actual ? ' · esta semana' : ''}</Etiqueta>
      <p className="font-titular text-2xl font-extrabold uppercase leading-tight">{fechaLarga(cima.lunes)}</p>
      <p className="tabular-nums">Grado objetivo: <span className="font-semibold text-cima">{cima.grado}</span></p>
      <p className="text-sm text-texto-2">{cima.objetivo}</p>
    </>
  )
  return (
    <FilaVia
      rail={
        <>
          <div className={`${LINEA} bottom-0 top-1/2 ${llegada ? 'bg-progreso' : 'bg-pista'}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full border-2 border-cima bg-fondo text-cima">
              <IconoCima size={22} />
            </span>
          </div>
        </>
      }
    >
      {cima.actual ? (
        <div className="my-1.5 space-y-1 rounded-2xl border border-cima bg-superficie p-4">{contenido}</div>
      ) : (
        <div className="space-y-1 py-2">{contenido}</div>
      )}
    </FilaVia>
  )
}

function Pie({ inicio, salida }: { inicio: string; salida: boolean }) {
  return (
    <FilaVia
      rail={
        <>
          <div className={`${LINEA} top-0 bottom-1/2 ${salida ? 'bg-progreso' : 'bg-pista'}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="size-3.5 rounded-full bg-progreso" />
          </div>
        </>
      }
    >
      <p className="py-2">
        <Etiqueta>Pie de vía</Etiqueta> <span className="text-texto-2">· {fechaLarga(inicio)}</span>
      </p>
    </FilaVia>
  )
}

// La temporada como una vía de varios largos, de la cima (arriba) al pie (abajo): se lee de abajo arriba, como se escala.
export function Via({ vista, inicio }: { vista: VistaVia; inicio: string }) {
  const { largos, cima, tests } = vista
  const lunesActual = largos.flatMap((l) => l.chapas).find((c) => c.estado === 'actual')?.lunes ?? null
  // R1, R2…: posición de cada reunión entre los largos que tienen semana de test.
  const numeros = new Map<number, number>()
  for (const l of largos) if (l.reunion) numeros.set(l.numero, numeros.size + 1)
  const ultimo = largos.at(-1)
  return (
    <ol aria-label="Tu vía, de la cima al pie">
      <li>
        <Cima cima={cima} llegada={cima.actual || ultimo?.estado === 'hecho'} />
      </li>
      {[...largos].reverse().flatMap((l) => {
        const filas = []
        if (l.reunion) {
          filas.push(
            <li key={`r${l.numero}`}>
              <Reunion reunion={l.reunion} numero={numeros.get(l.numero)!} tests={tests} lunesActual={lunesActual} hecho={l.estado === 'hecho'} />
            </li>,
          )
        }
        const actual = l.estado === 'actual'
        filas.push(
          <li key={`l${l.numero}`} id={actual ? 'largo-actual' : undefined} aria-current={actual ? 'step' : undefined} className="scroll-mt-24">
            <Largo largo={l} />
          </li>,
        )
        return filas
      })}
      <li>
        <Pie inicio={inicio} salida={largos.length > 0 && largos[0]!.estado !== 'futuro'} />
      </li>
    </ol>
  )
}
