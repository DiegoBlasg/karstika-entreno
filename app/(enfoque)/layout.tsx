import Link from 'next/link'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export default function LayoutEnfoque({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-[env(safe-area-inset-top)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex justify-end py-2">
        <Link href="/" aria-label="Cerrar y volver a Hoy" className="flex size-11 items-center justify-center rounded-full text-texto-2">
          <X size={22} aria-hidden />
        </Link>
      </header>
      <main>{children}</main>
    </div>
  )
}
