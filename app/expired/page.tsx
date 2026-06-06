export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl">⏰</p>
        <h1 className="text-2xl font-bold text-white">Link expired</h1>
        <p className="text-gray-400">
          This short link has expired and is no longer available.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Go home
        </a>
      </div>
    </div>
  )
}
