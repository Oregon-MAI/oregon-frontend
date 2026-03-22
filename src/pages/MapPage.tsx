import Layout from '../components/Layout'
import OfficeMap from '../components/OfficeMap/OfficeMap'
import type { Zone, Desk } from '../types/map'
import styles from './MapPage.module.css'
import { useState } from 'react'
import BookingPanel from '../components/BookingPanel/BookingPanel'



// ЗАГЛУШКА — заменить на fetch() когда бэкенд готов
// GET /api/v1/floors/11/zones
const MOCK_ZONES: Zone[] = [
  {
    id: 'A',
    name: 'ЗОНА A — РАЗРАБОТКА',
    desks: [
      { id: 'A1',  zone: 'A', zoneName: 'Разработка', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'A2',  zone: 'A', zoneName: 'Разработка', status: 'busy',  amenities: [], bookedSlots: ['09:00', '09:15'] },
      { id: 'A3',  zone: 'A', zoneName: 'Разработка', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'A4',  zone: 'A', zoneName: 'Разработка', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'A6',  zone: 'A', zoneName: 'Разработка', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'A8',  zone: 'A', zoneName: 'Разработка', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'A11', zone: 'A', zoneName: 'Разработка', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'A15', zone: 'A', zoneName: 'Разработка', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'A17', zone: 'A', zoneName: 'Разработка', status: 'busy',  amenities: [], bookedSlots: [] },
    ],
  },
  {
    id: 'B',
    name: 'ЗОНА B — АНАЛИТИКА',
    desks: [
      { id: 'B3',  zone: 'B', zoneName: 'Аналитика', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'B5',  zone: 'B', zoneName: 'Аналитика', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'B7',  zone: 'B', zoneName: 'Аналитика', status: 'mine',  amenities: ['Wi-Fi', 'Монитор', 'Клавиатура', 'Мышь'], bookedSlots: [] },
      { id: 'B13', zone: 'B', zoneName: 'Аналитика', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'B15', zone: 'B', zoneName: 'Аналитика', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'B17', zone: 'B', zoneName: 'Аналитика', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'B20', zone: 'B', zoneName: 'Аналитика', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'B2`', zone: 'B', zoneName: 'Аналитика', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },

    ],
  },
  {
    id: 'C',
    name: 'ЗОНА C — ПРОДУКТ',
    desks: [
      { id: 'C1',  zone: 'C', zoneName: 'Продукт', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'C4',  zone: 'C', zoneName: 'Продукт', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'C6',  zone: 'C', zoneName: 'Продукт', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'C7',  zone: 'C', zoneName: 'Продукт', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'C13', zone: 'C', zoneName: 'Продукт', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'C15', zone: 'C', zoneName: 'Продукт', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'C18', zone: 'C', zoneName: 'Продукт', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
    ],
  },
  {
    id: 'D',
    name: 'ЗОНА D — ТИХАЯ ЗОНА',
    desks: [
      { id: 'D2',  zone: 'D', zoneName: 'Тихая зона', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'D4',  zone: 'D', zoneName: 'Тихая зона', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'D5',  zone: 'D', zoneName: 'Тихая зона', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'D7',  zone: 'D', zoneName: 'Тихая зона', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'D11', zone: 'D', zoneName: 'Тихая зона', status: 'busy',  amenities: [], bookedSlots: [] },
      { id: 'D13', zone: 'D', zoneName: 'Тихая зона', status: 'free',  amenities: ['Wi-Fi'], bookedSlots: [] },
      { id: 'D16', zone: 'D', zoneName: 'Тихая зона', status: 'free',  amenities: ['Wi-Fi', 'Монитор'], bookedSlots: [] },
      { id: 'D18', zone: 'D', zoneName: 'Тихая зона', status: 'busy',  amenities: [], bookedSlots: [] },
    ],
  },
]

export default function MapPage() {
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null)

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
      <button className={styles.tab}>Переговорные</button>
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

    <OfficeMap zones={MOCK_ZONES} onDeskClick={handleDeskClick} />
      <BookingPanel
        desk={selectedDesk}
        onClose={() => setSelectedDesk(null)}
      />
    </Layout>
)
}
