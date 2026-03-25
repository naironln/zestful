import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart2,
  Upload,
  Users,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Hoje', icon: LayoutDashboard },
  { to: '/week', label: 'Semana', icon: CalendarDays },
  { to: '/month', label: 'Mês', icon: BarChart2 },
  { to: '/upload', label: 'Registrar', icon: Upload },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex h-screen w-60 flex-col border-r bg-white">
        <div className="flex items-center gap-2 border-b px-6 py-5">
          <UtensilsCrossed className="h-6 w-6 text-brand-500" />
          <span className="text-xl font-bold text-brand-600">Zestful</span>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}

          {user?.role === 'nutritionist' && (
            <NavLink
              to="/nutritionist"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Users className="h-5 w-5 shrink-0" />
              Pacientes
            </NavLink>
          )}
        </nav>

        <div className="mt-auto border-t p-4">
          <div className="mb-3 px-1">
            <p className="text-base font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
