import { get, post, put, del } from './client'

export const getSpecialDays    = (month) => get(`/special-days${month ? `?month=${month}` : ''}`)
export const createSpecialDay  = (data)  => post('/special-days', data)
export const updateSpecialDay  = (date, data) => put(`/special-days/${date}`, data)
export const deleteSpecialDay  = (date)  => del(`/special-days/${date}`)
