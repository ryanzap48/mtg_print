import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { INFO_PAGES } from './navigation'

export function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on navigation, on Escape, and on a click outside the panel.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onClick)
    }
  }, [open])

  return (
    <nav ref={panelRef} style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:py-6">
        <Link to="/" className="text-xl font-semibold tracking-tight sm:text-2xl">
          MTG Print Proxy
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 text-base sm:flex">
          {INFO_PAGES.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? 'opacity-100' : 'opacity-70 transition-opacity hover:opacity-100'
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="-mr-2 grid size-10 place-items-center rounded-md sm:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute left-0 block h-0.5 w-6 rounded-full transition-transform duration-200"
                style={{
                  background: 'var(--nav-text)',
                  top: i === 0 ? 0 : i === 1 ? '7px' : '14px',
                  transform: open
                    ? i === 0
                      ? 'translateY(7px) rotate(45deg)'
                      : i === 1
                        ? 'scaleX(0)'
                        : 'translateY(-7px) rotate(-45deg)'
                    : undefined,
                  opacity: open && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </span>
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="sm:hidden"
          style={{ borderTop: '1px solid rgb(255 255 255 / 0.15)' }}
        >
          <div className="mx-auto flex max-w-6xl flex-col px-4 pb-3">
            {INFO_PAGES.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `py-3 text-base ${isActive ? 'font-semibold opacity-100' : 'opacity-80'}`
                }
                style={{ borderBottom: '1px solid rgb(255 255 255 / 0.08)' }}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
