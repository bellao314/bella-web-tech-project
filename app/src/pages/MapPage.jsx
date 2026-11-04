import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapView from "../components/MapView"
import SearchBar from "../components/SearchBar"
import { collectionFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

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
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { data, loading, error } = useApiResource("/vendors", [])
  const vendors = useMemo(() => collectionFrom(data, ["vendors"]).map(vendorFrom), [data])

  // The only vendors that show up in the list view are the ones immediately displayed as pins in view
  const visibleVendors = useMemo(() => {
    if (!bounds) return vendors
    return vendors.filter((vendor) => isLocationInBounds(vendor, bounds))
  }, [vendors, bounds])

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
        <SearchBar placeholder="Search vendors or categories" />
      </div>

      <MapView
        vendors={vendors}
        onBoundsChange={setBounds}
        selectedVendorId={selected}
        onSelectVendor={handleSelectVendor}
      />

      <section className="vendor-sheet">
        <div className="sheet-title">
          <div>
            <h3>Vendors in view</h3>
            <p>
              {loading
                ? "Loading vendors…"
                : `${visibleVendors.length} ${visibleVendors.length === 1 ? "place" : "places"} nearby`}
            </p>
          </div>
        </div>

        <div className="vendor-list" ref={listRef}>
          {error && <p className="empty-state">Unable to load vendors.</p>}
          {!loading && !error && visibleVendors.length === 0 && (
            <p className="empty-state">No vendors are available in this area.</p>
          )}
          {visibleVendors.map((vendor, index) => {
            const id = vendor.id ? String(vendor.id) : String(index)
            const isSelected = selected === id

            return (
              <button
                key={id}
                id={`vendor-card-${id}`}
                className={isSelected ? "vendor-card selected" : "vendor-card"}
                onClick={() => {
                  setSelected(id)
                  navigate(`/vendor/${encodeURIComponent(id)}`)
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
                    </small>
                  )}
                </div>
                <Icon name="chevron" size={17} />
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
