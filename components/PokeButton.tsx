"use client"

import { useState } from "react"
import { Hand } from "lucide-react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

type TargetType = "post" | "comment"

interface PokeButtonProps {
  targetId: string
  targetType: TargetType
  size?: "sm" | "md"
  className?: string
}

export default function PokeButton({ targetId, targetType, size = "md", className }: PokeButtonProps) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle")

  const labelMap: Record<typeof status, string> = {
    idle: "Dürt",
    loading: "Gönderiliyor",
    sent: "Dürtüldü",
    error: "Tekrar Dene",
  }

  const disabled = status === "loading"

  const handlePoke = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!session?.user?.id) {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
      return
    }

    setStatus("loading")

    try {
      const response = await fetch("/api/pokes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetId, targetType }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const errorMessage = errorBody?.error || "Dürtme başarısız"
        throw new Error(errorMessage)
      }

      setStatus("sent")
      setTimeout(() => setStatus("idle"), 4000)
    } catch (error) {
      console.error("Failed to send poke:", error)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2500)
    }
  }

  const sizeClasses = size === "sm"
    ? "px-3 py-1 text-xs"
    : "px-4 py-2 text-sm"

  const statusClasses = {
    idle: "bg-white text-black border-black dark:bg-[#1a1a1a] dark:text-white",
    loading: "bg-gray-200 text-gray-600 border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
    sent: "bg-green-100 text-green-800 border-green-500 dark:bg-green-900/30 dark:text-green-200 dark:border-green-500",
    error: "bg-red-100 text-red-700 border-red-500 dark:bg-red-900/40 dark:text-red-200 dark:border-red-500",
  }[status]

  return (
    <button
      type="button"
      onClick={handlePoke}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold rounded-full border-2 brutal-shadow transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed",
        sizeClasses,
        statusClasses,
        className
      )}
    >
      <Hand className={cn(size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
      {labelMap[status]}
    </button>
  )
}

