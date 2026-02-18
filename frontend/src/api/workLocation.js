import { get, post } from './client'

export const getLocation = (date, userId) =>
  get(`/work-location?date=${date}${userId ? `&userId=${userId}` : ''}`)

export const setLocation = (date, location) =>
  post('/work-location', { date, location })

export const overrideLocation = (targetUserId, date, location) =>
  post('/work-location/override', { targetUserId, date, location })
