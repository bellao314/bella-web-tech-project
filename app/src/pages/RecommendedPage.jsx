import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import { collectionFrom, valueFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { calculateRecommendations, getCustomerLikedCategories } from "../lib/recommendations"
import { matchesVendorSearch } from "../lib/search"

export default function RecommendedPage() {
  const navigate = useNavigate()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()

  const userCoords = useMemo(() => {
    try {
      const stored = localStorage.getItem("userCityCoords")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return null
  }, [])

  const currentCity = useMemo(() => {
    try {
      return localStorage.getItem("userCity") || ""
    } catch {
      return ""
    }
  }, [])

  const endpoint = useMemo(() => {
    const params = new URLSearchParams()
    if (userCoords?.lat != null && userCoords?.lng != null) {
      params.set("lat", String(userCoords.lat))
      params.set("lng", String(userCoords.lng))
    }
    if (favorites.length > 0) {
      params.set("favorites", favorites.map((f) => f.id).filter(Boolean).join(","))
    }
    params.set("limit", "6")
    const query = params.toString()
    return `/recommendations${query ? `?${query}` : ""}`
  }, [userCoords, favorites])

  const { data, loading, error } = useApiResource(endpoint, [endpoint])

  // Extract customer's liked keyword categories from their favorites
  const customerLikedCategories = useMemo(() => {
    const categoryMap = getCustomerLikedCategories(favorites)
    return Array.from(categoryMap.values())
      .sort((a, b) => b.weight - a.weight)
  }, [favorites])

  // Compute up to 6 recommended vendors weighted by proximity in miles and keyword categories
  const cards = useMemo(() => {
    const rawList = collectionFrom(data, ["recommendations", "vendors"]).map(vendorFrom)

    // Run the recommendation algorithm focusing on keyword categories and proximity
    const recommended = calculateRecommendations({
      vendors: rawList,
      userCoords,
      favorites,
      limit: 6,
    })

    return recommended.filter((v) => matchesVendorSearch(v)).slice(0, 6)
  }, [data, userCoords, favorites])

  return (
    <main className="page scroll-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">FOR YOU</p>
          <h2>Recommendations</h2>
        </div>
        <button className="avatar-button" onClick={() => navigate("/profile")} aria-label="Open profile">
          <Icon name="user" size={17} />
        </button>
      </header>

      {/* Recommendations Info Banner */}
      <div className="recommend-intro" style={{ marginBottom: "12px" }}>
        <div className="sparkle">
          <Icon name="heart" size={20} fill="var(--forest)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: "14px", margin: "0 0 2px" }}>Category-Ranked For You</h3>
          {customerLikedCategories.length > 0 ? (
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.35 }}>
              Ranked by proximity{currentCity ? ` to ${currentCity}` : ""} and your liked categories:{" "}
              <strong style={{ color: "var(--forest)" }}>
                {customerLikedCategories.slice(0, 3).map((c) => c.label).join(", ")}
                {customerLikedCategories.length > 3 ? "…" : ""}
              </strong>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.35 }}>
              Tap the heart on vendors you like to get recommendations ranked by your favorite keyword categories!
            </p>
          )}
        </div>
      </div>

      <section className="recommend-list">
        {loading && <p className="empty-state">Loading recommendations…</p>}
        {error && <p className="empty-state">Recommendations are unavailable.</p>}
        {!loading && !error && cards.length === 0 && (
          <p className="empty-state">No recommendations are available yet.</p>
        )}

        {cards.map((card, index) => {
          const isFav = isFavorite(card.id)
          const note = valueFrom(card, ["note", "reason", "description"])
          const categories = Array.isArray(card.categories) ? card.categories : []
          const matchingCategories = Array.isArray(card.matchingCategories) ? card.matchingCategories : []
          const keywords = Array.isArray(card.keywords) ? card.keywords : []

          return (
            <article
              className="recommend-card"
              key={card.id || card.name || index}
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (card.id) {
                  navigate(`/vendor/${encodeURIComponent(card.id)}`)
                }
              }}
            >
              <div className="card-visual">
                <button
                  type="button"
                  className={isFav ? "is-favorite" : ""}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(card)
                  }}
                  aria-label={isFav ? `Remove ${card.name || "vendor"} from favorites` : `Save ${card.name || "vendor"}`}
                  title={isFav ? "Favorited" : "Save to favorites"}
                >
                  <Icon
                    name="heart"
                    size={20}
                    fill={isFav ? "#e11d48" : "none"}
                    color={isFav ? "#e11d48" : "currentColor"}
                  />
                </button>
                <div className="sketch-shape" />
              </div>

              <div className="card-body" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {note && <p style={{ margin: "0 0 3px", color: "var(--forest)", fontSize: "10px", fontWeight: 800 }}>{note}</p>}
                    <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>{card.name || "Unnamed vendor"}</h3>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                      {[card.type, card.distance || card.city].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="round-arrow"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (card.id) {
                        navigate(`/vendor/${encodeURIComponent(card.id)}`)
                      }
                    }}
                    aria-label={`View ${card.name || "vendor"}`}
                  >
                    <Icon name="arrow" size={18} />
                  </button>
                </div>

                {/* Keyword Categories Badges */}
                {categories.length > 0 && (
                  <div className="keyword-chip-list">
                    {categories.slice(0, 3).map((cat) => {
                      const isMatch = matchingCategories.includes(cat)
                      return (
                        <span
                          key={cat}
                          className={`keyword-chip ${isMatch ? "keyword-match" : ""}`}
                          title={isMatch ? `Matches your liked category: "${cat}"` : cat}
                        >
                          {isMatch && "★ "}{cat}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Sub-keywords preview */}
                {keywords.length > 0 && (
                  <div style={{ fontSize: "10px", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Tags: {keywords.slice(0, 5).join(", ")}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
