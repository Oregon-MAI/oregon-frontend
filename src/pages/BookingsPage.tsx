import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyBookings, cancelBooking, getResourcesList } from '../api/resourceApi'
import type { Booking } from '../types/map'
import type { Resource } from '../types/resource'
import styles from './BookingsPage.module.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIMELINE_START = 9 * 60  // 09:00 in minutes
const TIMELINE_END   = 18 * 60 // 18:00 in minutes
const TIMELINE_MINS  = TIMELINE_END - TIMELINE_START
const HOURS = Array.from({ length: 10 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`)

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function barStyle(timeFrom: string, timeTo: string) {
  const start = Math.max(toMins(timeFrom), TIMELINE_START)
  const end   = Math.min(toMins(timeTo),   TIMELINE_END)
  const left  = ((start - TIMELINE_START) / TIMELINE_MINS) * 100
  const width = ((end - start) / TIMELINE_MINS) * 100
  return { left: `${left}%`, width: `${Math.max(width, 0)}%` }
}

function nowPct() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  return ((mins - TIMELINE_START) / TIMELINE_MINS) * 100
}

function isActiveNow(b: EnrichedBooking) {
  const today = new Date().toISOString().slice(0, 10)
  if (b.date !== today) return false
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  return toMins(b.timeFrom) <= now && now < toMins(b.timeTo)
}

function isUpcoming(b: EnrichedBooking) {
  const today = new Date().toISOString().slice(0, 10)
  if (b.date < today) return false
  if (b.date === today) {
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    return toMins(b.timeFrom) > now
  }
  return true
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')
}

function getWeekRange(base: Date) {
  const d = new Date(base)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  const start = new Date(d)
  const end = new Date(d)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

function fmtWeek(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const s = start.toLocaleDateString('ru-RU', opts).replace(' г.', '')
  const e = end.toLocaleDateString('ru-RU', opts).replace(' г.', '')
  // same month — collapse
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${e}`
  }
  return `${start.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'long' })} – ${e}`
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceType = 'workspace' | 'room' | 'device'

interface EnrichedBooking extends Booking {
  resourceType: ResourceType
  meta: string  // floor · location info
}

function detectType(r: Resource): ResourceType {
  if (r.type === 'RESOURCE_TYPE_MEETING_ROOM') return 'room'
  if (r.type === 'RESOURCE_TYPE_DEVICE')       return 'device'
  return 'workspace'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}
function IconMonitor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
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
function IconChevLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
}
function IconChevRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
}

// ─── Group section ────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<ResourceType, string> = {
  workspace: 'Рабочие места',
  room:      'Переговорные',
  device:    'Техника',
}

function GroupSection({
  type, bookings, nowLine, onCancel,
}: {
  type: ResourceType
  bookings: EnrichedBooking[]
  nowLine: number
  onCancel: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  if (!bookings.length) return null

  return (
    <>
      <tr className={styles.groupRow} onClick={() => setOpen(o => !o)}>
        <td colSpan={2} className={styles.groupCell}>
          <span className={styles.groupToggle}>{open ? '▾' : '▸'}</span>
          {GROUP_LABELS[type]}
        </td>
      </tr>
      {open && bookings.map(b => {
        const active = isActiveNow(b)
        const bs = barStyle(b.timeFrom, b.timeTo)
        return (
          <tr key={b.id} className={styles.bookingRow}>
            <td className={styles.nameCell}>
              <div className={styles.bookingName}>{b.resourceName}</div>
              <div className={styles.bookingMeta}>{fmtDate(b.date)} · {b.meta}</div>
            </td>
            <td className={styles.timelineCell}>
              {/* Линия текущего времени */}
              {nowLine >= 0 && nowLine <= 100 && (
                <div className={styles.nowLine} style={{ left: `${nowLine}%` }} />
              )}
              <div
                className={`${styles.bar} ${type === 'room' ? styles.barRoom : styles.barFill}`}
                style={bs}
              >
                <span className={styles.barLabel}>
                  {b.resourceName} · {b.timeFrom}–{b.timeTo}
                </span>
                {active && <span className={styles.nowBadge}>Сейчас</span>}
              </div>
              <button
                className={styles.cancelBarBtn}
                title="Отменить"
                onClick={() => onCancel(b.id)}
              >×</button>
            </td>
          </tr>
        )
      })}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const navigate = useNavigate()
  const { user, bookings: ctxBookings, setBookings } = useAuth()
  const displayName = user ? `${user.surname} ${user.name?.charAt(0)}.` : ''

  const [bookings,     setLocal]     = useState<EnrichedBooking[]>([])
  const [weekBase,     setWeekBase]  = useState(new Date())
  const [toast,        setToast]     = useState<string | null>(null)
  const [nowPct_,      setNowPct]    = useState(nowPct())

  const { start: weekStart, end: weekEnd } = getWeekRange(weekBase)

  // Обновляем линию текущего времени каждую минуту
  useEffect(() => {
    const id = setInterval(() => setNowPct(nowPct()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Загружаем брони + ресурсы для определения типов
  useEffect(() => {
    if (!user?.id) return
    let rawBookings: Booking[] = ctxBookings

    getMyBookings(user.id)
      .then(b => { rawBookings = b; setBookings(b) })
      .catch(() => {})
      .finally(async () => {
        try {
          const resources = await getResourcesList()
          const resMap = new Map<string, Resource>(resources.map(r => [r.resource_id, r]))

          const enriched: EnrichedBooking[] = rawBookings.map(b => {
            const r = resMap.get(b.resourceId)
            // Use resource type from booking response if available, else detect from resource
            const rType: ResourceType = b.resourceType
              ? (b.resourceType === 'RESOURCE_TYPE_MEETING_ROOM' ? 'room'
                : b.resourceType === 'RESOURCE_TYPE_DEVICE' ? 'device'
                : 'workspace')
              : (r ? detectType(r) : 'workspace')
            // Fill resource name from resource list if not provided by booking service
            const resourceName = b.resourceName && b.resourceName !== b.resourceId
              ? b.resourceName
              : (r?.name ?? b.resourceId)
            const meta = r
              ? [r.location, r.meeting_room?.capacity ? `до ${r.meeting_room.capacity} чел.` : ''].filter(Boolean).join(' · ')
              : (b.resourceLocation ?? '')
            return { ...b, resourceName, resourceType: rType, meta }
          })
          setLocal(enriched)
        } catch {
          const enriched: EnrichedBooking[] = rawBookings.map(b => ({
            ...b, resourceType: 'workspace' as ResourceType, meta: b.resourceLocation ?? '',
          }))
          setLocal(enriched)
        }
      })
  }, [user?.id]) // eslint-disable-line

  // Фильтрация по выбранной неделе
  const weekBookings = bookings.filter(b => {
    return b.date >= isoDate(weekStart) && b.date <= isoDate(weekEnd)
  })

  const byType = (t: ResourceType) => weekBookings.filter(b => b.resourceType === t)

  const activeNow  = bookings.filter(isActiveNow)
  const upcoming   = bookings.filter(isUpcoming).sort((a, b) =>
    a.date === b.date ? a.timeFrom.localeCompare(b.timeFrom) : a.date.localeCompare(b.date)
  )

  const today      = new Date().toISOString().slice(0, 10)
  const todayList  = bookings.filter(b => b.date === today)

  async function handleCancel(id: string) {
    try {
      await cancelBooking(id)
      setLocal(prev => prev.filter(b => b.id !== id))
      setBookings(ctxBookings.filter(b => b.id !== id))
      showToast('Бронь отменена')
    } catch {
      showToast('Не удалось отменить бронь')
    }
  }

  function showToast(msg: string) {
    setToast(msg)
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
          <button className={styles.sideBtn} onClick={() => navigate('/equipment')}>
            <IconMonitor /> Техника
          </button>
          <button className={`${styles.sideBtn} ${styles.sideBtnCurrent}`}>
            <IconFile /> Мои брони
          </button>

          {/* Сегодня */}
          {todayList.length > 0 && (
            <div className={styles.todayWidget}>
              <div className={styles.todayLabel}>Сегодня</div>
              {todayList.map((b, i) => (
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

        {/* Основной контент */}
        <main className={styles.content}>
          {/* Шапка */}
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Мои брони</h1>
            <div className={styles.weekNav}>
              <button className={styles.weekBtn} onClick={() => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}>
                <IconChevLeft />
              </button>
              <span className={styles.weekLabel}>{fmtWeek(weekStart, weekEnd)}</span>
              <button className={styles.weekBtn} onClick={() => setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}>
                <IconChevRight />
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.nameHead}>Бронь</th>
                  <th className={styles.timelineHead}>
                    <div className={styles.hoursRow}>
                      {HOURS.map(h => (
                        <span key={h} className={styles.hour}>{h}</span>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <GroupSection type="workspace" bookings={byType('workspace')} nowLine={nowPct_} onCancel={handleCancel} />
                <GroupSection type="room"      bookings={byType('room')}      nowLine={nowPct_} onCancel={handleCancel} />
                <GroupSection type="device"    bookings={byType('device')}    nowLine={nowPct_} onCancel={handleCancel} />
                {weekBookings.length === 0 && (
                  <tr>
                    <td colSpan={2} className={styles.empty}>
                      Нет броней на выбранной неделе
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* Правая панель */}
        <aside className={styles.rightPanel}>
          {activeNow.length > 0 && (
            <div className={styles.rightSection}>
              <div className={styles.rightLabel}>Активные сейчас</div>
              {activeNow.map(b => (
                <div key={b.id} className={styles.rightCard}>
                  <div className={styles.rightCardName}>{b.resourceName}</div>
                  <div className={styles.rightCardMeta}>{b.meta}</div>
                  <div className={styles.rightCardTime}>{b.timeFrom}–{b.timeTo}</div>
                  <span className={styles.badgeNow}>Сейчас</span>
                </div>
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div className={styles.rightSection}>
              <div className={styles.rightLabel}>Предстоящие</div>
              {upcoming.map(b => (
                <div key={b.id} className={styles.rightCard}>
                  <div className={styles.rightCardTop}>
                    <div>
                      <div className={styles.rightCardName}>{b.resourceName}</div>
                      <div className={styles.rightCardMeta}>{b.meta}</div>
                      <div className={styles.rightCardTime}>{b.timeFrom}–{b.timeTo}</div>
                    </div>
                    <div className={styles.rightCardDate}>{fmtDate(b.date)}</div>
                  </div>
                  <button className={styles.cancelBtn} onClick={() => handleCancel(b.id)}>×</button>
                </div>
              ))}
            </div>
          )}

          {activeNow.length === 0 && upcoming.length === 0 && (
            <div className={styles.rightEmpty}>Нет активных броней</div>
          )}
        </aside>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
