import type { ReactNode } from 'react'

type PageShellProps = {
  title: string
  children: ReactNode
}

const PageShell = ({ title, children }: PageShellProps) => {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export default PageShell
