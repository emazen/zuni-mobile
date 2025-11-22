"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignUp() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page - signup is now handled by modal
    router.replace('/')
  }, [router])
  
  return null
}
