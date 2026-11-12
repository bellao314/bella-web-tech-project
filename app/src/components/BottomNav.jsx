import { NavLink, useLocation } from "react-router-dom"
import Icon from "./Icon"
import { useAuth } from "../hooks/useAuth"

export default function BottomNav() {
  const { isVendor } = useAuth()
  const { pathname } = useLocation()

  const items = [
    { path: "/map", icon: "map", label: "Explore" },
    isVendor
      ? { path: "/vendor/my-business", icon: "briefcase", label: "Business" }
      : { path: "/recommended", icon: "sparkles", label: "For you" },
    { path: "/profile", icon: "user", label: "Account" },
  ]

  const checkIsActive = (itemPath, isNavLinkActive) => {
    if (isNavLinkActive) return true
    if (itemPath === "/map" && (pathname === "/" || pathname === "/map")) {
      return true
    }
    if (isVendor && itemPath === "/vendor/my-business" && pathname === "/recommended") {
      return true
    }
    return false
  }

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            checkIsActive(item.path, isActive) ? "nav-item active" : "nav-item"
          }
        >
          <Icon name={item.icon} size={21} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
