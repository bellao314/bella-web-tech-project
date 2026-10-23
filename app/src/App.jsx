import { NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom"
import Icon from "./components/Icon"
import BottomNav from "./components/BottomNav"
import LoginPage from "./pages/LoginPage"
import MapPage from "./pages/MapPage"
import RecommendedPage from "./pages/RecommendedPage"
import ProfilePage from "./pages/ProfilePage"
import PinPage from "./pages/PinPage"

const navigation = [
  { path: "/", label: "Sign in", number: "01", end: true },
  { path: "/map", label: "Map & vendors", number: "02" },
  { path: "/recommended", label: "Recommended", number: "03" },
  { path: "/profile", label: "Profile", number: "04" },
  { path: "/pin", label: "Drop a pin", number: "05" },
]

function AppLayout() {
  const { pathname } = useLocation()
  const showNav = ["/map", "/recommended", "/profile"].includes(pathname)

  return (
    <div className="prototype-shell">
      <aside className="prototype-notes">
        <div className="brand-lockup"><span><Icon name="pin" size={20} /></span> ROAM</div>
        <div><p className="eyebrow">MOBILE WIREFRAME</p><h1>Local vendor finder</h1><p>A clickable concept for customer discovery and vendor location management.</p></div>
        <ol>{navigation.map(({ path, label, number, end }) => <li key={path}><NavLink to={path} end={end}><span>{number}</span> {label}</NavLink></li>)}</ol>
        <small>Tap through the prototype. Switch roles inside Profile to reveal the vendor flow.</small>
      </aside>
      <div className="phone-frame">
        <div className="status-bar"><span>9:41</span><div><span>●●●</span><span>▰</span></div></div>
        <div className="phone-content"><Outlet /></div>
        {showNav && <BottomNav />}
        <div className="home-indicator" />
      </div>
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
      </Route>
    </Routes>
  )
}
