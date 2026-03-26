import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <div className={styles.logoSq}>T1</div>
          <span className={styles.logoText}>Workspace</span>
        </div>
        <div className={styles.topbarRight}>
          <span>{user ? `${user.surname}${user.name?.[0] ? ` ${user.name[0]}.` : ''}` : ''}</span>
          <button type="button" className={styles.logoutBtn} onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
