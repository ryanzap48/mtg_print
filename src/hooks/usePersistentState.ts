import { useCallback, useState } from 'react'

/**
 * `useState` that mirrors into localStorage. Reads and writes are guarded: private-mode and
 * storage-disabled browsers throw on access, and losing a saved preference must never break
 * the page.
 */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : (JSON.parse(raw) as T)
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
