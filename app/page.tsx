import { LinkForm } from "@/components/link-form"

export default function HomePage() {
  const apiKey = process.env.SNIP_API_KEY ?? ""

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl">✂️</span>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Snip
            </h1>
          </div>
          <p className="text-gray-400">
            Shorten URLs, track clicks, own your data.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
          {apiKey ? (
            <LinkForm apiKey={apiKey} />
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-gray-400 text-sm">
                SNIP_API_KEY is not set.
              </p>
              <p className="text-gray-500 text-xs">
                Create an API key at{" "}
                <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-300">
                  POST /api/keys
                </code>{" "}
                and add it to your .env file as SNIP_API_KEY.
              </p>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-6 text-sm text-gray-600">
          <a href="/dashboard" className="hover:text-gray-400 transition-colors">
            Dashboard
          </a>
          <span>·</span>
          <a
            href="https://github.com/YOUR_USERNAME/snip"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  )
}
