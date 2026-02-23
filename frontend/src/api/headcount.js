import { get } from './client'

export const getHeadcount = (date) => get(`/headcount?date=${date}`)

export const getForecast = (startDate, endDate) =>
  get(`/headcount/forecast?startDate=${startDate}&endDate=${endDate}`)
