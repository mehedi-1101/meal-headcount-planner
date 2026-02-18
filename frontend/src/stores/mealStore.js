import { create } from 'zustand'
import * as mealsApi from '../api/meals'

const useMealStore = create((set) => ({
  meals: [],
  date: null,
  loading: false,
  error: null,

  fetchMeals: async (date) => {
    set({ loading: true, error: null })
    try {
      const data = await mealsApi.getMeals(date)
      set({ meals: data.meals, date, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  clear: () => set({ meals: [], date: null, error: null }),
}))

export default useMealStore
