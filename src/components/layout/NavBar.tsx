import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { INFO_PAGES } from './navigation'
import { useScrollLock } from '../../hooks/useScrollLock'
import { Logo } from '../ui/Logo'

export function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // The overlay covers the viewport, so the page behind it must not scroll.
  useScrollLock(open)

  return (
    <nav style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:py-6">
        <Brand />

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

        {/* Only one menu button exists at a time: while the overlay is open it owns the
            control, so nothing reports a stale aria-expanded="false" behind it. */}
        {!open && <MenuButton open={false} onClick={() => setOpen(true)} />}
      </div>

      {/*
        A full-screen overlay rather than an expanding panel: the page underneath keeps its
        scroll position and nothing is pushed around when the menu closes.
      */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-50 flex flex-col sm:hidden"
          style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
            <Brand onNavigate={() => setOpen(false)} />
            <MenuButton open onClick={() => setOpen(false)} />
          </div>

          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 pt-6">
            {INFO_PAGES.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `py-3 text-2xl tracking-tight ${isActive ? 'font-semibold' : 'font-normal opacity-80'}`
                }
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

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5">
      <Logo className="size-7 shrink-0 sm:size-8" />
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">MTG Print Proxy</span>
    </Link>
  )
}

function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="-mr-2 grid size-10 shrink-0 place-items-center rounded-md sm:hidden"
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="mobile-menu"
      onClick={onClick}
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
  )
}
