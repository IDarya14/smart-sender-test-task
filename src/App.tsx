import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { Location } from 'react-router-dom'
import { useLoggedIn } from './authState.ts'
import LoginPage from './pages/LoginPage.tsx'
import WebhooksPage from './pages/WebhooksPage.tsx'

function listPath(from: Location | undefined) {
  if (!from?.pathname.startsWith('/webhooks')) return '/webhooks'
  return `${from.pathname}${from.search}`
}

function LoginRoute() {
  const loggedIn = useLoggedIn()
  const location = useLocation()
  if (!loggedIn) return <LoginPage />
  const from = (location.state as { from?: Location } | null)?.from
  return <Navigate to={listPath(from)} replace />
}

function WebhooksRoute() {
  const loggedIn = useLoggedIn()
  const location = useLocation()
  if (!loggedIn) return <Navigate to="/login" replace state={{ from: location }} />
  return <WebhooksPage />
}

export default function App() {
  const loggedIn = useLoggedIn()

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/webhooks" element={<WebhooksRoute />} />
      <Route path="*" element={<Navigate to={loggedIn ? '/webhooks' : '/login'} replace />} />
    </Routes>
  )
}
