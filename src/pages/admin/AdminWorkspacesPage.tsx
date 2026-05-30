import { useState, useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { Resource } from '../../shared/types/resource'
import {
  getResourcesList,
  createResource,
  updateResource,
  deleteResource,
  changeResourceStatus,
} from '../../features/resources/api/resourceApi'
import { FloorPlanSvg, FLOOR_PLAN_VIEWBOX } from '../../widgets/office-map/OfficeMap'
import {
  getWorkspaceFloor,
  parseWorkspaceLocation,
  serializeWorkspaceLocation,
} from '../../features/resources/lib/workspaceLocation'
import styles from './AdminWorkspacesPage.module.css'


const ZONES = ['A', 'B', 'D'] as const
type Zone = typeof ZONES[number]

const ZONE_NAMES: Record<Zone, string> = {
  A: 'Разработка',
  B: 'Аналитика',
  D: 'Дизайн',
}

/** Splits a workspace name like A-12 into sortable zone and number parts. */
function parseWorkspaceName(name: string): { zone: Zone; number: string; numeric: number } {
  const [rawZone, rawNumber = ''] = name.split('-')
  const zone = (ZONES.includes(rawZone as Zone) ? rawZone : 'A') as Zone
  const number = rawNumber.replace(/\D/g, '')
  return { zone, number, numeric: Number(number) || 0 }
}

/** Sorts workspaces by configured zone order and numeric seat number. */
function compareWorkspaces(a: Resource, b: Resource): number {
  const left = parseWorkspaceName(a.name)
  const right = parseWorkspaceName(b.name)
  const zoneDiff = ZONES.indexOf(left.zone) - ZONES.indexOf(right.zone)
  if (zoneDiff !== 0) return zoneDiff
  if (left.numeric !== right.numeric) return left.numeric - right.numeric
  return a.name.localeCompare(b.name, 'ru')
}

/** Extracts the floor value used by admin forms from resource.location. */
function getFloorValue(location: string | undefined): string {
  return getWorkspaceFloor(location)?.toString() ?? ''
}

interface WorkspaceForm {
  zone: Zone
  number: string
  floor: string
  has_monitor: boolean
  unavailable: boolean
  unavailableReason: string
}

interface RoomForm {
  name: string
  floor: string
  capacity: string
  has_projector: boolean
  has_whiteboard: boolean
  unavailable: boolean
  unavailableReason: string
}

const EMPTY_FORM: WorkspaceForm = {
  zone: 'A',
  number: '',
  floor: '',
  has_monitor: false,
  unavailable: false,
  unavailableReason: '',
}

const EMPTY_ROOM_FORM: RoomForm = {
  name: '',
  floor: '',
  capacity: '6',
  has_projector: true,
  has_whiteboard: true,
  unavailable: false,
  unavailableReason: '',
}

interface DraftWorkspace {
  tempId: string
  kind: 'workspace' | 'room'
  name: string
  zone: Zone
  number: string
  floor: number
  x: number
  y: number
  rotate: number
  has_monitor: boolean
  capacity: number
  has_projector: boolean
  has_whiteboard: boolean
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function WorkspaceModal({ mode, initial, onSave, onClose, onDelete }: {
  mode: 'add' | 'edit'
  initial: WorkspaceForm
  onSave: (form: WorkspaceForm) => Promise<void>
  onClose: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState<WorkspaceForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof WorkspaceForm>(field: K, value: WorkspaceForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.number.trim()) { setError('Введите номер места'); return }
    if (mode === 'add') {
      const nums = form.number.trim().split(/\s+/)
      if (nums.some(n => !/^\d+$/.test(n))) { setError('Номера мест должны быть числами'); return }
    } else {
      if (!/^\d+$/.test(form.number.trim())) { setError('Номер места должен быть числом'); return }
    }
    if (!form.floor.trim()) { setError('Введите этаж'); return }
    if (!/^\d+$/.test(form.floor.trim())) { setError('Этаж должен быть числом'); return }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const previewIds = mode === 'add'
    ? form.number.trim().split(/\s+/).filter(Boolean).map(n => `${form.zone}-${n}`).join(', ')
    : `${form.zone}-${form.number}`

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {mode === 'add' ? 'Добавить рабочее место' : `Изменить место ${initial.zone}-${initial.number}`}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНОВНАЯ ИНФОРМАЦИЯ</div>

            <div className={styles.formRow}>
              {/* Выбор зоны */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Зона *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ZONES.map(z => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => set('zone', z)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 6,
                        border: form.zone === z ? '2px solid #1A56DB' : '1px solid #E5E7EB',
                        background: form.zone === z ? '#EFF6FF' : '#fff',
                        color: form.zone === z ? '#1A56DB' : '#374151',
                        fontWeight: form.zone === z ? 700 : 400,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {z}
                    </button>
                  ))}
                </div>
                <span className={styles.formHelper}>{ZONE_NAMES[form.zone]}</span>
              </div>

              {/* Номер места */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {mode === 'add' ? 'Номера мест *' : 'Номер места *'}
                </label>
                <input
                  className={styles.formInput}
                  placeholder={mode === 'add' ? '49 50 51' : '49'}
                  value={form.number}
                  onChange={e => set('number', mode === 'add'
                    ? e.target.value.replace(/[^\d\s]/g, '')
                    : e.target.value.replace(/\D/g, '')
                  )}
                />
                {mode === 'add' && (
                  <span className={styles.formHelper}>
                    Несколько номеров — через пробел
                  </span>
                )}
                {form.number.trim() && (
                  <span className={styles.formHelper}>ID: {previewIds}</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Этаж *</label>
              <div className={styles.floorInputWrap}>
                <input
                  className={`${styles.formInput} ${styles.floorInput}`}
                  placeholder="20"
                  value={form.floor}
                  onChange={e => set('floor', e.target.value.replace(/\D/g, ''))}
                />
                <span className={styles.floorSuffix}>этаж</span>
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНАЩЕНИЕ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.has_monitor ? styles.toggleOn : ''}`}
                  role="switch" aria-checked={form.has_monitor} tabIndex={0}
                  onClick={() => set('has_monitor', !form.has_monitor)}
                  onKeyDown={e => e.key === 'Enter' && set('has_monitor', !form.has_monitor)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Монитор</span>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ВРЕМЕННАЯ НЕДОСТУПНОСТЬ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.unavailable ? styles.toggleOn : ''}`}
                  role="switch" aria-checked={form.unavailable} tabIndex={0}
                  onClick={() => set('unavailable', !form.unavailable)}
                  onKeyDown={e => e.key === 'Enter' && set('unavailable', !form.unavailable)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Отметить как временно недоступное</span>
              </label>
            </div>
            {form.unavailable && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Причина</label>
                <textarea
                  className={styles.formTextarea}
                  rows={2}
                  value={form.unavailableReason}
                  onChange={e => set('unavailableReason', e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <div className={styles.formError}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          {mode === 'edit' && onDelete && (
            <button type="button" className={styles.btnDanger} onClick={onDelete}>Удалить</button>
          )}
          <button type="button" className={styles.btnGhost} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : '✓ Сохранить место'}
          </button>
        </div>
      </div>
    </>
  )
}

function RoomModal({ mode, initial, onSave, onClose, onDelete }: {
  mode: 'add' | 'edit'
  initial: RoomForm
  onSave: (form: RoomForm) => Promise<void>
  onClose: () => void
  onDelete?: () => void
}) {
  const [form, setForm] = useState<RoomForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof RoomForm>(field: K, value: RoomForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Введите название'); return }
    if (!form.floor.trim()) { setError('Введите этаж'); return }
    if (!/^\d+$/.test(form.floor.trim())) { setError('Этаж должен быть числом'); return }
    if (!form.capacity.trim()) { setError('Введите вместимость'); return }
    if (!/^\d+$/.test(form.capacity.trim())) { setError('Вместимость должна быть числом'); return }
    if (Number(form.capacity) < 1) { setError('Вместимость должна быть не менее 1'); return }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{mode === 'add' ? 'Добавить переговорную' : `Изменить ${initial.name}`}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНОВНАЯ ИНФОРМАЦИЯ</div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название *</label>
                <input
                  className={styles.formInput}
                  placeholder="Переговорная 1"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Вместимость *</label>
                <input
                  className={styles.formInput}
                  placeholder="8"
                  value={form.capacity}
                  onChange={e => set('capacity', e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Этаж *</label>
              <div className={styles.floorInputWrap}>
                <input
                  className={`${styles.formInput} ${styles.floorInput}`}
                  placeholder="20"
                  value={form.floor}
                  onChange={e => set('floor', e.target.value.replace(/\D/g, ''))}
                />
                <span className={styles.floorSuffix}>этаж</span>
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНАЩЕНИЕ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.has_projector ? styles.toggleOn : ''}`}
                  role="switch"
                  aria-checked={form.has_projector}
                  tabIndex={0}
                  onClick={() => set('has_projector', !form.has_projector)}
                  onKeyDown={e => e.key === 'Enter' && set('has_projector', !form.has_projector)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Проектор</span>
              </label>
            </div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.has_whiteboard ? styles.toggleOn : ''}`}
                  role="switch"
                  aria-checked={form.has_whiteboard}
                  tabIndex={0}
                  onClick={() => set('has_whiteboard', !form.has_whiteboard)}
                  onKeyDown={e => e.key === 'Enter' && set('has_whiteboard', !form.has_whiteboard)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Маркерная доска</span>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ВРЕМЕННАЯ НЕДОСТУПНОСТЬ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.unavailable ? styles.toggleOn : ''}`}
                  role="switch"
                  aria-checked={form.unavailable}
                  tabIndex={0}
                  onClick={() => set('unavailable', !form.unavailable)}
                  onKeyDown={e => e.key === 'Enter' && set('unavailable', !form.unavailable)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Отметить как временно недоступную</span>
              </label>
            </div>
            {form.unavailable && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Причина</label>
                <textarea
                  className={styles.formTextarea}
                  rows={2}
                  value={form.unavailableReason}
                  onChange={e => set('unavailableReason', e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <div className={styles.formError}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          {mode === 'edit' && onDelete && (
            <button type="button" className={styles.btnDanger} onClick={onDelete}>Удалить</button>
          )}
          <button type="button" className={styles.btnGhost} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : '✓ Сохранить переговорную'}
          </button>
        </div>
      </div>
    </>
  )
}

/** Suggests the next free workspace number inside a zone. */
function nextWorkspaceNumber(resources: Resource[], zone: Zone): string {
  const max = resources.reduce((acc, r) => {
    const parsed = parseWorkspaceName(r.name)
    return parsed.zone === zone ? Math.max(acc, parsed.numeric) : acc
  }, 0)
  return String(max + 1)
}

/** Suggests the next room name by scanning saved resources and unsaved drafts. */
function nextRoomName(resources: Resource[], drafts: DraftWorkspace[]): string {
  const max = [...resources.map(r => r.name), ...drafts.map(d => d.name)].reduce((acc, name) => {
    const match = name.match(/\d+/)
    return match ? Math.max(acc, Number(match[0])) : acc
  }, 0)
  return `Переговорная ${max + 1}`
}

/** Returns room capacity with the admin editor's default fallback. */
function roomCapacity(resource: Resource): number {
  return resource.meeting_room?.capacity ?? 6
}

/** Scales room marker size non-linearly so large rooms are visible but not huge. */
function roomCapacityScale(capacity: number): number {
  return 4 + Math.pow(Math.max(0, capacity - 4), 1.22)
}

/** Chooses the correct Russian word form for a number of seats. */
function seatsWord(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'мест'
  if (mod10 === 1) return 'место'
  if (mod10 >= 2 && mod10 <= 4) return 'места'
  return 'мест'
}

function RoomCapacityLabel({ capacity, vertical, saving }: {
  capacity: number
  vertical: boolean
  saving: boolean
}) {
  if (saving) return <span className={styles.mapRoomLabel}>...</span>
  const word = seatsWord(capacity)
  if (!vertical) return <span className={styles.mapRoomLabel}>{capacity} {word}</span>

  return (
    <span className={styles.mapRoomLabel}>
      <span className={styles.mapRoomLabelLine}>{capacity}</span>
      {word.split('').map(letter => (
        <span key={letter} className={styles.mapRoomLabelLine}>{letter}</span>
      ))}
    </span>
  )
}

/** Interactive floor-plan editor for placing, moving and rotating resources. */
function AdminMapEditor({
  resources,
  currentFloor,
  setCurrentFloor,
  onCreate,
  onMove,
  onSelectResource,
}: {
  resources: Resource[]
  currentFloor: number
  setCurrentFloor: (floor: number) => void
  onCreate: (draft: DraftWorkspace) => Promise<void>
  onMove: (resource: Resource, x: number, y: number, rotate?: number) => Promise<void>
  onSelectResource: (resource: Resource) => void
}) {
  const planRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [drafts, setDrafts] = useState<DraftWorkspace[]>([])
  const [dragging, setDragging] = useState<{ kind: 'draft'; id: string } | { kind: 'resource'; id: string } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [livePositions, setLivePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [selectedSeat, setSelectedSeat] = useState<{ kind: 'draft'; id: string } | { kind: 'resource'; id: string } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [createKind, setCreateKind] = useState<'workspace' | 'room'>('workspace')

  const floorResources = resources.filter(r => (getWorkspaceFloor(r.location) ?? 20) === currentFloor)
  const selectedResource = selectedSeat?.kind === 'resource'
    ? resources.find(resource => resource.resource_id === selectedSeat.id)
    : undefined
  const selectedDraft = selectedSeat?.kind === 'draft'
    ? drafts.find(draft => draft.tempId === selectedSeat.id)
    : undefined
  const selectedLabel = selectedResource?.name ?? selectedDraft?.name

  /** Keeps rotation in the 0-359 degree range. */
  function normalizeRotate(rotate: number): number {
    return ((rotate % 360) + 360) % 360
  }

  /** Detects vertical label orientation for rotated room markers. */
  function isSidewaysRotate(rotate: number): boolean {
    const normalized = normalizeRotate(rotate)
    return normalized === 90 || normalized === 270
  }

  /** Snaps floor-plan coordinates to a small grid when the grid toggle is enabled. */
  function snapPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!snapToGrid) return point

    const step = 5
    return {
      x: Math.round(point.x / step) * step,
      y: Math.round(point.y / step) * step,
    }
  }

  /** Places new draft resources at the center of the currently visible map viewport. */
  function visibleCenterPoint(): { x: number; y: number } {
    const viewport = viewportRef.current
    const plan = planRef.current
    if (!viewport || !plan) {
      return { x: FLOOR_PLAN_VIEWBOX.width / 2, y: FLOOR_PLAN_VIEWBOX.height / 2 }
    }

    const x = ((viewport.scrollLeft + viewport.clientWidth / 2) / plan.clientWidth) * FLOOR_PLAN_VIEWBOX.width
    const y = ((viewport.scrollTop + viewport.clientHeight / 2) / plan.clientHeight) * FLOOR_PLAN_VIEWBOX.height

    return snapPoint({
      x: Math.max(0, Math.min(FLOOR_PLAN_VIEWBOX.width, x)),
      y: Math.max(0, Math.min(FLOOR_PLAN_VIEWBOX.height, y)),
    })
  }

  /** Converts pointer coordinates from screen pixels into the SVG viewBox coordinate system. */
  function pointFromEvent(e: ReactPointerEvent): { x: number; y: number } {
    const rect = planRef.current?.getBoundingClientRect()
    if (!rect) return { x: FLOOR_PLAN_VIEWBOX.width / 2, y: FLOOR_PLAN_VIEWBOX.height / 2 }

    const x = ((e.clientX - rect.left) / rect.width) * FLOOR_PLAN_VIEWBOX.width
    const y = ((e.clientY - rect.top) / rect.height) * FLOOR_PLAN_VIEWBOX.height
    const point = {
      x: Math.max(0, Math.min(FLOOR_PLAN_VIEWBOX.width, x)),
      y: Math.max(0, Math.min(FLOOR_PLAN_VIEWBOX.height, y)),
    }

    return snapPoint(point)
  }

  /** Adds an unsaved workspace or room draft to the current floor. */
  function addDraft() {
    const zone: Zone = 'A'
    const number = nextWorkspaceNumber([...resources, ...drafts.filter(d => d.kind === 'workspace').map(d => ({
      resource_id: d.tempId,
      name: d.name,
      type: 'RESOURCE_TYPE_WORKSPACE' as const,
      location: '',
      status: 'RESOURCE_STATUS_AVAILABLE' as const,
    }))], zone)
    const point = visibleCenterPoint()
    const name = createKind === 'workspace'
      ? `${zone}-${number}`
      : nextRoomName(resources.filter(resource => resource.type === 'RESOURCE_TYPE_MEETING_ROOM'), drafts.filter(draft => draft.kind === 'room'))

    const draft: DraftWorkspace = {
      tempId: `draft-${Date.now()}`,
      kind: createKind,
      name,
      zone,
      number,
      floor: currentFloor,
      x: point.x,
      y: point.y,
      rotate: 0,
      has_monitor: false,
      capacity: 6,
      has_projector: true,
      has_whiteboard: true,
    }

    setDrafts(prev => [...prev, draft])
    setSelectedSeat({ kind: 'draft', id: draft.tempId })
  }

  function moveDraft(id: string, point: { x: number; y: number }) {
    setDrafts(prev => prev.map(d => d.tempId === id ? { ...d, x: point.x, y: point.y } : d))
  }

  function updateDraft(id: string, patch: Partial<DraftWorkspace>) {
    setDrafts(prev => prev.map(d => d.tempId === id ? { ...d, ...patch } : d))
  }

  /** Rotates selected draft locally or persists rotation for an existing resource. */
  async function rotateSelected(delta: number) {
    if (!selectedSeat) return

    if (selectedSeat.kind === 'draft') {
      setDrafts(prev => prev.map(draft => (
        draft.tempId === selectedSeat.id
          ? { ...draft, rotate: normalizeRotate(draft.rotate + delta) }
          : draft
      )))
      return
    }

    const resource = resources.find(r => r.resource_id === selectedSeat.id)
    if (!resource) return

    const parsed = parseWorkspaceLocation(resource.location)
    const fallbackIndex = Math.max(0, floorResources.findIndex(item => item.resource_id === resource.resource_id))
    const x = parsed?.x ?? 80 + (fallbackIndex % 12) * 48
    const y = parsed?.y ?? 60 + Math.floor(fallbackIndex / 12) * 42
    const rotate = normalizeRotate((parsed?.rotate ?? 0) + delta)

    setSavingId(resource.resource_id)
    setError(null)
    try {
      await onMove(resource, x, y, rotate)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить поворот')
    } finally {
      setSavingId(null)
    }
  }

  /** Updates live marker coordinates during drag. */
  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragging) return
    const point = pointFromEvent(e)
    if (dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.hypot(dx, dy) > 4) dragStartRef.current.moved = true
    }
    if (dragging.kind === 'draft') moveDraft(dragging.id, point)
    if (dragging.kind === 'resource') {
      setLivePositions(prev => ({ ...prev, [dragging.id]: point }))
    }
  }

  /** Finalizes drag interactions and persists moved resources. */
  async function handlePointerUp(e: ReactPointerEvent) {
    if (!dragging) return
    const active = dragging
    setDragging(null)

    if (active.kind === 'resource') {
      const resource = resources.find(r => r.resource_id === active.id)
      if (!resource) return
      const wasMoved = dragStartRef.current?.moved ?? false
      dragStartRef.current = null

      if (!wasMoved) {
        setLivePositions(prev => {
          const next = { ...prev }
          delete next[resource.resource_id]
          return next
        })
        setSelectedSeat({ kind: 'resource', id: resource.resource_id })
        return
      }

      const point = pointFromEvent(e)
      setSavingId(resource.resource_id)
      setError(null)
      try {
        await onMove(resource, point.x, point.y)
        setSelectedSeat({ kind: 'resource', id: resource.resource_id })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить координаты')
      } finally {
        setSavingId(null)
        setLivePositions(prev => {
          const next = { ...prev }
          delete next[resource.resource_id]
          return next
        })
      }
    }

    dragStartRef.current = null
  }

  /** Persists a draft marker as a real backend resource. */
  async function saveDraft(draft: DraftWorkspace) {
    setSavingId(draft.tempId)
    setError(null)
    try {
      await onCreate(draft)
      setDrafts(prev => prev.filter(d => d.tempId !== draft.tempId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать место')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className={styles.mapEditorCard}>
      <div className={styles.mapEditorHeader}>
        <div>
          <h2 className={styles.mapEditorTitle}>Расстановка ресурсов</h2>
          <p className={styles.mapEditorText}>Места и переговорные создаются на одной карте. Перетаскивание сохраняет координаты, поворот — в панели ниже.</p>
        </div>
        <div className={styles.mapEditorControls}>
          <select
            className={styles.floorSelect}
            value={currentFloor}
            onChange={e => setCurrentFloor(Number(e.target.value))}
          >
            {[20, 21, 22].map(floor => <option key={floor} value={floor}>{floor} этаж</option>)}
          </select>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeToggleBtn} ${createKind === 'workspace' ? styles.typeToggleBtnActive : ''}`}
              onClick={() => setCreateKind('workspace')}
            >
              Место
            </button>
            <button
              type="button"
              className={`${styles.typeToggleBtn} ${createKind === 'room' ? styles.typeToggleBtnActive : ''}`}
              onClick={() => setCreateKind('room')}
            >
              Переговорная
            </button>
          </div>
          <button type="button" className={styles.btnPrimary} onClick={addDraft}>
            <IconPlus /> Добавить
          </button>
        </div>
      </div>

      <div className={styles.mapToolbar}>
        <div className={styles.zoomControls} aria-label="Масштаб карты">
          {[0.75, 1, 1.25, 1.5, 2].map(value => (
            <button
              key={value}
              type="button"
              className={`${styles.zoomBtn} ${zoom === value ? styles.zoomBtnActive : ''}`}
              onClick={() => setZoom(value)}
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>
        <div className={styles.mapToolGroup}>
          {selectedSeat && selectedLabel && (
            <div className={styles.rotateControls}>
              <span className={styles.rotateLabel}>{selectedLabel}</span>
              <button type="button" className={styles.rotateBtn} onClick={() => rotateSelected(-90)}>↺ 90°</button>
              <button type="button" className={styles.rotateBtn} onClick={() => rotateSelected(90)}>↻ 90°</button>
              <button type="button" className={styles.rotateBtn} onClick={() => rotateSelected(180)}>180°</button>
              {selectedResource && (
                <button type="button" className={styles.rotateBtn} onClick={() => onSelectResource(selectedResource)}>Изменить</button>
              )}
              {selectedDraft && (
                <>
                  {selectedDraft.kind === 'room' && (
                    <label className={styles.capacityControl}>
                      <span>мест</span>
                      <input
                        value={selectedDraft.capacity}
                        onChange={e => updateDraft(selectedDraft.tempId, {
                          capacity: Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1),
                        })}
                      />
                    </label>
                  )}
                  <button type="button" className={styles.rotateBtn} onClick={() => saveDraft(selectedDraft)}>Сохранить</button>
                </>
              )}
            </div>
          )}
          <button
            type="button"
            className={`${styles.snapBtn} ${snapToGrid ? styles.snapBtnActive : ''}`}
            onClick={() => setSnapToGrid(v => !v)}
          >
            Сетка 5px
          </button>
        </div>
      </div>

      <div className={styles.mapEditorBody}>
        {error && <div className={styles.mapEditorError}>{error}</div>}
        <div ref={viewportRef} className={styles.editorViewport}>
          <div
            ref={planRef}
            className={`${styles.editorPlan} ${snapToGrid ? styles.editorPlanGrid : ''}`}
            style={{
              width: `${Math.round(FLOOR_PLAN_VIEWBOX.width * zoom)}px`,
              '--seat-scale': String(zoom),
            } as CSSProperties}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <FloorPlanSvg />
            {floorResources.map((resource, index) => {
              const parsed = parseWorkspaceLocation(resource.location)
              const live = livePositions[resource.resource_id]
              const x = live?.x ?? parsed?.x ?? 80 + (index % 12) * 48
              const y = live?.y ?? parsed?.y ?? 60 + Math.floor(index / 12) * 42
              const rotate = parsed?.rotate ?? 0
              const isSelected = selectedSeat?.kind === 'resource' && selectedSeat.id === resource.resource_id
              const isRoom = resource.type === 'RESOURCE_TYPE_MEETING_ROOM'
              const isVerticalLabel = isRoom && isSidewaysRotate(rotate)

              return (
                <button
                  key={resource.resource_id}
                  type="button"
                  className={`${isRoom ? styles.mapRoom : styles.mapSeat} ${isSelected ? styles.mapSeatSelected : ''}`}
                  data-label-mode={isVerticalLabel ? 'vertical' : undefined}
                  style={{
                    left: `${(x / FLOOR_PLAN_VIEWBOX.width) * 100}%`,
                    top: `${(y / FLOOR_PLAN_VIEWBOX.height) * 100}%`,
                    '--seat-bg': '#A7F3D0',
                    '--seat-text': '#047857',
                    '--room-capacity-scale': roomCapacityScale(roomCapacity(resource)),
                    '--room-label-rotate': `${-rotate}deg`,
                    '--seat-label-rotate': `${isRoom ? 0 : -rotate}deg`,
                    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                  } as CSSProperties}
                  onPointerDown={e => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false }
                    setDragging({ kind: 'resource', id: resource.resource_id })
                  }}
                  onDoubleClick={() => onSelectResource(resource)}
                >
                  {isRoom ? (
                    <RoomCapacityLabel
                      capacity={roomCapacity(resource)}
                      vertical={isVerticalLabel}
                      saving={savingId === resource.resource_id}
                    />
                  ) : (
                    <span className={styles.mapSeatLabel}>
                      {savingId === resource.resource_id ? '...' : resource.name}
                    </span>
                  )}
                </button>
              )
            })}

            {drafts.filter(d => d.floor === currentFloor).map(draft => {
              const isVerticalDraftLabel = draft.kind === 'room' && isSidewaysRotate(draft.rotate)

              return (
              <button
                key={draft.tempId}
                type="button"
                className={`${draft.kind === 'room' ? styles.mapRoom : styles.mapSeat} ${styles.mapSeatDraft} ${selectedSeat?.kind === 'draft' && selectedSeat.id === draft.tempId ? styles.mapSeatSelected : ''}`}
                data-label-mode={isVerticalDraftLabel ? 'vertical' : undefined}
                style={{
                  left: `${(draft.x / FLOOR_PLAN_VIEWBOX.width) * 100}%`,
                  top: `${(draft.y / FLOOR_PLAN_VIEWBOX.height) * 100}%`,
                  '--seat-bg': '#FEF3C7',
                  '--seat-text': '#92400E',
                  '--room-capacity-scale': roomCapacityScale(draft.capacity),
                  '--room-label-rotate': `${-draft.rotate}deg`,
                  '--seat-label-rotate': `${draft.kind === 'room' ? 0 : -draft.rotate}deg`,
                  transform: `translate(-50%, -50%) rotate(${draft.rotate}deg)`,
                } as CSSProperties}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false }
                  setDragging({ kind: 'draft', id: draft.tempId })
                }}
                onClick={() => setSelectedSeat({ kind: 'draft', id: draft.tempId })}
                onDoubleClick={() => saveDraft(draft)}
                title="Двойной клик — сохранить"
              >
                {draft.kind === 'room' ? (
                  <RoomCapacityLabel
                    capacity={draft.capacity}
                    vertical={isVerticalDraftLabel}
                    saving={savingId === draft.tempId}
                  />
                ) : (
                  <span className={styles.mapSeatLabel}>
                    {savingId === draft.tempId ? '...' : draft.name}
                  </span>
                )}
              </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminWorkspacesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [currentFloor, setCurrentFloor] = useState(20)

  useEffect(() => {
    setLoading(true)
    getResourcesList(['RESOURCE_TYPE_WORKSPACE', 'RESOURCE_TYPE_MEETING_ROOM'])
      .then(async list => {
        const mapResources = list.filter(r => r.type === 'RESOURCE_TYPE_WORKSPACE' || r.type === 'RESOURCE_TYPE_MEETING_ROOM')
        setResources(mapResources)
      })
      .catch(() => setError('Не удалось загрузить ресурсы карты'))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }


  function resourceToForm(r: Resource): WorkspaceForm {
    const { zone, number } = parseWorkspaceName(r.name)
    return {
      zone,
      number,
      floor: getFloorValue(r.location),
      has_monitor: r.workspace?.has_monitor ?? false,
      unavailable: r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY',
      unavailableReason: '',
    }
  }

  function roomToForm(r: Resource): RoomForm {
    return {
      name: r.name,
      floor: getFloorValue(r.location),
      capacity: String(r.meeting_room?.capacity ?? ''),
      has_projector: r.meeting_room?.has_projector ?? false,
      has_whiteboard: r.meeting_room?.has_whiteboard ?? false,
      unavailable: r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY',
      unavailableReason: '',
    }
  }

  async function handleAdd(form: WorkspaceForm) {
    const numbers = form.number.trim().split(/\s+/).filter(Boolean)

    const inputDupes = numbers.filter((n, i) => numbers.indexOf(n) !== i)
    if (inputDupes.length > 0)
      throw new Error(`Повторяющиеся номера в вводе: ${[...new Set(inputDupes)].join(', ')}`)

    const existingNames = new Set(resources.map(r => r.name))
    const conflicts = numbers.filter(n => existingNames.has(`${form.zone}-${n}`))
    if (conflicts.length > 0)
      throw new Error(`Уже существуют: ${conflicts.map(n => `${form.zone}-${n}`).join(', ')}`)

    const created = await Promise.all(numbers.map(async num => {
      const name = `${form.zone}-${num}`
      const resource = await createResource({
        name,
        type: 'RESOURCE_TYPE_WORKSPACE',
        location: serializeWorkspaceLocation({ floor: Number(form.floor) }),
        details: { has_monitor: form.has_monitor },
      })
      if (form.unavailable) {
        await changeResourceStatus({ resource_id: resource.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
        resource.status = 'RESOURCE_STATUS_MAINTENANCE'
      }
      return resource
    }))
    setResources(prev => [...created, ...prev].sort(compareWorkspaces))
    showToast(created.length === 1 ? `Место ${created[0].name} добавлено` : `Добавлено ${created.length} мест`)
  }

  async function handleEdit(form: WorkspaceForm) {
    if (!editTarget) return
    const name = `${form.zone}-${form.number.trim()}`
    const conflict = resources.some(r => r.resource_id !== editTarget.resource_id && r.name === name)
    if (conflict) {
      throw new Error(`Место ${name} уже существует`)
    }

    const updated = await updateResource(
      editTarget.resource_id,
      {
        name,
        type: 'RESOURCE_TYPE_WORKSPACE',
        location: serializeWorkspaceLocation({
          ...(parseWorkspaceLocation(editTarget.location) ?? {}),
          floor: Number(form.floor),
        }),
        status: editTarget.status,
        details: { has_monitor: form.has_monitor },
      },
    )
    if (form.unavailable && editTarget.status === 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
      updated.status = 'RESOURCE_STATUS_MAINTENANCE'
    } else if (!form.unavailable && editTarget.status !== 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_AVAILABLE', reason: '' })
      updated.status = 'RESOURCE_STATUS_AVAILABLE'
    }
    setResources(prev => prev.map(r => r.resource_id === updated.resource_id ? updated : r).sort(compareWorkspaces))
    showToast(`Место ${name} обновлено`)
  }

  async function handleRoomAdd(form: RoomForm) {
    const created = await createResource({
      name: form.name.trim(),
      type: 'RESOURCE_TYPE_MEETING_ROOM',
      location: serializeWorkspaceLocation({ floor: Number(form.floor) }),
      details: {
        capacity: Number(form.capacity),
        has_projector: form.has_projector,
        has_whiteboard: form.has_whiteboard,
      },
    })
    if (form.unavailable) {
      await changeResourceStatus({
        resource_id: created.resource_id,
        status: 'RESOURCE_STATUS_MAINTENANCE',
        reason: form.unavailableReason || 'Временно недоступно',
      })
      created.status = 'RESOURCE_STATUS_MAINTENANCE'
    }
    setResources(prev => [created, ...prev])
    showToast(`${created.name} добавлена`)
  }

  async function handleRoomEdit(form: RoomForm) {
    if (!editTarget) return
    const conflict = resources.some(r =>
      r.resource_id !== editTarget.resource_id &&
      r.type === 'RESOURCE_TYPE_MEETING_ROOM' &&
      r.name === form.name.trim()
    )
    if (conflict) {
      throw new Error(`${form.name.trim()} уже существует`)
    }

    const updated = await updateResource(editTarget.resource_id, {
      name: form.name.trim(),
      type: 'RESOURCE_TYPE_MEETING_ROOM',
      location: serializeWorkspaceLocation({
        ...(parseWorkspaceLocation(editTarget.location) ?? {}),
        floor: Number(form.floor),
      }),
      status: editTarget.status,
      details: {
        capacity: Number(form.capacity),
        has_projector: form.has_projector,
        has_whiteboard: form.has_whiteboard,
      },
    })
    if (form.unavailable && editTarget.status === 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({
        resource_id: editTarget.resource_id,
        status: 'RESOURCE_STATUS_MAINTENANCE',
        reason: form.unavailableReason || 'Временно недоступно',
      })
      updated.status = 'RESOURCE_STATUS_MAINTENANCE'
    } else if (!form.unavailable && editTarget.status !== 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({
        resource_id: editTarget.resource_id,
        status: 'RESOURCE_STATUS_AVAILABLE',
        reason: '',
      })
      updated.status = 'RESOURCE_STATUS_AVAILABLE'
    }
    setResources(prev => prev.map(r => r.resource_id === updated.resource_id ? updated : r))
    showToast(`${updated.name} обновлена`)
  }

  async function handleMapCreate(draft: DraftWorkspace) {
    if (resources.some(r => r.type === (draft.kind === 'room' ? 'RESOURCE_TYPE_MEETING_ROOM' : 'RESOURCE_TYPE_WORKSPACE') && r.name === draft.name)) {
      throw new Error(`${draft.name} уже существует`)
    }

    if (draft.kind === 'room') {
      const created = await createResource({
        name: draft.name,
        type: 'RESOURCE_TYPE_MEETING_ROOM',
        location: serializeWorkspaceLocation({
          floor: draft.floor,
          x: draft.x,
          y: draft.y,
          rotate: draft.rotate,
        }),
        details: {
          capacity: draft.capacity,
          has_projector: draft.has_projector,
          has_whiteboard: draft.has_whiteboard,
        },
      })
      setResources(prev => [created, ...prev])
      showToast(`${created.name} добавлена на карту`)
      return
    }

    const created = await createResource({
      name: draft.name,
      type: 'RESOURCE_TYPE_WORKSPACE',
      location: serializeWorkspaceLocation({
        floor: draft.floor,
        x: draft.x,
        y: draft.y,
        rotate: draft.rotate,
      }),
      details: { has_monitor: draft.has_monitor },
    })
    setResources(prev => [created, ...prev].sort(compareWorkspaces))
    showToast(`Место ${created.name} добавлено на карту`)
  }

  async function handleMapMove(resource: Resource, x: number, y: number, rotate?: number) {
    const parsed = parseWorkspaceLocation(resource.location)
    const updated = await updateResource(resource.resource_id, {
      name: resource.name,
      type: resource.type,
      location: serializeWorkspaceLocation({
        floor: parsed?.floor ?? currentFloor,
        x,
        y,
        rotate: rotate ?? parsed?.rotate ?? 0,
      }),
      status: resource.status,
      details: resource.type === 'RESOURCE_TYPE_MEETING_ROOM'
        ? {
            capacity: resource.meeting_room?.capacity ?? 6,
            has_projector: resource.meeting_room?.has_projector ?? false,
            has_whiteboard: resource.meeting_room?.has_whiteboard ?? false,
          }
        : { has_monitor: resource.workspace?.has_monitor ?? false },
    })
    setResources(prev => prev.map(r => r.resource_id === updated.resource_id ? updated : r))
  }

  async function handleDelete(id: string) {
    const target = resources.find(r => r.resource_id === id)
    await deleteResource(id)
    setResources(prev => prev.filter(r => r.resource_id !== id))
    setDeleteConfirm(null)
    setEditTarget(null)
    setShowModal(false)
    showToast(target?.type === 'RESOURCE_TYPE_MEETING_ROOM' ? 'Переговорная удалена' : 'Место удалено')
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Карта ресурсов</h1>
          <p className={styles.pageSubtitle}>{resources.length} объектов · БЦ «Арена»</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <AdminMapEditor
          resources={resources}
          currentFloor={currentFloor}
          setCurrentFloor={setCurrentFloor}
          onCreate={handleMapCreate}
          onMove={handleMapMove}
          onSelectResource={resource => { setEditTarget(resource); setShowModal(true) }}
        />

        {loading && <div className={styles.loadingMsg}>Загрузка...</div>}
        {error && <div className={styles.errorMsg}>{error}</div>}
      </div>

      {showModal && editTarget?.type === 'RESOURCE_TYPE_MEETING_ROOM' && (
        <RoomModal
          mode="edit"
          initial={roomToForm(editTarget)}
          onSave={handleRoomEdit}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onDelete={() => {
            setShowModal(false)
            setDeleteConfirm(editTarget.resource_id)
          }}
        />
      )}

      {showModal && editTarget?.type !== 'RESOURCE_TYPE_MEETING_ROOM' && (
        <WorkspaceModal
          mode={editTarget ? 'edit' : 'add'}
          initial={editTarget ? resourceToForm(editTarget) : EMPTY_FORM}
          onSave={editTarget ? handleEdit : handleAdd}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onDelete={editTarget ? () => {
            setShowModal(false)
            setDeleteConfirm(editTarget.resource_id)
          } : undefined}
        />
      )}

      {deleteConfirm && (
        <>
          <div className={styles.overlay} onClick={() => setDeleteConfirm(null)} />
          <div className={styles.confirmModal}>
            <p className={styles.confirmText}>Удалить этот объект?</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button type="button" className={styles.btnDanger} onClick={() => handleDelete(deleteConfirm)}>Удалить</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
