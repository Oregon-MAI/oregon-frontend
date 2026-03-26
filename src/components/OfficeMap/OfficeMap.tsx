import type { Zone, Desk } from '../../types/map'
import styles from './OfficeMap.module.css'

interface Props {
  zones: Zone[]
  onDeskClick?: (desk: Desk) => void
}

// ── Точные размеры из Figma SVG ──
// Стол: 60×28, rx=4
// Стул: полукруг path, rx~=8.26 от центра стола (половина ширины стола)
// Стул сверху: path "M cx-8.26,chairY A 8.26,8.26 0 0 1 cx+8.26,chairY Z" выпуклость вверх
// Стул снизу: sweep=0, выпуклость вниз
// Зазор стул-стол: ~2px

// ── ЗОНА A ──
// Стол 44×28 rx=4 (из фигмы: rect x=48..92 w=44, h=28)
// Стул: полукруг cx=центр стола, rx=8.26 ry=8.26
function DeskA({ desk, onClick }: { desk: Desk; chairPos?: string; onClick: (d: Desk) => void }) {
  const isBusy = desk.status === 'busy'
  const isMine = desk.status === 'mine'

  const fill = isBusy ? '#F3F5F9' : isMine ? '#1A56DB' : '#fff'
  const stroke = isBusy ? '#E5E7EB' : isMine ? '#1245B5' : '#E5E7EB'
  const textColor = isMine ? '#fff' : '#374151'
  const circleColor = isMine ? '#F97316' : '#D1D5DB'

  return (
    <svg
      width="40" height="40"
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

      {/* Если моё место — оранжевый круг */}
      {isMine && (
        <circle cx="36" cy="36" r="10" fill="#F97316" />
      )}

      {/* ID */}
      {!isBusy && !isMine && (
        <text x="36" y="36"
          textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif"
          fill={textColor}>
          {desk.id}
        </text>
      )}
    </svg>
  )
}


// ── ЗОНА D ──
// Из Figma: стол rect 59.47×28.087 rx=4, стул path полукруг
// Свободно: #A7F3D0, занято: #9CA3AF, моё: #1A56DB + стул #D97706
function DeskD({ desk, chairPos, onClick }: { desk: Desk; chairPos: 'top' | 'bottom'; onClick?: (d: Desk) => void }) {
  const isBusy = desk.status === 'busy'
  const isMine = desk.status === 'mine'

  const deskFill  = isMine ? '#1A56DB' : isBusy ? '#9CA3AF' : '#A7F3D0'
  const chairFill = isMine ? '#D97706' : '#9CA3AF'
  const textFill  = isMine ? '#ffffff' : isBusy ? 'transparent' : '#059669'

  // Из Figma: W=59.47, H=28.087, стул rx=8.26 ry=8.26
  const W = 60, H = 28, CRX = 8.26, CRY = 8.26
  const gap = 2
  const SVG_H = CRY + gap + H
  const cx = W / 2
  const isTop = chairPos === 'top'
  const deskY  = isTop ? CRY + gap : 0
  const chairY = isTop ? CRY : H
  const sweep  = isTop ? 1 : 0

  return (
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
      {!isBusy && (
        <text x={cx} y={deskY + H / 2} textAnchor="middle" dominantBaseline="central"
          fontSize="9" fontWeight="700" fill={textFill}
          fontFamily="Plus Jakarta Sans, sans-serif">
          {desk.id}
        </text>
      )}
    </svg>
  )
}

// ── ЗОНА B ──
// Из Figma: блок из 4 L-образных столов, разделитель посередине (5px линия)
// Каждый квадрант: 44×44, стул кружок 14×14 в углу
// Цвета: свободно #A7F3D0, занято #E8EBF2, моё #1A56DB
function DeskBBlock({ desks, onClick }: { desks: Desk[]; onClick?: (d: Desk) => void }) {
  const [tl, tr, bl, br] = [desks[0], desks[1], desks[2], desks[3]]

  function getDeskStyle(desk: Desk | undefined) {
    if (!desk) return { fill: '#E8EBF2', text: 'transparent', chair: '#9CA3AF' }
    const isMine = desk.status === 'mine'
    const isBusy = desk.status === 'busy'
    return {
      fill:  isMine ? '#1A56DB' : isBusy ? '#E8EBF2' : '#A7F3D0',
      text:  isMine ? '#fff'    : isBusy ? 'transparent' : '#059669',
      chair: isMine ? '#D97706' : '#9CA3AF',
    }
  }

  const TL = getDeskStyle(tl), TR = getDeskStyle(tr)
  const BL = getDeskStyle(bl), BR = getDeskStyle(br)

  // Из Figma: блок ~100×100, разделитель 5px посередине
  // Каждый L-квадрант занимает 44×44, стул — кружок r=7 в наружном углу
  // Разделитель горизонтальный (5px) и вертикальный (5px) посередине

  const Q = 44  // размер квадранта
  const D = 5   // размер разделителя
  const TOTAL = Q * 2 + D  // 93px

  function handleClick(desk: Desk | undefined) {
    if (desk && desk.status !== 'busy') onClick?.(desk)
  }

  return (
    <svg width={TOTAL} height={TOTAL} viewBox={`0 0 ${TOTAL} ${TOTAL}`}>
      {/* Разделитель вертикальный */}
      <rect x={Q} y={0} width={D} height={TOTAL} fill="#CDD2D9" />
      {/* Разделитель горизонтальный */}
      <rect x={0} y={Q} width={TOTAL} height={D} fill="#CDD2D9" />

      {/* TL — верхний левый */}
      <g onClick={() => handleClick(tl)} style={{ cursor: tl?.status === 'busy' ? 'default' : 'pointer' }}>
        <rect x={0} y={0} width={Q} height={Q} fill={TL.fill} />
        {/* Стул — кружок в верхнем левом углу */}
        <circle cx={7} cy={7} r={7} fill={TL.chair} opacity={tl?.status === 'busy' ? 0.4 : 1} />
        {tl && tl.status !== 'busy' && (
          <text x={Q/2} y={Q/2} textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight="700" fill={TL.text} fontFamily="Plus Jakarta Sans, sans-serif">
            {tl.id}
          </text>
        )}
      </g>

      {/* TR — верхний правый */}
      <g transform={`translate(${Q + D}, 0)`} onClick={() => handleClick(tr)} style={{ cursor: tr?.status === 'busy' ? 'default' : 'pointer' }}>
        <rect x={0} y={0} width={Q} height={Q} fill={TR.fill} />
        {/* Стул — кружок в верхнем правом углу */}
        <circle cx={Q - 7} cy={7} r={7} fill={TR.chair} opacity={tr?.status === 'busy' ? 0.4 : 1} />
        {tr && tr.status !== 'busy' && (
          <text x={Q/2} y={Q/2} textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight="700" fill={TR.text} fontFamily="Plus Jakarta Sans, sans-serif">
            {tr.id}
          </text>
        )}
      </g>

      {/* BL — нижний левый */}
      <g transform={`translate(0, ${Q + D})`} onClick={() => handleClick(bl)} style={{ cursor: bl?.status === 'busy' ? 'default' : 'pointer' }}>
        <rect x={0} y={0} width={Q} height={Q} fill={BL.fill} />
        {/* Стул — кружок в нижнем левом углу */}
        <circle cx={7} cy={Q - 7} r={7} fill={BL.chair} opacity={bl?.status === 'busy' ? 0.4 : 1} />
        {bl && bl.status !== 'busy' && (
          <text x={Q/2} y={Q/2} textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight="700" fill={BL.text} fontFamily="Plus Jakarta Sans, sans-serif">
            {bl.id}
          </text>
        )}
      </g>

      {/* BR — нижний правый */}
      <g transform={`translate(${Q + D}, ${Q + D})`} onClick={() => handleClick(br)} style={{ cursor: br?.status === 'busy' ? 'default' : 'pointer' }}>
        <rect x={0} y={0} width={Q} height={Q} fill={BR.fill} />
        {/* Стул — кружок в нижнем правом углу */}
        <circle cx={Q - 7} cy={Q - 7} r={7} fill={BR.chair} opacity={br?.status === 'busy' ? 0.4 : 1} />
        {br && br.status !== 'busy' && (
          <text x={Q/2} y={Q/2} textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight="700" fill={BR.text} fontFamily="Plus Jakarta Sans, sans-serif">
            {br.id}
          </text>
        )}
      </g>
    </svg>
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
  // Зона B: блоки по 4
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
                <DeskBBlock key={bi} desks={block} onClick={onDeskClick} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}