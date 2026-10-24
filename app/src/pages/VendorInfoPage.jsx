import { useMemo } from "react"
import { useParams } from "react-router-dom"
import { vendorFrom, valueFrom } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"

export default function VendorInfoPage() {
  const { vendorId } = useParams()
  const { data, loading, error } = useApiResource(vendorId ? `/vendors/${encodeURIComponent(vendorId)}` : null, null)
  const vendor = useMemo(() => data ? vendorFrom(data.vendor || data.data || data) : null, [data])
  return (
  <main className="page scroll-page profile-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">VENDOR</p>
        <h2>Details</h2>
      </div>
    </header>
    {loading && 
    <p className="empty-state">Loading vendor…</p>}
    {error && 
    <p className="empty-state">Vendor data is unavailable.</p>}
    {!loading && !error && !vendor && 
    <p className="empty-state">No vendor was selected.</p>}
    {vendor && 
    <>
      <section className="profile-card">
        <div className="profile-avatar">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
        <div>
          <h3>{vendor.name || "Unnamed vendor"}</h3>
          <p>{[vendor.type, vendor.city].filter(Boolean).join(" · ")}</p>
        </div>
      </section>
      <section className="profile-section">
        <div className="section-heading">
          <h3>Business information</h3>
        </div>
        {[
          ["Category", valueFrom(vendor, ["category", "type"])], 
          ["Hours today", valueFrom(vendor, ["hours", "openingHours"])], 
          ["Primary location", valueFrom(vendor, ["address", "city"])], 
        ].filter(([, value]) => value !== "").map(([label, value]) => 
        <div className="info-row" key={label}>
          <span>{label}</span>
          <strong>{String(value)}</strong>
        </div>)}
      </section>
    </>}
  </main>)
}
