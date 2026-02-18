import { get } from './client'

export const getHeadcount = (date) => get(`/headcount?date=${date}`)
