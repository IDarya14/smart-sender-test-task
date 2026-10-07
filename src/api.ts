import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { markLoggedOut } from './authState.ts'
import { clearDeviceSession, getDeviceSessionToken, getFingerprint } from './session.ts'
import type { User, Webhook, WebhookList } from './types.ts'

const api = axios.create({
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

const withoutInterceptors = axios.create({
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

type RequestConfig = InternalAxiosRequestConfig & {
  retried?: boolean
  csrfRetried?: boolean
}

let csrfToken: string | null = null
let csrfRequest: Promise<void> | null = null
let rotateRequest: Promise<unknown> | null = null

const noRotate = ['/auth/login', '/auth/token/issue', '/auth/token/rotate', '/auth/token/revoke']

async function loadCsrf() {
  if (csrfToken) return
  if (!csrfRequest) {
    csrfRequest = withoutInterceptors.get('/csrf').then((response) => {
      const token = response.headers['x-csrf-token']
      if (typeof token !== 'string' || !token) throw new Error('No CSRF token')
      csrfToken = token
    }).finally(() => {
      csrfRequest = null
    })
  }
  await csrfRequest
}

api.interceptors.request.use(async (config) => {
  await loadCsrf()
  if (config.method === 'post' || config.method === 'put') {
    config.headers.set('X-CSRF-TOKEN', csrfToken ?? '')
  }
  return config
})

function rotateOnce() {
  if (!rotateRequest) {
    rotateRequest = api
      .post('/auth/token/rotate', { fingerprint: getFingerprint() })
      .finally(() => {
        rotateRequest = null
      })
  }
  return rotateRequest
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RequestConfig | undefined
  const status = error.response?.status
  if (!config || !status) return Promise.reject(error)

  if (status === 419 && !config.csrfRetried) {
    config.csrfRetried = true
    csrfToken = null
    return api(config)
  }

  const url = config.url ?? ''
  const canRotate = !noRotate.some((path) => url.includes(path))

  if (status === 401 && canRotate && !config.retried) {
    config.retried = true
    try {
      await rotateOnce()
    } catch {
      endSession()
      return Promise.reject(error)
    }

    try {
      return await api(config)
    } catch (retryError) {
      if (axios.isAxiosError(retryError) && retryError.response?.status === 401) endSession()
      return Promise.reject(retryError)
    }
  }

  return Promise.reject(error)
})

export function endSession() {
  clearDeviceSession()
  csrfToken = null
  markLoggedOut()
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ device_session_token: string }>(
    '/auth/login',
    { email, password, fingerprint: getFingerprint() },
    { headers: { 'X-Captcha-Token': 'test' } },
  )
  return data
}

export function issueSession() {
  return api.post('/auth/token/issue', {
    device_session_token: getDeviceSessionToken(),
    fingerprint: getFingerprint(),
  })
}

export function revoke() {
  return api.post('/auth/token/revoke', { fingerprint: getFingerprint() })
}

export async function getMe() {
  const { data } = await api.get<User>('/v1/me')
  return data
}

export async function getWebhooks(page: number, search: string) {
  const { data } = await api.get<WebhookList>('/v1/webhooks', {
    params: { page, limit: 10, search },
  })
  return data
}

export async function getWebhook(id: string) {
  const { data } = await api.get<Webhook>(`/v1/webhooks/${id}`)
  return data
}

export async function updateWebhook(id: string, body: { name: string; url: string }) {
  const { data } = await api.put<Webhook>(`/v1/webhooks/${id}`, body)
  return data
}
