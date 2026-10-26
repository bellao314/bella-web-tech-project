import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SettingsList from "../components/SettingsList"
import { collectionFrom, valueFrom, vendorFrom, getAuthToken, clearAuthToken } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

const initials = (name) => {
  if (!name || typeof name !== "string") return ""
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

const formatDate = (value) => {
  if (!value) return ""
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return String(value)
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const token = getAuthToken()
  const { data, loading, error } = useApiResource(token ? "/user/profile" : null, null)
  const profile = data?.profile || data?.data || data
  const favorites = useMemo(() => collectionFrom(profile?.favorites || profile, ["favorites", "vendors"]).map(vendorFrom), [profile])

  const name = valueFrom(profile, ["name", "displayName", "fullName"])
  const email = valueFrom(profile, ["email"])
  const createdAt = valueFrom(profile, ["createdAt", "created_at"])

  const handleSignOut = () => {
    clearAuthToken()
    navigate("/")
  }

  const userDetails = [
    ["Full name", name || "Not set"],
    ["Email address", email],
    ["Member since", formatDate(createdAt)],
  ].filter(([, value]) => Boolean(value))

  return (
    <main className="page scroll-page profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">YOUR SPACE</p>
          <h2>Profile</h2>
        </div>
        <button className="icon-button" aria-label="Profile settings">
          <Icon name="settings" size={20} />
        </button>
      </header>

      {!token && (
        <div
          style={{
            margin: "20px 22px",
            padding: "24px 18px",
            textAlign: "center",
            background: "white",
            borderRadius: "17px",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "13px" }}>
            Please sign in to view your profile and account details.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={handleSignOut}
            style={{ maxWidth: "200px", margin: "0 auto" }}
          >
            Sign in <Icon name="arrow" size={18} />
          </button>
        </div>
      )}

      {token && loading && (
        <p className="empty-state">Loading profile…</p>
      )}

      {token && error && (
        <div
          style={{
            margin: "20px 22px",
            padding: "24px 18px",
            textAlign: "center",
            background: "white",
            borderRadius: "17px",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "13px" }}>
            {error.status === 401
              ? "Your session has expired. Please sign in again."
              : "Profile data is unavailable."}
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={handleSignOut}
            style={{ maxWidth: "200px", margin: "0 auto" }}
          >
            Sign in <Icon name="arrow" size={18} />
          </button>
        </div>
      )}

      {token && !loading && !error && !profile && (
        <p className="empty-state">No profile data is available.</p>
      )}

      {profile && (
        <>
          <section className="profile-card">
            <div className="profile-avatar">{initials(name || email) || "?"}</div>
            <div>
              <h3>{name || email || "Unnamed user"}</h3>
              {email && <p>{email}</p>}
            </div>
          </section>

          {profile.stats && (
            <section className="stats-row">
              {Object.entries(profile.stats).map(([label, value]) => (
                <div key={label}>
                  <strong>{String(value)}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </section>
          )}

          <section className="profile-section">
            <div className="section-heading">
              <h3>User details</h3>
            </div>
            {userDetails.map(([label, value]) => (
              <div className="info-row" key={label}>
                <span>{label}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <h3>Favorite vendors</h3>
            </div>
            {favorites.length ? (
              favorites.map((vendor, index) => (
                <div className="mini-vendor" key={vendor.id || vendor.name || index}>
                  <div className="mini-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
                  <div>
                    <h4>{vendor.name || "Unnamed vendor"}</h4>
                    <p>{[vendor.type, vendor.distance || vendor.city].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Icon name="heart" size={18} />
                </div>
              ))
            ) : (
              <p className="empty-state">No favorites yet.</p>
            )}
          </section>

          <SettingsList
            items={[
              ["Account settings", "user"],
              ["Notifications", "settings"],
              ["Privacy & location", "lock"],
            ]}
          />

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              margin: "6px 22px 24px",
              width: "calc(100% - 44px)",
              padding: "13px",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              background: "white",
              color: "#c92a2a",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </>
      )}
    </main>
  )
}
