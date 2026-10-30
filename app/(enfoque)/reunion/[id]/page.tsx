import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BOTON, BOTON_SECUNDARIO } from '@/components/estilos'
import { cifra, fechaCorta, firmado } from '@/components/progreso/formato'
import { Aviso } from '@/components/ui/Aviso'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { resumenReunion, type Mejora } from '@/lib/datos/celebracion'
import { textoLastre } from '@/lib/cronometro/test'
import { ahoraMadrid } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'

const TITULAR: Record<Exclude<Mejora, 'sube'>, string> = { igual: 'Te mantienes', baja: 'Hoy, algo menos', primera: 'Tu primera marca' }


export default async function PaginaReunion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { datos } = await requerirDatos()
  const r = resumenReunion(datos, id, ahoraMadrid(new Date()).fecha)
  if (!r) redirect('/progreso')
  const celebra = r.mejora === 'sube' || r.mejora === 'primera'
  const record = r.logrosNuevos.some((l) => l.id === 'record-fuerza')
  const titular = r.mejora === 'sube' ? (record ? 'Nuevo récord' : 'Subes') : TITULAR[r.mejora]
  return (
    <div className="relative space-y-5 text-center">
      {celebra && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-16 h-72 bg-[radial-gradient(circle_at_50%_30%,color-mix(in_srgb,var(--color-progreso)_18%,transparent),transparent_65%)]" />
      )}
      <div className="relative space-y-3">
        <div
          aria-hidden="true"
          className={`mx-auto flex size-20 items-center justify-center rounded-full font-titular text-3xl font-extrabold ${
            r.reunion ? 'bg-progreso text-fondo' : 'border-2 border-borde text-texto-2'
          } ${celebra ? 'animate-chapa motion-reduce:animate-none' : ''}`}
        >
          {r.reunion ? `R${r.reunion.numero}` : 'Test'}
        </div>
        <Etiqueta as="p">{r.reunion ? `Reunión R${r.reunion.numero} · ${r.reunion.fase}` : 'Test de dedos'}</Etiqueta>
        <h1 className="font-titular text-5xl font-bold uppercase tracking-tight">
          {celebra ? <span className="text-progreso">{titular}</span> : titular}
        </h1>
      </div>

      <Tarjeta className="relative space-y-3 text-left">
        <Etiqueta as="h2">Fuerza de dedos · % del peso</Etiqueta>
        {r.anterior && (
          <p className="text-sm text-texto-2">
            Antes ({fechaCorta(r.anterior.fecha)}): {cifra(r.anterior.fuerzaRelativa)} % · {textoLastre(r.anterior.lastreKg)}
          </p>
        )}
        <CifraGrande
          valor={cifra(r.test.fuerzaRelativa)}
          unidad="%"
          delta={r.diferencia === null ? undefined : { texto: `${firmado(r.diferencia)} puntos`, sentido: r.mejora === 'sube' ? 'sube' : r.mejora === 'baja' ? 'baja' : 'igual' }}
        />
        <p className="text-sm text-texto-2">Ahora ({fechaCorta(r.test.fecha)}): {textoLastre(r.test.lastreKg)}</p>
      </Tarjeta>

      {r.mejora === 'baja' && (
        <Aviso tono="info" className="text-left">
          Un test peor no borra lo entrenado. Suele pesar más la fatiga, el sueño o una semana de descarga reciente que la fuerza real: repítelo cuando toque.
        </Aviso>
      )}

      {r.repeaters && (
        <p className="text-left text-sm text-texto-2">
          Tus repeaters: empiezan con {textoLastre(r.repeaters.lastreInicial)} y pueden subir hasta {textoLastre(r.repeaters.lastreMaximo)}.
        </p>
      )}

      {r.siguienteLargo && (
        <Tarjeta className="space-y-1 text-left">
          <Etiqueta as="h2">Siguiente largo</Etiqueta>
          <p className="font-semibold">L{r.siguienteLargo.numero} · {r.siguienteLargo.fase}</p>
          <p className="text-sm text-texto-2">{r.siguienteLargo.semanas} semanas</p>
          <p className="text-sm">{r.siguienteLargo.objetivo}</p>
        </Tarjeta>
      )}

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

      <div className="space-y-3">
        <Link href="/via" className={`${BOTON} w-full`}>Seguir escalando</Link>
        <Link href="/progreso" className={`${BOTON_SECUNDARIO} w-full`}>Volver a Progreso</Link>
      </div>
    </div>
  )
}
