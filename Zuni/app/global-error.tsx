"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-gray-100">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-black text-black mb-3">Application error</h2>
          {error?.message && (
            <p className="text-lg font-semibold text-black mb-6 break-all">{error.message}</p>
          )}
          <button
            onClick={() => reset()}
            className="brutal-button-primary"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}


