/**
 * Two overlapping cards, matching the favicon.
 *
 * The favicon carries a dark rounded backing square so it reads against a browser tab; here it
 * is dropped, because that square would disappear into the dark nav bar.
 */
export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect x="6" y="5" width="14" height="19.5" rx="2.5" fill="#ffffff" />
      <rect
        x="12"
        y="8.5"
        width="14"
        height="19.5"
        rx="2.5"
        fill="#e8823c"
        stroke="#1c1917"
        strokeWidth="1.5"
      />
    </svg>
  )
}
