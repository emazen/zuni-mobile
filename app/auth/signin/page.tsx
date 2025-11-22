"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignIn() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to home page - signin is now handled by modal
    router.replace('/')
  }, [router])
  
  return null
}
