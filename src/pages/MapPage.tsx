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

// TODO: remove stub when backend is ready
const STUB_RESOURCES: Resource[] = [
  { resource_id: 'stub-resource-a1', name: 'A-1', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a2', name: 'A-2', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a3', name: 'A-3', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a4', name: 'A-4', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a5', name: 'A-5', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a6', name: 'A-6', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a7', name: 'A-7', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a8', name: 'A-8', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a9', name: 'A-9', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a10', name: 'A-10', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a11', name: 'A-11', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a12', name: 'A-12', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a13', name: 'A-13', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: true }, created_at:'', updated_at:'' },
  { resource_id: 'stub-resource-a14', name: 'A-14', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-a15', name: 'A-15', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло А', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },


  { resource_id: 'stub-resource-b1', name: 'B-1', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Б', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-b2', name: 'B-2', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Б', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-b3', name: 'B-3', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Б', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-b4', name: 'B-4', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Б', status: 'RESOURCE_STATUS_MAINTENANCE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  
  
  { resource_id: 'stub-resource-d1', name: 'D-1', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d2', name: 'D-2', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d3', name: 'D-3', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d4', name: 'D-4', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d5', name: 'D-5', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d6', name: 'D-6', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d7', name: 'D-7', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d8', name: 'D-8', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d9', name: 'D-9', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d10', name: 'D-10', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d11', name: 'D-11', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d12', name: 'D-12', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d13', name: 'D-13', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d14', name: 'D-14', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d15', name: 'D-15', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: false }, created_at: '', updated_at: '' }, 
  { resource_id: 'stub-resource-d16', name: 'D-16', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d17', name: 'D-17', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_AVAILABLE', workspace: { has_monitor: true }, created_at: '', updated_at: '' },
  { resource_id: 'stub-resource-d18', name: 'D-18', type: 'RESOURCE_TYPE_WORKSPACE', location: '11 этаж · Крыло Д', status: 'RESOURCE_STATUS_OCCUPIED', workspace: { has_monitor: false }, created_at: '', updated_at: '' },
]

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
  const [error] = useState<string | null>(null)
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null)
  const { bookings } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const myResourceIds = new Set(bookings.map(b => b.resourceId))
    getResourcesList(['RESOURCE_TYPE_WORKSPACE'])
      .then(resources => setZones(resourcesToZones(STUB_RESOURCES, myResourceIds)))
      .catch(() => setZones(resourcesToZones(STUB_RESOURCES, myResourceIds)))
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
