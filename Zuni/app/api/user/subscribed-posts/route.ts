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

    const trendingWindowStart = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48 hours

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
    });

    return NextResponse.json(postsWithTrending);
  } catch (error) {
    console.error('Error fetching subscribed posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
