import { Route, Routes } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { HomeRoute } from './routes/HomeRoute'
import { AboutRoute } from './routes/AboutRoute'
import { PrivacyRoute } from './routes/PrivacyRoute'
import { TermsRoute } from './routes/TermsRoute'
import { LegalRoute } from './routes/LegalRoute'
import { NotFoundRoute } from './routes/NotFoundRoute'

/** Route table, kept free of a router so it can also be rendered statically at build time. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomeRoute />} />
        <Route path="about" element={<AboutRoute />} />
        <Route path="privacy" element={<PrivacyRoute />} />
        <Route path="terms" element={<TermsRoute />} />
        <Route path="legal" element={<LegalRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Route>
    </Routes>
  )
}
