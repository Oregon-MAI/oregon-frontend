import { useEffect, useState } from 'react'
import { confirmNotification, createNotificationsStream } from '../features/notifications/api/notificationApi'
import { useAuth } from '../features/auth/model/AuthContext'
import { formatWorkspaceLocation } from '../features/resources/lib/workspaceLocation'
import styles from './NotificationCenter.module.css'

type Notification = {
  id: string
  title: string
  message: string
  time: string
  unread?: boolean
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function formatNotificationText(text: string): string {
  return text.replace(/\{"floor"\s*:\s*\d+(?:\s*,\s*"x"\s*:\s*-?\d+(?:\.\d+)?)?(?:\s*,\s*"y"\s*:\s*-?\d+(?:\.\d+)?)?(?:\s*,\s*"rotate"\s*:\s*-?\d+(?:\.\d+)?)?\}/g, match => (
    formatWorkspaceLocation(match)
  ))
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [hasStreamError, setHasStreamError] = useState(false)
  const unreadCount = notifications.filter(notification => notification.unread).length

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setHasStreamError(false)
      return
    }

    const source = createNotificationsStream(
      user.id,
      message => {
        setHasStreamError(false)
        setNotifications(prev => {
          if (prev.some(notification => notification.id === message.id)) return prev
          return [
            {
              id: message.id,
              title: 'Новое уведомление',
              message: formatNotificationText(message.text),
              time: 'Только что',
              unread: true,
            },
            ...prev,
          ]
        })
      },
      () => {
        setHasStreamError(true)
      },
    )

    return () => source.close()
  }, [user?.id])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  async function handleNotificationClick(notification: Notification) {
    if (!user?.id) return

    setNotifications(prev =>
      prev.map(item =>
        item.id === notification.id ? { ...item, unread: false } : item,
      ),
    )

    try {
      await confirmNotification(user.id, notification.id)
      setNotifications(prev => prev.filter(item => item.id !== notification.id))
    } catch {
      setNotifications(prev =>
        prev.map(item =>
          item.id === notification.id ? { ...item, unread: true } : item,
        ),
      )
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setIsOpen(true)}
        aria-label="Открыть уведомления"
      >
        <BellIcon />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notifications-title"
          >
            <div className={styles.header}>
              <div>
                <h2 id="notifications-title" className={styles.title}>Уведомления</h2>
                <p className={styles.subtitle}>
                  {hasStreamError ? 'Сервис уведомлений недоступен' : 'Онлайн-уведомления'}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Закрыть уведомления"
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.list}>
              {notifications.length === 0 && (
                <div className={styles.emptyState}>
                  Новых уведомлений нет
                </div>
              )}

              {notifications.map(notification => (
                <article
                  key={notification.id}
                  className={styles.item}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={notification.unread ? styles.unreadDot : styles.readDot} />
                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}>
                      <h3 className={styles.itemTitle}>{notification.title}</h3>
                      <time className={styles.itemTime}>{notification.time}</time>
                    </div>
                    <p className={styles.itemMessage}>{notification.message}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
