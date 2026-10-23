import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapView from "../components/MapView"
import SearchBar from "../components/SearchBar"
import { vendors } from "../data/vendors"

export default function MapPage() {
  const [selected, setSelected] = useState("A")
  const navigate = useNavigate()
  return <main className="page map-page">
    <header className="page-header overlay-header"><div><p className="eyebrow">GOOD MORNING</p><h2>Explore nearby</h2></div><button className="avatar-button" onClick={() => navigate("/profile")}>ML</button></header>
    <div className="map-search"><SearchBar placeholder="Search vendors or categories" /></div><MapView />
    <section className="vendor-sheet"><div className="sheet-handle" /><div className="sheet-title"><div><h3>Vendors in view</h3><p>4 places nearby</p></div><button className="filter-button">Filters <span>2</span></button></div>
      <div className="vendor-list">
        {vendors.map((vendor, index) => 
        <button key={vendor.marker} className={selected === vendor.marker ? "vendor-card selected" : "vendor-card"} onClick={() => {
          setSelected(vendor.marker) 
          navigate(`/vendor/${vendor.marker}`)
        }}>
          <div className="vendor-thumb">{vendor.marker}</div>
          <div className="vendor-info">
            <div>
              <h4>{vendor.name}</h4>
              <span>★ {vendor.rating}</span>
            </div>
            <p>{vendor.type}</p>
            <small><Icon name="pin" size={13} /> {vendor.distance} away · Open today</small>
          </div>
          {index !== 1 && <Icon name="chevron" size={17} />}
        </button>)}
      </div>
    </section>
  </main>
}
