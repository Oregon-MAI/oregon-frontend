import { api } from '../../../shared/api/httpClient'

const DEFAULT_NOTIFICATIONS_URL = ''
const rawBaseUrl = import.meta.env.VITE_NOTIFICATIONS_URL ?? DEFAULT_NOTIFICATIONS_URL
const NOTIFICATIONS_BASE_URL = rawBaseUrl.replace(/\/$/, '')
const STREAM_RECONNECT_DELAY_MS = 1500
const CONFIRM_RETRY_DELAYS_MS = [300, 1000]

export type NotificationMessage = {
  id: string
  text: string
  user_id: string
}

export type NotificationsStream = {
  close: () => void
}

function getNotificationsUrl(path: string): string {
  if (NOTIFICATIONS_BASE_URL.endsWith('/notifications')) {
    return `${NOTIFICATIONS_BASE_URL}${path}`
  }

  return `${NOTIFICATIONS_BASE_URL}/notifications${path}`
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const timeout = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      resolve()
    }, { once: true })
  })
}

export function createNotificationsStream(
  userId: string,
  onMessage: (message: NotificationMessage) => void,
  onError: () => void,
): NotificationsStream {
  const controller = new AbortController()

  async function connect() {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(getNotificationsUrl(`/${userId}`), {
          headers: getAuthHeaders(),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          onError()
          await delay(STREAM_RECONNECT_DELAY_MS, controller.signal)
          continue
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split('\n\n')
          buffer = chunks.pop() ?? ''

          for (const chunk of chunks) {
            const data = chunk
              .split('\n')
              .filter(line => line.startsWith('data:'))
              .map(line => line.slice(5).trimStart())
              .join('\n')

            if (!data) continue

            try {
              onMessage(JSON.parse(data) as NotificationMessage)
            } catch {
              onError()
            }
          }
        }

        if (!controller.signal.aborted) {
          onError()
          await delay(STREAM_RECONNECT_DELAY_MS, controller.signal)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          onError()
          await delay(STREAM_RECONNECT_DELAY_MS, controller.signal)
        }
      }
    }
  }

  void connect()

  return {
    close: () => controller.abort(),
  }
}

export async function confirmNotification(userId: string, messageId: string): Promise<void> {
  if (NOTIFICATIONS_BASE_URL.startsWith('/api/v1')) {
    await api.post(`/notifications/confirm/${userId}/${messageId}`)
    return
  }

  const delays = [0, ...CONFIRM_RETRY_DELAYS_MS]
  let lastResponse: Response | null = null

  for (const retryDelay of delays) {
    if (retryDelay > 0) await delay(retryDelay)

    const response = await fetch(getNotificationsUrl(`/confirm/${userId}/${messageId}`), {
      method: 'POST',
      headers: getAuthHeaders(),
    })

    if (response.ok) return

    lastResponse = response
    if (response.status !== 503 && response.status !== 502 && response.status !== 504) break
  }

  throw new Error(`Failed to confirm notification${lastResponse ? `: ${lastResponse.status}` : ''}`)
}
