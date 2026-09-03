/**
 * Sharing a locally generated PDF.
 *
 * The file only ever exists in this browser: nothing is uploaded, so there is no URL that
 * points at it. That decides what is and is not possible here.
 *
 *  - The device's own share sheet CAN take the file itself (Web Share Level 2), which is how
 *    Messages, Mail, AirDrop, WhatsApp and the like receive it.
 *  - Social networks CANNOT. Their web intents accept a link and some text, never an upload.
 *    Offering "post to X" for the PDF would quietly share a link and drop the file, so those
 *    buttons are labelled as sharing the tool, which is what they actually do.
 */
const SHARE_TEXT = 'Print your Magic decks at true card size with MTG Print Proxy.'

export function siteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '')
  if (configured) return configured
  // There is no origin while prerendering, and share links are only ever followed in a browser
  // anyway, so an empty base is correct rather than merely safe.
  return typeof window === 'undefined' ? '' : window.location.origin
}

export function toPdfFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: 'application/pdf' })
}

/** Whether this browser can hand the actual file to the OS share sheet. */
export function canShareFile(file: File): boolean {
  return Boolean(navigator.canShare?.({ files: [file] }))
}

/** Whether this browser can share a link, even if it cannot share files. */
export function canShareLink(): boolean {
  return typeof navigator.share === 'function'
}

export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'failed'

/**
 * Opens the OS share sheet with the PDF attached.
 *
 * Must be called straight from a click. Browsers require a user gesture, and awaiting the PDF
 * build first consumes it, which is why the file is generated before this is offered.
 */
export async function sharePdf(file: File, title: string): Promise<ShareOutcome> {
  if (!canShareFile(file)) return 'unsupported'
  try {
    await navigator.share({ files: [file], title, text: SHARE_TEXT })
    return 'shared'
  } catch (err) {
    // Dismissing the sheet rejects with AbortError; that is not a failure worth reporting.
    return (err as Error)?.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export async function shareLink(): Promise<ShareOutcome> {
  if (!canShareLink()) return 'unsupported'
  try {
    await navigator.share({ title: 'MTG Print Proxy', text: SHARE_TEXT, url: siteUrl() })
    return 'shared'
  } catch (err) {
    return (err as Error)?.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export interface SocialTarget {
  id: string
  label: string
  href: (url: string, text: string) => string
}

/** Web intents. Every one of these takes a link and text; none accepts a file upload. */
export const SOCIAL_TARGETS: SocialTarget[] = [
  { id: 'x', label: 'X', href: (u, t) => `https://x.com/intent/post?text=${enc(t)}&url=${enc(u)}` },
  { id: 'facebook', label: 'Facebook', href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { id: 'reddit', label: 'Reddit', href: (u, t) => `https://www.reddit.com/submit?url=${enc(u)}&title=${enc(t)}` },
  { id: 'whatsapp', label: 'WhatsApp', href: (u, t) => `https://wa.me/?text=${enc(`${t} ${u}`)}` },
  { id: 'email', label: 'Email', href: (u, t) => `mailto:?subject=${enc('MTG Print Proxy')}&body=${enc(`${t}\n\n${u}`)}` },
]

export const shareText = SHARE_TEXT

function enc(value: string): string {
  return encodeURIComponent(value)
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
