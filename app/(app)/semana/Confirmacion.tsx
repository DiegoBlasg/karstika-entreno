'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const Contexto = createContext<(mensaje: string) => void>(() => {})

// Avisa desde cualquier «+» de la agenda: una sola confirmación para toda la página («Rato añadido el lunes 2.»).
export const useConfirmar = (): ((mensaje: string) => void) => useContext(Contexto)

// Envuelve la agenda. La región `role="status"` está siempre montada (los lectores de pantalla solo anuncian los cambios
// de una región que ya existía) y se vacía sola a los pocos segundos.
export function ConfirmacionRatos({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState('')
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(() => setMensaje(''), 5000)
    return () => clearTimeout(t)
  }, [mensaje])
  return (
    <Contexto.Provider value={setMensaje}>
      <p role="status" className={mensaje ? 'text-sm text-progreso' : 'sr-only'}>{mensaje}</p>
      {children}
    </Contexto.Provider>
  )
}
