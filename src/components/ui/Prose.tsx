import type { ReactNode } from 'react'
import { LAST_UPDATED } from '../layout/ArticleLayout'

/** Small typographic building blocks shared by the prose routes. */

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-3 text-base font-semibold" style={{ color: 'var(--text)' }}>
      {children}
    </h2>
  )
}

export function Updated() {
  return <p className="text-xs">Last updated: {LAST_UPDATED}</p>
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 pl-1">{children}</ul>
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-4 before:absolute before:left-0 before:content-['—']">{children}</li>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="font-mono text-xs">{children}</code>
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  )
}

export function DataTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr style={{ color: 'var(--text)' }}>
            {head.map((h) => (
              <th
                key={h}
                className="border-b py-2 pr-3 font-semibold"
                style={{ borderColor: 'var(--border)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td
                  key={i}
                  className="border-b py-2 pr-3 align-top"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {i === 1 ? <code className="font-mono">{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
