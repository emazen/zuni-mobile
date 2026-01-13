import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sanitizeAndValidate } from "@/lib/utils"
import { createPostSchema } from "@/lib/validation"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const trendingWindowStart = new Date(Date.now() - 48 * 60 * 60 * 1000) // last 48 hours

    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            // name and email removed
            gender: true,
            customColor: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
        comments: {
          select: {
            id: true,
            createdAt: true,
            authorId: true, // Need authorId to exclude user's own comments
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Get more comments to find the latest one NOT by current user
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200, // Limit payload for faster main/trending loads
    })

    // Calculate trending status based on comment count in last 48 hours.
    // NOTE: This uses a single grouped query for performance.
    const commentCountsLast48h = await prisma.comment.groupBy({
      by: ['postId'],
      where: {
        postId: { in: posts.map(p => p.id) },
        createdAt: { gte: trendingWindowStart },
      },
      _count: { _all: true },
    })

    const trendingCountMap = new Map<string, number>()
    for (const row of commentCountsLast48h) {
      trendingCountMap.set(row.postId, row._count._all)
    }

    // Add trending status and most recent comment timestamp (excluding user's own comments)
    const postsWithTrending = posts.map(post => {
      // Find the latest comment that's NOT from the current user
      const latestCommentByOthers = post.comments.find(
        comment => comment.authorId !== session.user.id
      )
      return {
        ...post,
        isTrending: (trendingCountMap.get(post.id) || 0) >= 10,
        latestCommentTimestamp: latestCommentByOthers?.createdAt || null,
      }
    })

    return NextResponse.json(postsWithTrending)
  } catch (error) {
    console.error("Error fetching posts:", error)
    return NextResponse.json(
      { error: "Failed to fetch posts" },
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
    const validationResult = createPostSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { title, content, image, audio } = validationResult.data

    // Sanitize input (Zod already trimmed, but we sanitize for XSS)
    const titleValidation = sanitizeAndValidate(title, 200, "Title")
    if (titleValidation.error) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      )
    }

    // Only validate content if it's provided and not empty
    // If only image/audio is provided, content can be empty
    let sanitizedContent = '';
    if (content && content.trim().length > 0) {
    const contentValidation = sanitizeAndValidate(content, 10000, "Content")
    if (contentValidation.error) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      )
      }
      sanitizedContent = contentValidation.sanitized;
    }

    // Get the default university (Genel Üniversite)
    const defaultUniversity = await prisma.university.findFirst({
      where: { shortName: 'GENEL' }
    });

    if (!defaultUniversity) {
      return NextResponse.json(
        { error: "Default university not found" },
        { status: 500 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: titleValidation.sanitized,
        content: sanitizedContent,
        image,
        audio,
        authorId: session.user.id,
        universityId: defaultUniversity.id,
      },
      include: {
        author: {
          select: {
            // name and email removed
            gender: true,
            customColor: true,
          },
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    })

    // Invalidate universities cache to update post counts in sidebar
    try {
      const { invalidateUniversitiesCache } = await import('@/app/api/universities/route')
      invalidateUniversitiesCache()
    } catch (error) {
      // If cache invalidation fails, log but don't fail the request
      console.error('Failed to invalidate universities cache:', error)
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error("Error creating post:", error)
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
