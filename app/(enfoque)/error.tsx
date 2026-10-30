'use client' // Los error boundaries tienen que ser Client Components

import ErrorApp from '../(app)/error'

// La sesión a pantalla completa vive fuera de (app): mismo aviso de error, sin duplicar lógica.
export default function ErrorEnfoque(props: { error: unknown; retry: () => void }) {
  return <ErrorApp {...props} />
}
