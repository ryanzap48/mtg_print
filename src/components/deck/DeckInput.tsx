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
}

export function DeckInput({ value, onChange, onSubmit, pending }: Props) {
  const lineCount = value.split('\n').filter((l) => l.trim()).length

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div
        className="overflow-hidden rounded-lg"
        style={{ border: '1px solid var(--border-strong)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-3 py-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <label htmlFor="decklist" className="text-sm font-medium">
            Paste a decklist
          </label>
          <button
            type="button"
            className="shrink-0 text-xs underline underline-offset-2 hover:opacity-60"
            style={{ color: 'var(--text-muted)' }}
            // Deliberately does not focus the textarea: focusing scrolls it into view and
            // makes mobile browsers zoom to the caret.
            onClick={() => onChange(SAMPLE)}
          >
            Load a sample
          </button>
        </div>

        <textarea
          id="decklist"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl+Enter submits, matching the muscle memory of paste-and-go tools.
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              onSubmit()
            }
          }}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder={'1 Sol Ring (MSC) 214\n4 Snow-Covered Plains (MH1) 250'}
          className="block h-72 w-full resize-y bg-transparent p-3 font-mono text-[13px]/6 outline-none sm:h-[28rem]"
        />

        <div
          className="px-3 py-1.5 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {lineCount === 0 ? 'Empty' : `${lineCount} line${lineCount === 1 ? '' : 's'}`}
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary mt-3 w-full sm:w-auto sm:px-8"
        disabled={pending || !value.trim()}
      >
        {pending ? 'Looking up cards…' : 'Submit'}
      </button>
    </form>
  )
}
