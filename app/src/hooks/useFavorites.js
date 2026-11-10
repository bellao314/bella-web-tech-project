import { useState, useEffect, useCallback, useMemo } from "react"
import { getApi, postApi, deleteApi, getAuthToken, vendorFrom } from "../lib/api"

const FAVORITES_STORAGE_KEY = "customerFavorites"

function getStoredFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(vendorFrom)
      }
    }
  } catch {
    // fallback
  }
  return []
}

function saveStoredFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  } catch {
    // ignore
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => getStoredFavorites())

  useEffect(() => {
    const handleUpdate = (e) => {
      const updated = e?.detail?.favorites || getStoredFavorites()
      setFavorites(updated)
    }

    window.addEventListener("favoritesUpdated", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("favoritesUpdated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [])

  // Sync with API on mount / when token is present
  useEffect(() => {
    let isCancelled = false
    const token = getAuthToken()
    if (!token) return

    async function fetchServerFavorites() {
      try {
        const data = await getApi("/user/favorites")
        if (isCancelled) return
        const serverFavs = (data?.favorites || []).map(vendorFrom)

        // Merge server favorites with local favorites (preserving any custom ones)
        setFavorites((prev) => {
          const map = new Map()
          // First add local ones
          prev.forEach((v) => {
            if (v && v.id != null) map.set(String(v.id), v)
          })
          // Overwrite/add server ones
          serverFavs.forEach((v) => {
            if (v && v.id != null) map.set(String(v.id), v)
          })
          const merged = Array.from(map.values())
          saveStoredFavorites(merged)
          return merged
        })
      } catch {
        // Fallback to local storage if API is unreachable
      }
    }

    fetchServerFavorites()

    return () => {
      isCancelled = true
    }
  }, [])

  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((f) => String(f.id)))
  }, [favorites])

  const isFavorite = useCallback(
    (vendorId) => {
      if (vendorId == null) return false
      return favoriteIds.has(String(vendorId))
    },
    [favoriteIds]
  )

  const toggleFavorite = useCallback(
    async (vendor) => {
      if (!vendor || vendor.id == null) return false
      const idStr = String(vendor.id)
      const formatted = vendorFrom(vendor)
      const currentList = getStoredFavorites()
      const exists = currentList.some((v) => String(v.id) === idStr)

      const nextIsFavorite = !exists
      const nextList = exists
        ? currentList.filter((v) => String(v.id) !== idStr)
        : [formatted, ...currentList.filter((v) => String(v.id) !== idStr)]

      // Optimistic update
      saveStoredFavorites(nextList)
      setFavorites(nextList)
      window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { favorites: nextList } }))

      // Background API sync if authenticated
      const token = getAuthToken()
      if (token) {
        try {
          if (nextIsFavorite) {
            await postApi("/user/favorites", { vendorId: vendor.id, vendor: formatted })
          } else {
            await deleteApi(`/user/favorites/${encodeURIComponent(vendor.id)}`)
          }
        } catch {
          // Keep local state on error
        }
      }

      return nextIsFavorite
    },
    []
  )

  const addFavorite = useCallback(
    async (vendor) => {
      if (!vendor || vendor.id == null) return
      const idStr = String(vendor.id)
      const formatted = vendorFrom(vendor)
      const currentList = getStoredFavorites()
      if (currentList.some((v) => String(v.id) === idStr)) return

      const nextList = [formatted, ...currentList]
      saveStoredFavorites(nextList)
      setFavorites(nextList)
      window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { favorites: nextList } }))

      const token = getAuthToken()
      if (token) {
        try {
          await postApi("/user/favorites", { vendorId: vendor.id, vendor: formatted })
        } catch {
          // ignore
        }
      }
    },
    []
  )

  const removeFavorite = useCallback(
    async (vendorId) => {
      if (vendorId == null) return
      const idStr = String(vendorId)
      const currentList = getStoredFavorites()
      const nextList = currentList.filter((v) => String(v.id) !== idStr)

      saveStoredFavorites(nextList)
      setFavorites(nextList)
      window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: { favorites: nextList } }))

      const token = getAuthToken()
      if (token) {
        try {
          await deleteApi(`/user/favorites/${encodeURIComponent(vendorId)}`)
        } catch {
          // ignore
        }
      }
    },
    []
  )

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  }
}

export default useFavorites
