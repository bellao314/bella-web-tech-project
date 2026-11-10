import { useMemo, useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import { vendorFrom, valueFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { getBusinessData } from "../lib/business"

export default function VendorInfoPage() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const isMyBusiness = vendorId === "my-business"
  const { data, loading, error } = useApiResource(vendorId && !isMyBusiness ? `/vendors/${encodeURIComponent(vendorId)}` : null, null)
  const { isFavorite, toggleFavorite } = useFavorites()

  const [businessData, setBusinessData] = useState(() => getBusinessData())

  useEffect(() => {
    const handleUpdate = (e) => setBusinessData(e?.detail || getBusinessData())
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [])

  const vendor = useMemo(() => {
    if (isMyBusiness) {
      return vendorFrom({
        id: "my-business",
        name: businessData.name || "My Business",
        type: businessData.category || "Mobile Food & Beverage",
        category: businessData.category || "Mobile Food & Beverage",
        city: businessData.city || businessData.locationName,
        address: businessData.address || businessData.locationName,
        hours: businessData.hours,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        rating: "5.0 (Live)",
      })
    }

    if (data) {
      const v = vendorFrom(data.vendor || data.data || data)
      if (businessData && (String(v.id) === String(businessData.id) || v.name?.toLowerCase() === businessData.name?.toLowerCase())) {
        return {
          ...v,
          hours: businessData.hours || v.hours,
          address: businessData.address || businessData.locationName || v.address,
          city: businessData.city || v.city,
          latitude: businessData.latitude || v.latitude,
          longitude: businessData.longitude || v.longitude,
        }
      }
      return v
    }

    // Fallback if vendor not found in API but matches business
    if (businessData && (!vendorId || vendorId === String(businessData.id))) {
      return vendorFrom({
        id: businessData.id || "my-business",
        name: businessData.name || "My Business",
        type: businessData.category || "Mobile Food & Beverage",
        category: businessData.category || "Mobile Food & Beverage",
        city: businessData.city || businessData.locationName,
        address: businessData.address || businessData.locationName,
        hours: businessData.hours,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        rating: "5.0 (Live)",
      })
    }

    return null
  }, [data, vendorId, isMyBusiness, businessData])

  const isFav = vendor ? isFavorite(vendor.id) : false

  return (
    <main className="page scroll-page profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{isMyBusiness ? "YOUR BUSINESS" : "VENDOR"}</p>
          <h2>Details</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {vendor && !isMyBusiness && (
            <button
              type="button"
              className={`icon-button favorite-icon-button ${isFav ? "is-favorite" : ""}`}
              onClick={() => toggleFavorite(vendor)}
              aria-label={isFav ? `Remove ${vendor.name} from favorites` : `Add ${vendor.name} to favorites`}
              title={isFav ? "Favorited" : "Add to favorites"}
            >
              <Icon
                name="heart"
                size={20}
                fill={isFav ? "#e11d48" : "none"}
                color={isFav ? "#e11d48" : "currentColor"}
              />
            </button>
          )}
          <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
            <Icon name="arrow" size={20} />
          </button>
        </div>
      </header>

      {loading && <p className="empty-state">Loading vendor…</p>}
      {error && !vendor && <p className="empty-state">Vendor data is unavailable.</p>}
      {!loading && !error && !vendor && <p className="empty-state">No vendor was selected.</p>}

      {vendor && (
        <>
          <section className="profile-card">
            <div className="profile-avatar">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3>{vendor.name || "Unnamed vendor"}</h3>
              <p>{[vendor.type, vendor.city || vendor.address].filter(Boolean).join(" · ")}</p>
            </div>
            {!isMyBusiness && (
              <button
                type="button"
                className={`favorite-card-btn ${isFav ? "is-favorite" : ""}`}
                onClick={() => toggleFavorite(vendor)}
                aria-label={isFav ? `Remove ${vendor.name} from favorites` : `Add ${vendor.name} to favorites`}
              >
                <Icon
                  name="heart"
                  size={18}
                  fill={isFav ? "#e11d48" : "none"}
                  color={isFav ? "#e11d48" : "currentColor"}
                />
                <span>{isFav ? "Favorited" : "Favorite"}</span>
              </button>
            )}
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <h3>Business information</h3>
              {isMyBusiness && (
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  style={{ border: 0, background: "none", color: "var(--forest)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                >
                  Edit details
                </button>
              )}
            </div>
            {[
              ["Category", valueFrom(vendor, ["category", "type"])],
              ["Hours today", valueFrom(vendor, ["hours", "openingHours"])],
              ["Primary location", valueFrom(vendor, ["address", "city"])],
            ]
              .filter(([, value]) => value !== "")
              .map(([label, value]) => (
                <div className="info-row" key={label}>
                  <span>{label}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
          </section>

          <div style={{ padding: "0 22px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/")}
            >
              View on Map <Icon name="map" size={18} />
            </button>
          </div>
        </>
      )}
    </main>
  )
}

