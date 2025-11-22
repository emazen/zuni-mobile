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

    const posts = await prisma.post.findMany({
      where: { universityId: resolvedParams.id },
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
    });

    // Calculate trending status based on comment count in last 48 hours
    const trendingPostIds = await prisma.post.findMany({
      where: {
        universityId: resolvedParams.id,
        comments: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
            }
          }
        }
      },
      select: {
        id: true,
        _count: {
          select: {
            comments: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
                }
              }
            }
          }
        }
      }
    })

    const trendingMap = new Map(
      trendingPostIds.map(post => [post.id, post._count.comments >= 10])
    )

    // Add trending status and most recent comment timestamp (excluding user's own comments)
    const postsWithTrending = posts.map(post => {
      // Find the latest comment that's NOT from the current user
      const latestCommentByOthers = post.comments.find(
        comment => comment.authorId !== session.user.id
      )
      return {
        ...post,
        isTrending: trendingMap.get(post.id) || false,
        latestCommentTimestamp: latestCommentByOthers?.createdAt || null,
      }
    });

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

    const { title, content } = validationResult.data;

    // Sanitize input (Zod already trimmed, but we sanitize for XSS)
    const titleValidation = sanitizeAndValidate(title, 200, "Title")
    if (titleValidation.error) {
      return NextResponse.json(
        { error: titleValidation.error },
        { status: 400 }
      )
    }

    const contentValidation = sanitizeAndValidate(content, 10000, "Content")
    if (contentValidation.error) {
      return NextResponse.json(
        { error: contentValidation.error },
        { status: 400 }
      )
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
        content: contentValidation.sanitized,
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
