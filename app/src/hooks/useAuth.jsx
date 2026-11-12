import { useState, useEffect, useCallback, useMemo } from "react"
import { getAuthToken, setAuthToken, clearAuthToken } from "../lib/api"
import { getStoredAccountType } from "../lib/business"

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
  const [storedRole, setStoredRole] = useState(() => getStoredAccountType("customer"))

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(getAuthToken())
      setStoredRole(getStoredAccountType("customer"))
    }

    const handleRoleChange = (e) => {
      setStoredRole(e?.detail || getStoredAccountType("customer"))
    }

    window.addEventListener("authChange", handleAuthChange)
    window.addEventListener("accountTypeUpdated", handleRoleChange)
    window.addEventListener("storage", handleAuthChange)
    return () => {
      window.removeEventListener("authChange", handleAuthChange)
      window.removeEventListener("accountTypeUpdated", handleRoleChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  const login = useCallback((newToken) => {
    setAuthToken(newToken)
    setToken(getAuthToken())
    setStoredRole(getStoredAccountType("customer"))
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    try {
      localStorage.removeItem("userAccountType")
      window.dispatchEvent(new CustomEvent("accountTypeUpdated", { detail: "customer" }))
    } catch {
      // ignore
    }
    setToken(null)
    setStoredRole("customer")
  }, [])

  const user = useMemo(() => getUserFromToken(token), [token])

  const accountType = useMemo(() => {
    const raw = user?.accountType || user?.type || storedRole || "customer"
    return String(raw).toLowerCase()
  }, [user, storedRole])

  const isVendor = Boolean(token) && (accountType === "business" || accountType === "vendor")
  const isBusiness = isVendor

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    accountType,
    isVendor,
    isBusiness,
    login,
    logout,
  }
}

export default useAuth
