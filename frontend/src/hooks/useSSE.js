import { useEffect } from 'react'
import useHeadcountStore from '../stores/headcountStore'
import useUIStore from '../stores/uiStore'
import useAuthStore from '../stores/authStore'

const HEADCOUNT_ROLES = ['ADMIN', 'LOGISTICS']

function canViewHeadcount() {
  const user = useAuthStore.getState().user
  return user != null && HEADCOUNT_ROLES.includes(user.role)
}

export function useSSE() {
  const fetchHeadcount = useHeadcountStore((s) => s.fetchHeadcount)

  useEffect(() => {
    const source = new EventSource('/api/events/stream', { withCredentials: true })

    source.addEventListener('headcount-update', (e) => {
      if (!canViewHeadcount()) return
      const { date } = JSON.parse(e.data)
      const selectedDate = useUIStore.getState().selectedDate
      if (date === selectedDate) {
        fetchHeadcount(date)
      }
    })

    source.addEventListener('special-day-change', () => {
      if (!canViewHeadcount()) return
      fetchHeadcount(useUIStore.getState().selectedDate)
    })

    return () => source.close()
  }, [fetchHeadcount])
}
