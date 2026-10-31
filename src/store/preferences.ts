import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_COMPARED = 4

export type Theme = 'system' | 'light' | 'dark'

/** Le slot fixe la couleur du coureur : elle ne change pas quand un autre est retiré. */
export interface ComparedRider {
  id: string
  slot: number
}

interface PreferencesState {
  favorites: string[]
  compared: ComparedRider[]
  theme: Theme
  toggleFavorite: (riderId: string) => void
  toggleCompared: (riderId: string) => void
  clearCompared: () => void
  setTheme: (theme: Theme) => void
}

// État UI uniquement (l'état serveur reste dans TanStack Query), persisté dans localStorage.
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      favorites: [],
      compared: [],
      theme: 'system',

      toggleFavorite: (riderId) =>
        set((state) => ({
          favorites: state.favorites.includes(riderId)
            ? state.favorites.filter((id) => id !== riderId)
            : [...state.favorites, riderId],
        })),

      toggleCompared: (riderId) =>
        set((state) => {
          if (state.compared.some((c) => c.id === riderId)) {
            return { compared: state.compared.filter((c) => c.id !== riderId) }
          }
          if (state.compared.length >= MAX_COMPARED) return state
          const used = new Set(state.compared.map((c) => c.slot))
          const slot = [0, 1, 2, 3].find((s) => !used.has(s)) ?? 0
          return { compared: [...state.compared, { id: riderId, slot }] }
        }),

      clearCompared: () => set({ compared: [] }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'cyclingstats-preferences',
      version: 1,
      partialize: ({ favorites, compared, theme }) => ({ favorites, compared, theme }),
    },
  ),
)
