import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],
  push: ({ title, description, variant = 'default' }) => {
    const id = Math.random().toString(36).slice(2)
    set({ toasts: [...get().toasts, { id, title, description, variant }] })
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) })
    }, 4000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) })
}))

function get() {
  return useToastStore.getState()
}

export const toast = {
  success: (title, description) => get().push({ title, description, variant: 'success' }),
  error: (title, description) => get().push({ title, description, variant: 'error' }),
  info: (title, description) => get().push({ title, description, variant: 'default' })
}
