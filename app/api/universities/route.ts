import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cache for universities data (since it rarely changes)
let universitiesCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const now = Date.now();
    
    // Check if we have valid cached universities data
    let universities;
    if (universitiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      universities = universitiesCache;
    } else {
      // Fetch universities from database
      universities = await prisma.university.findMany({
        select: {
          id: true,
          name: true,
          shortName: true,
          city: true,
          type: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
      
      // Update cache
      universitiesCache = universities;
      cacheTimestamp = now;
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
