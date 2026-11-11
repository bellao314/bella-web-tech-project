import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom"
import BottomNav from "./components/BottomNav"
import HomePage from "./pages/HomePage"
import RecommendedPage from "./pages/RecommendedPage"
import ProfilePage from "./pages/ProfilePage"
import VendorInfoPage from "./pages/VendorInfoPage"
import { useAuth } from "./hooks/useAuth"

function AppLayout() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const isHomeOrMap = pathname === "/" || pathname === "/map"
  const showNav = isHomeOrMap
    ? isAuthenticated
    : ["/recommended", "/profile"].includes(pathname) || pathname.startsWith("/vendor/")

  return (
    <div className="prototype-shell">
      <div className="content"><Outlet /></div>
      {showNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="map" element={<Navigate to="/" replace />} />
        <Route path="recommended" element={<RecommendedPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="vendor/:vendorId" element={<VendorInfoPage />} />
      </Route>
    </Routes>
  )
}
