import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'
import { useNavigate } from 'react-router-dom'
function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

export default function Sidebar() {
  const { bookings } = useAuth()
  const [activeNav, setActiveNav] = useState('map')
  const [floorsOpen, setFloorsOpen] = useState(false)
  const [currentFloor, setCurrentFloor] = useState(11)

  // Брони на сегодня для виджета
  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter(b => b.date === today)
  const navigate = useNavigate()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.groupLabel}>Ресурсы</div>
      <button
        type="button"
        className={`${styles.sideBtn} ${activeNav === 'map' ? styles.sideBtnActive : ''}`}
        onClick={() => setActiveNav('map')}
      >
        <IconMap />
        Карта офиса
      </button>
      <button
        type="button"
        className={`${styles.sideBtn} ${activeNav === 'equipment' ? styles.sideBtnActive : ''}`}
        onClick={() => navigate('/equipment')}
      >
        <IconMonitor />
        Техника
      </button>
      <button
        type="button"
        className={`${styles.sideBtn} ${activeNav === 'reservations' ? styles.sideBtnActive : ''}`}
        onClick={() => setActiveNav('reservations')}
      >
        <IconFile />
        Мои брони
      </button>

      <div className={styles.groupLabel}>Этажи</div>
      <button
        type="button"
        className={`${styles.sideBtn} ${styles.floorBtn}`}
        onClick={() => setFloorsOpen(!floorsOpen)}
      >
        {currentFloor} этаж ▾
      </button>
      {floorsOpen && (
        <div>
          {[11, 12, 13, 14].map(floor => (
            <button
              key={floor}
              type="button"
              className={`${styles.sideBtn} ${currentFloor === floor ? styles.sideBtnActive : ''}`}
              onClick={() => {
                setCurrentFloor(floor)
                setFloorsOpen(false)
              }}
            >
              {floor} этаж
            </button>
          ))}
        </div>
      )}

      {/* Виджет «Сегодня» — данные из AuthContext */}
      {todayBookings.length > 0 && (
        <div className={styles.todayWidget}>
          <div className={styles.todayLabel}>Сегодня</div>
          {todayBookings.map((booking, i) => (
            <div key={booking.id} className={styles.todayItem}>
              <div
                className={styles.todayStripe}
                style={{ background: i === 0 ? '#059669' : '#1A56DB' }}
              />
              <div>
                <div className={styles.todayName}>{booking.resourceName}</div>
                <div className={styles.todayTime}>
                  {booking.timeFrom}–{booking.timeTo}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
