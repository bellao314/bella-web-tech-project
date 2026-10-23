import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SettingsList from "../components/SettingsList"
import { vendors } from "../data/vendors"

export default function VendorInfoPage() {
  const [role, setRole] = useState("customer")
  const navigate = useNavigate()
  const customer = role === "customer"
  return <main className="page scroll-page profile-page">
    <header className="page-header"><div><p className="eyebrow">YOUR SPACE</p><h2>Profile</h2></div><button className="icon-button"><Icon name="settings" size={20} /></button></header>
    <div className="role-switch"><button className={customer ? "active" : ""} onClick={() => setRole("customer")}>Customer</button><button className={!customer ? "active" : ""} onClick={() => setRole("vendor")}>Vendor</button></div>
    <section className="profile-card"><div className="profile-avatar">{customer ? "ML" : "JC"}</div><div><h3>"Juniper Coffee"</h3><p>"Coffee cart · Portland, OR"</p></div><button className="edit-button">Edit</button></section>
    {customer ? <><section className="stats-row"><div><strong>12</strong><span>Favorites</span></div><div><strong>8</strong><span>Visited</span></div><div><strong>3</strong><span>Lists</span></div></section><section className="profile-section"><div className="section-heading"><h3>Favorite vendors</h3><button>View all</button></div>{vendors.slice(0, 2).map((vendor) => <div className="mini-vendor" key={vendor.name}><div className="mini-thumb">{vendor.marker}</div><div><h4>{vendor.name}</h4><p>{vendor.type} · {vendor.distance}</p></div><Icon name="heart" size={18} /></div>)}</section><SettingsList items={[["Account settings", "user"], ["Notifications", "settings"], ["Privacy & location", "lock"]]} /></> : <><section className="business-status"><span><Icon name="check" size={16} /></span><div><h4>Your business is live</h4><p>Visible to customers nearby</p></div></section><section className="profile-section"><div className="section-heading"><h3>Business information</h3><button>Edit</button></div><div className="info-row"><span>Category</span><strong>Coffee & pastries</strong></div><div className="info-row"><span>Hours today</span><strong>7:00 AM – 2:00 PM</strong></div><div className="info-row"><span>Primary location</span><strong>River Market</strong></div><button className="primary-button compact" onClick={() => navigate("/pin")}><Icon name="pin" size={17} /> Add or move location</button></section><SettingsList items={[["Business details", "briefcase"], ["Account settings", "settings"], ["Preview listing", "user"]]} /></>}
  </main>
}
