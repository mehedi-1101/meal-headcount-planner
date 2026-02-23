import { create } from 'zustand'
import { getAuditEntries } from '../api/audit'

const useAuditStore = create((set, get) => ({
  // Keyed by "userId_date"
  cache: {},
  loading: {},

  fetchEntries: async (userId, date) => {
    const key = `${userId}_${date}`
    if (get().cache[key] !== undefined) return
    set((s) => ({ loading: { ...s.loading, [key]: true } }))
    try {
      const data = await getAuditEntries(userId, date)
      set((s) => ({
        cache: { ...s.cache, [key]: data.entries },
        loading: { ...s.loading, [key]: false },
      }))
    } catch {
      // Audit is supplementary — fail silently
      set((s) => ({
        cache: { ...s.cache, [key]: [] },
        loading: { ...s.loading, [key]: false },
      }))
    }
  },

  getEntries: (userId, date) => get().cache[`${userId}_${date}`] ?? null,

  isLoading: (userId, date) => get().loading[`${userId}_${date}`] ?? false,

  clearCache: () => set({ cache: {}, loading: {} }),
}))

export default useAuditStore
