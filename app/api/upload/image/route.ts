import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { checkUploadRateLimit } from "@/lib/rateLimit"

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]

export async function POST(request: NextRequest) {
  try {
    // 0. Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
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

    // 2. Get file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 4. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      )
    }

    // 5. Check rate limits
    const rateLimitCheck = await checkUploadRateLimit(session.user.id, file.size)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.reason || "Upload limit reached",
          rateLimit: rateLimitCheck.remaining
        },
        { status: 429 } // Too Many Requests
      )
    }

    // 6. Generate unique file path
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    
    // Determine folder based on context (optional - can be passed as query param)
    const folder = request.nextUrl.searchParams.get('folder') || 'posts'
    const filePath = `${folder}/${fileName}`

    // 7. Convert File to ArrayBuffer/Uint8Array for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // 8. Upload to Supabase using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false // Don't allow overwriting
      })

    if (error) {
      console.error('Supabase upload error:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        path: filePath
      })
      return NextResponse.json(
        { error: `Failed to upload file: ${error.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // 9. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    })

  } catch (error: any) {
    console.error('Error in upload API:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
