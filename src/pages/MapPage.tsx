import { useState, useEffect, useRef } from 'react'
import type { TouchEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'
import { createBooking, getResourceBookings } from '../features/bookings/api/bookingApi'
import OfficeMap from '../widgets/office-map/OfficeMap'
import NotificationCenter from '../widgets/app-shell/NotificationCenter'
import type { Zone, Desk, MapRoom } from '../shared/types/map'
import type { Resource } from '../shared/types/resource'
import styles from './MapPage.module.css'
import { getResourcesList } from '../features/resources/api/resourceApi'
import TimeSelect from '../shared/ui/TimeSelect/TimeSelect'
import { getWorkspaceFloor } from '../features/resources/lib/workspaceLocation'
import { getDefaultBookingDate, isoToLocalTime } from '../shared/lib/dateTime'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultDate(): string {
  return getDefaultBookingDate()
}

/** Rounds the current time up to the next available 15-minute booking slot. */
function defaultTimeFrom(): string {
  const now = new Date()
  const totalMin = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.ceil(totalMin / 15) * 15
  if (rounded < 9 * 60) return '09:00'
  if (rounded >= 19 * 60) return '09:00'
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const TIME_SLOTS = Array.from({ length: 37 }, (_, i) => {
  const total = 9 * 60 + i * 15
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function timeIndex(time: string): number {
  return TIME_SLOTS.indexOf(time)
}

/** Checks whether any already-booked slot overlaps the selected interval. */
function hasBusySlotBetween(busySlots: string[], from: string, to: string): boolean {
  const fromIndex = timeIndex(from)
  const toIndex = timeIndex(to)
  if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) return true
  return TIME_SLOTS.slice(fromIndex, toIndex).some(slot => busySlots.includes(slot))
}

// ─── Converter ────────────────────────────────────────────────────────────────

/** Expands a backend booking interval into 15-minute slots for map highlighting. */
function expandBookingToSlots(startsAt: string, endsAt: string): string[] {
  const slots: string[] = []
  const cur = new Date(startsAt)
  const end = new Date(endsAt)
  while (cur < end) {
    slots.push(isoToLocalTime(cur.toISOString()))
    cur.setMinutes(cur.getMinutes() + 15)
  }
  return slots
}

/** Matches a resource to the selected floor, defaulting legacy locations to floor 20. */
function isResourceOnFloor(resource: Resource, floor: number): boolean {
  return (getWorkspaceFloor(resource.location) ?? 20) === floor
}

/** Groups workspace resources into map zones and marks current user's bookings. */
function resourcesToZones(
  resources: Resource[],
  myResourceIds: Set<string>,
  bookedSlotsByResource: Map<string, string[]>,
): Zone[] {
  const zoneMap = new Map<'A' | 'B' | 'D', Desk[]>()

  for (const r of resources) {
    const zoneKey = r.name[0]?.toUpperCase() as 'A' | 'B' | 'D'
    if (!['A', 'B', 'D'].includes(zoneKey)) continue

    const amenities: string[] = []
    if (r.workspace?.has_monitor) amenities.push('Монитор')

    const isMine = myResourceIds.has(r.resource_id)
    const isUnavailable = r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY'
    const status: 'free' | 'busy' | 'mine' =
      isMine ? 'mine' :
      isUnavailable ? 'busy' : 'free'

    const desk: Desk = {
      resourceId: r.resource_id,
      id: r.name,
      zone: zoneKey,
      status,
      amenities,
      bookedSlots: bookedSlotsByResource.get(r.resource_id) ?? [],
      location: r.location,
    }

    if (!zoneMap.has(zoneKey)) zoneMap.set(zoneKey, [])
    zoneMap.get(zoneKey)!.push(desk)
  }

  return Array.from(zoneMap.entries()).map(([id, desks]) => ({
    id,
    name: `Зона ${id}`,
    desks: desks.sort((a, b) => {
      const na = parseInt(a.id.replace(/\D+/g, '')) || 0
      const nb = parseInt(b.id.replace(/\D+/g, '')) || 0
      return na - nb
    }),
  }))
}

/** Converts meeting-room resources to map room markers. */
function resourcesToRooms(
  resources: Resource[],
  myResourceIds: Set<string>,
  bookedSlotsByResource: Map<string, string[]>,
): MapRoom[] {
  return resources
    .filter(r => r.type === 'RESOURCE_TYPE_MEETING_ROOM')
    .map(r => {
      const amenities: string[] = []
      if (r.meeting_room?.has_projector) amenities.push('Проектор')
      if (r.meeting_room?.has_whiteboard) amenities.push('Маркерная')

      const isMine = myResourceIds.has(r.resource_id)
      const isUnavailable = r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY'
      const status: MapRoom['status'] =
        isMine ? 'mine' :
        isUnavailable ? 'busy' : 'free'

      return {
        resourceId: r.resource_id,
        id: r.name,
        status,
        capacity: r.meeting_room?.capacity ?? 0,
        amenities,
        bookedSlots: bookedSlotsByResource.get(r.resource_id) ?? [],
        location: r.location,
      }
    })
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

function MapLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`${styles.legend} ${className}`}>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.dotFree}`} />
        Свободно
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.dotBusy}`} />
        Занято
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.dotMine}`} />
        Моё
      </div>
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.dotRoomFree}`} />
        Переговорная
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const ALL_AMENITIES = ['Монитор']

function MapSidebar({
  selectedAmenities, toggleAmenity,
  currentFloor, setCurrentFloor,
  date, setDate,
  timeFrom, setTimeFrom,
  timeTo, setTimeTo,
  bookings,
}: {
  selectedAmenities: string[]
  toggleAmenity: (a: string) => void
  currentFloor: number
  setCurrentFloor: (floor: number) => void
  date: string
  setDate: (v: string) => void
  timeFrom: string
  setTimeFrom: (v: string) => void
  timeTo: string
  setTimeTo: (v: string) => void
  bookings: { id: string; resourceName: string; timeFrom: string; timeTo: string; date: string }[]
}) {
  const navigate = useNavigate()
  const [floorsOpen, setFloorsOpen] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const todayBookings = bookings.filter(b => b.date === today)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.groupLabel}>Ресурсы</div>
      <button className={`${styles.sideBtn} ${styles.sideBtnCurrent}`}>
        <IconMap /> Карта офиса
      </button>
      <button className={styles.sideBtn} onClick={() => navigate('/equipment')}>
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
          {[20, 21, 22].map(floor => (
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

// ─── Confirm modal ────────────────────────────────────────────────────────────

type BookableMapItem = Desk | MapRoom
type MobileSheetMode = 'hidden' | 'peek' | 'open'

const SHEET_SWIPE_THRESHOLD = 42

/** Narrows a clicked map item to a meeting room. */
function isMapRoom(item: BookableMapItem): item is MapRoom {
  return 'capacity' in item
}

function ConfirmModal({
  item, timeFrom, timeTo, date, onConfirm, onCancel,
}: {
  item: BookableMapItem; timeFrom: string; timeTo: string; date: string
  onConfirm: (from: string, to: string) => void; onCancel: () => void
}) {
  const isRoom = isMapRoom(item)
  const [selectedFrom, setSelectedFrom] = useState(timeFrom)
  const [selectedTo, setSelectedTo] = useState(timeTo)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const touchStartY = useRef<number | null>(null)

  const isUnavailable = item.status === 'busy' && item.bookedSlots.length === 0
  const fromIndex = timeIndex(selectedFrom)
  const toIndex = timeIndex(selectedTo)
  const canBook = !isUnavailable &&
    fromIndex >= 0 &&
    toIndex > fromIndex &&
    !hasBusySlotBetween(item.bookedSlots, selectedFrom, selectedTo)

  function handleSlotClick(slot: string) {
    if (item.bookedSlots.includes(slot)) return

    setRangeError(null)
    const clickedIndex = timeIndex(slot)
    if (clickedIndex < 0) return

    if (clickedIndex <= fromIndex || selectedTo) {
      setSelectedFrom(slot)
      setSelectedTo('')
      return
    }

    if (hasBusySlotBetween(item.bookedSlots, selectedFrom, slot)) {
      setRangeError('В выбранном интервале уже есть бронь')
      return
    }

    setSelectedTo(slot)
  }

  function handleSheetTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartY.current = e.touches[0]?.clientY ?? null
  }

  function handleSheetTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (touchStartY.current === null) return
    const deltaY = (e.changedTouches[0]?.clientY ?? touchStartY.current) - touchStartY.current
    touchStartY.current = null
    if (deltaY > SHEET_SWIPE_THRESHOLD) onCancel()
  }

  return (
    <>
      <div className={styles.overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <div
          className={styles.modalHandle}
          aria-hidden="true"
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
        />
        <div className={styles.modalTitle}>Подтвердите бронирование</div>
        <div className={styles.modalRoom}>{isRoom ? item.id : `Место ${item.id}`}</div>
        <div className={styles.modalDetails}>
          {[
            ...(isRoom ? [['Вместимость', item.capacity > 0 ? `до ${item.capacity} чел.` : '—']] : [['Зона', `Зона ${item.zone}`]]),
            ['Оснащение', item.amenities.length ? item.amenities.join(', ') : 'Нет'],
            ['Дата',      date],
          ].map(([label, value]) => (
            <div key={label} className={styles.modalRow}>
              <span className={styles.modalLabel}>{label}</span>
              <span>{value}</span>
            </div>
          ))}
          <div className={styles.modalRow}>
            <span className={styles.modalLabel}>Время</span>
            <span className={styles.modalTime}>{selectedFrom || '—'} — {selectedTo || '—'}</span>
          </div>
        </div>
        <div className={styles.timelineBlock}>
          <div className={styles.timelineHeader}>
            <span>Расписание дня</span>
            <span>{date}</span>
          </div>
          <div className={styles.timelineHint}>Выберите начало и конец свободного интервала</div>
          <div className={styles.timelineSlots}>
            {TIME_SLOTS.map(slot => {
              const index = timeIndex(slot)
              const isBusy = item.bookedSlots.includes(slot)
              const isStart = slot === selectedFrom
              const isEnd = slot === selectedTo
              const isRange = fromIndex >= 0 && toIndex > fromIndex && index > fromIndex && index < toIndex
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBusy}
                  className={`${styles.timelineSlot} ${isBusy ? styles.timelineSlotBusy : ''} ${(isStart || isEnd) ? styles.timelineSlotSelected : ''} ${isRange ? styles.timelineSlotRange : ''}`}
                  onClick={() => handleSlotClick(slot)}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          {isUnavailable && <div className={styles.timelineError}>Ресурс сейчас недоступен для бронирования</div>}
          {rangeError && <div className={styles.timelineError}>{rangeError}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnConfirm} onClick={() => onConfirm(selectedFrom, selectedTo)} disabled={!canBook}>Подтвердить</button>
          <button className={styles.btnCancelModal} onClick={onCancel}>Отмена</button>
        </div>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

/** Main office map screen with floor filters and resource booking flow. */
export default function MapPage() {
  const navigate = useNavigate()
  const { bookings, setBookings, user } = useAuth()
  const displayName = user ? `${user.surname} ${user.name?.charAt(0)}.` : ''

  const [zones,             setZones]             = useState<Zone[]>([])
  const [rooms,             setRooms]             = useState<MapRoom[]>([])
  const [resources,         setResources]         = useState<Resource[]>([])
  const [loading,           setLoading]           = useState(true)
  const [date,              setDate]              = useState(defaultDate())
  const [timeFrom,          setTimeFrom]          = useState(defaultTimeFrom())
  const [timeTo,            setTimeTo]            = useState('18:00')
  const [currentFloor,      setCurrentFloor]      = useState(20)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [confirmItem,           setConfirmItem]           = useState<BookableMapItem | null>(null)
  const [toast,                 setToast]                 = useState<string | null>(null)
  const [refreshKey,            setRefreshKey]            = useState(0)
  const [bookedSlotsByResource, setBookedSlotsByResource] = useState<Map<string, string[]>>(new Map())
  const [mobileSheetMode,       setMobileSheetMode]       = useState<MobileSheetMode>('peek')
  const mobileSheetTouchY = useRef<number | null>(null)
  const mobileFiltersOpen = mobileSheetMode === 'open'

  // Загружаем ресурсы при изменении фильтров
  useEffect(() => {
    const selectedFrom = new Date(`${date}T${timeFrom}:00`).toISOString()
    const selectedTo   = new Date(`${date}T${timeTo}:00`).toISOString()
    const dayFrom      = new Date(`${date}T00:00:00`).toISOString()
    const dayTo        = new Date(`${date}T23:59:59`).toISOString()
    setLoading(true)
    getResourcesList(['RESOURCE_TYPE_WORKSPACE', 'RESOURCE_TYPE_MEETING_ROOM'])
      .then(async all => {
        const mapResources = all.filter(r =>
          (r.type === 'RESOURCE_TYPE_WORKSPACE' || r.type === 'RESOURCE_TYPE_MEETING_ROOM') &&
          isResourceOnFloor(r, currentFloor)
        )
        const bookingsPerResource = await Promise.all(
          mapResources.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        const slotsByResource = new Map<string, string[]>()
        const marked = mapResources.map((r, i) => {
          const bs = bookingsPerResource[i]
          slotsByResource.set(
            r.resource_id,
            bs.filter(b => b.starts_at && b.ends_at)
              .flatMap(b => expandBookingToSlots(b.starts_at!, b.ends_at!))
          )
          const isBusy = bs.some(b =>
            b.starts_at && b.ends_at &&
            b.starts_at < selectedTo && b.ends_at > selectedFrom
          )
          return isBusy ? { ...r, status: 'RESOURCE_STATUS_MAINTENANCE' as const } : r
        })
        setBookedSlotsByResource(slotsByResource)
        setResources(marked)
      })
      .finally(() => setLoading(false))
  }, [date, timeFrom, timeTo, currentFloor, refreshKey])

  // Пересчитываем статусы мгновенно при изменении броней
  useEffect(() => {
    if (resources.length === 0) {
      setZones([])
      return
    }
    const myResourceIds = new Set(
      bookings
        .filter(b =>
          b.date === date &&
          b.timeFrom < timeTo &&
          b.timeTo > timeFrom
        )
        .map(b => b.resourceId)
    )
    setZones(resourcesToZones(resources.filter(r => r.type === 'RESOURCE_TYPE_WORKSPACE'), myResourceIds, bookedSlotsByResource))
    setRooms(resourcesToRooms(resources, myResourceIds, bookedSlotsByResource))
  }, [resources, bookings, date, timeFrom, timeTo, bookedSlotsByResource])

  /** Toggles one amenity filter in the map sidebar. */
  function toggleAmenity(a: string) {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    )
  }

  // Фильтрация зон по оснащению
  const filteredZones: Zone[] = selectedAmenities.length === 0
    ? zones
    : zones.map(zone => ({
        ...zone,
        desks: zone.desks.map(d =>
          selectedAmenities.every(a => d.amenities.includes(a))
            ? d
            : { ...d, status: 'busy' as const }
        ),
      }))

  /** Opens confirmation modal for a desk marker. */
  function handleDeskClick(desk: Desk) {
    setConfirmItem(desk)
  }

  /** Opens confirmation modal for a meeting-room marker. */
  function handleRoomClick(room: MapRoom) {
    setConfirmItem(room)
  }

  function handleMobileSheetTouchStart(e: TouchEvent<HTMLDivElement>) {
    mobileSheetTouchY.current = e.touches[0]?.clientY ?? null
  }

  function handleMobileSheetTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (mobileSheetTouchY.current === null) return
    const deltaY = (e.changedTouches[0]?.clientY ?? mobileSheetTouchY.current) - mobileSheetTouchY.current
    mobileSheetTouchY.current = null
    if (Math.abs(deltaY) < SHEET_SWIPE_THRESHOLD) return

    setMobileSheetMode(current => {
      if (deltaY < 0) {
        if (current === 'hidden') return 'peek'
        return 'open'
      }
      if (current === 'open') return 'peek'
      return 'hidden'
    })
  }

  /** Creates the booking and refreshes map state after successful confirmation. */
  async function handleConfirm(selectedFrom: string, selectedTo: string) {
    if (!confirmItem || !user || !confirmItem.resourceId) return

    const bookingStart = new Date(`${date}T${selectedFrom}:00`)
    if (bookingStart <= new Date()) {
      setConfirmItem(null)
      setToast('Выберите время в будущем')
      setTimeout(() => setToast(null), 3500)
      return
    }

    const userId = user.id
    const resourceId = confirmItem.resourceId
    const item = confirmItem
    setConfirmItem(null)
    try {
      const newBooking = await createBooking(resourceId, userId, date, selectedFrom, selectedTo)
      setBookings(prev => [...prev, newBooking])
      setTimeFrom(selectedFrom)
      setTimeTo(selectedTo)
      setRefreshKey(k => k + 1)
      setToast(`${isMapRoom(item) ? item.id : `Место ${item.id}`} забронировано на ${selectedFrom}–${selectedTo}`)
    } catch {
      setToast('Не удалось забронировать. Попробуйте ещё раз.')
    }
    setTimeout(() => setToast(null), 3500)
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
        <MapSidebar
          selectedAmenities={selectedAmenities}
          toggleAmenity={toggleAmenity}
          currentFloor={currentFloor}
          setCurrentFloor={setCurrentFloor}
          date={date}
          setDate={setDate}
          timeFrom={timeFrom}
          setTimeFrom={setTimeFrom}
          timeTo={timeTo}
          setTimeTo={setTimeTo}
          bookings={bookings}
        />

        {/* Контент */}
        <main className={styles.content}>
          <div className={styles.mobileTopbar}>
            <div className={styles.mobileBrand}>
              <div className={styles.logoSq}>T1</div>
              <span>Workspace</span>
            </div>
            <div className={styles.mobileTopbarRight}>
              <NotificationCenter />
              {displayName && <span className={styles.mobileUser}>{displayName}</span>}
              <button
                className={styles.mobileIconBtn}
                type="button"
                aria-label="Выйти"
                onClick={() => {
                  localStorage.removeItem('access_token')
                  navigate('/login')
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.mobileMapControls}>
            <div className={styles.mobileFloorPicker} aria-label="Выбор этажа">
              {[20, 21, 22].map(floor => (
                <button
                  key={floor}
                  type="button"
                  className={`${styles.mobileFloorBtn} ${currentFloor === floor ? styles.mobileFloorBtnActive : ''}`}
                  onClick={() => setCurrentFloor(floor)}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Карта офиса</h1>
              <div className={styles.pageLocation}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                БЦ «Арена», {currentFloor} этаж
              </div>
            </div>
            <div className={styles.pageHint}>
              Нажмите на стол или переговорную чтобы забронировать
            </div>
          </div>

          <div className={styles.mapPanel}>
            {loading
              ? <div className={styles.loading}>Загрузка...</div>
              : <OfficeMap zones={filteredZones} rooms={rooms} onDeskClick={handleDeskClick} onRoomClick={handleRoomClick} />
            }
          </div>

          <MapLegend />

          <section
            className={`${styles.mobileSheet} ${mobileSheetMode === 'hidden' ? styles.mobileSheetHidden : ''} ${mobileSheetMode === 'open' ? styles.mobileSheetOpen : ''}`}
          >
            <div
              className={styles.mobileSheetHandle}
              aria-hidden="true"
              onTouchStart={handleMobileSheetTouchStart}
              onTouchEnd={handleMobileSheetTouchEnd}
            />
            <div className={styles.mobileSheetHeader}>
              <div>
                <div className={styles.mobileSheetTitle}>БЦ «Арена», {currentFloor} этаж</div>
                <div className={styles.mobileSheetMeta}>{date} · {timeFrom}–{timeTo}</div>
              </div>
              <button
                type="button"
                className={styles.mobileSheetToggle}
                onClick={() => setMobileSheetMode(mode => mode === 'open' ? 'peek' : 'open')}
              >
                {mobileFiltersOpen ? 'Готово' : 'Параметры'}
              </button>
            </div>
            <div className={styles.mobileQuickNav} aria-label="Разделы">
              <button type="button" className={styles.mobileQuickNavBtn} onClick={() => navigate('/map')}>
                <IconMap />
                Карта
              </button>
              <button type="button" className={styles.mobileQuickNavBtn} onClick={() => navigate('/equipment')}>
                <IconMonitor />
                Техника
              </button>
              <button type="button" className={styles.mobileQuickNavBtn} onClick={() => navigate('/bookings')}>
                <IconFile />
                Брони
              </button>
            </div>
            <MapLegend className={styles.mobileLegend} />
            <div className={styles.mobileSheetPanel}>
              <div className={styles.mobileField}>
                <span className={styles.mobileFieldLabel}>Дата</span>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className={styles.mobileDateInput}
                />
              </div>
              <div className={styles.mobileField}>
                <span className={styles.mobileFieldLabel}>Время</span>
                <div className={styles.mobileTimeRow}>
                  <TimeSelect value={timeFrom} onChange={setTimeFrom} className={styles.mobileTimeInput} />
                  <span className={styles.timeSep}>—</span>
                  <TimeSelect value={timeTo} onChange={setTimeTo} className={styles.mobileTimeInput} />
                </div>
              </div>
              <div className={styles.mobileField}>
                <span className={styles.mobileFieldLabel}>Оснащение</span>
                <div className={styles.mobileAmenityList}>
                  {ALL_AMENITIES.map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`${styles.amenityBtn} ${styles.mobileAmenityBtn} ${selectedAmenities.includes(a) ? styles.amenityBtnActive : ''}`}
                      onClick={() => toggleAmenity(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {confirmItem && (
        <ConfirmModal
          item={confirmItem}
          timeFrom={timeFrom}
          timeTo={timeTo}
          date={date}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmItem(null)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
