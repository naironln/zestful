import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  BarChart2,
  Upload,
  Users,
  LogOut,
  UtensilsCrossed,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Hoje', icon: LayoutDashboard },
  { to: '/week', label: 'Semana', icon: CalendarDays },
  { to: '/month', label: 'Mês', icon: BarChart2 },
  { to: '/upload', label: 'Registrar', icon: Upload },
]

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-warm-gray-500 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-700 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800 dark:hover:text-warm-gray-200"
      title={`Tema: ${theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Sistema'}</span>
    </button>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-warm-gray-200 px-6 py-5 dark:border-warm-gray-700/50">
        <UtensilsCrossed className="h-6 w-6 text-brand-500" />
        <span className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400">
          Zestful
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-200',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'text-warm-gray-600 hover:bg-warm-gray-100 hover:text-warm-gray-900 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800 dark:hover:text-warm-gray-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {user?.role === 'nutritionist' && (
          <NavLink
            to="/nutritionist"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all duration-200',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'text-warm-gray-600 hover:bg-warm-gray-100 hover:text-warm-gray-900 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800 dark:hover:text-warm-gray-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-500" />
                )}
                <Users className="h-5 w-5 shrink-0" />
                Pacientes
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-warm-gray-200 p-4 dark:border-warm-gray-700/50">
        <div className="mb-3 px-1">
          <p className="truncate text-base font-medium text-warm-gray-900 dark:text-warm-gray-100">
            {user?.name}
          </p>
          <p className="truncate text-sm text-warm-gray-500 dark:text-warm-gray-400">
            {user?.email}
          </p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-base text-warm-gray-600 transition-colors hover:bg-warm-gray-100 hover:text-warm-gray-900 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800 dark:hover:text-warm-gray-100"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sair
        </button>
      </div>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex h-screen flex-col bg-warm-gray-50 dark:bg-warm-gray-950 md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-warm-gray-200 bg-white px-4 py-3 dark:border-warm-gray-800 dark:bg-warm-gray-900 md:hidden">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-brand-500" />
          <span className="font-heading text-lg font-bold text-brand-600 dark:text-brand-400">
            Zestful
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-warm-gray-600 hover:bg-warm-gray-100 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-overlay-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sage-50 shadow-xl animate-slide-in-left dark:bg-warm-gray-900">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-warm-gray-500 hover:bg-warm-gray-200 dark:text-warm-gray-400 dark:hover:bg-warm-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 flex-col border-r border-warm-gray-200 bg-sage-50 dark:border-warm-gray-800 dark:bg-warm-gray-900 md:flex">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" key={location.pathname}>
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
