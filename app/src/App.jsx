import { Outlet, Route, Routes, useLocation } from "react-router-dom"
import BottomNav from "./components/BottomNav"
import LoginPage from "./pages/LoginPage"
import MapPage from "./pages/MapPage"
import RecommendedPage from "./pages/RecommendedPage"
import ProfilePage from "./pages/ProfilePage"
import PinPage from "./pages/PinPage"
import VendorInfoPage from "./pages/VendorInfoPage";

// const navigation = [
//   { path: "/", label: "Sign in", number: "01", end: true },
//   { path: "/map", label: "Map & vendors", number: "02" },
//   { path: "/recommended", label: "Recommended", number: "03" },
//   { path: "/profile", label: "Profile", number: "04" },
//   { path: "/pin", label: "Drop a pin", number: "05" },
// ]

function AppLayout() {
  const { pathname } = useLocation()
  const showNav = ["/map", "/recommended", "/profile", "/vendor"].includes(pathname)

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
        <Route index element={<LoginPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="recommended" element={<RecommendedPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="pin" element={<PinPage />} />
        <Route path="vendor" element={<VendorInfoPage />} />
      </Route>
    </Routes>
  )
}
