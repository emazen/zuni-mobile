import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateId } from "@/lib/utils"

export async function PATCH(
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
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid poke id" },
        { status: 400 }
      )
    }

    let body: { action?: "acknowledge" | "dismiss" }
    try {
      body = await request.json()
    } catch (error) {
      body = {}
    }

    const action = body.action || "acknowledge"

    const poke = await prisma.poke.findUnique({
      where: { id: resolvedParams.id },
      select: { recipientId: true },
    })

    if (!poke || poke.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: "Poke not found" },
        { status: 404 }
      )
    }

    const updatedPoke = await prisma.poke.update({
      where: { id: resolvedParams.id },
      data: {
        status: action === "dismiss" ? "DECLINED" : "ACKNOWLEDGED",
        seenAt: new Date(),
      },
    })

    return NextResponse.json(updatedPoke)
  } catch (error) {
    console.error("Error updating poke:", error)
    return NextResponse.json(
      { error: "Failed to update poke" },
      { status: 500 }
    )
  }
}

