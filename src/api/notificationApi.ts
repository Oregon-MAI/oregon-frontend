import { api } from './authApi'

const DEFAULT_NOTIFICATIONS_URL = 'http://localhost:8003'
const rawBaseUrl = import.meta.env.VITE_NOTIFICATIONS_URL ?? DEFAULT_NOTIFICATIONS_URL
const NOTIFICATIONS_BASE_URL = rawBaseUrl.replace(/\/$/, '')

export type NotificationMessage = {
  id: string
  text: string
  user_id: string
}

export function createNotificationsStream(
  userId: string,
  onMessage: (message: NotificationMessage) => void,
  onError: () => void,
): EventSource {
  const source = new EventSource(`${NOTIFICATIONS_BASE_URL}/notifications/${userId}`)

  source.onmessage = event => {
    try {
      onMessage(JSON.parse(event.data) as NotificationMessage)
    } catch {
      onError()
    }
  }

  source.onerror = () => {
    onError()
    source.close()
  }

  return source
}

export async function confirmNotification(userId: string, messageId: string): Promise<void> {
  if (NOTIFICATIONS_BASE_URL.startsWith('/api/v1')) {
    await api.post(`/notifications/confirm/${userId}/${messageId}`)
    return
  }

  const response = await fetch(`${NOTIFICATIONS_BASE_URL}/notifications/confirm/${userId}/${messageId}`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to confirm notification')
  }
}
