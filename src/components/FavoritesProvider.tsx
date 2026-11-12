import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

type FavoritesContextType = {
  favorites: Set<string>
  toggle: (id: string) => void
  isFavorite: (id: string) => boolean
  clear: () => void
  count: number
  exportFavorites: () => Promise<string>
  importFavorites: (json: string) => number
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggle: () => {},
  isFavorite: () => false,
  clear: () => {},
  count: 0,
  exportFavorites: async () => '[]',
  importFavorites: () => 0,
})

export function useFavorites() {
  return useContext(FavoritesContext)
}

const STORAGE_KEY = 'lax-favorites'

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  const clear = useCallback(() => setFavorites(new Set()), [])

  const exportFavorites = useCallback(async () => {
    const json = JSON.stringify([...favorites])
    await navigator.clipboard.writeText(json)
    return json
  }, [favorites])

  const importFavorites = useCallback((json: string) => {
    try {
      const ids = JSON.parse(json)
      if (!Array.isArray(ids)) return 0
      const valid = ids.filter((id): id is string => typeof id === 'string')
      setFavorites(new Set(valid))
      return valid.length
    } catch {
      return 0
    }
  }, [])

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggle,
        isFavorite,
        clear,
        count: favorites.size,
        exportFavorites,
        importFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}
