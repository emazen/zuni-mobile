import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUniversitiesCache, setUniversitiesCache, invalidateUniversitiesCache } from "@/lib/universitiesCache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const now = Date.now();
    
    // Check if we have valid cached universities data
    const { cache, timestamp, duration } = getUniversitiesCache();
    let universities;
    if (cache && (now - timestamp) < duration) {
      universities = cache;
    } else {
      // Fetch universities from database
      universities = await prisma.university.findMany({
        select: {
          id: true,
          name: true,
          shortName: true,
          city: true,
          type: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      
      // Update cache
      setUniversitiesCache(universities, now);
    }
    
    // Get user's subscriptions (always fresh, no cache needed)
    const userSubscriptions = session?.user?.id ? await prisma.userUniversitySubscription.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        universityId: true
      }
    }) : [];

    // Create a Set for O(1) lookup performance
    const subscribedUniversityIds = new Set(
      userSubscriptions.map((sub) => sub.universityId)
    );

    // Transform the data to include subscription status
    const universitiesWithSubscriptionStatus = universities.map((uni) => ({
      id: uni.id,
      name: uni.name,
      shortName: uni.shortName,
      city: uni.city,
      type: uni.type,
      totalPosts: uni._count?.posts ?? 0,
      isSubscribed: session?.user?.id ? subscribedUniversityIds.has(uni.id) : false
    }));

    return NextResponse.json(universitiesWithSubscriptionStatus);
  } catch (error) {
    console.error("Error fetching universities:", error);
    return NextResponse.json(
      { error: "Failed to fetch universities" },
      { status: 500 }
    );
  }
}
