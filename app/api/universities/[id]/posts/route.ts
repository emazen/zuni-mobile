import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeAndValidate, validateId } from "@/lib/utils";
import { createPostSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    
    // Validate university ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid university ID" },
        { status: 400 }
      )
    }
    
    // OPTIMIZED: Run university check and posts query in parallel
    const [university, posts] = await Promise.all([
      prisma.university.findUnique({
        where: { id: resolvedParams.id },
      }),
      prisma.post.findMany({
        where: { universityId: resolvedParams.id },
        include: {
          author: {
            select: {
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
        orderBy: {
          createdAt: "desc",
        },
      })
    ]);

    if (!university) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      );
    }

    // OPTIMIZED: Create post author map from posts we already fetched
    const postAuthorMap = new Map<string, string>()
    posts.forEach(post => {
      postAuthorMap.set(post.id, post.authorId)
    })

    const postIds = posts.map(p => p.id)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    // OPTIMIZED: Fetch trending comments and latest comments in parallel
    const [recentComments, allLatestComments] = await Promise.all([
      // All comments from last 48 hours for trending calculation
      postIds.length > 0 ? prisma.comment.findMany({
        where: {
          postId: { in: postIds },
          createdAt: { gte: fortyEightHoursAgo },
        },
        select: {
          postId: true,
          authorId: true,
        }
      }) : [],
      // All comments NOT from current user, ordered by date (we'll group by postId in JS)
      postIds.length > 0 ? prisma.comment.findMany({
        where: {
          postId: { in: postIds },
          authorId: { not: session.user.id },
        },
        select: {
          postId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }) : []
    ])
    
    // Group comments by postId and get the latest one per post
    const latestCommentMap = new Map<string, Date>()
    allLatestComments.forEach(comment => {
      if (!latestCommentMap.has(comment.postId)) {
        latestCommentMap.set(comment.postId, comment.createdAt)
      }
    })

    // Count comments per post for trending, excluding comments from post authors
    const commentCountMap = new Map<string, number>()
    recentComments.forEach(comment => {
      const postAuthorId = postAuthorMap.get(comment.postId)
      if (postAuthorId && comment.authorId !== postAuthorId) {
        const currentCount = commentCountMap.get(comment.postId) || 0
        commentCountMap.set(comment.postId, currentCount + 1)
      }
    })

    // Create trending map
    const trendingMap = new Map<string, boolean>()
    commentCountMap.forEach((count, postId) => {
      trendingMap.set(postId, count >= 10)
    })

    // Add trending status and most recent comment timestamp
    const postsWithTrending = posts.map(post => ({
      ...post,
      isTrending: trendingMap.get(post.id) || false,
      latestCommentTimestamp: latestCommentMap.get(post.id) || null,
    }));

    return NextResponse.json(postsWithTrending);
  } catch (error) {
    console.error("Error fetching university posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    
    // Validate university ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid university ID" },
        { status: 400 }
      )
    }
    
    let body
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request body with Zod
    const validationResult = createPostSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, content, image, audio } = validationResult.data;

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

    // Check if university exists
    const university = await prisma.university.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!university) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: titleValidation.sanitized,
        content: sanitizedContent,
        image,
        audio,
        authorId: session.user.id,
        universityId: resolvedParams.id,
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
    });

    // Invalidate universities cache to update post counts in sidebar
    try {
      const { invalidateUniversitiesCache } = await import('@/app/api/universities/route')
      invalidateUniversitiesCache()
    } catch (error) {
      // If cache invalidation fails, log but don't fail the request
      console.error('Failed to invalidate universities cache:', error)
    }

    // Add trending status to the created post
    const postWithTrending = {
      ...post,
      isTrending: false, // New posts are not trending
    };

    return NextResponse.json(postWithTrending, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
