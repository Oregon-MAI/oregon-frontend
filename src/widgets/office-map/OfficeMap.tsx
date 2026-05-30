import type { Zone, Desk, MapRoom } from '../../shared/types/map'
import type { CSSProperties } from 'react'
import { parseWorkspaceLocation } from '../../features/resources/lib/workspaceLocation'
import styles from './OfficeMap.module.css'

interface Props {
  zones: Zone[]
  rooms?: MapRoom[]
  onDeskClick?: (desk: Desk) => void
  onRoomClick?: (room: MapRoom) => void
}

type SeatPoint = {
  x: number
  y: number
  rotate?: number
}

const SEAT_POINTS: SeatPoint[] = [
  { x: 72, y: 25 }, { x: 112, y: 25 }, { x: 152, y: 25 },
  { x: 190, y: 24 }, { x: 232, y: 24 }, { x: 272, y: 24 },
  { x: 315, y: 24 }, { x: 356, y: 24 }, { x: 397, y: 24 },
  { x: 438, y: 24 }, { x: 479, y: 24 }, { x: 520, y: 24 },
  { x: 560, y: 24 }, { x: 603, y: 24 }, { x: 646, y: 24 },
  { x: 690, y: 24 }, { x: 732, y: 24 }, { x: 776, y: 24 },
  { x: 900, y: 48, rotate: 90 }, { x: 972, y: 48, rotate: 90 },
  { x: 905, y: 150 }, { x: 955, y: 150 },
  { x: 905, y: 230 }, { x: 955, y: 230 },
  { x: 905, y: 305 }, { x: 955, y: 305 },
  { x: 820, y: 385 }, { x: 870, y: 385 }, { x: 920, y: 385 }, { x: 970, y: 385 },
  { x: 820, y: 455 }, { x: 870, y: 455 }, { x: 920, y: 455 }, { x: 970, y: 455 },
  { x: 785, y: 548 }, { x: 835, y: 548 }, { x: 885, y: 548 }, { x: 935, y: 548 },
  { x: 110, y: 115 }, { x: 145, y: 115 },
  { x: 250, y: 145, rotate: 90 }, { x: 330, y: 145, rotate: 90 }, { x: 420, y: 145, rotate: 90 },
  { x: 152, y: 360 }, { x: 190, y: 360 }, { x: 230, y: 360 },
  { x: 152, y: 440 }, { x: 190, y: 440 }, { x: 230, y: 440 },
  { x: 370, y: 415, rotate: 90 }, { x: 420, y: 415, rotate: 90 },
  { x: 145, y: 560 }, { x: 185, y: 560 }, { x: 225, y: 560 },
  { x: 585, y: 560 }, { x: 630, y: 560 },
  { x: 705, y: 560 }, { x: 750, y: 560 },
]

function deskOrder(desk: Desk): number {
  const match = desk.id.match(/\d+/)
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER
}

function flattenDesks(zones: Zone[]): Desk[] {
  const byZone = new Map(zones.map(zone => [zone.id, zone.desks]))
  return (['A', 'B', 'D'] as const)
    .flatMap(zone => [...(byZone.get(zone) ?? [])].sort((a, b) => deskOrder(a) - deskOrder(b)))
}

function colorForDesk(desk: Desk): string {
  if (desk.status === 'mine') return '#1A56DB'
  if (desk.status === 'busy') return '#9CA3AF'
  return '#A7F3D0'
}

function textForDesk(desk: Desk): string {
  if (desk.status === 'mine') return '#ffffff'
  if (desk.status === 'busy') return '#ffffff'
  return '#047857'
}

export const FLOOR_PLAN_VIEWBOX = {
  width: 1094,
  height: 656,
}

export function FloorPlanSvg() {
  return (
    <svg className={styles.floorSvg} viewBox="0 0 1094 656" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g className={styles.walls}>
        <line x1="57.4571" y1="77.3563" x2="1.45707" y2="306.356" />
        <path d="M0.1346 304.506L108 312.5" />
        <path d="M106.5 424.428L179.5 424.428" />
        <path d="M176 424.524L214 424.524M239 424.524L277 424.524" />
        <path d="M78.5001 310L99.75 298.25L121 286.5" />
        <path d="M120 287H191H262" />
        <path d="M34 168L109.5 168L185 168" />
        <path d="M54 95L118.5 95L183 95" />
        <path d="M183 76H204H225" />
        <path d="M242 76L252.5 76L263 76" />
        <path d="M263 2L263 39L263 76" />
        <path d="M263 76H284H305" />
        <path d="M322 76L332.5 76L343 76" />
        <path d="M343 2L343 39L343 76" />
        <path d="M343 76H364H385" />
        <path d="M402 76L412.5 76L423 76" />
        <path d="M423 2L423 39L423 76" />
        <path d="M211 174L211 216L211 258" />
        <path d="M249 174L249 216L249 258" />
        <path d="M452 102L452 141.5L452 181" />
        <path d="M268 102L268 141.5L268 181" />
        <path d="M330 102L330 141.5L330 181" />
        <path d="M249 214H230H211" />
        <path d="M452 179H358.5L265 179" />
        <path d="M423 76H444H465" />
        <path d="M482 76L492.5 76L503 76" />
        <path d="M503 2L503 39L503 76" />
        <path d="M503 76H524H545" />
        <path d="M562 76L572.5 76L583 76" />
        <path d="M583 2L583 39L583 76" />
        <path d="M579 76H600H621" />
        <path d="M638 76L648.5 76L659 76" />
        <path d="M659 2L659 39L659 76" />
        <path d="M659 76H680H701" />
        <path d="M718 76L728.5 76L739 76" />
        <path d="M739 2V54V106" />
        <path d="M864 3V54.5V106" />
        <path d="M897 104L897 128L897 152" />
        <path d="M897 167L897 172.5L897 178" />
        <path d="M1012 104L949 104H886" />
        <path d="M1012 176L954.5 176L897 176" />
        <path d="M897 176L897 203.5L897 231" />
        <path d="M897 246L897 251.5L897 257" />
        <path d="M1012 255L954.5 255L897 255" />
        <path d="M864 246L836.5 246L809 246" />
        <path d="M833 317L821 317L809 317" />
        <path d="M867 317L855 317L843 317" />
        <path d="M864 317V281.5V246" />
        <path d="M897 257L897 281L897 305" />
        <path d="M897 320L897 325.5L897 331" />
        <path d="M1012 329L954.5 329L897 329" />
        <path d="M1051 461H930L809 461" />
        <path d="M809 246L809 353.5L809 461" />
        <path d="M864 104H823L782 104" />
        <path d="M762 104H750.5H739" />
        <path d="M183 143L183 155.5L183 168" />
        <path d="M183 93L183 108L183 123" />
        <path d="M183 2L183 41.5L183 81" />
        <path d="M262 356L262 309L262 262" />
        <path d="M277 462L277 422.5L277 383" />
        <path d="M276 461H285.5H295" />
        <path d="M306 461H315.5H325" />
        <path d="M323 461H332.5H342" />
        <path d="M353 461H362.5H372" />
        <path d="M369 461H378.5H388" />
        <path d="M398 461H407.5H417" />
        <path d="M324 461L324 421.5L324 382" />
        <path d="M371 461L371 421.5L371 382" />
        <path d="M415 460L415 420.5L415 381" />
        <path d="M391 263H326.5H262" />
        <path d="M391 262L391 322.5L391 383" />
        <path d="M248 383L338.5 383L415 383" />
        <path d="M178.777 454.072L178.777 423" />
        <path d="M178.777 498.072L178.777 467" />
        <line x1="106.5" y1="311" x2="106.5" y2="606" />
        <line x1="105" y1="604.5" x2="795" y2="604.5" />
        <line x1="794.46" y1="604.572" x2="946.46" y2="653.572" />
        <line x1="945.676" y1="655.295" x2="1091.68" y2="381.295" />
        <path d="M1092.22 383.282L1010 329.5" />
        <path d="M57.5 78L57.5 0" />
        <path d="M58 1.5H1012" />
        <line x1="1010.5" y1="3" x2="1010.5" y2="331" />
        <line x1="107" y1="498.5" x2="224" y2="498.5" />
        <line x1="244" y1="498.5" x2="324" y2="498.5" />
        <line x1="366" y1="498.5" x2="580" y2="498.5" />
        <line x1="598" y1="498.5" x2="618" y2="498.5" />
        <line x1="616.5" y1="604" x2="616.5" y2="498" />
        <line x1="450.5" y1="606" x2="450.5" y2="500" />
        <line x1="366" y1="543.5" x2="452" y2="543.5" />
        <line y1="-1.5" x2="19" y2="-1.5" transform="matrix(0 1 -0.999995 0.00309596 415 526)" />
        <line y1="-1.5" x2="19" y2="-1.5" transform="matrix(0 1 -0.999995 0.00309596 366 526)" />
        <line y1="-1.5" x2="14" y2="-1.5" transform="matrix(0 1 -0.999995 0.00309596 415 498)" />
        <line y1="-1.5" x2="14" y2="-1.5" transform="matrix(0 1 -0.999995 0.00309596 366 498)" />
        <line x1="285.5" y1="500" x2="285.5" y2="545" />
        <line x1="284" y1="543.5" x2="324" y2="543.5" />
        <line x1="322.5" y1="606" x2="322.5" y2="545" />
      </g>
      <g opacity="0.6">
        <rect x="455" y="383" width="134" height="78" rx="9" fill="#D9D9D9"/>
        <rect x="455.5" y="383.5" width="133" height="77" rx="8.5" stroke="black" strokeOpacity="0.2"/>
        <rect x="442" y="237" width="305" height="122" rx="9" fill="#D9D9D9"/>
        <rect x="442.5" y="237.5" width="304" height="121" rx="8.5" stroke="black" strokeOpacity="0.26"/>
      </g>
    </svg>
  )
}

function colorForRoom(room: MapRoom): string {
  if (room.status === 'mine') return '#1A56DB'
  if (room.status === 'busy') return '#9CA3AF'
  return '#FECACA'
}

function textForRoom(room: MapRoom): string {
  if (room.status === 'mine' || room.status === 'busy') return '#ffffff'
  return '#991B1B'
}

function roomCapacityScale(capacity: number): number {
  return 4 + Math.pow(Math.max(0, capacity - 4), 1.22)
}

function seatsWord(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'мест'
  if (mod10 === 1) return 'место'
  if (mod10 >= 2 && mod10 <= 4) return 'места'
  return 'мест'
}

function isSidewaysRotate(rotate: number | undefined): boolean {
  const normalized = (((rotate ?? 0) % 360) + 360) % 360
  return normalized === 90 || normalized === 270
}

function RoomCapacityLabel({ capacity, vertical }: { capacity: number; vertical: boolean }) {
  const word = seatsWord(capacity)
  if (!vertical) return <span className={styles.roomLabel}>{capacity} {word}</span>

  return (
    <span className={styles.roomLabel}>
      <span className={styles.roomLabelLine}>{capacity}</span>
      {word.split('').map(letter => (
        <span key={letter} className={styles.roomLabelLine}>{letter}</span>
      ))}
    </span>
  )
}

export default function OfficeMap({ zones, rooms = [], onDeskClick, onRoomClick }: Props) {
  const desks = flattenDesks(zones)

  return (
    <div className={styles.map}>
      <div className={styles.plan}>
        <FloorPlanSvg />
        {desks.map((desk, index) => {
          const location = parseWorkspaceLocation(desk.location)
          const point = location?.x !== undefined && location.y !== undefined
            ? { x: location.x, y: location.y, rotate: location.rotate }
            : SEAT_POINTS[index]
          if (!point) return null

          const isMine = desk.status === 'mine'

          return (
            <button
              key={desk.resourceId ?? desk.id}
              type="button"
              className={styles.desk}
              data-status={desk.status}
              style={{
                left: `${(point.x / 1094) * 100}%`,
                top: `${(point.y / 656) * 100}%`,
                '--desk-bg': colorForDesk(desk),
                '--desk-text': textForDesk(desk),
                transform: `translate(-50%, -50%) rotate(${point.rotate ?? 0}deg)`,
              } as CSSProperties}
              disabled={false}
              onClick={() => onDeskClick?.(desk)}
              aria-label={isMine ? `Моё место ${desk.id}` : `Место ${desk.id}`}
            >
              <span className={styles.deskLabel} aria-hidden="true" />
            </button>
          )
        })}
        {rooms.map((room, index) => {
          const location = parseWorkspaceLocation(room.location)
          const point = location?.x !== undefined && location.y !== undefined
            ? { x: location.x, y: location.y, rotate: location.rotate }
            : { x: 520 + (index % 4) * 70, y: 300 + Math.floor(index / 4) * 70, rotate: 0 }
          const isMine = room.status === 'mine'
          const isVerticalLabel = isSidewaysRotate(point.rotate)

          return (
            <button
              key={room.resourceId ?? room.id}
              type="button"
              className={styles.room}
              data-status={room.status}
              data-label-mode={isVerticalLabel ? 'vertical' : undefined}
              style={{
                left: `${(point.x / FLOOR_PLAN_VIEWBOX.width) * 100}%`,
                top: `${(point.y / FLOOR_PLAN_VIEWBOX.height) * 100}%`,
                '--room-bg': colorForRoom(room),
                '--room-text': textForRoom(room),
                '--room-capacity-scale': roomCapacityScale(room.capacity),
                '--room-label-rotate': `${-(point.rotate ?? 0)}deg`,
                transform: `translate(-50%, -50%) rotate(${point.rotate ?? 0}deg)`,
              } as CSSProperties}
              disabled={false}
              onClick={() => onRoomClick?.(room)}
              aria-label={isMine ? `Моя переговорная ${room.id}` : `Переговорная ${room.id}`}
            >
              <RoomCapacityLabel capacity={room.capacity} vertical={isVerticalLabel} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
