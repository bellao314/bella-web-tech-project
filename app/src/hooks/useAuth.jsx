import { useState, useEffect, useCallback, useMemo } from "react"
import { getAuthToken, setAuthToken, clearAuthToken } from "../lib/api"

function getUserFromToken(token) {
  if (!token || typeof token !== "string") return null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

export function useAuth() {
  const [token, setToken] = useState(() => getAuthToken())

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getAuthToken())
    }

    window.addEventListener("authChange", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)
    return () => {
      window.removeEventListener("authChange", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  const login = useCallback((newToken, rememberMe = false) => {
    setAuthToken(newToken, rememberMe)
    setToken(getAuthToken())
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    setToken(null)
  }, [])

  const user = useMemo(() => getUserFromToken(token), [token])

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
  }
}

export default useAuth
