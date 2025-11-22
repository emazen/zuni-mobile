import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateId } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    
    // Validate university ID
    const idValidation = validateId(resolvedParams.id)
    if (!idValidation.valid) {
      return NextResponse.json(
        { error: idValidation.error || "Invalid university ID" },
        { status: 400 }
      )
    }
    
    const university = await prisma.university.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        type: true,
      },
    });

    if (!university) {
      return NextResponse.json(
        { error: "University not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(university);
  } catch (error) {
    console.error("Error fetching university:", error);
    return NextResponse.json(
      { error: "Failed to fetch university" },
      { status: 500 }
    );
  }
}
