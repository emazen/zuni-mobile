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
          // Don't fetch comments here - we'll fetch them in one optimized query later
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
          // Don't fetch comments here - we'll fetch them in one optimized query later
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
    // OPTIMIZED: Fetch all posts and their authorIds, then fetch all comments in one query
    const allActivityPosts = [...userPosts, ...postsWithUserComments]
    const postAuthorMap = new Map<string, string>()
    allActivityPosts.forEach(post => {
      postAuthorMap.set(post.id, post.authorId)
    })

    const postIds = allActivityPosts.map(p => p.id)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    // OPTIMIZED: Fetch trending comments and latest comments in parallel
    const [recentComments, latestCommentsByOthers] = await Promise.all([
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
      // Latest comments NOT from current user
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

    // Count comments per post, excluding comments from post authors
    const commentCountMap = new Map<string, number>()
    recentComments.forEach(comment => {
      const postAuthorId = postAuthorMap.get(comment.postId)
      if (postAuthorId && comment.authorId !== postAuthorId) {
        const currentCount = commentCountMap.get(comment.postId) || 0
        commentCountMap.set(comment.postId, currentCount + 1)
      }
    })

    // Create trending map: post is trending if it has >= 10 comments from other users
    const trendingMap = new Map<string, boolean>()
    commentCountMap.forEach((count, postId) => {
      trendingMap.set(postId, count >= 10)
    })

    // Group comments by postId and get the latest one per post
    const latestCommentMap = new Map<string, Date>()
    latestCommentsByOthers.forEach(comment => {
      if (!latestCommentMap.has(comment.postId)) {
        latestCommentMap.set(comment.postId, comment.createdAt)
      }
    })

    // Add trending status and most recent comment timestamp (excluding user's own comments)
    const userPostsWithTrending = userPosts.map(post => ({
      ...post,
      isTrending: trendingMap.get(post.id) || false,
      latestCommentTimestamp: latestCommentMap.get(post.id) || null,
      // Remove comments array as we don't need it anymore
      comments: undefined,
    }))

    const postsWithUserCommentsWithTrending = postsWithUserComments.map(post => ({
      ...post,
      isTrending: trendingMap.get(post.id) || false,
      latestCommentTimestamp: latestCommentMap.get(post.id) || null,
      // Remove comments array as we don't need it anymore
      comments: undefined,
    }))

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
