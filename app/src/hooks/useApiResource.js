import { useEffect, useState } from "react"
import { getApi } from "../lib/api"

export function useApiResource(path, initialValue) {
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!path) return
    const controller = new AbortController()

    getApi(path, controller.signal)
      .then(setData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [path])

  return { data, loading, error }
}
