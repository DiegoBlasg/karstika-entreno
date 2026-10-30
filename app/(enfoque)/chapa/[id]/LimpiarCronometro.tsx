'use client'

import { useEffect } from 'react'

// No pinta nada: la sesión ya está registrada, así que borra del navegador lo guardado de su cronómetro (reloj y test).
// Va aquí y no solo en Hoy porque `registrar` redirige a la chapa y desde ella se puede cerrar la app sin pasar por Hoy.
export function LimpiarCronometro({ sesionId }: { sesionId: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(`cronometro:${sesionId}`)
      localStorage.removeItem(`cronometro:${sesionId}:test`)
    } catch {
      // Sin almacenamiento (ventana privada…): no hay nada que borrar.
    }
  }, [sesionId])
  return null
}
