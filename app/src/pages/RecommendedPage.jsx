import Icon from "../components/Icon"
import SearchBar from "../components/SearchBar"

const cards = [
  { name: "Sunday Supply Co.", category: "Vintage & home", note: "Because you saved Moss & Clay", tone: "peach" },
  { name: "North Star Florals", category: "Flowers & gifts", note: "Popular near you", tone: "sage" },
  { name: "Good Day Press", category: "Books & stationery", note: "A local hidden gem", tone: "blue" },
]

export default function RecommendedPage() {
  return <main className="page scroll-page"><header className="page-header"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Worth a detour</h2></div><button className="icon-button"><Icon name="settings" size={20} /></button></header><div className="section-pad"><SearchBar placeholder="Search recommendations" /></div><section className="recommend-intro"><div className="sparkle"><Icon name="sparkles" size={23} /></div><div><h3>Your weekly edit</h3><p>Fresh picks based on what you save and explore.</p></div></section><section className="recommend-list">{cards.map((card, index) => <article className="recommend-card" key={card.name}><div className={`card-visual ${card.tone}`}><span>0{index + 1}</span><button aria-label={`Save ${card.name}`}><Icon name="heart" size={20} /></button><div className="sketch-shape" /></div><div className="card-body"><div><p>{card.note}</p><h3>{card.name}</h3><span>{card.category} · {index + 1}.2 mi</span></div><button className="round-arrow"><Icon name="arrow" size={18} /></button></div></article>)}</section></main>
}
