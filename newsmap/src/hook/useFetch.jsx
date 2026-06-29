import { useState, useEffect } from "react"

function useFetch(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // if no url yet, don't fetch
    if (!url) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setData(null)

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed")
        return res.json()
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

  }, [url]) // re-runs every time url changes

  return { data, loading, error }
}

export default useFetch