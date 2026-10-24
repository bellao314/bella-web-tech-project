import { useMemo } from "react"
import Icon from "../components/Icon"
import SettingsList from "../components/SettingsList"
import { collectionFrom, valueFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()

export default function ProfilePage() {
  const { data, loading, error } = useApiResource("/profile", null)
  const profile = data?.profile || data?.data || data
  const favorites = useMemo(() => collectionFrom(profile?.favorites || profile, ["favorites", "vendors"]).map(vendorFrom), [profile])
  const name = valueFrom(profile, ["name", "displayName", "fullName", "email"])
  const email = valueFrom(profile, ["email"])
  return <main className="page scroll-page profile-page"><header className="page-header"><div><p className="eyebrow">YOUR SPACE</p><h2>Profile</h2></div><button className="icon-button" aria-label="Profile settings"><Icon name="settings" size={20} /></button></header>
    {loading && <p className="empty-state">Loading profile…</p>}{error && <p className="empty-state">Profile data is unavailable.</p>}{!loading && !error && !profile && <p className="empty-state">No profile data is available.</p>}
    {profile && <><section className="profile-card"><div className="profile-avatar">{initials(name) || "?"}</div><div><h3>{name || "Unnamed user"}</h3>{email && <p>{email}</p>}</div></section>
      {profile.stats && <section className="stats-row">{Object.entries(profile.stats).map(([label, value]) => <div key={label}><strong>{String(value)}</strong><span>{label}</span></div>)}</section>}
      <section className="profile-section"><div className="section-heading"><h3>Favorite vendors</h3></div>{favorites.length ? favorites.map((vendor, index) => <div className="mini-vendor" key={vendor.id || vendor.name || index}><div className="mini-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div><div><h4>{vendor.name || "Unnamed vendor"}</h4><p>{[vendor.type, vendor.distance || vendor.city].filter(Boolean).join(" · ")}</p></div><Icon name="heart" size={18} /></div>) : <p className="empty-state">No favorites yet.</p>}</section>
      <SettingsList items={[["Account settings", "user"], ["Notifications", "settings"], ["Privacy & location", "lock"]]} />
    </>}
  </main>
}
