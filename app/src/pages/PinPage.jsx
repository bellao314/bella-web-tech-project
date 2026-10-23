import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import MapArtwork from "../components/MapArtwork"
import SearchBar from "../components/SearchBar"

export default function PinPage() {
  const [confirmed, setConfirmed] = useState(false)
  const navigate = useNavigate()
  return <main className="page pin-page"><header className="pin-header"><button className="icon-button" onClick={() => navigate("/profile")}><Icon name="arrow" size={20} /></button><div><p className="eyebrow">VENDOR TOOLS</p><h2>Set your location</h2></div></header><div className="pin-search"><SearchBar placeholder="Search an address or place" /></div><MapArtwork placing /><section className="pin-sheet"><div className="sheet-handle" />{confirmed ? <div className="success-state"><span><Icon name="check" size={23} /></span><h3>Location updated</h3><p>Customers can now find Juniper Coffee at River Market.</p><button className="primary-button" onClick={() => navigate("/profile")}>Back to business profile</button></div> : <><p className="eyebrow">SELECTED LOCATION</p><h3>River Market</h3><p className="address">1122 NW River Street<br />Portland, OR 97209</p><div className="pin-tip"><Icon name="location" size={18} /><span>Drag the map to position the pin precisely.</span></div><button className="primary-button" onClick={() => setConfirmed(true)}>Confirm this location <Icon name="check" size={18} /></button></>}</section></main>
}
