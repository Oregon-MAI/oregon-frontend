import { useEffect, useState } from 'react'
import styles from './NotificationCenter.module.css'

type Notification = {
  id: string
  title: string
  message: string
  time: string
  unread?: boolean
}

const STUB_NOTIFICATIONS: Notification[] = [
  {
    id: 'booking-starts-soon',
    title: 'Бронь скоро начнется',
    message: 'Рабочее место A-14 будет доступно с 14:00.',
    time: '10 мин назад',
    unread: true,
  },
  {
    id: 'room-confirmed',
    title: 'Переговорная подтверждена',
    message: 'Комната B2 забронирована сегодня с 16:00 до 17:00.',
    time: '1 час назад',
    unread: true,
  },
  {
    id: 'equipment-ready',
    title: 'Техника готова к выдаче',
    message: 'Ноутбук MacBook Pro 14" можно забрать на ресепшене.',
    time: 'Вчера',
  },
]

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

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = STUB_NOTIFICATIONS.filter(notification => notification.unread).length

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

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
                <p className={styles.subtitle}>Пока показаны тестовые данные</p>
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
              {STUB_NOTIFICATIONS.map(notification => (
                <article key={notification.id} className={styles.item}>
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
