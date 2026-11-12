import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapView from "../components/MapView"
import SearchBar from "../components/SearchBar"
import { collectionFrom, vendorFrom, getApi, valueFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { useAuth } from "../hooks/useAuth"
import {
  getBusinessData,
  isBusinessLive,
  isBusinessScheduled,
  isBusinessExpired,
  resetBusinessLocationHours,
  parseOperatingHours,
  calculateDistanceInMiles,
  formatDistance,
  setStoredAccountType,
} from "../lib/business"
import { matchesVendorSearch } from "../lib/search"

function isLocationInBounds(vendor, bounds) {
  if (!vendor || !bounds) return false
  const lat = Number(vendor.latitude)
  const lng = Number(vendor.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false

  const { north, south, east, west } = bounds
  const inLat = lat >= south && lat <= north
  const inLng =
    west <= east
      ? lng >= west && lng <= east
      : lng >= west || lng <= east

  return inLat && inLng
}

export default function MapPage() {
  const [selected, setSelected] = useState(null)
  const [bounds, setBounds] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { data, loading, error } = useApiResource("/vendors", [])
  const { isFavorite, toggleFavorite } = useFavorites()
  const { token } = useAuth()
  const { data: profileData } = useApiResource(token ? "/user/profile" : null, null)
  const profile = profileData?.profile || profileData?.data || profileData
  const apiAccountType = valueFrom(profile, ["type", "accountType", "account_type", "role"]) 
  const accountType = (apiAccountType || localStorage.getItem("userAccountType") || "customer").toLowerCase()
  const isBusiness = accountType === "business" || accountType === "vendor"

  useEffect(() => {
    if (apiAccountType && apiAccountType.toLowerCase() !== localStorage.getItem("userAccountType")) {
      setStoredAccountType(apiAccountType.toLowerCase())
    }
  }, [apiAccountType])

  const [updatedLocation, setUpdatedLocation] = useState(null)

  useEffect(() => {
    const handleLocationUpdate = (e) => {
      const detail = e?.detail
      if (!detail) {
        setUpdatedLocation({ city: null, coords: null })
        return
      }
      const coords =
        Number.isFinite(detail.latitude) && Number.isFinite(detail.longitude)
          ? { lat: Number(detail.latitude), lng: Number(detail.longitude) }
          : null
      setUpdatedLocation({ city: detail.city || null, coords })
    }

    window.addEventListener("userLocationUpdated", handleLocationUpdate)
    return () => window.removeEventListener("userLocationUpdated", handleLocationUpdate)
  }, [])

  useEffect(() => {
    if (!profile?.city) return
    const hasProfileCoords = profile.latitude != null && profile.longitude != null
    if (hasProfileCoords) return

    let isCancelled = false
    getApi(`/maps/geocode?address=${encodeURIComponent(profile.city)}`)
      .then((geo) => {
        if (isCancelled) return
        const loc = geo?.results?.[0]?.geometry?.location
        if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          const newCoords = { lat: Number(loc.lat), lng: Number(loc.lng) }
          localStorage.setItem("userCityCoords", JSON.stringify(newCoords))
          setUpdatedLocation({ city: profile.city, coords: newCoords })
        }
      })
      .catch(() => {})

    return () => {
      isCancelled = true
    }
  }, [profile])

  const [businessData, setBusinessData] = useState(() => getBusinessData())

  useEffect(() => {
    const handleUpdate = (e) => setBusinessData(e?.detail || getBusinessData())
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [])

  // Timer to watch for business hours start and expiration while on the map
  useEffect(() => {
    if (!businessData || !isBusinessScheduled(businessData)) return

    if (isBusinessExpired(businessData)) {
      resetBusinessLocationHours()
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
        setBusinessData(getBusinessData())
      }, Math.min(startDiff, 2147483647))
      timers.push(startTimer)
    }

    if (expTime) {
      const diff = expTime - Date.now()
      if (diff <= 0) {
        resetBusinessLocationHours()
      } else {
        const timerId = setTimeout(() => {
          resetBusinessLocationHours()
        }, Math.min(diff, 2147483647))
        timers.push(timerId)
      }
    }

    return () => timers.forEach((t) => clearTimeout(t))
  }, [businessData])

  const userLocation = useMemo(() => {
    // If business has an active location and operating hours, center the map there
    if (businessData && isBusinessScheduled(businessData)) {
      const bLat = Number(businessData.latitude)
      const bLng = Number(businessData.longitude)
      if (Number.isFinite(bLat) && Number.isFinite(bLng)) {
        return {
          city: businessData.city || businessData.address,
          coords: { lat: bLat, lng: bLng },
        }
      }
    }

    if (updatedLocation) {
      return updatedLocation
    }

    if (profile) {
      if (profile.city === null) {
        return { city: null, coords: null }
      }
      if (profile.city) {
        let coords = null
        if (profile.latitude != null && profile.longitude != null) {
          coords = { lat: Number(profile.latitude), lng: Number(profile.longitude) }
        }
        if (!coords) {
          try {
            const stored = localStorage.getItem("userCityCoords")
            if (stored) {
              const parsed = JSON.parse(stored)
              if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
                coords = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
              }
            }
          } catch {
            coords = null
          }
        }
        return { city: profile.city, coords }
      }
    }

    const city = localStorage.getItem("userCity") || null
    let coords = null
    try {
      const stored = localStorage.getItem("userCityCoords")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          coords = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
        }
      }
    } catch {
      coords = null
    }
    return { city, coords }
  }, [businessData, updatedLocation, profile])

  const vendors = useMemo(() => {
    const list = collectionFrom(data, ["vendors"]).map(vendorFrom)
    if (!businessData || !isBusinessLive(businessData)) return list

    const lat = Number(businessData.latitude)
    const lng = Number(businessData.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return list
    }

    const businessVendor = vendorFrom({
      id: businessData.id || "my-business",
      name: businessData.name || "My Business",
      type: businessData.category || "Mobile Vendor",
      city: businessData.city || businessData.locationName,
      address: businessData.address || businessData.locationName,
      hours: businessData.hours,
      latitude: lat,
      longitude: lng,
      distance: null,
    })

    const existingIndex = list.findIndex(
      (v) => String(v.id) === String(businessVendor.id) || v.name?.toLowerCase() === businessVendor.name?.toLowerCase()
    )

    if (existingIndex >= 0) {
      const updated = [...list]
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...businessVendor,
        id: updated[existingIndex].id,
      }
      return updated
    }

    return [businessVendor, ...list]
  }, [data, businessData])

  const sortedVendors = useMemo(() => {
    const userLat = Number(userLocation?.coords?.lat)
    const userLng = Number(userLocation?.coords?.lng)
    const hasUserCoords = Number.isFinite(userLat) && Number.isFinite(userLng)

    if (!hasUserCoords) {
      return vendors.map((vendor) => ({
        ...vendor,
        distance: null,
        distanceInMiles: null,
      }))
    }

    const listWithDistance = vendors.map((vendor) => {
      const vLat = Number(vendor.latitude ?? vendor.location?.latitude ?? vendor.lat)
      const vLng = Number(vendor.longitude ?? vendor.location?.longitude ?? vendor.lng)

      if (Number.isFinite(vLat) && Number.isFinite(vLng)) {
        const miles = calculateDistanceInMiles(userLat, userLng, vLat, vLng)
        return {
          ...vendor,
          distanceInMiles: miles,
          distance: formatDistance(miles),
        }
      }

      return {
        ...vendor,
        distanceInMiles: Infinity,
        distance: null,
      }
    })

    return [...listWithDistance].sort((a, b) => {
      const distA = a.distanceInMiles != null ? a.distanceInMiles : Infinity
      const distB = b.distanceInMiles != null ? b.distanceInMiles : Infinity
      return distA - distB
    })
  }, [vendors, userLocation.coords?.lat, userLocation.coords?.lng])

  const searchedVendors = useMemo(() => {
    if (!searchQuery.trim()) return sortedVendors
    const q = searchQuery.toLowerCase().trim()
    return sortedVendors.filter((vendor) => matchesVendorSearch(vendor, q))
  }, [sortedVendors, searchQuery])

  // Display vendors within bounds, or all search matches if none fall within current view
  const visibleVendors = useMemo(() => {
    if (!bounds) return searchedVendors
    const inBounds = searchedVendors.filter((vendor) => isLocationInBounds(vendor, bounds))
    if (searchQuery.trim() && inBounds.length === 0) {
      return searchedVendors
    }
    return inBounds
  }, [searchedVendors, bounds, searchQuery])

  // Automatically scroll the list to the selected vendor when its pin is clicked
  useEffect(() => {
    if (!selected) return

    const scrollToSelectedCard = () => {
      const container = listRef.current
      const cardEl = document.getElementById(`vendor-card-${selected}`)
      if (!container || !cardEl) return

      const containerRect = container.getBoundingClientRect()
      const cardRect = cardEl.getBoundingClientRect()
      const targetScrollTop = container.scrollTop + (cardRect.top - containerRect.top) - 10

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "smooth",
      })
    }

    // Run on requestAnimationFrame and short fallback timeout for DOM updates
    const rafId = requestAnimationFrame(scrollToSelectedCard)
    const timer = setTimeout(scrollToSelectedCard, 80)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [selected, visibleVendors])

  const handleSelectVendor = useCallback((vendor, shouldNavigate = false) => {
    if (!vendor) {
      setSelected(null)
      return
    }
    const id = String(vendor.id)
    setSelected(id)
    if (shouldNavigate) {
      navigate(`/vendor/${encodeURIComponent(id)}`)
    }
  }, [navigate])

  return (
    <main className="page map-page">
      <div className="sidebar-overlay">
        <div className="map-top-bar">
          <header className="page-header overlay-header">
            <div>
              <p className="eyebrow">EXPLORE</p>
              <h2>Nearby vendors</h2>
            </div>
            <button className="avatar-button" onClick={() => navigate("/profile")} aria-label="Open profile">
              <Icon name="user" size={17} />
            </button>
          </header>

          <div className="map-search">
            <SearchBar
              placeholder="Search vendors or categories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </div>

        <section className="vendor-sheet">
          <div className="sheet-title">
            <div>
              <h3>{searchQuery.trim() ? "Search results" : "Vendors in view"}</h3>
              <p>
                {loading
                  ? "Loading vendors…"
                  : `${visibleVendors.length} ${visibleVendors.length === 1 ? "place" : "places"} ${searchQuery.trim() ? "found" : "nearby"}`}
              </p>
            </div>
          </div>

          <div className="vendor-list" ref={listRef}>
            {error && <p className="empty-state">Unable to load vendors.</p>}
            {!loading && !error && visibleVendors.length === 0 && (
              <p className="empty-state">
                {searchQuery.trim()
                  ? `No vendors found matching "${searchQuery}".`
                  : "No vendors are available in this area."}
              </p>
            )}
            {visibleVendors.map((vendor, index) => {
              const id = vendor.id ? String(vendor.id) : String(index)
              const isSelected = selected === id
              const isFav = isFavorite(vendor.id)

              return (
                <div
                  key={id}
                  id={`vendor-card-${id}`}
                  className={isSelected ? "vendor-card selected" : "vendor-card"}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelected(id)
                    navigate(`/vendor/${encodeURIComponent(id)}`)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelected(id)
                      navigate(`/vendor/${encodeURIComponent(id)}`)
                    }
                  }}
                >
                  <div className="vendor-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
                  <div className="vendor-info">
                    <div>
                      <h4>{vendor.name}</h4>
                    </div>
                    {vendor.type && <p>{vendor.type}</p>}
                    {(vendor.distance || vendor.city) && (
                      <small>
                        <Icon name="pin" size={13} /> {[vendor.distance, vendor.city].filter(Boolean).join(" · ")}
                        {vendor.hours ? ` · ${vendor.hours}` : ""}
                      </small>
                    )}
                  </div>
                  {!isBusiness && (
                    <button
                      type="button"
                      className={`vendor-fav-btn ${isFav ? "is-favorite" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(vendor)
                      }}
                      aria-label={isFav ? `Remove ${vendor.name} from favorites` : `Add ${vendor.name} to favorites`}
                      title={isFav ? "Favorited" : "Add to favorites"}
                    >
                      <Icon
                        name="heart"
                        size={18}
                        fill={isFav ? "#e11d48" : "none"}
                        color={isFav ? "#e11d48" : "currentColor"}
                      />
                    </button>
                  )}
                  <div className="chevron-icon">
                    <Icon name="chevron" size={17} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      <div className="map-container">
        <MapView
          vendors={searchedVendors}
          onBoundsChange={setBounds}
          selectedVendorId={selected}
          onSelectVendor={handleSelectVendor}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          userCoordinates={userLocation.coords}
          userCity={userLocation.city}
        />
      </div>
    </main>
  )
}
