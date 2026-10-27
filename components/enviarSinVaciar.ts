'use client'

import { startTransition, type FormEvent } from 'react'

// React 19 vacía los campos no controlados de un <form action={…}> al terminar cada acción, también cuando la acción
// devuelve un error. Enviando desde onSubmit (sin action) los campos conservan lo que ha escrito el usuario.
export function enviarSinVaciar(accion: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => accion(fd))
  }
}
