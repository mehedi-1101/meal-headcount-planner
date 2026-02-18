const BASE = '/api'

async function request(path, options = {}) {
  const { method = 'GET', body } = options

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || `Request failed: ${res.status}`)
    err.status = res.status
    throw err
  }

  return res.json()
}

export const get  = (path)        => request(path)
export const post = (path, body)  => request(path, { method: 'POST', body })
export const put  = (path, body)  => request(path, { method: 'PUT',  body })
export const del  = (path)        => request(path, { method: 'DELETE' })
