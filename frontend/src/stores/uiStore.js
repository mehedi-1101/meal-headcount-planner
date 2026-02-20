import { create } from 'zustand'

const useUIStore = create((set) => ({
  selectedDate: null, // null means "today"

  setSelectedDate: (date) => set({ selectedDate: date }),
  
  getSelectedDate: () => {
    const state = useUIStore.getState()
    if (state.selectedDate) return state.selectedDate
    
    // Return today's date in local time instead of UTC to avoid offset issues
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - tzOffset).toISOString().split('T')[0]
  },

  toasts: [],

  addToast: (message, type = 'info') => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    const duration = type === 'error' ? 5000 : 3500
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      duration
    )
  },
}))

export default useUIStore
