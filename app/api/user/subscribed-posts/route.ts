import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscribed universities with optimized query
    const userSubscriptions = await prisma.userUniversitySubscription.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      select: {
        universityId: true
      }
    });

    const subscribedUniversityIds = userSubscriptions.map(sub => sub.universityId);

    if (subscribedUniversityIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get posts from subscribed universities with limit and optimized includes
    // Exclude posts where the current user is the author
    const posts = await prisma.post.findMany({
      where: {
        universityId: {
          in: subscribedUniversityIds
        },
        authorId: {
          not: session.user.id // Exclude user's own posts
        }
      },
      include: {
        author: {
          select: {
            // name and email removed
            gender: true,
            customColor: true
          }
        },
        university: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
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
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to 50 most recent posts for better performance
    });

    // Get trending status in a separate optimized query
    // Exclude comments from post authors - only count comments from other users
    const trendingPosts = await prisma.post.findMany({
      where: {
        id: {
          in: posts.map(p => p.id)
        },
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
        authorId: true, // Need authorId to exclude post author's comments
      }
    });

    // For each post, count comments from OTHER users (not the post author)
    const trendingMap = new Map<string, boolean>()
    for (const post of trendingPosts) {
      const commentCount = await prisma.comment.count({
        where: {
          postId: post.id,
          createdAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
          // Exclude comments from the post author
          authorId: {
            not: post.authorId
          }
        }
      })
      trendingMap.set(post.id, commentCount >= 10)
    }

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
    console.error('Error fetching subscribed posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
