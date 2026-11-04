import { useMemo, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SettingsList from "../components/SettingsList"
import { collectionFrom, valueFrom, vendorFrom, getAuthToken, clearAuthToken } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import {
  PRESET_LOCATIONS,
  PRESET_HOURS,
  getBusinessData,
  saveBusinessData,
} from "../lib/business"

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
  const apiAccountType = valueFrom(profile, ["type", "accountType", "account_type", "role"])
  const accountType = (apiAccountType || localStorage.getItem("userAccountType") || "customer").toLowerCase()
  const isBusiness = accountType === "business"

  // Business Location & Hours state
  const [businessData, setBusinessData] = useState(() => getBusinessData(name || "My Business"))
  const [selectedLocPreset, setSelectedLocPreset] = useState(() => {
    const b = getBusinessData(name || "My Business")
    const match = PRESET_LOCATIONS.find((loc) => loc.name === b.locationName)
    return match ? match.name : "custom"
  })
  const [customLocAddress, setCustomLocAddress] = useState(() => {
    const b = getBusinessData(name || "My Business")
    return b.address || ""
  })
  const [selectedHoursPreset, setSelectedHoursPreset] = useState(() => {
    const b = getBusinessData(name || "My Business")
    return PRESET_HOURS.includes(b.hours) ? b.hours : "custom"
  })
  const [customHoursText, setCustomHoursText] = useState(() => {
    const b = getBusinessData(name || "My Business")
    return b.hours || ""
  })
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    const handleUpdate = (e) => {
      const updated = e?.detail || getBusinessData(name || "My Business")
      setBusinessData(updated)
    }
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [name])

  const handleLocationPresetSelect = (e) => {
    const val = e.target.value
    setSelectedLocPreset(val)
    if (val !== "custom") {
      const preset = PRESET_LOCATIONS.find((loc) => loc.name === val)
      if (preset) {
        setCustomLocAddress(preset.address)
      }
    }
  }

  const handleHoursPresetSelect = (e) => {
    const val = e.target.value
    setSelectedHoursPreset(val)
    if (val !== "custom") {
      setCustomHoursText(val)
    }
  }

  const handleSaveBusinessLocationHours = (e) => {
    e.preventDefault()
    let chosenLocation = null

    if (selectedLocPreset !== "custom") {
      const preset = PRESET_LOCATIONS.find((loc) => loc.name === selectedLocPreset)
      if (preset) {
        chosenLocation = {
          locationName: preset.name,
          address: preset.address,
          city: preset.city,
          latitude: preset.latitude,
          longitude: preset.longitude,
        }
      }
    }

    if (!chosenLocation) {
      chosenLocation = {
        locationName: customLocAddress.split(",")[0]?.trim() || "Primary Location",
        address: customLocAddress.trim() || "Current Location",
        city: customLocAddress.split(",").slice(1).join(",").trim() || "Local Area",
        latitude: businessData.latitude || 38.6270,
        longitude: businessData.longitude || -90.1994,
      }
    }

    const chosenHours = selectedHoursPreset === "custom"
      ? (customHoursText.trim() || "10:00 AM – 6:00 PM")
      : selectedHoursPreset

    const updated = saveBusinessData({
      name: name || businessData.name || "My Business",
      ...chosenLocation,
      hours: chosenHours,
    })

    setBusinessData(updated)
    setSaveMessage("Location and hours updated! Changes are now live on the map and details page.")
    setTimeout(() => setSaveMessage(""), 4500)
  }

  const handleSignOut = () => {
    clearAuthToken()
    navigate("/")
  }

  const userDetails = [
    ["Account type", isBusiness ? "Business" : "Customer"],
    [isBusiness ? "Business name" : "Full name", name || "Not set"],
    ["Email address", email],
    ["Member since", formatDate(createdAt)],
  ].filter(([, value]) => Boolean(value))

  return (
    <main className="page scroll-page profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{isBusiness ? "BUSINESS HUB" : "YOUR SPACE"}</p>
          <h2>{isBusiness ? "Business Account" : "Profile"}</h2>
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
              <h3>{name || email || (isBusiness ? "Unnamed Business" : "Unnamed user")}</h3>
              {email && <p>{email}</p>}
            </div>
          </section>

          {profile.stats && !isBusiness && (
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
              <h3>{isBusiness ? "Business details" : "User details"}</h3>
            </div>
            {userDetails.map(([label, value]) => (
              <div className="info-row" key={label}>
                <span>{label}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </section>

          {/* CUSTOMER VIEW: Favorite Vendors */}
          {!isBusiness && (
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
          )}

          {/* BUSINESS VIEW: Live Status and Location & Hours Input Section */}
          {isBusiness && (
            <>
              <section className="business-status">
                <span><Icon name="check" size={16} /></span>
                <div>
                  <h4>Your business is live</h4>
                  <p>Visible to customers nearby on the map</p>
                </div>
              </section>

              <section className="profile-section">
                <div className="section-heading">
                  <h3>Location & Hours</h3>
                  <button
                    type="button"
                    onClick={() => navigate("/vendor/my-business")}
                    style={{ border: 0, background: "none", color: "var(--forest)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                  >
                    View details page →
                  </button>
                </div>

                <div className="info-row">
                  <span>Current location</span>
                  <strong>{businessData.address || businessData.locationName}</strong>
                </div>
                <div className="info-row">
                  <span>Hours today</span>
                  <strong>{businessData.hours}</strong>
                </div>

                <form onSubmit={handleSaveBusinessLocationHours} style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Current Location</span>
                    <div className="input-shell">
                      <Icon name="pin" size={18} />
                      <select
                        value={selectedLocPreset}
                        onChange={handleLocationPresetSelect}
                      >
                        {PRESET_LOCATIONS.map((loc) => (
                          <option key={loc.name} value={loc.name}>
                            {loc.name} ({loc.city})
                          </option>
                        ))}
                        <option value="custom">Custom Address / Place...</option>
                      </select>
                    </div>
                  </label>

                  {selectedLocPreset === "custom" && (
                    <label style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Custom Location / Address</span>
                      <div className="input-shell">
                        <Icon name="location" size={18} />
                        <input
                          type="text"
                          placeholder="e.g. 1122 NW River Street, Portland, OR"
                          value={customLocAddress}
                          onChange={(e) => setCustomLocAddress(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  )}

                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Operating Hours</span>
                    <div className="input-shell">
                      <Icon name="sparkles" size={18} />
                      <select
                        value={selectedHoursPreset}
                        onChange={handleHoursPresetSelect}
                      >
                        {PRESET_HOURS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                        <option value="custom">Custom Operating Hours...</option>
                      </select>
                    </div>
                  </label>

                  {selectedHoursPreset === "custom" && (
                    <label style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Custom Operating Hours</span>
                      <div className="input-shell">
                        <Icon name="settings" size={18} />
                        <input
                          type="text"
                          placeholder="e.g. 7:30 AM – 2:30 PM"
                          value={customHoursText}
                          onChange={(e) => setCustomHoursText(e.target.value)}
                          required
                        />
                      </div>
                    </label>
                  )}

                  {saveMessage && (
                    <div
                      style={{
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "#e4efdc",
                        color: "#2b5138",
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Icon name="check" size={16} /> {saveMessage}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "9px", marginTop: "2px" }}>
                    <button
                      type="submit"
                      className="primary-button"
                      style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                    >
                      Save Location & Hours <Icon name="check" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/pin")}
                      style={{
                        padding: "0 14px",
                        border: "1px solid var(--line)",
                        borderRadius: "13px",
                        background: "white",
                        color: "var(--forest)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        minHeight: "44px",
                      }}
                      title="Set precise pin on map"
                    >
                      <Icon name="pin" size={16} /> Pin
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}

          <SettingsList
            items={
              isBusiness
                ? [
                    ["View business details page", "briefcase", () => navigate("/vendor/my-business")],
                    ["View live pin on map", "map", () => navigate("/map")],
                    ["Drop or move map pin", "pin", () => navigate("/pin")],
                    ["Account settings", "user"],
                  ]
                : [
                    ["Account settings", "user"],
                    ["Notifications", "settings"],
                    ["Privacy & location", "lock"],
                  ]
            }
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

