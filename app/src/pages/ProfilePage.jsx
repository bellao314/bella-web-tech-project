import { useMemo, useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Icon from "../components/Icon"
import { collectionFrom, valueFrom, vendorFrom, getAuthToken, setAuthToken, putApi, getApi } from "../lib/api"
import { useApiResource } from "../hooks/useApiResource"
import { useAuth } from "../hooks/useAuth"
import { useFavorites } from "../hooks/useFavorites"
import {
  getBusinessData,
  saveBusinessData,
  resetBusinessLocationHours,
  geocodeLocation,
  parseOperatingHours,
  isBusinessLive,
  isBusinessScheduled,
  isBusinessExpired,
  fetchAddressSuggestions,
  formatDateTimeSingle,
  formatScheduledHours,
  calculateDistanceInMiles,
  formatDistance,
  setStoredAccountType,
  readFileAsDataUrl,
  validateImageFile,
} from "../lib/business"
import {
  getVendorCategories,
} from "../lib/recommendations"
import {
  paginateItems,
  getPaginationPageNumbers,
  FAVORITES_PER_PAGE,
} from "../lib/pagination"

const POPULAR_KEYWORDS = [
  "crochet", "mexican", "coffee", "tacos", "bbq", "donuts",
  "crafts", "jewelry", "bakery", "woodwork", "ceramics",
  "candles", "produce", "clothing", "vintage", "handmade"
]

const initials = (name) => {
  if (!name || typeof name !== "string") return ""
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

const formatDate = (value) => {
  if (!value) return ""
  try {
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return String(value)
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { logout, token: authToken } = useAuth()
  const token = authToken || getAuthToken()
  const { data, loading, error } = useApiResource(token ? "/user/profile" : null, null)
  const { favorites: localFavorites, removeFavorite } = useFavorites()
  const [profileOverride, setProfileOverride] = useState(null)
  const baseProfile = data?.profile || data?.data || data
  const profile = useMemo(() => {
    if (!profileOverride) return baseProfile
    return { ...baseProfile, ...profileOverride }
  }, [baseProfile, profileOverride])
  const apiFavorites = useMemo(() => collectionFrom(profile?.favorites || profile, ["favorites", "vendors"]).map(vendorFrom), [profile])

  const favorites = useMemo(() => {
    const map = new Map()
    apiFavorites.forEach((v) => { if (v && v.id != null) map.set(String(v.id), v) })
    localFavorites.forEach((v) => { if (v && v.id != null) map.set(String(v.id), v) })
    return Array.from(map.values())
  }, [apiFavorites, localFavorites])

  const name = valueFrom(profile, ["name", "displayName", "fullName"])
  const email = valueFrom(profile, ["email"])
  const createdAt = valueFrom(profile, ["createdAt", "created_at"])
  const apiAccountType = valueFrom(profile, ["type", "accountType", "account_type", "role"])
  const accountType = (apiAccountType || localStorage.getItem("userAccountType") || "customer").toLowerCase()
  const isBusiness = accountType === "business" || accountType === "vendor"

  useEffect(() => {
    if (apiAccountType && apiAccountType.toLowerCase() !== localStorage.getItem("userAccountType")) {
      setStoredAccountType(apiAccountType.toLowerCase())
    }
  }, [apiAccountType])

  // Customer Location (City) state
  const [cityInput, setCityInput] = useState(() => localStorage.getItem("userCity") || "")
  const [currentCity, setCurrentCity] = useState(() => localStorage.getItem("userCity") || "")
  const [citySaveMessage, setCitySaveMessage] = useState("")
  const [citySaveError, setCitySaveError] = useState("")
  const [isSavingCity, setIsSavingCity] = useState(false)

  useEffect(() => {
    if (profile) {
      const city = profile.city ?? localStorage.getItem("userCity") ?? ""
      if (city) {
        localStorage.setItem("userCity", city)
        if (profile.latitude != null && profile.longitude != null) {
          localStorage.setItem(
            "userCityCoords",
            JSON.stringify({ lat: Number(profile.latitude), lng: Number(profile.longitude) })
          )
        }
      } else if (profile.city === null) {
        localStorage.removeItem("userCity")
        localStorage.removeItem("userCityCoords")
      }
    }
  }, [profile])

  const handleSaveCustomerLocation = async (e) => {
    e.preventDefault()
    setIsSavingCity(true)
    setCitySaveError("")
    setCitySaveMessage("")

    const cleanCity = cityInput.trim()

    try {
      let lat = null
      let lng = null

      if (cleanCity) {
        try {
          const geoRes = await getApi(`/maps/geocode?address=${encodeURIComponent(cleanCity)}`)
          const loc = geoRes?.results?.[0]?.geometry?.location
          if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
            lat = loc.lat
            lng = loc.lng
          }
        } catch {
          // Backend will attempt geocoding as well
        }
      }

      if (token) {
        const res = await putApi("/user/profile", {
          city: cleanCity || null,
          ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
        })
        if (res?.profile?.latitude != null && res?.profile?.longitude != null) {
          lat = Number(res.profile.latitude)
          lng = Number(res.profile.longitude)
        }
      }

      if (cleanCity) {
        setCurrentCity(cleanCity)
        localStorage.setItem("userCity", cleanCity)
        if (lat != null && lng != null) {
          localStorage.setItem("userCityCoords", JSON.stringify({ lat, lng }))
        }
        setCitySaveMessage(`Location updated to "${cleanCity}". The map view will now center here.`)
      } else {
        setCurrentCity("")
        localStorage.removeItem("userCity")
        localStorage.removeItem("userCityCoords")
        setCitySaveMessage("Location cleared. The map view will use the default center.")
      }

      window.dispatchEvent(
        new CustomEvent("userLocationUpdated", {
          detail: { city: cleanCity || null, latitude: lat, longitude: lng },
        })
      )

      setTimeout(() => setCitySaveMessage(""), 5000)
    } catch (err) {
      setCitySaveError(err.message || "Failed to update location. Please try again.")
    } finally {
      setIsSavingCity(false)
    }
  }

  // Business Location & Hours state
  const [businessData, setBusinessData] = useState(() => getBusinessData(name || "My Business"))

  const userCoords = useMemo(() => {
    if (isBusiness && businessData && isBusinessScheduled(businessData)) {
      const bLat = Number(businessData.latitude)
      const bLng = Number(businessData.longitude)
      if (Number.isFinite(bLat) && Number.isFinite(bLng)) return { lat: bLat, lng: bLng }
    }
    if (profile?.latitude != null && profile?.longitude != null) {
      const pLat = Number(profile.latitude)
      const pLng = Number(profile.longitude)
      if (Number.isFinite(pLat) && Number.isFinite(pLng)) return { lat: pLat, lng: pLng }
    }
    try {
      const stored = localStorage.getItem("userCityCoords")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) return { lat: Number(parsed.lat), lng: Number(parsed.lng) }
      }
    } catch {
      // ignore
    }
    return null
  }, [isBusiness, businessData, profile])

  const favoritesWithDistance = useMemo(() => {
    return favorites.map((vendor) => {
      let dist = null
      if (
        userCoords &&
        Number.isFinite(Number(vendor.latitude)) &&
        Number.isFinite(Number(vendor.longitude))
      ) {
        const miles = calculateDistanceInMiles(userCoords.lat, userCoords.lng, Number(vendor.latitude), Number(vendor.longitude))
        dist = formatDistance(miles)
      }
      return {
        ...vendor,
        distance: dist,
      }
    })
  }, [favorites, userCoords])

  // Customer Favorites Pagination state (5 vendors per page)
  const [favoritesPage, setFavoritesPage] = useState(1)

  const pagination = useMemo(() => {
    return paginateItems(favoritesWithDistance, favoritesPage, FAVORITES_PER_PAGE)
  }, [favoritesWithDistance, favoritesPage])

  const pageNumbers = useMemo(() => {
    return getPaginationPageNumbers(pagination.currentPage, pagination.totalPages)
  }, [pagination.currentPage, pagination.totalPages])

  // Business Profile Keywords state
  const [vendorKeywords, setVendorKeywords] = useState(() => {
    return Array.isArray(businessData?.keywords)
      ? businessData.keywords
      : ["coffee", "beverage", "food"]
  })
  const [newKeywordInput, setNewKeywordInput] = useState("")
  const [keywordSaveMessage, setKeywordSaveMessage] = useState("")
  const [isSavingKeywords, setIsSavingKeywords] = useState(false)

  const handleToggleKeyword = (kw) => {
    const clean = kw.toLowerCase().trim()
    if (!clean) return
    setVendorKeywords((prev) =>
      prev.includes(clean) ? prev.filter((k) => k !== clean) : [...prev, clean]
    )
  }

  const handleAddCustomKeyword = (e) => {
    e?.preventDefault()
    const clean = newKeywordInput.toLowerCase().trim()
    if (!clean) return
    if (!vendorKeywords.includes(clean)) {
      setVendorKeywords((prev) => [...prev, clean])
    }
    setNewKeywordInput("")
  }

  const handleRemoveKeyword = (kw) => {
    setVendorKeywords((prev) => prev.filter((k) => k !== kw))
  }

  const handleSaveKeywords = async (e) => {
    e.preventDefault()
    setIsSavingKeywords(true)
    setKeywordSaveMessage("")

    const updated = saveBusinessData({
      keywords: vendorKeywords,
    })
    setBusinessData(updated)

    if (token) {
      try {
        await putApi("/user/profile", { keywords: vendorKeywords })
      } catch {
        // backend update optional
      }
    }

    setIsSavingKeywords(false)
    setKeywordSaveMessage("Profile keywords saved! Customers interested in these keywords will see your business in recommendations.")
    setTimeout(() => setKeywordSaveMessage(""), 5000)
  }

  // Business Branding (Logo for Map, Banner for Recommendations)
  const [vendorLogo, setVendorLogo] = useState(() => businessData?.logo || "")
  const [vendorBanner, setVendorBanner] = useState(() => businessData?.banner || "")
  const [logoInputUrl, setLogoInputUrl] = useState("")
  const [bannerInputUrl, setBannerInputUrl] = useState("")
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false)
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false)
  const [isSavingBranding, setIsSavingBranding] = useState(false)
  const [brandingMessage, setBrandingMessage] = useState("")
  const [brandingError, setBrandingError] = useState("")

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setBrandingError(validation.error)
      return
    }
    setBrandingError("")
    setBrandingMessage("")
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setVendorLogo(dataUrl)
      const updated = saveBusinessData({ logo: dataUrl })
      setBusinessData(updated)
      if (token) {
        putApi("/user/profile", { logo: dataUrl }).catch(() => {})
      }
      setBrandingMessage("Logo uploaded successfully! Active on the Map page.")
      setTimeout(() => setBrandingMessage(""), 5000)
    } catch (err) {
      setBrandingError(err.message || "Failed to load logo image.")
    } finally {
      e.target.value = ""
    }
  }

  const handleRemoveLogo = () => {
    setVendorLogo("")
    const updated = saveBusinessData({ logo: null })
    setBusinessData(updated)
    if (token) {
      putApi("/user/profile", { logo: null }).catch(() => {})
    }
    setBrandingMessage("Logo removed.")
    setBrandingError("")
    setTimeout(() => setBrandingMessage(""), 4000)
  }

  const handleApplyLogoUrl = (e) => {
    e.preventDefault()
    const clean = logoInputUrl.trim()
    if (!clean) return
    setVendorLogo(clean)
    const updated = saveBusinessData({ logo: clean })
    setBusinessData(updated)
    if (token) {
      putApi("/user/profile", { logo: clean }).catch(() => {})
    }
    setLogoInputUrl("")
    setShowLogoUrlInput(false)
    setBrandingMessage("Logo URL applied! Active on the Map page.")
    setBrandingError("")
    setTimeout(() => setBrandingMessage(""), 5000)
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateImageFile(file)
    if (!validation.valid) {
      setBrandingError(validation.error)
      return
    }
    setBrandingError("")
    setBrandingMessage("")
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setVendorBanner(dataUrl)
      const updated = saveBusinessData({ banner: dataUrl })
      setBusinessData(updated)
      if (token) {
        putApi("/user/profile", { banner: dataUrl }).catch(() => {})
      }
      setBrandingMessage("Banner uploaded successfully! Active on the Recommendations page.")
      setTimeout(() => setBrandingMessage(""), 5000)
    } catch (err) {
      setBrandingError(err.message || "Failed to load banner image.")
    } finally {
      e.target.value = ""
    }
  }

  const handleRemoveBanner = () => {
    setVendorBanner("")
    const updated = saveBusinessData({ banner: null })
    setBusinessData(updated)
    if (token) {
      putApi("/user/profile", { banner: null }).catch(() => {})
    }
    setBrandingMessage("Banner removed.")
    setBrandingError("")
    setTimeout(() => setBrandingMessage(""), 4000)
  }

  const handleApplyBannerUrl = (e) => {
    e.preventDefault()
    const clean = bannerInputUrl.trim()
    if (!clean) return
    setVendorBanner(clean)
    const updated = saveBusinessData({ banner: clean })
    setBusinessData(updated)
    if (token) {
      putApi("/user/profile", { banner: clean }).catch(() => {})
    }
    setBannerInputUrl("")
    setShowBannerUrlInput(false)
    setBrandingMessage("Banner URL applied! Active on the Recommendations page.")
    setBrandingError("")
    setTimeout(() => setBrandingMessage(""), 5000)
  }

  const handleSaveBranding = async () => {
    setIsSavingBranding(true)
    setBrandingError("")
    setBrandingMessage("")
    try {
      const updated = saveBusinessData({
        logo: vendorLogo || null,
        banner: vendorBanner || null,
      })
      setBusinessData(updated)
      if (token) {
        await putApi("/user/profile", {
          logo: vendorLogo || null,
          banner: vendorBanner || null,
        })
      }
      setBrandingMessage("Branding saved! Your logo is live on the Map page and banner on Recommendations.")
      setTimeout(() => setBrandingMessage(""), 5000)
    } catch (err) {
      setBrandingError(err.message || "Failed to save branding to server.")
    } finally {
      setIsSavingBranding(false)
    }
  }

  // Active keyword categories mapped from vendor's selected profile keywords
  const activeBusinessCategories = useMemo(() => {
    return getVendorCategories({
      keywords: vendorKeywords,
      name: name || businessData.name || "My Business",
      type: businessData.category || "Mobile Food & Beverage",
    })
  }, [vendorKeywords, name, businessData])

  const [customLocAddress, setCustomLocAddress] = useState("")
  const [customStartDateTime, setCustomStartDateTime] = useState("")
  const [customFinishDateTime, setCustomFinishDateTime] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [businessSaveError, setBusinessSaveError] = useState("")
  const [isSavingBusiness, setIsSavingBusiness] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const autocompleteRef = useRef(null)
  const isSelectionRef = useRef(false)

  const handleSelectSuggestion = (suggestion) => {
    isSelectionRef.current = true
    setCustomLocAddress(suggestion.description)
    setSuggestions([])
    setIsLoadingSuggestions(false)
    setShowSuggestions(false)
  }

  // Autocomplete query effect
  useEffect(() => {
    if (isSelectionRef.current) {
      isSelectionRef.current = false
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (!customLocAddress || customLocAddress.trim().length < 2) return

    let isMounted = true
    const timeout = setTimeout(() => {
      fetchAddressSuggestions(customLocAddress)
        .then((res) => {
          if (isMounted && !isSelectionRef.current) {
            setSuggestions(res || [])
            if (res && res.length > 0) {
              setShowSuggestions(true)
            } else {
              setShowSuggestions(false)
            }
          }
        })
        .catch(() => {
          if (isMounted) setSuggestions([])
        })
        .finally(() => {
          if (isMounted) setIsLoadingSuggestions(false)
        })
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [customLocAddress])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Listen for business data updates
  useEffect(() => {
    const handleUpdate = (e) => {
      const updated = e?.detail || getBusinessData(name || "My Business")
      setBusinessData(updated)
      if (Array.isArray(updated?.keywords)) {
        setVendorKeywords(updated.keywords)
      }
      if (updated?.logo !== undefined) {
        setVendorLogo(updated.logo || "")
      }
      if (updated?.banner !== undefined) {
        setVendorBanner(updated.banner || "")
      }
      if (!isBusinessScheduled(updated)) {
        setCustomLocAddress("")
        setCustomStartDateTime("")
        setCustomFinishDateTime("")
      }
    }
    window.addEventListener("businessDataUpdated", handleUpdate)
    return () => window.removeEventListener("businessDataUpdated", handleUpdate)
  }, [name])

  // Timer to watch for schedule start and expiration
  useEffect(() => {
    if (!businessData || !isBusinessScheduled(businessData)) return

    if (isBusinessExpired(businessData)) {
      const expirationTimer = setTimeout(() => {
        resetBusinessLocationHours(name || "My Business")
        setCustomLocAddress("")
        setCustomStartDateTime("")
        setCustomFinishDateTime("")
      }, 0)
      return () => clearTimeout(expirationTimer)
    }

    const expTime = businessData.expiresAt
      ? new Date(businessData.expiresAt).getTime()
      : parseOperatingHours(businessData.hours)?.endDate?.getTime()

    const startTime = businessData.startTime
      ? new Date(businessData.startTime).getTime()
      : null

    const timers = []

    if (startTime && startTime > Date.now()) {
      const startDiff = startTime - Date.now()
      const startTimer = setTimeout(() => {
        setBusinessData(getBusinessData(name || "My Business"))
      }, Math.min(startDiff, 2147483647))
      timers.push(startTimer)
    }

    if (expTime) {
      const diff = expTime - Date.now()
      if (diff <= 0) {
        const expiredTimer = setTimeout(() => {
          resetBusinessLocationHours(name || "My Business")
          setCustomLocAddress("")
          setCustomStartDateTime("")
          setCustomFinishDateTime("")
        }, 0)
        timers.push(expiredTimer)
      } else {
        const timerId = setTimeout(() => {
          resetBusinessLocationHours(name || "My Business")
          setCustomLocAddress("")
          setCustomStartDateTime("")
          setCustomFinishDateTime("")
          setSaveMessage("Operating hours have ended. Location and hours have been reset, and pin removed from the map.")
          setTimeout(() => setSaveMessage(""), 5000)
        }, Math.min(diff, 2147483647))

        timers.push(timerId)
      }
    }

    return () => timers.forEach((t) => clearTimeout(t))
  }, [businessData, name])

  const handleSaveBusinessLocationHours = async (e) => {
    e.preventDefault()
    setIsSavingBusiness(true)
    setBusinessSaveError("")
    setSaveMessage("")
    setShowSuggestions(false)

    const cleanAddress = customLocAddress.trim()

    if (!cleanAddress) {
      setBusinessSaveError("Please enter a location or address.")
      setIsSavingBusiness(false)
      return
    }

    if (!customStartDateTime) {
      setBusinessSaveError("Please select a start date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (!customFinishDateTime) {
      setBusinessSaveError("Please select a finish date and time.")
      setIsSavingBusiness(false)
      return
    }

    const startDate = new Date(customStartDateTime)
    const finishDate = new Date(customFinishDateTime)

    if (isNaN(startDate.getTime())) {
      setBusinessSaveError("Please select a valid start date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (isNaN(finishDate.getTime())) {
      setBusinessSaveError("Please select a valid finish date and time.")
      setIsSavingBusiness(false)
      return
    }

    if (finishDate.getTime() <= startDate.getTime()) {
      setBusinessSaveError("Finish time must be after the start time.")
      setIsSavingBusiness(false)
      return
    }

    // If finish date/time has already passed:
    if (finishDate.getTime() <= Date.now()) {
      resetBusinessLocationHours(name || "My Business")
      setCustomLocAddress("")
      setCustomStartDateTime("")
      setCustomFinishDateTime("")
      setBusinessSaveError("The finish date and time has already passed. Location and hours have been reset.")
      setIsSavingBusiness(false)
      return
    }

    // Geocode location
    let geo
    try {
      geo = await geocodeLocation(cleanAddress)
    } catch (err) {
      setBusinessSaveError(err.message || "Failed to find coordinates for this address.")
      setIsSavingBusiness(false)
      return
    }

    if (!geo || !Number.isFinite(geo.lat) || !Number.isFinite(geo.lng)) {
      setBusinessSaveError(`Could not find coordinates for "${cleanAddress}". Please check the address.`)
      setIsSavingBusiness(false)
      return
    }

    const lat = geo.lat
    const lng = geo.lng
    const city = geo.city || cleanAddress.split(",").slice(1).join(",").trim() || "Local Area"
    const locationName = cleanAddress.split(",")[0]?.trim() || "Primary Location"
    const displayHours = formatScheduledHours(startDate, finishDate)

    // Save business data
    const updated = saveBusinessData({
      name: name || businessData.name || "My Business",
      locationName,
      address: geo.formattedAddress || cleanAddress,
      city,
      latitude: lat,
      longitude: lng,
      hours: displayHours,
      startTime: startDate.toISOString(),
      expiresAt: finishDate.toISOString(),
      isLive: true,
    })

    // Update backend profile if authenticated
    if (token) {
      try {
        await putApi("/user/profile", {
          city,
          latitude: lat,
          longitude: lng,
        })
      } catch {
        // Backend update optional
      }
    }

    setBusinessData(updated)
    setCustomLocAddress("")
    setCustomStartDateTime("")
    setCustomFinishDateTime("")
    setSuggestions([])
    setShowSuggestions(false)
    setSaveMessage("Location and operating hours scheduled! The map view will now center here.")
    setTimeout(() => setSaveMessage(""), 5000)
    setIsSavingBusiness(false)
  }

  const handleResetBusinessLocation = () => {
    resetBusinessLocationHours(name || "My Business")
    setCustomLocAddress("")
    setCustomStartDateTime("")
    setCustomFinishDateTime("")
    setBusinessSaveError("")
    setSaveMessage("Location and hours have been reset. Pin removed from map.")
    setTimeout(() => setSaveMessage(""), 4000)
  }

  const handleSignOut = () => {
    logout()
    navigate("/")
  }

  // Account Details Edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editEmail, setEditEmail] = useState("")
  const [editName, setEditName] = useState("")
  const [editVendorType, setEditVendorType] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [detailsSaveMessage, setDetailsSaveMessage] = useState("")
  const [detailsSaveError, setDetailsSaveError] = useState("")

  const vendorCategory =
    valueFrom(profile, ["vendorType", "category"]) || businessData?.category || "Mobile Food & Beverage"

  const handleStartEditDetails = () => {
    setEditEmail(email || "")
    setEditName(name || businessData?.name || "")
    setEditVendorType(vendorCategory)
    setPasswordConfirm("")
    setDetailsSaveError("")
    setDetailsSaveMessage("")
    setIsEditingDetails(true)
  }

  const handleCancelEditDetails = () => {
    setIsEditingDetails(false)
    setPasswordConfirm("")
    setDetailsSaveError("")
  }

  const handleSaveDetails = async (e) => {
    e.preventDefault()
    setDetailsSaveError("")
    setDetailsSaveMessage("")

    if (!passwordConfirm.trim()) {
      setDetailsSaveError("Current password is required to update account details.")
      return
    }

    if (!editEmail.trim() || !editEmail.includes("@")) {
      setDetailsSaveError("Please enter a valid email address.")
      return
    }

    if (isBusiness && !editName.trim()) {
      setDetailsSaveError("Business name cannot be empty.")
      return
    }

    if (isBusiness && !editVendorType.trim()) {
      setDetailsSaveError("Vendor type cannot be empty.")
      return
    }

    setIsSavingDetails(true)

    try {
      const payload = {
        email: editEmail.trim(),
        password: passwordConfirm,
        ...(isBusiness
          ? {
              name: editName.trim(),
              vendorType: editVendorType.trim(),
            }
          : {}),
      }

      const res = await putApi("/user/profile", payload)

      if (res?.profile) {
        setProfileOverride(res.profile)
      } else {
        setProfileOverride((prev) => ({
          ...(prev || {}),
          name: isBusiness ? editName.trim() : (name || ""),
          email: editEmail.trim(),
          vendorType: isBusiness ? editVendorType.trim() : undefined,
          category: isBusiness ? editVendorType.trim() : undefined,
        }))
      }

      if (res?.token) {
        setAuthToken(res.token)
      }

      if (isBusiness) {
        saveBusinessData({
          name: editName.trim(),
          category: editVendorType.trim(),
        })
      }

      setDetailsSaveMessage("Account details updated successfully!")
      setIsEditingDetails(false)
      setPasswordConfirm("")
      setTimeout(() => setDetailsSaveMessage(""), 5000)
    } catch (err) {
      setDetailsSaveError(err.message || "Failed to update details. Please verify your password.")
    } finally {
      setIsSavingDetails(false)
    }
  }

  const userDetails = [
    ["Account type", isBusiness ? "Business" : "Customer"],
    [isBusiness ? "Business name" : "Full name", name || "Not set"],
    ["Email address", email],
    isBusiness ? ["Vendor type", vendorCategory] : null,
    ["Member since", formatDate(createdAt)],
    !isBusiness ? ["Location", currentCity || "Not set"] : null,
  ].filter(Boolean)

  return (
    <main className="page scroll-page profile-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{isBusiness ? "BUSINESS HUB" : "YOUR SPACE"}</p>
          <h2>{isBusiness ? "Business Account" : "Account Details"}</h2>
        </div>
        <button
            type="button"
            onClick={handleSignOut}
            style={{
              margin: "10px 0 5px",
              width: "80px",
              padding: "10px",
              borderRadius: "14px",
              border: "1px solid var(--line)",
              background: "white",
              color: "#c92a2a",
              fontWeight: "600",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
      </header>

      {!token && (
        <div
          style={{
            margin: "20px 22px",
            padding: "24px 18px",
            textAlign: "center",
            background: "white",
            borderRadius: "17px",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "13px" }}>
            Please sign in to view your profile and account details.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={handleSignOut}
            style={{ maxWidth: "200px", margin: "0 auto" }}
          >
            Sign in <Icon name="arrow" size={18} />
          </button>
        </div>
      )}

      {token && loading && (
        <p className="empty-state">Loading profile…</p>
      )}

      {token && error && (
        <div
          style={{
            margin: "20px 22px",
            padding: "24px 18px",
            textAlign: "center",
            background: "white",
            borderRadius: "17px",
            border: "1px solid var(--line)",
          }}
        >
          <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "13px" }}>
            {error.status === 401
              ? "Your session has expired. Please sign in again."
              : "Profile data is unavailable."}
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={handleSignOut}
            style={{ maxWidth: "200px", margin: "0 auto" }}
          >
            Sign in <Icon name="arrow" size={18} />
          </button>
        </div>
      )}

      {token && !loading && !error && !profile && (
        <p className="empty-state">No profile data is available.</p>
      )}

      {profile && (
        <>
          <section className="profile-card">
            {isBusiness && vendorLogo ? (
              <div className="profile-avatar has-logo">
                <img src={vendorLogo} alt={name || "Business"} className="profile-avatar-img" />
              </div>
            ) : (
              <div className="profile-avatar">{initials(name || email) || "?"}</div>
            )}
            <div>
              <h3>{name || email || (isBusiness ? "Unnamed Business" : "Unnamed user")}</h3>
              {email && <p>{email}</p>}
            </div>
          </section>

          <section className="profile-section">
            <div className="section-heading">
              <h3>{isBusiness ? "Business details" : "Account details"}</h3>
              {!isEditingDetails && (
                <button
                  type="button"
                  onClick={handleStartEditDetails}
                  style={{
                    border: 0,
                    background: "none",
                    color: "var(--forest)",
                    fontSize: "11px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  aria-label="Edit account details"
                >
                  <Icon name="settings" size={13} /> Edit details
                </button>
              )}
            </div>

            {detailsSaveMessage && (
              <div
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  background: "#e4efdc",
                  color: "#2b5138",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                <Icon name="check" size={16} /> {detailsSaveMessage}
              </div>
            )}

            {!isEditingDetails ? (
              userDetails.map(([label, value]) => (
                <div className="info-row" key={label}>
                  <span>{label}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))
            ) : (
              <form onSubmit={handleSaveDetails} style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", color: "var(--muted)", lineHeight: 1.4 }}>
                  {isBusiness
                    ? "Update your business name, email address, and vendor type below. Enter your current password to confirm and save changes."
                    : "Update your email address below. Enter your current password to confirm and save changes."}
                </p>

                {detailsSaveError && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: "#fde8e8",
                      color: "#991b1b",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon name="clock" size={16} /> {detailsSaveError}
                  </div>
                )}

                <div className="info-row" style={{ paddingBottom: "8px", borderBottom: "1px solid var(--line)" }}>
                  <span>Account type</span>
                  <strong>{isBusiness ? "Business" : "Customer"}</strong>
                </div>

                {!isBusiness && (
                  <div className="info-row" style={{ paddingBottom: "8px", borderBottom: "1px solid var(--line)" }}>
                    <span>Full name</span>
                    <strong>{name || "Not set"}</strong>
                  </div>
                )}

                {isBusiness && (
                  <div>
                    <label htmlFor="editBusinessNameInput" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                      Business name <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <div className="input-shell">
                      <Icon name="briefcase" size={17} />
                      <input
                        id="editBusinessNameInput"
                        type="text"
                        placeholder="Business Name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        disabled={isSavingDetails}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="editEmailInput" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                    Email address <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <div className="input-shell">
                    <Icon name="mail" size={17} />
                    <input
                      id="editEmailInput"
                      type="email"
                      placeholder="Email address"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      disabled={isSavingDetails}
                    />
                  </div>
                </div>

                {isBusiness && (
                  <div>
                    <label htmlFor="editVendorTypeInput" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                      Vendor type <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <div className="input-shell">
                      <input
                        id="editVendorTypeInput"
                        type="text"
                        list="vendor-type-presets-list"
                        placeholder="e.g. Food Truck, Crafter, Jewelry, etc."
                        value={editVendorType}
                        onChange={(e) => setEditVendorType(e.target.value)}
                        required
                        disabled={isSavingDetails}
                      />
                      <datalist id="vendor-type-presets-list">
                        <option value="Food Truck" />
                        <option value="Farmer's Market" />
                        <option value="Crafter" />
                        <option value="Jewelry" />
                        <option value="Mobile Boutique" />
                        <option value="Mobile Food & Beverage" />
                      </datalist>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px dashed var(--line)" }}>
                  <label htmlFor="passwordConfirmInput" style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                    Current password <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <div className="input-shell">
                    <Icon name="lock" size={17} />
                    <input
                      id="passwordConfirmInput"
                      type="password"
                      placeholder="Enter password to confirm changes"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={isSavingDetails}
                    />
                  </div>
                  <span style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
                    Your password is required to verify your identity before saving edits.
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSavingDetails || !passwordConfirm.trim()}
                    style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                  >
                    {isSavingDetails ? "Saving Changes..." : "Save changes"} <Icon name="check" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditDetails}
                    disabled={isSavingDetails}
                    style={{
                      padding: "0 18px",
                      borderRadius: "13px",
                      background: "white",
                      color: "#4b5563",
                      border: "1.5px solid var(--line)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      minHeight: "44px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* CUSTOMER VIEW: Location (City) */}
          {!isBusiness && (
            <section className="profile-section">
              <div className="section-heading">
                <h3>Your location</h3>
                {currentCity && (
                  <span style={{ fontSize: "11px", color: "var(--forest)", fontWeight: "600" }}>
                    {currentCity}
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: 1.4 }}>
                Set your city to determine the center coordinates for the map view. For privacy reasons, enter your city only (not your street address). This field is optional and can be edited at any time.
              </p>
              <form onSubmit={handleSaveCustomerLocation} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>
                    City
                  </span>
                  <div className="input-shell">
                    <Icon name="pin" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. St. Louis, MO"
                      value={cityInput}
                      onChange={(e) => {setCityInput(e.target.value), setCurrentCity(e.target.value)}}
                      aria-label="City location"
                    />
                    {cityInput && (
                      <button
                        type="button"
                        onClick={() => setCityInput("")}
                        style={{
                          border: 0,
                          background: "none",
                          color: "var(--muted)",
                          cursor: "pointer",
                          padding: "4px",
                          fontSize: "14px",
                          lineHeight: 1,
                        }}
                        title="Clear city input"
                        aria-label="Clear city input"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </label>

                {citySaveMessage && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: "#e4efdc",
                      color: "#2b5138",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon name="check" size={16} /> {citySaveMessage}
                  </div>
                )}

                {citySaveError && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: "#ffe3e3",
                      color: "#c92a2a",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {citySaveError}
                  </div>
                )}

                <div style={{ display: "flex", gap: "9px", marginTop: "2px" }}>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isSavingCity}
                    style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                  >
                    {isSavingCity
                      ? "Saving..."
                      : (cityInput.trim() ? "Save Location" : (currentCity ? "Clear Location" : "Save Location"))}{" "}
                    <Icon name="check" size={16} />
                  </button>
                  {currentCity && (
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      style={{
                        padding: "0 14px",
                        border: "1px solid var(--line)",
                        borderRadius: "13px",
                        background: "white",
                        color: "var(--forest)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        minHeight: "44px",
                      }}
                      title="View on map"
                    >
                      <Icon name="map" size={16} /> Map
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* CUSTOMER VIEW: Favorite Vendors */}
          {!isBusiness && (
            <section className="profile-section">
              <div className="section-heading">
                <h3>Favorite vendors</h3>
                {favoritesWithDistance.length > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
                    {favoritesWithDistance.length} saved
                    {pagination.totalPages > 1 && ` · Page ${pagination.currentPage} of ${pagination.totalPages}`}
                  </span>
                )}
              </div>
              {pagination.items.length ? (
                <>
                  {pagination.items.map((vendor, index) => (
                    <div
                      className="mini-vendor"
                      key={vendor.id || vendor.name || index}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (vendor.id) {
                          navigate(`/vendor/${encodeURIComponent(vendor.id)}`)
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && vendor.id) {
                          navigate(`/vendor/${encodeURIComponent(vendor.id)}`)
                        }
                      }}
                    >
                      <div className="mini-thumb">{vendor.name?.slice(0, 1).toUpperCase() || "?"}</div>
                      <div>
                        <h4>{vendor.name || "Unnamed vendor"}</h4>
                        <p>{[vendor.type, vendor.distance || vendor.city].filter(Boolean).join(" · ")}</p>
                      </div>
                      <button
                        type="button"
                        className="mini-fav-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFavorite(vendor.id)
                        }}
                        aria-label={`Remove ${vendor.name} from favorites`}
                        title="Remove from favorites"
                      >
                        <Icon name="heart" size={18} fill="#e11d48" color="#e11d48" />
                      </button>
                    </div>
                  ))}

                  {pagination.totalPages > 1 && (
                    <div className="favorites-pagination" aria-label="Favorites pagination">
                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setFavoritesPage(Math.max(1, pagination.currentPage - 1))}
                        disabled={!pagination.hasPrevPage}
                        aria-label="Previous page"
                      >
                        <Icon name="chevron-left" size={14} />
                        <span>Prev</span>
                      </button>

                      <div className="pagination-pages">
                        {pageNumbers.map((p, idx) =>
                          p === "..." ? (
                            <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                              …
                            </span>
                          ) : (
                            <button
                              key={`page-${p}`}
                              type="button"
                              className={`pagination-page-btn ${p === pagination.currentPage ? "active" : ""}`}
                              onClick={() => setFavoritesPage(p)}
                              aria-label={`Go to page ${p}`}
                              aria-current={p === pagination.currentPage ? "page" : undefined}
                            >
                              {p}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        className="pagination-btn"
                        onClick={() => setFavoritesPage(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                        disabled={!pagination.hasNextPage}
                        aria-label="Next page"
                      >
                        <span>Next</span>
                        <Icon name="chevron-right" size={14} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="empty-state">No favorites yet.</p>
              )}
            </section>
          )}

          {/* BUSINESS VIEW: Live Status and Location & Hours Input Section */}
          {isBusiness && (
            <>
              <section className={`business-status ${isBusinessLive(businessData) ? "live" : isBusinessScheduled(businessData) ? "scheduled" : "offline"}`}>
                <span><Icon name={isBusinessLive(businessData) ? "check" : "clock"} size={16} /></span>
                <div>
                  <h4>{isBusinessLive(businessData) ? "Your business is live" : isBusinessScheduled(businessData) ? "Operating hours scheduled" : "Location not active"}</h4>
                  <p>{isBusinessLive(businessData) ? "Visible to customers nearby on the map" : isBusinessScheduled(businessData) ? `Scheduled to go live on the map at ${formatDateTimeSingle(businessData.startTime)}` : "Set location and hours below to appear on the map"}</p>
                </div>
              </section>

              <section className="profile-section">
                <div className="section-heading">
                  <h3>Location & Hours</h3>
                </div>

                <div className="info-row">
                  <span>Current location</span>
                  <strong>{isBusinessScheduled(businessData) && (businessData.address || businessData.locationName) ? (businessData.address || businessData.locationName) : "Not set"}</strong>
                </div>
                <div className="info-row">
                  <span>Operating hours</span>
                  <strong>{isBusinessScheduled(businessData) && (businessData.hours || (businessData.startTime && businessData.expiresAt)) ? (businessData.hours || formatScheduledHours(businessData.startTime, businessData.expiresAt)) : "Not set"}</strong>
                </div>

                <form onSubmit={handleSaveBusinessLocationHours} style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ position: "relative" }} ref={autocompleteRef}>
                    <label htmlFor="businessLocationInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Location / Address</span>
                      <div className="input-shell">
                        <Icon name="location" size={18} />
                        <input
                          id="businessLocationInput"
                          name="location"
                          type="text"
                          placeholder="e.g. 1122 NW River Street, Portland, OR 97209"
                          value={customLocAddress}
                          onChange={(e) => {
                            isSelectionRef.current = false
                            const nextAddress = e.target.value
                            setCustomLocAddress(nextAddress)
                            setIsLoadingSuggestions(nextAddress.trim().length >= 2)
                            setShowSuggestions(true)
                          }}
                          onFocus={() => {
                            if (!isSelectionRef.current && suggestions.length > 0) {
                              setShowSuggestions(true)
                            }
                          }}
                          autoComplete="off"
                          required
                        />
                        {isLoadingSuggestions && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginRight: "4px" }}>...</span>
                        )}
                        {customLocAddress && (
                          <button
                            type="button"
                            onClick={() => {
                              isSelectionRef.current = true
                              setCustomLocAddress("")
                              setSuggestions([])
                              setIsLoadingSuggestions(false)
                              setShowSuggestions(false)
                            }}
                            className="clear-input-btn"
                            title="Clear address input"
                            aria-label="Clear address input"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    {showSuggestions && customLocAddress.trim().length >= 2 && suggestions.length > 0 && (
                      <div className="autocomplete-dropdown" role="listbox">
                        {suggestions.map((s) => (
                          <div
                            key={s.id}
                            className="autocomplete-item"
                            role="option"
                            tabIndex={0}
                            onClick={() => handleSelectSuggestion(s)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                handleSelectSuggestion(s)
                              }
                            }}
                          >
                            <Icon name="pin" size={14} color="var(--forest)" />
                            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                              <strong>{s.mainText}</strong>
                              {s.secondaryText && <span>{s.secondaryText}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="hours-grid">
                    <label htmlFor="businessStartTimeInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Start Time</span>
                      <div className="input-shell">
                        <Icon name="clock" size={18} />
                        <input
                          id="businessStartTimeInput"
                          name="startTime"
                          type="datetime-local"
                          aria-label="Start time"
                          value={customStartDateTime}
                          onChange={(e) => setCustomStartDateTime(e.target.value)}
                          required
                        />
                        {customStartDateTime && (
                          <button
                            type="button"
                            onClick={() => setCustomStartDateTime("")}
                            className="clear-input-btn"
                            title="Clear start time"
                            aria-label="Clear start time"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>

                    <label htmlFor="businessFinishTimeInput" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 700 }}>Finish Time</span>
                      <div className="input-shell">
                        <Icon name="clock" size={18} />
                        <input
                          id="businessFinishTimeInput"
                          name="finishTime"
                          type="datetime-local"
                          aria-label="Finish time"
                          value={customFinishDateTime}
                          onChange={(e) => setCustomFinishDateTime(e.target.value)}
                          min={customStartDateTime || undefined}
                          required
                        />
                        {customFinishDateTime && (
                          <button
                            type="button"
                            onClick={() => setCustomFinishDateTime("")}
                            className="clear-input-btn"
                            title="Clear finish time"
                            aria-label="Clear finish time"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </label>
                  </div>

                  {saveMessage && (
                    <div
                      style={{
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "#e4efdc",
                        color: "#2b5138",
                        fontSize: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Icon name="check" size={16} /> {saveMessage}
                    </div>
                  )}

                  {businessSaveError && (
                    <div
                      style={{
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "#ffe3e3",
                        color: "#c92a2a",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {businessSaveError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "9px", marginTop: "2px" }}>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={isSavingBusiness}
                      style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                    >
                      {isSavingBusiness ? "Saving..." : "Save Location & Hours"} <Icon name="check" size={16} />
                    </button>
                    {isBusinessScheduled(businessData) && (
                      <button
                        type="button"
                        onClick={handleResetBusinessLocation}
                        style={{
                          padding: "0 14px",
                          border: "1px solid var(--line)",
                          borderRadius: "13px",
                          background: "white",
                          color: "#c92a2a",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          minHeight: "44px",
                        }}
                        title="Reset location and hours"
                      >
                        Reset
                      </button>
                    )}
                    {isBusinessScheduled(businessData) && (
                      <button
                        type="button"
                        onClick={() => navigate("/")}
                        style={{
                          padding: "0 14px",
                          border: "1px solid var(--line)",
                          borderRadius: "13px",
                          background: "white",
                          color: "var(--forest)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          minHeight: "44px",
                        }}
                        title="View on map"
                      >
                        <Icon name="map" size={16} /> Map
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* BUSINESS VIEW: Branding & Visuals (Logo for Map & Banner for Recommendations) */}
              <section className="profile-section">
                <div className="section-heading">
                  <h3>Branding & Visuals</h3>
                  {(vendorLogo || vendorBanner) && (
                    <span style={{ fontSize: "11px", color: "var(--forest)", fontWeight: "600" }}>
                      {[vendorLogo && "Logo", vendorBanner && "Banner"].filter(Boolean).join(" & ")} active
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "12px", lineHeight: 1.45 }}>
                  Customize how your business appears to customers. Upload your <strong>brand logo for the Map page</strong> and a <strong>header banner for the Recommendations page</strong>.
                </p>

                {brandingMessage && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#e4efdc",
                      color: "#2b5138",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <Icon name="check" size={16} /> {brandingMessage}
                  </div>
                )}

                {brandingError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#fde8e8",
                      color: "#991b1b",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <Icon name="clock" size={16} /> {brandingError}
                  </div>
                )}

                <div className="branding-cards-grid">
                  {/* CARD 1: Logo for Map Page */}
                  <div className="branding-card">
                    <div className="branding-card-header">
                      <div>
                        <h4>Map Page Logo</h4>
                        <span className="branding-badge map-badge">Map Page</span>
                      </div>
                      <p>Featured in the map vendor list and on your custom map marker pin.</p>
                    </div>

                    <div className="branding-preview-box">
                      <div className="logo-preview-row">
                        {/* Vendor list thumbnail preview */}
                        <div className="logo-preview-item">
                          <div className="vendor-thumb preview-thumb">
                            {vendorLogo ? (
                              <img src={vendorLogo} alt="Logo preview" className="vendor-thumb-img" />
                            ) : (
                              (name || "B").slice(0, 1).toUpperCase()
                            )}
                          </div>
                          <span>List view</span>
                        </div>

                        {/* Map pin marker preview */}
                        <div className="logo-preview-item">
                          <div className="map-pin-preview">
                            {vendorLogo ? (
                              <div className="custom-map-pin preview-pin">
                                <img src={vendorLogo} alt="Pin preview" />
                              </div>
                            ) : (
                              <div className="default-map-pin">
                                <Icon name="pin" size={20} color="#ffffff" fill="var(--forest)" />
                              </div>
                            )}
                          </div>
                          <span>Map pin</span>
                        </div>
                      </div>
                    </div>

                    <div className="branding-actions">
                      <label className="upload-file-button" htmlFor="logoFileInput">
                        <Icon name="upload" size={15} />
                        <span>{vendorLogo ? "Change Logo" : "Upload Logo"}</span>
                        <input
                          id="logoFileInput"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: "none" }}
                        />
                      </label>

                      {vendorLogo && (
                        <button
                          type="button"
                          className="remove-image-button"
                          onClick={handleRemoveLogo}
                          title="Remove logo"
                        >
                          <Icon name="trash" size={15} /> Remove
                        </button>
                      )}

                      <button
                        type="button"
                        className="text-toggle-button"
                        onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                      >
                        {showLogoUrlInput ? "Hide URL" : "Or use URL"}
                      </button>
                    </div>

                    {showLogoUrlInput && (
                      <form onSubmit={handleApplyLogoUrl} className="image-url-form">
                        <div className="input-shell" style={{ flex: 1 }}>
                          <input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={logoInputUrl}
                            onChange={(e) => setLogoInputUrl(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="primary-button compact" disabled={!logoInputUrl.trim()}>
                          Apply
                        </button>
                      </form>
                    )}

                    <span className="branding-hint">Recommended: Square format (PNG, JPG, SVG, WebP, max 5MB)</span>
                  </div>

                  {/* CARD 2: Banner/Header for Recommendations Page */}
                  <div className="branding-card">
                    <div className="branding-card-header">
                      <div>
                        <h4>Recommendations Banner</h4>
                        <span className="branding-badge rec-badge">Recommendations Page</span>
                      </div>
                      <p>Featured as the top header visual for your card on the Recommendations page.</p>
                    </div>

                    <div className="branding-preview-box">
                      <div className="banner-preview-frame">
                        {vendorBanner ? (
                          <img src={vendorBanner} alt="Banner preview" className="card-banner-img" />
                        ) : (
                          <div className="banner-placeholder">
                            <div className="sketch-shape" style={{ opacity: 0.6 }} />
                            <span>Default pattern (No banner)</span>
                          </div>
                        )}
                        <div className="banner-preview-heart">
                          <Icon name="heart" size={15} fill="#e11d48" color="#e11d48" />
                        </div>
                        {vendorLogo && (
                          <div className="recommend-card-logo preview-badge">
                            <img src={vendorLogo} alt="Logo badge preview" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="branding-actions">
                      <label className="upload-file-button" htmlFor="bannerFileInput">
                        <Icon name="upload" size={15} />
                        <span>{vendorBanner ? "Change Banner" : "Upload Banner"}</span>
                        <input
                          id="bannerFileInput"
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          style={{ display: "none" }}
                        />
                      </label>

                      {vendorBanner && (
                        <button
                          type="button"
                          className="remove-image-button"
                          onClick={handleRemoveBanner}
                          title="Remove banner"
                        >
                          <Icon name="trash" size={15} /> Remove
                        </button>
                      )}

                      <button
                        type="button"
                        className="text-toggle-button"
                        onClick={() => setShowBannerUrlInput(!showBannerUrlInput)}
                      >
                        {showBannerUrlInput ? "Hide URL" : "Or use URL"}
                      </button>
                    </div>

                    {showBannerUrlInput && (
                      <form onSubmit={handleApplyBannerUrl} className="image-url-form">
                        <div className="input-shell" style={{ flex: 1 }}>
                          <input
                            type="url"
                            placeholder="https://example.com/banner.jpg"
                            value={bannerInputUrl}
                            onChange={(e) => setBannerInputUrl(e.target.value)}
                          />
                        </div>
                        <button type="submit" className="primary-button compact" disabled={!bannerInputUrl.trim()}>
                          Apply
                        </button>
                      </form>
                    )}

                    <span className="branding-hint">Recommended: Landscape format (~16:9, PNG, JPG, WebP, max 5MB)</span>
                  </div>
                </div>

                <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSaveBranding}
                    disabled={isSavingBranding}
                    style={{ flex: 1, minHeight: "44px", fontSize: "12px" }}
                  >
                    {isSavingBranding ? "Saving Branding..." : "Save Branding Images"} <Icon name="check" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    style={{
                      padding: "0 14px",
                      borderRadius: "13px",
                      background: "white",
                      color: "var(--forest)",
                      border: "1.5px solid var(--line)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      minHeight: "44px",
                    }}
                    title="View on map"
                  >
                    <Icon name="map" size={16} /> Map
                  </button>
                </div>
              </section>

              {/* BUSINESS VIEW: Profile Keywords & Categories Selection */}
              <section className="profile-section">
                <div className="section-heading">
                  <h3>Profile Keywords & Categories</h3>
                  {vendorKeywords.length > 0 && (
                    <span style={{ fontSize: "11px", color: "var(--forest)", fontWeight: "600" }}>
                      {vendorKeywords.length} selected
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: 1.4 }}>
                  Select keywords that describe your business (e.g. crochet, mexican, coffee). Recommendation rankings focus on keyword categories to connect you with interested customers nearby.
                </p>

                {/* Active categories derived from keywords */}
                {activeBusinessCategories.length > 0 && (
                  <div style={{ marginBottom: "14px", padding: "10px 12px", borderRadius: "12px", background: "#f2f6ee" }}>
                    <span style={{ display: "block", marginBottom: "6px", fontSize: "10px", fontWeight: 700, color: "var(--forest)", textTransform: "uppercase" }}>
                      Assigned Keyword Categories
                    </span>
                    <div className="keyword-chip-list" style={{ marginTop: 0 }}>
                      {activeBusinessCategories.map((cat) => (
                        <span key={cat.id} className="keyword-chip keyword-match">
                          ★ {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current keywords as chips */}
                {vendorKeywords.length > 0 ? (
                  <div className="keyword-chip-list" style={{ marginBottom: "14px" }}>
                    {vendorKeywords.map((kw) => (
                      <span key={kw} className="keyword-chip" style={{ fontSize: "12px", padding: "4px 9px" }}>
                        {kw}
                        <button
                          type="button"
                          className="keyword-chip-remove"
                          onClick={() => handleRemoveKeyword(kw)}
                          aria-label={`Remove keyword ${kw}`}
                          title={`Remove ${kw}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px" }}>
                    No keywords selected yet. Pick from the suggestions below or add your own.
                  </p>
                )}

                {/* Popular keyword selector */}
                <div style={{ marginBottom: "14px" }}>
                  <span style={{ display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                    Popular Keywords
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {POPULAR_KEYWORDS.map((kw) => {
                      const isSelected = vendorKeywords.includes(kw)
                      return (
                        <button
                          key={kw}
                          type="button"
                          className={`keyword-chip-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => handleToggleKeyword(kw)}
                        >
                          {isSelected ? "✓ " : "+ "}{kw}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom keyword input */}
                <form onSubmit={handleAddCustomKeyword} style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  <div className="input-shell" style={{ flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Add custom keyword (e.g. salsa, pottery)"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      aria-label="Add custom keyword"
                    />
                  </div>
                  <button
                    type="submit"
                    className="keyword-chip-btn"
                    style={{ background: "var(--paper)", minHeight: "44px", padding: "0 14px", fontWeight: 700 }}
                    disabled={!newKeywordInput.trim()}
                  >
                    Add
                  </button>
                </form>

                {keywordSaveMessage && (
                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: "#e4efdc",
                      color: "#2b5138",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "12px",
                    }}
                  >
                    <Icon name="check" size={16} /> {keywordSaveMessage}
                  </div>
                )}

                <button
                  type="button"
                  className="primary-button"
                  onClick={handleSaveKeywords}
                  disabled={isSavingKeywords}
                  style={{ minHeight: "44px", fontSize: "12px" }}
                >
                  {isSavingKeywords ? "Saving..." : "Save Keywords"} <Icon name="check" size={16} />
                </button>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}

