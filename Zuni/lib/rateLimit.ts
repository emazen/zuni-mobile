import { prisma } from './prisma'

interface RateLimitConfig {
  maxUploadsPerHour: number
  maxUploadsPerDay: number
  maxFileSizePerDay: number // in bytes
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxUploadsPerHour: 20, // 20 upload per hour
  maxUploadsPerDay: 100, // 100 upload per day
  maxFileSizePerDay: 500 * 1024 * 1024, // 500MB per day
}

interface RateLimitResult {
  allowed: boolean
  reason?: string
  remaining?: {
    hourly: number
    daily: number
    dailySize: number // bytes remaining
  }
}

/**
 * Check if user can upload based on rate limits
 */
export async function checkUploadRateLimit(
  userId: string,
  fileSize: number,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const limits = { ...DEFAULT_CONFIG, ...config }
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    // Get user's uploads in the last hour
    const hourlyUploads = await prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: oneHourAgo },
        OR: [
          { image: { not: null } },
          { audio: { not: null } }
        ]
      }
    })

    // Get user's uploads in the last 24 hours
    const dailyUploads = await prisma.post.findMany({
      where: {
        authorId: userId,
        createdAt: { gte: oneDayAgo },
        OR: [
          { image: { not: null } },
          { audio: { not: null } }
        ]
      },
      select: {
        image: true,
        audio: true,
        createdAt: true
      }
    })

    // Calculate total file size uploaded today (approximate)
    // We'll estimate based on file count since we don't store exact sizes
    // Average image: ~500KB, Average audio: ~2MB
    const imageCount = dailyUploads.filter(p => p.image).length
    const audioCount = dailyUploads.filter(p => p.audio).length
    const estimatedDailySize = (imageCount * 500 * 1024) + (audioCount * 2 * 1024 * 1024)
    const totalDailySize = estimatedDailySize + fileSize

    // Check hourly limit
    if (hourlyUploads >= limits.maxUploadsPerHour) {
      return {
        allowed: false,
        reason: `Hourly upload limit reached (${limits.maxUploadsPerHour} uploads/hour). Please try again later.`,
        remaining: {
          hourly: 0,
          daily: Math.max(0, limits.maxUploadsPerDay - dailyUploads.length),
          dailySize: Math.max(0, limits.maxFileSizePerDay - estimatedDailySize)
        }
      }
    }

    // Check daily upload count limit
    if (dailyUploads.length >= limits.maxUploadsPerDay) {
      return {
        allowed: false,
        reason: `Daily upload limit reached (${limits.maxUploadsPerDay} uploads/day). Please try again tomorrow.`,
        remaining: {
          hourly: Math.max(0, limits.maxUploadsPerHour - hourlyUploads),
          daily: 0,
          dailySize: Math.max(0, limits.maxFileSizePerDay - estimatedDailySize)
        }
      }
    }

    // Check daily file size limit
    if (totalDailySize > limits.maxFileSizePerDay) {
      return {
        allowed: false,
        reason: `Daily file size limit reached (${Math.round(limits.maxFileSizePerDay / 1024 / 1024)}MB/day). Please try again tomorrow.`,
        remaining: {
          hourly: Math.max(0, limits.maxUploadsPerHour - hourlyUploads),
          daily: Math.max(0, limits.maxUploadsPerDay - dailyUploads.length),
          dailySize: 0
        }
      }
    }

    return {
      allowed: true,
      remaining: {
        hourly: Math.max(0, limits.maxUploadsPerHour - hourlyUploads - 1),
        daily: Math.max(0, limits.maxUploadsPerDay - dailyUploads.length - 1),
        dailySize: Math.max(0, limits.maxFileSizePerDay - totalDailySize)
      }
    }
  } catch (error) {
    console.error('Error checking rate limit:', error)
    // On error, allow the upload (fail open) but log the error
    // In production, you might want to fail closed instead
    return { allowed: true }
  }
}
