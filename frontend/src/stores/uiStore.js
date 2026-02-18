import { create } from 'zustand'

const today = () => new Date().toISOString().split('T')[0]

const useUIStore = create((set) => ({
  selectedDate: today(),

  setSelectedDate: (date) => set({ selectedDate: date }),

  toasts: [],

  addToast: (message, type = 'info') => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      3500
    )
  },
}))

export default useUIStore
