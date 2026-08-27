import { useEffect, useRef, useState } from 'react'
import {
  SOCIAL_TARGETS,
  canShareFile,
  canShareLink,
  copyToClipboard,
  shareLink,
  sharePdf,
  shareText,
  siteUrl,
} from '../../lib/share/share'
import { useScrollLock } from '../../hooks/useScrollLock'

interface Props {
  open: boolean
  onClose: () => void
  /** The finished PDF, or null while it is still being built. */
  file: File | null
  building: boolean
  progressLabel?: string
  onSave: () => void
  decklist: string
}

export function ShareDialog({
  open,
  onClose,
  file,
  building,
  progressLabel,
  onSave,
  decklist,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState<string>()
  useScrollLock(open)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
    if (open) setNote(undefined)
  }, [open])

  const fileSharable = file ? canShareFile(file) : false

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="mx-0 mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl p-0 backdrop:bg-black/50 sm:mx-auto sm:my-auto sm:max-w-md sm:rounded-2xl"
      style={{ background: 'var(--surface)', color: 'var(--text)' }}
    >
      <div className="p-5 sm:p-7">
        <h2 className="text-lg font-bold">Share</h2>

        <section className="mt-5">
          <h3 className="text-sm font-semibold">Send the PDF</h3>
          {building ? (
            <p className="mt-2 text-xs/5" style={{ color: 'var(--text-muted)' }}>
              {progressLabel ?? 'Building your PDF…'}
            </p>
          ) : fileSharable ? (
            <>
              <button
                type="button"
                className="btn btn-primary mt-2 w-full"
                onClick={async () => {
                  // Called straight from the click: the file is already built, so the user
                  // gesture the share sheet requires is still intact.
                  const result = await sharePdf(file!, 'MTG Print Proxy deck')
                  if (result === 'shared') onClose()
                  else if (result === 'failed') setNote('Your browser would not open the share sheet.')
                }}
              >
                Send file…
              </button>
              <p className="mt-2 text-xs/5" style={{ color: 'var(--text-muted)' }}>
                Opens your device's share sheet: Messages, Mail, AirDrop, WhatsApp and anything
                else that accepts a file.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs/5" style={{ color: 'var(--text-muted)' }}>
              This browser cannot hand a file to other apps. Save the PDF and attach it yourself.
            </p>
          )}
          <button type="button" className="btn btn-ghost mt-2 w-full" onClick={onSave} disabled={building}>
            Save PDF
          </button>
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Share the tool</h3>
          <p className="mt-1 text-xs/5" style={{ color: 'var(--text-muted)' }}>
            Social networks accept a link, never a file, so these share{' '}
            <span style={{ color: 'var(--text)' }}>{siteUrl().replace(/^https?:\/\//, '')}</span>{' '}
            rather than your deck.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SOCIAL_TARGETS.map((t) => (
              <a
                key={t.id}
                href={t.href(siteUrl(), shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost px-2 py-2 text-xs"
              >
                {t.label}
              </a>
            ))}
            <button
              type="button"
              className="btn btn-ghost px-2 py-2 text-xs"
              onClick={async () => setNote((await copyToClipboard(siteUrl())) ? 'Link copied.' : 'Could not copy.')}
            >
              Copy link
            </button>
          </div>
          {canShareLink() && (
            <button
              type="button"
              className="btn btn-ghost mt-2 w-full text-xs"
              onClick={() => shareLink()}
            >
              More sharing options…
            </button>
          )}
        </section>

        <section className="mt-6">
          <h3 className="text-sm font-semibold">Decklist</h3>
          <button
            type="button"
            className="btn btn-ghost mt-2 w-full text-xs"
            onClick={async () =>
              setNote((await copyToClipboard(decklist)) ? 'Decklist copied.' : 'Could not copy.')
            }
          >
            Copy decklist as text
          </button>
        </section>

        {note && (
          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }} role="status">
            {note}
          </p>
        )}

        <p
          className="mt-5 rounded-lg p-3 text-xs/5"
          style={{ background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
        >
          The PDF goes straight from this device to whichever app you pick. It is never uploaded
          to this site or anywhere else.
        </p>

        <button type="button" className="btn btn-primary mt-5 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  )
}
