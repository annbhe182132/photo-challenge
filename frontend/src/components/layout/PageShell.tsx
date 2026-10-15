import type { ReactNode } from 'react'

type PageShellProps = {
  title: string
  children: ReactNode
}

const PageShell = ({ title, children }: PageShellProps) => {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 text-slate-100 sm:px-6 sm:py-8">
      <h1 className="mb-5 text-2xl font-bold sm:text-3xl">{title}</h1>
      {children}
    </main>
  )
}

export default PageShell
