import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MAX_EMAIL,
  MAX_MESSAGE,
  MAX_NAME,
  feedbackConfigured,
  submitFeedback,
  validate,
} from '../../lib/feedback/submitFeedback'
import { checkRate, recordSend } from '../../lib/feedback/rateLimit'

type Status = 'idle' | 'sending' | 'error'

export function FeedbackForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>()
  const mountedAt = useRef(Date.now())

  // Read at interaction time, never during render: this page is prerendered to static HTML,
  // where localStorage does not exist.
  const [blockedFor, setBlockedFor] = useState(0)
  useEffect(() => {
    if (blockedFor <= 0) return
    const id = setInterval(() => setBlockedFor((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [blockedFor])

  if (!feedbackConfigured()) {
    return (
      <p className="text-sm/7" style={{ color: 'var(--text-muted)' }}>
        The feedback form is not configured yet. Set <code className="font-mono text-xs">
        VITE_FEEDBACK_ENDPOINT</code> to enable it.
      </p>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)

    const errors = validate({ name, email, message })
    if (Object.keys(errors).length) {
      setStatus('error')
      setError(Object.values(errors)[0])
      return
    }

    const rate = checkRate()
    if (!rate.allowed) {
      setStatus('error')
      setBlockedFor(rate.retryInSec)
      setError(
        rate.reason === 'cooldown'
          ? 'Just a moment between messages, please.'
          : 'That is a few messages in a short time. Please come back a bit later.',
      )
      return
    }

    setStatus('sending')
    const result = await submitFeedback({
      name,
      email,
      message,
      honeypot,
      elapsedMs: Date.now() - mountedAt.current,
    })

    if (result.ok) {
      if (!('discarded' in result)) recordSend()
      // Bot-discarded submissions land here too, so an automated submitter sees exactly what
      // a person sees and learns nothing from the difference.
      navigate('/feedback/thanks')
    } else {
      setStatus('error')
      setError(result.error)
    }
  }

  const remaining = MAX_MESSAGE - message.length
  const busy = status === 'sending'
  const blocked = blockedFor > 0

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-xl">
      {/*
        Honeypot. Hidden from people, visible to naive bots that fill in every field they find.
        Kept out of the tab order and announced to nobody.
      */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <Field label="Name" hint="optional">
        <input
          className="field"
          value={name}
          maxLength={MAX_NAME}
          autoComplete="name"
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
      </Field>

      <Field label="Email" hint="optional, only so I can reply">
        <input
          className="field"
          type="email"
          value={email}
          maxLength={MAX_EMAIL}
          autoComplete="email"
          inputMode="email"
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
      </Field>

      <Field label="Message" hint={`${remaining} characters left`}>
        <textarea
          className="field h-44 resize-y"
          value={message}
          maxLength={MAX_MESSAGE}
          required
          onChange={(e) => setMessage(e.target.value)}
          disabled={busy}
        />
      </Field>

      {error && (
        <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }} role="alert">
          {error}
          {blocked && ` Try again in ${blockedFor}s.`}
        </p>
      )}

      <button type="submit" className="btn btn-primary mt-5 w-full sm:w-auto sm:px-10" disabled={busy || blocked}>
        {busy ? 'Sending…' : 'Send feedback'}
      </button>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  )
}
