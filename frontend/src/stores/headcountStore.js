import { create } from 'zustand'
import * as headcountApi from '../api/headcount'

const useHeadcountStore = create((set) => ({
  report: null,
  loading: false,
  error: null,

  fetchHeadcount: async (date) => {
    set({ loading: true, error: null })
    try {
      const report = await headcountApi.getHeadcount(date)
      set({ report, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  clear: () => set({ report: null, error: null }),
}))

export default useHeadcountStore
