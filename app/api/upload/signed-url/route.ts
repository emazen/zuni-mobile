import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: NextRequest) {
  try {
    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Signed URL feature not configured. SUPABASE_SERVICE_ROLE_KEY is required." },
        { status: 503 }
      )
    }

    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. Get file details from request
    const body = await request.json()
    const { filePath, fileType } = body

    if (!filePath || !fileType) {
      return NextResponse.json(
        { error: "Missing filePath or fileType" },
        { status: 400 }
      )
    }

    // 3. Generate Signed Upload URL (valid for 60 seconds)
    // Note: Supabase Storage 'createSignedUploadUrl' allows overwriting by default if the file exists
    const { data, error } = await supabaseAdmin
      .storage
      .from('uploads')
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error("Supabase signing error:", error)
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      )
    }

    // 4. Return the signed URL and the public URL
    // The signed URL is for PUT-ing the file. The public URL is for displaying it later.
    // Note: We return the token separately or the full signed url
    
    return NextResponse.json({ 
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${filePath}`
    })

  } catch (error) {
    console.error("Error in upload-url route:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

