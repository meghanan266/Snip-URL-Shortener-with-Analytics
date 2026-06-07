"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"

type CreatedLink = {
  id: string
  slug: string
  url: string
  shortLink: string
  expiresAt: string | null
  createdAt: string
}

type FormState = {
  url: string
  slug: string
  password: string
  expiresAt: string
}

export function LinkForm({ apiKey }: { apiKey: string }) {
  const [form, setForm] = useState<FormState>({
    url: "",
    slug: "",
    password: "",
    expiresAt: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedLink | null>(null)

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setFieldError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    setLoading(true)
    setResult(null)

    try {
      const body: Record<string, string> = { url: form.url }
      if (form.slug.trim()) body.slug = form.slug.trim()
      if (form.password.trim()) body.password = form.password.trim()
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString()

      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.code === "slug_conflict") {
          setFieldError("This slug is already taken. Try a different one.")
        } else if (data.error?.code === "invalid_url") {
          setFieldError("Please enter a valid URL including http:// or https://")
        } else if (data.error?.code === "validation_error") {
          setFieldError(data.error.message)
        } else {
          setError("Something went wrong. Please try again.")
        }
        return
      }

      setResult(data)
      setForm({ url: "", slug: "", password: "", expiresAt: "" })
    } catch {
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Destination URL"
          type="url"
          placeholder="https://example.com/very/long/url"
          value={form.url}
          onChange={(e) => updateField("url", e.target.value)}
          required
          error={fieldError && !form.slug ? fieldError : undefined}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Custom slug"
            placeholder="my-link"
            value={form.slug}
            onChange={(e) => updateField("slug", e.target.value)}
            hint="Letters, numbers, hyphens only"
            error={fieldError && form.slug ? fieldError : undefined}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Optional"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
          />
        </div>

        <Input
          label="Expiry date"
          type="date"
          value={form.expiresAt}
          onChange={(e) => updateField("expiresAt", e.target.value)}
          min={today}
          hint="Leave empty for no expiry"
        />

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <Button
          type="submit"
          loading={loading}
          className="w-full py-3"
        >
          Shorten URL
        </Button>
      </form>

      {result && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1">Your short link</p>
              <p className="text-white font-medium truncate">{result.shortLink}</p>
            </div>
            <CopyButton text={result.shortLink} />
          </div>

          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-500 mb-1">Destination</p>
            <p className="text-gray-400 text-sm truncate">{result.url}</p>
          </div>

          {result.expiresAt && (
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-1">Expires</p>
              <p className="text-gray-400 text-sm">
                {new Date(result.expiresAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          <div className="border-t border-gray-800 pt-3 flex gap-2">
            <a
              href={`/dashboard/${result.slug}`}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              View analytics →
            </a>
            <span className="text-gray-700">·</span>
            <a
              href="/dashboard"
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              All links →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
