import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateId } from "@/lib/utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    
    // Validate university ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid university ID" },
        { status: 400 }
      )
    }
    
    const universityId = resolvedParams.id

    // Check if university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId }
    })

    if (!university) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      )
    }

    // Check if already subscribed
    const existingSubscription = await prisma.userUniversitySubscription.findUnique({
      where: {
        userId_universityId: {
          userId: session.user.id,
          universityId: universityId
        }
      }
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "Already subscribed" },
        { status: 400 }
      )
    }

    // Create subscription
    const subscription = await prisma.userUniversitySubscription.create({
      data: {
        userId: session.user.id,
        universityId: universityId
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
      }
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error("Error subscribing to university:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to university" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    
    // Validate university ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid university ID" },
        { status: 400 }
      )
    }
    
    const universityId = resolvedParams.id

    // Delete subscription
    const deletedSubscription = await prisma.userUniversitySubscription.delete({
      where: {
        userId_universityId: {
          userId: session.user.id,
          universityId: universityId
        }
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error unsubscribing from university:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe from university" },
      { status: 500 }
    )
  }
}
