import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'
import NotificationCenter from '../components/NotificationCenter'
import styles from './MeetingRoomsPage.module.css'
import TimeSelect from '../components/TimeSelect'
import type { Resource } from '../types/resource'
import { createBooking, getResourceBookings } from '../features/bookings/api/bookingApi'
import { getResourcesList } from '../features/resources/api/resourceApi'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  floor: number
  wing: string
  capacity: number
  status: 'free' | 'busy' | 'mine'
  busyUntil?: string
  amenities: string[]
  bookedSlots: { from: string; to: string }[]
}

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

// ─── Converter ────────────────────────────────────────────────────────────────

function resourceToRoom(r: Resource, myResourceIds: Set<string>, slots: { from: string; to: string }[]): Room {
  // бэкенд может вернуть camelCase
  const raw = r as unknown as Record<string, unknown>
  const mr = r.meeting_room ?? (raw.meetingRoom as typeof r.meeting_room)

  const amenities: string[] = []
  if (mr?.has_projector) amenities.push('Проектор')
  if (mr?.has_whiteboard) amenities.push('Маркерная')

  const isMine = myResourceIds.has(r.resource_id)
  const isStructurallyUnavailable = r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY'
  const status: Room['status'] =
    isMine ? 'mine' :
    isStructurallyUnavailable ? 'busy' : 'free'

  // location может быть просто числом этажа ("11") — показываем как есть
  const floor = parseInt(r.location) || 11
  const wing = /^\d+$/.test(r.location.trim()) ? '' : r.location

  return {
    id: r.resource_id,
    name: r.name,
    floor,
    wing,
    capacity: mr?.capacity ?? 0,
    status,
    amenities,
    bookedSlots: slots,
  }
}

// TODO: remove stub when backend is ready
const STUB_ROOMS: Room[] = [
  { id: 'stub-room-1', name: 'Переговорная A1', floor: 11, wing: 'Крыло А', capacity: 6, status: 'free', amenities: ['Проектор', 'Маркерная', 'Wi-Fi'], bookedSlots: [] },
  { id: 'stub-room-2', name: 'Переговорная A2', floor: 11, wing: 'Крыло А', capacity: 10, status: 'busy', busyUntil: '14:00', amenities: ['ВКС', 'Проектор', 'Wi-Fi'], bookedSlots: [{ from: '10:00', to: '14:00' }] },
  { id: 'stub-room-3', name: 'Переговорная B1', floor: 11, wing: 'Крыло Б', capacity: 4, status: 'free', amenities: ['Маркерная', 'Wi-Fi'], bookedSlots: [] },
  { id: 'stub-room-4', name: 'Переговорная B2', floor: 11, wing: 'Крыло Б', capacity: 15, status: 'free', amenities: ['ВКС', 'Проектор', 'Маркерная', 'Wi-Fi', 'Доска'], bookedSlots: [] },
]

const ALL_AMENITIES = ['ВКС', 'Проектор', 'Маркерная', 'Wi-Fi', 'Доска']

function isRoomBusyAt(room: Room, from: string, to: string) {
  return room.bookedSlots.some(b => from < b.to && to > b.from)
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

function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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

// ─── Sidebar with filters ─────────────────────────────────────────────────────

function RoomsSidebar({
  currentFloor, setCurrentFloor,
  minCapacity, setMinCapacity,
  selectedAmenities, toggleAmenity,
  date, setDate,
  timeFrom, setTimeFrom,
  timeTo, setTimeTo,
  onReset,
  hasFilters,
  bookings,
}: {
  currentFloor: number
  setCurrentFloor: (floor: number) => void
  minCapacity: number
  setMinCapacity: (v: number) => void
  selectedAmenities: string[]
  toggleAmenity: (a: string) => void
  date: string
  setDate: (v: string) => void
  timeFrom: string
  setTimeFrom: (v: string) => void
  timeTo: string
  setTimeTo: (v: string) => void
  onReset: () => void
  hasFilters: boolean
  bookings: { id: string; resourceName: string; timeFrom: string; timeTo: string; date: string }[]
}) {
  const navigate = useNavigate()
  const [floorsOpen, setFloorsOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter(b => b.date === today)

  return (
    <aside className={styles.sidebar}>
      {/* Навигация */}
      <div className={styles.groupLabel}>Ресурсы</div>
      <button className={styles.sideBtn} onClick={() => navigate('/map')}>
        <IconMap /> Карта офиса
      </button>
      <button className={styles.sideBtn} onClick={() => navigate('/equipment')}>
        <IconMonitor /> Техника
      </button>
      <button className={styles.sideBtn} onClick={() => navigate('/bookings')}>
        <IconFile /> Мои брони
      </button>

      {/* Этажи */}
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

      {/* Фильтры переговорных */}
      <div className={styles.groupLabel}>Фильтр</div>

      <div className={styles.filterBlock}>
        <div className={styles.filterLabel}>Участников</div>
        <div className={styles.filterInputWrap}>
          <IconUsers />
          <select
            value={minCapacity}
            onChange={e => setMinCapacity(Number(e.target.value))}
            className={styles.filterSelect}
          >
            <option value={0}>Любое кол-во</option>
            <option value={4}>от 4 человек</option>
            <option value={6}>от 6 человек</option>
            <option value={8}>от 8 человек</option>
            <option value={10}>от 10 человек</option>
            <option value={15}>от 15 человек</option>
          </select>
        </div>
      </div>

      <div className={styles.filterBlock}>
        <div className={styles.filterLabel}>Дата и время</div>
       <div className={styles.filterInputWrap}>
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

      <div className={styles.filterBlock}>
        <div className={styles.filterLabel}>Оснащение</div>
        <div className={styles.amenityList}>
          {ALL_AMENITIES.map(a => (
            <button
              key={a}
              className={`${styles.amenityBtn} ${selectedAmenities.includes(a) ? styles.amenityBtnActive : ''}`}
              onClick={() => toggleAmenity(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button className={styles.resetBtn} onClick={onReset}>
          Сбросить фильтры
        </button>
      )}

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
  )
}

// ─── Room card ────────────────────────────────────────────────────────────────

function AmenityChip({ label }: { label: string }) {
  return <span className={styles.amenityChip}>{label}</span>
}

function RoomCard({
  room, timeFrom, timeTo, onBook, onCancel,
}: {
  room: Room
  timeFrom: string
  timeTo: string
  onBook: (room: Room) => void
  onCancel: (room: Room) => void
}) {
  const busyAtSelected = room.status !== 'mine' && isRoomBusyAt(room, timeFrom, timeTo)
  const effectiveBusy  = room.status === 'busy' || busyAtSelected

  return (
    <div className={`${styles.card} ${effectiveBusy ? styles.cardBusy : ''}`}>
      <div
        className={styles.cardStripe}
        style={{
          background:
            room.status === 'mine' ? '#1A56DB' :
            effectiveBusy          ? '#DC2626' : '#059669',
        }}
      />
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.cardName}>{room.name}</span>
          {room.status === 'mine'             && <span className={styles.badgeMine}>● У меня</span>}
          {room.status !== 'mine' && !effectiveBusy && <span className={styles.badgeFree}>● Свободно</span>}
          {room.status !== 'mine' && effectiveBusy  && (
            <span className={styles.badgeBusy}>
              ● Занято{room.busyUntil ? ` до ${room.busyUntil}` : ` ${timeFrom}–${timeTo}`}
            </span>
          )}
        </div>
        <div className={styles.cardMeta}>
          {room.floor} этаж{room.wing ? ` · ${room.wing}` : ''}{room.capacity > 0 ? ` · до ${room.capacity} чел.` : ''}
        </div>
        {room.bookedSlots.length > 0 && (
          <div className={styles.slotsRow}>
            <span className={styles.slotsLabel}>Занято сегодня:</span>
            {room.bookedSlots.map((s, i) => (
              <span key={i} className={styles.slot}>{s.from}–{s.to}</span>
            ))}
          </div>
        )}
        <div className={styles.cardAmenities}>
          {room.amenities.map(a => <AmenityChip key={a} label={a} />)}
        </div>
        {room.status === 'mine' ? (
          <button className={styles.btnCancelCard} onClick={() => onCancel(room)}>Отменить бронь</button>
        ) : effectiveBusy ? (
          <button className={styles.btnBookDisabled} disabled>Занято</button>
        ) : (
          <button className={styles.btnBook} onClick={() => onBook(room)}>
            Забронировать · {timeFrom}–{timeTo}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  room, timeFrom, timeTo, date, onConfirm, onCancel,
}: {
  room: Room; timeFrom: string; timeTo: string; date: string
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <>
      <div className={styles.overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <div className={styles.modalTitle}>Подтвердите бронирование</div>
        <div className={styles.modalRoom}>{room.name}</div>
        <div className={styles.modalDetails}>
          {[
            ['Этаж',        `${room.floor} этаж${room.wing ? ` · ${room.wing}` : ''}`],
            ...(room.capacity > 0 ? [['Вместимость', `до ${room.capacity} чел.`]] : []),
            ['Дата',        date],
            ['Оснащение',   room.amenities.join(', ') || '—'],
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

export default function MeetingRoomsPage() {
  const navigate = useNavigate()
  const { bookings, user } = useAuth()
  const displayName = user ? `${user.surname} ${user.name?.charAt(0)}.` : ''

  const [minCapacity,       setMinCapacity]       = useState(0)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [timeFrom,          setTimeFrom]          = useState('11:00')
  const [timeTo,            setTimeTo]            = useState('13:00')
  const [date,              setDate]              = useState(defaultDate())
  const [currentFloor,      setCurrentFloor]      = useState(11)
  const [rooms,             setRooms]             = useState<Room[]>([])
  const [confirmRoom,       setConfirmRoom]       = useState<Room | null>(null)
  const [toast,             setToast]             = useState<string | null>(null)
  const [refreshKey,        setRefreshKey]        = useState(0)

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
    getResourcesList(['RESOURCE_TYPE_MEETING_ROOM'])
      .then(async resources => {
        const rooms = resources.filter(r => r.type === 'RESOURCE_TYPE_MEETING_ROOM')
        const bookingsPerResource = await Promise.all(
          rooms.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        setRooms(rooms.map((r, i) => {
          const bs = bookingsPerResource[i]
          const slots = bs
            .filter(b => b.starts_at && b.ends_at)
            .map(b => ({ from: isoToTime(b.starts_at!), to: isoToTime(b.ends_at!) }))
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
          return resourceToRoom(rWithStatus, myResourceIds, slots)
        }))
      })
      .catch(() => setRooms(STUB_ROOMS))
  }, [bookings, date, timeFrom, timeTo, refreshKey])

  function toggleAmenity(a: string) {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  function handleReset() {
    setSelectedAmenities([])
    setMinCapacity(0)
    setCurrentFloor(11)
  }

  const filteredRooms = rooms.filter((r: Room) => {
    if (r.floor !== currentFloor) return false
    if (minCapacity > 0 && r.capacity > 0 && r.capacity < minCapacity) return false
    if (selectedAmenities.length > 0 && !selectedAmenities.every(a => r.amenities.includes(a))) return false
    return true
  })

  const freeCount  = filteredRooms.filter((r: Room) => r.status === 'free' && !isRoomBusyAt(r, timeFrom, timeTo)).length
  const totalCount = filteredRooms.length

  async function handleConfirm() {
    if (!confirmRoom || !user?.id) return
    const room = confirmRoom
    setConfirmRoom(null)
    try {
      await createBooking(room.id, user.id, date, timeFrom, timeTo)
      setRefreshKey(k => k + 1)
      setToast(`${room.name} забронирована на ${timeFrom}–${timeTo}`)
    } catch {
      setToast('Не удалось создать бронь')
    }
    setTimeout(() => setToast(null), 3500)
  }

  function handleCancel(room: Room) {
    setToast(`Бронь ${room.name} отменена`)
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
        {/* Сайдбар с фильтрами */}
        <RoomsSidebar
          currentFloor={currentFloor}
          setCurrentFloor={setCurrentFloor}
          minCapacity={minCapacity}
          setMinCapacity={setMinCapacity}
          selectedAmenities={selectedAmenities}
          toggleAmenity={toggleAmenity}
          date={date}
          setDate={setDate}
          timeFrom={timeFrom}
          setTimeFrom={setTimeFrom}
          timeTo={timeTo}
          setTimeTo={setTimeTo}
          onReset={handleReset}
          hasFilters={selectedAmenities.length > 0 || minCapacity > 0 || currentFloor !== 11}
          bookings={bookings}
        />

        {/* Контент */}
        <main className={styles.content}>
          {/* Заголовок */}
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Переговорные</h1>
              <div className={styles.pageMeta}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {currentFloor} этаж · Найдено {freeCount} из {totalCount}
              </div>
            </div>
            <div className={styles.pageHint}>
              Нажмите на переговорную чтобы забронировать
            </div>
          </div>

          {/* Вкладки */}
          <div className={styles.tabs}>
            <button className={styles.tab} onClick={() => navigate('/map')}>
              Рабочие места
            </button>
            <button className={`${styles.tab} ${styles.tabActive}`}>
              Переговорные
            </button>
          </div>

          {/* Карточки */}
          <div className={styles.cardsGrid}>
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                timeFrom={timeFrom}
                timeTo={timeTo}
                onBook={setConfirmRoom}
                onCancel={handleCancel}
              />
            ))}
            {filteredRooms.length === 0 && (
              <div className={styles.empty}>
                Переговорные не найдены. Попробуйте изменить фильтры.
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmRoom && (
        <ConfirmModal
          room={confirmRoom}
          timeFrom={timeFrom}
          timeTo={timeTo}
          date={date}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmRoom(null)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
