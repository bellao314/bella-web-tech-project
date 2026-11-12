import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SearchBar from "../components/SearchBar"
import { collectionFrom, valueFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { calculateRecommendations, getCustomerLikedKeywords } from "../lib/recommendations"
import { matchesVendorSearch } from "../lib/search"

export default function RecommendedPage() {
  const navigate = useNavigate()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const [searchQuery, setSearchQuery] = useState("")

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

  // Extract customer's liked keywords from their favorites for display & transparency
  const customerLikedKeywords = useMemo(() => {
    const weights = getCustomerLikedKeywords(favorites)
    return Array.from(weights.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([kw]) => kw)
  }, [favorites])

  // Compute up to 6 recommended vendors weighted by proximity in miles and relevant keywords
  const cards = useMemo(() => {
    const rawList = collectionFrom(data, ["recommendations", "vendors"]).map(vendorFrom)

    // Run the recommendation algorithm weighted by proximity and relevant keywords
    const recommended = calculateRecommendations({
      vendors: rawList,
      userCoords,
      favorites,
      limit: 6,
    })

    if (!searchQuery.trim()) {
      return recommended.slice(0, 6)
    }

    return recommended.filter((v) => matchesVendorSearch(v, searchQuery)).slice(0, 6)
  }, [data, userCoords, favorites, searchQuery])

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
          <h3 style={{ fontSize: "14px", margin: "0 0 2px" }}>Personalized for you</h3>
          {customerLikedKeywords.length > 0 ? (
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.35 }}>
              Weighted by proximity{currentCity ? ` to ${currentCity}` : ""} and your liked keywords:{" "}
              <strong style={{ color: "var(--forest)" }}>
                {customerLikedKeywords.slice(0, 4).join(", ")}
                {customerLikedKeywords.length > 4 ? "…" : ""}
              </strong>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", lineHeight: 1.35 }}>
              Tap the heart on vendors you love to personalize recommendations by your favorite keywords!
            </p>
          )}
        </div>
      </div>

      <div className="section-pad">
        <SearchBar
          placeholder="Search recommendations"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
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
          const keywords = Array.isArray(card.keywords) ? card.keywords : []
          const matchingKeywords = Array.isArray(card.matchingKeywords) ? card.matchingKeywords : []

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

                {keywords.length > 0 && (
                  <div className="keyword-chip-list">
                    {keywords.slice(0, 4).map((kw) => {
                      const isMatch = matchingKeywords.includes(kw)
                      return (
                        <span
                          key={kw}
                          className={`keyword-chip ${isMatch ? "keyword-match" : ""}`}
                          title={isMatch ? `Matches your liked keyword "${kw}"` : kw}
                        >
                          {isMatch && "✓ "}{kw}
                        </span>
                      )
                    })}
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
