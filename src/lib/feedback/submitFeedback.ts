/**
 * Posts the feedback form to a hosted form backend.
 *
 * The site is static, so there is no server of our own to receive this. Both Formspree and
 * Web3Forms accept a JSON POST and answer with JSON, so either can be configured without a
 * code change:
 *
 *   Formspree    VITE_FEEDBACK_ENDPOINT=https://formspree.io/f/xxxxxxxx
 *   Web3Forms    VITE_FEEDBACK_ENDPOINT=https://api.web3forms.com/submit
 *                VITE_FEEDBACK_ACCESS_KEY=<your key>
 *
 * The endpoint and access key are public by design; they identify a destination inbox, they do
 * not authorise anything, so shipping them in the bundle is expected.
 */
const ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined
const ACCESS_KEY = import.meta.env.VITE_FEEDBACK_ACCESS_KEY as string | undefined

export const MAX_NAME = 80
export const MAX_EMAIL = 120
export const MAX_MESSAGE = 2000
/**
 * Nobody loads this page, writes a message and submits it inside this window, so anything
 * faster is automated. Kept deliberately short: the cost of guessing wrong is a real message
 * silently going nowhere, so the honeypot and the provider's own spam filtering do the heavy
 * lifting and this only catches instant submissions.
 */
export const MIN_FILL_MS = 2500

export interface FeedbackInput {
  name: string
  email: string
  message: string
  /** Hidden field. Anything here means a bot filled it in. */
  honeypot: string
  /** Milliseconds the form was on screen before submitting. */
  elapsedMs: number
}

export type FeedbackResult =
  | { ok: true }
  /** Silently accepted but not sent: a bot signal. Telling it apart helps nobody but the bot. */
  | { ok: true; discarded: true }
  | { ok: false; error: string }

export function feedbackConfigured(): boolean {
  return Boolean(ENDPOINT)
}

export function validate({ name, email, message }: Omit<FeedbackInput, 'honeypot' | 'elapsedMs'>) {
  const errors: Partial<Record<'name' | 'email' | 'message', string>> = {}
  if (!message.trim()) errors.message = 'Please write a message.'
  else if (message.length > MAX_MESSAGE) errors.message = `Please keep it under ${MAX_MESSAGE} characters.`
  if (name.length > MAX_NAME) errors.name = `Please keep it under ${MAX_NAME} characters.`
  if (email) {
    if (email.length > MAX_EMAIL) errors.email = `Please keep it under ${MAX_EMAIL} characters.`
    // Deliberately loose: the only real test of an address is sending to it.
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'That does not look like an email address.'
  }
  return errors
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  if (!ENDPOINT) return { ok: false, error: 'Feedback is not configured on this site yet.' }

  // Bot signals. Both answer "sent" so an automated submitter learns nothing from the result.
  if (input.honeypot.trim()) return { ok: true, discarded: true }
  if (input.elapsedMs < MIN_FILL_MS) return { ok: true, discarded: true }

  const errors = validate(input)
  if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0]! }

  // Sent as FormData, not JSON, and deliberately so.
  //
  // A JSON body forces `Content-Type: application/json`, which is not CORS-safelisted and so
  // triggers an OPTIONS preflight. Web3Forms does not answer that preflight, and the browser
  // blocks the request outright. FormData produces a safelisted content type, making this a
  // simple request with no preflight. `Accept` is safelisted too, so it is safe to set.
  const form = new FormData()
  form.append('name', input.name.slice(0, MAX_NAME) || 'anonymous')
  form.append('email', input.email.slice(0, MAX_EMAIL) || 'not provided')
  form.append('message', input.message.slice(0, MAX_MESSAGE))
  form.append('subject', 'MTG Print Proxy feedback')
  form.append('from_name', 'MTG Print Proxy')
  // Both services read a filled honeypot as spam; send them empty so their checks agree.
  form.append('botcheck', '')
  form.append('_gotcha', '')
  if (ACCESS_KEY) form.append('access_key', ACCESS_KEY)

  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    })
  } catch {
    return { ok: false, error: 'Could not reach the feedback service. Check your connection.' }
  }

  const payload = (await res.json().catch(() => null)) as
    | { ok?: boolean; success?: boolean; message?: string; errors?: { message?: string }[] }
    | null

  // Formspree answers {ok:true}; Web3Forms answers {success:true}.
  if (res.ok && (payload?.ok !== false || payload?.success !== false)) return { ok: true }

  if (res.status === 429) {
    return { ok: false, error: 'That is a lot of feedback at once. Please try again later.' }
  }
  return {
    ok: false,
    error: payload?.errors?.[0]?.message ?? payload?.message ?? 'Something went wrong sending that.',
  }
}
