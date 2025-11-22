import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateId } from "@/lib/utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: postId } = await params
    
    // Validate post ID
    const idValidation = validateId(postId)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid post ID" },
        { status: 400 }
      )
    }
    
    const userId = session.user.id

    // Check if PostRead record already exists
    const existingPostRead = await prisma.postRead.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    })

    if (existingPostRead) {
      // Update the lastReadAt timestamp
      await prisma.postRead.update({
        where: {
          userId_postId: {
            userId,
            postId
          }
        },
        data: {
          lastReadAt: new Date()
        }
      })
    } else {
      // Create new PostRead record
      await prisma.postRead.create({
        data: {
          id: `${userId}_${postId}`, // Simple composite key
          userId,
          postId,
          lastReadAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking post as read:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
