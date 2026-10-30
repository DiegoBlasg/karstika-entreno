'use client'

import { useEffect } from 'react'
import { clavesObsoletas } from '@/lib/cronometro/claves'

// No pinta nada: al cargar Hoy borra del navegador lo guardado del cronómetro de sesiones que ya no están pendientes de hoy.
export function LimpiezaCronometro({ pendientesHoy }: { pendientesHoy: string[] }) {
  const clave = pendientesHoy.join(',')
  useEffect(() => {
    try {
      const claves = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((c): c is string => c !== null)
      for (const c of clavesObsoletas(claves, clave === '' ? [] : clave.split(','))) localStorage.removeItem(c)
    } catch {
      // Sin almacenamiento (ventana privada…): no hay nada que limpiar.
    }
  }, [clave])
  return null
}
