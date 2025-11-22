"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center bg-gray-100">
      <h2 className="text-2xl font-black text-black mb-3">Something went wrong</h2>
      {error?.message && (
        <p className="text-lg font-semibold text-black mb-6 break-all">{error.message}</p>
      )}
      <button
        onClick={() => reset()}
        className="brutal-button-primary"
      >
        Try again
      </button>
    </div>
  )
}


