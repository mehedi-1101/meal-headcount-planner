import { get, post } from './client'

export const getMe    = ()                     => get('/auth/me')
export const login    = (username, password)   => post('/auth/login', { username, password })
export const logout   = ()                     => post('/auth/logout')
