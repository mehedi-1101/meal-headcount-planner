import { create } from 'zustand'
import * as authApi from '../api/auth'
import useUIStore from './uiStore'

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
    const { user, token } = await authApi.login(username, password)
    localStorage.setItem('token', token)
    set({ user, loading: false })
  },

  logout: async () => {
    await authApi.logout()
    localStorage.removeItem('token')
    // Reset any UI selections (like date) for the next user
    useUIStore.getState().setSelectedDate(null)
    set({ user: null })
  },
}))

export default useAuthStore
