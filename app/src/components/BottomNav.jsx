import { NavLink } from "react-router-dom"
import Icon from "./Icon"
const items = [{ path: "/map", icon: "map", label: "Explore" }, { path: "/recommended", icon: "sparkles", label: "For you" }, { path: "/profile", icon: "user", label: "Profile" }]
export default function BottomNav() { return <nav className="bottom-nav" aria-label="Main navigation">{items.map((item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><Icon name={item.icon} size={21} /><span>{item.label}</span></NavLink>)}</nav> }
