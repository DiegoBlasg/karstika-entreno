// Curvas de nivel decorativas para las cabeceras de Hoy y Vía. El padre debe ser `relative`.
export function FondoTopo({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full text-progreso opacity-15 ${className}`} fill="none" stroke="currentColor" strokeWidth={1}>
      <path d="M-20 60 C70 20 150 100 240 50 S380 30 420 70" />
      <path d="M-20 90 C70 50 150 130 240 80 S380 60 420 100" />
      <path d="M-20 120 C80 80 150 160 240 110 S380 90 420 130" />
      <path d="M-20 150 C80 110 160 190 250 140 S380 120 420 160" />
      <path d="M-20 180 C90 140 160 220 250 170 S380 150 420 190" />
    </svg>
  )
}
