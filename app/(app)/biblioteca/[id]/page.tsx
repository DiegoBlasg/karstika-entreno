import Link from 'next/link'
import { Dibujo } from '@/components/dibujos'
import { FICHA_IDS, fichaDe } from '@/lib/biblioteca/fichas'
import { basesDeParametros } from '@/lib/fuentes'

// Las fichas son texto fijo: se generan en el build (un id desconocido se pinta al pedirlo, con «no encontrado»).
export function generateStaticParams() {
  return FICHA_IDS.map((id) => ({ id }))
}

export default async function PaginaFicha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let f: ReturnType<typeof fichaDe>
  try {
    f = fichaDe(decodeURIComponent(id))
  } catch {
    f = undefined // URL mal formada (p. ej. «%E0»)
  }
  if (!f) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Ejercicio no encontrado</h1>
        <Link href="/biblioteca" className="text-progreso underline">Ver la biblioteca</Link>
      </div>
    )
  }
  const bases = basesDeParametros(f.parametros)
  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-semibold">{f.titulo}</h1>
      <p>{f.paraQue}</p>
      {f.dibujo && <Dibujo id={f.dibujo} className="mx-auto text-texto" />}
      <p><span className="font-medium">Material:</span> {f.material}</p>
      <section>
        <h2 className="font-medium">Cómo se hace</h2>
        <ol className="mt-1 ml-5 list-decimal space-y-1">
          {f.pasos.map((p) => <li key={p}>{p}</li>)}
        </ol>
      </section>
      <section>
        <h2 className="font-medium">Errores típicos</h2>
        <ul className="mt-1 ml-4 list-disc space-y-1">
          {f.errores.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </section>
      <section className="rounded bg-ambar/10 p-3">
        <h2 className="font-medium">Cuándo parar</h2>
        <ul className="mt-1 ml-4 list-disc space-y-1">
          {f.paraSi.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </section>
      {bases.length > 0 && (
        <section>
          <h2 className="font-medium">Por qué se hace</h2>
          <ul className="mt-1 space-y-2">
            {bases.map((b) => (
              <li key={b.parametro}>
                {b.titulo} · <span className="text-texto-2">{b.nivelTexto}</span>
                {b.estudios.length > 0 && (
                  <ul className="ml-3 list-disc text-xs">
                    {b.estudios.map((e) => (
                      <li key={e.id}>
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-progreso underline">{e.cita}</a>
                        ) : (
                          e.cita
                        )}
                        {' · '}
                        <Link href={`/fuentes/${e.id}`} className="text-progreso underline">detalle</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link href="/biblioteca" className="text-progreso underline">Ver la biblioteca</Link>
    </div>
  )
}
