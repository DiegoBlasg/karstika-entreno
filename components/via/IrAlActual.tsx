'use client'
import { useEffect } from 'react'

// Al entrar en Vía, el largo actual queda a la vista (la vía es larga y se lee de abajo arriba).
export function IrAlActual() {
  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('largo-actual')?.scrollIntoView({ block: 'center', behavior: reducir ? 'auto' : 'smooth' })
  }, [])
  return null
}
