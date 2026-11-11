import { useMemo, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SettingsList from "../components/SettingsList"
import { collectionFrom, valueFrom, vendorFrom, getAuthToken, putApi, getApi } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useAuth } from "../hooks/useAuth"
import { useFavorites } from "../hooks/useFavorites"
import {
  getBusinessData,
  saveBusinessData,
  resetBusinessLocationHours,
  geocodeLocation,
  parseOperatingHours,
  isBusinessLive,
  isBusinessScheduled,
  isBusinessExpired,
  fetchAddressSuggestions,
  toLocalDatetimeString,
  formatDateTimeSingle,
  formatScheduledHours,
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
  const { logout, token: authToken } = useAuth()
  const token = authToken || getAuthToken()
  const { data, loading, error } = useApiResource(token ? "/user/profile" : null, null)
  const { favorites: localFavorites, removeFavorite } = useFavorites()
  const profile = data?.profile || data?.data || data
  const apiFavorites = useMemo(() => collectionFrom(profile?.favorites || profile, ["favorites", "vendors"]).map(vendorFrom), [profile])

  const favorites = useMemo(() => {
    const map = new Map()
    apiFavorites.forEach((v) => { if (v && v.id != null) map.set(String(v.id), v) })
    localFavorites.forEach((v) => { if (v && v.id != null) map.set(String(v.id), v) })
    return Array.from(map.values())
  }, [apiFavorites, localFavorites])

  const name = valueFrom(profile, ["name", "displayName", "fullName"])
  const email = valueFrom(profile, ["email"])
  const createdAt = valueFrom(profile, ["createdAt", "created_at"])
  const apiAccountType = valueFrom(profile, ["type", "accountType", "account_type", "role"])
  const accountType = (apiAccountType || localStorage.getItem("userAccountType") || "customer").toLowerCase()
  const isBusiness = accountType === "business"

  // Customer Location (City) state
  const [cityInput, setCityInput] = useState(() => localStorage.getItem("userCity") || "")
  const [currentCity, setCurrentCity] = useState(() => localStorage.getItem("userCity") || "")
  const [citySaveMessage, setCitySaveMessage] = useState("")
  const [citySaveError, setCitySaveError] = useState("")
  const [isSavingCity, setIsSavingCity] = useState(false)

  useEffect(() => {
    if (profile) {
      const city = profile.city ?? localStorage.getItem("userCity") ?? ""
      if (city) {
        localStorage.setItem("userCity", city)
        if (profile.latitude != null && profile.longitude != null) {
          localStorage.setItem(
            "userCityCoords",
            JSON.stringify({ lat: Number(profile.latitude), lng: Number(profile.longitude) })
          )
        }
      } else if (profile.city === null) {
        localStorage.removeItem("userCity")
        localStorage.removeItem("userCityCoords")
      }
    }
  }, [profile])

  const handleSaveCustomerLocation = async (e) => {
    e.preventDefault()
    setIsSavingCity(true)
    setCitySaveError("")
    setCitySaveMessage("")

    const cleanCity = cityInput.trim()

    try {
      let lat = null
      let lng = null

      if (cleanCity) {
        try {
          const geoRes = await getApi(`/maps/geocode?address=${encodeURIComponent(cleanCity)}`)
          const loc = geoRes?.results?.[0]?.geometry?.location
          if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
            lat = loc.lat
            lng = loc.lng
          }
        } catch {
          // Backend will attempt geocoding as well
        }
      }

      if (token) {
        const res = await putApi("/user/profile", {
          city: cleanCity || null,
          ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
        })
        if (res?.profile?.latitude != null && res?.profile?.longitude != null) {
          lat = Number(res.profile.latitude)
          lng = Number(res.profile.longitude)
        }
      }

      if (cleanCity) {
        setCurrentCity(cleanCity)
        localStorage.setItem("userCity", cleanCity)
        if (lat != null && lng != null) {
          localStorage.setItem("userCityCoords", JSON.stringify({ lat, lng }))
        }
        setCitySaveMessage(`Location updated to "${cleanCity}". The map view will now center here.`)
      } else {
        setCurrentCity("")
        localStorage.removeItem("userCity")
        localStorage.removeItem("userCityCoords")
        setCitySaveMessage("Location cleared. The map view will use the default center.")
      }

      window.dispatchEvent(
        new CustomEvent("userLocationUpdated", {
          detail: { city: cleanCity || null, latitude: lat, longitude: lng },
        })
      )

      setTimeout(() => setCitySaveMessage(""), 5000)
    } catch (err) {
      setCitySaveError(err.message || "Failed to update location. Please try again.")
    } finally {
      setIsSavingCity(false)
    }
  }

  // Business Location & Hours state
  const [businessData, setBusinessData] = useState(() => getBusinessData(name || "My Business"))
  const [customLocAddress, setCustomLocAddress] = useState(() => {
    const b = getBusinessData(name || "My Business")
    return isBusinessScheduled(b) ? (b.address || "") : ""
  })
  const [customStartDateTime, setCustomStartDateTime] = useState(() => {
    const b = getBusinessData(name || "My Business")
    if (isBusinessScheduled(b) && b.startTime) {
      return toLocalDatetimeString(b.startTime)
    }
    return ""
  })
  const [customFinishDateTime, setCustomFinishDateTime] = useState(() => {
    const b = getBusinessData(name || "My Business")
    if (isBusinessScheduled(b) && b.expiresAt) {
      return toLocalDatetimeString(b.expiresAt)
    }
    return ""
  })
  const [saveMessage, setSaveMessage] = useState("")
  const [businessSaveError, setBusinessSaveError] = useState("")
  const [isSavingBusiness, setIsSavingBusiness] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const autocompleteRef = useRef(null)

  // Autocomplete query effect
  useEffect(() => {
    if (!customLocAddress || customLocAddress.trim().length < 2) {
      setSuggestions([])
      return
    }

    let isMounted = true
    setIsLoadingSuggestions(true)
    const timeout = setTimeout(() => {
      fetchAddressSuggestions(customLocAddress)
        .then((res) => {
          if (isMounted) {
            setSuggestions(res || [])
            if (res && res.length > 0) {
              setShowSuggestions(true)
            }
          }
        })
        .catch(() => {
          if (isMounted) setSuggestions([])
        })
        .finally(() => {
          if (isMounted) setIsLoadingSuggestions(false)
        })
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [customLocAddress])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Listen for business data updates
  useEffect(() => {
    const handleUpdate = (e) => {
      const updated = e?.detail || getBusinessData(name || "My Business")
      setBusinessData(updated)
      if (isBusinessScheduled(updated)) {
        setCustomLocAddress(updated.address || "")
        setCustomStartDateTime(toLocalDatetimeString(updated.startTime))
        setCustomFinishDateTime(toLocalDatetimeString(updated.expiresAt))
      } else {
        setCustomLocAddress("")
        setCustomStartDateTime("")
        setCustomFinishDateTime("")
      }
    }
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [name])

  // Timer to watch for schedule start and expiration
  useEffect(() => {
    if (!businessData || !isBusinessScheduled(businessData)) return

    if (isBusinessExpired(businessData)) {
      resetBusinessLocationHours(name || "My Business")
      setCustomLocAddress("")
      setCustomStartDateTime("")
      setCustomFinishDateTime("")
      return
    }

    const expTime = businessData.expiresAt
      ? new Date(businessData.expiresAt).getTime()
      : parseOperatingHours(businessData.hours)?.endDate?.getTime()

    const startTime = businessData.startTime
      ? new Date(businessData.startTime).getTime()
      : null

    const timers = []

    if (startTime && startTime > Date.now()) {
      const startDiff = startTime - Date.now()
      const startTimer = setTimeout(() => {
        setBusinessData(getBusinessData(name || "My Business"))
      }, Math.min(startDiff, 2147483647))
      timers.push(startTimer)
    }

    if (expTime) {
      const diff = expTime - Date.now()
      if (diff <= 0) {
        resetBusinessLocationHours(name || "My Business")
        setCustomLocAddress("")
        setCustomStartDateTime("")
        setCustomFinishDateTime("")
      } else {
        const timerId = setTimeout(() => {
          resetBusinessLocationHours(name || "My Business")
          setCustomLocAddress("")
          setCustomStartDateTime("")
          setCustomFinishDateTime("")
          setSaveMessage("Operating hours have ended. Location and hours have been reset, and pin removed from the map.")
          setTimeout(() => setSaveMessage(""), 5000)
        }, Math.min(diff, 2147483647))

        timers.push(timerId)
      }
    }

    return () => timers.forEach((t) => clearTimeout(t))
  }, [businessData, name])

  const handleSaveBusinessLocationHours = async (e) => {
    e.preventDefault()
    setIsSavingBusiness(true)
    setBusinessSaveError("")
    setSaveMessage("")
    setShowSuggestions(false)

    const cleanAddress = customLocAddress.trim()

    if (!cleanAddress) {
      setBusinessSaveError("Please enter a location or address.")
      setIsSavingBusiness(false)
      return
    }

    if (!customStartDateTime) {
      setBusinessSaveError("Please select a start date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (!customFinishDateTime) {
      setBusinessSaveError("Please select a finish date and time.")
      setIsSavingBusiness(false)
      return
    }

    const startDate = new Date(customStartDateTime)
    const finishDate = new Date(customFinishDateTime)

    if (isNaN(startDate.getTime())) {
      setBusinessSaveError("Please select a valid start date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (isNaN(finishDate.getTime())) {
      setBusinessSaveError("Please select a valid finish date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (finishDate.getTime() <= startDate.getTime()) {
      setBusinessSaveError("Finish time must be after the start time.")
      setIsSavingBusiness(false)
      return
    }

    // If finish date/time has already passed:
    if (finishDate.getTime() <= Date.now()) {
      resetBusinessLocationHours(name || "My Business")
      setCustomLocAddress("")
      setCustomStartDateTime("")
      setCustomFinishDateTime("")
      setBusinessSaveError("The finish date and time has already passed. Location and hours have been reset.")
      setIsSavingBusiness(false)
      return
    }

    // Geocode location
    let geo = null
    try {
      geo = await geocodeLocation(cleanAddress)
    } catch (err) {
      setBusinessSaveError(err.message || "Failed to find coordinates for this address.")
      setIsSavingBusiness(false)
      return
    }

    if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
      setBusinessSaveError(`Could not find coordinates for "${cleanAddress}". Please check the address.`)
      setIsSavingBusiness(false)
      return
    }

    const lat = geo.lat
    const lng = geo.lng
    const city = geo.city || cleanAddress.split(",").slice(1).join(",").trim() || "Local Area"
    const locationName = cleanAddress.split(",")[0]?.trim() || "Primary Location"
    const displayHours = formatScheduledHours(startDate, finishDate)

    // Save business data
    const updated = saveBusinessData({
      name: name || businessData.name || "My Business",
      locationName,
      address: geo.formattedAddress || cleanAddress,
      city,
      latitude: lat,
      longitude: lng,
      hours: displayHours,
      startTime: startDate.toISOString(),
      expiresAt: finishDate.toISOString(),
      isLive: true,
    })

    // Update backend profile if authenticated
    if (token) {
      try {
        await putApi("/user/profile", {
          city,
          latitude: lat,
          longitude: lng,
        })
      } catch {
        // Backend update optional
      }
    }

    setBusinessData(updated)
    setSaveMessage(`Location and operating hours scheduled! The map view will now center here.`)
    setTimeout(() => setSaveMessage(""), 5000)
    setIsSavingBusiness(false)
  }

  const handleResetBusinessLocation = () => {
    resetBusinessLocationHours(name || "My Business")
    setCustomLocAddress("")
    setCustomStartDateTime("")
    setCustomFinishDateTime("")
    setBusinessSaveError("")
    setSaveMessage("Location and hours have been reset. Pin removed from map.")
    setTimeout(() => setSaveMessage(""), 4000)
  }

  const handleSignOut = () => {
    logout()
    navigate("/")
  }

  const userDetails = [
    ["Account type", isBusiness ? "Business" : "Customer"],
    [isBusiness ? "Business name" : "Full name", name || "Not set"],
    ["Email address", email],
    ["Member since", formatDate(createdAt)],
    !isBusiness ? ["Location", currentCity || "Not set"] : null,
  ].filter(Boolean)

  return (
    <main className="page scroll-page profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{isBusiness ? "BUSINESS HUB" : "YOUR SPACE"}</p>
          <h2>{isBusiness ? "Business Account" : "Account Details"}</h2>
        </div>
        <button
            type="button"
            onClick={handleSignOut}
            style={{
              margin: "10px 0 5px",
              width: "80px",
              padding: "10px",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              background: "white",
              color: "#c92a2a",
              fontWeight: "600",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Sign out
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

          {/* CUSTOMER VIEW: Location (City) */}
          {!isBusiness && (
            <section className="profile-section">
              <div className="section-heading">
                <h3>Your location</h3>
                {currentCity && (
                  <span style={{ fontSize: "11px", color: "var(--forest)", fontWeight: "600" }}>
                    {currentCity}
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: 1.4 }}>
                Set your city to determine the center coordinates for the map view. For privacy reasons, enter your city only (not your street address). This field is optional and can be edited at any time.
              </p>
              <form onSubmit={handleSaveCustomerLocation} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                    City
                  </span>
                  <div className="input-shell">
                    <Icon name="pin" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. St. Louis, MO"
                      value={cityInput}
                      onChange={(e) => {setCityInput(e.target.value), setCurrentCity(e.target.value)}}
                      aria-label="City location"
                    />
                    {cityInput && (
                      <button
                        type="button"
                        onClick={() => setCityInput("")}
                        style={{
                          border: 0,
                          background: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          padding: "4px",
                          fontSize: "14px",
                          lineHeight: 1,
                        }}
                        title="Clear city input"
                        aria-label="Clear city input"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </label>

                {citySaveMessage && (
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
                    <Icon name="check" size={16} /> {citySaveMessage}
                  </div>
                )}

                {citySaveError && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: "#ffe3e3",
                      color: "#c92a2a",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {citySaveError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "9px", marginTop: "2px" }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSavingCity}
                    style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                  >
                    {isSavingCity
                      ? "Saving..."
                      : (cityInput.trim() ? "Save Location" : (currentCity ? "Clear Location" : "Save Location"))}{" "}
                    <Icon name="check" size={16} />
                  </button>
                  {currentCity && (
                    <button
                      type="button"
                      onClick={() => navigate("/")}
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
                      title="View on map"
                    >
                      <Icon name="map" size={16} /> Map
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* CUSTOMER VIEW: Favorite Vendors */}
          {!isBusiness && (
            <section className="profile-section">
              <div className="section-heading">
                <h3>Favorite vendors</h3>
                {favorites.length > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
                    {favorites.length} saved
                  </span>
                )}
              </div>
              {favorites.length ? (
                favorites.map((vendor, index) => (
                  <div
                    className="mini-vendor"
                    key={vendor.id || vendor.name || index}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (vendor.id) {
                        navigate(`/vendor/${encodeURIComponent(vendor.id)}`)
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && vendor.id) {
                        navigate(`/vendor/${encodeURIComponent(vendor.id)}`)
                      }
                    }}
                  >
                    <div className="mini-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
                    <div>
                      <h4>{vendor.name || "Unnamed vendor"}</h4>
                      <p>{[vendor.type, vendor.distance || vendor.city].filter(Boolean).join(" · ")}</p>
                    </div>
                    <button
                      type="button"
                      className="mini-fav-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFavorite(vendor.id)
                      }}
                      aria-label={`Remove ${vendor.name} from favorites`}
                      title="Remove from favorites"
                    >
                      <Icon name="heart" size={18} fill="#e11d48" color="#e11d48" />
                    </button>
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
              <section className={`business-status ${isBusinessLive(businessData) ? "live" : isBusinessScheduled(businessData) ? "scheduled" : "offline"}`}>
                <span><Icon name={isBusinessLive(businessData) ? "check" : "clock"} size={16} /></span>
                <div>
                  <h4>{isBusinessLive(businessData) ? "Your business is live" : isBusinessScheduled(businessData) ? "Operating hours scheduled" : "Location not active"}</h4>
                  <p>{isBusinessLive(businessData) ? "Visible to customers nearby on the map" : isBusinessScheduled(businessData) ? `Scheduled to go live on the map at ${formatDateTimeSingle(businessData.startTime)}` : "Set location and hours below to appear on the map"}</p>
                </div>
              </section>

              <section className="profile-section">
                <div className="section-heading">
                  <h3>Location & Hours</h3>
                </div>

                <div className="info-row">
                  <span>Current location</span>
                  <strong>{isBusinessScheduled(businessData) && (businessData.address || businessData.locationName) ? (businessData.address || businessData.locationName) : "Not set"}</strong>
                </div>
                <div className="info-row">
                  <span>Start time</span>
                  <strong>{isBusinessScheduled(businessData) && businessData.startTime ? formatDateTimeSingle(businessData.startTime) : "Not set"}</strong>
                </div>
                <div className="info-row">
                  <span>Finish time</span>
                  <strong>{isBusinessScheduled(businessData) && businessData.expiresAt ? formatDateTimeSingle(businessData.expiresAt) : "Not set"}</strong>
                </div>
                <div className="info-row">
                  <span>Operating hours</span>
                  <strong>{isBusinessScheduled(businessData) && (businessData.hours || (businessData.startTime && businessData.expiresAt)) ? (businessData.hours || formatScheduledHours(businessData.startTime, businessData.expiresAt)) : "Not set"}</strong>
                </div>

                <form onSubmit={handleSaveBusinessLocationHours} style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ position: "relative" }} ref={autocompleteRef}>
                    <label htmlFor="businessLocationInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Location / Address</span>
                      <div className="input-shell">
                        <Icon name="location" size={18} />
                        <input
                          id="businessLocationInput"
                          name="location"
                          type="text"
                          placeholder="e.g. 1122 NW River Street, Portland, OR 97209"
                          value={customLocAddress}
                          onChange={(e) => {
                            setCustomLocAddress(e.target.value)
                            setShowSuggestions(true)
                          }}
                          onFocus={() => {
                            if (suggestions.length > 0) setShowSuggestions(true)
                          }}
                          autoComplete="off"
                          required
                        />
                        {isLoadingSuggestions && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "4px" }}>...</span>
                        )}
                        {customLocAddress && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomLocAddress("")
                              setSuggestions([])
                              setShowSuggestions(false)
                            }}
                            className="clear-input-btn"
                            title="Clear address input"
                            aria-label="Clear address input"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="autocomplete-dropdown" role="listbox">
                        {suggestions.map((s) => (
                          <div
                            key={s.id}
                            className="autocomplete-item"
                            role="option"
                            tabIndex={0}
                            onClick={() => {
                              setCustomLocAddress(s.description)
                              setSuggestions([])
                              setShowSuggestions(false)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                setCustomLocAddress(s.description)
                                setSuggestions([])
                                setShowSuggestions(false)
                              }
                            }}
                          >
                            <Icon name="pin" size={14} color="var(--forest)" />
                            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <strong>{s.mainText}</strong>
                              {s.secondaryText && <span>{s.secondaryText}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="hours-grid">
                    <label htmlFor="businessStartTimeInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Start Time</span>
                      <div className="input-shell">
                        <Icon name="clock" size={18} />
                        <input
                          id="businessStartTimeInput"
                          name="startTime"
                          type="datetime-local"
                          aria-label="Start time"
                          value={customStartDateTime}
                          onChange={(e) => setCustomStartDateTime(e.target.value)}
                          required
                        />
                        {customStartDateTime && (
                          <button
                            type="button"
                            onClick={() => setCustomStartDateTime("")}
                            className="clear-input-btn"
                            title="Clear start time"
                            aria-label="Clear start time"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    <label htmlFor="businessFinishTimeInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Finish Time</span>
                      <div className="input-shell">
                        <Icon name="clock" size={18} />
                        <input
                          id="businessFinishTimeInput"
                          name="finishTime"
                          type="datetime-local"
                          aria-label="Finish time"
                          value={customFinishDateTime}
                          onChange={(e) => setCustomFinishDateTime(e.target.value)}
                          min={customStartDateTime || undefined}
                          required
                        />
                        {customFinishDateTime && (
                          <button
                            type="button"
                            onClick={() => setCustomFinishDateTime("")}
                            className="clear-input-btn"
                            title="Clear finish time"
                            aria-label="Clear finish time"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>
                  </div>

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

                  {businessSaveError && (
                    <div
                      style={{
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "#ffe3e3",
                        color: "#c92a2a",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {businessSaveError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "9px", marginTop: "2px" }}>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={isSavingBusiness}
                      style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                    >
                      {isSavingBusiness ? "Saving..." : "Save Location & Hours"} <Icon name="check" size={16} />
                    </button>
                    {isBusinessScheduled(businessData) && (
                      <button
                        type="button"
                        onClick={handleResetBusinessLocation}
                        style={{
                          padding: "0 14px",
                          border: "1px solid var(--line)",
                          borderRadius: "13px",
                          background: "white",
                          color: "#c92a2a",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          minHeight: "44px",
                        }}
                        title="Reset location and hours"
                      >
                        Reset
                      </button>
                    )}
                    {isBusinessScheduled(businessData) && (
                      <button
                        type="button"
                        onClick={() => navigate("/")}
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
                        title="View on map"
                      >
                        <Icon name="map" size={16} /> Map
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </>
          )}

          {isBusiness && (
            <SettingsList
              items={
                [
                  ["View business details page", "briefcase", () => navigate("/vendor/my-business")],
                  ["View live pin on map", "map", () => navigate("/")],
                ]
              }
            />
          )}
        </>
      )}
    </main>
  )
}

