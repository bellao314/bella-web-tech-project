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

function isValidJwt(token) {
  if (!token || typeof token !== "string" || token === "undefined" || token === "null") {
    return false
  }
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    // If exp is present, check whether it has passed
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function getAuthToken() {
  const sessionToken = sessionStorage.getItem("authToken")
  const localToken = localStorage.getItem("authToken")

  // Check sessionStorage first (typically the most recent session sign-in)
  if (isValidJwt(sessionToken)) {
    return sessionToken
  }
  if (sessionToken) {
    sessionStorage.removeItem("authToken")
  }

  // Check localStorage (persistent sign-in)
  if (isValidJwt(localToken)) {
    return localToken
  }
  if (localToken) {
    localStorage.removeItem("authToken")
  }

  return null
}

export function setAuthToken(token, rememberMe = false) {
  if (!token) {
    clearAuthToken()
    return
  }
  if (rememberMe) {
    sessionStorage.removeItem("authToken")
    localStorage.setItem("authToken", token)
  } else {
    localStorage.removeItem("authToken")
    sessionStorage.setItem("authToken", token)
  }
}

export function clearAuthToken() {
  localStorage.removeItem("authToken")
  sessionStorage.removeItem("authToken")
}

export async function getApi(path, signal) {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    signal,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken()
    }
    const error = new Error(data?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

export async function postApi(path, body, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }

  return data
}

export { asArray }
