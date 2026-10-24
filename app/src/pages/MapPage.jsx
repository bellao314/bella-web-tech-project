import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapView from "../components/MapView"
import SearchBar from "../components/SearchBar"
import { collectionFrom, vendorFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

export default function MapPage() {
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()
  const { data, loading, error } = useApiResource("/vendors", [])
  const vendors = useMemo(() => collectionFrom(data, ["vendors"]).map(vendorFrom), [data])
  return <main className="page map-page">
    <header className="page-header overlay-header"><div><p className="eyebrow">EXPLORE</p><h2>Nearby vendors</h2></div><button className="avatar-button" onClick={() => navigate("/profile")} aria-label="Open profile"><Icon name="user" size={17} /></button></header>
    <div className="map-search"><SearchBar placeholder="Search vendors or categories" /></div><MapView vendors={vendors} />
    <section className="vendor-sheet"><div className="sheet-handle" /><div className="sheet-title"><div><h3>Vendors in view</h3><p>{loading ? "Loading vendors…" : `${vendors.length} ${vendors.length === 1 ? "place" : "places"} nearby`}</p></div></div>
      <div className="vendor-list">
        {error && <p className="empty-state">Unable to load vendors.</p>}
        {!loading && !error && vendors.length === 0 && <p className="empty-state">No vendors are available in this area.</p>}
        {vendors.map((vendor, index) => {
          const id = vendor.id || String(index)
          return <button key={id} className={selected === id ? "vendor-card selected" : "vendor-card"} onClick={() => {
          setSelected(id)
          navigate(`/vendor/${encodeURIComponent(id)}`)
        }}>
          <div className="vendor-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
          <div className="vendor-info">
            <div>
              <h4>{vendor.name}</h4>
              <span>★ {vendor.rating}</span>
            </div>
            {vendor.type && <p>{vendor.type}</p>}
            {(vendor.distance || vendor.city) && <small><Icon name="pin" size={13} /> {vendor.distance || vendor.city}</small>}
          </div>
          <Icon name="chevron" size={17} />
        </button>})}
      </div>
    </section>
  </main>
}
