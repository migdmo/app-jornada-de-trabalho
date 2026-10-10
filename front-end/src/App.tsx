import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { ClockPage } from './pages/ClockPage'
import { WorkdaysPage } from './pages/workdaysPage'
import { AdjustmentsPage } from './pages/AdjustmentsPage'
import { TeamPage } from './pages/TeamPage'
import { ClosingPage } from './pages/ClosingPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Tudo aqui dentro exige login */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<ClockPage />} />
              <Route path="jornada" element={<WorkdaysPage />} />
              <Route path="ajustes" element={<AdjustmentsPage />} />

              {/* Gestor e RH */}
              <Route element={<ProtectedRoute roles={['MANAGER', 'HR']} />}>
                <Route path="equipe" element={<TeamPage />} />
              </Route>

              {/* Só RH */}
              <Route element={<ProtectedRoute roles={['HR']} />}>
                <Route path="fechamento" element={<ClosingPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App