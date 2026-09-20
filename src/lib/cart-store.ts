// Cart store using Zustand with localStorage persistence + server sync
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      guestId: null,
      isOpen: false,

      setOpen: (open) => set({ isOpen: open }),

      initGuestId: () => {
        let gid = get().guestId
        if (!gid) {
          gid = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
          set({ guestId: gid })
        }
        return gid
      },

      addItem: ({ productId, variantId, quantity = 1, name, price, image, sku, variantName, slug }) => {
        const items = [...get().items]
        const idx = items.findIndex(it => it.productId === productId && it.variantId === variantId)
        if (idx >= 0) {
          items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity }
        } else {
          items.push({ productId, variantId, quantity, name, price, image, sku, variantName, slug })
        }
        set({ items, isOpen: true })
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        const items = get().items.map(it =>
          it.productId === productId && it.variantId === variantId
            ? { ...it, quantity }
            : it
        )
        set({ items })
      },

      removeItem: (productId, variantId) => {
        set({ items: get().items.filter(it => !(it.productId === productId && it.variantId === variantId)) })
      },

      clear: () => set({ items: [] }),

      count: () => get().items.reduce((n, it) => n + it.quantity, 0),

      subtotal: () => get().items.reduce((sum, it) => sum + it.price * it.quantity, 0)
    }),
    {
      name: 'shopflar-cart',
      partialize: (s) => ({ items: s.items, guestId: s.guestId })
    }
  )
)
