'use client' // Los error boundaries tienen que ser Client Components

import { useEffect } from 'react'
import { BOTON } from '@/components/estilos'

export default function ErrorApp({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  // En producción, los errores de Server Components llegan con un mensaje genérico y un identificador (digest).
  const mensaje = error instanceof Error ? error.message : String(error)
  const digest = error instanceof Error && 'digest' in error && typeof error.digest === 'string' ? error.digest : null
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Algo ha fallado</h1>
      <p className="text-sm text-stone-600">No se ha podido cargar esta pantalla. Puede ser un fallo pasajero: prueba otra vez.</p>
      <button type="button" className={BOTON} onClick={() => retry()}>Reintentar</button>
      <details className="text-sm">
        <summary className="cursor-pointer">Detalle del error</summary>
        <p className="mt-1 whitespace-pre-wrap">{mensaje}</p>
        {digest && <p className="mt-1 text-stone-500">Identificador: {digest}</p>}
      </details>
    </div>
  )
}
