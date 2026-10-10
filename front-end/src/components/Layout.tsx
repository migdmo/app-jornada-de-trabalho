import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'

interface MenuLink {
  to: string
  label: string
  icon: string
  roles?: Role[]   // vazio = todos os papéis
}

const LINKS: MenuLink[] = [
  { to: '/', label: 'Ponto', icon: 'bi-clock' },
  { to: '/jornada', label: 'Minha jornada', icon: 'bi-calendar3' },
  { to: '/ajustes', label: 'Ajustes', icon: 'bi-pencil-square' },
  { to: '/equipe', label: 'Equipe', icon: 'bi-people', roles: ['MANAGER', 'HR'] },
  { to: '/fechamento', label: 'Fechamento', icon: 'bi-lock', roles: ['HR'] },
]

export function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleLinks = LINKS.filter(
    (link) => !link.roles || (user && link.roles.includes(user.role))
  )

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark bg-dark">
        <div className="container">
          <span className="navbar-brand">
            <i className="bi bi-clock-history me-2" />
            D&D Jornada
          </span>

          <button
            className="navbar-toggler"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`}>
            <ul className="navbar-nav me-auto">
              {visibleLinks.map((link) => (
                <li className="nav-item" key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    className="nav-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    <i className={`bi ${link.icon} me-1`} />
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-3 py-2 py-md-0">
              <span className="text-white-50 small">{user?.name}</span>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>
                <i className="bi bi-box-arrow-right me-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-4">
        <Outlet />
      </main>
    </>
  )
}