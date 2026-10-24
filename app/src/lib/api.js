const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

const asArray = (value) => Array.isArray(value) ? value : []

// APIs commonly wrap a collection in one of these keys. Keeping the original
// object means newly added fields remain available to the UI.
export function collectionFrom(payload, keys = []) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  for (const key of [...keys, "data", "results", "items"]) {
    if (Array.isArray(payload[key])) return payload[key]
  }

  return []
}

export function valueFrom(record, keys, fallback = "") {
  if (!record || typeof record !== "object") return fallback
  const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "")
  return value ?? fallback
}

export function vendorFrom(record) {
  const location = record?.location || record?.coordinates || {}
  const latitude = Number(valueFrom(record, ["latitude", "lat"], location.latitude ?? location.lat))
  const longitude = Number(valueFrom(record, ["longitude", "lng"], location.longitude ?? location.lng))

  return {
    ...record,
    id: valueFrom(record, ["id", "vendorId", "_id", "uuid"]),
    name: valueFrom(record, ["name", "businessName", "title"]),
    type: valueFrom(record, ["type", "category", "vendorType"]),
    city: valueFrom(record, ["city", "locality", "address"]),
    distance: valueFrom(record, ["distance", "distanceText"]),
    rating: valueFrom(record, ["rating", "averageRating"]),
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  }
}

export async function getApi(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  })

  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}

export { asArray }
