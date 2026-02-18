import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useUIStore from '../stores/uiStore'
import { useSSE } from '../hooks/useSSE'
import styles from './Layout.module.css'

const ROLES = {
  EMPLOYEE:  'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
  ADMIN:     'ADMIN',
  LOGISTICS: 'LOGISTICS',
}

function navItems(role) {
  const items = []
  if (role !== ROLES.LOGISTICS) {
    items.push({ to: '/', label: 'Dashboard' })
  }
  if (role === ROLES.TEAM_LEAD || role === ROLES.ADMIN) {
    items.push({ to: '/team', label: role === ROLES.ADMIN ? 'All Teams' : 'My Team' })
  }
  if (role === ROLES.ADMIN || role === ROLES.LOGISTICS) {
    items.push({ to: '/headcount',    label: 'Headcount' })
    items.push({ to: '/special-days', label: 'Special Days' })
  }
  if (role === ROLES.ADMIN) {
    items.push({ to: '/settings', label: 'Settings' })
  }
  return items
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const toasts = useUIStore((s) => s.toasts)
  const navigate = useNavigate()
  useSSE()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>C</span>
          <span className={styles.brandName}>MHP</span>
        </div>

        <nav className={styles.nav}>
          {navItems(user?.role).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userArea}>
          <span className={styles.userName}>{user?.name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
