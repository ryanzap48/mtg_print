import { useCallback, useState } from 'react'

/**
 * `useState` mirrored into localStorage.
 *
 * Reads and writes are guarded: private-mode and storage-disabled browsers throw on access,
 * and losing a saved preference must never break the page. `revive` runs on whatever was
 * stored, which is how a value written by an older version of the app, missing keys that have
 * since been added, gets brought up to date instead of leaving `undefined` holes.
 */
export function usePersistentState<T>(key: string, fallback: T, revive?: (stored: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      const parsed = JSON.parse(raw) as unknown
      return revive ? revive(parsed) : (parsed as T)
    } catch {
      return fallback
    }
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Ignore: the in-memory value is still correct for this session.
      }
    },
    [key],
  )

  return [value, update] as const
}
