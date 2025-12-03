import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateId } from "@/lib/utils"

const POKE_COOLDOWN_MINUTES = 5

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const pokes = await prisma.poke.findMany({
      where: {
        recipientId: session.user.id,
        status: "PENDING",
      },
      include: {
        sender: {
          select: {
            gender: true,
            customColor: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            postId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    return NextResponse.json(pokes)
  } catch (error) {
    console.error("Error loading pokes:", error)
    return NextResponse.json(
      { error: "Failed to load pokes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    let body: { targetId?: string; targetType?: "post" | "comment" }
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      )
    }

    if (!body?.targetId || !body?.targetType) {
      return NextResponse.json(
        { error: "targetId and targetType are required" },
        { status: 400 }
      )
    }

    const idValidation = validateId(body.targetId)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid target" },
        { status: 400 }
      )
    }

    let recipientId: string | null = null
    let postId: string | null = null
    let commentId: string | null = null

    if (body.targetType === "post") {
      const post = await prisma.post.findUnique({
        where: { id: body.targetId },
        select: {
          id: true,
          authorId: true,
        },
      })

      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        )
      }

      recipientId = post.authorId
      postId = post.id
    } else if (body.targetType === "comment") {
      const comment = await prisma.comment.findUnique({
        where: { id: body.targetId },
        select: {
          id: true,
          authorId: true,
          postId: true,
        },
      })

      if (!comment) {
        return NextResponse.json(
          { error: "Comment not found" },
          { status: 404 }
        )
      }

      recipientId = comment.authorId
      commentId = comment.id
      postId = comment.postId
    } else {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 }
      )
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: "Unable to determine poke recipient" },
        { status: 400 }
      )
    }

    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: "Kendi gönderini dürtemezsin" },
        { status: 400 }
      )
    }

    const cooldownDate = new Date(Date.now() - POKE_COOLDOWN_MINUTES * 60 * 1000)

    const targetFilter = commentId ? { commentId } : { postId }

    const existingPoke = await prisma.poke.findFirst({
      where: {
        senderId: session.user.id,
        recipientId,
        status: "PENDING",
        createdAt: {
          gte: cooldownDate,
        },
        ...targetFilter,
      },
    })

    if (existingPoke) {
      return NextResponse.json(
        { error: "Bu içerik için zaten dürttün" },
        { status: 429 }
      )
    }

    const poke = await prisma.poke.create({
      data: {
        senderId: session.user.id,
        recipientId,
        postId,
        commentId,
      },
    })

    return NextResponse.json(poke, { status: 201 })
  } catch (error) {
    console.error("Error creating poke:", error)
    return NextResponse.json(
      { error: "Failed to create poke" },
      { status: 500 }
    )
  }
}

