import type { ReactNode } from 'react'
import { BarraPestanas } from '@/components/BarraPestanas'

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BarraPestanas />
    </>
  )
}
