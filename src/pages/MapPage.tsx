import Layout from '../components/Layout'
import OfficeMap from '../components/OfficeMap/OfficeMap'
import type { Zone, Desk } from '../types/map'
import type { Resource } from '../types/resource'
import styles from './MapPage.module.css'
import { useState, useEffect } from 'react'
import BookingPanel from '../components/BookingPanel/BookingPanel'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getResourcesList } from '../api/resourceApi'

function resourcesToZones(resources: Resource[], myResourceIds: Set<string>): Zone[] {
  const zoneMap = new Map<'A' | 'B' | 'D', Desk[]>()

  for (const r of resources) {
    const zoneKey = r.name[0]?.toUpperCase() as 'A' | 'B' | 'D'
    if (!['A', 'B', 'D'].includes(zoneKey)) continue

    const amenities: string[] = []
    if (r.workspace?.has_monitor) amenities.push('Монитор')

    const isMine = myResourceIds.has(r.resource_id)
    const status: 'free' | 'busy' | 'mine' =
      isMine ? 'mine' :
      r.status === 'RESOURCE_STATUS_AVAILABLE' ? 'free' : 'busy'

    const desk: Desk = {
      resourceId: r.resource_id,
      id: r.name,
      zone: zoneKey,
      status,
      amenities,
      bookedSlots: [],
    }

    if (!zoneMap.has(zoneKey)) zoneMap.set(zoneKey, [])
    zoneMap.get(zoneKey)!.push(desk)
  }

  return Array.from(zoneMap.entries()).map(([id, desks]) => ({
    id,
    name: `Зона ${id}`,
    desks,
  }))
}

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null)
  const { bookings } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const myResourceIds = new Set(bookings.map(b => b.resourceId))
    getResourcesList(['RESOURCE_TYPE_WORKSPACE'])
      .then(resources => setZones(resourcesToZones(resources, myResourceIds)))
      .catch(() => setError('Не удалось загрузить карту рабочих мест'))
      .finally(() => setLoading(false))
  }, [bookings])
  function handleDeskClick(desk: Desk) {
    setSelectedDesk(desk)
  }
  function IconPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}
  return (
  <Layout>
    {/* Заголовок */}
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderLeft}>
        <h1 className={styles.pageTitle}>Карта офиса</h1>
        <div className={styles.pageLocation}>
          <IconPin />
          БЦ «Арена», 11 этаж
        </div>
      </div>
      <div className={styles.pageHint}>
        Нажмите на стол или переговорную чтобы забронировать
      </div>
    </div>

    {/* Вкладки */}
    <div className={styles.tabs}>
      <button className={`${styles.tab} ${styles.tabActive}`}>Рабочие места</button>
      <button className={styles.tab} onClick={() => navigate('/rooms')}>
  Переговорные
</button>
    </div>

    {/* Легенда */}
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
      <div className={styles.legendItem}>
        <div className={`${styles.legendDot} ${styles.dotRoom}`} />
        Переговорная
      </div>
    </div>

    {error && <div className={styles.error}>{error}</div>}
    {loading
      ? <div className={styles.loading}>Загрузка...</div>
      : <OfficeMap zones={zones} onDeskClick={handleDeskClick} />
    }
      <BookingPanel
        desk={selectedDesk}
        onClose={() => setSelectedDesk(null)}
      />
    </Layout>
)
}
