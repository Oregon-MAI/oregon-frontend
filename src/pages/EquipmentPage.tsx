import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './EquipmentPage.module.css'
import type { Resource } from '../types/resource'
import { getResourcesList } from '../api/resourceApi'

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentStatus = 'free' | 'busy' | 'mine'

interface Equipment {
  id: string
  name: string
  subtitle: string
  type: 'laptop' | 'monitor' | 'camera' | 'projector' | 'tv'
  status: EquipmentStatus
  busyUntil?: string
  mineUntil?: string
  location: string
}

// ─── Converter ────────────────────────────────────────────────────────────────

const DEVICE_TYPE_MAP: Record<string, Equipment['type']> = {
  laptop: 'laptop', notebook: 'laptop',
  monitor: 'monitor', display: 'monitor',
  camera: 'camera', webcam: 'camera',
  projector: 'projector',
  tv: 'tv', television: 'tv',
}

function resourceToEquipment(r: Resource, myResourceIds: Set<string>): Equipment {
  const isMine = myResourceIds.has(r.resource_id)
  const status: EquipmentStatus =
    isMine ? 'mine' :
    r.status === 'RESOURCE_STATUS_AVAILABLE' ? 'free' : 'busy'

  const rawType = r.device?.device_type?.toLowerCase() ?? ''
  const type: Equipment['type'] = DEVICE_TYPE_MAP[rawType] ?? 'laptop'
  const subtitle = [r.device?.model, r.device?.description].filter(Boolean).join(' · ')

  return {
    id: r.resource_id,
    name: r.name,
    subtitle,
    type,
    status,
    location: r.location,
  }
}

const TYPE_LABELS: Record<Equipment['type'], string> = {
  laptop:   'Ноутбук',
  monitor:  'Монитор',
  camera:   'Камера',
  projector:'Проектор',
  tv:       'Телевизор',
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function IconCal() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function EquipIcon({ type }: { type: Equipment['type'] }) {
  if (type === 'laptop') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
  if (type === 'monitor') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
  if (type === 'camera') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
  if (type === 'projector') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
}

// ─── Equipment card ───────────────────────────────────────────────────────────

function EquipCard({
  item, timeFrom, timeTo,
  onTake, onReturn,
}: {
  item: Equipment
  timeFrom: string
  timeTo: string
  onTake: (item: Equipment) => void
  onReturn: (item: Equipment) => void
}) {
  return (
    <div className={`${styles.card} ${item.status === 'busy' ? styles.cardBusy : ''}`}>
      <div className={styles.cardTop}>
        <div className={`${styles.iconWrap} ${styles[`icon_${item.type}`]}`}>
          <EquipIcon type={item.type} />
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardName}>{item.name}</div>
          <div className={styles.cardSub}>{item.subtitle}</div>
          {item.status === 'free' && (
            <span className={styles.badgeFree}>● Доступно</span>
          )}
          {item.status === 'busy' && (
            <span className={styles.badgeBusy}>● Занято до {item.busyUntil}</span>
          )}
          {item.status === 'mine' && (
            <span className={styles.badgeMine}>● У меня до {item.mineUntil}</span>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardLocation}>{item.location}</span>
        {item.status === 'free' && (
          <button className={styles.btnTake} onClick={() => onTake(item)}>
            Занять
          </button>
        )}
        {item.status === 'busy' && (
          <button className={styles.btnDisabled} disabled>Занято</button>
        )}
        {item.status === 'mine' && (
          <button className={styles.btnReturn} onClick={() => onReturn(item)}>
            Вернуть
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  item, timeFrom, timeTo, date,
  onConfirm, onCancel,
}: {
  item: Equipment
  timeFrom: string
  timeTo: string
  date: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <div className={styles.overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <div className={styles.modalTitle}>Подтвердите бронирование</div>
        <div className={styles.modalName}>{item.name}</div>
        <div className={styles.modalDetails}>
          {[
            ['Тип',       TYPE_LABELS[item.type]],
            ['Описание',  item.subtitle],
            ['Локация',   item.location],
            ['Дата',      date],
          ].map(([label, value]) => (
            <div key={label} className={styles.modalRow}>
              <span className={styles.modalLabel}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className={styles.modalRow}>
            <span className={styles.modalLabel}>Время</span>
            <span className={styles.modalTime}>{timeFrom} — {timeTo}</span>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnConfirm} onClick={onConfirm}>Подтвердить</button>
          <button className={styles.btnCancelModal} onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const navigate = useNavigate()
  const { bookings, user } = useAuth()
  const displayName = user ? `${user.surname} ${user.name?.charAt(0)}.` : ''

  const [tab,      setTab]      = useState<'all' | 'mine'>('all')
  const [typeFilter, setTypeFilter] = useState<Equipment['type'] | 'all'>('all')
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [timeFrom, setTimeFrom] = useState('11:00')
  const [timeTo,   setTimeTo]   = useState('13:00')
  const [floorsOpen, setFloorsOpen] = useState(false)
  const [currentFloor, setCurrentFloor] = useState(11)

  const [equipment,   setEquipment]   = useState<Equipment[]>([])
  const [confirmItem, setConfirmItem] = useState<Equipment | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter(b => b.date === today)

  const displayDate = date
    ? new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : today

  useEffect(() => {
    const myResourceIds = new Set(bookings.map(b => b.resourceId))
    getResourcesList(['RESOURCE_TYPE_DEVICE'])
      .then(resources => setEquipment(resources.map(r => resourceToEquipment(r, myResourceIds))))
      .catch(() => setToast('Не удалось загрузить список техники'))
  }, [bookings])

  const filtered = equipment.filter(e => {
    if (tab === 'mine' && e.status !== 'mine') return false
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    return true
  })

  const freeCount  = equipment.filter(e => e.status === 'free').length
  const totalCount = equipment.length

  function handleTake(item: Equipment) {
    setConfirmItem(item)
  }

  function handleConfirm() {
    if (!confirmItem) return
    const item = confirmItem
    setConfirmItem(null)
    setToast(`${item.name} забронирована на ${timeFrom}–${timeTo}`)
    setTimeout(() => setToast(null), 3500)
  }

  function handleReturn(item: Equipment) {
    setToast(`${item.name} возвращена`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className={styles.page}>
      {/* Топбар */}
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <div className={styles.logoSq}>T1</div>
          <span className={styles.logoText}>Workspace</span>
        </div>
        <div className={styles.topbarRight}>
          {displayName && <span>{displayName}</span>}
          <button className={styles.logoutBtn} onClick={() => {
            localStorage.removeItem('access_token')
            navigate('/login')
          }}>Выйти</button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Сайдбар */}
        <aside className={styles.sidebar}>
          <div className={styles.groupLabel}>Ресурсы</div>
          <button className={styles.sideBtn} onClick={() => navigate('/map')}>
            <IconMap /> Карта офиса
          </button>
          <button className={`${styles.sideBtn} ${styles.sideBtnCurrent}`}>
            <IconMonitor /> Техника
          </button>
          <button className={styles.sideBtn} onClick={() => navigate('/bookings')}>
            <IconFile /> Мои брони
          </button>

          <div className={styles.groupLabel}>Этажи</div>
          <button
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
                  className={`${styles.sideBtn} ${currentFloor === floor ? styles.sideBtnActive : ''}`}
                  onClick={() => { setCurrentFloor(floor); setFloorsOpen(false) }}
                >
                  {floor} этаж
                </button>
              ))}
            </div>
          )}

          <div className={styles.groupLabel}>Фильтр</div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Техника</div>
            <div className={styles.filterInputWrap}>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as Equipment['type'] | 'all')}
                className={styles.filterSelect}
              >
                <option value="all">Выбрать</option>
                <option value="laptop">Ноутбук</option>
                <option value="monitor">Монитор</option>
                <option value="camera">Камера</option>
                <option value="projector">Проектор</option>
                <option value="tv">Телевизор</option>
              </select>
            </div>
          </div>

          <div className={styles.filterBlock}>
            <div className={styles.filterLabel}>Дата и время</div>
            <div className={styles.filterInputWrap}>
              <IconCal />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.timeRow}>
              <input
                type="time"
                value={timeFrom}
                onChange={e => setTimeFrom(e.target.value)}
                className={styles.timeInput}
              />
              <span className={styles.timeSep}>—</span>
              <input
                type="time"
                value={timeTo}
                onChange={e => setTimeTo(e.target.value)}
                className={styles.timeInput}
              />
            </div>
          </div>

          {/* Виджет Сегодня */}
          {todayBookings.length > 0 && (
            <div className={styles.todayWidget}>
              <div className={styles.todayLabel}>Сегодня</div>
              {todayBookings.map((b, i) => (
                <div key={b.id} className={styles.todayItem}>
                  <div className={styles.todayStripe} style={{ background: i === 0 ? '#059669' : '#1A56DB' }} />
                  <div>
                    <div className={styles.todayName}>{b.resourceName}</div>
                    <div className={styles.todayTime}>{b.timeFrom}–{b.timeTo}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Контент */}
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Техника</h1>
            <div className={styles.pageCount}>
              Доступно {freeCount} из {totalCount} единиц
            </div>
          </div>

          {/* Вкладки */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setTab('all')}
            >
              Все
            </button>
            <button
              className={`${styles.tab} ${tab === 'mine' ? styles.tabActive : ''}`}
              onClick={() => setTab('mine')}
            >
              У меня
            </button>
          </div>

          {/* Карточки */}
          <div className={styles.cardsGrid}>
            {filtered.map(item => (
              <EquipCard
                key={item.id}
                item={item}
                timeFrom={timeFrom}
                timeTo={timeTo}
                onTake={handleTake}
                onReturn={handleReturn}
              />
            ))}
            {filtered.length === 0 && (
              <div className={styles.empty}>Техника не найдена</div>
            )}
          </div>
        </main>
      </div>

      {confirmItem && (
        <ConfirmModal
          item={confirmItem}
          timeFrom={timeFrom}
          timeTo={timeTo}
          date={displayDate}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
