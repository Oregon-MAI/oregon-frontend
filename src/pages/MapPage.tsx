import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/model/AuthContext'
import { createBooking, getResourceBookings } from '../features/bookings/api/bookingApi'
import OfficeMap from '../components/OfficeMap/OfficeMap'
import NotificationCenter from '../components/NotificationCenter'
import type { Zone, Desk } from '../types/map'
import type { Resource } from '../types/resource'
import styles from './MapPage.module.css'
import { getResourcesList } from '../features/resources/api/resourceApi'
import TimeSelect from '../components/TimeSelect'

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

// ─── Converter ────────────────────────────────────────────────────────────────

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function expandBookingToSlots(startsAt: string, endsAt: string): string[] {
  const slots: string[] = []
  const cur = new Date(startsAt)
  const end = new Date(endsAt)
  while (cur < end) {
    slots.push(isoToTime(cur.toISOString()))
    cur.setMinutes(cur.getMinutes() + 15)
  }
  return slots
}

function isResourceOnFloor(resource: Resource, floor: number): boolean {
  const location = resource.location?.trim()
  if (!location) return floor === 11

  return new RegExp(`(^|\\D)${floor}(\\D|$)`).test(location)
}

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

function ConfirmModal({
  desk, timeFrom, timeTo, date, onConfirm, onCancel,
}: {
  desk: Desk; timeFrom: string; timeTo: string; date: string
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <>
      <div className={styles.overlay} onClick={onCancel} />
      <div className={styles.modal}>
        <div className={styles.modalTitle}>Подтвердите бронирование</div>
        <div className={styles.modalRoom}>Место {desk.id}</div>
        <div className={styles.modalDetails}>
          {[
            ['Зона',      `Зона ${desk.zone}`],
            ['Оснащение', desk.amenities.length ? desk.amenities.join(', ') : 'Нет'],
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

export default function MapPage() {
  const navigate = useNavigate()
  const { bookings, setBookings, user } = useAuth()
  const displayName = user ? `${user.surname} ${user.name?.charAt(0)}.` : ''

  const [zones,             setZones]             = useState<Zone[]>([])
  const [resources,         setResources]         = useState<Resource[]>([])
  const [loading,           setLoading]           = useState(true)
  const [date,              setDate]              = useState(defaultDate())
  const [timeFrom,          setTimeFrom]          = useState(defaultTimeFrom())
  const [timeTo,            setTimeTo]            = useState('18:00')
  const [currentFloor,      setCurrentFloor]      = useState(11)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [confirmDesk,           setConfirmDesk]           = useState<Desk | null>(null)
  const [toast,                 setToast]                 = useState<string | null>(null)
  const [refreshKey,            setRefreshKey]            = useState(0)
  const [bookedSlotsByResource, setBookedSlotsByResource] = useState<Map<string, string[]>>(new Map())

  // Загружаем ресурсы при изменении фильтров
  useEffect(() => {
    const selectedFrom = new Date(`${date}T${timeFrom}:00`).toISOString()
    const selectedTo   = new Date(`${date}T${timeTo}:00`).toISOString()
    const dayFrom      = new Date(`${date}T00:00:00`).toISOString()
    const dayTo        = new Date(`${date}T23:59:59`).toISOString()
    setLoading(true)
    getResourcesList(['RESOURCE_TYPE_WORKSPACE'])
      .then(async all => {
        const workspaces = all.filter(r =>
          r.type === 'RESOURCE_TYPE_WORKSPACE' && isResourceOnFloor(r, currentFloor)
        )
        const bookingsPerResource = await Promise.all(
          workspaces.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        const slotsByResource = new Map<string, string[]>()
        const marked = workspaces.map((r, i) => {
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
    if (resources.length === 0) return
    const myResourceIds = new Set(
      bookings
        .filter(b =>
          b.date === date &&
          b.timeFrom < timeTo &&
          b.timeTo > timeFrom
        )
        .map(b => b.resourceId)
    )
    setZones(resourcesToZones(resources, myResourceIds, bookedSlotsByResource))
  }, [resources, bookings, date, timeFrom, timeTo, bookedSlotsByResource])

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

  function handleDeskClick(desk: Desk) {
    if (desk.status === 'busy' || desk.status === 'mine') return
    setConfirmDesk(desk)
  }

  async function handleConfirm() {
    if (!confirmDesk || !user || !confirmDesk.resourceId) return

    const bookingStart = new Date(`${date}T${timeFrom}:00`)
    if (bookingStart <= new Date()) {
      setConfirmDesk(null)
      setToast('Выберите время в будущем')
      setTimeout(() => setToast(null), 3500)
      return
    }

    const userId = user.id
    const resourceId = confirmDesk.resourceId
    const desk = confirmDesk
    setConfirmDesk(null)
    try {
      const newBooking = await createBooking(resourceId, userId, date, timeFrom, timeTo)
      setBookings(prev => [...prev, newBooking])
      setRefreshKey(k => k + 1)
      setToast(`Место ${desk.id} забронировано на ${timeFrom}–${timeTo}`)
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

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>Рабочие места</button>
            <button className={styles.tab} onClick={() => navigate('/rooms')}>Переговорные</button>
          </div>

          <div className={styles.legend}>
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
              Моё место
            </div>
          </div>

          {loading
            ? <div className={styles.loading}>Загрузка...</div>
            : <OfficeMap zones={filteredZones} onDeskClick={handleDeskClick} />
          }
        </main>
      </div>

      {confirmDesk && (
        <ConfirmModal
          desk={confirmDesk}
          timeFrom={timeFrom}
          timeTo={timeTo}
          date={date}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmDesk(null)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
