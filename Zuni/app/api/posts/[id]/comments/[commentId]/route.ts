import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateId } from "@/lib/utils"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const { id, commentId } = resolvedParams

    const postIdValidation = validateId(id)
    if (!postIdValidation.valid) {
      return NextResponse.json(
        { error: postIdValidation.error || "Invalid post ID" },
        { status: 400 }
      )
    }

    const commentIdValidation = validateId(commentId)
    if (!commentIdValidation.valid) {
      return NextResponse.json(
        { error: commentIdValidation.error || "Invalid comment ID" },
        { status: 400 }
      )
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
      },
    })

    if (!comment || comment.postId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: 'silinmiş',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}


