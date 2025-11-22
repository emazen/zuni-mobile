"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

export default function CreatePost() {
  const { data: session } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!title.trim() || !content.trim()) {
      setError("Please fill in all fields")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      })

      if (response.ok) {
        const post = await response.json();
        // Redirect to main page with the new post
        window.location.href = `/?post=${post.id}`;
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create post")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-black">Please sign in to create a post.</p>
          <Link href="/auth/signin" className="text-black font-black hover:text-pink-600 transition-colors">
            Sign in here
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="brutal-header">
        <div className="w-full px-2 sm:px-4">
          <div className="flex items-center h-16">
            <Link
              href="/"
              className="inline-flex items-center text-black font-black hover:text-pink-600 transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Board
            </Link>
            <h1 className="text-2xl font-black text-black">Create New Post</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="brutal-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-300 border-4 border-black text-black px-4 py-3 rounded-lg text-sm font-bold">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-black text-black mb-2">
                Post Title
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="brutal-input w-full"
                placeholder="What's your post about?"
                maxLength={200}
              />
              <p className="mt-2 text-sm font-semibold text-black" style={{color: 'var(--text-primary)'}}>
                {title.length}/200 characters
              </p>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-black text-black mb-2">
                Post Content
              </label>
              <textarea
                id="content"
                rows={12}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="brutal-input w-full"
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                maxLength={10000}
              />
              <p className="mt-2 text-sm font-semibold text-black" style={{color: 'var(--text-primary)'}}>
                {content.length}/10,000 characters - Be respectful and follow community guidelines.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Link
                href="/"
                className="brutal-button-secondary"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="brutal-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Post"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
