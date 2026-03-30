import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import WeekViewPage from '@/pages/WeekViewPage'
import MonthViewPage from '@/pages/MonthViewPage'
import UploadPage from '@/pages/UploadPage'
import MealDetailPage from '@/pages/MealDetailPage'
import NutritionistPage from '@/pages/NutritionistPage'
import PatientDetailPage from '@/pages/PatientDetailPage'
import PatientMealDetailPage from '@/pages/PatientMealDetailPage'
import DrinkLogPage from '@/pages/DrinkLogPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function NutritionistRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'nutritionist') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PatientRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'nutritionist') return <Navigate to="/nutritionist" replace />
  return <>{children}</>
}

function DefaultRedirect() {
  const user = useAuthStore((s) => s.user)
  return <Navigate to={user?.role === 'nutritionist' ? '/nutritionist' : '/dashboard'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <AppShell>
              <Routes>
                <Route path="/dashboard" element={<PatientRoute><DashboardPage /></PatientRoute>} />
                <Route path="/week" element={<PatientRoute><WeekViewPage /></PatientRoute>} />
                <Route path="/month" element={<PatientRoute><MonthViewPage /></PatientRoute>} />
                <Route path="/upload" element={<PatientRoute><UploadPage /></PatientRoute>} />
                <Route path="/drink-log" element={<PatientRoute><DrinkLogPage /></PatientRoute>} />
                <Route path="/meals/:mealId" element={<PatientRoute><MealDetailPage /></PatientRoute>} />
                <Route
                  path="/nutritionist"
                  element={
                    <NutritionistRoute>
                      <NutritionistPage />
                    </NutritionistRoute>
                  }
                />
                <Route
                  path="/nutritionist/patients/:patientId"
                  element={
                    <NutritionistRoute>
                      <PatientDetailPage />
                    </NutritionistRoute>
                  }
                />
                <Route
                  path="/nutritionist/patients/:patientId/meals/:mealId"
                  element={
                    <NutritionistRoute>
                      <PatientMealDetailPage />
                    </NutritionistRoute>
                  }
                />
                <Route path="*" element={<DefaultRedirect />} />
              </Routes>
            </AppShell>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}
