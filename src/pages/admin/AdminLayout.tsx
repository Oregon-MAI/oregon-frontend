import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getResourcesList } from '../../api/resourceApi'
import { getUsers } from '../../api/authApi'
import styles from './AdminLayout.module.css'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconWorkspace() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

function IconRoom() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M3 9h6M3 15h6" />
    </svg>
  )
}

function IconLaptop() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M0 21h24" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  to,
  icon,
  label,
  count,
}: {
  to: string
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
      }
    >
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
      <span className={styles.navCount}>{count}</span>
    </NavLink>
  )
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ workspaces: 0, rooms: 0, equipment: 0, users: 0 })

  useEffect(() => {
    Promise.all([
      getResourcesList(['RESOURCE_TYPE_WORKSPACE']).catch(() => []),
      getResourcesList(['RESOURCE_TYPE_MEETING_ROOM']).catch(() => []),
      getResourcesList(['RESOURCE_TYPE_DEVICE']).catch(() => []),
      getUsers().catch(() => []),
    ]).then(([ws, rooms, devices, users]) => {
      setCounts({
        workspaces: ws.filter(r => r.type === 'RESOURCE_TYPE_WORKSPACE').length,
        rooms: rooms.filter(r => r.type === 'RESOURCE_TYPE_MEETING_ROOM').length,
        equipment: devices.filter(r => r.type === 'RESOURCE_TYPE_DEVICE').length,
        users: users.length,
      })
    })
  }, [])

  const initials = user
    ? `${user.surname?.charAt(0) ?? ''}${user.name?.charAt(0) ?? ''}`.toUpperCase()
    : 'АД'

  const displayName = user
    ? `${user.surname ?? ''} ${user.name?.charAt(0) ?? ''}.`.trim()
    : 'Администратор'

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    navigate('/login')
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Logo block */}
        <div className={styles.logoBlock}>
          <div className={styles.logoSquare}>T1</div>
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>Workspace</span>
            <span className={styles.logoSub}>Панель управления</span>
          </div>
        </div>

        {/* Admin badge */}
        <div className={styles.adminBadge}>АДМИНИСТРАТОР</div>

        {/* Nav section */}
        <div className={styles.sectionLabel}>РЕСУРСЫ</div>

        <nav className={styles.nav}>
          <NavItem to="/admin/workspaces" icon={<IconWorkspace />} label="Рабочие места" count={counts.workspaces} />
          <NavItem to="/admin/rooms" icon={<IconRoom />} label="Переговорные" count={counts.rooms} />
          <NavItem to="/admin/equipment" icon={<IconLaptop />} label="Техника" count={counts.equipment} />
        </nav>

        <div className={styles.sectionLabel} style={{ marginTop: 16 }}>ПОЛЬЗОВАТЕЛИ</div>

        <nav className={styles.nav}>
          <NavItem to="/admin/users" icon={<IconUsers />} label="Пользователи" count={counts.users} />
        </nav>

        {/* Spacer */}
        <div className={styles.spacer} />

        {/* User row */}
        <div className={styles.userRow}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userRole}>admin</span>
          </div>
          <button
            type="button"
            className={styles.logoutBtn}
            title="Выйти"
            onClick={handleLogout}
          >
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
