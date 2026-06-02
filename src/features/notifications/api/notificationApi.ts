import { api, refreshTokens } from '../../../shared/api/httpClient'

const DEFAULT_NOTIFICATIONS_URL = ''
const rawBaseUrl = import.meta.env.VITE_NOTIFICATIONS_URL ?? DEFAULT_NOTIFICATIONS_URL
const NOTIFICATIONS_BASE_URL = rawBaseUrl.replace(/\/$/, '')
const STREAM_RECONNECT_DELAY_MS = 1500
const STREAM_TEMPORARY_RECONNECT_DELAY_MS = 30_000
const STREAM_MAX_RECONNECT_DELAY_MS = 60_000
const CONFIRM_RETRY_DELAYS_MS = [300, 1000]
const AUTH_FAILURE_STATUSES = new Set([401, 403])
const TEMPORARY_GATEWAY_STATUSES = new Set([502, 503, 504])

export type NotificationMessage = {
  id: string
  text: string
  user_id: string
}

export type NotificationsStream = {
  close: () => void
}

type RawNotificationMessage = Partial<NotificationMessage> & {
  body?: string
  content?: string
  message?: string
  message_id?: string
  notification_id?: string
  userId?: string
  uuid?: string
}

/** Builds notification URLs for both direct notification service and proxied setups. */
function getNotificationsUrl(path: string): string {
  if (NOTIFICATIONS_BASE_URL.endsWith('/notifications')) {
    return `${NOTIFICATIONS_BASE_URL}${path}`
  }

  return `${NOTIFICATIONS_BASE_URL}/notifications${path}`
}

/** Reads the current bearer token for fetch-based notification calls. */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function hasAccessToken(): boolean {
  return Boolean(localStorage.getItem('access_token'))
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeNotificationMessage(value: unknown): NotificationMessage | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as RawNotificationMessage
  const id = getStringValue(raw.id)
    ?? getStringValue(raw.message_id)
    ?? getStringValue(raw.notification_id)
    ?? getStringValue(raw.uuid)
  const text = getStringValue(raw.text)
    ?? getStringValue(raw.message)
    ?? getStringValue(raw.content)
    ?? getStringValue(raw.body)
  const userId = getStringValue(raw.user_id) ?? getStringValue(raw.userId) ?? ''

  if (!id || !text) return null

  return {
    id,
    text,
    user_id: userId,
  }
}

function parseNotificationPayload(payload: string): NotificationMessage | null {
  const trimmed = payload.trim()
  if (!trimmed || trimmed === '[DONE]') return null

  try {
    return normalizeNotificationMessage(JSON.parse(trimmed))
  } catch {
    return null
  }
}

function parseNotificationFrame(frame: string): NotificationMessage[] {
  const lines = frame.split('\n').map(line => line.trimEnd())
  const dataLines = lines
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())

  if (dataLines.length > 0) {
    const message = parseNotificationPayload(dataLines.join('\n'))
    return message ? [message] : []
  }

  const trimmed = frame.trim()
  if (
    !trimmed
    || trimmed.startsWith(':')
    || trimmed.startsWith('event:')
    || trimmed.startsWith('id:')
    || trimmed.startsWith('retry:')
  ) {
    return []
  }

  const message = parseNotificationPayload(trimmed)
  return message ? [message] : []
}

function parseNotificationBuffer(buffer: string): { messages: NotificationMessage[]; rest: string } {
  const messages: NotificationMessage[] = []
  let rest = buffer.replace(/\r\n/g, '\n')

  if (rest.includes('\n\n')) {
    const frames = rest.split(/\n\n+/)
    rest = frames.pop() ?? ''

    for (const frame of frames) {
      messages.push(...parseNotificationFrame(frame))
    }

    return { messages, rest }
  }

  const lines = rest.split('\n')
  rest = lines.pop() ?? ''

  for (const line of lines) {
    messages.push(...parseNotificationFrame(line))
  }

  return { messages, rest }
}

async function refreshNotificationToken(): Promise<boolean> {
  if (!localStorage.getItem('refresh_token')) {
    return false
  }

  try {
    const tokens = await refreshTokens()
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    return true
  } catch {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    return false
  }
}

/** Abort-aware timeout used by stream reconnects and confirmation retries. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timeout = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      resolve()
    }, { once: true })
  })
}

function getStreamReconnectDelay(failureCount: number, status?: number): number {
  const baseDelay = status && TEMPORARY_GATEWAY_STATUSES.has(status)
    ? STREAM_TEMPORARY_RECONNECT_DELAY_MS
    : STREAM_RECONNECT_DELAY_MS
  const multiplier = 2 ** Math.max(failureCount - 1, 0)

  return Math.min(baseDelay * multiplier, STREAM_MAX_RECONNECT_DELAY_MS)
}

/** Opens a reconnecting SSE-like stream for user notifications. */
export function createNotificationsStream(
  userId: string,
  onMessage: (message: NotificationMessage) => void,
  onError: () => void,
): NotificationsStream {
  const controller = new AbortController()
  let hasRetriedAuth = false
  let failureCount = 0

  async function connect() {
    while (!controller.signal.aborted) {
      try {
        if (!hasAccessToken()) {
          onError()
          return
        }

        const response = await fetch(getNotificationsUrl(`/${userId}`), {
          headers: getAuthHeaders(),
          signal: controller.signal,
        })

        if (response.status === 401 && !hasRetriedAuth) {
          hasRetriedAuth = true
          if (await refreshNotificationToken()) {
            continue
          }
        }

        if (AUTH_FAILURE_STATUSES.has(response.status)) {
          onError()
          return
        }

        if (!response.ok || !response.body) {
          failureCount += 1
          onError()
          await delay(getStreamReconnectDelay(failureCount, response.status), controller.signal)
          continue
        }

        hasRetriedAuth = false
        failureCount = 0
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          try {
            const parsed = parseNotificationBuffer(buffer)
            buffer = parsed.rest
            parsed.messages.forEach(onMessage)
          } catch {
            buffer = ''
            onError()
          }
        }

        const remaining = buffer + decoder.decode()
        if (remaining.trim()) {
          try {
            parseNotificationFrame(remaining).forEach(onMessage)
          } catch {
            onError()
          }
        }

        if (!controller.signal.aborted) {
          failureCount += 1
          onError()
          await delay(getStreamReconnectDelay(failureCount), controller.signal)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          failureCount += 1
          onError()
          await delay(getStreamReconnectDelay(failureCount), controller.signal)
        }
      }
    }
  }

  void connect()

  return {
    close: () => controller.abort(),
  }
}

/** Confirms a notification and retries temporary gateway failures. */
export async function confirmNotification(userId: string, messageId: string): Promise<void> {
  if (NOTIFICATIONS_BASE_URL.startsWith('/api/v1')) {
    await api.post(`/notifications/confirm/${userId}/${messageId}`)
    return
  }

  const delays = [0, ...CONFIRM_RETRY_DELAYS_MS]
  let lastResponse: Response | null = null
  let hasRetriedAuth = false

  for (const retryDelay of delays) {
    if (retryDelay > 0) await delay(retryDelay)

    const response = await fetch(getNotificationsUrl(`/confirm/${userId}/${messageId}`), {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    if (response.ok) return

    if (response.status === 401 && !hasRetriedAuth) {
      hasRetriedAuth = true
      if (await refreshNotificationToken()) {
        continue
      }
    }

    lastResponse = response
    if (AUTH_FAILURE_STATUSES.has(response.status)) break
    if (response.status !== 503 && response.status !== 502 && response.status !== 504) break
  }

  throw new Error(`Failed to confirm notification${lastResponse ? `: ${lastResponse.status}` : ''}`)
}
