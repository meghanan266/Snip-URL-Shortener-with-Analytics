"use client"

import { useState } from "react"
import { useParams } from "next/navigation"

export default function PasswordPage() {
  const params = useParams()
  const slug = params.slug as string

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch(`/api/links/${slug}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(
          data.error?.message === "Incorrect password"
            ? "Incorrect password. Please try again."
            : "Something went wrong. Please try again."
        )
        setLoading(false)
        return
      }

      // Set cookie so middleware lets them through next time
      // Cookie name matches what middleware checks: snip_pw_{slug}
      // Cookie value is the hashed password for comparison in middleware
      document.cookie = `snip_pw_${slug}=${data.hashedPassword}; path=/${slug}; max-age=${60 * 60 * 24 * 7}`

      // Redirect to the destination URL
      window.location.href = data.url
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-4xl">🔒</p>
          <h1 className="text-2xl font-bold text-white">
            Protected link
          </h1>
          <p className="text-gray-400 text-sm">
            Enter the password to continue to your destination.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-4 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
