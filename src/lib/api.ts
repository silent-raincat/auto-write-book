import { TEST_USER_ID } from './utils'

const API_URL = '/api'

interface RequestOptions extends RequestInit {
  token?: string
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...init } = options
  
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (!headers.has('x-user-id')) {
    headers.set('x-user-id', TEST_USER_ID)
  }
  if (!headers.has('x-modelscope-api-key') && typeof window !== 'undefined') {
    const modelscopeKey = window.localStorage.getItem('modelscope_api_key')
    if (modelscopeKey && modelscopeKey.trim()) {
      headers.set('x-modelscope-api-key', modelscopeKey.trim())
    }
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...init,
    headers,
  })

  const rawText = await response.text()
  let data: unknown = null
  if (rawText) {
    try {
      data = JSON.parse(rawText) as unknown
    } catch {
      data = rawText
    }
  }

  if (!response.ok) {
    let msgFromBody: string | undefined
    if (data && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      const candidate = obj.error ?? obj.message
      if (typeof candidate === 'string' && candidate.trim()) {
        msgFromBody = candidate
      }
    }

    const msg = msgFromBody || `${response.status} ${response.statusText}` || 'API request failed'
    throw new Error(msg)
  }

  if (data && typeof data === 'object') {
    return ((data as { data?: unknown }).data ?? data) as T
  }
  return data as T
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: unknown, options?: RequestOptions) => request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown, options?: RequestOptions) => request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'DELETE' }),
}
