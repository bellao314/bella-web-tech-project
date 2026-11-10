import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapView from "../components/MapView"
import SearchBar from "../components/SearchBar"
import { collectionFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { getBusinessData } from "../lib/business"
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
  const [businessData, setBusinessData] = useState(() => getBusinessData())

  useEffect(() => {
    const handleUpdate = (e) => setBusinessData(e?.detail || getBusinessData())
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [])

  const vendors = useMemo(() => {
    const list = collectionFrom(data, ["vendors"]).map(vendorFrom)
    if (!businessData) return list

    const businessVendor = vendorFrom({
      id: businessData.id || "my-business",
      name: businessData.name || "My Business",
      type: businessData.category || "Mobile Vendor",
      city: businessData.city || businessData.locationName,
      address: businessData.address || businessData.locationName,
      hours: businessData.hours,
      latitude: Number(businessData.latitude),
      longitude: Number(businessData.longitude),
      rating: "5.0",
      distance: "0.1 mi",
    })

    if (!Number.isFinite(businessVendor.latitude) || !Number.isFinite(businessVendor.longitude)) {
      return list
    }

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

  const searchedVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors
    const q = searchQuery.toLowerCase().trim()
    return vendors.filter((vendor) => matchesVendorSearch(vendor, q))
  }, [vendors, searchQuery])

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
                      <span>★ {vendor.rating}</span>
                    </div>
                    {vendor.type && <p>{vendor.type}</p>}
                    {(vendor.distance || vendor.city) && (
                      <small>
                        <Icon name="pin" size={13} /> {vendor.distance || vendor.city}
                        {vendor.hours ? ` · ${vendor.hours}` : ""}
                      </small>
                    )}
                  </div>
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
                  <div className="chevron-icon">
                    <Icon name="chevron" size={17} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      <MapView
        vendors={searchedVendors}
        onBoundsChange={setBounds}
        selectedVendorId={selected}
        onSelectVendor={handleSelectVendor}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />
    </main>
  )
}
