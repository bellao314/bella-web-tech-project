import { useMemo, useState, useEffect } from "react"
import { useParams, useNavigate, Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import Icon from "../components/Icon"
import { vendorFrom, valueFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { getBusinessData } from "../lib/business"
import { getVendorKeywords } from "../lib/search"
import { getVendorCategories } from "../lib/recommendations"

export default function VendorInfoPage() {
  const { vendorId } = useParams()
  const navigate = useNavigate()
  const { isVendor, isAuthenticated, user } = useAuth()
  const isMyBusiness = vendorId === "my-business" || !vendorId
  const { data, loading, error } = useApiResource(vendorId && !isMyBusiness ? `/vendors/${encodeURIComponent(vendorId)}` : null, null)
  const { isFavorite, toggleFavorite } = useFavorites()

  const [businessData, setBusinessData] = useState(() => getBusinessData(user?.name || "My Business"))

  useEffect(() => {
    const handleUpdate = (e) => setBusinessData(e?.detail || getBusinessData(user?.name || "My Business"))
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [user?.name])

  const vendor = useMemo(() => {
    let result = null
    if (isMyBusiness) {
      result = vendorFrom({
        id: "my-business",
        name: businessData.name || "My Business",
        type: businessData.category || "Mobile Food & Beverage",
        category: businessData.category || "Mobile Food & Beverage",
        city: businessData.city || businessData.locationName,
        address: businessData.address || businessData.locationName,
        hours: businessData.hours,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        keywords: businessData.keywords,
        logo: businessData.logo || null,
        banner: businessData.banner || null,
      })
    } else if (data) {
      const v = vendorFrom(data.vendor || data.data || data)
      const isCustomMatch = businessData && (String(v.id) === String(businessData.id) || v.name?.toLowerCase() === businessData.name?.toLowerCase())
      const keywords = isCustomMatch && businessData.keywords ? businessData.keywords : (v.keywords || getVendorKeywords(v))
      if (isCustomMatch) {
        result = {
          ...v,
          hours: businessData.hours || v.hours,
          address: businessData.address || businessData.locationName || v.address,
          city: businessData.city || v.city,
          latitude: businessData.latitude || v.latitude,
          longitude: businessData.longitude || v.longitude,
          keywords,
          logo: businessData.logo || v.logo,
          banner: businessData.banner || v.banner,
        }
      } else {
        result = {
          ...v,
          keywords,
        }
      }
    } else if (businessData && (!vendorId || vendorId === String(businessData.id))) {
      result = vendorFrom({
        id: businessData.id || "my-business",
        name: businessData.name || "My Business",
        type: businessData.category || "Mobile Food & Beverage",
        category: businessData.category || "Mobile Food & Beverage",
        city: businessData.city || businessData.locationName,
        address: businessData.address || businessData.locationName,
        hours: businessData.hours,
        latitude: businessData.latitude,
        longitude: businessData.longitude,
        keywords: businessData.keywords,
        logo: businessData.logo || null,
        banner: businessData.banner || null,
      })
    }

    if (result) {
      const cats = getVendorCategories(result)
      return {
        ...result,
        categories: cats.map((c) => c.label),
      }
    }

    return null
  }, [data, vendorId, isMyBusiness, businessData])

  const isFav = vendor ? isFavorite(vendor.id) : false

  if (isMyBusiness && isAuthenticated && !isVendor) {
    return <Navigate to="/recommended" replace />
  }

  if (isMyBusiness && !isAuthenticated) {
    return <Navigate to="/" replace />
  }

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
          <button
            className="icon-button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1)
              } else {
                navigate("/")
              }
            }}
            aria-label="Go back"
          >
            <Icon name="arrow" size={20} />
          </button>
        </div>
      </header>

      {loading && <p className="empty-state">Loading vendor…</p>}
      {error && !vendor && <p className="empty-state">Vendor data is unavailable.</p>}
      {!loading && !error && !vendor && <p className="empty-state">No vendor was selected.</p>}

      {vendor && (
        <>
          {vendor.banner && (
            <div className="vendor-banner-header" style={{ margin: "0 22px 14px", borderRadius: "16px", overflow: "hidden", height: "140px", position: "relative" }}>
              <img src={vendor.banner} alt={`${vendor.name} banner`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", bottom: "8px", right: "12px", background: "rgba(0,0,0,0.55)", color: "#ffffff", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 600 }}>
                Recommendations Banner
              </div>
            </div>
          )}

          <section className="profile-card">
            {vendor.logo ? (
              <div className="profile-avatar has-logo">
                <img src={vendor.logo} alt={vendor.name} className="profile-avatar-img" />
              </div>
            ) : (
              <div className="profile-avatar">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
            )}
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

            {isMyBusiness && (
              <>
                <div className="info-row">
                  <span>Map page logo</span>
                  <strong style={{ color: vendor.logo ? "var(--forest)" : "var(--muted)" }}>
                    {vendor.logo ? "Uploaded ✓" : "Not uploaded"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>Recommendations banner</span>
                  <strong style={{ color: vendor.banner ? "var(--forest)" : "var(--muted)" }}>
                    {vendor.banner ? "Uploaded ✓" : "Not uploaded"}
                  </strong>
                </div>
              </>
            )}

            {Array.isArray(vendor.categories) && vendor.categories.length > 0 && (
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Keyword Categories
                </span>
                <div className="keyword-chip-list" style={{ marginTop: "6px" }}>
                  {vendor.categories.map((cat) => (
                    <span key={cat} className="keyword-chip keyword-match">
                      ★ {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(vendor.keywords) && vendor.keywords.length > 0 && (
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Profile Keywords
                </span>
                <div className="keyword-chip-list" style={{ marginTop: "6px" }}>
                  {vendor.keywords.map((kw) => (
                    <span key={kw} className="keyword-chip">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

