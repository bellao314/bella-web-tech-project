import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import SearchBar from "../components/SearchBar"
import { collectionFrom, valueFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useFavorites } from "../hooks/useFavorites"
import { calculateDistanceInMiles, formatDistance } from "../lib/business"

export default function RecommendedPage() {
  const { data, loading, error } = useApiResource("/recommendations", [])
  const navigate = useNavigate()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [searchQuery, setSearchQuery] = useState("")

  const cards = useMemo(() => {
    let userCoords = null
    try {
      const stored = localStorage.getItem("userCityCoords")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
          userCoords = parsed
        }
      }
    } catch {
      userCoords = null
    }

    const list = collectionFrom(data, ["recommendations", "vendors"]).map((item) => {
      const vendor = vendorFrom(item)
      if (
        userCoords &&
        Number.isFinite(userCoords.lat) &&
        Number.isFinite(userCoords.lng) &&
        Number.isFinite(vendor.latitude) &&
        Number.isFinite(vendor.longitude)
      ) {
        const miles = calculateDistanceInMiles(userCoords.lat, userCoords.lng, vendor.latitude, vendor.longitude)
        return {
          ...vendor,
          distanceInMiles: miles,
          distance: formatDistance(miles),
        }
      }
      return {
        ...vendor,
        distanceInMiles: null,
        distance: null,
      }
    })

    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.type?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
    )
  }, [data, searchQuery])

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

              <div className="card-body">
                <div>
                  {note && <p>{note}</p>}
                  <h3>{card.name || "Unnamed vendor"}</h3>
                  <span>{[card.type, card.distance || card.city].filter(Boolean).join(" · ")}</span>
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
            </article>
          )
        })}
      </section>
    </main>
  )
}
