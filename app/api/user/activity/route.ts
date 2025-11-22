import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Use Promise.all to run queries in parallel
    const [userPosts, postsWithUserComments, subscribedUniversities] = await Promise.all([
      // Get user's posts
      prisma.post.findMany({
        where: {
          authorId: session.user.id
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
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20, // Limit to 20 most recent posts
      }),

      // Get posts where user has commented (limit to avoid duplicates)
      // Exclude posts where user is the author (those are in userPosts)
      prisma.post.findMany({
        where: {
          authorId: {
            not: session.user.id // Exclude posts authored by the user
          },
          comments: {
            some: {
              authorId: session.user.id
            }
          }
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
          _count: {
            select: {
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20, // Limit to 20 most recent posts
      }),

      // Get user's subscribed universities
      prisma.userUniversitySubscription.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              shortName: true,
              city: true,
              type: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    ])

    // Get trending status in a separate optimized query
    const trendingPosts = await prisma.post.findMany({
      where: {
        OR: [
          { authorId: session.user.id },
          { comments: { some: { authorId: session.user.id } } }
        ],
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

    // Create a map for quick trending lookup
    const trendingMap = new Map(
      trendingPosts.map(post => [
        post.id, 
        post._count.comments >= 10
      ])
    )

    // Add trending status and most recent comment timestamp (excluding user's own comments)
    const userPostsWithTrending = userPosts.map(post => {
      // Find the latest comment that's NOT from the current user
      const latestCommentByOthers = post.comments.find(
        comment => comment.authorId !== session.user.id
      )
      return {
        ...post,
        isTrending: trendingMap.get(post.id) || false,
        latestCommentTimestamp: latestCommentByOthers?.createdAt || null,
      }
    })

    const postsWithUserCommentsWithTrending = postsWithUserComments.map(post => {
      // Find the latest comment that's NOT from the current user
      const latestCommentByOthers = post.comments.find(
        comment => comment.authorId !== session.user.id
      )
      return {
        ...post,
        isTrending: trendingMap.get(post.id) || false,
        latestCommentTimestamp: latestCommentByOthers?.createdAt || null,
      }
    })

    return NextResponse.json({
      userPosts: userPostsWithTrending,
      postsWithUserComments: postsWithUserCommentsWithTrending,
      subscribedUniversities
    })
  } catch (error) {
    console.error("Error fetching user activity:", error)
    return NextResponse.json(
      { error: "Failed to fetch user activity" },
      { status: 500 }
    )
  }
}
