import type { Zone, Desk } from '../../types/map'
import styles from './OfficeMap.module.css'

interface Props {
  zones: Zone[]
  onDeskClick?: (desk: Desk) => void
}

// ── Figma SVG ──
// Стол: 60×28, rx=4
// Стул: полукруг path, rx~=8.26 от центра стола 
// Стул сверху: path "M cx-8.26,chairY A 8.26,8.26 0 0 1 cx+8.26,chairY Z" 
// Стул снизу: sweep=0, выпуклость вниз
// Зазор стул-стол: ~2px

// ── ЗОНА A ──
// Стол 44×28 rx=4 (из фигмы: rect x=48..92 w=44, h=28)
// Стул: полукруг cx=центр стола, rx=8.26 ry=8.26
function DeskA({ desk, onClick }: { desk: Desk; chairPos?: string; onClick: (d: Desk) => void }) {
  const isBusy = desk.status === 'busy'
  const isMine = desk.status === 'mine'

  const fill = isBusy ? '#9CA3AF' : isMine ? '#1A56DB' : '#A7F3D0'
  const stroke = isBusy ? '#E5E7EB' : isMine ? '#1245B5' : '#E5E7EB'
  const textColor = isMine ? '#fff' : '#059669'
  const circleColor = isMine ? '#F97316' : '#D1D5DB'

  const tooltip = isBusy && desk.bookedSlots.length > 0
    ? `Занято: ${desk.bookedSlots.join(', ')}`
    : undefined

  return (
    <div className={styles.deskWrap} data-tooltip={tooltip}>
      <svg
        width="46" height="46"
        viewBox="0 0 72 72"
        style={{ cursor: isBusy ? 'default' : 'pointer' }}
        onClick={() => !isBusy && onClick(desk)}
      >
        {/* Стол */}
        <rect x="2" y="2" width="68" height="68" rx="10"
          fill={fill} stroke={stroke} strokeWidth="1.5" />

        {/* Если занят — круг внутри */}
        {isBusy && (
          <circle cx="36" cy="36" r="10" fill={circleColor} />
        )}

        {isMine && (
          <circle cx="36" cy="36" r="10" fill="#F97316" />
        )}

        {/* ID */}
        {!isBusy && !isMine && (
          <text x="36" y="36"
            textAnchor="middle" dominantBaseline="middle"
            fontSize="20" fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fill={textColor}>
            {desk.id.replace('-', '')}
          </text>
        )}
      </svg>
    </div>
  )
}


// ── ЗОНА D ──
// Из Figma: стол rect 59.47×28.087 rx=4, стул path полукруг
// Свободно: #A7F3D0, занято: #9CA3AF, моё: #1A56DB + стул #D97706
function DeskD({ desk, chairPos, onClick }: { desk: Desk; chairPos: 'top' | 'bottom'; onClick?: (d: Desk) => void }) {
  const isBusy = desk.status === 'busy'
  const isMine = desk.status === 'mine'

  const deskFill  = isMine ? '#1A56DB' : isBusy ? '#9CA3AF' : '#A7F3D0'
  const chairFill = isMine ? '#D97706' : isBusy ? '#D1D5DB' : '#A7F3D0'
  const textFill  = isMine ? '#ffffff' : isBusy ? 'transparent' : '#059669'

  const W = 69, H = 32, CRX = 9.5, CRY = 9.5
  const gap = 2
  const SVG_H = CRY + gap + H
  const cx = W / 2
  const isTop = chairPos === 'top'
  const deskY  = isTop ? CRY + gap : 0
  const chairY = isTop ? CRY : H
  const sweep  = isTop ? 1 : 0

  const tooltip = isBusy && desk.bookedSlots.length > 0
    ? `Занято: ${desk.bookedSlots.join(', ')}`
    : undefined

  return (
    <div className={styles.deskWrap} data-tooltip={tooltip}>
      <svg
        width={W} height={SVG_H} viewBox={`0 0 ${W} ${SVG_H}`}
        style={{ cursor: isBusy ? 'default' : 'pointer', display: 'block', flexShrink: 0 }}
        onClick={() => !isBusy && onClick?.(desk)}
      >
        <path
          d={`M ${cx - CRX},${chairY} A ${CRX},${CRY} 0 0 ${sweep} ${cx + CRX},${chairY} Z`}
          fill={chairFill}
        />
        <rect x="0" y={deskY} width={W} height={H} rx="4" fill={deskFill} />
        {isMine && (
          <circle cx={cx} cy={deskY + H / 2} r="10" fill="#F97316" />
        )}
        {!isBusy && !isMine && (
          <text x={cx} y={deskY + H / 2} textAnchor="middle" dominantBaseline="central"
            fontSize="13" fontWeight="700" fill={textFill}
            fontFamily="Plus Jakarta Sans, sans-serif">
            {desk.id.replace('-', '')}
          </text>
        )}
      </svg>
    </div>
  )
}

// ── ЗОНА B ──
// transform → {svgTransform на группу, позиция текста}
const DESK_B_VARIANTS: Record<string, { g: string; tx: number; ty: number }> = {
  'scaleY(-1)':   { g: 'translate(0,45) scale(1,-1)',   tx: 30, ty: 37 },
  'scale(-1,-1)': { g: 'translate(44,45) scale(-1,-1)', tx: 11,  ty: 37 },
  'scale(-1,1)':  { g: 'translate(44,0) scale(-1,1)',   tx: 11,  ty: 8  },
}

function DeskB({ desk, onClick, transform }: { desk: Desk; onClick?: (d: Desk) => void; transform?: string }) {
  const isBusy = desk.status === 'busy'
  const isMine = desk.status === 'mine'

  const deskFill  = isMine ? '#1A56DB' : isBusy ? '#9CA3AF' : '#A7F3D0'
  const chairFill = isMine ? '#D97706' : isBusy ? '#D1D5DB' : '#A7F3D0'
  const textFill  = isMine ? '#ffffff' : '#059669'

  const v = transform ? DESK_B_VARIANTS[transform] : undefined
  const gTransform = v?.g
  const tx = v?.tx ?? 30
  const ty = v?.ty ?? 8

  const tooltip = isBusy && desk.bookedSlots.length > 0
    ? `Занято: ${desk.bookedSlots.join(', ')}`
    : undefined

  return (
    <div className={styles.deskWrap} data-tooltip={tooltip}>
      <svg width="51" height="52" viewBox="0 0 44 45" fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ cursor: isBusy ? 'default' : 'pointer', display: 'block', flexShrink: 0 }}
        onClick={() => !isBusy && onClick?.(desk)}
      >
        <g transform={gTransform}>
          <path d="M0 0H44V45H28V16H0Z" fill={deskFill} />
          <path d="M17 15.4999C17 15.4999 22.5 15.5 25.5 19C28.5 22.5 28.5 27.9999 28.5 27.9999" stroke="white"/>
          <path d="M13 39C9.13401 39 6 35.866 6 32L6 29C6 25.134 9.13401 22 13 22H16C19.866 22 23 25.134 23 29V32C23 35.866 19.866 39 16 39H13Z" fill={chairFill}/>
          <line y1="0.5" x2="44" y2="0.5" stroke="white"/>
          <line x1="0.5" y1="1" x2="0.5" y2="16" stroke="white"/>
          <line x1="43.5" y1="1" x2="43.5" y2="45" stroke="white"/>
          <path d="M43 45H28V44H43V45Z" fill="white"/>
          <line y1="15.5" x2="17" y2="15.5" stroke="white"/>
          <line x1="28.5413" y1="45.0011" x2="28.5" y2="28.0012" stroke="white"/>
        </g>
        {!isBusy && !isMine && (
          <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
            fontSize="11" fontWeight="700" fill={textFill}
            fontFamily="Plus Jakarta Sans, sans-serif">
            {desk.id.replace('-', '')}
          </text>
        )}
      </svg>
    </div>
  )
}

// ── MAIN ──
export default function OfficeMap({ zones, onDeskClick }: Props) {
  const zoneA = zones.find(z => z.id === 'A')
  const zoneB = zones.find(z => z.id === 'B')
  const zoneD = zones.find(z => z.id === 'D')

  const chunk = (arr: Desk[], n: number) => {
    const out: Desk[][] = []
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
    return out
  }

  // Зона A: блоки по 6 (3 col × 2 row), стулья у верхнего ряда сверху, нижнего снизу
  const aBlocks = chunk(zoneA?.desks || [], 6)
  // Зона D: блоки по 6 (3 col × 2 row)
  const dBlocks = chunk(zoneD?.desks || [], 6)
  // Зона B: блоки по 4 (2×2)
  const bBlocks = chunk(zoneB?.desks || [], 4)

  return (
    <div className={styles.map}>
      {/* Зона A */}
      {zoneA && (
        <div className={styles.zoneCard}>
          <div className={styles.zoneLabel}>ЗОНА  A</div>
          <div className={styles.zoneAGrid}>
            {aBlocks.map((block, bi) => (
              <div key={bi} className={styles.blockA}>
                {/* Верхний ряд — стул сверху */}
                <div className={styles.deskRow}>
                  {block.slice(0, 3).map(d => (
                    <DeskA key={d.id} desk={d} chairPos="top" onClick={onDeskClick ?? (() => {})} />
                  ))}
                </div>
                {/* Нижний ряд — стул снизу */}
                <div className={styles.deskRow}>
                  {block.slice(3, 6).map(d => (
                    <DeskA key={d.id} desk={d} chairPos="bottom" onClick={onDeskClick ?? (() => {})} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.rightCol}>
        {/* Зона D */}
        {zoneD && (
          <div className={styles.zoneCard}>
            <div className={styles.zoneLabel}>ЗОНА  D</div>
            <div className={styles.zoneDGrid}>
              {dBlocks.map((block, bi) => (
                <div key={bi} className={styles.blockD}>
                  <div className={styles.blockDRow}>
                    {block.slice(0, 3).map(d => (
                      <DeskD key={d.id} desk={d} chairPos="top" onClick={onDeskClick} />
                    ))}
                  </div>
                  <div className={styles.blockDRow}>
                    {block.slice(3, 6).map(d => (
                      <DeskD key={d.id} desk={d} chairPos="bottom" onClick={onDeskClick} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Зона B */}
        {zoneB && (
          <div className={styles.zoneCard}>
            <div className={styles.zoneLabel}>ЗОНА  B</div>
            <div className={styles.zoneBGrid}>
              {bBlocks.map((block, bi) => (
                <div key={bi} className={styles.blockB}>
                  <div className={styles.deskRow}>
                    {block.slice(0, 1).map(d => <DeskB key={d.id} desk={d} onClick={onDeskClick} transform="scaleY(-1)" />)}
                    {block.slice(1, 2).map(d => <DeskB key={d.id} desk={d} onClick={onDeskClick} transform="scale(-1,-1)" />)}
                  </div>
                  <div className={styles.deskRow}>
                    {block.slice(2, 3).map(d => <DeskB key={d.id} desk={d} onClick={onDeskClick} transform="scaleY(1)" />)}
                    {block.slice(3, 4).map(d => <DeskB key={d.id} desk={d} onClick={onDeskClick} transform="scale(-1,1)" />)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}