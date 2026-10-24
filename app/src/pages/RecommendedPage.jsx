import Icon from "../components/Icon"
import SearchBar from "../components/SearchBar"
import { useMemo } from "react"
import { collectionFrom, valueFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

export default function RecommendedPage() {
  const { data, loading, error } = useApiResource("/recommendations", [])
  const cards = useMemo(() => collectionFrom(data, ["recommendations", "vendors"]).map(vendorFrom), [data])
  return <main className="page scroll-page"><header className="page-header"><div><p className="eyebrow">FOR YOU</p><h2>Recommendations</h2></div></header><div className="section-pad"><SearchBar placeholder="Search recommendations" /></div><section className="recommend-list">{loading && <p className="empty-state">Loading recommendations…</p>}{error && <p className="empty-state">Recommendations are unavailable.</p>}{!loading && !error && cards.length === 0 && <p className="empty-state">No recommendations are available yet.</p>}{cards.map((card, index) => <article className="recommend-card" key={card.id || card.name || index}><div className="card-visual"><button aria-label={`Save ${card.name || "vendor"}`}><Icon name="heart" size={20} /></button><div className="sketch-shape" /></div><div className="card-body"><div>{valueFrom(card, ["note", "reason", "description"]) && <p>{valueFrom(card, ["note", "reason", "description"])}</p>}<h3>{card.name || "Unnamed vendor"}</h3><span>{[card.type, card.distance || card.city].filter(Boolean).join(" · ")}</span></div><button className="round-arrow" aria-label={`View ${card.name || "vendor"}`}><Icon name="arrow" size={18} /></button></div></article>)}</section></main>
}
