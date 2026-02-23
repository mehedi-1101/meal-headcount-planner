import { get } from './client'

export const getAuditEntries = (userId, date) => {
  const dateParam = date ? `&date=${date}` : ''
  return get(`/audit?userId=${userId}${dateParam}`)
}
