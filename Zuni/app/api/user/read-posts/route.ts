import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get all PostRead records for this user
    const readPosts = await prisma.postRead.findMany({
      where: {
        userId
      },
      select: {
        postId: true,
        lastReadAt: true
      }
    })

    // Convert to object for JSON serialization
    const readPostsObject = Object.fromEntries(
      readPosts.map(read => [read.postId, read.lastReadAt.toISOString()])
    )

    return NextResponse.json(readPostsObject)
  } catch (error) {
    console.error("Error fetching read posts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
