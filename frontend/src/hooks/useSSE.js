import { useEffect, useRef } from 'react'
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
  const retryTimer = useRef(null)
  const retryCount = useRef(0)
  const sourceRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return

      const source = new EventSource('/api/events/stream', { withCredentials: true })
      sourceRef.current = source

      source.addEventListener('headcount-update', (e) => {
        if (!canViewHeadcount()) return
        const { date } = JSON.parse(e.data)
        const selectedDate = useUIStore.getState().getSelectedDate()
        if (date === selectedDate) {
          fetchHeadcount(date)
        }
      })

      source.addEventListener('special-day-change', () => {
        if (!canViewHeadcount()) return
        fetchHeadcount(useUIStore.getState().getSelectedDate())
      })

      source.addEventListener('connected', () => {
        retryCount.current = 0
        console.log('✓ Live updates connected')
      })

      source.onerror = () => {
        source.close()
        sourceRef.current = null

        if (cancelled) return

        retryCount.current += 1

        if (retryCount.current >= 3) {
          retryCount.current = 0
          useAuthStore.getState().checkSession()
          return
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 10000)
        retryTimer.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(retryTimer.current)
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [fetchHeadcount])
}
