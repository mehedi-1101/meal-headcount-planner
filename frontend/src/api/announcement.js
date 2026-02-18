import { get } from './client'

export const getAnnouncement = (date) => get(`/announcement?date=${date}`)
