import { get } from './client'

export const getWfhOverage = (month) => {
  const monthParam = month ? `?month=${month}` : ''
  return get(`/reports/wfh-overage${monthParam}`)
}
