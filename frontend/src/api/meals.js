import { get, post } from './client'

export const getMeals = (date) =>
  get(`/meals?date=${date}`)

export const optOut = (mealType, date) =>
  post(`/meals/${mealType}/opt-out`, { date })

export const optIn = (mealType, date) =>
  post(`/meals/${mealType}/opt-in`, { date })

export const override = (targetUserId, mealType, status, date) =>
  post('/meals/override', { targetUserId, mealType, status, date })

export const bulkOverride = (userIds, mealTypes, status, startDate, endDate) =>
  post('/meals/bulk-override', { userIds, mealTypes, status, startDate, endDate })
