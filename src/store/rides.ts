import { del, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { Ride } from '@/features/rides/rideStats'

interface RidesState {
  rides: Ride[]
  addRides: (rides: Ride[]) => void
  removeRide: (id: string) => void
  clearRides: () => void
}

const hasIndexedDb = () => typeof indexedDB !== 'undefined'

/**
 * Stockage IndexedDB : un historique Garmin complet (des centaines de sorties) dépasse
 * vite les ~5 Mo de localStorage. Lecture de secours dans localStorage, où les versions
 * précédentes de l'appli rangeaient les sorties : elles migrent à la première écriture.
 * Aucune erreur de stockage n'interrompt l'appli.
 */
const rideStorage: StateStorage = {
  getItem: async (key) => {
    try {
      if (hasIndexedDb()) {
        const value = await get<string>(key)
        if (value != null) return value
      }
    } catch {
      // IndexedDB bloqué (navigation privée…) : on tente localStorage
    }
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: async (key, value) => {
    try {
      if (hasIndexedDb()) {
        await set(key, value)
        try {
          localStorage.removeItem(key)
        } catch {
          // rien à nettoyer
        }
        return
      }
    } catch (error) {
      console.warn('IndexedDB indisponible, repli sur localStorage', error)
    }
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('Sorties non sauvegardées (stockage plein ou indisponible)', error)
    }
  },
  removeItem: async (key) => {
    try {
      if (hasIndexedDb()) await del(key)
      localStorage.removeItem(key)
    } catch {
      // rien à faire
    }
  },
}

/**
 * Sorties importées (GPX, FIT, archives Garmin). Ce sont des données de l'utilisateur,
 * créées dans le navigateur (pas d'API) : elles vivent dans ce store, persisté localement,
 * avec une trace allégée (500 points max par sortie).
 */
export const useRides = create<RidesState>()(
  persist(
    (set) => ({
      rides: [],
      addRides: (rides) => set((state) => ({ rides: [...state.rides, ...rides] })),
      removeRide: (id) => set((state) => ({ rides: state.rides.filter((r) => r.id !== id) })),
      clearRides: () => set({ rides: [] }),
    }),
    {
      name: 'cyclingstats-rides',
      version: 1,
      storage: createJSONStorage(() => rideStorage),
      partialize: ({ rides }) => ({ rides }),
    },
  ),
)

/**
 * Le stockage IndexedDB est asynchrone : au premier rendu les sorties ne sont pas encore
 * relues. Les pages attendent ce signal avant d'afficher « aucune sortie » ou « introuvable ».
 */
export function useRidesHydrated() {
  return useSyncExternalStore(
    (onChange) => useRides.persist.onFinishHydration(onChange),
    () => useRides.persist.hasHydrated(),
  )
}
