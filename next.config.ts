import type { NextConfig } from 'next'

const config: NextConfig = {
  // Rutas de antes del rediseño: los enlaces guardados siguen funcionando.
  async redirects() {
    return [
      { source: '/plan', destination: '/via', permanent: false },
      { source: '/evaluacion', destination: '/progreso', permanent: false },
    ]
  },
}

export default config
