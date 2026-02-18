import { useEffect } from 'react'
import useHeadcountStore from '../stores/headcountStore'
import useUIStore from '../stores/uiStore'

export function useSSE() {
  const fetchHeadcount = useHeadcountStore((s) => s.fetchHeadcount)

  useEffect(() => {
    const source = new EventSource('/api/events/stream', { withCredentials: true })

    source.addEventListener('headcount-update', (e) => {
      const { date } = JSON.parse(e.data)
      const selectedDate = useUIStore.getState().selectedDate
      if (date === selectedDate) {
        fetchHeadcount(date)
      }
    })

    // special-day-change: consumers re-fetch on their own via SSE trigger
    source.addEventListener('special-day-change', () => {
      const selectedDate = useUIStore.getState().selectedDate
      fetchHeadcount(selectedDate)
    })

    return () => source.close()
  }, [fetchHeadcount])
}
