import { get } from './client'

export const getTeams         = ()     => get('/team')
export const getParticipation = (date) => get(`/team/participation?date=${date}`)
