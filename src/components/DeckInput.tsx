import { useRef } from 'react'

const SAMPLE = `1 Monk Gyatso (TLE) 81
1 Ancient Tomb (EOS) 1
1 Deserted Temple (MH3) 301 *F*
1 Emeria's Call / Emeria, Shattered Skyclave (ZNR) 12
1 Esper Sentinel (PLST) MH2-12
1 Metalworker (WC00) jf135
1 Sol Ring (MSC) 214
1 Urza's Saga (MB2) 114
4 Snow-Covered Plains (MH1) 250`

interface Props {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  pending: boolean
  error?: string
}

export function DeckInput({ value, onChange, onSubmit, pending, error }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const lineCount = value.split('\n').filter((l) => l.trim()).length

  return (
    <form
      className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-14"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">MTG Print</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm/6" style={{ color: 'var(--text-muted)' }}>
          Paste a decklist, choose the printing you want for each card, and download a PDF laid
          out 9 to a page at true card size — 63 × 88 mm.
        </p>
      </header>

      <div className="surface overflow-hidden rounded-xl">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter submits, matching the muscle memory of most paste-and-go tools.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={'1 Sol Ring (MSC) 214\n1 Deserted Temple (MH3) 301 *F*\n4 Snow-Covered Plains (MH1) 250'}
          aria-label="Decklist"
          className="block h-64 w-full resize-y bg-transparent p-4 font-mono text-[13px]/6 outline-none sm:h-80"
        />
        <div
          className="flex items-center justify-between border-t px-4 py-2 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>{lineCount === 0 ? 'Empty' : `${lineCount} line${lineCount === 1 ? '' : 's'}`}</span>
          <button
            type="button"
            className="underline underline-offset-2 hover:opacity-70"
            onClick={() => {
              onChange(SAMPLE)
              ref.current?.focus()
            }}
          >
            Load a sample
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col items-center gap-3">
        <button type="submit" className="btn btn-primary w-full sm:w-auto sm:px-10" disabled={pending || !value.trim()}>
          {pending ? 'Looking up cards…' : 'Submit'}
        </button>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Supports MTG Arena and Moxfield exports —{' '}
          <code className="font-mono">1 Card Name (SET) 123</code>
        </p>
      </div>
    </form>
  )
}
