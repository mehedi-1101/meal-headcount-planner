const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

async function request(path, options = {}) {
  const { method = 'GET', body } = options

  const token = localStorage.getItem('token')
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || data.detail || `Request failed: ${res.status}`)
    err.status = res.status
    
    // Global 401 handler - redirect to login and clear auth state
    if (res.status === 401) {
      const { default: useAuthStore } = await import('../stores/authStore')
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    
    throw err
  }

  return res.json()
}

export const get  = (path)        => request(path)
export const post = (path, body)  => request(path, { method: 'POST', body })
export const put  = (path, body)  => request(path, { method: 'PUT',  body })
export const del  = (path)        => request(path, { method: 'DELETE' })
