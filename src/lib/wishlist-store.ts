import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWishlist = create(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        if (get().ids.includes(id)) {
          set({ ids: get().ids.filter(x => x !== id) })
        } else {
          set({ ids: [...get().ids, id] })
        }
      },
      has: (id) => get().ids.includes(id),
      count: () => get().ids.length
    }),
    { name: 'shopflar-wishlist' }
  )
)
