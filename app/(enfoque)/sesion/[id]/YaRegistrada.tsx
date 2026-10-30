'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// La sesión ya está registrada (también justo después de registrarla desde el cronómetro: la página se vuelve a pintar
// en el servidor antes de que el formulario pueda navegar). Borra lo guardado del cronómetro y vuelve a Hoy.
export function YaRegistrada({ id }: { id: string }) {
  const router = useRouter()
  useEffect(() => {
    try {
      localStorage.removeItem(`cronometro:${id}`)
      localStorage.removeItem(`cronometro:${id}:test`)
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
    router.replace('/')
  }, [id, router])
  return (
    <div className="space-y-3">
      <p>Esta sesión ya está registrada.</p>
      <Link href="/" className="inline-flex min-h-11 items-center underline">Volver a Hoy</Link>
    </div>
  )
}
