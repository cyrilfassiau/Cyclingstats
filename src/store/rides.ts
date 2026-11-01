import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Ride } from '@/features/rides/rideStats'

interface RidesState {
  rides: Ride[]
  addRides: (rides: Ride[]) => void
  removeRide: (id: string) => void
}

// localStorage peut être plein ou bloqué (navigation privée) : on n'interrompt jamais l'appli.
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('Sorties non sauvegardées (stockage plein ou indisponible)', error)
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // rien à faire
    }
  },
}

/**
 * Sorties importées depuis des fichiers GPX. Ce sont des données de l'utilisateur, créées
 * dans le navigateur (pas d'API) : elles vivent dans ce store, persisté localement, avec une
 * trace allégée (500 points max par sortie) pour rester sous les quotas de localStorage.
 */
export const useRides = create<RidesState>()(
  persist(
    (set) => ({
      rides: [],
      addRides: (rides) => set((state) => ({ rides: [...state.rides, ...rides] })),
      removeRide: (id) => set((state) => ({ rides: state.rides.filter((r) => r.id !== id) })),
    }),
    {
      name: 'cyclingstats-rides',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: ({ rides }) => ({ rides }),
    },
  ),
)
