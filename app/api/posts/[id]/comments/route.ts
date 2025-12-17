import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeAndValidate, validateId } from "@/lib/utils"
import { createCommentSchema } from "@/lib/validation"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    // Validate request body with Zod
    const validationResult = createCommentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { content, image, audio } = validationResult.data

    // Sanitize input (Zod already trimmed, but we sanitize for XSS)
    // Only validate content if it's provided and not empty
    // If only audio/image is provided, content can be empty
    let sanitizedContent = '';
    if (content && content.trim().length > 0) {
    const contentValidation = sanitizeAndValidate(content, 2000, "Comment")
    if (contentValidation.error) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      )
      }
      sanitizedContent = contentValidation.sanitized;
    }

    const resolvedParams = await params
    
    // Validate post ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid post ID" },
        { status: 400 }
      )
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    const comment = await prisma.comment.create({
      data: {
        content: sanitizedContent,
        image,
        audio,
        authorId: session.user.id,
        postId: resolvedParams.id,
      },
      include: {
        author: {
          select: {
            // name and email removed
            gender: true,
            customColor: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating comment:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    })
    return NextResponse.json(
      { 
        error: "Failed to create comment",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
