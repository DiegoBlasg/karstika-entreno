import { cifra, fechaCorta, firmado } from '@/components/progreso/formato'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { FilaTest, VistaTests } from '@/lib/datos/tests'

// Una fila por prueba: último valor, cambio desde el anterior y si es un cambio real (P-19). Los tests sin dinamómetro
// varían de un día a otro: un cambio pequeño se muestra como «dentro del margen» para no leerlo como progreso ni como
// retroceso. Las pruebas con margen en % (fuerza, colgado) muestran el cambio en %.
function Cambio({ f }: { f: FilaTest }) {
  if (f.cambio === null) return <span className="text-texto-2">primera medida</span>
  const relativo = f.id === 'fuerza' || f.id === 'colgado'
  const texto = relativo && f.cambioPct !== null
    ? `${firmado(f.cambioPct)} %`
    : `${firmado(f.cambio)}${f.unidad === 'cm' ? ' cm' : ''}`
  if (f.real === 'mejora') return <span className="text-progreso">{texto} · mejora real</span>
  if (f.real === 'empeora') return <span className="text-ambar">{texto} · empeora de verdad</span>
  return <span className="text-texto-2">{texto} · dentro del margen ({f.umbral})</span>
}

export function TusTests({ v }: { v: VistaTests }) {
  if (v.filas.length === 0 && v.antiguos73.length === 0) return null
  return (
    <Tarjeta aria-label="Tus tests">
      <Etiqueta as="h2">Tus tests</Etiqueta>
      {v.filas.length > 0 && (
        <>
          <ul className="divide-y divide-borde">
            {v.filas.map((f) => (
              <li key={f.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{f.nombre}{f.conDescarga && <span className="text-sm font-normal text-texto-2"> · con descarga</span>}</p>
                  <p className="text-sm"><Cambio f={f} /></p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="font-titular text-2xl font-extrabold tabular-nums">{cifra(f.ultimo)}</span>{' '}
                  <span className="text-sm text-texto-2">{f.unidad}</span>
                  <span className="block text-xs text-texto-2">{fechaCorta(f.fecha)}</span>
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-texto-2">
            Cada cambio es frente a tu medida anterior. Cuenta como real si supera el margen del test o si van 3 medidas seguidas en la misma dirección. En la cadera, menos cm es más apertura.
          </p>
        </>
      )}
      {v.antiguos73.length > 0 && (
        <p className="text-xs text-texto-2">
          7:3 antiguos (otra prueba, no se compara con el colgado): {v.antiguos73.map((a) => `${cifra(a.segundos)} s el ${fechaCorta(a.fecha)}`).join(' · ')}
        </p>
      )}
    </Tarjeta>
  )
}
