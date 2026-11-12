import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import { APIProvider } from "@vis.gl/react-google-maps"
import BottomNav from "./components/BottomNav"
import HomePage from "./pages/HomePage"
import RecommendedPage from "./pages/RecommendedPage"
import ProfilePage from "./pages/ProfilePage"
import VendorInfoPage from "./pages/VendorInfoPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import { useAuth } from "./hooks/useAuth"

function AppLayout() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const isHomeOrMap = pathname === "/" || pathname === "/map"
  const showNav = isHomeOrMap
    ? isAuthenticated
    : ["/recommended", "/profile", "/business"].includes(pathname) || pathname.startsWith("/vendor/")

  return (
    <div className="prototype-shell">
      <div className="content"><Outlet /></div>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
  const routes = (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="map" element={<Navigate to="/" replace />} />
        <Route path="recommended" element={<RecommendedPage />} />
        <Route path="business" element={<Navigate to="/vendor/my-business" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="vendor/:vendorId" element={<VendorInfoPage />} />
        <Route path="reset" element={<ResetPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>
    </Routes>
  )

  if (apiKey) {
    return (
      <APIProvider apiKey={apiKey} libraries={["places"]}>
        {routes}
      </APIProvider>
    )
  }

  return routes
}
