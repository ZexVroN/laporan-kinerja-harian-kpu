import type { ReactNode } from 'react'

/** Banner marun dengan lengkung emas — satu-satunya ornamen di dasbor. */
export function Hero({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[20px] bg-maroon-900 px-6 py-7 text-white sm:px-8">
      <svg aria-hidden="true" viewBox="0 0 600 220" preserveAspectRatio="none" className="pointer-events-none absolute top-0 right-0 h-full w-[60%]" fill="none">
        <path d="M0 220 C 200 200, 420 110, 620 -10 L 620 220 Z" fill="#3D060C" opacity="0.5" />
        <path d="M0 220 C 200 200, 420 110, 620 -10" stroke="#C9A24B" strokeWidth="2" opacity="0.85" />
        <path d="M80 220 C 270 205, 470 130, 640 30" stroke="#C9A24B" strokeWidth="1" opacity="0.4" />
      </svg>
      <div className="relative">{children}</div>
    </section>
  )
}
