import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'
import NotificationCenter from '../components/NotificationCenter'
import styles from './EquipmentPage.module.css'
import TimeSelect from '../components/TimeSelect'
import type { Resource } from '../types/resource'
import { createBooking, getResourceBookings } from '../features/bookings/api/bookingApi'
import { getResourcesList } from '../features/resources/api/resourceApi'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function defaultDate(): string {
  const now = new Date()
  return now.getHours() >= 19
    ? localDateStr(new Date(now.getTime() + 86400000))
    : localDateStr()
}

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

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
  bookedSlots: string[]
}

// ─── Converter ────────────────────────────────────────────────────────────────

const DEVICE_TYPE_MAP: Record<string, Equipment['type']> = {
  laptop: 'laptop', notebook: 'laptop',
  monitor: 'monitor', display: 'monitor',
  camera: 'camera', webcam: 'camera',
  projector: 'projector',
  tv: 'tv', television: 'tv',
}

function resourceToEquipment(r: Resource, myResourceIds: Set<string>, slots: string[], mineUntil?: string): Equipment {
  const isMine = myResourceIds.has(r.resource_id)
  const isStructurallyUnavailable = r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY'
  const status: EquipmentStatus =
    isMine ? 'mine' :
    isStructurallyUnavailable ? 'busy' : 'free'

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
    bookedSlots: slots,
    mineUntil,
  }
}

// TODO: remove stub when backend is ready
const STUB_EQUIPMENT: Equipment[] = [
  { id: 'stub-eq-1', name: 'MacBook Pro 14"', subtitle: 'Apple M3 · 16GB RAM', type: 'laptop', status: 'free', location: '11 этаж · Крыло А', bookedSlots: [] },
  { id: 'stub-eq-2', name: 'MacBook Air 13"', subtitle: 'Apple M2 · 8GB RAM', type: 'laptop', status: 'busy', busyUntil: '15:00', location: '11 этаж · Крыло Б', bookedSlots: [] },
  { id: 'stub-eq-3', name: 'Dell UltraSharp 27"', subtitle: '4K · USB-C', type: 'monitor', status: 'free', location: '11 этаж · Крыло А', bookedSlots: [] },
  { id: 'stub-eq-4', name: 'Logitech C920', subtitle: 'Веб-камера · Full HD', type: 'camera', status: 'free', location: '11 этаж · Ресепшн', bookedSlots: [] },
  { id: 'stub-eq-5', name: 'Epson EB-X41', subtitle: 'Проектор · XGA', type: 'projector', status: 'free', location: '11 этаж · Переговорная B2', bookedSlots: [] },
]

const TYPE_LABELS: Record<Equipment['type'], string> = {
  laptop:   'Ноутбук',
  monitor:  'Монитор',
  camera:   'Камера',
  projector:'Проектор',
  tv:       'Телевизор',
}

function isOnFloor(location: string, floor: number): boolean {
  const normalized = location.trim()
  if (!normalized) return floor === 11

  return new RegExp(`(^|\\D)${floor}(\\D|$)`).test(normalized)
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
  item,
  onTake, onReturn,
}: {
  item: Equipment
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
            <span className={styles.badgeBusy}>
              ● Занято{item.bookedSlots.length > 0 ? `: ${item.bookedSlots.join(', ')}` : ''}
            </span>
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
  const [date,     setDate]     = useState(defaultDate())
  const [timeFrom, setTimeFrom] = useState('11:00')
  const [timeTo,   setTimeTo]   = useState('13:00')
  const [refreshKey, setRefreshKey] = useState(0)
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
    const myResourceIds = new Set(
      bookings
        .filter(b => b.date === date && b.timeFrom < timeTo && b.timeTo > timeFrom)
        .map(b => b.resourceId)
    )
    const selectedFrom = new Date(`${date}T${timeFrom}:00`).toISOString()
    const selectedTo   = new Date(`${date}T${timeTo}:00`).toISOString()
    const dayFrom      = new Date(`${date}T00:00:00`).toISOString()
    const dayTo        = new Date(`${date}T23:59:59`).toISOString()
    getResourcesList(['RESOURCE_TYPE_DEVICE'])
      .then(async resources => {
        const devices = resources.filter(r => r.type === 'RESOURCE_TYPE_DEVICE')
        const bookingsPerResource = await Promise.all(
          devices.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        setEquipment(devices.map((r, i) => {
          const bs = bookingsPerResource[i]
          const slots = bs
            .filter(b => b.starts_at && b.ends_at)
            .map(b => `${isoToTime(b.starts_at!)}–${isoToTime(b.ends_at!)}`)
          const isBusyAtSelected = bs.some(b =>
            b.starts_at && b.ends_at &&
            b.starts_at < selectedTo && b.ends_at > selectedFrom
          )
          const isMine = myResourceIds.has(r.resource_id)
          const isStructural = r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY'
          const rWithStatus = isBusyAtSelected && !isMine
            ? { ...r, status: 'RESOURCE_STATUS_MAINTENANCE' as const }
            : !isStructural
              ? { ...r, status: 'RESOURCE_STATUS_AVAILABLE' as const }
              : r
          const myBooking = bookings.find(b =>
            b.resourceId === r.resource_id &&
            b.date === date && b.timeFrom < timeTo && b.timeTo > timeFrom
          )
          return resourceToEquipment(rWithStatus, myResourceIds, slots, myBooking?.timeTo)
        }))
      })
      .catch(() => setEquipment(STUB_EQUIPMENT))
  }, [bookings, date, timeFrom, timeTo, refreshKey])

  const filtered = equipment.filter(e => {
    if (!isOnFloor(e.location, currentFloor)) return false
    if (tab === 'mine' && e.status !== 'mine') return false
    if (typeFilter !== 'all' && e.type !== typeFilter) return false
    return true
  })

  const freeCount  = filtered.filter(e => e.status === 'free').length
  const totalCount = filtered.length

  function handleTake(item: Equipment) {
    setConfirmItem(item)
  }

  async function handleConfirm() {
    if (!confirmItem || !user?.id) return
    const item = confirmItem
    setConfirmItem(null)
    try {
      await createBooking(item.id, user.id, date, timeFrom, timeTo)
      setRefreshKey(k => k + 1)
      setToast(`${item.name} забронирована на ${timeFrom}–${timeTo}`)
    } catch {
      setToast('Не удалось создать бронь')
    }
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
          <NotificationCenter />
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
              <TimeSelect value={timeFrom} onChange={setTimeFrom} className={styles.timeInput} />
              <span className={styles.timeSep}>—</span>
              <TimeSelect value={timeTo} onChange={setTimeTo} className={styles.timeInput} />
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
