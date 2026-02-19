import { create } from 'zustand'
import * as authApi from '../api/auth'

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  checkSession: async () => {
    try {
      const user = await authApi.getMe()
      set({ user, loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (username, password) => {
    await authApi.login(username, password)
    const user = await authApi.getMe()
    set({ user, loading: false })
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null })
  },
}))

export default useAuthStore
