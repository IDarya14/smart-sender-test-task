import { http, HttpResponse } from 'msw'
import { isHttpUrl } from '../utils.ts'
import { CSRF_TOKEN, credentials, db, SESSION_MS } from './db.ts'

function jsonError(status: number, type: string, message: string, payload?: Record<string, string[]>) {
  return HttpResponse.json(
    {
      error: {
        type,
        message,
        ...(payload ? { payload } : {}),
      },
    },
    { status },
  )
}

function checkCsrf(request: Request) {
  if (request.headers.get('X-CSRF-TOKEN') !== CSRF_TOKEN) {
    return jsonError(419, 'TokenMismatchException', 'CSRF token mismatch.')
  }
  return null
}

function requireSession() {
  if (!db.session || db.session.expiresAt <= Date.now()) {
    return jsonError(401, 'AuthenticationException', 'Unauthenticated.')
  }
  return null
}

export const handlers = [
  http.get('/csrf', () => {
    return new HttpResponse(null, {
      status: 204,
      headers: { 'X-CSRF-TOKEN': CSRF_TOKEN },
    })
  }),

  http.post('/auth/login', async ({ request }) => {
    const csrf = checkCsrf(request)
    if (csrf) return csrf

    if (!request.headers.get('X-Captcha-Token')) {
      return jsonError(422, 'ValidationException', 'The given data was invalid.', {
        email: ['Captcha token is missing.'],
      })
    }

    const body = (await request.json()) as {
      email?: string
      password?: string
      fingerprint?: string
    }

    const email = (body.email ?? '').trim().toLowerCase()
    const password = body.password ?? ''

    if (!body.fingerprint || email !== credentials.email || password !== credentials.password) {
      return jsonError(422, 'ValidationException', 'The given data was invalid.', {
        password: ['These credentials do not match our records.'],
      })
    }

    db.deviceToken = crypto.randomUUID()
    db.session = null

    return HttpResponse.json({ device_session_token: db.deviceToken })
  }),

  http.post('/auth/token/issue', async ({ request }) => {
    const csrf = checkCsrf(request)
    if (csrf) return csrf

    const body = (await request.json()) as {
      device_session_token?: string
      fingerprint?: string
    }

    const tokenOk = body.device_session_token && body.device_session_token === db.deviceToken
    const fingerprintOk = !!body.fingerprint && /^[0-9a-f]{32}$/.test(body.fingerprint)
    if (!tokenOk || !fingerprintOk) {
      return jsonError(400, 'BadRequestException', 'Something went wrong.')
    }

    db.session = { expiresAt: Date.now() + SESSION_MS }
    return HttpResponse.json({})
  }),

  http.post('/auth/token/rotate', async ({ request }) => {
    const csrf = checkCsrf(request)
    if (csrf) return csrf

    db.rotateCount += 1

    const body = (await request.json()) as { fingerprint?: string }
    if (!db.session) {
      return jsonError(400, 'BadRequestException', 'No active session.')
    }
    if (!body.fingerprint) {
      return jsonError(400, 'BadRequestException', 'Fingerprint is required.')
    }

    db.session.expiresAt = Date.now() + SESSION_MS
    return HttpResponse.json({})
  }),

  http.post('/auth/token/revoke', async ({ request }) => {
    const csrf = checkCsrf(request)
    if (csrf) return csrf

    db.session = null
    db.deviceToken = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/v1/me', () => {
    const denied = requireSession()
    if (denied) return denied
    return HttpResponse.json(db.user)
  }),

  http.get('/v1/webhooks', ({ request }) => {
    const denied = requireSession()
    if (denied) return denied

    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const limit = Math.max(1, Number(url.searchParams.get('limit')) || 10)
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()

    const filtered = db.webhooks.filter((hook) => hook.name.toLowerCase().includes(search))
    const total = filtered.length
    const last = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit

    return HttpResponse.json({
      data: filtered.slice(start, start + limit),
      paging: {
        pages: { current: page, last },
        results: { total, limitation: limit },
      },
    })
  }),

  http.get('/v1/webhooks/:id', ({ params }) => {
    const denied = requireSession()
    if (denied) return denied

    const webhook = db.webhooks.find((item) => item.id === String(params.id))
    if (!webhook) return jsonError(404, 'NotFoundException', 'Webhook not found.')
    return HttpResponse.json(webhook)
  }),

  http.put('/v1/webhooks/:id', async ({ request, params }) => {
    const csrf = checkCsrf(request)
    if (csrf) return csrf

    const denied = requireSession()
    if (denied) return denied

    const webhook = db.webhooks.find((item) => item.id === String(params.id))
    if (!webhook) return jsonError(404, 'NotFoundException', 'Webhook not found.')

    const body = (await request.json()) as { name?: string; url?: string }
    const name = (body.name ?? '').trim()
    const url = (body.url ?? '').trim()
    const fields: Record<string, string[]> = {}

    if (!name) fields.name = ['The name field is required.']
    if (!isHttpUrl(url)) fields.url = ['The url must be a valid URL.']
    if (Object.keys(fields).length) {
      return jsonError(422, 'ValidationException', 'The given data was invalid.', fields)
    }

    webhook.name = name
    webhook.url = url
    return HttpResponse.json(webhook)
  }),
]
